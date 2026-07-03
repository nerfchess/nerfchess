/// <reference types="@cloudflare/workers-types" />

// House players ("bots"): a fixed roster of engine-driven accounts that keep
// the site alive when few humans are around. They hold real user rows (so
// rated games and the leaderboard work), play each other, sit in the lobby as
// seeks, and pick up humans who queue. They present as regular players except
// for a faint star in the top-right corner of their avatar.

const BOT_NAMES = [
  "nerfchessnumberone",
  "squeakycrab",
  "200leansoon",
  "sixsevensixseven",
  "math",
  "toastedbagel",
  "zugzwang_enjoyer",
  "capybara99",
  "knightmare2000",
  "pawnshop",
  "iforkedup",
  "eloqueen",
  "quietcoyote",
  "brickedmyqueen",
  "Wanderer04",
] as const;

export type BotProfile = {
  name: string;
  userId: string;
  avatar: string;
  initialRating: number;
};

// Starred avatar presets (see lib/avatars.ts); never offered to real accounts.
const STAR_AVATARS = [
  "gold_n_star",
  "verdigris_b_star",
  "bruise_r_star",
  "oxblood_q_star",
  "slate_n_star",
  "copper_b_star",
  "moss_r_star",
  "plum_q_star",
  "gold_q_star",
  "verdigris_r_star",
  "bruise_n_star",
  "oxblood_b_star",
  "slate_q_star",
  "copper_r_star",
  "moss_n_star",
];

function nameHash(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return hash;
}

export const BOT_ROSTER: BotProfile[] = BOT_NAMES.map((name, i) => ({
  name,
  userId: `bot_${name.toLowerCase()}`,
  avatar: STAR_AVATARS[i % STAR_AVATARS.length],
  // Spread starting ratings so the roster doesn't debut as fifteen identical
  // 1500s; Glicko moves them to their real strength quickly (rd starts high).
  initialRating: 1550 + (nameHash(name) % 350),
}));

const BOT_USER_IDS = new Set(BOT_ROSTER.map((bot) => bot.userId));

export function isBotUserId(id: string | null | undefined): boolean {
  return !!id && BOT_USER_IDS.has(id);
}

export function botByName(name: string): BotProfile | undefined {
  return BOT_ROSTER.find((bot) => bot.name === name);
}

// Create any missing bot accounts. The password hash is unparseable on
// purpose (verifyPassword requires a "pbkdf2:" prefix), so nobody can ever
// sign in as one. If a human already registered one of these usernames the
// insert is skipped and loadBotSeats drops that bot from the active roster.
export async function ensureBotUsers(db: D1Database): Promise<void> {
  const now = Date.now();
  const statements = BOT_ROSTER.map((bot) =>
    db
      .prepare(
        `INSERT OR IGNORE INTO users (id, username, username_lower, password_hash, created_at, rating, rd, vol, avatar)
         VALUES (?, ?, ?, ?, ?, ?, 300, 0.06, ?)`,
      )
      .bind(bot.userId, bot.name, bot.name.toLowerCase(), "unusable", now, bot.initialRating, bot.avatar),
  );
  await db.batch(statements);
}

export type BotSeat = {
  id: string;
  name: string;
  rating: number;
  rd: number;
  vol: number;
  avatar: string | null;
};

// Current ratings for every bot that actually owns its user row.
export async function loadBotSeats(db: D1Database): Promise<Map<string, BotSeat>> {
  const ids = BOT_ROSTER.map((bot) => bot.userId);
  const placeholders = ids.map(() => "?").join(",");
  const rows = await db
    .prepare(`SELECT id, username, rating, rd, vol, avatar FROM users WHERE id IN (${placeholders})`)
    .bind(...ids)
    .all<{ id: string; username: string; rating: number; rd: number; vol: number; avatar: string | null }>();
  const seats = new Map<string, BotSeat>();
  for (const row of rows.results) {
    seats.set(row.id, {
      id: row.id,
      name: row.username,
      rating: row.rating,
      rd: row.rd,
      vol: row.vol,
      avatar: row.avatar,
    });
  }
  return seats;
}

// Pools bots seek and play in — blitz-heavy, like real traffic.
const BOT_POOL_WEIGHTS: Array<[pool: string, weight: number]> = [
  ["1+0", 2],
  ["2+1", 1],
  ["3+0", 4],
  ["3+2", 4],
  ["5+0", 3],
  ["5+3", 2],
  ["10+0", 1],
];

export function pickBotPool(random: (max: number) => number): string {
  const total = BOT_POOL_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random(total);
  for (const [pool, weight] of BOT_POOL_WEIGHTS) {
    roll -= weight;
    if (roll < 0) return pool;
  }
  return "3+2";
}

// How long a bot "thinks" before its move lands. Mostly 1-4 seconds, with the
// occasional long tank up to 15s — but never enough to flag: the delay is
// clamped hard once the bot's own clock runs low.
export function botThinkMs(random: (max: number) => number, myClockMs: number, hasClock: boolean): number {
  let delay: number;
  const roll = random(100);
  if (roll < 78) delay = 1000 + random(3000);
  else if (roll < 94) delay = 4000 + random(5000);
  else delay = 10_000 + random(5000);

  if (hasClock) {
    if (myClockMs < 8_000) delay = Math.min(delay, 400 + random(500));
    else if (myClockMs < 20_000) delay = Math.min(delay, 800 + random(1000));
    else if (delay > myClockMs / 4) delay = Math.max(600, Math.floor(myClockMs / 4));
  }
  return delay;
}
