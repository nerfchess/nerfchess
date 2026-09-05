import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { pgAll, pgFirst } from "@/lib/server/pg";

export const dynamic = "force-dynamic";

// Site-wide counters. `gamesPlayed` feeds the home page strip; the rest
// powers the mod stats pages. Game aggregates read from the Postgres archive;
// player and bot-game counters stay on D1.
//
// Two scopes in one response: the existing top-level fields cover EVERYTHING
// (house-bot seats and the D1 bot_games counter included), and `humans` is the
// same shape recomputed over human-vs-human archive rows only. House seats are
// identifiable by their `hp_` user-id prefix (see bots.ts isHouseUserId);
// casual anonymous bot games never get an archive row at all.
const HUMAN_GAME = `white_user_id IS NOT NULL AND black_user_id IS NOT NULL
       AND white_user_id NOT LIKE 'hp\\_%' ESCAPE '\\'
       AND black_user_id NOT LIKE 'hp\\_%' ESCAPE '\\'`;

export async function GET() {
  const db = await getDb();
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  // Casts keep aggregate types as JS numbers: COUNT/SUM (int8) -> int, AVG
  // (numeric) -> float8.
  type GameAgg = {
    total: number;
    rated: number | null;
    today: number | null;
    white_wins: number | null;
    black_wins: number | null;
    draws: number | null;
    avg_plies: number | null;
  };
  const gamesAgg = (where: string) =>
    pgFirst<GameAgg>(
      `SELECT COUNT(*)::int AS total,
            SUM(CASE WHEN rated = 1 THEN 1 ELSE 0 END)::int AS rated,
            SUM(CASE WHEN completed_at > ? THEN 1 ELSE 0 END)::int AS today,
            SUM(CASE WHEN winner = 'w' THEN 1 ELSE 0 END)::int AS white_wins,
            SUM(CASE WHEN winner = 'b' THEN 1 ELSE 0 END)::int AS black_wins,
            SUM(CASE WHEN winner = 'draw' THEN 1 ELSE 0 END)::int AS draws,
            AVG(CASE WHEN moves = '' THEN 0 ELSE LENGTH(moves) - LENGTH(REPLACE(moves, ' ', '')) + 1 END)::float8 AS avg_plies
     FROM games${where}`,
      [dayAgo],
    );
  const games = await gamesAgg("");
  const humanGames = await gamesAgg(` WHERE ${HUMAN_GAME}`);

  // Distinct humans who have finished a human-vs-human game.
  const humanPlayers = await pgFirst<{ players: number }>(
    `SELECT COUNT(DISTINCT uid)::int AS players FROM (
       SELECT white_user_id AS uid FROM games WHERE ${HUMAN_GAME}
       UNION
       SELECT black_user_id FROM games WHERE ${HUMAN_GAME}
     ) u`,
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
  const topNerfs = (where: string) =>
    pgAll<{ nerf: string; dealt: number; wins: number | null }>(
      `SELECT nerf, COUNT(*)::int AS dealt, SUM(won)::int AS wins FROM (
       SELECT white_nerf_id AS nerf, CASE WHEN winner = 'w' THEN 1 ELSE 0 END AS won FROM games${where}
       UNION ALL
       SELECT black_nerf_id AS nerf, CASE WHEN winner = 'b' THEN 1 ELSE 0 END AS won FROM games${where}
     ) sub
     -- 'none' is the Buff-mode sentinel (UNRESTRICTED_NERF in engine/game.ts):
     -- every Buff seat writes it, so without this it tops the table with a
     -- meaningless 50%. It is not a rule and never counts as one.
     WHERE nerf IS NOT NULL AND nerf <> 'none'
     GROUP BY nerf ORDER BY dealt DESC LIMIT 12`,
    );
  const nerfs = await topNerfs("");
  const humanNerfs = await topNerfs(` WHERE ${HUMAN_GAME}`);

  const gameBlock = (g: GameAgg | null) => ({
    total: g?.total ?? 0,
    rated: g?.rated ?? 0,
    today: g?.today ?? 0,
    whiteWins: g?.white_wins ?? 0,
    blackWins: g?.black_wins ?? 0,
    draws: g?.draws ?? 0,
    averageMoves: g?.avg_plies ? Math.round(g.avg_plies / 2) : 0,
  });
  const nerfBlock = (rows: { nerf: string; dealt: number; wins: number | null }[]) =>
    rows.map((row) => ({ id: row.nerf, dealt: row.dealt, wins: row.wins ?? 0 }));

  return NextResponse.json({
    gamesPlayed: (games?.total ?? 0) + botGames,
    games: { ...gameBlock(games), vsBots: botGames },
    players: {
      total: players?.total ?? 0,
      withGames: players?.with_games ?? 0,
    },
    topNerfs: nerfBlock(nerfs),
    // Human-vs-human only: no house seats, no anonymous bot counter.
    humans: {
      games: gameBlock(humanGames),
      players: { withGames: humanPlayers?.players ?? 0 },
      topNerfs: nerfBlock(humanNerfs),
    },
  });
}
