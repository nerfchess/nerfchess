import type { Color } from "@/engine/types";

export type MPStart = {
  id: string;
  color: Color;
  token: string;
  whiteDrawbackId: string;
  blackDrawbackId: string;
  seed: number;
  timeSec: number;
  incrementSec: number;
  wc: number;
  bc: number;
  moves: string[];
};

export type MPAcceptedMove = {
  u: string;
  ply: number;
  wc: number;
  bc: number;
};

export type MPEnd = {
  result: {
    winner: Color | "draw" | null;
    reason: string;
  };
  wc: number;
  bc: number;
};

export type MPEvent =
  | { type: "open"; code: string; color: Color; token: string }
  | { type: "start"; setup: MPStart }
  | { type: "move"; move: MPAcceptedMove }
  | { type: "end"; end: MPEnd }
  | { type: "clocks"; wc: number; bc: number }
  | { type: "opponent-gone" }
  | { type: "disconnected" }
  | { type: "error"; message: string };

type ServerFrame =
  | { t: "created"; d: { id: string; color: Color; token: string } }
  | { t: "start"; d: MPStart }
  | { t: "move"; d: MPAcceptedMove }
  | { t: "end"; d: MPEnd }
  | { t: "opponentGone" }
  | { t: "error"; d: { code?: string; message?: string } }
  | { t: "n"; d?: { wc?: number; bc?: number } };

export type MPSavedSession = {
  id: string;
  color: Color;
  token: string;
};

const STORAGE_KEY = "drawbackchess.friendSession.v1";

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
        if (opened) this.emit({ type: "disconnected" });
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
        saveFriendSession({ id: frame.d.id, color: frame.d.color, token: frame.d.token });
        this.emit({ type: "open", code: frame.d.id, color: frame.d.color, token: frame.d.token });
        break;
      case "start":
        this.code = frame.d.id;
        saveFriendSession({ id: frame.d.id, color: frame.d.color, token: frame.d.token });
        this.emit({ type: "start", setup: frame.d });
        break;
      case "move":
        this.emit({ type: "move", move: frame.d });
        break;
      case "end":
        this.emit({ type: "end", end: frame.d });
        break;
      case "opponentGone":
        this.emit({ type: "opponent-gone" });
        break;
      case "error":
        this.emit({ type: "error", message: frame.d.message || frame.d.code || "Game server error." });
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
    await this.connect();
    return new Promise((resolve, reject) => {
      const off = this.on((event) => {
        if (event.type === "open" || event.type === "start") {
          off();
          resolve();
        } else if (event.type === "error") {
          off();
          reject(new Error(event.message));
        }
      });
      this.sendFrame("reconnect", saved);
    });
  }

  sendMove(uci: string, ply: number): boolean {
    return this.sendFrame("move", { u: uci, ply });
  }

  resign(): boolean {
    return this.sendFrame("resign");
  }

  destroy() {
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
