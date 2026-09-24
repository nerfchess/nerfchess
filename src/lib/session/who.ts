// The display cookie ("who"): a small, readable, unsigned hint of who the
// session belongs to, so the server can render the header in its final shape
// on the first paint instead of an unknown state that grows once
// /api/auth/me answers (brief section 4, integrator decision Q1).
//
// It is trusted for NOTHING but layout. It carries no token and grants no
// access: every permission check still goes through the httpOnly session
// cookie on the server, and /api/auth/me stays the authority that corrects
// (or clears) the hint whenever it disagrees. Anything that fails to parse is
// treated as "no hint".
//
// Written by every auth route that changes the session (login, register,
// Google callback, guest mint, logout) and re-stamped by /api/auth/me.
// Isomorphic: no server or browser APIs.

export const WHO_COOKIE = "nc_who";

/** Same lifetime as the session cookie (src/lib/server/auth.ts). */
const WHO_MAX_AGE_S = 90 * 24 * 60 * 60;

export type WhoRole = "user" | "mod" | "admin";

export interface SessionHint {
  username: string;
  /** A preset avatar id, or null (default plate, or an uploaded image that is
   *  too large for a cookie and arrives with /me into the same box). */
  avatar: string | null;
  role: WhoRole;
  isGuest: boolean;
}

const USERNAME_RE = /^[A-Za-z0-9_]{1,40}$/;
const AVATAR_RE = /^[A-Za-z0-9_:-]{1,64}$/;

/** The hint for a user row, with only the fields that decide the header's shape. */
export function hintFor(user: {
  username: string;
  avatar: string | null;
  role: string;
  isGuest: boolean;
}): SessionHint {
  return {
    username: user.username,
    avatar: user.avatar && AVATAR_RE.test(user.avatar) ? user.avatar : null,
    role: user.role === "mod" || user.role === "admin" ? user.role : "user",
    isGuest: user.isGuest,
  };
}

/** v1.<g|u>.<role>.<username>.<avatar or empty>, every part from a closed charset. */
export function encodeWho(hint: SessionHint): string {
  return ["v1", hint.isGuest ? "g" : "u", hint.role, hint.username, hint.avatar ?? ""].join(".");
}

export function parseWho(raw: string | null | undefined): SessionHint | null {
  if (!raw || raw.length > 200) return null;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const parts = value.split(".");
  if (parts.length !== 5 || parts[0] !== "v1") return null;
  const [, kind, role, username, avatar] = parts;
  if (kind !== "g" && kind !== "u") return null;
  if (role !== "user" && role !== "mod" && role !== "admin") return null;
  if (!USERNAME_RE.test(username)) return null;
  if (avatar && !AVATAR_RE.test(avatar)) return null;
  return { username, avatar: avatar || null, role, isGuest: kind === "g" };
}

export function sameHint(a: SessionHint | null, b: SessionHint | null): boolean {
  if (!a || !b) return a === b;
  return a.username === b.username && a.avatar === b.avatar && a.role === b.role && a.isGuest === b.isGuest;
}

/**
 * The Set-Cookie value for a hint, or the clearing value for null. Not
 * HttpOnly on purpose (it is a display hint, readable by the page), Lax like
 * the session cookie, Secure whenever the session cookie is.
 */
export function whoCookieHeader(hint: SessionHint | null, secure: boolean): string {
  const value = hint ? encodeWho(hint) : "";
  const age = hint ? `Max-Age=${WHO_MAX_AGE_S}` : "Max-Age=0";
  return `${WHO_COOKIE}=${value}; Path=/; SameSite=Lax; ${age}${secure ? "; Secure" : ""}`;
}

/** Read one cookie out of a raw Cookie header. */
export function cookieFromHeader(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim() || null;
  }
  return null;
}
