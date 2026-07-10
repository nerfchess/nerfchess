import { NextResponse } from "next/server";
import { getDb, requestIsSecure } from "@/lib/server/db";
import {
  createSession,
  hashPassword,
  loginThrottled,
  recordLoginFailure,
  sessionCookie,
  sessionTokenFromCookieHeader,
  userForSession,
} from "@/lib/server/auth";
import { randomGuestName, randomGuestNameNumbered } from "@/lib/guestNames";

export const dynamic = "force-dynamic";

// Instant guest account: a real user row with a random two-word name so new
// visitors can play rated games immediately. The password is an unknowable
// random secret; registering later upgrades the same account in place.
export async function POST(request: Request) {
  const db = await getDb();

  // Already signed in (guest or not): return that account instead of minting
  // another one, so refreshes and races don't pile up rows.
  const existing = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (existing) {
    return NextResponse.json({ id: existing.id, username: existing.username });
  }

  // Throttle guest MINTING per client IP (the same rolling-window counter the
  // login brute-force guard uses, under its own key prefix). This endpoint is
  // unauthenticated and writes a users row per call, so without a cap a loop
  // of empty POSTs can flood the users table. Real visitors mint one guest per
  // device; 30 per 15-minute window per IP is far above any legitimate use.
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) {
    const key = `guest:${ip}`;
    if (await loginThrottled(db, key, 30)) {
      return NextResponse.json(
        { error: "Too many guest accounts created from this network. Try again later." },
        { status: 429 },
      );
    }
    await recordLoginFailure(db, key); // counts one guest creation in the window
  }

  let username: string | null = null;
  for (let attempt = 0; attempt < 12 && !username; attempt++) {
    const candidate = attempt < 6 ? randomGuestName() : randomGuestNameNumbered();
    const taken = await db
      .prepare("SELECT id FROM users WHERE username_lower = ?")
      .bind(candidate.toLowerCase())
      .first();
    if (!taken) username = candidate;
  }
  if (!username) {
    return NextResponse.json({ error: "Could not create a guest account right now." }, { status: 500 });
  }

  const id = crypto.randomUUID();
  const unknowable = crypto.randomUUID() + crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO users (id, username, username_lower, password_hash, created_at, is_guest) VALUES (?, ?, ?, ?, ?, 1)",
    )
    .bind(id, username, username.toLowerCase(), await hashPassword(unknowable), Date.now())
    .run();

  const token = await createSession(db, id);
  const response = NextResponse.json({ id, username });
  response.headers.set("Set-Cookie", sessionCookie(token, requestIsSecure(request)));
  return response;
}
