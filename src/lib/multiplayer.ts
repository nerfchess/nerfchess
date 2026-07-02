import type { Color } from "@/engine/types";

export type MPPlayers = Record<Color, { name: string; rating: number | null }>;

export type MPChatMessage = { color: Color; name: string; text: string; at: number };

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
};

// One lobby snapshot: who is online and which games can be watched.
export type MPLobbyPlayer = { name: string; rating: number | null; status: "online" | "searching" | "playing" };
export type MPLobbyGame = {
  id: string;
  players: MPPlayers;
  rated: boolean;
  timeSec: number;
  incrementSec: number;
  moves: number;
  watchers: number;
};
export type MPLobby = {
  players: MPLobbyPlayer[];
  anonymous: number;
  games: MPLobbyGame[];
};

export type MPAcceptedMove = {
  u: string;
  ply: number;
  wc: number;
  bc: number;
};

export type MPRatingChange = { userId: string; before: number; after: number };

export type MPEnd = {
  result: {
    winner: Color | "draw" | null;
    reason: string;
  };
  wc: number;
  bc: number;
  ratings?: Record<Color, MPRatingChange | null>;
  nerfs?: Record<Color, string>;
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
  | { type: "rematch-offer"; color: Color }
  | { type: "rematched"; id: string; color: Color; token: string }
  | { type: "chat"; message: MPChatMessage }
  | { type: "clocks"; wc: number; bc: number }
  | { type: "watchers"; n: number }
  | { type: "lobby"; data: MPLobby }
  | { type: "opponent-gone" }
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
  | { t: "rematchOffer"; d: { color: Color } }
  | { t: "rematched"; d: { id: string; color: Color; token: string } }
  | { t: "chat"; d: MPChatMessage }
  | { t: "watchers"; d: { n: number } }
  | { t: "lobby"; d: MPLobby }
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
  private listeners: Array<(e: MPEvent) => void> = [];
  private heartbeat: number | null = null;
  code = "";
  // Friend games save a resumable session under a well-known key; matchmade
  // and spectator sessions manage their own persistence (see onlineSeat below).
  persistFriendSession = true;

  // --- automatic reconnection ---
  // Once this session holds a seat (or is watching a game), an unexpected
  // socket close triggers reconnect attempts with backoff. Reclaiming the seat
  // makes the server replay the full game state (start + moves + end), so the
  // UI can rebuild even if the game finished while we were away.
  autoReconnect = true;
  private seat: MPSavedSession | null = null;
  private watchingId: string | null = null;
  private destroyed = false;
  private reconnectTimer: number | null = null;
  private reconnectAttempt = 0;
  private wakeListenersOn = false;

  private readonly onWake = () => {
    // Browser came back online / tab became visible: retry immediately.
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      void this.tryReconnect();
    }
  };

  private addWakeListeners() {
    if (this.wakeListenersOn || typeof window === "undefined") return;
    this.wakeListenersOn = true;
    window.addEventListener("online", this.onWake);
    document.addEventListener("visibilitychange", this.onWake);
  }

  private removeWakeListeners() {
    if (!this.wakeListenersOn || typeof window === "undefined") return;
    this.wakeListenersOn = false;
    window.removeEventListener("online", this.onWake);
    document.removeEventListener("visibilitychange", this.onWake);
  }

  private scheduleReconnect() {
    if (this.destroyed || !this.autoReconnect) return;
    if (!this.seat && !this.watchingId) return;
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
    if (this.socket && this.socket.readyState <= WebSocket.OPEN) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const socket = new WebSocket(gameServerUrl());
      this.socket = socket;
      let opened = false;

      const failTimer = window.setTimeout(() => {
        if (opened) return;
        reject(new Error("Could not reach the game server."));
        this.destroy();
      }, 8000);

      socket.onopen = () => {
        opened = true;
        window.clearTimeout(failTimer);
        this.heartbeat = window.setInterval(() => this.sendFrame("p"), 10000);
        resolve();
      };

      socket.onmessage = (event) => this.handleFrame(event.data);

      socket.onerror = () => {
        const message = "Game server connection failed.";
        this.emit({ type: "error", message });
        if (!opened) {
          window.clearTimeout(failTimer);
          reject(new Error(message));
        }
      };

      socket.onclose = () => {
        window.clearTimeout(failTimer);
        if (this.heartbeat) window.clearInterval(this.heartbeat);
        this.heartbeat = null;
        this.socket = null;
        if (opened) {
          this.emit({ type: "disconnected" });
          this.scheduleReconnect();
        }
      };
    });
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
        this.emit({ type: "paired", id: frame.d.id, color: frame.d.color, token: frame.d.token });
        break;
      case "queueCancelled":
        this.emit({ type: "queue-cancelled" });
        break;
      case "move":
        this.emit({ type: "move", move: frame.d });
        break;
      case "end":
        this.emit({ type: "end", end: frame.d });
        break;
      case "drawOffer":
        this.emit({ type: "draw-offer", color: frame.d.color });
        break;
      case "drawDeclined":
        this.emit({ type: "draw-declined", color: frame.d.color });
        break;
      case "rematchOffer":
        this.emit({ type: "rematch-offer", color: frame.d.color });
        break;
      case "rematched":
        this.emit({ type: "rematched", id: frame.d.id, color: frame.d.color, token: frame.d.token });
        break;
      case "chat":
        this.emit({ type: "chat", message: frame.d });
        break;
      case "watchers":
        this.emit({ type: "watchers", n: frame.d.n });
        break;
      case "lobby":
        this.emit({ type: "lobby", data: frame.d });
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

  async host(timeSec: number, incrementSec: number): Promise<string> {
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
      this.sendFrame("create", { timeSec, incrementSec });
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

  // Join the rated quick-pairing queue. Resolves with the paired game id.
  async queue(pool: string): Promise<{ id: string; color: Color; token: string }> {
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
      this.sendFrame("queue", { pool });
    });
  }

  cancelQueue(): boolean {
    return this.sendFrame("queueCancel");
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

  // Request one lobby snapshot (online players + watchable games).
  async fetchLobby(): Promise<MPLobby> {
    await this.connect();
    return new Promise((resolve, reject) => {
      const off = this.on((event) => {
        if (event.type === "lobby") {
          off();
          resolve(event.data);
        } else if (event.type === "error") {
          off();
          reject(new Error(event.message));
        } else if (event.type === "disconnected") {
          off();
          reject(new Error("Disconnected from the game server."));
        }
      });
      if (!this.sendFrame("lobby")) {
        off();
        reject(new Error("Disconnected from the game server."));
      }
    });
  }

  sendMove(uci: string, ply: number): boolean {
    return this.sendFrame("move", { u: uci, ply });
  }

  resign(): boolean {
    return this.sendFrame("resign");
  }

  requestRematch(): boolean {
    return this.sendFrame("rematch");
  }

  sendChat(text: string): boolean {
    return this.sendFrame("chat", { text });
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

  destroy() {
    this.destroyed = true;
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
