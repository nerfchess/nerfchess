import { readFileSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { randomBytes } from "node:crypto";
import { moveToUCI } from "../src/engine/board";
import { PLAYABLE_NERFS, pickNerfPair } from "../src/engine/nerfs/library";
import { NerfGame, legalMoves, newGame, playMove, resign } from "../src/engine/game";
import { makeSeed, RNG } from "../src/engine/rng";
import { Color } from "../src/engine/types";
import { censorText, findProfanity } from "../src/lib/profanity";
import WebSocket, { RawData, WebSocketServer } from "ws";

type Result = NerfGame["result"];
type Setup = {
  whiteNerfId: string;
  blackNerfId: string;
  seed: number;
  timeSec: number;
  incrementSec: number;
};
type Client = WebSocket & {
  alive?: boolean;
  matchId?: string;
  color?: Color;
  token?: string;
  spectatingId?: string;
};
type ChatEntry = { color: Color; name: string; text: string; at: number };
type Match = {
  id: string;
  setup: Setup;
  clients: Partial<Record<Color, Client>>;
  tokens: Record<Color, string>;
  disconnectedAt: Partial<Record<Color, number>>;
  game: NerfGame | null;
  clocks: Record<Color, number>;
  runningSince: number | null;
  drawOfferBy: Color | null;
  rematchOfferBy: Color | null;
  // Matchmade games start automatically once both paired players arrive at
  // the game URL and reclaim their seats (friend games wait for a join).
  autoStart?: boolean;
  chat: ChatEntry[];
  revealed: Partial<Record<Color, boolean>>;
  spectators: Set<Client>;
  createdAt: number;
  completedAt: number | null;
};

const host = process.env.HOST || "127.0.0.1";
const port = parseInt(process.env.PORT || "8080", 10);
const socketPath = process.env.SOCKET_PATH || "/socket/v1";
const allowedOrigins = new Set(
  (process.env.GAME_SERVER_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);
const matches = new Map<string, Match>();
const disconnectGraceMs = 15 * 1000;
// Each side's first move gets 10 free seconds (mirrors the production worker).
const firstMoveGraceMs = 10 * 1000;

// Quick-pairing pools, first come first served (mirrors the production
// worker's protocol; this standalone server has no accounts or ratings).
const QUEUE_POOLS: Record<string, { timeSec: number; incrementSec: number }> = {
  "15s+0": { timeSec: 15, incrementSec: 0 },
  "1+0": { timeSec: 60, incrementSec: 0 },
  "2+1": { timeSec: 120, incrementSec: 1 },
  "3+0": { timeSec: 180, incrementSec: 0 },
  "3+2": { timeSec: 180, incrementSec: 2 },
  "5+0": { timeSec: 300, incrementSec: 0 },
  "5+3": { timeSec: 300, incrementSec: 3 },
  "10+0": { timeSec: 600, incrementSec: 0 },
  "10+5": { timeSec: 600, incrementSec: 5 },
  "15+10": { timeSec: 900, incrementSec: 10 },
};
type QueueEntry = {
  client: Client;
  pool: string;
  since: number;
};
const pairingQueue: QueueEntry[] = [];

function randomCode(): string {
  const chars = "BCDFGHJKMNPQRSTVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function newCode(): string {
  let code = randomCode();
  while (matches.has(code)) code = randomCode();
  return code;
}

function newToken(): string {
  return randomBytes(16).toString("hex");
}

function send(client: Client | undefined, t: string, d?: unknown) {
  if (!client || client.readyState !== WebSocket.OPEN) return;
  client.send(JSON.stringify(d === undefined ? { t } : { t, d }));
}

function broadcast(match: Match, t: string, d?: unknown) {
  send(match.clients.w, t, d);
  send(match.clients.b, t, d);
  for (const spectator of match.spectators) send(spectator, t, d);
}

function broadcastWatcherCount(match: Match) {
  broadcast(match, "watchers", { n: match.spectators.size });
}

// Seat names shown in the UI. The standalone server has no accounts, so
// every seat is anonymous.
function playersPayload() {
  return {
    w: { name: "Anonymous", rating: null, avatar: null },
    b: { name: "Anonymous", rating: null, avatar: null },
  };
}

function attachClient(match: Match, client: Client, color: Color) {
  const existing = match.clients[color];
  if (existing && existing !== client && existing.readyState === WebSocket.OPEN) {
    existing.close(1000, "Reconnected from another tab");
  }
  client.matchId = match.id;
  client.color = color;
  client.token = match.tokens[color];
  match.clients[color] = client;
  delete match.disconnectedAt[color];
}

function startPayload(match: Match, color: Color) {
  const clocks = currentClocks(match);
  const myNerfId = color === "w" ? match.setup.whiteNerfId : match.setup.blackNerfId;
  const masterRng = new RNG(match.setup.seed);
  const wSeed = masterRng.fork().getState();
  const bSeed = masterRng.fork().getState();
  const nerfSeed = color === "w" ? wSeed : bSeed;
  return {
    id: match.id,
    color,
    token: match.tokens[color],
    nerfId: myNerfId,
    nerfSeed,
    timeSec: match.setup.timeSec,
    incrementSec: match.setup.incrementSec,
    wc: Math.round(clocks.w),
    bc: Math.round(clocks.b),
    moves: match.game?.board.history.map(moveToUCI) ?? [],
    players: playersPayload(),
    rated: false,
    chat: match.chat,
    ...(match.revealed.w || match.revealed.b
      ? {
          revealed: {
            ...(match.revealed.w ? { w: match.setup.whiteNerfId } : {}),
            ...(match.revealed.b ? { b: match.setup.blackNerfId } : {}),
          },
        }
      : {}),
  };
}

// Once a game is over both secret rules are public: every "end" frame carries
// the nerf ids so each client can reveal the opponent's rule.
function endPayload(match: Match) {
  const clocks = currentClocks(match);
  return {
    result: match.game?.result ?? null,
    wc: Math.round(clocks.w),
    bc: Math.round(clocks.b),
    nerfs: { w: match.setup.whiteNerfId, b: match.setup.blackNerfId },
  };
}

function sendStart(match: Match, color: Color) {
  send(match.clients[color], "start", startPayload(match, color));
  if (match.game?.result) {
    send(match.clients[color], "end", endPayload(match));
  }
}

function error(client: Client, code: string, message: string) {
  send(client, "error", { code, message });
}

function currentClocks(match: Match, now = Date.now()): Record<Color, number> {
  const clocks = { ...match.clocks };
  if (!match.setup.timeSec || !match.game || match.game.result || match.runningSince === null) return clocks;
  const active = match.game.board.turn;
  let elapsed = now - match.runningSince;
  const activeMoves = match.game.board.history.filter((m) => m.color === active).length;
  if (activeMoves === 0) elapsed = Math.max(0, elapsed - firstMoveGraceMs);
  clocks[active] = Math.max(0, clocks[active] - elapsed);
  return clocks;
}

function finishOnFlag(match: Match, now = Date.now()): boolean {
  if (!match.game || match.game.result || !match.setup.timeSec) return false;
  const clocks = currentClocks(match, now);
  const active = match.game.board.turn;
  if (clocks[active] > 0) return false;
  match.clocks = clocks;
  match.runningSince = null;
  match.game.result = {
    winner: active === "w" ? "b" : "w",
    reason: active === "w" ? "white ran out of time" : "black ran out of time",
  };
  finish(match);
  return true;
}

function finish(match: Match) {
  if (!match.game?.result) return;
  match.completedAt = Date.now();
  broadcast(match, "end", endPayload(match));
}

function removeFromQueue(client: Client): boolean {
  const index = pairingQueue.findIndex((entry) => entry.client === client);
  if (index < 0) return false;
  pairingQueue.splice(index, 1);
  return true;
}

function queueForPairing(client: Client, data: unknown) {
  if (client.matchId) return error(client, "already_joined", "This connection already belongs to a game.");
  removeFromQueue(client);
  const poolName = String((data as { pool?: unknown } | undefined)?.pool || "3+2");
  const pool = QUEUE_POOLS[poolName];
  if (!pool) return error(client, "bad_pool", "Unknown queue pool.");

  const waitingIndex = pairingQueue.findIndex(
    (entry) => entry.pool === poolName && entry.client !== client && entry.client.readyState === WebSocket.OPEN,
  );
  if (waitingIndex < 0) {
    pairingQueue.push({ client, pool: poolName, since: Date.now() });
    return send(client, "queued", { pool: poolName });
  }
  const [waiting] = pairingQueue.splice(waitingIndex, 1);
  startQuickMatch(waiting.client, client, poolName, pool);
}

function cancelPairing(client: Client) {
  removeFromQueue(client);
  send(client, "queueCancelled");
}

// Paired players get a match id plus their seat token; both navigate to the
// game URL and reclaim their seat via `reconnect`, which starts the game once
// the second player arrives.
function startQuickMatch(first: Client, second: Client, poolName: string, pool: { timeSec: number; incrementSec: number }) {
  const id = newCode();
  const match: Match = {
    id,
    setup: {
      ...pickNerfPair(),
      seed: makeSeed(),
      timeSec: pool.timeSec,
      incrementSec: pool.incrementSec,
    },
    clients: {},
    tokens: { w: newToken(), b: newToken() },
    disconnectedAt: {},
    game: null,
    clocks: { w: pool.timeSec * 1000, b: pool.timeSec * 1000 },
    runningSince: null,
    drawOfferBy: null,
    rematchOfferBy: null,
    autoStart: true,
    chat: [],
    revealed: {},
    spectators: new Set(),
    createdAt: Date.now(),
    completedAt: null,
  };
  matches.set(id, match);
  const firstWhite = Math.random() < 0.5;
  const [whiteClient, blackClient] = firstWhite ? [first, second] : [second, first];
  send(whiteClient, "paired", { id, color: "w", token: match.tokens.w, pool: poolName });
  send(blackClient, "paired", { id, color: "b", token: match.tokens.b, pool: poolName });
}

// --- Spectating & lobby ---
// Anyone can browse live games and watch one. Spectators never receive nerf
// ids while a game is live; those arrive with the public "end" frame.

function lobbySnapshot(client: Client) {
  const games: Array<{
    id: string;
    players: ReturnType<typeof playersPayload>;
    rated: boolean;
    timeSec: number;
    incrementSec: number;
    moves: number;
    watchers: number;
  }> = [];
  const challenges: Array<{
    id: string;
    host: { name: string; rating: number | null };
    timeSec: number;
    incrementSec: number;
    createdAt: number;
  }> = [];
  for (const match of matches.values()) {
    if (!match.game && !match.autoStart) {
      // A friend game waiting for an opponent is an open challenge, but only
      // while its host is still connected.
      if (match.clients.w && match.clients.w.readyState === WebSocket.OPEN) {
        challenges.push({
          id: match.id,
          host: { name: "Anonymous", rating: null },
          timeSec: match.setup.timeSec,
          incrementSec: match.setup.incrementSec,
          createdAt: match.createdAt,
        });
      }
      continue;
    }
    if (!match.game || match.game.result) continue;
    games.push({
      id: match.id,
      players: playersPayload(),
      rated: false,
      timeSec: match.setup.timeSec,
      incrementSec: match.setup.incrementSec,
      moves: match.game.board.history.length,
      watchers: match.spectators.size,
    });
  }
  games.sort((a, b) => b.watchers - a.watchers || b.moves - a.moves);
  challenges.sort((a, b) => b.createdAt - a.createdAt);

  // Players waiting in a quick-pairing pool, shown as joinable seeks.
  const seeks = pairingQueue
    .filter((entry) => entry.client.readyState === WebSocket.OPEN && entry.pool in QUEUE_POOLS)
    .map((entry) => ({
      pool: entry.pool,
      name: "Anonymous",
      rating: null,
      timeSec: QUEUE_POOLS[entry.pool].timeSec,
      incrementSec: QUEUE_POOLS[entry.pool].incrementSec,
      at: entry.since,
    }));

  // No accounts on the standalone server: every open socket is anonymous.
  let anonymous = 0;
  for (const socket of websocket.clients) {
    if (socket.readyState === WebSocket.OPEN) anonymous++;
  }
  send(client, "lobby", {
    players: [],
    anonymous,
    games: games.slice(0, 25),
    challenges: challenges.slice(0, 25),
    seeks: seeks.slice(0, 25),
  });
}

function stopSpectating(client: Client, notify = true) {
  const match = client.spectatingId ? matches.get(client.spectatingId) : undefined;
  client.spectatingId = undefined;
  if (match && match.spectators.delete(client) && notify) {
    broadcastWatcherCount(match);
  }
}

function watchMatch(client: Client, data: unknown) {
  if (client.matchId) return error(client, "already_joined", "This connection already belongs to a game.");
  const id = String((data as { id?: unknown } | undefined)?.id || "").trim().toUpperCase();
  const match = matches.get(id);
  if (!match) return error(client, "not_found", "That game is not available to watch.");
  stopSpectating(client, true);
  match.spectators.add(client);
  client.spectatingId = id;
  const clocks = currentClocks(match);
  const result = match.game?.result ?? null;
  send(client, "wstart", {
    id: match.id,
    timeSec: match.setup.timeSec,
    incrementSec: match.setup.incrementSec,
    wc: Math.round(clocks.w),
    bc: Math.round(clocks.b),
    moves: match.game?.board.history.map(moveToUCI) ?? [],
    players: playersPayload(),
    rated: false,
    started: !!match.game,
    result,
    watchers: match.spectators.size,
    // Hidden rules are only revealed to spectators once the game is over.
    ...(result ? { nerfs: { w: match.setup.whiteNerfId, b: match.setup.blackNerfId } } : {}),
  });
  broadcastWatcherCount(match);
}

// --- Voluntary rule reveal ---

function revealRule(client: Client) {
  const match = client.matchId ? matches.get(client.matchId) : undefined;
  if (!match || !client.color) return error(client, "no_game", "Join a game before revealing your rule.");
  if (!match.game) return error(client, "not_started", "The game has not started yet.");
  if (match.revealed[client.color]) return;
  match.revealed[client.color] = true;
  const nerfId = client.color === "w" ? match.setup.whiteNerfId : match.setup.blackNerfId;
  broadcast(match, "reveal", { color: client.color, nerfId });
}

// --- Chat ---

const lastChatAt = new WeakMap<Client, number>();

function chatMessage(client: Client, data: unknown) {
  const match = client.matchId ? matches.get(client.matchId) : undefined;
  if (!match || !client.color) return error(client, "no_game", "Join a game before chatting.");
  const raw = String((data as { text?: unknown } | undefined)?.text ?? "").trim();
  if (!raw) return;
  const now = Date.now();
  if (now - (lastChatAt.get(client) ?? 0) < 500) return;
  lastChatAt.set(client, now);

  const clipped = raw.slice(0, 200);
  const text = findProfanity(clipped).length ? censorText(clipped) : clipped;
  const entry: ChatEntry = {
    color: client.color,
    name: client.color === "w" ? "White" : "Black",
    text,
    at: now,
  };
  match.chat = [...match.chat, entry].slice(-50);
  broadcast(match, "chat", entry);
}

function createMatch(client: Client, data: unknown) {
  if (client.matchId) return error(client, "already_joined", "This connection already belongs to a game.");
  const requested = (data || {}) as { timeSec?: unknown; incrementSec?: unknown };
  const timeSec = Number.isInteger(requested.timeSec) ? Number(requested.timeSec) : 600;
  const incrementSec = Number.isInteger(requested.incrementSec) ? Number(requested.incrementSec) : 0;
  if (timeSec < 0 || timeSec > 7200 || incrementSec < 0 || incrementSec > 60) {
    return error(client, "invalid_clock", "Unsupported time control.");
  }
  const id = newCode();
  const match: Match = {
    id,
    setup: {
      ...pickNerfPair(),
      seed: makeSeed(),
      timeSec,
      incrementSec,
    },
    clients: { w: client },
    tokens: { w: newToken(), b: newToken() },
    disconnectedAt: {},
    game: null,
    clocks: { w: timeSec * 1000, b: timeSec * 1000 },
    runningSince: null,
    drawOfferBy: null,
    rematchOfferBy: null,
    chat: [],
    revealed: {},
    spectators: new Set(),
    createdAt: Date.now(),
    completedAt: null,
  };
  matches.set(id, match);
  attachClient(match, client, "w");
  send(client, "created", { id, color: "w", token: match.tokens.w });
}

function joinMatch(client: Client, data: unknown) {
  if (client.matchId) return error(client, "already_joined", "This connection already belongs to a game.");
  const id = String((data as { id?: unknown } | undefined)?.id || "").trim().toUpperCase();
  const match = matches.get(id);
  if (!match || match.game || match.clients.b) {
    return error(client, "not_found", "That code is not accepting a player.");
  }
  attachClient(match, client, "b");
  const white = PLAYABLE_NERFS.find((nerf) => nerf.id === match.setup.whiteNerfId);
  const black = PLAYABLE_NERFS.find((nerf) => nerf.id === match.setup.blackNerfId);
  if (!white || !black) return error(client, "server_error", "Could not prepare this game.");
  match.game = newGame(white, black, match.setup.seed);
  match.runningSince = Date.now();
  for (const color of ["w", "b"] as Color[]) {
    sendStart(match, color);
  }
}

function reconnectMatch(client: Client, data: unknown) {
  if (client.matchId) return error(client, "already_joined", "This connection already belongs to a game.");
  const request = (data || {}) as { id?: unknown; color?: unknown; token?: unknown };
  const id = String(request.id || "").trim().toUpperCase();
  const color = request.color === "w" || request.color === "b" ? request.color : null;
  const token = typeof request.token === "string" ? request.token : "";
  const match = matches.get(id);
  if (!match || !color || match.tokens[color] !== token) {
    return error(client, "reconnect_failed", "Could not resume that game.");
  }
  attachClient(match, client, color);
  if (!match.game) {
    // Matchmade games begin the moment both paired players arrive at the
    // game URL; friend games wait in the lobby for a join.
    if (match.autoStart && match.clients.w && match.clients.b) {
      const white = PLAYABLE_NERFS.find((nerf) => nerf.id === match.setup.whiteNerfId);
      const black = PLAYABLE_NERFS.find((nerf) => nerf.id === match.setup.blackNerfId);
      if (!white || !black) return error(client, "server_error", "Could not prepare this game.");
      match.game = newGame(white, black, match.setup.seed);
      match.runningSince = Date.now();
      sendStart(match, "w");
      sendStart(match, "b");
      return;
    }
    return send(client, "created", { id, color, token: match.tokens[color] });
  }
  sendStart(match, color);
}

function playClientMove(client: Client, data: unknown) {
  const match = client.matchId ? matches.get(client.matchId) : undefined;
  if (!match?.game || !client.color) return error(client, "no_game", "Join a game before sending moves.");
  if (finishOnFlag(match)) return;
  if (match.game.result) return error(client, "game_over", "This game is over.");
  if (match.game.board.turn !== client.color) return error(client, "not_your_turn", "It is not your turn.");
  const request = (data || {}) as { u?: unknown; ply?: unknown };
  const uci = typeof request.u === "string" ? request.u.toLowerCase() : "";
  if (Number.isInteger(request.ply) && Number(request.ply) !== match.game.board.history.length) {
    return error(client, "stale_ply", "Your board is out of date.");
  }
  const move = legalMoves(match.game).find((candidate) => moveToUCI(candidate) === uci);
  if (!move) return error(client, "illegal_move", "That move is not legal in the current position.");

  const now = Date.now();
  match.clocks = currentClocks(match, now);
  if (match.drawOfferBy && match.drawOfferBy !== client.color) {
    const declinedBy = client.color;
    match.drawOfferBy = null;
    broadcast(match, "drawDeclined", { color: declinedBy });
  }
  const nextGame = playMove(match.game, move);
  match.game = nextGame;
  if (match.setup.timeSec) match.clocks[client.color] += match.setup.incrementSec * 1000;
  match.runningSince = nextGame.result ? null : now;
  broadcast(match, "move", {
    u: uci,
    ply: nextGame.board.history.length,
    wc: Math.round(match.clocks.w),
    bc: Math.round(match.clocks.b),
  });
  if (nextGame.result) finish(match);
}

function resignGame(client: Client) {
  const match = client.matchId ? matches.get(client.matchId) : undefined;
  if (!match?.game || !client.color) return error(client, "no_game", "Join a game before resigning.");
  if (finishOnFlag(match) || match.game.result) return;
  match.clocks = currentClocks(match);
  match.runningSince = null;
  match.game = resign(match.game, client.color);
  finish(match);
}

function offerDraw(client: Client) {
  const match = client.matchId ? matches.get(client.matchId) : undefined;
  if (!match?.game || !client.color) return error(client, "no_game", "Join a game before offering a draw.");
  if (finishOnFlag(match) || match.game.result) return;
  if (match.drawOfferBy === client.color) return error(client, "draw_pending", "Your draw offer is already pending.");
  if (match.drawOfferBy && match.drawOfferBy !== client.color) return acceptDraw(client);
  match.drawOfferBy = client.color;
  broadcast(match, "drawOffer", { color: client.color });
}

function acceptDraw(client: Client) {
  const match = client.matchId ? matches.get(client.matchId) : undefined;
  if (!match?.game || !client.color) return error(client, "no_game", "Join a game before accepting a draw.");
  if (finishOnFlag(match) || match.game.result) return;
  if (!match.drawOfferBy || match.drawOfferBy === client.color) {
    return error(client, "no_draw_offer", "There is no opponent draw offer to accept.");
  }
  match.clocks = currentClocks(match);
  match.runningSince = null;
  match.drawOfferBy = null;
  match.game.result = { winner: "draw", reason: "draw by agreement" };
  finish(match);
}

// A rematch offer once the game is over. A second offer from the other player
// counts as acceptance and starts the new game immediately.
function offerRematch(client: Client) {
  const match = client.matchId ? matches.get(client.matchId) : undefined;
  if (!match?.game || !client.color) return error(client, "no_game", "Join a game before offering a rematch.");
  if (!match.game.result) return error(client, "game_live", "The game is still in progress.");
  if (match.rematchOfferBy === client.color) {
    return error(client, "rematch_pending", "Your rematch offer is already pending.");
  }
  if (match.rematchOfferBy && match.rematchOfferBy !== client.color) return startRematch(match);
  match.rematchOfferBy = client.color;
  broadcast(match, "rematchOffer", { color: client.color });
}

function declineRematch(client: Client) {
  const match = client.matchId ? matches.get(client.matchId) : undefined;
  if (!match?.game || !client.color) return error(client, "no_game", "Join a game before declining a rematch.");
  if (!match.rematchOfferBy || match.rematchOfferBy === client.color) {
    return error(client, "no_rematch_offer", "There is no opponent rematch offer to decline.");
  }
  match.rematchOfferBy = null;
  broadcast(match, "rematchDeclined", { color: client.color });
}

// Reset the match in place: fresh nerfs and seed, colors swapped for fairness,
// clocks back to the original time control. Both players get a fresh "start".
function startRematch(match: Match) {
  const white = match.clients.w;
  const black = match.clients.b;
  match.tokens = { w: match.tokens.b, b: match.tokens.w };
  match.clients = {};
  if (black) attachClient(match, black, "w");
  if (white) attachClient(match, white, "b");

  match.setup = {
    ...match.setup,
    ...pickNerfPair(),
    seed: makeSeed(),
  };
  const whiteNerf = PLAYABLE_NERFS.find((nerf) => nerf.id === match.setup.whiteNerfId);
  const blackNerf = PLAYABLE_NERFS.find((nerf) => nerf.id === match.setup.blackNerfId);
  if (!whiteNerf || !blackNerf) return;
  match.game = newGame(whiteNerf, blackNerf, match.setup.seed);
  match.clocks = { w: match.setup.timeSec * 1000, b: match.setup.timeSec * 1000 };
  match.runningSince = Date.now();
  match.drawOfferBy = null;
  match.rematchOfferBy = null;
  match.chat = [];
  match.completedAt = null;
  sendStart(match, "w");
  sendStart(match, "b");
}

function declineDraw(client: Client) {
  const match = client.matchId ? matches.get(client.matchId) : undefined;
  if (!match?.game || !client.color) return error(client, "no_game", "Join a game before declining a draw.");
  if (finishOnFlag(match) || match.game.result) return;
  if (!match.drawOfferBy || match.drawOfferBy === client.color) {
    return error(client, "no_draw_offer", "There is no opponent draw offer to decline.");
  }
  match.drawOfferBy = null;
  broadcast(match, "drawDeclined", { color: client.color });
}

function onMessage(client: Client, raw: RawData) {
  let frame: { t?: unknown; d?: unknown };
  try {
    frame = JSON.parse(raw.toString()) as { t?: unknown; d?: unknown };
  } catch {
    return error(client, "bad_json", "Messages must be JSON objects.");
  }
  switch (frame.t) {
    case "create":
      return createMatch(client, frame.d);
    case "join":
      return joinMatch(client, frame.d);
    case "reconnect":
      return reconnectMatch(client, frame.d);
    case "move":
      return playClientMove(client, frame.d);
    case "resign":
      return resignGame(client);
    case "drawOffer":
      return offerDraw(client);
    case "drawAccept":
      return acceptDraw(client);
    case "drawDecline":
      return declineDraw(client);
    case "rematch":
      return offerRematch(client);
    case "rematchDecline":
      return declineRematch(client);
    case "queue":
      return queueForPairing(client, frame.d);
    case "queueCancel":
      return cancelPairing(client);
    case "lobby":
      return lobbySnapshot(client);
    case "watch":
      return watchMatch(client, frame.d);
    case "watchLeave":
      return stopSpectating(client);
    case "chat":
      return chatMessage(client, frame.d);
    case "reveal":
      return revealRule(client);
    case "p": {
      const watchedId = client.matchId ?? client.spectatingId;
      const match = watchedId ? matches.get(watchedId) : undefined;
      const clocks = match ? currentClocks(match) : null;
      return send(client, "n", clocks ? { wc: Math.round(clocks.w), bc: Math.round(clocks.b) } : undefined);
    }
    default:
      return error(client, "unknown_message", "Unknown message type.");
  }
}

const tlsKey = process.env.TLS_KEY_PATH;
const tlsCert = process.env.TLS_CERT_PATH;
if ((tlsKey && !tlsCert) || (!tlsKey && tlsCert)) {
  throw new Error("Set both TLS_KEY_PATH and TLS_CERT_PATH, or neither.");
}

const server = tlsKey && tlsCert
  ? createHttpsServer({ key: readFileSync(tlsKey), cert: readFileSync(tlsCert) })
  : createHttpServer();
const websocket = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 });

server.on("request", (request, response) => {
  if (request.url === "/healthz") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true, games: matches.size }));
    return;
  }
  response.writeHead(404);
  response.end();
});

server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url || "/", "http://server").pathname;
  const origin = request.headers.origin;
  if (pathname !== socketPath || (allowedOrigins.size > 0 && (!origin || !allowedOrigins.has(origin)))) {
    socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
    socket.destroy();
    return;
  }
  websocket.handleUpgrade(request, socket, head, (client) => websocket.emit("connection", client, request));
});

websocket.on("connection", (socket) => {
  const client = socket as Client;
  client.alive = true;
  client.on("pong", () => {
    client.alive = true;
  });
  client.on("message", (raw) => onMessage(client, raw));
  client.on("close", () => {
    removeFromQueue(client);
    stopSpectating(client);
    const match = client.matchId ? matches.get(client.matchId) : undefined;
    if (!match) return;
    if (client.color && match.clients[client.color] === client) {
      delete match.clients[client.color];
      match.disconnectedAt[client.color] = Date.now();
    }
  });
});

const maintenance = setInterval(() => {
  const now = Date.now();
  // Prune queue entries whose socket has gone away.
  for (let i = pairingQueue.length - 1; i >= 0; i--) {
    if (pairingQueue[i].client.readyState !== WebSocket.OPEN) pairingQueue.splice(i, 1);
  }
  for (const client of websocket.clients) {
    const active = client as Client;
    if (active.alive === false) {
      active.terminate();
      continue;
    }
    active.alive = false;
    active.ping();
  }
  for (const [id, match] of matches) {
    finishOnFlag(match, now);
    for (const color of ["w", "b"] as Color[]) {
      const disconnectedAt = match.disconnectedAt[color];
      const opponent = color === "w" ? match.clients.b : match.clients.w;
      if (disconnectedAt && opponent && now - disconnectedAt > disconnectGraceMs) {
        send(opponent, "opponentGone");
        delete match.disconnectedAt[color];
      }
    }
    const expiry = match.completedAt ?? match.createdAt;
    const bothDisconnected = !match.clients.w && !match.clients.b;
    if (
      (match.completedAt && now - expiry > 60 * 60 * 1000) ||
      (!match.game && now - expiry > 30 * 60 * 1000) ||
      (match.game && bothDisconnected && now - Math.max(match.disconnectedAt.w ?? 0, match.disconnectedAt.b ?? 0) > 30 * 60 * 1000)
    ) {
      matches.delete(id);
    }
  }
}, 5000);
maintenance.unref();

server.listen(port, host, () => {
  const scheme = tlsKey ? "wss" : "ws";
  console.log(`[game-server] listening on ${scheme}://${host}:${port}${socketPath}`);
});
