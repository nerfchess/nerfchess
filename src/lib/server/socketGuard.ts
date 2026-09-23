// Pure checks for inbound game-socket frames, used by the GameServer Durable
// Object (worker.ts webSocketMessage). Kept free of Cloudflare types so
// scripts/polish/test-socket-guard.ts can exercise them directly.

import { MAX_CLIENT_FRAME_BYTES } from "../socketProtocol";

export type ParsedFrame = { t: string; d?: unknown };

export type FrameCheck =
  | { ok: true; frame: ParsedFrame }
  | { ok: false; code: "frame_too_large" | "bad_json" | "bad_frame" };

/**
 * Size-check, parse and shape-check one client frame. The size check runs
 * before JSON.parse (F068) so an oversized frame costs a length read, not a
 * parse. A frame must be a JSON object with a short string `t`; `d`, when
 * present, is handed to the handler as `unknown` (every handler reads it with
 * optional chaining and validates each field itself). Anything else used to
 * reach `frame.t` on null or a primitive and throw out of webSocketMessage.
 */
export function checkClientFrame(message: ArrayBuffer | string, maxBytes = MAX_CLIENT_FRAME_BYTES): FrameCheck {
  // A JS string's length is UTF-16 units; one unit is at most 3 UTF-8 bytes,
  // so length * 3 bounds the byte size without encoding anything.
  if (typeof message === "string") {
    if (message.length > maxBytes && new TextEncoder().encode(message).byteLength > maxBytes) {
      return { ok: false, code: "frame_too_large" };
    }
  } else if (message.byteLength > maxBytes) {
    return { ok: false, code: "frame_too_large" };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message));
  } catch {
    return { ok: false, code: "bad_json" };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, code: "bad_frame" };
  const t = (raw as { t?: unknown }).t;
  if (typeof t !== "string" || t.length === 0 || t.length > 32) return { ok: false, code: "bad_frame" };
  return { ok: true, frame: raw as ParsedFrame };
}

/**
 * Token bucket for one socket. `capacity` frames may arrive at once, refilled
 * at `perSecond`. Real play sends a handful of frames per second at most (a
 * premove burst, a draft pick plus a target, the 10s clock ping), so the
 * defaults only ever bite a script.
 */
export type FrameBudget = { tokens: number; at: number; dropped: number; warnedAt: number };

export const FRAME_BUDGET = {
  capacity: 40,
  perSecond: 10,
  // Frames dropped (while the bucket is empty) before the socket is closed
  // with SOCKET_POLICY_CLOSE. The count decays with the refill, so a client
  // that bursts once and backs off is never closed.
  closeAfterDropped: 200,
} as const;

export function newFrameBudget(now: number): FrameBudget {
  return { tokens: FRAME_BUDGET.capacity, at: now, dropped: 0, warnedAt: 0 };
}

/**
 * Spend one token. Returns "ok" to handle the frame, "drop" to ignore it (the
 * caller may send one rate_limited error per second), or "close" once the
 * socket has kept flooding past closeAfterDropped.
 */
export function spendFrame(budget: FrameBudget, now: number): "ok" | "drop" | "close" {
  const elapsed = Math.max(0, now - budget.at) / 1000;
  budget.at = now;
  budget.tokens = Math.min(FRAME_BUDGET.capacity, budget.tokens + elapsed * FRAME_BUDGET.perSecond);
  budget.dropped = Math.max(0, budget.dropped - elapsed * FRAME_BUDGET.perSecond);
  if (budget.tokens >= 1) {
    budget.tokens -= 1;
    return "ok";
  }
  budget.dropped += 1;
  return budget.dropped >= FRAME_BUDGET.closeAfterDropped ? "close" : "drop";
}

/**
 * Sliding-window counter keyed by account or client, for actions that create
 * durable state on the game server (a new match). In memory on the Durable
 * Object: an isolate restart forgets it, which only ever lets a real player
 * through. Keys are pruned as they empty so the map cannot grow without bound.
 */
export class WindowLimiter {
  private hits = new Map<string, number[]>();
  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  /** Record one hit for every key if all of them are under the limit.
   *  Returns false (and records nothing) when any key is at the limit. */
  take(keys: string[], now: number): boolean {
    const from = now - this.windowMs;
    const live = keys.map((key) => {
      const kept = (this.hits.get(key) ?? []).filter((at) => at > from);
      if (kept.length) this.hits.set(key, kept);
      else this.hits.delete(key);
      return kept;
    });
    if (live.some((list) => list.length >= this.limit)) return false;
    if (this.hits.size + keys.length > this.maxKeys) this.sweep(from);
    keys.forEach((key, i) => this.hits.set(key, [...live[i], now]));
    return true;
  }

  size(): number {
    return this.hits.size;
  }

  private sweep(from: number) {
    for (const [key, list] of this.hits) {
      const kept = list.filter((at) => at > from);
      if (kept.length) this.hits.set(key, kept);
      else this.hits.delete(key);
    }
    // Still full of live keys: drop the oldest half rather than grow.
    if (this.hits.size > this.maxKeys) {
      const drop = [...this.hits.keys()].slice(0, Math.floor(this.hits.size / 2));
      for (const key of drop) this.hits.delete(key);
    }
  }
}

/** How many new matches one account or one client address may open per
 *  window (F067). Generous for a person (a friend game every 30s for ten
 *  minutes), fatal for a script opening sockets in a loop. The address limit
 *  is higher because a school or office shares one address. */
export const MATCH_CREATE_LIMITS = {
  windowMs: 10 * 60 * 1000,
  perAccount: 20,
  perAddress: 40,
} as const;
