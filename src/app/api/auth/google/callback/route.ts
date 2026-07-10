import { NextResponse } from "next/server";
import { getDb, getEnvVar, requestIsSecure } from "@/lib/server/db";
import {
  createSession,
  hashPassword,
  OAUTH_STATE_COOKIE,
  RESERVED_USERNAMES,
  sessionCookie,
  sessionTokenFromCookieHeader,
  userForSession,
  validUsername,
} from "@/lib/server/auth";
import { containsProfanity } from "@/lib/profanity";
import { cryptoRand, randomGuestNameNumbered } from "@/lib/guestNames";

export const dynamic = "force-dynamic";

// Completes Google sign-in. Account rules, in order:
//   1. A user already linked to this Google account signs straight in.
//   2. A signed-in caller (guest or registered) links this Google account to
//      their existing account — guests upgrade in place, keeping their
//      rating and history, exactly like password registration.
//   3. Otherwise a fresh account is created.
// If Google's (verified) email already belongs to a *different* account we
// refuse rather than merge: stored emails are unverified, so silently
// linking by email would let anyone pre-register an email and capture the
// real owner's first Google sign-in.

function cookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=") || null;
  }
  return null;
}

function failRedirect(origin: string, message: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/login?oauthError=${encodeURIComponent(message)}`, origin));
  response.headers.set("Set-Cookie", `${OAUTH_STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return response;
}

// A username for a fresh Google account: the email's local part when it fits
// the username rules, digits appended if taken, random name as a last resort.
async function pickUsername(db: D1Database, email: string | null): Promise<string> {
  const base = (email ? email.split("@")[0] : "").replace(/[^A-Za-z0-9_]/g, "").slice(0, 16);
  const candidates: string[] = [];
  if (validUsername(base) && !RESERVED_USERNAMES.includes(base.toLowerCase()) && !containsProfanity(base)) {
    candidates.push(base);
    for (let i = 0; i < 5; i++) candidates.push(`${base}${Math.floor(cryptoRand() * 9000) + 1000}`);
  }
  for (let i = 0; i < 6; i++) candidates.push(randomGuestNameNumbered());
  for (const candidate of candidates) {
    const taken = await db
      .prepare("SELECT id FROM users WHERE username_lower = ?")
      .bind(candidate.toLowerCase())
      .first();
    if (!taken) return candidate;
  }
  return `player_${crypto.randomUUID().slice(0, 8)}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = getEnvVar("GOOGLE_CLIENT_ID");
  const clientSecret = getEnvVar("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return failRedirect(url.origin, "Google sign-in is not set up on this server.");
  }

  // The state cookie holds "<random>:<next path>"; both halves must check out.
  const stateCookie = cookieValue(request.headers.get("cookie"), OAUTH_STATE_COOKIE);
  const [expectedState, encodedNext] = stateCookie ? stateCookie.split(/:(.*)/s) : [null, null];
  const state = url.searchParams.get("state");
  if (!state || !expectedState || state !== expectedState) {
    return failRedirect(url.origin, "Google sign-in expired. Please try again.");
  }
  const decodedNext = decodeURIComponent(encodedNext ?? "/");
  const next = decodedNext.startsWith("/") && !decodedNext.startsWith("//") ? decodedNext : "/";

  const code = url.searchParams.get("code");
  if (!code) return failRedirect(url.origin, "Google sign-in was cancelled.");

  // Exchange the code server-side. The id_token arrives directly from Google
  // over TLS, so decoding its payload without a signature check is safe.
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${url.origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return failRedirect(url.origin, "Google sign-in failed. Please try again.");
  const tokenData = (await tokenRes.json()) as { id_token?: string };
  let sub: string | null = null;
  let email: string | null = null;
  try {
    const payloadPart = tokenData.id_token?.split(".")[1] ?? "";
    const payload = JSON.parse(atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/"))) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
    };
    sub = typeof payload.sub === "string" && payload.sub ? payload.sub : null;
    email = payload.email_verified && typeof payload.email === "string" ? payload.email.toLowerCase() : null;
  } catch {}
  if (!sub) return failRedirect(url.origin, "Google sign-in failed. Please try again.");

  const db = await getDb();

  let account = await db
    .prepare("SELECT id, username, banned_until FROM users WHERE google_sub = ?")
    .bind(sub)
    .first<{ id: string; username: string; banned_until: number | null }>();

  if (!account) {
    const caller = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
    const emailOwner = email
      ? await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first<{ id: string }>()
      : null;
    if (emailOwner && emailOwner.id !== caller?.id) {
      return failRedirect(
        url.origin,
        "That Google email already belongs to an account. Sign in with its password, then use Google sign-in to link it.",
      );
    }
    if (caller) {
      await db
        .prepare("UPDATE users SET google_sub = ?, email = COALESCE(email, ?), is_guest = 0 WHERE id = ?")
        .bind(sub, email, caller.id)
        .run();
      account = { id: caller.id, username: caller.username, banned_until: null };
    } else {
      const username = await pickUsername(db, email);
      const id = crypto.randomUUID();
      // No usable password: the account signs in through Google.
      const unknowable = crypto.randomUUID() + crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO users (id, username, username_lower, password_hash, email, google_sub, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(id, username, username.toLowerCase(), await hashPassword(unknowable), email, sub, Date.now())
        .run();
      account = { id, username, banned_until: null };
    }
  }

  if (account.banned_until && account.banned_until > Date.now()) {
    return failRedirect(url.origin, "This account has been closed by moderation.");
  }

  const token = await createSession(db, account.id);
  const response = NextResponse.redirect(new URL(next, url.origin));
  response.headers.append("Set-Cookie", sessionCookie(token, requestIsSecure(request)));
  response.headers.append("Set-Cookie", `${OAUTH_STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return response;
}
