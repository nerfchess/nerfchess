import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { pgAll, pgFirst } from "@/lib/server/pg";

export const dynamic = "force-dynamic";

// Site-wide counters. `gamesPlayed` feeds the home page strip; the rest
// powers /stats. Game aggregates read from the Postgres archive; player and
// bot-game counters stay on D1.
export async function GET() {
  const db = await getDb();
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  // Casts keep aggregate types as JS numbers: COUNT/SUM (int8) -> int, AVG
  // (numeric) -> float8.
  const games = await pgFirst<{
    total: number;
    rated: number | null;
    today: number | null;
    white_wins: number | null;
    black_wins: number | null;
    draws: number | null;
    avg_plies: number | null;
  }>(
    `SELECT COUNT(*)::int AS total,
            SUM(CASE WHEN rated = 1 THEN 1 ELSE 0 END)::int AS rated,
            SUM(CASE WHEN completed_at > ? THEN 1 ELSE 0 END)::int AS today,
            SUM(CASE WHEN winner = 'w' THEN 1 ELSE 0 END)::int AS white_wins,
            SUM(CASE WHEN winner = 'b' THEN 1 ELSE 0 END)::int AS black_wins,
            SUM(CASE WHEN winner = 'draw' THEN 1 ELSE 0 END)::int AS draws,
            AVG(LENGTH(moves) - LENGTH(REPLACE(moves, ' ', '')) + 1)::float8 AS avg_plies
     FROM games`,
    [dayAgo],
  );

  // Bot games are counted separately (they never get a `games` row).
  let botGames = 0;
  try {
    const row = await db
      .prepare(`SELECT value FROM site_counters WHERE key = 'bot_games'`)
      .first<{ value: number }>();
    botGames = row?.value ?? 0;
  } catch {}

  const players = await db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN games > 0 THEN 1 ELSE 0 END) AS with_games
       FROM users`,
    )
    .first<{ total: number; with_games: number | null }>();

  // Which secret rules get dealt the most, with how often their holder wins.
  const nerfs = await pgAll<{ nerf: string; dealt: number; wins: number | null }>(
    `SELECT nerf, COUNT(*)::int AS dealt, SUM(won)::int AS wins FROM (
       SELECT white_nerf_id AS nerf, CASE WHEN winner = 'w' THEN 1 ELSE 0 END AS won FROM games
       UNION ALL
       SELECT black_nerf_id AS nerf, CASE WHEN winner = 'b' THEN 1 ELSE 0 END AS won FROM games
     ) sub GROUP BY nerf ORDER BY dealt DESC LIMIT 12`,
  );

  return NextResponse.json({
    gamesPlayed: (games?.total ?? 0) + botGames,
    games: {
      total: games?.total ?? 0,
      vsBots: botGames,
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
    topNerfs: nerfs.map((row) => ({
      id: row.nerf,
      dealt: row.dealt,
      wins: row.wins ?? 0,
    })),
  });
}
