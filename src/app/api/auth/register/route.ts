import { NextResponse } from "next/server";
import { getDb, requestIsSecure } from "@/lib/server/db";
import {
  createSession,
  hashPassword,
  RESERVED_USERNAMES,
  sessionCookie,
  sessionTokenFromCookieHeader,
  userForSession,
  validEmail,
  validPassword,
  validUsername,
} from "@/lib/server/auth";
import { containsProfanity } from "@/lib/profanity";
import { verifyTurnstile } from "@/lib/server/turnstile";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown; email?: unknown; turnstileToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  // Bot check: no-op unless TURNSTILE_SECRET_KEY is configured.
  const turnstileToken = typeof body.turnstileToken === "string" ? body.turnstileToken : "";
  const humanOk = await verifyTurnstile(turnstileToken, request.headers.get("CF-Connecting-IP"));
  if (!humanOk) {
    return NextResponse.json({ error: "Captcha verification failed. Please try again." }, { status: 400 });
  }
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  // Optional sign-in email, stored lowercase.
  const email = typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;
  if (!validUsername(username)) {
    return NextResponse.json(
      { error: "Username must be 3-20 characters: letters, digits, underscores." },
      { status: 400 },
    );
  }
  if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
    return NextResponse.json({ error: "That username is reserved." }, { status: 400 });
  }
  if (email && !validEmail(email)) {
    return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
  }
  if (containsProfanity(username)) {
    return NextResponse.json({ error: "Please pick a different username." }, { status: 400 });
  }
  if (!validPassword(password)) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const db = await getDb();
  const caller = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));

  const existing = await db
    .prepare("SELECT id FROM users WHERE username_lower = ?")
    .bind(username.toLowerCase())
    .first<{ id: string }>();
  if (existing && existing.id !== caller?.id) {
    return NextResponse.json({ error: "That username is taken." }, { status: 409 });
  }
  if (email) {
    const emailOwner = await db
      .prepare("SELECT id FROM users WHERE email = ?")
      .bind(email)
      .first<{ id: string }>();
    if (emailOwner && emailOwner.id !== caller?.id) {
      return NextResponse.json({ error: "That email is already in use." }, { status: 409 });
    }
  }

  // A signed-in guest registering upgrades their account in place, keeping
  // their rating, games, and member-since date.
  if (caller?.is_guest) {
    await db
      .prepare(
        "UPDATE users SET username = ?, username_lower = ?, password_hash = ?, email = COALESCE(?, email), is_guest = 0 WHERE id = ?",
      )
      .bind(username, username.toLowerCase(), await hashPassword(password), email, caller.id)
      .run();
    return NextResponse.json({ id: caller.id, username });
  }

  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO users (id, username, username_lower, password_hash, email, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(id, username, username.toLowerCase(), await hashPassword(password), email, Date.now())
    .run();

  const token = await createSession(db, id);
  const response = NextResponse.json({ id, username });
  response.headers.set("Set-Cookie", sessionCookie(token, requestIsSecure(request)));
  return response;
}
