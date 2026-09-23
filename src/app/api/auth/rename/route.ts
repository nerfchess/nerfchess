import { NextResponse } from "next/server";
import { guardJsonWrite } from "@/lib/server/request";
import { getDb, requestIsSecure } from "@/lib/server/db";
import {
  recordUsernameChange,
  sessionTokenFromCookieHeader,
  userForSession,
  validUsername,
} from "@/lib/server/auth";
import { containsProfanity } from "@/lib/profanity";
import { whoCookieHeader } from "@/lib/session/who";
import { hintFromRow } from "../_lib/who";
import { isReservedUsername } from "../_lib/reserved";

export const dynamic = "force-dynamic";

// Renames an account whose username a moderator flagged as inappropriate.
// Only flagged accounts may rename (renaming is otherwise closed so names
// stay stable), the new name runs the same gauntlet as registration, and the
// account itself (ratings, games, achievements) is untouched. Server-side by
// design: the flag and validation both live in the database, never in the
// client.
export async function POST(request: Request) {
  // Refuses cross-site browser requests (F046, login CSRF) and anything but
  // a JSON object body under 16 KB (F047: `null` used to crash the field
  // reads below with a 500). Shared with slice F: src/lib/server/request.ts.
  const parsed = await guardJsonWrite(request);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed as { username?: unknown };

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
  if (isReservedUsername(username)) {
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

  // Keep the old name resolvable: any /u/<oldName> link now redirects to the
  // renamed profile. Best-effort; the rename above has already committed, so a
  // history-write failure must not fail the request.
  try {
    await recordUsernameChange(db, user.id, user.username.toLowerCase(), username.toLowerCase());
  } catch {}

  const response = NextResponse.json({ ok: true, username });
  response.headers.append("Set-Cookie", whoCookieHeader(hintFromRow({ ...user, username }), requestIsSecure(request)));
  return response;
}
