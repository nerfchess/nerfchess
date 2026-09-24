/// <reference types="@cloudflare/workers-types" />

// Shared request hygiene for the Next API routes: one place that decides what
// a well-formed mutating request looks like, so every route answers bad input
// with the same 4xx shape instead of throwing a 500.
//
//   assertSameOrigin  refuse cross-site requests on cookie-authenticated writes
//                     (login CSRF, cross-site logout, forged friend requests)
//   readJsonObject    a size-capped JSON body that must be a plain object
//   guardJsonWrite    both of the above, the usual first line of a POST
//   rateLimit         a fixed-window counter in D1 (login_attempts, "rl:" keys)
//   memoryRateLimit   a per-isolate counter for log sinks that must not write D1
//   intParam          a query-string integer with a real default
//
// Error bodies keep the site-wide shape `{ error: string }` that every client
// already reads, so no caller changes.

import { NextResponse } from "next/server";

export type JsonObject = Record<string, unknown>;

/** Cache-Control for per-viewer data (sessions, inbox, settings, seat tokens). */
export const PRIVATE_NO_STORE = "private, no-store";

/**
 * Cache-Control for public, viewer-independent reads (archives, aggregates,
 * search). Browsers always revalidate (max-age=0), so a player never sees a
 * stale page of their own; a shared cache may hold it for 30 seconds.
 */
export const PUBLIC_SHORT_CACHE = "public, max-age=0, s-maxage=30, stale-while-revalidate=60";

/** Default cap for a JSON body. Every text field we accept is far smaller. */
export const DEFAULT_MAX_BODY_BYTES = 16 * 1024;

export function apiError(status: number, error: string, headers?: Record<string, string>): NextResponse {
  return NextResponse.json({ error }, { status, headers });
}

/**
 * Cross-site request refusal for cookie-authenticated writes. The session
 * cookie is SameSite=Lax, which still lets a cross-site top-level form POST
 * or a same-site subdomain carry it, and login/guest/register mint a cookie
 * without needing one. Browsers label every request with Sec-Fetch-Site (and
 * send Origin on every non-GET), so a forged request is recognisable. No
 * sibling subdomain (arena, engine, og-cache) writes here from a browser, so
 * same-site is refused like cross-site:
 *
 *   Sec-Fetch-Site: same-origin | none               -> allowed
 *   Sec-Fetch-Site: same-site | cross-site           -> 403
 *   no Sec-Fetch-Site, Origin present                -> Origin host must equal Host
 *   neither header                                   -> allowed (not a browser, so
 *                                                        no ambient cookie to abuse)
 *
 * Returns the refusal to send, or null when the request may proceed.
 */
export function assertSameOrigin(request: Request): NextResponse | null {
  const site = request.headers.get("sec-fetch-site");
  if (site) {
    if (site === "same-origin" || site === "none") return null;
    return apiError(403, "Cross-site request refused.");
  }
  const origin = request.headers.get("origin");
  if (!origin) return null;
  if (origin === "null") return apiError(403, "Cross-site request refused.");
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return apiError(403, "Cross-site request refused.");
  }
  const hosts = new Set<string>();
  const hostHeader = request.headers.get("host");
  if (hostHeader) hosts.add(hostHeader.toLowerCase());
  try {
    hosts.add(new URL(request.url).host.toLowerCase());
  } catch {}
  if (hosts.has(originHost)) return null;
  return apiError(403, "Cross-site request refused.");
}

function isJsonContentType(value: string | null): boolean {
  if (!value) return false;
  const type = value.split(";")[0].trim().toLowerCase();
  return type === "application/json" || (type.startsWith("application/") && type.endsWith("+json"));
}

/** Read the raw body, stopping as soon as it passes `maxBytes`. */
async function readBodyCapped(request: Request, maxBytes: number): Promise<string | "too_large"> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return "too_large";
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      try {
        await reader.cancel();
      } catch {}
      return "too_large";
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export type ReadJsonOptions = {
  /** Byte cap for the body (default 16 KB). Over it: 413. */
  maxBytes?: number;
  /** An empty body reads as `{}` instead of a 400 (endpoints whose fields are all optional). */
  allowEmpty?: boolean;
  /**
   * Require an application/json content type when a body is present (default
   * true). text/plain, form-urlencoded and multipart are the types a
   * cross-site form can send without a CORS preflight, so refusing them is
   * the second CSRF lock. Server-to-server and beacon sinks opt out.
   */
  requireJsonType?: boolean;
};

/**
 * The request body as a plain JSON object, or the 4xx response to return.
 * `null`, arrays, strings and numbers are refused (they used to crash handlers
 * that read `body.field`), as are bodies over the cap.
 */
export async function readJsonObject(
  request: Request,
  options: ReadJsonOptions = {},
): Promise<JsonObject | NextResponse> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BODY_BYTES;
  let raw: string | "too_large";
  try {
    raw = await readBodyCapped(request, maxBytes);
  } catch {
    return apiError(400, "Invalid request body.");
  }
  if (raw === "too_large") return apiError(413, "Request body too large.");
  if (raw.trim() === "") {
    return options.allowEmpty ? {} : apiError(400, "Invalid request body.");
  }
  if ((options.requireJsonType ?? true) && !isJsonContentType(request.headers.get("content-type"))) {
    return apiError(415, "Send the request body as JSON.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return apiError(400, "Invalid request body.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return apiError(400, "Invalid request body.");
  }
  return parsed as JsonObject;
}

/** assertSameOrigin then readJsonObject: the first line of a cookie-auth write. */
export async function guardJsonWrite(
  request: Request,
  options: ReadJsonOptions = {},
): Promise<JsonObject | NextResponse> {
  const refused = assertSameOrigin(request);
  if (refused) return refused;
  return readJsonObject(request, options);
}

/** The client IP Cloudflare stamped on the request (clients cannot forge it
 *  in production; under `next dev` it is simply absent). */
export function clientIp(request: Request): string | null {
  const ip = request.headers.get("cf-connecting-ip");
  return ip && ip.length <= 64 ? ip : null;
}

export type RateLimitResult = { ok: boolean; count: number; retryAfterSec: number };

/**
 * Fixed-window counter on the login_attempts table (keys here are prefixed
 * "rl:" so they never collide with the sign-in throttle's "u:" and "ip:"
 * keys). One atomic upsert per call counts the attempt and returns the
 * running total, so two concurrent requests cannot both read "under the
 * limit" the way a count-then-insert can. Attempts over the limit are counted
 * too: a client that keeps hammering stays blocked until the window ends.
 *
 * Fails open (ok: true) when D1 errors, so a counter outage never takes a
 * feature down; the write the limiter guards still has its own validation.
 */
export async function rateLimit(
  db: D1Database,
  key: string,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  try {
    const row = await db
      .prepare(
        `INSERT INTO login_attempts (key, count, first_at) VALUES (?1, 1, ?2)
         ON CONFLICT(key) DO UPDATE SET
           count = CASE WHEN ?2 - first_at > ?3 THEN 1 ELSE count + 1 END,
           first_at = CASE WHEN ?2 - first_at > ?3 THEN ?2 ELSE first_at END
         RETURNING count, first_at`,
      )
      .bind(`rl:${key}`, now, windowMs)
      .first<{ count: number; first_at: number }>();
    const count = Number(row?.count ?? 1);
    const firstAt = Number(row?.first_at ?? now);
    const retryAfterSec = Math.max(1, Math.ceil((firstAt + windowMs - now) / 1000));
    return { ok: count <= max, count, retryAfterSec };
  } catch (err) {
    console.error("rateLimit failed open", key, err);
    return { ok: true, count: 0, retryAfterSec: 0 };
  }
}

/** The 429 to send when a limiter says no. */
export function tooManyRequests(error: string, retryAfterSec: number): NextResponse {
  return apiError(429, error, { "Retry-After": String(Math.max(1, retryAfterSec)) });
}

// Per-isolate counters for the log sinks (desync, tv-telemetry). Those routes
// exist to never write D1, so their flood guard lives in memory: each isolate
// keeps its own window, which bounds log volume per isolate without a
// database round trip. The map is pruned so it cannot grow without bound.
const memoryWindows = new Map<string, { count: number; firstAt: number }>();
const MEMORY_WINDOW_MAX_KEYS = 5000;

export function memoryRateLimit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const entry = memoryWindows.get(key);
  if (!entry || now - entry.firstAt > windowMs) {
    if (memoryWindows.size >= MEMORY_WINDOW_MAX_KEYS) {
      for (const [k, v] of memoryWindows) {
        if (now - v.firstAt > windowMs) memoryWindows.delete(k);
      }
      if (memoryWindows.size >= MEMORY_WINDOW_MAX_KEYS) memoryWindows.clear();
    }
    memoryWindows.set(key, { count: 1, firstAt: now });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}

/**
 * An integer query parameter. A missing or empty parameter takes the
 * fallback (Number(null) is 0, which used to turn "no limit given" into a
 * page size of 1); anything else is floored and clamped into [min, max].
 */
export function intParam(raw: string | null, min: number, max: number, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/** Route params arrive percent-decoded but otherwise untrusted. */
export function usernameParam(raw: string): string | null {
  const name = raw.trim().toLowerCase();
  return name.length >= 1 && name.length <= 40 ? name : null;
}
