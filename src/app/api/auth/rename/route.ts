import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import {
  RESERVED_USERNAMES,
  sessionTokenFromCookieHeader,
  userForSession,
  validUsername,
} from "@/lib/server/auth";
import { containsProfanity } from "@/lib/profanity";

export const dynamic = "force-dynamic";

// Renames an account whose username a moderator flagged as inappropriate.
// Only flagged accounts may rename (renaming is otherwise closed so names
// stay stable), the new name runs the same gauntlet as registration, and the
// account itself (ratings, games, achievements) is untouched. Server-side by
// design: the flag and validation both live in the database, never in the
// client.
export async function POST(request: Request) {
  let body: { username?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!user.name_flagged) {
    return NextResponse.json({ error: "This account's name is not up for renaming." }, { status: 403 });
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  if (!validUsername(username)) {
    return NextResponse.json(
      { error: "Username must be 3-20 characters: letters, digits, underscores." },
      { status: 400 },
    );
  }
  if (RESERVED_USERNAMES.includes(username.toLowerCase())) {
    return NextResponse.json({ error: "That username is reserved." }, { status: 400 });
  }
  if (containsProfanity(username)) {
    return NextResponse.json({ error: "Please pick a different username." }, { status: 400 });
  }
  if (username.toLowerCase() !== user.username.toLowerCase()) {
    const existing = await db
      .prepare("SELECT id FROM users WHERE username_lower = ?")
      .bind(username.toLowerCase())
      .first<{ id: string }>();
    if (existing) return NextResponse.json({ error: "That username is taken." }, { status: 409 });
  } else {
    return NextResponse.json({ error: "Pick a different name than the flagged one." }, { status: 400 });
  }

  try {
    await db
      .prepare("UPDATE users SET username = ?, username_lower = ?, name_flagged = 0 WHERE id = ?")
      .bind(username, username.toLowerCase(), user.id)
      .run();
  } catch {
    // Unique-constraint race with a concurrent registration.
    return NextResponse.json({ error: "That username is taken." }, { status: 409 });
  }

  return NextResponse.json({ ok: true, username });
}
