import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";

export const dynamic = "force-dynamic";

// Site-wide counters. `gamesPlayed` feeds the home page strip; the rest
// powers /stats. One row-scan per table, cheap at current scale.
export async function GET() {
  const db = await getDb();
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  const games = await db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN rated = 1 THEN 1 ELSE 0 END) AS rated,
              SUM(CASE WHEN completed_at > ? THEN 1 ELSE 0 END) AS today,
              SUM(CASE WHEN winner = 'w' THEN 1 ELSE 0 END) AS white_wins,
              SUM(CASE WHEN winner = 'b' THEN 1 ELSE 0 END) AS black_wins,
              SUM(CASE WHEN winner = 'draw' THEN 1 ELSE 0 END) AS draws,
              AVG(LENGTH(moves) - LENGTH(REPLACE(moves, ' ', '')) + 1) AS avg_plies
       FROM games`,
    )
    .bind(dayAgo)
    .first<{
      total: number;
      rated: number | null;
      today: number | null;
      white_wins: number | null;
      black_wins: number | null;
      draws: number | null;
      avg_plies: number | null;
    }>();

  const players = await db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN games > 0 THEN 1 ELSE 0 END) AS with_games
       FROM users`,
    )
    .first<{ total: number; with_games: number | null }>();

  // Which secret rules get dealt the most, with how often their holder wins.
  const nerfs = await db
    .prepare(
      `SELECT nerf, COUNT(*) AS dealt, SUM(won) AS wins FROM (
         SELECT white_nerf_id AS nerf, CASE WHEN winner = 'w' THEN 1 ELSE 0 END AS won FROM games
         UNION ALL
         SELECT black_nerf_id AS nerf, CASE WHEN winner = 'b' THEN 1 ELSE 0 END AS won FROM games
       ) GROUP BY nerf ORDER BY dealt DESC LIMIT 12`,
    )
    .all<{ nerf: string; dealt: number; wins: number | null }>();

  return NextResponse.json({
    gamesPlayed: games?.total ?? 0,
    games: {
      total: games?.total ?? 0,
      rated: games?.rated ?? 0,
      today: games?.today ?? 0,
      whiteWins: games?.white_wins ?? 0,
      blackWins: games?.black_wins ?? 0,
      draws: games?.draws ?? 0,
      averageMoves: games?.avg_plies ? Math.round(games.avg_plies / 2) : 0,
    },
    players: {
      total: players?.total ?? 0,
      withGames: players?.with_games ?? 0,
    },
    topNerfs: nerfs.results.map((row) => ({
      id: row.nerf,
      dealt: row.dealt,
      wins: row.wins ?? 0,
    })),
  });
}
