/// <reference types="@cloudflare/workers-types" />

// House players: a fixed roster of engine-driven accounts that keep the queue
// warm so a new player always finds a game. They hold real user rows (rated
// games, profiles, and the leaderboard work unchanged), sit in the two queue
// pools as seeks, pick up humans who queue, and occasionally play each other
// so the lobby and TV never look dead. They present as regular players except
// for a small flower in the bottom-left corner of their avatar.
//
// Everything here is deliberately tiny and pure (no Durable Object state, no
// timers): the game server drives the roster from its alarm and this module
// only answers questions like "which move", "how long to think", "which pool".
//
// Crash history (the reason for every cap in this file): the first version of
// this system ran unbounded engine searches and per-tick D1 queries inside the
// single-threaded game-server Durable Object and starved socket upgrades and
// lobby polls until it was removed (commit 7331763). The rebuilt system caps
// every search at HOUSE_SEARCH_CEILING_MS, runs at most one bot-vs-bot action
// per alarm tick, touches D1 only where human games already do, and guards
// every bot code path so a bot failure degrades to "bots absent".

import { pickAIMove, type AILevel } from "../../engine/ai";
import { legalMoves, type NerfGame } from "../../engine/game";
import { triggersOwnNerfLoss } from "../../engine/moveSafety";
import type { DraftMode } from "../../engine/buff";
import type { Move } from "../../engine/types";

// Absolute ceiling for any house-player engine search, server-side. The
// Durable Object is single-threaded: while a search runs, no socket upgrade,
// move, or lobby poll is answered. 80ms per action, paced 1-4s apart and
// serialized (never two searches in one tick), keeps the thread effectively
// free. Never raise this without load-testing the DO.
export const HOUSE_SEARCH_CEILING_MS = 80;

// Skill tiers. Strength comes from search budget and blunder probability, not
// deep search: the budgets are far below the client bot's (700-2000ms), which
// is exactly the point.
//
// The advertised RATINGS were lifted by ~150 across the roster (1200->1350,
// 1400->1550, 1600->1750, 1750->1900) with a handful of personas spread up
// into the 1900-2100 band. The DO's 80ms search ceiling caps real strength, so
// every high tier (1750 and up) maps to the SAME strongest sensible profile:
// the extra rating is presentation, not stronger search. Never let a profile's
// budgetMs exceed HOUSE_SEARCH_CEILING_MS.
export type HouseSkill = 1350 | 1550 | 1750 | 1900 | 1950 | 2000 | 2050 | 2100;

type SkillProfile = {
  level: AILevel;
  budgetMs: number;
  // Chance to ignore the search and play a random non-self-losing legal move.
  blunderChance: number;
};

// The strongest profile the 80ms ceiling allows: full-depth-for-the-budget
// hard search, minimal blundering. Every 1750+ tier shares it (higher rating,
// same capped strength, as intended).
const TOP_PROFILE: SkillProfile = { level: "hard", budgetMs: HOUSE_SEARCH_CEILING_MS, blunderChance: 0.005 };

export const HOUSE_SKILL_PROFILES: Record<HouseSkill, SkillProfile> = {
  1350: { level: "medium", budgetMs: 25, blunderChance: 0.1 },
  1550: { level: "medium", budgetMs: 40, blunderChance: 0.05 },
  1750: TOP_PROFILE,
  1900: TOP_PROFILE,
  1950: TOP_PROFILE,
  2000: TOP_PROFILE,
  2050: TOP_PROFILE,
  2100: TOP_PROFILE,
};

export type HousePersona = {
  name: string;
  userId: string;
  skill: HouseSkill;
  avatar: string;
};

// Lichess-style usernames: lowercase/CamelCase mixes, chess words, meme and
// teen-culture handles, a few numbers, nothing that says "bot". Roster of 50
// for a busy lobby and a load test. Skill mix stays roughly 40/30/20/10:
// 20 near 1350, 15 near 1550, 10 near 1750, and 5 spread across the 1900-2100
// band. (Ratings were lifted ~150 across the board; the 80ms search ceiling
// still caps real strength, so the top band is presentation.)
const PERSONA_DEFS: Array<[name: string, skill: HouseSkill]> = [
  // ~1350
  ["pawnstorm77", 1350],
  ["f6isfine", 1350],
  ["tempoLoss", 1350],
  ["premoveKing", 1350],
  ["eloFarmer2", 1350],
  ["backRankBlues", 1350],
  ["waterbottle", 1350],
  ["iloveproteinbars", 1350],
  ["flower", 1350],
  ["grade11isscary", 1350],
  ["SIXSEVENHAHAHAH", 1350],
  ["bongcloudbeliever", 1350],
  ["enpassantforced", 1350],
  ["hangingpawnhabit", 1350],
  ["touchmovetim", 1350],
  ["scholarsmate_l", 1350],
  ["coffeehousechess", 1350],
  ["blunderbuss77", 1350],
  ["rookieroulette", 1350],
  ["h4nginqueen", 1350],
  // ~1550
  ["QuietMoveGuy", 1550],
  ["caroCannon", 1550],
  ["rookliftt", 1550],
  ["zugzwangg", 1550],
  ["LondonSystemFan", 1550],
  ["bssfan", 1550],
  ["timmychenbiggestfan", 1550],
  ["fianchettofan", 1550],
  ["prophylaxised", 1550],
  ["timescramble", 1550],
  ["isolanihater", 1550],
  ["openingdeviation", 1550],
  ["middlegamemaze", 1550],
  ["knightoutpost", 1550],
  ["positionalpush", 1550],
  // ~1750
  ["kniveskniqht", 1750],
  ["endgameEnjoyer", 1750],
  ["berserkedd", 1750],
  ["josephleungadmirer", 1750],
  ["anarchychess", 1750],
  ["zwischenzugzz", 1750],
  ["calculationstn", 1750],
  ["tacticstornado", 1750],
  ["initiativegrab", 1750],
  ["exchangesac", 1750],
  // 1900-2100 band, spread so the top of the leaderboard is not a block of
  // identical numbers (the jitter in houseSeedRating still applies on top).
  ["smotheredM8", 1900],
  ["outpostcrab", 1950],
  ["kingcongo", 2000],
  ["prophylaxispro", 2050],
  ["conversionmachine", 2100],
];

// Flowered avatar presets (see lib/avatars.ts): the ordinary piece-on-plate
// look plus a small flower in the bottom-left corner. Never offered to real
// accounts (isAvatarId rejects them), so the flower is a reliable house mark
// everywhere an avatar renders from server data.
const FLOWER_AVATARS = [
  "gold_n_flower",
  "verdigris_b_flower",
  "bruise_r_flower",
  "oxblood_q_flower",
  "slate_n_flower",
  "copper_b_flower",
  "moss_r_flower",
  "plum_q_flower",
  "gold_q_flower",
  "verdigris_r_flower",
  "bruise_n_flower",
  "oxblood_b_flower",
  "slate_q_flower",
  "copper_r_flower",
  "moss_n_flower",
  "plum_b_flower",
];

function nameHash(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return hash;
}

export const HOUSE_ROSTER: HousePersona[] = PERSONA_DEFS.map(([name, skill], i) => ({
  name,
  // 'hp_' prefix: distinct from real accounts (random hex ids) and from the
  // retired roster's 'bot_' ids, which migration 0008 deletes by prefix.
  userId: `hp_${name.toLowerCase()}`,
  skill,
  avatar: FLOWER_AVATARS[i % FLOWER_AVATARS.length],
}));

const HOUSE_USER_IDS = new Set(HOUSE_ROSTER.map((p) => p.userId));
const HOUSE_BY_ID = new Map(HOUSE_ROSTER.map((p) => [p.userId, p]));

export function isHouseUserId(id: string | null | undefined): boolean {
  return !!id && HOUSE_USER_IDS.has(id);
}

export function housePersona(userId: string): HousePersona | undefined {
  return HOUSE_BY_ID.get(userId);
}

/** Seeded rating: the skill tier plus a stable +-40 jitter from the name so
 * the roster doesn't debut as blocks of identical numbers. */
export function houseSeedRating(persona: HousePersona): number {
  return persona.skill - 40 + (nameHash(persona.name) % 81);
}

// Create any missing house accounts, with both per-mode rating buckets seeded
// at the persona's skill. The password hash is unparseable on purpose
// (verifyPassword requires a "pbkdf2:" prefix), so nobody can sign in as one.
// Idempotent (INSERT OR IGNORE): safe to run on every cold start.
export async function ensureHouseUsers(db: D1Database): Promise<void> {
  const now = Date.now();
  const statements = HOUSE_ROSTER.flatMap((persona) => {
    const rating = houseSeedRating(persona);
    return [
      db
        .prepare(
          `INSERT OR IGNORE INTO users (id, username, username_lower, password_hash, created_at, rating, rd, vol, avatar)
           VALUES (?, ?, ?, ?, ?, ?, 150, 0.06, ?)`,
        )
        .bind(persona.userId, persona.name, persona.name.toLowerCase(), "unusable", now, rating, persona.avatar),
      ...(["nerf", "buff"] as const).map((mode) =>
        db
          .prepare(
            `INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
             VALUES (?, ?, ?, 150, 0.06, ?)`,
          )
          .bind(persona.userId, mode, rating, rating),
      ),
    ];
  });
  await db.batch(statements);
}

// Re-point every EXISTING house account's rating (and its per-mode buckets) at
// the current houseSeedRating. ensureHouseUsers only ever INSERTs (OR IGNORE),
// so once an account exists a skill/rating revision never reaches it; this
// bounded UPDATE is what actually circulates a new rating. House users only
// (every id comes from HOUSE_ROSTER), and idempotent: it writes the same
// deterministic value every time, and peak only ever ratchets up (MAX), never
// down. The caller gates it behind a versioned cold-start key so it runs once
// per revision rather than every tick.
export async function syncHouseRatings(db: D1Database): Promise<void> {
  const statements = HOUSE_ROSTER.flatMap((persona) => {
    const rating = houseSeedRating(persona);
    return [
      db.prepare(`UPDATE users SET rating = ? WHERE id = ?`).bind(rating, persona.userId),
      ...(["nerf", "buff"] as const).map((mode) =>
        db
          .prepare(
            `UPDATE user_ratings SET rating = ?, peak = MAX(peak, ?) WHERE user_id = ? AND category = ?`,
          )
          .bind(rating, rating, persona.userId, mode),
      ),
    ];
  });
  await db.batch(statements);
}

// ---------------------------------------------------------------------------
// Seek selection: which pool and mode a house player advertises.
// ---------------------------------------------------------------------------

// Blitz-heavy, like real traffic, and short enough that a bot-vs-bot game
// never ties up a roster seat (or its move alarms) for long.
const HOUSE_POOL_WEIGHTS: Array<[pool: string, weight: number]> = [
  ["1+0", 1],
  ["2+1", 1],
  ["3+0", 3],
  ["3+2", 3],
  ["5+0", 2],
  ["5+3", 2],
];

/** Pool + mode for a new house seek: weighted blitz pools, an even 50/50
 * split of Buff and Nerf so neither queue is starved. */
export function pickHouseSeek(random: (max: number) => number): { pool: string; mode: DraftMode } {
  const total = HOUSE_POOL_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random(total);
  let pool = "3+2";
  for (const [name, weight] of HOUSE_POOL_WEIGHTS) {
    roll -= weight;
    if (roll < 0) {
      pool = name;
      break;
    }
  }
  return { pool, mode: random(2) === 0 ? "buff" : "nerf" };
}

// ---------------------------------------------------------------------------
// Pacing: how long a house player "thinks" before an action lands.
// ---------------------------------------------------------------------------

/** Move pacing: uniform 1-4s, with roughly 1 move in 10 tanking 6-10s. The
 * delay is clamped hard once the bot's own clock runs low so pacing can never
 * flag a bot that still has bank left. */
export function houseThinkMs(random: (max: number) => number, myClockMs: number, hasClock: boolean): number {
  let delay: number;
  if (random(10) < 9) delay = 1000 + random(3001); // 1-4s
  else delay = 6000 + random(4001); // 6-10s

  if (hasClock) {
    if (myClockMs < 10_000) delay = Math.min(delay, 300 + random(501));
    else if (myClockMs < 25_000) delay = Math.min(delay, 700 + random(801));
    else if (delay > myClockMs / 5) delay = Math.max(500, Math.floor(myClockMs / 5));
  }
  return delay;
}

/** Draft pacing: 2-8s before a pick lands, comfortably inside the 15s
 * lock-in window (the server's deadline auto-resolve is the backstop). */
export function houseDraftThinkMs(random: (max: number) => number): number {
  return 2000 + random(6001);
}

// ---------------------------------------------------------------------------
// Move selection.
// ---------------------------------------------------------------------------

/** Search budget for one house move: the skill profile's budget, shrunk when
 * the clock runs low, and never above the hard ceiling. */
export function houseMoveBudgetMs(skill: HouseSkill, remainingClockMs?: number): number {
  let budget = Math.min(HOUSE_SKILL_PROFILES[skill].budgetMs, HOUSE_SEARCH_CEILING_MS);
  if (remainingClockMs != null && remainingClockMs < 30_000) budget = Math.min(budget, 25);
  return Math.max(10, budget);
}

/** Pick the house player's move. Strength differences come from the skill
 * profile's budget and blunder probability, never from deep search: the
 * budget is hard-capped so a single move can never stall the game server.
 * Returns null only when the position has no legal move at all. */
export function pickHouseMove(
  game: NerfGame,
  skill: HouseSkill,
  random: (max: number) => number,
  remainingClockMs?: number,
): Move | null {
  const profile = HOUSE_SKILL_PROFILES[skill];
  const all = legalMoves(game);
  if (!all.length) return null;
  if (random(10_000) < Math.round(profile.blunderChance * 10_000)) {
    const safe = all.filter((m) => !triggersOwnNerfLoss(game, m));
    const moves = safe.length ? safe : all;
    return moves[random(moves.length)];
  }
  return pickAIMove(game, profile.level, houseMoveBudgetMs(skill, remainingClockMs));
}

/** Opening nerf pick: between the two dealt options, prefer the lower tier
 * (the milder handicap); random on a tie. Pure so a deadline re-roll lands
 * the same way. `tiers` are looked up by the caller (worker has the library). */
export function houseNerfPickIndex(tiers: [number, number], random: (max: number) => number): 0 | 1 {
  if (tiers[0] < tiers[1]) return 0;
  if (tiers[1] < tiers[0]) return 1;
  return random(2) as 0 | 1;
}
