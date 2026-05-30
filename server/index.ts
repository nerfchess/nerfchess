import { readFileSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { moveToUCI } from "../src/engine/board";
import { PLAYABLE_DRAWBACKS } from "../src/engine/drawbacks/library";
import { DrawbackGame, legalMoves, newGame, playMove, resign } from "../src/engine/game";
import { makeSeed } from "../src/engine/rng";
import { Color } from "../src/engine/types";
import WebSocket, { RawData, WebSocketServer } from "ws";

type Result = DrawbackGame["result"];
type Setup = {
  whiteDrawbackId: string;
  blackDrawbackId: string;
  seed: number;
  timeSec: number;
  incrementSec: number;
};
type Client = WebSocket & {
  alive?: boolean;
  matchId?: string;
  color?: Color;
};
type Match = {
  id: string;
  setup: Setup;
  clients: Partial<Record<Color, Client>>;
  game: DrawbackGame | null;
  clocks: Record<Color, number>;
  runningSince: number | null;
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

function pickDrawbackId(): string {
  const pool = PLAYABLE_DRAWBACKS.filter((drawback) => drawback.id !== "lucky");
  return pool[Math.floor(Math.random() * pool.length)].id;
}

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

function send(client: Client | undefined, t: string, d?: unknown) {
  if (!client || client.readyState !== WebSocket.OPEN) return;
  client.send(JSON.stringify(d === undefined ? { t } : { t, d }));
}

function broadcast(match: Match, t: string, d?: unknown) {
  send(match.clients.w, t, d);
  send(match.clients.b, t, d);
}

function error(client: Client, code: string, message: string) {
  send(client, "error", { code, message });
}

function currentClocks(match: Match, now = Date.now()): Record<Color, number> {
  const clocks = { ...match.clocks };
  if (!match.setup.timeSec || !match.game || match.game.result || match.runningSince === null) return clocks;
  const active = match.game.board.turn;
  clocks[active] = Math.max(0, clocks[active] - (now - match.runningSince));
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
  const clocks = currentClocks(match);
  broadcast(match, "end", {
    result: match.game.result,
    wc: Math.round(clocks.w),
    bc: Math.round(clocks.b),
  });
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
      whiteDrawbackId: pickDrawbackId(),
      blackDrawbackId: pickDrawbackId(),
      seed: makeSeed(),
      timeSec,
      incrementSec,
    },
    clients: { w: client },
    game: null,
    clocks: { w: timeSec * 1000, b: timeSec * 1000 },
    runningSince: null,
    createdAt: Date.now(),
    completedAt: null,
  };
  client.matchId = id;
  client.color = "w";
  matches.set(id, match);
  send(client, "created", { id, color: "w" });
}

function joinMatch(client: Client, data: unknown) {
  if (client.matchId) return error(client, "already_joined", "This connection already belongs to a game.");
  const id = String((data as { id?: unknown } | undefined)?.id || "").trim().toUpperCase();
  const match = matches.get(id);
  if (!match || match.game || match.clients.b) {
    return error(client, "not_found", "That code is not accepting a player.");
  }
  client.matchId = id;
  client.color = "b";
  match.clients.b = client;
  const white = PLAYABLE_DRAWBACKS.find((drawback) => drawback.id === match.setup.whiteDrawbackId);
  const black = PLAYABLE_DRAWBACKS.find((drawback) => drawback.id === match.setup.blackDrawbackId);
  if (!white || !black) return error(client, "server_error", "Could not prepare this game.");
  match.game = newGame(white, black, match.setup.seed);
  match.runningSince = Date.now();
  for (const color of ["w", "b"] as Color[]) {
    send(match.clients[color], "start", {
      id,
      color,
      ...match.setup,
      wc: match.clocks.w,
      bc: match.clocks.b,
    });
  }
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
    case "move":
      return playClientMove(client, frame.d);
    case "resign":
      return resignGame(client);
    case "p": {
      const match = client.matchId ? matches.get(client.matchId) : undefined;
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
    const match = client.matchId ? matches.get(client.matchId) : undefined;
    if (!match) return;
    if (client.color && match.clients[client.color] === client) {
      delete match.clients[client.color];
    }
    if (!match.game) {
      matches.delete(match.id);
      return;
    }
    const opponent = client.color === "w" ? match.clients.b : match.clients.w;
    send(opponent, "opponentGone");
    if (!match.clients.w && !match.clients.b) {
      matches.delete(match.id);
    }
  });
});

const maintenance = setInterval(() => {
  const now = Date.now();
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
    const expiry = match.completedAt ?? match.createdAt;
    if ((match.completedAt && now - expiry > 60 * 60 * 1000) || (!match.game && now - expiry > 30 * 60 * 1000)) {
      matches.delete(id);
    }
  }
}, 5000);
maintenance.unref();

server.listen(port, host, () => {
  const scheme = tlsKey ? "wss" : "ws";
  console.log(`[game-server] listening on ${scheme}://${host}:${port}${socketPath}`);
});
