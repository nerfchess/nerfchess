/// <reference types="@cloudflare/workers-types" />

// House players: a fixed roster of engine-driven accounts that keep the queue
// warm so a new player always finds a game. They hold real user rows (rated
// games, profiles, and the leaderboard work unchanged), sit in the two queue
// pools as seeks, pick up humans who queue, and occasionally play each other
// so the lobby and TV never look dead. They present exactly like regular
// players (their accounts still hold "_flower" avatar preset ids as an
// internal marker, but no visible mark is drawn from them anymore).

import { pickAIMove, defaultSearchShape, type AILevel, type WeakenParams } from "../../engine/ai";
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

// Baked per-tier profile. The weakening fields are OPTIONAL and every baked
// tier below leaves them unset, so a fresh install resolves to topK:1 / no
// noise — i.e. the exact pre-weakening search. Weakening is applied at runtime
// as a moderator override (app_settings.house_skill_overrides), never baked, so
// it reverts from the /mod dashboard in one click. See docs/bot-weakening-spec.md.
type SkillProfile = {
  level: AILevel;
  budgetMs: number;
  blunderChance: number;
  // --- Optional weakening knobs (see WeakenParams in ai.ts). Unset = default. ---
  maxDepth?: number;
  extendedEval?: boolean;
  topK?: number;
  temperatureCp?: number;
  sampleWindowCp?: number;
  evalNoiseCp?: number;
};

// A profile with every field resolved (no optionals): the shape the engine and
// the moderator dashboard both work in.
export type ResolvedSkillProfile = {
  level: AILevel;
  budgetMs: number;
  blunderChance: number;
  maxDepth: number;
  extendedEval: boolean;
  topK: number;
  temperatureCp: number;
  sampleWindowCp: number;
  evalNoiseCp: number;
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

// ---------------------------------------------------------------------------
// Skill resolution & runtime overrides.
//
// A moderator tunes strength live by storing a JSON override map in
// app_settings (house_skill_overrides): a partial patch per tier. The DO reads
// it (cached ~15s) and resolves each persona's profile fresh per move, so a
// change reaches live games within a tick without a redeploy. Every numeric
// field is clamped on the way in, and a missing/garbage field falls back to the
// baked value field-by-field, so no stored value can drive the bots into a
// broken (or thread-stalling) search — the worst a bad save does is default
// strength. See docs/bot-weakening-spec.md §4-5.
// ---------------------------------------------------------------------------

// Inclusive clamp ranges for every tunable field. Exported so the engine
// service (which independently re-clamps whatever the DO sends) stays in lockstep
// with these bounds from the shared module rather than a hand-copied constant.
export const WEAKEN_CLAMP = {
  budgetMs: [10, 900],
  blunderChance: [0, 0.25],
  maxDepth: [1, 12],
  topK: [1, 8],
  temperatureCp: [0, 400],
  sampleWindowCp: [0, 1000],
  evalNoiseCp: [0, 200],
} as const satisfies Record<string, readonly [number, number]>;

function clampField(key: keyof typeof WEAKEN_CLAMP, v: unknown, fallback: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  const [lo, hi] = WEAKEN_CLAMP[key];
  // maxDepth/topK are integer knobs; the rest are fine as-is.
  const n = key === "maxDepth" || key === "topK" ? Math.round(v) : v;
  return Math.max(lo, Math.min(hi, n));
}

/** The baked profile for a tier, fully resolved (optionals filled from the
 * level's default search shape). This is the "no overrides" strength. */
export function bakedResolvedProfile(skill: HouseSkill): ResolvedSkillProfile {
  const base = HOUSE_SKILL_PROFILES[skill];
  const shape = defaultSearchShape(base.level);
  return {
    level: base.level,
    budgetMs: base.budgetMs,
    blunderChance: base.blunderChance,
    maxDepth: base.maxDepth ?? shape.maxDepth,
    extendedEval: base.extendedEval ?? shape.extendedEval,
    topK: base.topK ?? 1,
    temperatureCp: base.temperatureCp ?? 0,
    sampleWindowCp: base.sampleWindowCp ?? 150,
    evalNoiseCp: base.evalNoiseCp ?? 0,
  };
}

// Apply a single untrusted patch object onto a resolved base, clamping every
// numeric field and ignoring anything unrecognized. Shared by resolveSkillProfile
// (moderator overrides, keyed by tier) and the engine service (a flat profile
// the DO already resolved and sent). `level` is never overridable — it selects
// eval terms/heuristics and is an engine concern, not a strength dial.
function applyProfilePatch(base: ResolvedSkillProfile, patch: unknown): ResolvedSkillProfile {
  if (!patch || typeof patch !== "object") return base;
  const p = patch as Record<string, unknown>;
  return {
    level: base.level,
    budgetMs: clampField("budgetMs", p.budgetMs, base.budgetMs),
    blunderChance: clampField("blunderChance", p.blunderChance, base.blunderChance),
    maxDepth: clampField("maxDepth", p.maxDepth, base.maxDepth),
    extendedEval: typeof p.extendedEval === "boolean" ? p.extendedEval : base.extendedEval,
    topK: clampField("topK", p.topK, base.topK),
    temperatureCp: clampField("temperatureCp", p.temperatureCp, base.temperatureCp),
    sampleWindowCp: clampField("sampleWindowCp", p.sampleWindowCp, base.sampleWindowCp),
    evalNoiseCp: clampField("evalNoiseCp", p.evalNoiseCp, base.evalNoiseCp),
  };
}

/** Parse the raw app_settings JSON string into an override map, or null. Never
 * throws: an unparseable value reads as "no overrides". */
export function parseSkillOverrides(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Resolve a tier's effective profile: baked default merged with the (clamped)
 * moderator override for that tier, if any. `overrides` is the parsed map (or
 * null); accepts either the parsed object or the raw JSON string. */
export function resolveSkillProfile(
  skill: HouseSkill,
  overrides: Record<string, unknown> | string | null | undefined,
): ResolvedSkillProfile {
  const map = typeof overrides === "string" ? parseSkillOverrides(overrides) : overrides ?? null;
  const base = bakedResolvedProfile(skill);
  return map ? applyProfilePatch(base, map[String(skill)]) : base;
}

/** Re-clamp a resolved profile the DO sent to the engine service. Any missing
 * or out-of-range field falls back to that tier's baked value, so a version-
 * skewed or malformed payload degrades to baked strength, never to a broken
 * search. */
export function sanitizeResolvedProfile(skill: HouseSkill, raw: unknown): ResolvedSkillProfile {
  return applyProfilePatch(bakedResolvedProfile(skill), raw);
}

/** The WeakenOptions params carried into pickAIMove for a resolved profile. */
function weakenParamsOf(p: ResolvedSkillProfile): WeakenParams {
  return {
    maxDepth: p.maxDepth,
    extendedEval: p.extendedEval,
    topK: p.topK,
    temperatureCp: p.temperatureCp,
    sampleWindowCp: p.sampleWindowCp,
    evalNoiseCp: p.evalNoiseCp,
  };
}

/** Every house skill tier, ascending — the unit the dashboard and overrides map
 * are keyed by. Derived from the profile map so it never drifts. */
export const HOUSE_SKILLS: HouseSkill[] = (Object.keys(HOUSE_SKILL_PROFILES) as unknown[])
  .map(Number)
  .sort((a, b) => a - b) as HouseSkill[];

// The tunable numeric fields (level is engine-only, extendedEval is boolean).
const WEAKEN_NUM_FIELDS = [
  "budgetMs",
  "blunderChance",
  "maxDepth",
  "topK",
  "temperatureCp",
  "sampleWindowCp",
  "evalNoiseCp",
] as const;

/** Sanitize an untrusted per-tier patch down to the recognized, clamped fields
 * actually present (sparse — the shape stored in the overrides map). Numeric
 * fields are clamped to WEAKEN_CLAMP; unknown keys and non-finite values are
 * dropped. Used by the /mod save path so stored overrides are always sane. */
export function cleanSkillPatch(raw: unknown): Partial<SkillProfile> {
  if (!raw || typeof raw !== "object") return {};
  const p = raw as Record<string, unknown>;
  const out: Record<string, number | boolean> = {};
  for (const k of WEAKEN_NUM_FIELDS) {
    const v = p[k];
    if (typeof v === "number" && Number.isFinite(v)) {
      const [lo, hi] = WEAKEN_CLAMP[k];
      const n = k === "maxDepth" || k === "topK" ? Math.round(v) : v;
      out[k] = Math.max(lo, Math.min(hi, n));
    }
  }
  if (typeof p.extendedEval === "boolean") out.extendedEval = p.extendedEval;
  return out as Partial<SkillProfile>;
}

// Named preset the /mod "Weakened (50/30/20)" button writes into the override
// map: ~50% of the roster (1350-1900) significantly weaker, ~30% (1950-2050)
// weaker, the 2100-2200 top band untouched (absent = baked).
//
// Calibration note (2026-07-12, scripts/sim-house-bots.ts --roundrobin + the
// control run): mirror self-play SATURATES — two unweakened engines draw every
// game, so any weakening flips draws into losses and even a mild topK:2/temp:60
// tier scored ~4% against an unweakened peer. That test confirms direction and
// monotonicity but cannot resolve the bands or predict strength vs HUMANS (who
// also err). These numbers are therefore a GRADED ramp (subtle at the top of
// the weakened range, clearly weak at the bottom), softened from the first cut,
// not tuned to a self-play win rate. Treat as a starting point: enable, watch
// real rating drift (spec §6), and hand-tune any field live from /mod.
export const WEAKENED_PRESET: Partial<Record<HouseSkill, Partial<SkillProfile>>> = {
  // "significantly worse": reliably beatable by a decent player.
  1350: { blunderChance: 0.08, maxDepth: 3, topK: 4, temperatureCp: 130, evalNoiseCp: 60, extendedEval: false },
  1550: { blunderChance: 0.05, maxDepth: 3, topK: 4, temperatureCp: 110, evalNoiseCp: 50, extendedEval: false },
  1750: { blunderChance: 0.03, maxDepth: 4, topK: 3, temperatureCp: 90, evalNoiseCp: 40, extendedEval: false, budgetMs: 120 },
  1900: { blunderChance: 0.02, maxDepth: 5, topK: 3, temperatureCp: 70, evalNoiseCp: 30, extendedEval: false, budgetMs: 150 },
  // "worse": subtle — the odd inaccuracy, not a handicap match.
  1950: { blunderChance: 0.005, maxDepth: 6, topK: 2, temperatureCp: 45, evalNoiseCp: 18 },
  2000: { blunderChance: 0.005, maxDepth: 7, topK: 2, temperatureCp: 35, evalNoiseCp: 14 },
  2050: { blunderChance: 0.005, maxDepth: 8, topK: 2, temperatureCp: 25, evalNoiseCp: 10 },
};

// A harder preset the /mod "Very weak" button writes: weakens the whole roster
// (including the top band), for testing or a deliberately beginner-friendly
// lobby. Also starting numbers, tunable live.
export const VERY_WEAK_PRESET: Partial<Record<HouseSkill, Partial<SkillProfile>>> = {
  1350: { blunderChance: 0.16, maxDepth: 2, topK: 6, temperatureCp: 260, evalNoiseCp: 120, extendedEval: false },
  1550: { blunderChance: 0.12, maxDepth: 2, topK: 6, temperatureCp: 230, evalNoiseCp: 110, extendedEval: false },
  1750: { blunderChance: 0.1, maxDepth: 3, topK: 5, temperatureCp: 200, evalNoiseCp: 100, extendedEval: false, budgetMs: 80 },
  1900: { blunderChance: 0.08, maxDepth: 3, topK: 5, temperatureCp: 180, evalNoiseCp: 90, extendedEval: false, budgetMs: 90 },
  1950: { blunderChance: 0.06, maxDepth: 3, topK: 4, temperatureCp: 150, evalNoiseCp: 70, extendedEval: false },
  2000: { blunderChance: 0.05, maxDepth: 4, topK: 4, temperatureCp: 130, evalNoiseCp: 60, extendedEval: false },
  2050: { blunderChance: 0.04, maxDepth: 4, topK: 3, temperatureCp: 110, evalNoiseCp: 50 },
  2100: { blunderChance: 0.03, maxDepth: 5, topK: 3, temperatureCp: 90, evalNoiseCp: 40 },
  2150: { blunderChance: 0.02, maxDepth: 5, topK: 3, temperatureCp: 80, evalNoiseCp: 35 },
  2200: { blunderChance: 0.02, maxDepth: 6, topK: 2, temperatureCp: 70, evalNoiseCp: 30 },
};

export type HousePersona = {
  name: string;
  userId: string;
  skill: HouseSkill;
  avatar: string;
  location: string;
};

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
  // 2100-2200 
  ["passed_pawn", 2100],
  ["Stickygamer123", 2100],
  ["mellowmove", 2150],
  ["ilovewhitestickystuff", 2150],
  ["cobrakai", 2200],
  ["ilovemysister", 2200],

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

/** Search budget for one house move: the resolved profile's budget, shrunk
 * when the clock runs low, and never above `ceilingMs` (default: the DO-safe
 * ceiling — pass a higher one only where the search can't stall a shared
 * thread, i.e. the OCI engine service). */
export function houseMoveBudgetMs(
  budgetMs: number,
  remainingClockMs?: number,
  ceilingMs: number = HOUSE_SEARCH_CEILING_MS,
): number {
  let budget = Math.min(budgetMs, ceilingMs);
  if (remainingClockMs != null && remainingClockMs < 30_000) budget = Math.min(budget, 25);
  return Math.max(10, budget);
}

/** Pick the house player's move. Strength comes from the resolved profile's
 * budget, blunder probability, and move-quality weakening (topK/temperature/
 * noise). Pass `profile` to use a moderator-resolved strength (the DO does, per
 * move); omit it and the baked profile for the tier is used, so every existing
 * caller (DO local fallback, arena service, sim script) is unchanged.
 * `ceilingMs` defaults to the DO-safe cap; only the OCI engine service passes a
 * higher one, since search there costs the DO nothing.
 * Returns null only when the position has no legal move at all. */
export function pickHouseMove(
  game: NerfGame,
  skill: HouseSkill,
  random: (max: number) => number,
  remainingClockMs?: number,
  ceilingMs?: number,
  profile?: ResolvedSkillProfile,
): Move | null {
  const p = profile ?? bakedResolvedProfile(skill);
  const all = legalMoves(game);
  if (!all.length) return null;
  if (random(10_000) < Math.round(p.blunderChance * 10_000)) {
    const safe = all.filter((m) => !triggersOwnNerfLoss(game, m));
    const moves = safe.length ? safe : all;
    return moves[random(moves.length)];
  }
  const budget = houseMoveBudgetMs(p.budgetMs, remainingClockMs, ceilingMs);
  return pickAIMove(game, p.level, budget, { params: weakenParamsOf(p), random });
}

/** Opening nerf pick: between the two dealt options, prefer the lower tier
 * (the milder handicap); random on a tie. Pure so a deadline re-roll lands
 * the same way. `tiers` are looked up by the caller (worker has the library). */
export function houseNerfPickIndex(tiers: [number, number], random: (max: number) => number): 0 | 1 {
  if (tiers[0] < tiers[1]) return 0;
  if (tiers[1] < tiers[0]) return 1;
  return random(2) as 0 | 1;
}
