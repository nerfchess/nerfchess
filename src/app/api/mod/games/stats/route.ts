import { NextResponse } from "next/server";
import { requireMod } from "@/lib/server/mod";
import { pgAll, pgFirst } from "@/lib/server/pg";
import {
  BOTH_HUMAN_SQL,
  BOT_SEAT_SQL,
  HUMAN_GAME_SQL,
  guestIdSet,
} from "@/lib/server/modGames";

export const dynamic = "force-dynamic";

// Stats strip for the moderator "human games" tab: how much real (at least
// one human seat) play happened today / this week, the human-vs-human vs
// human-vs-house split, average game length, the most-played mode, distinct
// humans seen today (guests counted separately), and when the most recent
// human game finished. Same both-path storage story as /api/mod/games: the
// archive is read via pgAll (Postgres in prod, D1 fallback in dev) and the
// guest/member split always comes from the D1 users table.
//
// All SQL sticks to the shared D1/Postgres dialect. Numeric aggregates are
// cast ::float8 so postgres.js returns numbers (its numeric type decodes to
// strings); the D1 fallback strips the casts.

interface WindowAggRow {
  week_total: number;
  today_total: number;
  week_hvh: number;
  today_hvh: number;
  avg_moves: number | null;
  avg_duration_ms: number | null;
}

export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const now = new Date();
  // "Today" is the UTC calendar day; "this week" is a rolling 7 days.
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const agg = await pgFirst<WindowAggRow>(
    `SELECT COUNT(*)::float8 AS week_total,
            SUM(CASE WHEN completed_at >= ? THEN 1 ELSE 0 END)::float8 AS today_total,
            SUM(CASE WHEN ${BOTH_HUMAN_SQL} THEN 1 ELSE 0 END)::float8 AS week_hvh,
            SUM(CASE WHEN ${BOTH_HUMAN_SQL} AND completed_at >= ? THEN 1 ELSE 0 END)::float8 AS today_hvh,
            AVG(CASE WHEN moves <> ''
                THEN LENGTH(moves) - LENGTH(REPLACE(moves, ' ', '')) + 1
                ELSE 0 END)::float8 AS avg_moves,
            AVG(completed_at - started_at)::float8 AS avg_duration_ms
     FROM games
     WHERE completed_at >= ? AND ${HUMAN_GAME_SQL}`,
    [todayStart, todayStart, weekStart],
  );

  // Most-played mode over the week. `ruleset`/`category` describe the game:
  // draft games carry their mode ("nerf"/"buff") in category, classic games a
  // speed bucket. Collapsed into one label per group here; the top group wins.
  const modeRows = await pgAll<{ ruleset: string | null; category: string | null; n: number }>(
    `SELECT ruleset, category, COUNT(*)::float8 AS n
     FROM games
     WHERE completed_at >= ? AND ${HUMAN_GAME_SQL}
     GROUP BY ruleset, category`,
    [weekStart],
  );
  const modeCounts = new Map<string, number>();
  for (const row of modeRows) {
    const label =
      row.ruleset === "draft"
        ? row.category === "nerf" || row.category === "buff"
          ? row.category
          : "draft"
        : `classic${row.category ? ` ${row.category}` : ""}`;
    modeCounts.set(label, (modeCounts.get(label) ?? 0) + Number(row.n));
  }
  let topMode: { label: string; games: number } | null = null;
  for (const [label, games] of modeCounts) {
    if (!topMode || games > topMode.games) topMode = { label, games };
  }

  // Distinct humans seated in a game today. Anonymous (NULL) seats have no id
  // to count, so they are reported as a seat count instead.
  const humanIdRows = await pgAll<{ uid: string }>(
    `SELECT white_user_id AS uid FROM games
     WHERE completed_at >= ? AND white_user_id IS NOT NULL AND NOT ${BOT_SEAT_SQL("white_user_id")}
     UNION
     SELECT black_user_id AS uid FROM games
     WHERE completed_at >= ? AND black_user_id IS NOT NULL AND NOT ${BOT_SEAT_SQL("black_user_id")}`,
    [todayStart, todayStart],
  );
  const humanIds = humanIdRows.map((row) => row.uid);
  const guests = await guestIdSet(db, humanIds);
  const guestCount = humanIds.filter((id) => guests.has(id)).length;

  const anonSeats = await pgFirst<{ n: number }>(
    `SELECT COUNT(*)::float8 AS n FROM games
     WHERE completed_at >= ? AND (white_user_id IS NULL OR black_user_id IS NULL)`,
    [todayStart],
  );

  const lastHuman = await pgFirst<{ id: string; completed_at: number }>(
    `SELECT id, completed_at FROM games
     WHERE ${HUMAN_GAME_SQL}
     ORDER BY completed_at DESC LIMIT 1`,
  );

  const weekTotal = Number(agg?.week_total ?? 0);
  const todayTotal = Number(agg?.today_total ?? 0);
  const weekHvH = Number(agg?.week_hvh ?? 0);
  const todayHvH = Number(agg?.today_hvh ?? 0);

  return NextResponse.json({
    today: { total: todayTotal, humanVsHuman: todayHvH, humanVsHouse: todayTotal - todayHvH },
    week: { total: weekTotal, humanVsHuman: weekHvH, humanVsHouse: weekTotal - weekHvH },
    averageGame: {
      moves: agg?.avg_moves != null ? Math.round(Number(agg.avg_moves)) : null,
      durationMs: agg?.avg_duration_ms != null ? Math.round(Number(agg.avg_duration_ms)) : null,
    },
    topMode,
    humansToday: {
      members: humanIds.length - guestCount,
      guests: guestCount,
      anonSeatGames: Number(anonSeats?.n ?? 0),
    },
    lastHumanGame: lastHuman ? { id: lastHuman.id, completedAt: lastHuman.completed_at } : null,
  });
}
