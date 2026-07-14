// Direct spectator WebSocket for arena games (Tier 3 / M3, see
// docs/bot-offload-tier3-direct-arena.md §A). Speaks the same wire protocol the
// game-server DO speaks to watchers ({t, d} JSON frames — see
// src/lib/multiplayer.ts ServerFrame), so the site's MPSession works unchanged;
// only the socket URL differs. Spectator-only: no seats, no moves accepted.
//
// The hub is also an ArenaSink: game events fan out to local sockets directly,
// replacing the Tier-2 relay that POSTed every watched frame through the DO.
import type { IncomingMessage } from "node:http";
import type { Server } from "node:http";
import type { Duplex } from "node:stream";
import WebSocket, { WebSocketServer } from "ws";
import { censorText } from "../src/lib/profanity";
import type { Arena } from "./arena";
import type { ArenaGame } from "./game";
import type { ArenaSink } from "./sink";
import type { ArenaFinishedRecord, ArenaGameSummary, Color, StoredDraftAction } from "./types";

type Spectator = WebSocket & {
  watching?: string | null;
  // wstart sent for the currently watched game. A watch on a game still in its
  // opening nerf draft stays un-bootstrapped until the game starts (the DO's
  // rule: never send a board a spectator cannot build), then the next game
  // event flushes the wstart.
  bootstrapped?: boolean;
  alive?: boolean;
  lastChatAt?: number;
};

const SOCKET_PATH = "/socket/v1";
const MAX_SOCKETS = 500;
const MAX_FRAME_BYTES = 4 * 1024;
const CHAT_MIN_INTERVAL_MS = 2000;
const CHAT_MAX_LEN = 280;

function send(ws: WebSocket, t: string, d?: unknown): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(d === undefined ? { t } : { t, d }));
}

export class SpectatorHub implements ArenaSink {
  private readonly wss = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_BYTES });
  private readonly sockets = new Set<Spectator>();
  private readonly pinger: NodeJS.Timeout;

  constructor(
    private readonly arena: Arena,
    private readonly allowedOrigins: string[],
  ) {
    this.pinger = setInterval(() => this.sweepDead(), 30_000);
    this.pinger.unref?.();
    this.wss.on("connection", (ws: Spectator) => this.onConnection(ws));
  }

  /** Take over WS upgrades on the shared HTTP server (spectator path only). */
  attach(server: Server): void {
    server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
      const path = (req.url ?? "").split("?")[0];
      if (path !== SOCKET_PATH) {
        socket.destroy();
        return;
      }
      // Browser origin gate (same posture as server/index.ts): a listed origin
      // or none at all (non-browser tools). Anything else is refused.
      const origin = req.headers.origin;
      if (typeof origin === "string" && origin && !this.allowedOrigins.includes(origin)) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }
      if (this.sockets.size >= MAX_SOCKETS) {
        socket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
        socket.destroy();
        return;
      }
      this.wss.handleUpgrade(req, socket, head, (ws) => this.wss.emit("connection", ws, req));
    });
  }

  count(id: string): number {
    let n = 0;
    for (const ws of this.sockets) if (ws.watching === id && ws.readyState === WebSocket.OPEN) n++;
    return n;
  }

  stop(): void {
    clearInterval(this.pinger);
    for (const ws of this.sockets) {
      try {
        ws.close();
      } catch {}
    }
  }

  // ---- socket lifecycle ----

  private onConnection(ws: Spectator): void {
    ws.watching = null;
    ws.bootstrapped = false;
    ws.alive = true;
    this.sockets.add(ws);
    this.arena.notePresence();
    ws.on("pong", () => {
      ws.alive = true;
    });
    ws.on("message", (raw) => this.onMessage(ws, raw));
    ws.on("close", () => this.onClose(ws));
    ws.on("error", () => this.onClose(ws));
  }

  private onClose(ws: Spectator): void {
    if (!this.sockets.has(ws)) return;
    this.sockets.delete(ws);
    const id = ws.watching;
    ws.watching = null;
    if (id) this.broadcastWatchers(id);
  }

  private sweepDead(): void {
    for (const ws of this.sockets) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      if (ws.alive === false) {
        ws.terminate();
        this.onClose(ws);
        continue;
      }
      ws.alive = false;
      try {
        ws.ping();
      } catch {}
    }
  }

  private onMessage(ws: Spectator, raw: WebSocket.RawData): void {
    this.arena.notePresence();
    let frame: { t?: unknown; d?: unknown };
    try {
      frame = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (typeof frame.t !== "string") return;
    switch (frame.t) {
      case "watch":
        return this.onWatch(ws, frame.d);
      case "p":
        return this.onPing(ws);
      case "schat":
        return this.onSpectatorChat(ws, frame.d);
      default:
        // Anything else is a player/lobby verb this spectator-only endpoint
        // does not serve. Same error shape the DO uses.
        return send(ws, "error", { code: "spectator_only", message: "This server only hosts spectators." });
    }
  }

  private onWatch(ws: Spectator, data: unknown): void {
    const id = String((data as { id?: unknown } | undefined)?.id || "").trim().toUpperCase();
    const game = this.arena.game(id);
    if (!game) return send(ws, "error", { code: "not_found", message: "No live game with that id." });
    const previous = ws.watching;
    ws.watching = id;
    ws.bootstrapped = false;
    if (previous && previous !== id) this.broadcastWatchers(previous);
    // A game still in its opening nerf draft has no board to send; the watch
    // stays registered and the first event after the game starts flushes the
    // wstart (mirrors the DO waiting for the arena's started snapshot). The
    // watcher still gets an immediate `wpending` ack — without it, tuning in
    // to a nerf-mode game mid-opening-draft looked like a dead socket and the
    // client's watch timeout fired ("Nerf TV is broken"): buff games start
    // instantly, so only the nerf channel ever hit this.
    if (game.started()) this.bootstrap(ws, game);
    else send(ws, "wpending", { id });
    this.broadcastWatchers(id);
  }

  private bootstrap(ws: Spectator, game: ArenaGame): void {
    const info = this.watcherInfo(game.id);
    send(ws, "wstart", { ...game.wstartPayload(), watchers: info.n, watcherNames: info.names });
    ws.bootstrapped = true;
  }

  private onPing(ws: Spectator): void {
    const game = ws.watching ? this.arena.game(ws.watching) : undefined;
    if (!game || !game.started()) return send(ws, "n");
    const clocks = game.liveClocks();
    send(ws, "n", { wc: clocks.w, bc: clocks.b });
  }

  private onSpectatorChat(ws: Spectator, data: unknown): void {
    const id = ws.watching;
    if (!id) return;
    const now = Date.now();
    if (ws.lastChatAt && now - ws.lastChatAt < CHAT_MIN_INTERVAL_MS) return;
    const raw = String((data as { text?: unknown } | undefined)?.text ?? "").trim();
    if (!raw) return;
    // Watchers here are anonymous (no auth on the arena — named chat would be
    // spoofable). Everyone shows as "spectator"; profanity is censored with the
    // shared filter, same as the DO's chat paths.
    ws.lastChatAt = now;
    const message = { name: "spectator", text: censorText(raw.slice(0, CHAT_MAX_LEN)), at: now };
    for (const peer of this.sockets) {
      if (peer.watching === id && peer.readyState === WebSocket.OPEN) send(peer, "schat", message);
    }
  }

  // ---- watcher bookkeeping ----

  private watcherInfo(id: string): { n: number; names: string[] } {
    // Anonymous watchers only: a count, no names (watcherNames is the DO's
    // signed-in list; the arena has no sessions to name).
    return { n: this.count(id), names: [] };
  }

  private broadcastWatchers(id: string): void {
    const info = this.watcherInfo(id);
    for (const ws of this.sockets) {
      if (ws.watching === id && ws.readyState === WebSocket.OPEN) send(ws, "watchers", info);
    }
  }

  /** Send a frame to every bootstrapped watcher of a game; un-bootstrapped
   *  watchers (joined during the nerf draft) get their wstart first — which
   *  already contains this event's outcome, so the incremental frame is
   *  skipped for them (the client's ply/state guards would drop it anyway). */
  private fanOut(id: string, frames: Array<{ t: string; d?: unknown }>): void {
    const game = this.arena.game(id);
    for (const ws of this.sockets) {
      if (ws.watching !== id || ws.readyState !== WebSocket.OPEN) continue;
      if (!ws.bootstrapped) {
        if (game && game.started()) this.bootstrap(ws, game);
        continue;
      }
      for (const frame of frames) send(ws, frame.t, frame.d);
    }
  }

  // ---- ArenaSink: live game events fan out to watchers ----

  gameOpen(_summary: ArenaGameSummary): void {
    // Nothing to push: the lobby poll surfaces new games.
  }

  move(gameId: string, ply: number, uci: string, clocks: Record<Color, number>): void {
    if (this.count(gameId) === 0) return;
    const game = this.arena.game(gameId);
    const hash = game?.boardHash();
    const frames: Array<{ t: string; d?: unknown }> = [
      { t: "move", d: { u: uci, ply, wc: Math.round(clocks.w), bc: Math.round(clocks.b), ...(hash ? { f: hash } : {}) } },
    ];
    const state = game?.dtStatePublic();
    if (state) frames.push({ t: "dtState", d: { state } });
    this.fanOut(gameId, frames);
  }

  draft(gameId: string, action: StoredDraftAction, card?: { id: string; tier: number }): void {
    if (this.count(gameId) === 0) return;
    const game = this.arena.game(gameId);
    const frames: Array<{ t: string; d?: unknown }> = [];
    if (action.a === "use") {
      frames.push({ t: "dtUsed", d: { color: action.color, buffIndex: action.buffIndex, picks: action.picks, ...(card ? { card } : {}) } });
    } else if (action.a === "pick") {
      frames.push({ t: "dtResolved", d: { color: action.color, kind: "picked", cards: action.cards } });
    } else if (action.a === "bank") {
      frames.push({ t: "dtResolved", d: { color: action.color, kind: "banked" } });
    }
    const state = game?.dtStatePublic();
    if (state) frames.push({ t: "dtState", d: { state } });
    this.fanOut(gameId, frames);
  }

  gameEnd(record: ArenaFinishedRecord, _replayOk: boolean): void {
    this.endForWatchers(record);
  }

  gameAbort(record: ArenaFinishedRecord): void {
    // An abort still ends the board for its watchers (null winner) — the DO's
    // replica watchdog existed exactly because a silent abort froze TV.
    this.endForWatchers(record);
  }

  private endForWatchers(record: ArenaFinishedRecord): void {
    if (this.count(record.id) === 0) return;
    // The game is still in the arena's map while sinks run (Arena.onDone
    // removes it after), so held buffs and final clocks are exact.
    const game = this.arena.game(record.id);
    const clocks = game?.liveClocks() ?? { w: 0, b: 0 };
    const draftBuffs = game?.heldBuffsPublic();
    this.fanOut(record.id, [
      {
        t: "end",
        d: {
          result: record.result,
          wc: clocks.w,
          bc: clocks.b,
          nerfs: { w: record.setup.whiteNerfId, b: record.setup.blackNerfId },
          ...(draftBuffs ? { draftBuffs } : {}),
        },
      },
    ]);
    // The game is gone; watchers got their end frame. Clear watch state so a
    // lingering socket doesn't hold a dead id.
    for (const ws of this.sockets) {
      if (ws.watching === record.id) {
        ws.watching = null;
        ws.bootstrapped = false;
      }
    }
  }
}
