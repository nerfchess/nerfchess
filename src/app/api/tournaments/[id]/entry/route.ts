import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { tournamentPhase } from "@/lib/tournaments";

export const dynamic = "force-dynamic";

// Join or withdraw from a tournament. A single endpoint with an `action` field,
// matching the club membership route's shape. Auth is the existing session
// helper: every request must carry a valid session cookie, so this never
// weakens the auth model.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return NextResponse.json({ error: "Sign in to join tournaments." }, { status: 401 });

  let body: { action?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Bad JSON." }, { status: 400 });
  }
  const action = body.action === "join" || body.action === "withdraw" ? body.action : null;
  if (!action) return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  const tournament = await db
    .prepare("SELECT id, starts_at, duration_min, max_players FROM tournaments WHERE id = ?")
    .bind(params.id)
    .first<{ id: string; starts_at: number | null; duration_min: number; max_players: number }>();
  if (!tournament) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });

  const phase = tournamentPhase(tournament.starts_at, tournament.duration_min);

  if (action === "join") {
    if (phase === "finished") {
      return NextResponse.json({ error: "This tournament has finished." }, { status: 400 });
    }
    const already = await db
      .prepare("SELECT 1 AS present FROM tournament_entries WHERE tournament_id = ? AND user_id = ?")
      .bind(tournament.id, user.id)
      .first<{ present: number }>();
    if (!already) {
      const count = await db
        .prepare("SELECT COUNT(*) AS n FROM tournament_entries WHERE tournament_id = ?")
        .bind(tournament.id)
        .first<{ n: number }>();
      if ((count?.n ?? 0) >= tournament.max_players) {
        return NextResponse.json({ error: "This tournament is full." }, { status: 400 });
      }
      await db
        .prepare(
          "INSERT OR IGNORE INTO tournament_entries (tournament_id, user_id, username, joined_at) VALUES (?, ?, ?, ?)",
        )
        .bind(tournament.id, user.id, user.username, Date.now())
        .run();
    }
    return NextResponse.json({ entered: true });
  }

  // Withdraw: remove the entry. Scores are not yet accrued (no pairing engine),
  // so nothing is lost; a future engine can switch this to a soft flag to keep
  // points on a rejoin.
  await db
    .prepare("DELETE FROM tournament_entries WHERE tournament_id = ? AND user_id = ?")
    .bind(tournament.id, user.id)
    .run();
  return NextResponse.json({ entered: false });
}
