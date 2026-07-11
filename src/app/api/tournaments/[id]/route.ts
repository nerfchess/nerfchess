import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { sessionTokenFromCookieHeader, userForSession } from "@/lib/server/auth";
import { tournamentPhase, type TournamentPhase } from "@/lib/tournaments";
import { categoryRatingSql } from "@/lib/server/ratingSql";
import { isModeCategory } from "@/lib/speed";

export const dynamic = "force-dynamic";

export type TournamentDetail = {
  id: string;
  name: string;
  description: string;
  creator_user_id: string;
  creator_name: string;
  club_id: string | null;
  club_name: string | null;
  format: string;
  mode: string;
  rated: number;
  clock_time_sec: number;
  clock_increment_sec: number;
  duration_min: number;
  starts_at: number | null;
  max_players: number;
  created_at: number;
  players: number;
  phase: TournamentPhase;
};

// One row of the live standings. Score/streak/performance are written by the
// (not-yet-built) pairing engine and default to zero; rating seeds the order in
// the meantime, so the table always shows real entrants.
export type StandingRow = {
  user_id: string;
  username: string;
  avatar: string | null;
  flair: string | null;
  rating: number;
  score: number;
  games_played: number;
  streak: number;
  performance: number | null;
  joined_at: number;
};

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const db = await getDb();

  const row = await db
    .prepare(
      `SELECT t.id, t.name, t.description, t.creator_user_id, t.creator_name, t.club_id,
              c.name AS club_name, t.format, t.mode, t.rated, t.clock_time_sec,
              t.clock_increment_sec, t.duration_min, t.starts_at, t.max_players, t.created_at
       FROM tournaments t
       LEFT JOIN clubs c ON c.id = t.club_id
       WHERE t.id = ?`,
    )
    .bind(params.id)
    .first<Omit<TournamentDetail, "players" | "phase">>();
  if (!row) return NextResponse.json({ error: "Tournament not found." }, { status: 404 });

  // Standings show each entrant's LIVE rating in the bucket this tournament
  // is played in (its mode: nerf or buff), the same number the leaderboard
  // tab and a game's seat row show for that category — never the frozen
  // legacy users.rating column. Shared rule: lib/server/ratingSql.ts.
  const ratingCategory = isModeCategory(row.mode) ? row.mode : "nerf";
  const standings = await db
    .prepare(
      `SELECT te.user_id, te.username, u.avatar, u.flair,
              ${categoryRatingSql("u")} AS rating,
              te.score, te.games_played, te.streak, te.performance, te.joined_at
       FROM tournament_entries te
       JOIN users u ON u.id = te.user_id
       WHERE te.tournament_id = ?
       ORDER BY te.score DESC, te.streak DESC, rating DESC, te.joined_at ASC
       LIMIT 500`,
    )
    .bind(ratingCategory, params.id)
    .all<StandingRow>();

  const user = await userForSession(db, sessionTokenFromCookieHeader(request.headers.get("cookie")));
  const entered = user ? standings.results.some((s) => s.user_id === user.id) : false;

  const tournament: TournamentDetail = {
    ...row,
    players: standings.results.length,
    phase: tournamentPhase(row.starts_at, row.duration_min),
  };

  return NextResponse.json({ tournament, standings: standings.results, entered });
}
