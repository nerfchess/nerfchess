import type { ActiveEffect, BuffInstance, BuffOffer, BuffPick, BuffTarget, DraftFlags, DraftMode } from "@/engine/buff";
import type { Color } from "@/engine/types";

// `provisional` = the seat's rating deviation is still wide (RD > 110), so the
// rating renders as "1500?". Optional so frames from older servers still parse.
export type MPPlayers = Record<
  Color,
  { name: string; rating: number | null; avatar?: string | null; provisional?: boolean }
>;

// ---------------- draft mode (buff drafts) ----------------

// One public draft card: identity plus the tier it rolled at.
export type MPDraftCard = { id: string; tier: number };

// A held or picked card whose identity the server withheld: the receiver only
// learns that a card of this tier exists (and whether it is spent/nullified).
// Everything reveals at game end via the end frame's draftBuffs.
export type MPHiddenCard = { hidden: true; tier: number; spent?: boolean; nullified?: boolean };

// The draft record a viewer may replay: your own picked cards are yours to
// see, the opponent's arrive masked until their identity shows on the table
// (instant effect, activation, or a buff-granted move). Banks only reveal
// that they happened, and buff activations carry their targets. `ply` is the
// number of accepted moves when the action happened, so clients can
// interleave the record with the move list and rebuild the exact board (buff
// effects mutate it outside move history).
export type MPDraftAction =
  | { ply: number; color: Color; a: "pick"; cards: (MPDraftCard | MPHiddenCard)[] }
  | { ply: number; color: Color; a: "bank" }
  // `color` flagged the Chess Diff sub-game's 1+0 clock: the diff ends
  // against them and the paused game resumes. Replayed through the engine's
  // resolveDiffFlag so every replica lands on the same restored board.
  | { ply: number; color: Color; a: "diffFlag" }
  | { ply: number; color: Color; a: "use"; buffIndex: number; picks: BuffPick[]; card?: MPDraftCard };

// Per-receiver filtered view of one player's draft state. The own seat gets
// its offer, flags, and oppReveal snapshot; the opponent's copy is stripped
// of those unless the match has picksVisible (then offer and flags are
// shared), and its held-buff identities arrive masked; spectator copies
// carry only the public parts with both sides' held buffs masked.
export type MPDraftPlayerState = {
  buffs: (BuffInstance | MPHiddenCard)[];
  draftsTaken: number;
  nextDraftAt: number;
  // Draft rerolls this seat has left (the own seat drives the reroll button).
  rerollsLeft?: number;
  offer: BuffOffer | null;
  // The opponent has an unresolved offer whose cards are hidden from you.
  offerPending?: boolean;
  flags?: DraftFlags;
  oppReveal?: { index: number; cards?: MPDraftCard[]; tier?: number } | null;
  nerfRemoved?: boolean;
  revived?: Record<string, number>;
  // Crazyhouse-style pocket: pieces this seat may drop onto an empty square.
  // Public (drops are public moves), synced so a drop replays identically.
  inventory?: Record<string, number>;
};

export type MPDraftState = {
  cadence: number;
  effects: ActiveEffect[];
  extraMoves: Record<Color, number>;
  skips: Record<Color, number>;
  chainKingGuard?: Color;
  historyDiverged?: boolean;
  players: Record<Color, MPDraftPlayerState>;
};

export type MPDraftOffer = {
  color: Color;
  cards: MPDraftCard[];
  index: number;
  banked?: boolean;
  // Lock-in deadline (ms epoch): the offer auto-resolves server-side then.
  deadline?: number;
};
export type MPDraftResolved = {
  color: Color;
  kind: "picked" | "banked";
  cards?: (MPDraftCard | MPHiddenCard)[];
};
// `card` names the fired buff: identity goes public on use so every replica
// can apply the effect (and fill in a previously masked slot).
export type MPDraftUsed = { color: Color; buffIndex: number; picks: BuffPick[]; card?: MPDraftCard };
export type MPDraftHeldBuff = { id: string; tier: number; spent?: boolean; nullified?: boolean };

// Draft games: the opening nerf draft (pick one of two rules before the game
// starts). Both sides' two options are public, like the bot game's "your
// opponent is choosing between" plate; the opponent's pick index is never
// sent while it is secret.
export type MPNerfDraft = {
  options: Record<Color, string[]>;
  myPick: number | null;
  oppPicked: boolean;
  // Lock-in deadline (ms epoch): unpicked seats auto-pick their first option.
  deadline?: number | null;
};

export type MPChatMessage = { color: Color; name: string; text: string; at: number };

// Spectator-room chat: visible to watchers only, never to the players.
export type MPSpectatorChatMessage = { name: string; text: string; at: number };

// Projected rating movement for each outcome, computed by the server when a
// rated game starts ("+8 / +0 / -8").
export type MPRatingPreview = Record<Color, { win: number; draw: number; loss: number }>;

export type MPStart = {
  id: string;
  color: Color;
  token: string;
  nerfId: string;
  nerfSeed: number;
  timeSec: number;
  incrementSec: number;
  wc: number;
  bc: number;
  moves: string[];
  players?: MPPlayers;
  rated?: boolean;
  chat?: MPChatMessage[];
  preview?: MPRatingPreview;
  // Rules already voluntarily revealed mid-game (color -> nerf id).
  revealed?: Partial<Record<Color, string>>;
  // Draft ruleset games (always casual): the public action record for exact
  // replay plus this seat's filtered view of the live draft state.
  draft?: boolean;
  // The real draft RNG seed, so the client's reconnect replay rolls the same
  // stream the server did (random card effects reproduce identically). Absent
  // on older servers, where the replica falls back to a placeholder seed.
  draftSeed?: number;
  // The game's section: "nerf" or "buff". Absent = legacy merged rules.
  mode?: DraftMode;
  picksVisible?: boolean;
  dtActions?: MPDraftAction[];
  dtState?: MPDraftState;
  // Lock-in deadline for a buff offer that was pending at (re)connect time.
  dtDeadline?: number | null;
  // Present while the opening nerf draft is unresolved: the game has not
  // started yet and this seat must pick one of its two nerf options.
  nerfDraft?: MPNerfDraft;
};

export type MPWatchStart = {
  id: string;
  timeSec: number;
  incrementSec: number;
  wc: number;
  bc: number;
  moves: string[];
  players: MPPlayers;
  rated: boolean;
  started: boolean;
  result: { winner: Color | "draw" | null; reason: string } | null;
  nerfs?: Record<Color, string>;
  watchers?: number;
  // Signed-in watcher usernames (anonymous watchers only count toward `watchers`).
  watcherNames?: string[];
  spectatorChat?: MPSpectatorChatMessage[];
  // Draft ruleset games: spectator-safe payload (held buffs and board
  // effects only; offers and reveals are never sent to watchers).
  draft?: boolean;
  mode?: DraftMode;
  dtActions?: MPDraftAction[];
  dtState?: MPDraftState;
};

// One lobby snapshot: who is online and which games can be watched.
export type MPLobbyPlayer = { name: string; rating: number | null; status: "online" | "searching" | "playing"; avatar?: string | null };
export type MPLobbyGame = {
  id: string;
  players: MPPlayers;
  rated: boolean;
  // "arena" = hosted on the OCI arena service (Tier 3): spectating connects to
  // the arena's socket, not the DO. Absent for every DO-native game.
  origin?: "arena";
  // Optional so snapshots from an older server still parse.
  draft?: boolean;
  // The game's section ("nerf" or "buff"); absent = legacy merged rules or an
  // older server. Drives the mode badge on lobby listings.
  mode?: DraftMode;
  timeSec: number;
  incrementSec: number;
  moves: number;
  watchers: number;
};
// A friend game waiting for an opponent; anyone in the lobby can accept it.
export type MPLobbyChallenge = {
  id: string;
  host: { name: string; rating: number | null };
  // Optional so lobby snapshots from an older server still parse (absent =
  // casual, the only kind of open challenge older servers made).
  rated?: boolean;
  draft?: boolean;
  mode?: DraftMode;
  timeSec: number;
  incrementSec: number;
  createdAt: number;
};
// A player waiting in a quick-pairing pool; queueing into the same pool pairs
// with them immediately.
export type MPLobbySeek = {
  pool: string;
  name: string;
  rating: number | null;
  // Which queue pool the seek waits in ("nerf" or "buff"); optional so
  // snapshots from an older server still parse. Joining must pass the same
  // mode back to `queue`, or the two players would sit in different pools.
  mode?: DraftMode;
  timeSec: number;
  incrementSec: number;
  at: number;
  // Stable identity of the seeker, echoed back when answering the seek so the
  // server pairs with exactly this person (or house bot) and never a random
  // pool waiter. Optional so snapshots from an older server still parse.
  userId?: string;
  house?: boolean;
};
export type MPLobby = {
  players: MPLobbyPlayer[];
  anonymous: number;
  games: MPLobbyGame[];
  // Optional so lobby snapshots from an older server still parse.
  challenges?: MPLobbyChallenge[];
  seeks?: MPLobbySeek[];
};

export type MPAcceptedMove = {
  u: string;
  ply: number;
  wc: number;
  bc: number;
  // Desync telemetry (optional so frames from older servers still parse):
  // fnv1a(positionKey(board)) of the server's authoritative post-move
  // position. After applying the move, a replica whose own position hashes
  // differently has silently diverged: it should resync() and beacon the pair
  // of hashes to /api/desync (see src/engine/desync.ts).
  f?: string;
};

// `provisional` = the post-game RD is still wide (RD > 110): render the new
// rating as "1500?". Optional so end frames from older servers still parse.
export type MPRatingChange = { userId: string; before: number; after: number; provisional?: boolean };

export type MPEnd = {
  result: {
    winner: Color | "draw" | null;
    reason: string;
  };
  wc: number;
  bc: number;
  ratings?: Record<Color, MPRatingChange | null>;
  nerfs?: Record<Color, string>;
  // Draft games: the public draft record at game end (held buffs per side).
  draftBuffs?: Record<Color, MPDraftHeldBuff[]>;
};

export type MPEvent =
  | { type: "open"; code: string; color: Color; token: string }
  | { type: "start"; setup: MPStart }
  | { type: "watch-start"; setup: MPWatchStart }
  | { type: "queued"; pool: string }
  | { type: "paired"; id: string; color: Color; token: string }
  | { type: "queue-cancelled" }
  | { type: "move"; move: MPAcceptedMove }
  | { type: "end"; end: MPEnd }
  | { type: "draw-offer"; color: Color }
  | { type: "draw-declined"; color: Color }
  | { type: "takeback-offer"; color: Color }
  | { type: "takeback-declined"; color: Color }
  | { type: "takeback"; by: Color; moves: string[]; ply: number; wc: number; bc: number }
  | { type: "rematch-offer"; color: Color }
  | { type: "rematch-cancelled"; color: Color }
  | { type: "rematched"; id: string; color: Color; token: string }
  | { type: "chat"; message: MPChatMessage }
  | { type: "spectator-chat"; message: MPSpectatorChatMessage }
  | { type: "rule-revealed"; color: Color; nerfId: string }
  | { type: "draft-offer"; offer: MPDraftOffer }
  | { type: "draft-resolved"; resolved: MPDraftResolved }
  | { type: "draft-used"; used: MPDraftUsed }
  | { type: "draft-diff-flag"; color: Color }
  | { type: "draft-state"; state: MPDraftState }
  | { type: "draft-target"; buffIndex: number; target: BuffTarget | null }
  | { type: "nerf-picked"; color: Color }
  | { type: "clocks"; wc: number; bc: number }
  | { type: "watchers"; n: number; names?: string[] }
  | { type: "lobby"; data: MPLobby }
  | { type: "opponent-gone" }
  | { type: "god-panel-used"; by: string; action: string; at: number }
  | { type: "disconnected" }
  | { type: "reconnecting"; attempt: number }
  | { type: "error"; message: string; code?: string };

type ServerFrame =
  | { t: "created"; d: { id: string; color: Color; token: string } }
  | { t: "start"; d: MPStart }
  | { t: "wstart"; d: MPWatchStart }
  | { t: "queued"; d: { pool: string } }
  | { t: "paired"; d: { id: string; color: Color; token: string } }
  | { t: "queueCancelled" }
  | { t: "move"; d: MPAcceptedMove }
  | { t: "end"; d: MPEnd }
  | { t: "drawOffer"; d: { color: Color } }
  | { t: "drawDeclined"; d: { color: Color } }
  | { t: "takebackOffer"; d: { color: Color } }
  | { t: "takebackDeclined"; d: { color: Color } }
  | { t: "takeback"; d: { by: Color; moves: string[]; ply: number; wc: number; bc: number } }
  | { t: "rematchOffer"; d: { color: Color } }
  | { t: "rematchCancelled"; d: { color: Color } }
  | { t: "rematched"; d: { id: string; color: Color; token: string } }
  | { t: "chat"; d: MPChatMessage }
  | { t: "schat"; d: MPSpectatorChatMessage }
  | { t: "reveal"; d: { color: Color; nerfId: string } }
  | { t: "dtOffer"; d: MPDraftOffer }
  | { t: "dtResolved"; d: MPDraftResolved }
  | { t: "dtUsed"; d: MPDraftUsed }
  | { t: "dtDiffFlag"; d: { color: Color } }
  | { t: "dtState"; d: { state: MPDraftState } }
  | { t: "dtTargetReq"; d: { buffIndex: number; target: BuffTarget | null } }
  | { t: "dtNerfPicked"; d: { color: Color } }
  | { t: "watchers"; d: { n: number; names?: string[] } }
  | { t: "lobby"; d: MPLobby }
  | { t: "godUsed"; d: { by: string; action: string; at: number } }
  | { t: "opponentGone" }
  | { t: "error"; d: { code?: string; message?: string } }
  | { t: "n"; d?: { wc?: number; bc?: number } };

export type MPSavedSession = {
  id: string;
  color: Color;
  token: string;
};

const STORAGE_KEY = "nerfchess.friendSession.v1";

export function loadSavedFriendSession(): MPSavedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as MPSavedSession | null;
    if (!parsed?.id || !parsed.token || (parsed.color !== "w" && parsed.color !== "b")) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSavedFriendSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function saveFriendSession(session: MPSavedSession) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {}
}

// Seat credentials for online (matchmade) games, keyed by game id, so
// /game/[id] can reclaim the player's seat after navigation or reload.
const SEAT_PREFIX = "dc:online-seat:";

export type OnlineSeat = { color: Color; token: string };

export function saveOnlineSeat(gameId: string, seat: OnlineSeat) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEAT_PREFIX + gameId, JSON.stringify(seat));
  } catch {}
}

export function loadOnlineSeat(gameId: string): OnlineSeat | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SEAT_PREFIX + gameId) || "null") as OnlineSeat | null;
    if (!parsed?.token || (parsed.color !== "w" && parsed.color !== "b")) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearOnlineSeat(gameId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SEAT_PREFIX + gameId);
  } catch {}
}

// The game this device is currently playing, so other tabs/pages (the home
// page in particular) can offer a "return to your game" shortcut after the
// player wanders off or closes the tab mid-game.
const ACTIVE_GAME_KEY = "nerfchess.activeGame.v1";
const ACTIVE_GAME_TTL_MS = 24 * 60 * 60 * 1000;

export type ActiveGame = { id: string; at: number };

export function saveActiveGame(gameId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACTIVE_GAME_KEY, JSON.stringify({ id: gameId, at: Date.now() }));
  } catch {}
}

export function loadActiveGame(): ActiveGame | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ACTIVE_GAME_KEY) || "null") as ActiveGame | null;
    if (!parsed?.id || typeof parsed.at !== "number") return null;
    if (Date.now() - parsed.at > ACTIVE_GAME_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearActiveGame(gameId?: string) {
  if (typeof window === "undefined") return;
  try {
    if (gameId) {
      const current = loadActiveGame();
      if (current && current.id !== gameId) return;
    }
    window.localStorage.removeItem(ACTIVE_GAME_KEY);
  } catch {}
}

function gameServerUrl(): string {
  const configured = process.env.NEXT_PUBLIC_GAME_SERVER_URL?.trim();
  if (configured) return configured;

  if (typeof window === "undefined") return "ws://127.0.0.1:8080/socket/v1";

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const isNextDev = window.location.port === "3000";
  const host = isNextDev
    ? `${window.location.hostname}:8080`
    : window.location.host;
  return `${protocol}//${host}/socket/v1`;
}

export class MPSession {
  private socket: WebSocket | null = null;
  // The in-flight connect promise, shared by every caller until the socket
  // opens (or the attempt fails). Without this, a second connect() that lands
  // while the socket is still CONNECTING would resolve instantly off the
  // readyState check, then send its frame on a not-yet-open socket (silently
  // dropped) and stall on the response timeout.
  private connecting: Promise<void> | null = null;
  private listeners: Array<(e: MPEvent) => void> = [];
  private heartbeat: number | null = null;
  code = "";
  // Friend games save a resumable session under a well-known key; matchmade
  // and spectator sessions manage their own persistence (see onlineSeat below).
  persistFriendSession = true;
  // Optional server override (Tier 3): spectator sessions for arena-hosted
  // bot-vs-bot games point at the arena's socket (src/lib/arenaLobby.ts)
  // instead of the game-server DO. Set before the first connect.
  serverUrl: string | null = null;

  // --- automatic reconnection ---
  // Once this session holds a seat (or is watching a game), an unexpected
  // socket close triggers reconnect attempts with backoff. Reclaiming the seat
  // makes the server replay the full game state (start + moves + end), so the
  // UI can rebuild even if the game finished while we were away.
  autoReconnect = true;
  private seat: MPSavedSession | null = null;
  private watchingId: string | null = null;
  // Matchmaking is in progress: while true, an unexpected drop should
  // auto-reconnect and re-send the queue frame (the seat is not yet known, so
  // this keeps scheduleReconnect enabled during the search window).
  private searching = false;
  private searchQueue: { pool: string; mode?: DraftMode; target?: { userId: string } } | null = null;
  private destroyed = false;
  private reconnectTimer: number | null = null;
  private reconnectAttempt = 0;
  private wakeListenersOn = false;

  private readonly onWake = () => {
    // The tab came back to the foreground (mobile app-switch, bfcache restore,
    // regained focus, back online). Mobile freezes the tab and often leaves a
    // ZOMBIE socket that still reads OPEN while the server already detached the
    // seat (webSocketClose fired server-side, onclose never fired here). So
    // reconnect off the socket STATE, not off a pending timer.
    if (this.destroyed || !this.autoReconnect) return;
    if (!this.seat && !this.watchingId && !this.searching) return;
    // Ignore the "hidden" half of a visibilitychange (we only act on wake).
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      if (this.reconnectTimer !== null) {
        window.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      void this.tryReconnect();
      return;
    }
    // Socket claims OPEN but may be dead after a freeze: poke it. A live server
    // answers with a clock/state frame; a dead one triggers onclose -> reconnect.
    this.requestClocks();
  };

  private addWakeListeners() {
    if (this.wakeListenersOn || typeof window === "undefined") return;
    this.wakeListenersOn = true;
    window.addEventListener("online", this.onWake);
    window.addEventListener("focus", this.onWake);
    window.addEventListener("pageshow", this.onWake); // bfcache restore (iOS return path)
    window.addEventListener("resume", this.onWake); // mobile web shells
    document.addEventListener("visibilitychange", this.onWake);
  }

  private removeWakeListeners() {
    if (!this.wakeListenersOn || typeof window === "undefined") return;
    this.wakeListenersOn = false;
    window.removeEventListener("online", this.onWake);
    window.removeEventListener("focus", this.onWake);
    window.removeEventListener("pageshow", this.onWake);
    window.removeEventListener("resume", this.onWake);
    document.removeEventListener("visibilitychange", this.onWake);
  }

  private scheduleReconnect() {
    if (this.destroyed || !this.autoReconnect) return;
    if (!this.seat && !this.watchingId && !this.searching) return;
    if (this.reconnectTimer !== null) return;
    this.reconnectAttempt++;
    this.addWakeListeners();
    this.emit({ type: "reconnecting", attempt: this.reconnectAttempt });
    const delay = Math.min(15000, 500 * 2 ** Math.min(this.reconnectAttempt, 5));
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      void this.tryReconnect();
    }, delay);
  }

  private async tryReconnect() {
    if (this.destroyed) return;
    try {
      await this.connect();
      if (this.seat) this.sendFrame("reconnect", this.seat);
      else if (this.watchingId) this.sendFrame("watch", { id: this.watchingId });
      else if (this.searching && this.searchQueue)
        this.sendFrame("queue", {
          pool: this.searchQueue.pool,
          ...(this.searchQueue.mode ? { mode: this.searchQueue.mode } : {}),
          // Keep a targeted seek answer targeted across a reconnect: if the
          // seeker is gone the server returns seek_gone rather than pairing a
          // stranger, preserving the "only this person" guarantee.
          ...(this.searchQueue.target ? { target: this.searchQueue.target } : {}),
        });
    } catch {
      this.scheduleReconnect();
    }
  }

  on(fn: (e: MPEvent) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((f) => f !== fn);
    };
  }

  private emit(e: MPEvent) {
    for (const fn of [...this.listeners]) fn(e);
  }

  private sendFrame(t: string, d?: unknown): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(d === undefined ? { t } : { t, d }));
    return true;
  }

  private connect(): Promise<void> {
    // Already open: nothing to do.
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return Promise.resolve();
    // A connect is already in flight (socket still CONNECTING): hand back the
    // same promise so concurrent callers await the real open rather than
    // resolving early and firing frames at a socket that cannot yet send them.
    if (this.connecting) return this.connecting;

    this.connecting = new Promise<void>((resolve, reject) => {
      // Clear the in-flight marker on every settle path so the next connect()
      // starts a fresh attempt instead of reusing a dead promise.
      const settleResolve = () => {
        this.connecting = null;
        resolve();
      };
      const settleReject = (err: Error) => {
        this.connecting = null;
        reject(err);
      };

      const socket = new WebSocket(this.serverUrl || gameServerUrl());
      this.socket = socket;
      let opened = false;

      const failTimer = window.setTimeout(() => {
        if (opened) return;
        // Abandon this stalled attempt but keep the session alive so the
        // caller can retry (previously this called this.destroy(), which tore
        // the whole session down and prevented any retry). Detach and close
        // the dead socket so a later connect() starts fresh instead of reusing
        // a still-CONNECTING one.
        if (this.socket === socket) {
          socket.onopen = null;
          socket.onmessage = null;
          socket.onerror = null;
          socket.onclose = null;
          try {
            socket.close();
          } catch {}
          this.socket = null;
        }
        settleReject(new Error("Could not reach the game server."));
      }, 8000);

      socket.onopen = () => {
        opened = true;
        window.clearTimeout(failTimer);
        this.heartbeat = window.setInterval(() => this.sendFrame("p"), 10000);
        // Attach wake listeners now (not lazily after an onclose). On mobile the
        // socket can die during a freeze without ever firing onclose, so the
        // foreground-return handlers must already be armed to detect the zombie.
        this.addWakeListeners();
        settleResolve();
      };

      socket.onmessage = (event) => this.handleFrame(event.data);

      socket.onerror = () => {
        const message = "Game server connection failed.";
        this.emit({ type: "error", message });
        if (!opened) {
          window.clearTimeout(failTimer);
          settleReject(new Error(message));
        }
      };

      socket.onclose = () => {
        window.clearTimeout(failTimer);
        if (this.heartbeat) window.clearInterval(this.heartbeat);
        this.heartbeat = null;
        this.socket = null;
        // Closed before it ever opened: drop the in-flight marker so a retry
        // isn't blocked behind a promise the failTimer will reject.
        if (!opened) this.connecting = null;
        if (opened) {
          this.emit({ type: "disconnected" });
          this.scheduleReconnect();
        }
      };
    });
    return this.connecting;
  }

  // Establish a connection, retrying a few times with exponential backoff
  // (~400ms, ~800ms) so a single transient reject of the global Durable Object
  // does not immediately surface an error to the caller. Returns as soon as a
  // socket is open (or already open); throws only after every attempt fails.
  private async connectWithRetry(attempts = 3): Promise<void> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      if (this.destroyed) throw new Error("Session closed.");
      try {
        await this.connect();
        return;
      } catch (e) {
        lastErr = e;
        if (i < attempts - 1) {
          await new Promise<void>((r) => window.setTimeout(r, 400 * 2 ** i));
        }
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new Error("Could not reach the game server.");
  }

  private handleFrame(data: unknown) {
    let frame: ServerFrame;
    try {
      frame = JSON.parse(String(data)) as ServerFrame;
    } catch {
      this.emit({ type: "error", message: "Game server sent an invalid message." });
      return;
    }

    switch (frame.t) {
      case "created":
        this.code = frame.d.id;
        this.seat = { id: frame.d.id, color: frame.d.color, token: frame.d.token };
        this.reconnectAttempt = 0;
        if (this.persistFriendSession) {
          saveFriendSession({ id: frame.d.id, color: frame.d.color, token: frame.d.token });
        }
        this.emit({ type: "open", code: frame.d.id, color: frame.d.color, token: frame.d.token });
        break;
      case "start":
        this.code = frame.d.id;
        this.seat = { id: frame.d.id, color: frame.d.color, token: frame.d.token };
        this.reconnectAttempt = 0;
        if (this.persistFriendSession) {
          saveFriendSession({ id: frame.d.id, color: frame.d.color, token: frame.d.token });
        }
        this.emit({ type: "start", setup: frame.d });
        break;
      case "wstart":
        this.watchingId = frame.d.id;
        this.reconnectAttempt = 0;
        this.emit({ type: "watch-start", setup: frame.d });
        break;
      case "queued":
        this.emit({ type: "queued", pool: frame.d.pool });
        break;
      case "paired":
        // Adopt the seat immediately so a socket drop in the window between
        // pairing and the follow-up `start` frame can still auto-reconnect
        // (scheduleReconnect is gated on holding a seat). `start`/`created`
        // overwrite this with the same authoritative values. Matchmade seats
        // are not persisted here as friend sessions; /game/[id] reclaims them
        // via the saved online seat.
        this.seat = { id: frame.d.id, color: frame.d.color, token: frame.d.token };
        this.searching = false;
        this.reconnectAttempt = 0;
        this.emit({ type: "paired", id: frame.d.id, color: frame.d.color, token: frame.d.token });
        break;
      case "queueCancelled":
        this.emit({ type: "queue-cancelled" });
        break;
      case "move":
        this.emit({ type: "move", move: frame.d });
        break;
      case "end":
        // A finished friend game must not auto-resume on the next /friend
        // visit; drop the persisted session the moment the result arrives.
        if (this.persistFriendSession && this.seat && loadSavedFriendSession()?.id === this.seat.id) {
          clearSavedFriendSession();
        }
        this.emit({ type: "end", end: frame.d });
        break;
      case "drawOffer":
        this.emit({ type: "draw-offer", color: frame.d.color });
        break;
      case "drawDeclined":
        this.emit({ type: "draw-declined", color: frame.d.color });
        break;
      case "takebackOffer":
        this.emit({ type: "takeback-offer", color: frame.d.color });
        break;
      case "takebackDeclined":
        this.emit({ type: "takeback-declined", color: frame.d.color });
        break;
      case "takeback":
        this.emit({ type: "takeback", ...frame.d });
        break;
      case "rematchOffer":
        this.emit({ type: "rematch-offer", color: frame.d.color });
        break;
      case "rematchCancelled":
        this.emit({ type: "rematch-cancelled", color: frame.d.color });
        break;
      case "rematched":
        this.emit({ type: "rematched", id: frame.d.id, color: frame.d.color, token: frame.d.token });
        break;
      case "chat":
        this.emit({ type: "chat", message: frame.d });
        break;
      case "schat":
        this.emit({ type: "spectator-chat", message: frame.d });
        break;
      case "reveal":
        this.emit({ type: "rule-revealed", color: frame.d.color, nerfId: frame.d.nerfId });
        break;
      case "dtOffer":
        this.emit({ type: "draft-offer", offer: frame.d });
        break;
      case "dtResolved":
        this.emit({ type: "draft-resolved", resolved: frame.d });
        break;
      case "dtUsed":
        this.emit({ type: "draft-used", used: frame.d });
        break;
      case "dtDiffFlag":
        this.emit({ type: "draft-diff-flag", color: frame.d.color });
        break;
      case "dtState":
        this.emit({ type: "draft-state", state: frame.d.state });
        break;
      case "dtTargetReq":
        this.emit({ type: "draft-target", buffIndex: frame.d.buffIndex, target: frame.d.target });
        break;
      case "dtNerfPicked":
        this.emit({ type: "nerf-picked", color: frame.d.color });
        break;
      case "watchers":
        this.emit({ type: "watchers", n: frame.d.n, names: frame.d.names });
        break;
      case "lobby":
        this.emit({ type: "lobby", data: frame.d });
        break;
      case "godUsed":
        this.emit({ type: "god-panel-used", by: frame.d.by, action: frame.d.action, at: frame.d.at });
        break;
      case "opponentGone":
        this.emit({ type: "opponent-gone" });
        break;
      case "error":
        this.emit({
          type: "error",
          message: frame.d.message || frame.d.code || "Game server error.",
          code: frame.d.code,
        });
        break;
      case "n":
        if (typeof frame.d?.wc === "number" && typeof frame.d?.bc === "number") {
          this.emit({ type: "clocks", wc: frame.d.wc, bc: frame.d.bc });
        }
        break;
    }
  }

  async host(
    timeSec: number,
    incrementSec: number,
    options?: { draft?: boolean; mode?: DraftMode; picksVisible?: boolean; invite?: string; stacked?: boolean; rated?: boolean },
  ): Promise<string> {
    await this.connect();
    return new Promise((resolve, reject) => {
      const off = this.on((event) => {
        if (event.type === "open") {
          off();
          resolve(event.code);
        } else if (event.type === "error") {
          off();
          reject(new Error(event.message));
        }
      });
      this.sendFrame("create", {
        timeSec,
        incrementSec,
        ...(options?.draft
          ? {
              draft: true,
              ...(options.mode ? { mode: options.mode } : {}),
              picksVisible: !!options.picksVisible,
              // "Surprise / Stacked draft" preset: strong high-tier draft for
              // the friend who joins. Server ignores it on non-draft games.
              ...(options.stacked ? { stacked: true } : {}),
            }
          : {}),
        // Direct challenge: reserve the opponent seat for this username.
        ...(options?.invite ? { invite: options.invite } : {}),
        // Rated custom challenge: the server rates it when both seats are
        // signed-in accounts, else it degrades to casual on its own.
        ...(options?.rated ? { rated: true } : {}),
      });
    });
  }

  async join(code: string): Promise<void> {
    this.code = code;
    await this.connect();
    return new Promise((resolve, reject) => {
      const off = this.on((event) => {
        if (event.type === "start") {
          off();
          resolve();
        } else if (event.type === "error") {
          off();
          reject(new Error(event.message));
        }
      });
      this.sendFrame("join", { id: code });
    });
  }

  async resume(saved: MPSavedSession): Promise<void> {
    this.code = saved.id;
    this.seat = saved;
    await this.connect();
    return new Promise((resolve, reject) => {
      const off = this.on((event) => {
        if (event.type === "open" || event.type === "start") {
          off();
          resolve();
        } else if (event.type === "error") {
          off();
          // Server refused the seat (game gone / bad token): stop trying.
          if (event.code === "reconnect_failed") this.seat = null;
          reject(new Error(event.code === "reconnect_failed" ? "reconnect_failed" : event.message));
        }
      });
      this.sendFrame("reconnect", saved);
    });
  }

  // Force a full authoritative replay of the current game. The server only
  // replays state on a seat (or watch) claim from a fresh socket, so drop the
  // current socket quietly (no `disconnected` event) and run the reconnect
  // handshake; the server answers with a complete `start` frame the UI can
  // rebuild from. Used when the client replica detects it has drifted from
  // the server (e.g. a server-accepted move the replica considers illegal).
  resync(): boolean {
    if (this.destroyed || (!this.seat && !this.watchingId)) return false;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    const socket = this.socket;
    this.socket = null;
    if (this.heartbeat) window.clearInterval(this.heartbeat);
    this.heartbeat = null;
    if (socket) {
      // Detach handlers first: this close is intentional, not a disconnect.
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      try {
        socket.close();
      } catch {}
    }
    void this.tryReconnect();
    return true;
  }

  // Join the rated quick-pairing queue. The queue runs two pools ("nerf" and
  // "buff"); omitting the mode lands in Buff, matching older servers.
  // Passing `target` answers one specific lobby seek: the server pairs only
  // with that seeker (or house bot) and returns "seek_gone" if they already
  // left, instead of substituting a random opponent.
  // Resolves with the paired game id.
  async queue(
    pool: string,
    mode?: DraftMode,
    target?: { userId: string },
  ): Promise<{ id: string; color: Color; token: string }> {
    // Remember the search (target included) so an auto-reconnect mid-search
    // re-sends the same queue frame, and keep scheduleReconnect enabled while
    // we have no seat yet. Persisting the target keeps a targeted seek answer
    // targeted across a drop instead of degrading to a random quick-pair.
    this.searching = true;
    this.searchQueue = { pool, ...(mode ? { mode } : {}), ...(target ? { target } : {}) };
    try {
      await this.connectWithRetry();
    } catch (e) {
      this.searching = false;
      throw e;
    }
    return new Promise((resolve, reject) => {
      const off = this.on((event) => {
        if (event.type === "paired") {
          this.searching = false;
          off();
          resolve({ id: event.id, color: event.color, token: event.token });
        } else if (event.type === "error") {
          this.searching = false;
          off();
          // Surface the authoritative "seeker left" as the same sentinel the
          // lobby's client-side timeout uses, so it shows one clear message.
          reject(new Error(event.code === "seek_gone" ? "seek_gone" : event.message));
        } else if (event.type === "disconnected") {
          // With auto-reconnect on, a transient drop mid-search is
          // recoverable: scheduleReconnect() re-sends the queue frame, so keep
          // waiting instead of surfacing an error. Only reject when we cannot
          // auto-recover.
          if (!this.autoReconnect) {
            this.searching = false;
            off();
            reject(new Error("Disconnected from the game server."));
          }
        }
      });
      this.sendFrame("queue", { pool, ...(mode ? { mode } : {}), ...(target ? { target } : {}) });
    });
  }

  cancelQueue(): boolean {
    this.searching = false;
    this.searchQueue = null;
    return this.sendFrame("queueCancel");
  }

  // "Play vs bot": start a RATED house-bot game at the chosen difficulty, mode,
  // and time control (the /play page). Resolves with the paired game id, the
  // same shape as queue(). A one-shot request, not a persistent search, so it
  // does not touch the reconnect/searching machinery; the caller falls back to
  // a local casual bot game if it rejects (bots busy/paused, or offline).
  async playBot(
    difficulty: "easy" | "medium" | "hard",
    mode: DraftMode,
    timeSec: number,
    incrementSec: number,
    color: "w" | "b" | "random",
  ): Promise<{ id: string; color: Color; token: string }> {
    await this.connect();
    return new Promise((resolve, reject) => {
      const off = this.on((event) => {
        if (event.type === "paired") {
          off();
          resolve({ id: event.id, color: event.color, token: event.token });
        } else if (event.type === "error") {
          off();
          reject(new Error(event.message));
        } else if (event.type === "disconnected") {
          off();
          reject(new Error("Disconnected from the game server."));
        }
      });
      this.sendFrame("playbot", { difficulty, mode, timeSec, incrementSec, color });
    });
  }

  // Spectate a live game. Resolves with the watch payload.
  async watch(id: string): Promise<MPWatchStart> {
    this.code = id;
    await this.connect();
    return new Promise((resolve, reject) => {
      const off = this.on((event) => {
        if (event.type === "watch-start") {
          off();
          this.watchingId = id;
          resolve(event.setup);
        } else if (event.type === "error") {
          off();
          reject(new Error(event.code === "not_found" ? "not_found" : event.message));
        }
      });
      this.sendFrame("watch", { id });
    });
  }

  // Request one lobby snapshot (online players + watchable games). Resolves
  // with the next snapshot, or rejects on error/disconnect/timeout so a single
  // slow response can't hang the caller's poll forever.
  async fetchLobby(): Promise<MPLobby> {
    await this.connectWithRetry();
    return new Promise((resolve, reject) => {
      let timer = 0;
      const off = this.on((event) => {
        if (event.type === "lobby") {
          if (timer) window.clearTimeout(timer);
          off();
          resolve(event.data);
        } else if (event.type === "error") {
          if (timer) window.clearTimeout(timer);
          off();
          reject(new Error(event.message));
        } else if (event.type === "disconnected") {
          if (timer) window.clearTimeout(timer);
          off();
          reject(new Error("Disconnected from the game server."));
        }
      });
      if (!this.sendFrame("lobby")) {
        off();
        reject(new Error("Disconnected from the game server."));
        return;
      }
      timer = window.setTimeout(() => {
        off();
        reject(new Error("The game server did not respond in time."));
      }, 10000);
    });
  }

  sendMove(uci: string, ply: number): boolean {
    return this.sendFrame("move", { u: uci, ply });
  }

  // Ask the server for authoritative clocks now (outside the regular
  // heartbeat). The server runs its flag check before answering, so pinging
  // when a clock looks expired makes the game end promptly on timeout.
  requestClocks(): boolean {
    return this.sendFrame("p");
  }

  resign(): boolean {
    return this.sendFrame("resign");
  }

  // Abandonment claims: end a started game once the opponent has been
  // disconnected for 30+ seconds (the server re-checks before ending it).
  claimWin(): boolean {
    return this.sendFrame("claimWin");
  }

  claimDraw(): boolean {
    return this.sendFrame("claimDraw");
  }

  requestRematch(): boolean {
    return this.sendFrame("rematch");
  }

  // Withdraw a pending rematch offer of mine.
  cancelRematch(): boolean {
    return this.sendFrame("rematchCancel");
  }

  sendChat(text: string): boolean {
    return this.sendFrame("chat", { text });
  }

  // Chat in the spectator room (only reaches other watchers).
  sendSpectatorChat(text: string): boolean {
    return this.sendFrame("schat", { text });
  }

  // Voluntarily show my rule to the opponent (and any spectators).
  revealRule(): boolean {
    return this.sendFrame("reveal");
  }

  // ---------------- draft mode ----------------

  // Take a card from my pending buff offer.
  sendDraftPick(index: number): boolean {
    return this.sendFrame("dtPick", { index });
  }

  // Pick one of my two opening nerf options (by index, never by id).
  sendNerfPick(index: number): boolean {
    return this.sendFrame("dtNerfPick", { index });
  }

  // Skip my pending offer, banking +1 tier for the next draft.
  sendDraftBank(): boolean {
    return this.sendFrame("dtBank");
  }

  // Reroll my pending offer: fresh cards at the same tiers, spending one
  // reroll. The server owns the roll and answers with a fresh draft-state.
  sendDraftReroll(): boolean {
    return this.sendFrame("dtReroll");
  }

  // Activate a held buff with its collected targets.
  useBuff(buffIndex: number, picks: BuffPick[]): boolean {
    return this.sendFrame("dtUse", { buffIndex, picks });
  }

  // Ask the server for the buff's next target request (dtTargetReq reply).
  requestBuffTarget(buffIndex: number, picks: BuffPick[]): boolean {
    return this.sendFrame("dtTarget", { buffIndex, picks });
  }

  // ---------------- owner "fun with friends" tools ----------------

  // The seat color this session currently holds, or null before a seat is
  // claimed. Read-only convenience for owner-tool UI that needs to know which
  // side is the opponent; the server's frames remain the source of truth.
  get color(): Color | null {
    return this.seat?.color ?? null;
  }

  // Owner "see opponent buffs": toggle the per-viewer reveal of the opponent's
  // hidden held cards. The server verifies the account and answers with a fresh
  // dtState carrying the opponent's real card identities to this socket only; no
  // other client's view changes and the opponent is never told.
  seeOppBuffs(on: boolean): boolean {
    return this.sendFrame("seeOppBuffs", { on });
  }

  // Nudge the opponent's clock by 15 seconds. `subtract` false adds time (the
  // courtesy +15s any player may send in a casual game); true subtracts it (the
  // owner-only -15s). The server owns the magnitude and re-verifies the account
  // for the subtract path: only the sign is sent here.
  adjustOppClock(subtract: boolean): boolean {
    return this.sendFrame("adjustOppClock", { delta: subtract ? -1 : 1 });
  }

  // Owner god panel: summon a card straight into my own hand. The server
  // verifies the account before granting and answers with a refreshed
  // draft-state carrying the new card (no draft, no opponent notice).
  adminGrant(cardId: string): boolean {
    return this.sendFrame("adminGrant", { id: cardId });
  }

  offerDraw(): boolean {
    return this.sendFrame("drawOffer");
  }

  acceptDraw(): boolean {
    return this.sendFrame("drawAccept");
  }

  declineDraw(): boolean {
    return this.sendFrame("drawDecline");
  }

  offerTakeback(): boolean {
    return this.sendFrame("takebackOffer");
  }

  acceptTakeback(): boolean {
    return this.sendFrame("takebackAccept");
  }

  declineTakeback(): boolean {
    return this.sendFrame("takebackDecline");
  }

  destroy() {
    this.destroyed = true;
    this.searching = false;
    this.searchQueue = null;
    if (this.reconnectTimer !== null) window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.removeWakeListeners();
    if (this.heartbeat) window.clearInterval(this.heartbeat);
    this.heartbeat = null;
    const socket = this.socket;
    this.socket = null;
    this.listeners = [];
    try {
      socket?.close();
    } catch {}
  }
}
