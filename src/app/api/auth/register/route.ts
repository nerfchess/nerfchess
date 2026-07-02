import { NextResponse } from "next/server";
import { getDb, requestIsSecure } from "@/lib/server/db";
import {
  createSession,
  hashPassword,
  sessionCookie,
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
  if (["search", "anonymous"].includes(username.toLowerCase())) {
    return NextResponse.json({ error: "That username is reserved." }, { status: 400 });
  }
  if (containsProfanity(username)) {
    return NextResponse.json({ error: "Please pick a different username." }, { status: 400 });
  }
  if (!validPassword(password)) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const db = await getDb();
  const existing = await db
    .prepare("SELECT id FROM users WHERE username_lower = ?")
    .bind(username.toLowerCase())
    .first();
  if (existing) {
    return NextResponse.json({ error: "That username is taken." }, { status: 409 });
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
