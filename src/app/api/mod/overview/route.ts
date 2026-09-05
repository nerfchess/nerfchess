import { NextResponse } from "next/server";
import { requireMod } from "@/lib/server/mod";
import { pgAll, pgFirst } from "@/lib/server/pg";
import { BOTH_HUMAN_SQL, BOT_SEAT_SQL, HUMAN_GAME_SQL } from "@/lib/server/modGames";
import { HOUSE_BY_ID_SKILL } from "@/lib/server/bots";

export const dynamic = "force-dynamic";

// The moderator overview: the numbers that answer "is the site healthy, and are
// the house bots telling the truth?" in one request.
//
// The headline one is HOUSE WIN RATE AGAINST HUMANS, BROKEN DOWN BY SKILL TIER.
// Nothing else on the site can tell you whether a bot advertising 1450 actually
// plays like 1450 — and after the 2026-07 rating re-spread that is exactly the
// question, because the tiers above 2200 knowingly advertise more than the
// engine can currently back (see docs/house-bots.md). A tier winning 80% of its
// human games is rated too low; one winning 20% is rated too high.
//
// All SQL sticks to the shared D1/Postgres dialect the pgAll helper expects
// (`?` placeholders, LIKE ... ESCAPE) so one query serves both storage paths,
// and numeric aggregates are cast ::float8 because postgres.js decodes numeric
// to strings.

const DAY_MS = 24 * 60 * 60 * 1000;

interface CountRow {
  n: number;
}

/** Games where a house seat faced a human, with who won, grouped by house id. */
interface HouseGameRow {
  house_id: string;
  played: number;
  won: number;
  drawn: number;
}

export async function GET(request: Request) {
  const guard = await requireMod(request);
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const now = Date.now();
  const d = new Date(now);
  const todayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const weekStart = now - 7 * DAY_MS;
  const monthStart = now - 30 * DAY_MS;

  // --- Signups and returning players (D1: users lives there on both paths) ---
  const accounts = await db
    .prepare(
      `SELECT
         SUM(CASE WHEN is_guest = 0 AND created_at >= ? THEN 1 ELSE 0 END) AS members_today,
         SUM(CASE WHEN is_guest = 0 AND created_at >= ? THEN 1 ELSE 0 END) AS members_week,
         SUM(CASE WHEN is_guest = 1 AND created_at >= ? THEN 1 ELSE 0 END) AS guests_today,
         SUM(CASE WHEN is_guest = 1 AND created_at >= ? THEN 1 ELSE 0 END) AS guests_week,
         SUM(CASE WHEN is_guest = 0 THEN 1 ELSE 0 END) AS members_total
       FROM users
       WHERE id NOT LIKE 'hp\\_%' ESCAPE '\\' AND id NOT LIKE 'seed\\_%' ESCAPE '\\'`,
    )
    .bind(todayStart, weekStart, todayStart, weekStart)
    .first<{
      members_today: number | null;
      members_week: number | null;
      guests_today: number | null;
      guests_week: number | null;
      members_total: number | null;
    }>();

  // --- Moderation queue depth (all D1) ---
  const queue = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM reports WHERE status = 'open') AS open_reports,
         (SELECT COUNT(*) FROM chat_flags WHERE reviewed = 0) AS unreviewed_flags,
         (SELECT COUNT(*) FROM users WHERE muted_until IS NOT NULL AND muted_until > ?) AS active_mutes,
         (SELECT COUNT(*) FROM users WHERE banned_until IS NOT NULL AND banned_until > ?) AS active_bans,
         (SELECT COUNT(*) FROM mod_actions WHERE created_at >= ?) AS actions_week`,
    )
    .bind(now, now, weekStart)
    .first<{
      open_reports: number | null;
      unreviewed_flags: number | null;
      active_mutes: number | null;
      active_bans: number | null;
      actions_week: number | null;
    }>();

  // --- Human game volume and the human-vs-house split ---
  const volume = await pgFirst<{
    today_total: number;
    today_hvh: number;
    week_total: number;
    week_hvh: number;
    month_total: number;
    avg_duration_ms: number | null;
  }>(
    `SELECT
       SUM(CASE WHEN completed_at >= ? THEN 1 ELSE 0 END)::float8 AS today_total,
       SUM(CASE WHEN completed_at >= ? AND ${BOTH_HUMAN_SQL} THEN 1 ELSE 0 END)::float8 AS today_hvh,
       SUM(CASE WHEN completed_at >= ? THEN 1 ELSE 0 END)::float8 AS week_total,
       SUM(CASE WHEN completed_at >= ? AND ${BOTH_HUMAN_SQL} THEN 1 ELSE 0 END)::float8 AS week_hvh,
       COUNT(*)::float8 AS month_total,
       AVG(CASE WHEN completed_at >= ? THEN completed_at - started_at ELSE NULL END)::float8 AS avg_duration_ms
     FROM games
     WHERE completed_at >= ? AND ${HUMAN_GAME_SQL}`,
    [todayStart, todayStart, weekStart, weekStart, weekStart, monthStart],
  );

  // --- How human games END: the flag/abandon share -------------------------
  // A high abandon rate is the single loudest signal that something in the
  // product is frustrating people mid-game.
  const endings = await pgAll<{ reason: string | null; n: number }>(
    `SELECT reason, COUNT(*)::float8 AS n
     FROM games
     WHERE completed_at >= ? AND ${HUMAN_GAME_SQL}
     GROUP BY reason`,
    [weekStart],
  );
  let flagged = 0;
  let abandoned = 0;
  let resigned = 0;
  let decided = 0;
  let drawn = 0;
  let endingsTotal = 0;
  for (const row of endings) {
    const n = Number(row.n);
    const reason = (row.reason ?? "").toLowerCase();
    endingsTotal += n;
    if (reason.includes("time")) flagged += n;
    else if (reason.includes("abandon") || reason.includes("disconnect")) abandoned += n;
    else if (reason.includes("resign")) resigned += n;
    else if (reason.includes("draw") || reason.includes("repetition") || reason.includes("stalemate")) drawn += n;
    else decided += n;
  }

  // --- House bots vs humans, per advertised tier ---------------------------
  // One row per house account that faced a human in the last 30 days, then
  // folded into tiers in TypeScript (the tier lives in code, not in the
  // database, so it cannot be a GROUP BY).
  const houseRows = await pgAll<HouseGameRow>(
    `SELECT house_id,
            COUNT(*)::float8 AS played,
            SUM(won)::float8 AS won,
            SUM(drawn)::float8 AS drawn
     FROM (
       SELECT white_user_id AS house_id,
              CASE WHEN winner = 'w' THEN 1 ELSE 0 END AS won,
              CASE WHEN winner = 'draw' THEN 1 ELSE 0 END AS drawn
       FROM games
       WHERE completed_at >= ? AND ${BOT_SEAT_SQL("white_user_id")}
         AND NOT ${BOT_SEAT_SQL("black_user_id")} AND black_user_id IS NOT NULL
       UNION ALL
       SELECT black_user_id AS house_id,
              CASE WHEN winner = 'b' THEN 1 ELSE 0 END AS won,
              CASE WHEN winner = 'draw' THEN 1 ELSE 0 END AS drawn
       FROM games
       WHERE completed_at >= ? AND ${BOT_SEAT_SQL("black_user_id")}
         AND NOT ${BOT_SEAT_SQL("white_user_id")} AND white_user_id IS NOT NULL
     ) seats
     GROUP BY house_id`,
    [monthStart, monthStart],
  );

  const byTier = new Map<number, { played: number; won: number; drawn: number }>();
  let houseVsHumanTotal = 0;
  for (const row of houseRows) {
    const skill = HOUSE_BY_ID_SKILL.get(row.house_id);
    if (skill == null) continue; // a retired seed_ account, or a renamed persona
    const bucket = byTier.get(skill) ?? { played: 0, won: 0, drawn: 0 };
    bucket.played += Number(row.played);
    bucket.won += Number(row.won);
    bucket.drawn += Number(row.drawn);
    byTier.set(skill, bucket);
    houseVsHumanTotal += Number(row.played);
  }
  const houseTiers = [...byTier.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([skill, b]) => ({
      skill,
      played: b.played,
      won: b.won,
      drawn: b.drawn,
      lost: b.played - b.won - b.drawn,
      // Chess scoring: a draw is half a point. This is the number to compare
      // against 50%, since a fairly-rated bot should score about half.
      scorePct: b.played > 0 ? Math.round(((b.won + b.drawn / 2) / b.played) * 1000) / 10 : null,
    }));

  // --- Card balance: pick and win rate, the top of each end ----------------
  // Doubles as the balance dataset docs/improvement-roadmap.md asks for. The
  // Buff-mode sentinel id 'none' (UNRESTRICTED_NERF) is excluded: it is not a
  // card, and it used to sit at the top of the table with a 50% "win rate".
  const cardRows = await pgAll<{ card: string; picks: number; wins: number }>(
    `SELECT card, COUNT(*)::float8 AS picks, SUM(won)::float8 AS wins
     FROM (
       SELECT white_nerf_id AS card, CASE WHEN winner = 'w' THEN 1 ELSE 0 END AS won
       FROM games WHERE completed_at >= ? AND white_nerf_id IS NOT NULL AND white_nerf_id <> 'none' AND ${HUMAN_GAME_SQL}
       UNION ALL
       SELECT black_nerf_id AS card, CASE WHEN winner = 'b' THEN 1 ELSE 0 END AS won
       FROM games WHERE completed_at >= ? AND black_nerf_id IS NOT NULL AND black_nerf_id <> 'none' AND ${HUMAN_GAME_SQL}
     ) picks
     GROUP BY card`,
    [monthStart, monthStart],
  ).catch(() => [] as { card: string; picks: number; wins: number }[]);
  const MIN_SAMPLE = 8;
  const nerfs = cardRows
    .map((r) => ({
      id: r.card,
      picks: Number(r.picks),
      winPct: Number(r.picks) > 0 ? Math.round((Number(r.wins) / Number(r.picks)) * 1000) / 10 : 0,
    }))
    .filter((r) => r.picks >= MIN_SAMPLE)
    .sort((a, b) => b.winPct - a.winPct);

  const liveNow = await pgFirst<CountRow>(
    `SELECT COUNT(*)::float8 AS n FROM games WHERE completed_at >= ? AND ${HUMAN_GAME_SQL}`,
    [now - 15 * 60 * 1000],
  );

  const todayTotal = Number(volume?.today_total ?? 0);
  const todayHvH = Number(volume?.today_hvh ?? 0);
  const weekTotal = Number(volume?.week_total ?? 0);
  const weekHvH = Number(volume?.week_hvh ?? 0);

  return NextResponse.json({
    generatedAt: now,
    accounts: {
      membersToday: Number(accounts?.members_today ?? 0),
      membersWeek: Number(accounts?.members_week ?? 0),
      guestsToday: Number(accounts?.guests_today ?? 0),
      guestsWeek: Number(accounts?.guests_week ?? 0),
      membersTotal: Number(accounts?.members_total ?? 0),
    },
    queue: {
      openReports: Number(queue?.open_reports ?? 0),
      unreviewedChatFlags: Number(queue?.unreviewed_flags ?? 0),
      activeMutes: Number(queue?.active_mutes ?? 0),
      activeBans: Number(queue?.active_bans ?? 0),
      modActionsWeek: Number(queue?.actions_week ?? 0),
    },
    games: {
      humanGamesLast15Min: Number(liveNow?.n ?? 0),
      today: { total: todayTotal, humanVsHuman: todayHvH, humanVsHouse: todayTotal - todayHvH },
      week: { total: weekTotal, humanVsHuman: weekHvH, humanVsHouse: weekTotal - weekHvH },
      month: { total: Number(volume?.month_total ?? 0) },
      avgDurationMs: volume?.avg_duration_ms != null ? Math.round(Number(volume.avg_duration_ms)) : null,
    },
    endings: { total: endingsTotal, flagged, abandoned, resigned, decided, drawn },
    house: {
      windowDays: 30,
      vsHumanGames: houseVsHumanTotal,
      tiers: houseTiers,
    },
    nerfBalance: {
      windowDays: 30,
      minSample: MIN_SAMPLE,
      strongest: nerfs.slice(0, 8),
      weakest: nerfs.slice(-8).reverse(),
    },
  });
}
