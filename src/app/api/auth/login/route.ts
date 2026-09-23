import { NextResponse } from "next/server";
import { refuseCrossSite } from "../_lib/sameOrigin";
import { getDb, requestIsSecure } from "@/lib/server/db";
import {
  clearLoginFailures,
  createSession,
  LOGIN_MAX_FAILURES_PER_IP,
  LOGIN_MAX_FAILURES_PER_USER,
  loginThrottled,
  recordLoginFailure,
  sessionCookie,
  verifyPassword,
} from "@/lib/server/auth";
import { hintFromRow } from "../_lib/who";
import { adminUsernames } from "../_lib/reserved";
import { whoCookieHeader } from "@/lib/session/who";

export const dynamic = "force-dynamic";

/** Failures for one username across every IP before it pauses (F063). */
const LOGIN_MAX_FAILURES_PER_USER_ANY_IP = 50;

export async function POST(request: Request) {
  const refused = refuseCrossSite(request);
  if (refused) return refused;
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
    // `null`, an array or a bare value parses fine and then crashed the
    // field reads below with a 500 (F047): refuse anything but an object.
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("not an object");
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  // The username field doubles as "username or email": an @ means the
  // account is looked up by its sign-in email instead.
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const identifier = username.toLowerCase();
  const byEmail = identifier.includes("@");

  const db = await getDb();

  // Brute-force protection: too many recent failures for this username from
  // this IP, for this username overall, or from this IP overall blocks
  // further attempts until the window passes. The per-username limit is
  // keyed on (username, IP) first (F063): keyed on the username alone, ten
  // wrong passwords from anyone locked the real owner out of their account.
  // A much higher per-username ceiling still caps a distributed guess.
  const ip = request.headers.get("CF-Connecting-IP");
  const userKey = `u:${identifier}`;
  const userIpKey = ip ? `u:${identifier}|${ip}` : null;
  const ipKey = ip ? `ip:${ip}` : null;
  if (
    (userIpKey
      ? (await loginThrottled(db, userIpKey, LOGIN_MAX_FAILURES_PER_USER)) ||
        (await loginThrottled(db, userKey, LOGIN_MAX_FAILURES_PER_USER_ANY_IP))
      : await loginThrottled(db, userKey, LOGIN_MAX_FAILURES_PER_USER)) ||
    (ipKey && (await loginThrottled(db, ipKey, LOGIN_MAX_FAILURES_PER_IP)))
  ) {
    return NextResponse.json(
      { error: "Too many failed sign-in attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  const user = await db
    .prepare(
      `SELECT id, username, password_hash, role, banned_until, avatar, is_guest FROM users
       WHERE ${byEmail ? "email" : "username_lower"} = ?`,
    )
    .bind(identifier)
    .first<{
      id: string;
      username: string;
      password_hash: string;
      role: string;
      banned_until: number | null;
      avatar: string | null;
      is_guest: number;
    }>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    await recordLoginFailure(db, userKey);
    if (userIpKey) await recordLoginFailure(db, userIpKey);
    if (ipKey) await recordLoginFailure(db, ipKey);
    return NextResponse.json({ error: "Wrong username or password." }, { status: 401 });
  }
  await clearLoginFailures(db, userKey);
  if (userIpKey) await clearLoginFailures(db, userIpKey);

  if (user.banned_until && user.banned_until > Date.now()) {
    return NextResponse.json({ error: "This account has been closed by moderation." }, { status: 403 });
  }

  // Deploy-time admin bootstrap: usernames listed in the ADMIN_USERNAMES var
  // (comma-separated) are promoted on login, so the first admin never needs
  // manual SQL. Admins can then grant `mod` from the moderation panel. The
  // listed names are reserved (../_lib/reserved.ts), so only the account that
  // already holds one can ever reach this.
  let role = user.role;
  if (user.role !== "admin" && adminUsernames().includes(user.username.toLowerCase())) {
    await db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").bind(user.id).run();
    role = "admin";
  }

  const token = await createSession(db, user.id);
  const secure = requestIsSecure(request);
  const response = NextResponse.json({ id: user.id, username: user.username });
  response.headers.append("Set-Cookie", sessionCookie(token, secure));
  response.headers.append("Set-Cookie", whoCookieHeader(hintFromRow({ ...user, role }), secure));
  return response;
}
