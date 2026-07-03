import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const REASONS = ["cheating", "boosting", "chat", "username", "other"] as const;

// Files a report against a player (Lichess-style "Report a player"). Reports
// land in the moderator queue at /mod.
export async function POST(request: Request) {
  let body: { username?: unknown; reason?: unknown; description?: unknown; gameId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const db = await getDb();
  const reporter = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!reporter) return NextResponse.json({ error: "Sign in to report a player." }, { status: 401 });

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const reason = REASONS.includes(body.reason as (typeof REASONS)[number]) ? String(body.reason) : "";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 1000) : "";
  const gameId = typeof body.gameId === "string" ? body.gameId.trim().slice(0, 20) : null;

  if (!username || !reason) return NextResponse.json({ error: "Pick a player and a reason." }, { status: 400 });
  if (!description) return NextResponse.json({ error: "Please describe what happened." }, { status: 400 });
  if (username.toLowerCase() === reporter.username.toLowerCase()) {
    return NextResponse.json({ error: "You cannot report yourself." }, { status: 400 });
  }

  const target = await db
    .prepare("SELECT id, username FROM users WHERE username_lower = ?")
    .bind(username.toLowerCase())
    .first<{ id: string; username: string }>();
  if (!target) return NextResponse.json({ error: "Player not found." }, { status: 404 });

  // Light throttle so one account can't flood the queue.
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recent = await db
    .prepare("SELECT COUNT(*) AS n FROM reports WHERE reporter_user_id = ? AND created_at > ?")
    .bind(reporter.id, dayAgo)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= 5) {
    return NextResponse.json({ error: "You have filed too many reports today." }, { status: 429 });
  }

  await db
    .prepare(
      `INSERT INTO reports (id, reporter_user_id, reporter_name, reported_user_id, reported_name,
                            reason, description, game_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      reporter.id,
      reporter.username,
      target.id,
      target.username,
      reason,
      description,
      gameId,
      Date.now(),
    )
    .run();

  return NextResponse.json({ ok: true });
}
