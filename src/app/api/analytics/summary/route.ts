import { NextResponse } from "next/server";
import { getDb, getEnvVar } from "@/lib/server/db";
import { pgAll, pgFirst } from "@/lib/server/pg";
import { HUMAN_USER_SQL, humanSeatSql, testAccountIds } from "@/lib/server/metrics";
import { HUMAN_GAME_SQL } from "@/lib/server/modGames";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/summary - read-only daily aggregates for the growth
 * dashboard (the nerfchess-tracker repo's "Nerf Chess product analytics"
 * connector).
 *
 * Auth: requires `Authorization: Bearer <key>` where <key> matches the
 * NERFCHESS_ANALYTICS_KEY environment variable (a Cloudflare Workers secret /
 * wrangler var). If the variable is not configured the route always answers
 * 401, so it is safe by default.
 *
 * Response shape (all day buckets are UTC calendar days, oldest first):
 * {
 *   generatedAt: string,            // ISO timestamp
 *   range: { days: 30, start: "YYYY-MM-DD", end: "YYYY-MM-DD" },
 *   totals: {
 *     users: number,                // human accounts, guests included (exclusion rule below)
 *     games: number,                // archived games with at least one human seat (all time)
 *     botGames: number,             // local vs-bot games counter (all time)
 *     activeUsers1d: number,        // distinct human accounts that finished a game today (UTC)
 *     activeUsers7d: number,
 *     activeUsers30d: number
 *   },
 *   daily: [{ date: "YYYY-MM-DD", games: number, newUsers: number, activeUsers: number }],
 *   modes: { nerf: number, buff: number, other: number }   // games in the 30-day window
 * }
 *
 * Humans only (F117): house bots (hp_ ids), seeded accounts (seed_) and test
 * accounts (polish_ usernames) are left out of every count, the rule written
 * in src/lib/server/metrics.ts (EXCLUSION_RULE). Guests are accounts with
 * real ids and ARE counted when they play; anonymous seats (NULL ids) have no
 * account and are not.
 *
 * Query cost: every games query is bounded by `completed_at >= cutoff` and
 * served by idx_games_completed; the users scan is bounded by created_at over
 * a small table; totals reuse the same aggregates /api/stats already runs.
 */

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;

function keysMatch(a: string, b: string): boolean {
  // Constant-time-ish comparison so the key cannot be probed byte by byte.
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

function isoDay(dayIndex: number): string {
  return new Date(dayIndex * DAY_MS).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  // Deny-by-default auth: no configured key means nobody gets in.
  const expected = getEnvVar("NERFCHESS_ANALYTICS_KEY");
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!expected || !provided || !keysMatch(expected, provided)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const now = Date.now();
  const todayIndex = Math.floor(now / DAY_MS);
  const startIndex = todayIndex - (WINDOW_DAYS - 1);
  const cutoff = startIndex * DAY_MS;
  const cutoff7d = (todayIndex - 6) * DAY_MS;
  const cutoff1d = todayIndex * DAY_MS;
  const testIds = await testAccountIds(db);
  const humanW = humanSeatSql("white_user_id", testIds);
  const humanB = humanSeatSql("black_user_id", testIds);

  // Games per UTC day over the window (index range on completed_at, then a
  // small GROUP BY). Integer division truncates identically on Postgres int8
  // and SQLite, so the same SQL serves both the archive and the D1 fallback.
  const gamesPerDay = await pgAll<{ day: number; n: number }>(
    `SELECT completed_at / 86400000 AS day, COUNT(*)::int AS n
     FROM games WHERE completed_at >= ? AND ${HUMAN_GAME_SQL}
     GROUP BY 1`,
    [cutoff],
  );

  // Distinct human accounts per day (house, seed and test seats excluded;
  // anonymous seats have no id). Both halves hit the completed_at index.
  const activePerDay = await pgAll<{ day: number; n: number }>(
    `SELECT day, COUNT(DISTINCT uid)::int AS n FROM (
       SELECT completed_at / 86400000 AS day, white_user_id AS uid
         FROM games WHERE completed_at >= ? AND ${humanW}
       UNION ALL
       SELECT completed_at / 86400000 AS day, black_user_id AS uid
         FROM games WHERE completed_at >= ? AND ${humanB}
     ) sub GROUP BY day`,
    [cutoff, ...testIds, cutoff, ...testIds],
  );

  // Rolling distinct-player windows (true DAU/WAU/MAU, not sums of dailies).
  const actives = await pgFirst<{ d1: number | null; d7: number | null; d30: number | null }>(
    `SELECT COUNT(DISTINCT CASE WHEN completed_at >= ? THEN uid END)::int AS d1,
            COUNT(DISTINCT CASE WHEN completed_at >= ? THEN uid END)::int AS d7,
            COUNT(DISTINCT uid)::int AS d30
     FROM (
       SELECT completed_at, white_user_id AS uid
         FROM games WHERE completed_at >= ? AND ${humanW}
       UNION ALL
       SELECT completed_at, black_user_id AS uid
         FROM games WHERE completed_at >= ? AND ${humanB}
     ) sub`,
    [cutoff1d, cutoff7d, cutoff, ...testIds, cutoff, ...testIds],
  );

  // Mode split for the window. `category` carries the queue mode for draft
  // games ("nerf"/"buff"); classic-ruleset games are Nerf mode by definition.
  // Anything else (e.g. casual draft games labeled by speed) lands in `other`.
  const modeRows = await pgAll<{ ruleset: string | null; category: string | null; n: number }>(
    `SELECT ruleset, category, COUNT(*)::int AS n
     FROM games WHERE completed_at >= ? AND ${HUMAN_GAME_SQL}
     GROUP BY ruleset, category`,
    [cutoff],
  );

  // New accounts per day (D1 `users` is the account source of truth).
  const signupsPerDay = await db
    .prepare(
      `SELECT created_at / 86400000 AS day, COUNT(*) AS n
       FROM users WHERE created_at >= ? AND ${HUMAN_USER_SQL}
       GROUP BY 1`,
    )
    .bind(cutoff)
    .all<{ day: number; n: number }>();

  // Totals: same aggregates the public /api/stats endpoint already serves.
  const gamesTotal = await pgFirst<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM games WHERE ${HUMAN_GAME_SQL}`,
  );
  const usersTotal = await db
    .prepare(`SELECT COUNT(*) AS total FROM users WHERE ${HUMAN_USER_SQL}`)
    .first<{ total: number }>();
  let botGames = 0;
  try {
    const row = await db
      .prepare(`SELECT value FROM site_counters WHERE key = 'bot_games'`)
      .first<{ value: number }>();
    botGames = row?.value ?? 0;
  } catch {}

  // Stitch the sparse GROUP BY rows into a dense 30-day series.
  const byDay = new Map<number, { games: number; newUsers: number; activeUsers: number }>();
  for (let d = startIndex; d <= todayIndex; d++) {
    byDay.set(d, { games: 0, newUsers: 0, activeUsers: 0 });
  }
  for (const row of gamesPerDay) {
    const slot = byDay.get(row.day);
    if (slot) slot.games = row.n;
  }
  for (const row of activePerDay) {
    const slot = byDay.get(row.day);
    if (slot) slot.activeUsers = row.n;
  }
  for (const row of signupsPerDay.results) {
    const slot = byDay.get(row.day);
    if (slot) slot.newUsers = row.n;
  }
  const daily = Array.from(byDay.entries()).map(([day, v]) => ({
    date: isoDay(day),
    ...v,
  }));

  const modes = { nerf: 0, buff: 0, other: 0 };
  for (const row of modeRows) {
    if (row.category === "buff") modes.buff += row.n;
    else if (row.category === "nerf" || row.ruleset === "classic" || row.ruleset == null) {
      modes.nerf += row.n;
    } else modes.other += row.n;
  }

  return NextResponse.json(
    {
      generatedAt: new Date(now).toISOString(),
      range: {
        days: WINDOW_DAYS,
        start: isoDay(startIndex),
        end: isoDay(todayIndex),
      },
      totals: {
        users: usersTotal?.total ?? 0,
        games: gamesTotal?.total ?? 0,
        botGames,
        activeUsers1d: actives?.d1 ?? 0,
        activeUsers7d: actives?.d7 ?? 0,
        activeUsers30d: actives?.d30 ?? 0,
      },
      daily,
      modes,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
