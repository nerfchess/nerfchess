import { NextResponse } from "next/server";
import { getDb, requestIsSecure } from "@/lib/server/db";
import {
  createSession,
  hashPassword,
  sessionCookie,
  sessionTokenFromCookieHeader,
  userForSession,
  validPassword,
  validUsername,
} from "@/lib/server/auth";
import { containsProfanity } from "@/lib/profanity";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!validUsername(username)) {
    return NextResponse.json(
      { error: "Username must be 3-20 characters: letters, digits, underscores." },
      { status: 400 },
    );
  }
  // Reserved: would shadow API/product routes.
  if (["search", "anonymous", "mod", "admin", "moderator", "nerfchess"].includes(username.toLowerCase())) {
    return NextResponse.json({ error: "That username is reserved." }, { status: 400 });
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

  // A signed-in guest registering upgrades their account in place, keeping
  // their rating, games, and member-since date.
  if (caller?.is_guest) {
    await db
      .prepare(
        "UPDATE users SET username = ?, username_lower = ?, password_hash = ?, is_guest = 0 WHERE id = ?",
      )
      .bind(username, username.toLowerCase(), await hashPassword(password), caller.id)
      .run();
    return NextResponse.json({ id: caller.id, username });
  }

  const id = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO users (id, username, username_lower, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(id, username, username.toLowerCase(), await hashPassword(password), Date.now())
    .run();

  const token = await createSession(db, id);
  const response = NextResponse.json({ id, username });
  response.headers.set("Set-Cookie", sessionCookie(token, requestIsSecure(request)));
  return response;
}
