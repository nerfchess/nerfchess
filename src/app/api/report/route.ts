import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { apiError, guardJsonWrite, usernameParam } from "@/lib/server/request";
import { cleanText, TEXT_POLICIES } from "@/lib/textInput";

export const dynamic = "force-dynamic";

const REASONS = ["cheating", "boosting", "chat", "username", "other"] as const;
const REPORTS_PER_DAY = 5;

// Files a report against a player (Lichess-style "Report a player"). Reports
// land in the moderator queue at /mod.
export async function POST(request: Request) {
  const body = await guardJsonWrite(request);
  if (body instanceof NextResponse) return body;

  const db = await getDb();
  const reporter = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!reporter) return apiError(401, "Sign in to report a player.");

  const username = typeof body.username === "string" ? usernameParam(body.username) : null;
  const reason = REASONS.includes(body.reason as (typeof REASONS)[number]) ? String(body.reason) : "";
  const description = cleanText(body.description, TEXT_POLICIES.reportDescription);
  // Game ids are short codes (queue, friend, arena); anything else is dropped
  // rather than stored in the moderator queue.
  const rawGameId = typeof body.gameId === "string" ? body.gameId.trim() : "";
  const gameId = /^[A-Za-z0-9_-]{1,40}$/.test(rawGameId) ? rawGameId : null;

  if (!username || !reason) return apiError(400, "Pick a player and a reason.");
  if (!description) return apiError(400, "Please describe what happened.");
  if (username === reporter.username.toLowerCase()) {
    return apiError(400, "You cannot report yourself.");
  }

  const target = await db
    .prepare("SELECT id, username FROM users WHERE username_lower = ?")
    .bind(username)
    .first<{ id: string; username: string }>();
  if (!target) return apiError(404, "Player not found.");

  // Light throttle so one account can't flood the queue (served by
  // idx_reports_reporter, migration 0045).
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recent = await db
    .prepare("SELECT COUNT(*) AS n FROM reports WHERE reporter_user_id = ? AND created_at > ?")
    .bind(reporter.id, dayAgo)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= REPORTS_PER_DAY) {
    return apiError(429, "You have filed too many reports today.");
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
