/// <reference types="@cloudflare/workers-types" />

// House players: a fixed roster of engine-driven accounts that keep the queue
// warm so a new player always finds a game. They hold real user rows (rated
// games, profiles, and the leaderboard work unchanged), sit in the two queue
// pools as seeks, pick up humans who queue, and occasionally play each other
// so the lobby and TV never look dead. They present exactly like regular
// players (their accounts still hold "_flower" avatar preset ids as an
// internal marker, but no visible mark is drawn from them anymore).
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

// Absolute ceiling for a house-player search running ON THE DO ITSELF (local
// fallback, when the OCI engine is off/unreachable/version-mismatched). The
// Durable Object is single-threaded: while a search runs, no socket upgrade,
// move, or lobby poll is answered. 80ms per action, paced 1-4s apart and
// serialized (never two searches in one tick), keeps the thread effectively
// free. Never raise this without load-testing the DO — it's the default
// ceiling every caller gets unless it explicitly passes a higher one (only
// the OCI engine service does, since search there costs the DO nothing).
export const HOUSE_SEARCH_CEILING_MS = 80;

// Skill tiers. Below 1750, strength comes from search budget and blunder
// probability, not deep search. At 1750+ the budgets below are what the OCI
// engine service actually searches with (idle box CPU, no DO thread at
// stake); a local DO fallback still clamps every one of them down to
// HOUSE_SEARCH_CEILING_MS via houseMoveBudgetMs's default ceiling, so a
// remote outage degrades to the old capped strength rather than stalling the
// DO. Roughly geometric growth: each rating step needs increasingly more
// search time for the same strength gain (diminishing Elo per ply).
//
// IMPORTANT: negamax's own timeout check only fires once elapsed time exceeds
// `budget * 2` (see ai.ts's TIMEOUT_SENTINEL check) -- it's a per-node safety
// net, not a tight deadline. Measured against engine.nerfchess.com/move (the
// real public path -- localhost-on-the-box measurements alone understated
// this by ~600ms of tunnel/network overhead), actual wall time runs
// 1.5-2.5x the nominal budgetMs. These numbers are sized so the slowest tier
// (2200) lands around ~2.2-2.4s over the public path, leaving real margin
// below the Worker's 3000ms HOUSE_ENGINE_TIMEOUT_MS. Re-measure against the
// public URL (not just localhost:8787 on the box) before raising any of
// these -- don't trust the nominal number, and don't trust a localhost-only
// measurement either.
export type HouseSkill = 1350 | 1550 | 1750 | 1900 | 1950 | 2000 | 2050 | 2100 | 2150 | 2200;

type SkillProfile = {
  level: AILevel;
  budgetMs: number;
  // Chance to ignore the search and play a random non-self-losing legal move.
  blunderChance: number;
};

export const HOUSE_SKILL_PROFILES: Record<HouseSkill, SkillProfile> = {
  1350: { level: "medium", budgetMs: 25, blunderChance: 0.1 },
  1550: { level: "medium", budgetMs: 60, blunderChance: 0.05 },
  1750: { level: "hard", budgetMs: 150, blunderChance: 0.005 },
  1900: { level: "hard", budgetMs: 180, blunderChance: 0.005 },
  1950: { level: "hard", budgetMs: 250, blunderChance: 0.005 },
  2000: { level: "hard", budgetMs: 350, blunderChance: 0.005 },
  2050: { level: "hard", budgetMs: 450, blunderChance: 0.005 },
  2100: { level: "hard", budgetMs: 550, blunderChance: 0.005 },
  2150: { level: "hard", budgetMs: 650, blunderChance: 0.005 },
  2200: { level: "hard", budgetMs: 800, blunderChance: 0.005 },
};

export type HousePersona = {
  name: string;
  userId: string;
  skill: HouseSkill;
  avatar: string;
  // Plausible home base ("🇵🇹 Braga, Portugal"), distinct per persona, shown
  // as the account's profile bio line.
  location: string;
};

// Natural, realistic chess-site handles: a believable mix of casual gamertags,
// chess-themed handles, first-name-plus-number styles, lowercase handles, and a
// few ALLCAPS, nothing that says "bot". The cutesy alliteration handles
// (sicilian_sam, backrankbetty, zugzwangzoe...) were swapped for plainer
// Lichess-style ones (name+year, engine/player fandom, opening-line handles) so
// the roster reads like a random slice of a real player base. A handful of
// owner-chosen meme names are kept verbatim in the roster.
// Ratings: the floor is 1550 and a top band reaches 2200, with several personas
// seated in the 2100-2200 range so the top of the leaderboard is a spread of
// numbers, not a single tier. The 80ms search ceiling still caps real strength,
// so every tier from 1750 up is presentation.
// Rough mix: 10 near 1550, 10 near 1750, 8 near 1900, 6 near 1950, 5 near 2000,
// 4 near 2050, and 7 spread across the 2100-2200 top band. (The +-40 jitter in
// houseSeedRating still applies on top of each tier.)
const PERSONA_DEFS: Array<[name: string, skill: HouseSkill]> = [
  // ~1550
  ["pawnstorm77", 1550],
  ["coffeeknight", 1550],
  ["blitzbrain", 1550],
  ["night0wl", 1550],
  ["sarah92", 1550],
  // ~1750
  ["kev_in99", 1750],
  ["frostbyte", 1750],
  ["sleepyknight", 1750],
  ["omar_23", 1750],
  ["CHECKMATE99", 1750],
  ["discocheck", 1750],
  // ~1900
  ["alexk2004", 1900],
  ["natalie88", 1900],
  ["forkmaster", 1900],
  ["e4e5nf3", 1900],
  ["capitals", 1900],
  // ~1950
  ["matt_b44", 1950],
  ["veselin88", 1950],
  ["priya_r", 1950],
  // ~2000
  ["tom_lee23", 2000],
  ["endgamegrace", 2000],
  ["petrosianfan", 2000],
  // ~2050
  ["riptide", 2050],
  ["KINGSLAYER", 2050],
  // 2100-2200 top band, spread so the leaderboard head is not a block of
  // identical numbers (the jitter in houseSeedRating still applies on top).
  ["passed_pawn", 2100],
  ["Stickygamer123", 2100],
  ["mellowmove", 2150],
  ["ilovewhitestickystuff", 2150],
  ["cobrakai", 2200],
  ["ilovemysister", 2200],
  // --- Expansion personas (indices 30-59). The house-bot count is a moderator
  // slider (30-60): the FIRST N of this roster are the active bots that seek,
  // play, and get picked up, so the base 30 above are always on and raising the
  // slider switches these in. Same believable-handle style, same rating bands.
  // ~1550
  ["lukas_j", 1550],
  ["mira_k", 1550],
  ["casualcastle", 1550],
  ["h4habit", 1550],
  ["teatimechess", 1550],
  ["chessnoob2012", 1550],
  // ~1750
  ["dev_e4", 1750],
  ["rybkafan", 1750],
  ["quietqueen", 1750],
  ["sam_b12", 1750],
  ["boardsnack", 1750],
  ["midnightblitz", 1750],
  // ~1900
  ["tanya_v", 1900],
  ["forkfiend", 1900],
  ["karpov_enjoyer", 1900],
  ["elena_88", 1900],
  ["coffeehousepro", 1900],
  // ~1950
  ["yasser64", 1950],
  ["coldblood_c", 1950],
  ["maya_r2", 1950],
  ["jess2001", 1950],
  // ~2000
  ["marat90", 2000],
  ["sasha_p", 2000],
  ["thefianchetto", 2000],
  ["sacpawn", 2000],
  // ~2050
  ["nadia_x", 2050],
  ["crushingpawns", 2050],
  ["stefan_bg", 2050],
  // 2100-2200 top band
  ["quietstormq", 2150],
  ["apexpawn", 2200],
];

// Flowered avatar presets (see lib/avatars.ts): the ordinary piece-on-plate
// look plus a small flower mark. Never offered to real accounts (isAvatarId
// rejects them), so the flower stays a reliable internal house mark everywhere
// an avatar renders from server data. The FULL flowered catalog (8 palettes x
// 6 pieces = 48 looks) is used, assigned by name hash, so the roster reads as
// a varied crowd instead of the same few plates cycling in order. The mark
// itself is drawn small and muted by PlayerAvatar (owner: the old bloom was
// too loud).
const FLOWER_PALETTES = ["gold", "verdigris", "bruise", "oxblood", "slate", "copper", "moss", "plum"] as const;
const FLOWER_PIECES = ["p", "n", "b", "r", "q", "k"] as const;
const FLOWER_AVATARS: string[] = FLOWER_PALETTES.flatMap((palette) =>
  FLOWER_PIECES.map((piece) => `${palette}_${piece}_flower`),
);

// One plausible home base per persona (owner report: every bot showed the
// same location). Distinct for the whole roster (>= PERSONA_DEFS.length
// entries, assigned by roster index) and spread world-wide so the crowd reads
// like a real player base. Surfaced as the account's profile bio line; a
// moderator-edited bio is never overwritten (see ensureHouseUsers /
// syncHouseRatings).
const HOUSE_LOCATIONS: string[] = [
  "🇧🇷 Curitiba, Brazil",
  "🇩🇪 Leipzig, Germany",
  "🇵🇭 Cebu City, Philippines",
  "🇺🇸 Columbus, Ohio",
  "🇵🇱 Wrocław, Poland",
  "🇮🇳 Pune, India",
  "🇬🇧 Sheffield, England",
  "🇦🇷 Rosario, Argentina",
  "🇨🇦 Halifax, Canada",
  "🇫🇷 Nantes, France",
  "🇺🇦 Lviv, Ukraine",
  "🇯🇵 Sendai, Japan",
  "🇪🇸 Zaragoza, Spain",
  "🇳🇴 Trondheim, Norway",
  "🇲🇽 Guadalajara, Mexico",
  "🇮🇹 Bologna, Italy",
  "🇹🇷 Izmir, Türkiye",
  "🇦🇺 Adelaide, Australia",
  "🇷🇸 Novi Sad, Serbia",
  "🇺🇸 Tacoma, Washington",
  "🇳🇱 Utrecht, Netherlands",
  "🇮🇩 Bandung, Indonesia",
  "🇨🇱 Valparaíso, Chile",
  "🇨🇿 Brno, Czechia",
  "🇿🇦 Durban, South Africa",
  "🇰🇷 Daejeon, South Korea",
  "🇵🇹 Braga, Portugal",
  "🇷🇴 Cluj-Napoca, Romania",
  "🇺🇸 Madison, Wisconsin",
  "🇬🇷 Thessaloniki, Greece",
  "🇻🇳 Da Nang, Vietnam",
  "🇸🇪 Gothenburg, Sweden",
  "🇨🇴 Medellín, Colombia",
  "🇭🇺 Debrecen, Hungary",
  "🇬🇧 Dundee, Scotland",
  "🇺🇸 Boise, Idaho",
  "🇦🇹 Graz, Austria",
  "🇲🇾 Penang, Malaysia",
  "🇵🇪 Arequipa, Peru",
  "🇫🇮 Tampere, Finland",
  "🇮🇳 Kochi, India",
  "🇮🇪 Galway, Ireland",
  "🇧🇬 Plovdiv, Bulgaria",
  "🇺🇸 Tucson, Arizona",
  "🇩🇪 Bremen, Germany",
  "🇹🇭 Chiang Mai, Thailand",
  "🇨🇦 Winnipeg, Canada",
  "🇭🇷 Split, Croatia",
  "🇪🇬 Alexandria, Egypt",
  "🇱🇹 Kaunas, Lithuania",
  "🇺🇾 Montevideo, Uruguay",
  "🇸🇰 Košice, Slovakia",
  "🇳🇿 Christchurch, New Zealand",
  "🇯🇵 Fukuoka, Japan",
  "🇧🇪 Ghent, Belgium",
  "🇺🇸 Richmond, Virginia",
  "🇪🇪 Tartu, Estonia",
  "🇲🇦 Casablanca, Morocco",
  "🇨🇭 Basel, Switzerland",
  "🇱🇻 Riga, Latvia",
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
  // Name-hashed across the full flowered catalog: stable per persona, varied
  // across the roster (the old i % 16 cycled the same plates in order).
  avatar: FLOWER_AVATARS[nameHash(name) % FLOWER_AVATARS.length],
  // Roster-index assignment keeps every persona's location DISTINCT (the list
  // is at least as long as the roster) and stable across deploys.
  location: HOUSE_LOCATIONS[i % HOUSE_LOCATIONS.length],
}));

const HOUSE_USER_IDS = new Set(HOUSE_ROSTER.map((p) => p.userId));
const HOUSE_BY_ID = new Map(HOUSE_ROSTER.map((p) => [p.userId, p]));

// House-bot count is a moderator slider (30-60): the FIRST N of HOUSE_ROSTER are
// the ACTIVE bots that seek, get picked up, play filler, and appear online. The
// base 30 are always on; raising the slider switches in the expansion personas.
// Every persona still holds a seeded account, so an idle one's profile/rating
// stay intact if the count later drops back below it.
export const HOUSE_COUNT_MIN = 30;
export const HOUSE_COUNT_MAX = HOUSE_ROSTER.length;
export function clampHouseCount(n: number): number {
  return Number.isFinite(n)
    ? Math.max(HOUSE_COUNT_MIN, Math.min(HOUSE_COUNT_MAX, Math.floor(n)))
    : HOUSE_COUNT_MIN;
}
/** The active house personas: the first N of the roster (moderator-set count). */
export function activeHouseRoster(count: number): HousePersona[] {
  return HOUSE_ROSTER.slice(0, clampHouseCount(count));
}

export function isHouseUserId(id: string | null | undefined): boolean {
  return !!id && HOUSE_USER_IDS.has(id);
}

export function housePersona(userId: string): HousePersona | undefined {
  return HOUSE_BY_ID.get(userId);
}

export type BotDifficulty = "easy" | "medium" | "hard";

// The "Play vs bot" difficulty picker maps onto the house roster by advertised
// rating band, so a harder choice stakes more of your rating (the roster's real
// strength is capped by the DO search ceiling, but the rating on the line is
// what a rated game turns on). Easy takes the 1550 floor, hard the 1950+ top;
// medium the middle. Picks a persona NOT already seated in a live game (busy),
// falling back to any free persona when the band is fully committed, and null
// only when the entire roster is busy. Pure: the caller supplies both the busy
// set and the RNG so it stays deterministic and DO-state-free.
export function pickHouseBotByDifficulty(
  difficulty: BotDifficulty,
  busy: ReadonlySet<string>,
  rand: (n: number) => number,
  roster: readonly HousePersona[] = HOUSE_ROSTER,
): HousePersona | null {
  const inBand: Record<BotDifficulty, (skill: HouseSkill) => boolean> = {
    easy: (skill) => skill <= 1550,
    medium: (skill) => skill >= 1750 && skill <= 1900,
    hard: (skill) => skill >= 1950,
  };
  const free = roster.filter((persona) => !busy.has(persona.userId));
  if (!free.length) return null;
  const banded = free.filter((persona) => inBand[difficulty](persona.skill));
  const pool = banded.length ? banded : free;
  return pool[rand(pool.length)];
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
          `INSERT OR IGNORE INTO users (id, username, username_lower, password_hash, created_at, rating, rd, vol, avatar, bio)
           VALUES (?, ?, ?, ?, ?, ?, 150, 0.06, ?, ?)`,
        )
        .bind(persona.userId, persona.name, persona.name.toLowerCase(), "unusable", now, rating, persona.avatar, persona.location),
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
// the current houseSeedRating, and circulate identity revisions (avatar,
// location bio). ensureHouseUsers only ever INSERTs (OR IGNORE), so once an
// account exists a roster revision never reaches it; this bounded UPDATE is
// what actually circulates one. House users only (every id comes from
// HOUSE_ROSTER), and idempotent: it writes the same deterministic values every
// time, peak only ever ratchets up (MAX), and the location bio fills in only
// when the bio is empty so a moderator-written bio is never clobbered. The
// caller gates it behind a versioned cold-start key so it runs once per
// revision rather than every tick.
export async function syncHouseRatings(db: D1Database): Promise<void> {
  const statements = HOUSE_ROSTER.flatMap((persona) => {
    const rating = houseSeedRating(persona);
    return [
      db
        .prepare(
          `UPDATE users SET rating = ?, avatar = ?, bio = COALESCE(NULLIF(bio, ''), ?) WHERE id = ?`,
        )
        .bind(rating, persona.avatar, persona.location, persona.userId),
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
export function houseThinkMs(random: (max: number) => number, myClockMs: number, timeSec: number): number {
  const hasClock = timeSec > 0;
  // Fast time controls (1+0, 2+1, 3+0 and the like, base <= 3 min): the bot
  // answers snappily in 1-3s so a bullet/blitz game against a bot feels live and
  // never drags. Slower controls keep the more humanlike, occasionally-longer
  // think below.
  const fast = hasClock && timeSec <= 180;
  let delay: number;
  if (fast) delay = 1000 + random(2001); // 1-3s
  else if (random(10) < 9) delay = 1000 + random(3001); // 1-4s
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
 * the clock runs low, and never above `ceilingMs` (default: the DO-safe
 * ceiling — pass a higher one only where the search can't stall a shared
 * thread, i.e. the OCI engine service). */
export function houseMoveBudgetMs(
  skill: HouseSkill,
  remainingClockMs?: number,
  ceilingMs: number = HOUSE_SEARCH_CEILING_MS,
): number {
  let budget = Math.min(HOUSE_SKILL_PROFILES[skill].budgetMs, ceilingMs);
  if (remainingClockMs != null && remainingClockMs < 30_000) budget = Math.min(budget, 25);
  return Math.max(10, budget);
}

/** Pick the house player's move. Strength differences come from the skill
 * profile's budget and blunder probability. `ceilingMs` defaults to the
 * DO-safe cap so every existing caller (the DO's local fallback, the arena
 * service, the sim script) is unaffected; only the OCI engine service passes
 * a higher one, since search there costs the DO nothing.
 * Returns null only when the position has no legal move at all. */
export function pickHouseMove(
  game: NerfGame,
  skill: HouseSkill,
  random: (max: number) => number,
  remainingClockMs?: number,
  ceilingMs?: number,
): Move | null {
  const profile = HOUSE_SKILL_PROFILES[skill];
  const all = legalMoves(game);
  if (!all.length) return null;
  if (random(10_000) < Math.round(profile.blunderChance * 10_000)) {
    const safe = all.filter((m) => !triggersOwnNerfLoss(game, m));
    const moves = safe.length ? safe : all;
    return moves[random(moves.length)];
  }
  return pickAIMove(game, profile.level, houseMoveBudgetMs(skill, remainingClockMs, ceilingMs));
}

/** Opening nerf pick: between the two dealt options, prefer the lower tier
 * (the milder handicap); random on a tie. Pure so a deadline re-roll lands
 * the same way. `tiers` are looked up by the caller (worker has the library). */
export function houseNerfPickIndex(tiers: [number, number], random: (max: number) => number): 0 | 1 {
  if (tiers[0] < tiers[1]) return 0;
  if (tiers[1] < tiers[0]) return 1;
  return random(2) as 0 | 1;
}
