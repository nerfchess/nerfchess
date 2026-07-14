/// <reference types="@cloudflare/workers-types" />

// Account + session primitives shared by the Next API routes and the game
// server Durable Object. Everything here takes a D1Database parameter and uses
// only WebCrypto, so it runs identically on Workers and in `next dev` (Node).

export const SESSION_COOKIE = "dc_session";
// Short-lived cookie carrying the OAuth state + post-sign-in path across the
// Google round trip (see /api/auth/google and its callback).
export const OAUTH_STATE_COOKIE = "dc_oauth_state";
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const PBKDF2_ITERATIONS = 100_000;

export type UserRole = "user" | "mod" | "admin";

export interface SessionUser {
  id: string;
  username: string;
  rating: number;
  rd: number;
  vol: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  avatar: string | null;
  role: UserRole;
  muted_until: number | null;
  bio: string | null;
  flair: string | null;
  is_guest: number;
  email: string | null;
  // 1 = a moderator flagged this username; the owner must rename before
  // playing on (the account itself is untouched).
  name_flagged: number;
}

export function isModerator(user: Pick<SessionUser, "role"> | null): boolean {
  return user?.role === "mod" || user?.role === "admin";
}

export function isMuted(user: Pick<SessionUser, "muted_until"> | null): boolean {
  return !!user?.muted_until && user.muted_until > Date.now();
}

export function validUsername(name: string): boolean {
  return /^[A-Za-z0-9_]{3,20}$/.test(name);
}

// Reserved: would shadow API/product routes.
export const RESERVED_USERNAMES = ["search", "anonymous", "mod", "admin", "moderator", "nerfchess"];

export function validEmail(email: string): boolean {
  return typeof email === "string" && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validPassword(password: string): boolean {
  return typeof password === "string" && password.length >= 8 && password.length <= 200;
}

// ---------- encoding helpers ----------

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(s: string): Uint8Array {
  const raw = atob(s);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return bytes;
}

// ---------- passwords ----------

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as unknown as BufferSource, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2:${PBKDF2_ITERATIONS}:${toBase64(salt)}:${toBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = parseInt(parts[1], 10);
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 10_000_000) return false;
  const salt = fromBase64(parts[2]);
  const expected = fromBase64(parts[3]);
  const actual = await pbkdf2(password, salt, iterations);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

// ---------- sessions ----------

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return toHex(new Uint8Array(digest));
}

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = toHex(randomBytes(32));
  const now = Date.now();
  await db
    .prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(await sha256Hex(token), userId, now, now + SESSION_TTL_MS)
    .run();
  return token;
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
}

export async function userForSession(db: D1Database, token: string | null): Promise<SessionUser | null> {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const row = await db
    .prepare(
      `SELECT u.id, u.username, u.rating, u.rd, u.vol, u.games, u.wins, u.losses, u.draws, u.avatar,
              u.role, u.muted_until, u.banned_until, u.bio, u.flair, u.is_guest, u.email,
              COALESCE(u.name_flagged, 0) AS name_flagged, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    )
    .bind(await sha256Hex(token))
    .first<SessionUser & { expires_at: number; banned_until: number | null }>();
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    await db.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(Date.now()).run();
    return null;
  }
  // A banned account has no valid sessions anywhere (web or game server).
  if (row.banned_until && row.banned_until > Date.now()) return null;
  const { expires_at: _ignored, banned_until: _banned, ...user } = row;
  return user;
}

// ---------- login throttling ----------

// Failed sign-in attempts are counted per username and per client IP in a
// rolling window, so passwords cannot be brute-forced. Successful sign-in
// clears the username counter.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_MAX_FAILURES_PER_USER = 10;
export const LOGIN_MAX_FAILURES_PER_IP = 100;

export async function loginThrottled(db: D1Database, key: string, limit: number): Promise<boolean> {
  const row = await db
    .prepare("SELECT count, first_at FROM login_attempts WHERE key = ?")
    .bind(key)
    .first<{ count: number; first_at: number }>();
  if (!row) return false;
  if (Date.now() - row.first_at > LOGIN_WINDOW_MS) {
    await db.prepare("DELETE FROM login_attempts WHERE key = ?").bind(key).run();
    return false;
  }
  return row.count >= limit;
}

export async function recordLoginFailure(db: D1Database, key: string): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO login_attempts (key, count, first_at) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN excluded.first_at - first_at > ${LOGIN_WINDOW_MS} THEN 1 ELSE count + 1 END,
         first_at = CASE WHEN excluded.first_at - first_at > ${LOGIN_WINDOW_MS} THEN excluded.first_at ELSE first_at END`,
    )
    .bind(key, now)
    .run();
}

export async function clearLoginFailures(db: D1Database, key: string): Promise<void> {
  await db.prepare("DELETE FROM login_attempts WHERE key = ?").bind(key).run();
}

// ---------- cookies ----------

export function sessionTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=") || null;
  }
  return null;
}

export function sessionCookie(token: string | null, secure: boolean): string {
  const base = `${SESSION_COOKIE}=${token ?? ""}; Path=/; HttpOnly; SameSite=Lax`;
  const expiry = token ? `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}` : "Max-Age=0";
  return `${base}; ${expiry}${secure ? "; Secure" : ""}`;
}
