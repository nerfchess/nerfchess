import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { tournamentPhase } from "@/lib/tournaments";
import { apiError, guardJsonWrite } from "@/lib/server/request";

export const dynamic = "force-dynamic";

// Join or withdraw from a tournament. A single endpoint with an `action` field,
// matching the club membership route's shape. Auth is the existing session
// helper: every request must carry a valid session cookie, so this never
// weakens the auth model.
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const body = await guardJsonWrite(request);
  if (body instanceof NextResponse) return body;
  const db = await getDb();
  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  if (!user) return apiError(401, "Sign in to join tournaments.");

  const action = body.action === "join" || body.action === "withdraw" ? body.action : null;
  if (!action) return apiError(400, "Unknown action.");
  if (!/^[A-Za-z0-9-]{1,64}$/.test(params.id)) return apiError(404, "Tournament not found.");

  const tournament = await db
    .prepare("SELECT id, status, club_id, starts_at, duration_min, max_players FROM tournaments WHERE id = ?")
    .bind(params.id)
    .first<{
      id: string;
      status: string;
      club_id: string | null;
      starts_at: number | null;
      duration_min: number;
      max_players: number;
    }>();
  if (!tournament) return apiError(404, "Tournament not found.");

  const phase = tournamentPhase(tournament.starts_at, tournament.duration_min);

  if (action === "join") {
    // An event that played all its rounds early carries status 'finished'
    // before its duration window closes; the derived phase alone misses it.
    if (phase === "finished" || tournament.status === "finished") {
      return NextResponse.json({ error: "This tournament has finished." }, { status: 400 });
    }
    // Club events seat members only, the same rule creation enforces.
    if (tournament.club_id) {
      const member = await db
        .prepare("SELECT 1 AS present FROM club_members WHERE club_id = ? AND user_id = ?")
        .bind(tournament.club_id, user.id)
        .first<{ present: number }>();
      if (!member) {
        return NextResponse.json({ error: "Join that club to enter its tournaments." }, { status: 403 });
      }
    }
    const already = await db
      .prepare("SELECT 1 AS present FROM tournament_entries WHERE tournament_id = ? AND user_id = ?")
      .bind(tournament.id, user.id)
      .first<{ present: number }>();
    if (!already) {
      // Enforce the capacity cap atomically. A plain count-then-insert lets two
      // players joining at the boundary both read count = max - 1, both pass,
      // and both insert, overshooting max_players. SQLite serializes writers,
      // so a conditional insert that re-counts inside the same statement cannot
      // exceed the cap. OR IGNORE still guards against a duplicate user.
      const result = await db
        .prepare(
          `INSERT OR IGNORE INTO tournament_entries (tournament_id, user_id, username, joined_at)
           SELECT ?, ?, ?, ?
           WHERE (SELECT COUNT(*) FROM tournament_entries WHERE tournament_id = ?) < ?`,
        )
        .bind(tournament.id, user.id, user.username, Date.now(), tournament.id, tournament.max_players)
        .run();
      if (result.meta.changes === 0) {
        return NextResponse.json({ error: "This tournament is full." }, { status: 400 });
      }
    }
    return NextResponse.json({ entered: true });
  }

  // Withdraw. A finished event's entries ARE its final standings (the round
  // engine writes scores into them), so leaving one used to erase the player
  // from the results (F074). Refused once the event is over. While it runs,
  // withdrawing still deletes the entry, so a rejoin starts from zero; keeping
  // points needs a soft-withdraw column (proposal P-tourney-withdraw).
  if (phase === "finished" || tournament.status === "finished") {
    return apiError(400, "This tournament has finished; its standings are final.");
  }
  await db
    .prepare("DELETE FROM tournament_entries WHERE tournament_id = ? AND user_id = ?")
    .bind(tournament.id, user.id)
    .run();
  return NextResponse.json({ entered: false });
}
