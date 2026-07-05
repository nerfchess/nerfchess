import { NextResponse } from "next/server";
import { getDb, getEnvVar, requestIsSecure } from "@/lib/server/db";
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

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
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

  // Brute-force protection: too many recent failures for this username or
  // from this IP blocks further attempts until the window passes.
  const userKey = `u:${identifier}`;
  const ip = request.headers.get("CF-Connecting-IP");
  const ipKey = ip ? `ip:${ip}` : null;
  if (
    (await loginThrottled(db, userKey, LOGIN_MAX_FAILURES_PER_USER)) ||
    (ipKey && (await loginThrottled(db, ipKey, LOGIN_MAX_FAILURES_PER_IP)))
  ) {
    return NextResponse.json(
      { error: "Too many failed sign-in attempts. Try again in a few minutes." },
      { status: 429 },
    );
  }

  const user = await db
    .prepare(
      `SELECT id, username, password_hash, role, banned_until FROM users
       WHERE ${byEmail ? "email" : "username_lower"} = ?`,
    )
    .bind(identifier)
    .first<{ id: string; username: string; password_hash: string; role: string; banned_until: number | null }>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    await recordLoginFailure(db, userKey);
    if (ipKey) await recordLoginFailure(db, ipKey);
    return NextResponse.json({ error: "Wrong username or password." }, { status: 401 });
  }
  await clearLoginFailures(db, userKey);

  if (user.banned_until && user.banned_until > Date.now()) {
    return NextResponse.json({ error: "This account has been closed by moderation." }, { status: 403 });
  }

  // Deploy-time admin bootstrap: usernames listed in the ADMIN_USERNAMES var
  // (comma-separated) are promoted on login, so the first admin never needs
  // manual SQL. Admins can then grant `mod` from the moderation panel.
  const adminList = (getEnvVar("ADMIN_USERNAMES") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (user.role !== "admin" && adminList.includes(user.username.toLowerCase())) {
    await db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").bind(user.id).run();
  }

  const token = await createSession(db, user.id);
  const response = NextResponse.json({ id: user.id, username: user.username });
  response.headers.set("Set-Cookie", sessionCookie(token, requestIsSecure(request)));
  return response;
}
