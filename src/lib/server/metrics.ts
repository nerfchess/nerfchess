/// <reference types="@cloudflare/workers-types" />

// The one source of truth for "how many people use the site" (brief section
// 16, findings F117, F118, F125). Every moderator number about accounts,
// sign-ups, active users, games and who is online comes from here, and every
// number ships with the sentence that defines it, so the mod stats page, the
// dashboard and the analytics feed cannot drift apart again.
//
// Where the data lives: `users`, `reports`, `mod_actions` are on D1; the
// finished-game archive is on Postgres through Hyperdrive (pgAll, with a D1
// fallback when Hyperdrive is not bound, as under `next dev`). The two stores
// cannot be joined, so the human filter on games is an id-prefix predicate
// plus an explicit list of test-account ids read from D1.
//
// Cost: the database part is computed at most once a minute per server
// instance (METRICS_TTL_MS) and every query is an index range except the
// account totals, which have to look at every account row once to count them.
// The online figures are live (one cheap call to the game server).

import { pgAll } from "./pg";
import { getGameServerStub } from "./gameServer";

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// The exclusion rule (INTEGRATOR DECISIONS Q5). Written once, printed on the
// page next to the numbers it shapes.
// ---------------------------------------------------------------------------

/** Id prefixes of accounts that are not people: the house-bot roster
 *  (bots.ts HOUSE_ROSTER) and the retired seeded leaderboard (migration 0014). */
export const BOT_ID_PREFIXES = ["hp_", "seed_"] as const;
/** Username prefix of local test accounts (scripts/polish/seed.ts). */
export const TEST_USERNAME_PREFIX = "polish_";

export const EXCLUSION_RULE =
  "Human counts leave out house bots (account ids starting hp_), the retired seeded leaderboard accounts " +
  "(ids starting seed_, or with no usable password) and test accounts (usernames starting polish_). " +
  "The public online figure on the home page and lobby is not a human count: it includes idle house personas " +
  "by owner decision and is shown here only for comparison.";

/** True when this account id belongs to a house bot or a seeded account. */
export function isBotUserId(id: string | null | undefined): boolean {
  return !!id && BOT_ID_PREFIXES.some((p) => id.startsWith(p));
}

/** WHERE fragment over `users` (alias-free): the row is a human account under
 *  the exclusion rule. Shared with any route that lists "real players" (F119). */
export const HUMAN_USER_SQL = `(id NOT LIKE 'hp\\_%' ESCAPE '\\'
   AND id NOT LIKE 'seed\\_%' ESCAPE '\\'
   AND password_hash <> 'unusable'
   AND username_lower NOT LIKE 'polish\\_%' ESCAPE '\\')`;

/** WHERE fragment over one `games` seat column: that seat was a human account
 *  (not NULL, not a bot id, not one of `testIds`). Anonymous seats are not
 *  accounts and cannot be counted as users, so they are not human here. */
export function humanSeatSql(col: string, testIds: string[] = []): string {
  const notTest = testIds.length ? ` AND ${col} NOT IN (${testIds.map(() => "?").join(",")})` : "";
  return `(${col} IS NOT NULL AND ${col} NOT LIKE 'hp\\_%' ESCAPE '\\' AND ${col} NOT LIKE 'seed\\_%' ESCAPE '\\'${notTest})`;
}

/** WHERE fragment over one `games` seat column: that seat was a house or seed bot. */
function botSeatSql(col: string): string {
  return `(${col} LIKE 'hp\\_%' ESCAPE '\\' OR ${col} LIKE 'seed\\_%' ESCAPE '\\')`;
}

// ---------------------------------------------------------------------------
// Definitions, printed next to each number.
// ---------------------------------------------------------------------------

export const DEFINITIONS = {
  exclusion: EXCLUSION_RULE,
  days: "Per-day figures use UTC calendar days (00:00 to 24:00 UTC). Today is the UTC day so far.",
  registered:
    "Registered accounts: accounts that signed up with a password or Google. A guest who registers keeps its account and counts as registered.",
  guests:
    "Guests: accounts minted for a signed-out visitor (one per browser). Guests who finished a game are shown separately from guests who never played.",
  email: "With email: registered accounts that have an email address on file (not verified).",
  signups:
    "Sign-ups: new registered accounts by the UTC day the account was created. A guest who registers later counts on the day the guest was created.",
  active:
    "Active: finished at least one archived game (rated or casual, against anyone, bots included) in the window, counted once per account. " +
    "DAU is the last 24 hours, WAU the last 7 days, MAU the last 30 days, each ending now. Players without an account are not counted.",
  games:
    "Games: archived online games by the UTC day they ended. Human vs human means both seats were human accounts or anonymous players; " +
    "human vs bot means one seat was a house bot; bot vs bot are house filler games. Local games against the in-browser bot are not archived " +
    "and are only counted as a running total.",
  online:
    "Online now: people with the site open on a live connection to the game server right now, signed in or not, house bots excluded. " +
    "Peak today: the highest such count since 00:00 UTC.",
} as const;

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export interface DayCount {
  date: string; // YYYY-MM-DD (UTC)
  n: number;
}

export interface GamesDay {
  date: string;
  nerf: { human: number; vsBot: number; botOnly: number };
  buff: { human: number; vsBot: number; botOnly: number };
}

export interface OnlineNow {
  /** Real people connected right now, or null when the game server does not report it. */
  humans: number | null;
  /** Highest `humans` since 00:00 UTC, or null when not reported. */
  peakToday: number | null;
  peakAt: number | null;
  /** The padded public figure every public page shows (players.length + anonymous). */
  publicFigure: number | null;
  /** Why a figure is missing, when one is. */
  note: string | null;
}

export interface SiteMetrics {
  generatedAt: number;
  definitions: typeof DEFINITIONS;
  accounts: {
    registered: number;
    withEmail: number;
    guests: number;
    guestsWhoPlayed: number;
    /** Excluded rows, so the reader can see the rule doing something. */
    excluded: { bots: number; tests: number };
  };
  signups: {
    today: number;
    last7d: number;
    last30d: number;
    daily: DayCount[]; // last 90 UTC days, oldest first
    weekly: DayCount[]; // last 13 weeks (date = first day), oldest first
    monthly: DayCount[]; // last 12 calendar months (date = first day), oldest first
  };
  active: {
    dau: ActiveSplit;
    wau: ActiveSplit;
    mau: ActiveSplit;
    daily: DayCount[]; // distinct active accounts per UTC day, last 30 days
  };
  games: {
    daily: GamesDay[]; // last 30 UTC days, oldest first
    today: { human: number; vsBot: number; botOnly: number };
    localBotGamesTotal: number;
  };
}

export interface ActiveSplit {
  total: number;
  registered: number;
  guests: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isoDay(dayIndex: number): string {
  return new Date(dayIndex * DAY_MS).toISOString().slice(0, 10);
}

/** Dense day series from sparse GROUP BY rows, oldest first. */
function denseDays(rows: { day: number; n: number }[], startDay: number, endDay: number): DayCount[] {
  const byDay = new Map<number, number>();
  for (const r of rows) byDay.set(Number(r.day), (byDay.get(Number(r.day)) ?? 0) + Number(r.n));
  const out: DayCount[] = [];
  for (let d = startDay; d <= endDay; d++) out.push({ date: isoDay(d), n: byDay.get(d) ?? 0 });
  return out;
}

/** Monday-start ISO week buckets of a dense daily series. */
function weekly(daily: DayCount[], weeks: number): DayCount[] {
  const map = new Map<string, number>();
  for (const d of daily) {
    const t = Date.parse(`${d.date}T00:00:00Z`);
    const dow = (new Date(t).getUTCDay() + 6) % 7; // Monday = 0
    const key = isoDay(Math.floor((t - dow * DAY_MS) / DAY_MS));
    map.set(key, (map.get(key) ?? 0) + d.n);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-weeks).map(([date, n]) => ({ date, n }));
}

function monthly(daily: DayCount[], months: number): DayCount[] {
  const map = new Map<string, number>();
  for (const d of daily) {
    const key = `${d.date.slice(0, 7)}-01`;
    map.set(key, (map.get(key) ?? 0) + d.n);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-months).map(([date, n]) => ({ date, n }));
}

/** Ids of the local test accounts (few; capped so the games predicate stays small). */
export async function testAccountIds(db: D1Database): Promise<string[]> {
  const rows = await db
    .prepare(`SELECT id FROM users WHERE username_lower LIKE 'polish\\_%' ESCAPE '\\' LIMIT 50`)
    .all<{ id: string }>();
  return rows.results.map((r) => r.id);
}

/** Split account ids into registered and guest (D1 lookup, chunked under the
 *  bound-parameter limit). Ids with no users row count as registered. */
async function guestSet(db: D1Database, ids: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  for (let i = 0; i < ids.length; i += 90) {
    const chunk = ids.slice(i, i + 90);
    const rows = await db
      .prepare(`SELECT id FROM users WHERE is_guest = 1 AND id IN (${chunk.map(() => "?").join(",")})`)
      .bind(...chunk)
      .all<{ id: string }>();
    for (const r of rows.results) out.add(r.id);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The computation
// ---------------------------------------------------------------------------

async function computeMetrics(db: D1Database, now: number): Promise<SiteMetrics> {
  const today = Math.floor(now / DAY_MS);
  const testIds = await testAccountIds(db);

  // --- Accounts (D1) ---
  const acct = await db
    .prepare(
      `SELECT
         SUM(CASE WHEN is_guest = 0 THEN 1 ELSE 0 END) AS registered,
         SUM(CASE WHEN is_guest = 0 AND email IS NOT NULL THEN 1 ELSE 0 END) AS with_email,
         SUM(CASE WHEN is_guest = 1 THEN 1 ELSE 0 END) AS guests,
         SUM(CASE WHEN is_guest = 1 AND games > 0 THEN 1 ELSE 0 END) AS guests_played
       FROM users WHERE ${HUMAN_USER_SQL}`,
    )
    .first<{ registered: number | null; with_email: number | null; guests: number | null; guests_played: number | null }>();
  const excluded = await db
    .prepare(
      `SELECT
         SUM(CASE WHEN username_lower LIKE 'polish\\_%' ESCAPE '\\' THEN 1 ELSE 0 END) AS tests,
         SUM(CASE WHEN username_lower LIKE 'polish\\_%' ESCAPE '\\' THEN 0 ELSE 1 END) AS bots
       FROM users WHERE NOT ${HUMAN_USER_SQL}`,
    )
    .first<{ tests: number | null; bots: number | null }>();

  // --- Sign-ups (D1, idx_users_guest_created range) ---
  const yearStart = (today - 365) * DAY_MS;
  const signupRows = await db
    .prepare(
      `SELECT created_at / 86400000 AS day, COUNT(*) AS n
       FROM users
       WHERE is_guest = 0 AND created_at >= ? AND ${HUMAN_USER_SQL}
       GROUP BY 1`,
    )
    .bind(yearStart)
    .all<{ day: number; n: number }>();
  const signupYear = denseDays(signupRows.results, today - 365, today);
  const sumLast = (series: DayCount[], days: number) => series.slice(-days).reduce((s, d) => s + d.n, 0);

  // --- Active accounts (archive, idx_games_completed range) ---
  const monthStart = (today - 29) * DAY_MS;
  const seatRows = await pgAll<{ uid: string; day: number; last_at: number }>(
    `SELECT uid, day, MAX(completed_at) AS last_at FROM (
       SELECT white_user_id AS uid, completed_at / 86400000 AS day, completed_at
         FROM games WHERE completed_at >= ? AND ${humanSeatSql("white_user_id", testIds)}
       UNION ALL
       SELECT black_user_id AS uid, completed_at / 86400000 AS day, completed_at
         FROM games WHERE completed_at >= ? AND ${humanSeatSql("black_user_id", testIds)}
     ) s GROUP BY uid, day`,
    [now - 30 * DAY_MS, ...testIds, now - 30 * DAY_MS, ...testIds],
  );
  const lastSeen = new Map<string, number>();
  const perDay = new Map<number, Set<string>>();
  for (const r of seatRows) {
    const at = Number(r.last_at);
    if ((lastSeen.get(r.uid) ?? 0) < at) lastSeen.set(r.uid, at);
    const day = Number(r.day);
    if (!perDay.has(day)) perDay.set(day, new Set());
    perDay.get(day)!.add(r.uid);
  }
  const guests = await guestSet(db, [...lastSeen.keys()]);
  const split = (windowMs: number): ActiveSplit => {
    let total = 0;
    let g = 0;
    for (const [uid, at] of lastSeen) {
      if (at < now - windowMs) continue;
      total++;
      if (guests.has(uid)) g++;
    }
    return { total, registered: total - g, guests: g };
  };
  const activeDaily = denseDays(
    [...perDay.entries()].map(([day, set]) => ({ day, n: set.size })),
    today - 29,
    today,
  );

  // --- Games per day by mode and seat kind (archive) ---
  // A game with a test account in either seat is left out entirely.
  const notTest = (col: string) =>
    testIds.length ? ` AND (${col} IS NULL OR ${col} NOT IN (${testIds.map(() => "?").join(",")}))` : "";
  const gameRows = await pgAll<{ day: number; mode: string; seats: string; n: number }>(
    `SELECT completed_at / 86400000 AS day,
            CASE WHEN category = 'buff' THEN 'buff' ELSE 'nerf' END AS mode,
            CASE
              WHEN ${botSeatSql("white_user_id")} AND ${botSeatSql("black_user_id")} THEN 'botOnly'
              WHEN ${botSeatSql("white_user_id")} OR ${botSeatSql("black_user_id")} THEN 'vsBot'
              ELSE 'human'
            END AS seats,
            COUNT(*)::int AS n
     FROM games
     WHERE completed_at >= ?${notTest("white_user_id")}${notTest("black_user_id")}
     GROUP BY 1, 2, 3`,
    [monthStart, ...testIds, ...testIds],
  );
  const days = new Map<number, GamesDay>();
  for (let d = today - 29; d <= today; d++) {
    days.set(d, {
      date: isoDay(d),
      nerf: { human: 0, vsBot: 0, botOnly: 0 },
      buff: { human: 0, vsBot: 0, botOnly: 0 },
    });
  }
  for (const r of gameRows) {
    const slot = days.get(Number(r.day));
    if (!slot) continue;
    const mode = r.mode === "buff" ? "buff" : "nerf";
    const seats = r.seats === "botOnly" ? "botOnly" : r.seats === "vsBot" ? "vsBot" : "human";
    slot[mode][seats] += Number(r.n);
  }
  const gamesDaily = [...days.values()];
  const todaySlot = gamesDaily[gamesDaily.length - 1];

  let localBotGamesTotal = 0;
  try {
    const row = await db.prepare(`SELECT value FROM site_counters WHERE key = 'bot_games'`).first<{ value: number }>();
    localBotGamesTotal = Number(row?.value ?? 0);
  } catch {}

  return {
    generatedAt: now,
    definitions: DEFINITIONS,
    accounts: {
      registered: Number(acct?.registered ?? 0),
      withEmail: Number(acct?.with_email ?? 0),
      guests: Number(acct?.guests ?? 0),
      guestsWhoPlayed: Number(acct?.guests_played ?? 0),
      excluded: { bots: Number(excluded?.bots ?? 0), tests: Number(excluded?.tests ?? 0) },
    },
    signups: {
      today: signupYear[signupYear.length - 1]?.n ?? 0,
      last7d: sumLast(signupYear, 7),
      last30d: sumLast(signupYear, 30),
      daily: signupYear.slice(-90),
      weekly: weekly(signupYear, 13),
      monthly: monthly(signupYear, 12),
    },
    active: { dau: split(DAY_MS), wau: split(7 * DAY_MS), mau: split(30 * DAY_MS), daily: activeDaily },
    games: {
      daily: gamesDaily,
      today: {
        human: todaySlot.nerf.human + todaySlot.buff.human,
        vsBot: todaySlot.nerf.vsBot + todaySlot.buff.vsBot,
        botOnly: todaySlot.nerf.botOnly + todaySlot.buff.botOnly,
      },
      localBotGamesTotal,
    },
  };
}

/** How long one computation is reused (per server instance). */
export const METRICS_TTL_MS = 60_000;
let cached: { at: number; value: SiteMetrics } | null = null;

/** Site metrics, recomputed at most once per METRICS_TTL_MS per instance.
 *  Only a finished result is cached, never an in-flight promise: a Worker must
 *  not make one request wait on I/O that a different (possibly cancelled)
 *  request started. A failed computation is not cached. */
export async function getSiteMetrics(db: D1Database, now = Date.now()): Promise<SiteMetrics> {
  if (cached && now - cached.at < METRICS_TTL_MS) return cached.value;
  const value = await computeMetrics(db, now);
  cached = { at: now, value };
  return value;
}

// ---------------------------------------------------------------------------
// Online now. Live, never cached: the same game-server connection count the
// public pages read, with the human-only figure the game server reports on its
// internal /mod/online route (slice H). The public figure is read from the same
// payload the public pages use, so the two can be compared side by side.
// ---------------------------------------------------------------------------

export async function getOnlineNow(): Promise<OnlineNow> {
  const empty: OnlineNow = { humans: null, peakToday: null, peakAt: null, publicFigure: null, note: null };
  let stub: DurableObjectStub | null = null;
  try {
    stub = getGameServerStub();
  } catch {
    stub = null;
  }
  if (!stub) return { ...empty, note: "The game server is not bound here (next dev runs without the Durable Object)." };
  try {
    const res = await stub.fetch("https://game-server/mod/online", { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = (await res.json()) as {
        humans?: number;
        peakHumansToday?: number;
        peakAt?: number;
        publicFigure?: number;
      };
      return {
        humans: typeof data.humans === "number" ? data.humans : null,
        peakToday: typeof data.peakHumansToday === "number" ? data.peakHumansToday : null,
        peakAt: typeof data.peakAt === "number" ? data.peakAt : null,
        publicFigure: typeof data.publicFigure === "number" ? data.publicFigure : null,
        note: null,
      };
    }
  } catch {}
  // The internal route is not there yet: fall back to the public payload for
  // the public figure and say why the human figure is missing.
  try {
    const res = await stub.fetch("https://game-server/lobby", { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = (await res.json()) as { players?: unknown[]; anonymous?: number };
      const publicFigure = (Array.isArray(data.players) ? data.players.length : 0) + Number(data.anonymous ?? 0);
      return { ...empty, publicFigure, note: "The game server does not report a human-only count yet." };
    }
  } catch {}
  return { ...empty, note: "The game server did not answer." };
}
