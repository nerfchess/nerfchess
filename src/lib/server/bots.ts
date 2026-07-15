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
import { HOUSE_PFP_IDS, HOUSE_PFP_NAMES, HOUSE_PFP_PREFIX } from "../avatars";

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
export type HouseSkill = 1350 | 1450 | 1550 | 1650 | 1750 | 1900 | 1950 | 2000 | 2050 | 2100 | 2150 | 2200;

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
  1450: { level: "medium", budgetMs: 40, blunderChance: 0.075 },
  1550: { level: "medium", budgetMs: 60, blunderChance: 0.05 },
  1650: { level: "hard", budgetMs: 100, blunderChance: 0.02 },
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
  // (Three of this band's original handles read as obvious joke names —
  // "Stickygamer123", "ilovewhitestickystuff", "ilovemysister" — and were
  // rewritten to realistic chess-site handles. New names mean new hp_ user
  // ids, so worker.ts's houseSeededKey was bumped to v4; the old accounts
  // stay orphaned in the DB, harmless, same as the v3 renames.)
  ["passed_pawn", 2100],
  ["e4enjoyer", 2100],
  ["mellowmove", 2150],
  ["viktor_m85", 2150],
  ["cobrakai", 2200],
  ["KnightSlayer99", 2200],

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

  // --- Expansion wave: 150 more personas so the roster is 210 deep, letting
  // the daily active window (60-90) cycle through a large, ever-changing
  // crowd instead of always showing the same faces. Skills span the full
  // 1350-2200 range; handles are in the same Lichess-style mix. New handles
  // mean new hp_ ids, so worker.ts's houseSeededKey is bumped to create them.
  ["kaij25", 1900],
  ["swiftblitz", 1950],
  ["chenj48", 1550],
  ["najdorfflag", 1350],
  ["grinddragon9", 1550],
  ["swiftlondon", 2000],
  ["clock90", 1950],
  ["crushh4ing", 1650],
  ["pressgambiting", 1750],
  ["slavpetroff", 2050],
  ["e4gambit", 1900],
  ["irina26", 1900],
  ["hannah35", 1650],
  ["crushskewer", 2200],
  ["chloe_sergei", 2100],
  ["flickd4", 2150],
  ["mike_mila", 1900],
  ["carlosc90", 1650],
  ["bjornm21", 2100],
  ["pedro_mateo", 1900],
  ["hans_pat", 1650],
  ["slav30", 1650],
  ["goran59", 2050],
  ["d427", 1750],
  ["tim_alex", 1650],
  ["olga_mila", 1750],
  ["c4castle", 1450],
  ["stalemateg6", 1450],
  ["boris_j37", 1450],
  ["raul19", 1450],
  ["sergei_luca", 1550],
  ["dodgecometz", 2000],
  ["javierj54", 1550],
  ["hangslavz", 2100],
  ["novaecho", 1900],
  ["dodgebullet14", 2000],
  ["adam_javier", 1750],
  ["blitz68", 2000],
  ["stackclocking", 1750],
  ["paolot44", 1650],
  ["dawn77", 1900],
  ["coldgrind", 1450],
  ["priya_kenji", 1350],
  ["silentbaitz", 1950],
  ["john_b2011", 1450],
  ["baitf6er", 1550],
  ["erik15", 1750],
  ["rajb31", 1550],
  ["priya13", 2100],
  ["rajc2007", 1750],
  ["finn_m64", 1900],
  ["boldblunder", 1650],
  ["teae4", 2100],
  ["luke37", 1350],
  ["presstempo", 1750],
  ["hannah55", 1650],
  ["kenji_sergei", 1750],
  ["grimstackz", 2150],
  ["humblefrost", 1950],
  ["bjorn79", 2000],
  ["lena_omar", 1450],
  ["luke95", 1650],
  ["boris87", 1550],
  ["slav85", 2050],
  ["dodgeskewerer", 1950],
  ["sleepycomet", 1650],
  ["catalan28", 1750],
  ["gambitopening", 1550],
  ["catalan2", 2000],
  ["coldendgame", 2100],
  ["leo38", 1350],
  ["shinyhunt", 2000],
  ["humbletrapz", 1900],
  ["echoknight", 1750],
  ["flagb6", 1750],
  ["petroffecho", 2150],
  ["tim_t6", 2100],
  ["grimhangz", 2150],
  ["chloe_b81", 1350],
  ["vikram_g23", 2100],
  ["crushlufter", 1950],
  ["arjun_alex", 1950],
  ["grimdragon", 1450],
  ["tariq_diego", 1750],
  ["sleepysniper", 1750],
  ["openingdraw", 2050],
  ["cozyoutpost", 1900],
  ["sleepyd4", 1650],
  ["dmitri55", 1750],
  ["trapdrawing", 1900],
  ["layla_w8", 1350],
  ["tempoecho", 1900],
  ["diego_j26", 2000],
  ["king4", 2150],
  ["bullet72", 2050],
  ["dan_k60", 1450],
  ["frost21", 1950],
  ["silverskewer", 1900],
  ["mattw34", 2050],
  ["g673", 1650],
  ["latte76", 1950],
  ["snipelufting", 1350],
  ["matt_v46", 1450],
  ["gambitd4", 2000],
  ["silverd4", 1450],
  ["caro56", 1750],
  ["sergei_mila", 1950],
  ["cozystorm", 1650],
  ["skewermate", 1900],
  ["sneakybaitr", 1450],
  ["chris77", 1750],
  ["sharpdrift", 1450],
  ["stormmate", 1650],
  ["layla_marco", 2050],
  ["humbleecho", 1350],
  ["trapmateer", 2000],
  ["slaylondon", 1650],
  ["blunderdrifter", 1900],
  ["olga_nina", 1450],
  ["stackzug", 1650],
  ["finn_marco", 2050],
  ["hassan_t64", 1950],
  ["embernova", 1950],
  ["wei_max", 1650],
  ["bishop95", 1950],
  ["coldpunishr", 2050],
  ["vera_raul", 1350],
  ["frostpetroff", 1550],
  ["blunderpining", 1350],
  ["sneakyhuntr", 2050],
  ["convertf6z", 1450],
  ["lazydodge", 1750],
  ["silverconvert", 1950],
  ["quietsnipez", 2000],
  ["carlos_chris", 2000],
  ["warmhang", 1650],
  ["outpost33", 2100],
  ["slowzug", 1650],
  ["aleks_alex", 2000],
  ["flickdawner", 1450],
  ["silentpressr", 2200],
  ["jordan24", 1350],
  ["ren60", 1900],
  ["gracew16", 2200],
  ["ren59", 1350],
  ["kenji11", 1650],
  ["steve77", 1950],
  ["cozyslay", 2100],
  ["wei52", 2050],
  ["paolo2002", 1650],
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

// Curated, thematic pfp assignments: where a persona's name suggests an image
// it gets that one (teatimechess -> tea_set, night0wl -> city_night). Every
// OTHER persona now also gets an image pfp (a name-hashed one, see
// personaAvatar) rather than the piece-on-plate flower preset, so the whole
// roster reads like real users who uploaded a random photo (a beach, a coffee
// mug, a houseplant). Keyed by persona name (stable across roster reordering);
// the value is the pfp's <name>, turned into a "house_pfp:<name>" avatar id
// below. Every listed persona name must exist in PERSONA_DEFS and every pfp
// name must exist in lib/avatars' HOUSE_PFP_NAMES.
const HOUSE_PFP_ASSIGN: Record<string, string> = {
  coffeeknight: "coffee_mug",
  teatimechess: "tea_set",
  night0wl: "city_night",
  midnightblitz: "rainy_neon",
  coffeehousepro: "record_player",
  sarah92: "flower_vase",
  natalie88: "lavender_field",
  priya_r: "koi_pond",
  elena_88: "sunflowers",
  maya_r2: "monstera",
  tanya_v: "succulents",
  mira_k: "potted_cactus",
  nadia_x: "beach_sunset",
  jess2001: "palm_beach",
  quietqueen: "bookshelf",
  frostbyte: "snowy_peak",
  riptide: "sailboat",
  discocheck: "hot_air_balloons",
  blitzbrain: "aurora",
  mellowmove: "mountain_lake",
  sleepyknight: "tent_stars",
  karpov_enjoyer: "forest_path",
  casualcastle: "lake_cabin",
  boardsnack: "fruit_bowl",
  pawnstorm77: "waterfall",
  omar_23: "desert_dunes",
  lukas_j: "bicycle",
  stefan_bg: "lighthouse",
  cobrakai: "cat_sunset",
  crushingpawns: "autumn_leaves",
};

// The baked avatar a persona debuts with: its curated house pfp when it has
// one, otherwise a name-hashed house pfp from the full catalog. Owner ask: WAY
// more of the roster should read like real users with an uploaded photo, so
// every persona now debuts with an image pfp instead of a flower preset. The
// pick is deterministic (name-hashed) and spread across the 30-image catalog,
// so the crowd looks varied and stays stable across deploys. Flower presets
// remain a valid house look (still offered in the /mod editor and held by any
// persona an admin switches back to one), just no longer the default.
function personaAvatar(name: string): string {
  const pfp = HOUSE_PFP_ASSIGN[name];
  if (pfp) return HOUSE_PFP_PREFIX + pfp;
  return HOUSE_PFP_PREFIX + HOUSE_PFP_NAMES[nameHash(name) % HOUSE_PFP_NAMES.length];
}

// Short, generic, SFW blurbs — the kind a real player might jot on their profile.
// Deliberately name-agnostic (assigned by hash), so any bio fits any persona.
// Roughly half the roster gets one (personaBio); the rest stay blank, like real
// users where some wrote something and some never bothered. A moderator's bio
// override (houseIdentity) still wins over the baked one.
const HOUSE_BIOS: string[] = [
  "here for the blitz",
  "London System enjoyer",
  "1. e4 and pray",
  "coffee then chess",
  "always down for a rematch",
  "bullet addict, sorry",
  "trying to hit 2000 someday",
  "endgames are underrated",
  "gambit or bust",
  "just vibing",
  "chess is my cardio",
  "will trade queens for peace",
  "premove enthusiast",
  "still learning the Sicilian",
  "flag me if you can",
  "rapid > blitz, fight me",
  "chess and dogs",
  "here to blunder in style",
  "one more game, always",
  "knight before bishop, usually",
  "casual player, competitive heart",
  "back-rank mates ruin my day",
  "opening theory? never heard of it",
  "grinding the ladder slowly",
  "tea, rain, and a good game",
  "chess club refugee",
  "weekends only",
  "hoping for a brilliant move someday",
  "draws are a state of mind",
  "student by day, patzer by night",
  "traveling and playing",
  "self-taught, still trying",
  "long games, short patience",
  "here for the vibes and the wins",
  "Fischer random is real chess",
  "will resign gracefully, eventually",
  "checkmate or bust",
  "the pieces move themselves",
  "down bad in the endgame",
  "chess over everything",
];

/** A persona's baked bio: a stable hashed blurb for ~45% of the roster, null for
 * the rest. Deterministic per name, so it never flickers across deploys. Used as
 * the fallback under any staff bio override. */
export function personaBio(persona: HousePersona): string | null {
  if (nameHash(persona.name + "|hasbio") % 100 >= 45) return null;
  return HOUSE_BIOS[nameHash(persona.name + "|bio") % HOUSE_BIOS.length];
}

// The avatar id space a house persona may hold: the full flowered catalog plus
// the house-pfp catalog. Exported for the /mod/house admin editor (its avatar
// picker offers exactly these, and the save route validates against this set),
// so an admin edit can move a persona between any two house looks but never
// outside the house-only avatar space.
export const HOUSE_AVATAR_IDS: readonly string[] = [...HOUSE_PFP_IDS, ...FLOWER_AVATARS];

// One plausible home base per persona (owner report: every bot showed the
// same location). Spread world-wide so the crowd reads like a real player base
// (assigned by roster index; the list wraps for the 210-deep roster, so some
// repeat). Shown only as a label in the /mod/house editor; it
// is NOT written into the profile bio anymore (that read as a weird
// auto-generated description). A bot's bio is empty until a moderator sets one
// (see HouseIdentityOverride / ensureHouseUsers / syncHouseRatings).
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
  // The whole roster debuts with a "real uploaded-looking" scenic/object pfp:
  // a curated one (HOUSE_PFP_ASSIGN) where the name fits, else a name-hashed
  // one from the catalog. Stable per persona and varied across the roster.
  avatar: personaAvatar(name),
  // Roster-index assignment keeps every persona's location DISTINCT (the list
  // is at least as long as the roster) and stable across deploys.
  location: HOUSE_LOCATIONS[i % HOUSE_LOCATIONS.length],
}));

const HOUSE_USER_IDS = new Set(HOUSE_ROSTER.map((p) => p.userId));
const HOUSE_BY_ID = new Map(HOUSE_ROSTER.map((p) => [p.userId, p]));

// House-bot presence has TWO tiers, both drawn as a ROTATING, DAY-VARYING window
// of the full 210-deep roster (same day offset, so the smaller set is always a
// prefix of the larger — no persona is "playing" without also being "online"):
//   • ACTIVE (60-120, varies daily): the bots that actually seek, get picked up,
//     and play filler. dailyHouseCount picks the day's count; a moderator may
//     still pin an explicit one from /mod (worker.ts houseCount honours it).
//   • ONLINE (up to 150): how many bots SHOW in the lobby's online list at once.
//     The active ones among them read as playing/searching; the rest just idle
//     "online" for a fuller lobby (they don't seek or play).
// The window's start advances each day (step coprime with the roster) so the
// site cycles through every persona over time. Every persona still holds a seeded
// account, so its profile/rating/leaderboard entry stay intact whether or not it
// is currently in a window.
export const HOUSE_COUNT_MIN = 60;
export const HOUSE_COUNT_MAX = 120;
// How many bots idle "online" for presence — never more than the roster holds.
export const HOUSE_ONLINE_COUNT = Math.min(150, HOUSE_ROSTER.length);

export function clampHouseCount(n: number): number {
  return Number.isFinite(n)
    ? Math.max(HOUSE_COUNT_MIN, Math.min(HOUSE_COUNT_MAX, Math.floor(n)))
    : HOUSE_COUNT_MIN;
}

/** The active count for a given day: a deterministic value in [MIN, MAX] that
 * changes daily so the house population breathes day to day. `dayIndex` = whole
 * days since the epoch (Math.floor(Date.now() / 86400000)); the DO passes it in so
 * this module stays clock-free (Date is unavailable in some call contexts). */
export function dailyHouseCount(dayIndex: number): number {
  const span = HOUSE_COUNT_MAX - HOUSE_COUNT_MIN + 1;
  return HOUSE_COUNT_MIN + (nameHash("house-count:" + Math.floor(dayIndex)) % span);
}

// The rotating window start for a day. Shared by the active and online windows so
// the active set is always a prefix of the online set. Step 31 is coprime with a
// 210-deep roster, so all offsets are visited over time.
function houseWindowStart(dayIndex: number): number {
  return (Math.floor(dayIndex) * 31) % HOUSE_ROSTER.length;
}

/** A `size`-persona window starting at the day's rotating offset, wrapping the
 * roster. Clamped to the roster length; returns the whole roster when size >= it. */
function houseWindow(size: number, dayIndex: number): HousePersona[] {
  const len = HOUSE_ROSTER.length;
  const n = Math.max(0, Math.min(Math.floor(size), len));
  if (n >= len) return HOUSE_ROSTER.slice();
  const start = houseWindowStart(dayIndex);
  const out: HousePersona[] = [];
  for (let i = 0; i < n; i++) out.push(HOUSE_ROSTER[(start + i) % len]);
  return out;
}

/** The ACTIVE house personas for a day (seek / pickup / filler): a window of
 * `count` (clamped to 60-120), rotating daily. `dayIndex` defaults to 0 (a stable
 * first-N window) for pure/test callers that don't rotate. */
export function activeHouseRoster(count: number, dayIndex = 0): HousePersona[] {
  return houseWindow(clampHouseCount(count), dayIndex);
}

/** The ONLINE-presence personas for a day: the active window PLUS extra idle bots,
 * up to HOUSE_ONLINE_COUNT, sharing the same day offset so the active set is a
 * prefix. Used only for the lobby "online" list — the extra ones never seek/play. */
export function onlineHouseRoster(dayIndex = 0): HousePersona[] {
  return houseWindow(HOUSE_ONLINE_COUNT, dayIndex);
}

export function isHouseUserId(id: string | null | undefined): boolean {
  return !!id && HOUSE_USER_IDS.has(id);
}

// ---------------------------------------------------------------------------
// Staff identity overrides (username / avatar / bio), stored in D1
// (house_identity_overrides, migrations/0025 + 0028's bio column) and edited
// from /mod/house by any moderator or admin.
// Resolution is always `override ?? default`: a NULL column (or a missing row)
// falls through to the baked persona constant (empty for bio — the roster no
// longer bakes a bio). The save route also writes the persona's users row, so
// every surface that reads identity from the database (profiles, leaderboard,
// lobby online list, seat attach) picks an edit up without a deploy; these
// helpers exist for the surfaces that would otherwise read the code constant
// (the /mod editor itself and syncHouseRatings, which must not clobber a
// staff-set avatar or bio on the next identity re-sync).
// ---------------------------------------------------------------------------

export type HouseIdentityOverride = {
  username: string | null;
  avatar: string | null;
  bio: string | null;
};

/** All stored identity overrides, keyed by persona user id. Never throws: a
 * missing table (pre-migration database) or read failure reads as "no
 * overrides". Rows for ids no longer in the roster are ignored. */
export async function loadHouseIdentityOverrides(
  db: D1Database,
): Promise<Map<string, HouseIdentityOverride>> {
  try {
    const rows = await db
      .prepare(`SELECT user_id, username, avatar, bio FROM house_identity_overrides`)
      .all<{ user_id: string; username: string | null; avatar: string | null; bio: string | null }>();
    const map = new Map<string, HouseIdentityOverride>();
    for (const row of rows.results) {
      if (!HOUSE_USER_IDS.has(row.user_id)) continue;
      map.set(row.user_id, {
        username: row.username ?? null,
        avatar: row.avatar ?? null,
        bio: row.bio ?? null,
      });
    }
    return map;
  } catch {
    return new Map();
  }
}

/** A persona's effective display identity: override ?? baked default. Bio falls
 * back to the persona's baked blurb (personaBio — set for ~45% of the roster,
 * null for the rest) when no staff override exists. */
export function houseIdentity(
  persona: HousePersona,
  override: HouseIdentityOverride | undefined | null,
): { name: string; avatar: string; bio: string | null } {
  return {
    name: override?.username || persona.name,
    avatar: override?.avatar || persona.avatar,
    bio: override?.bio || personaBio(persona),
  };
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
    medium: (skill) => skill >= 1650 && skill <= 1900,
    hard: (skill) => skill >= 1950,
  };
  const free = roster.filter((persona) => !busy.has(persona.userId));
  if (!free.length) return null;
  const banded = free.filter((persona) => inBand[difficulty](persona.skill));
  const pool = banded.length ? banded : free;
  return pool[rand(pool.length)];
}

// The rating a persona ADVERTISES is decoupled from its engine `skill`. The skill
// still drives how hard it actually plays (HOUSE_SKILL_PROFILES, capped by the DO
// ceiling), but the displayed/rated number is shifted here so the field can be
// re-spread without touching strength or the difficulty-band picker.
//
// Owner spread: every bot +100, EXCEPT sub-1600 bots (the 1350/1450/1550 tiers)
// which drop 100-150 instead — pulling the low end down and pushing everyone else
// up, so the roster spans ~1150 to ~2300 instead of ~1510-2240.
function houseSeedBase(persona: HousePersona): number {
  const seed = persona.skill - 40 + (nameHash(persona.name) % 81); // skill +-40 jitter
  if (persona.skill < 1600) {
    const drop = 100 + (nameHash(persona.name + "|drop") % 51); // 100..150
    return seed - drop;
  }
  return seed + 100;
}

/** A bot's Nerf and Buff ratings differ by up to ~100 (like a real player who is
 * stronger at one mode): a stable 0..50 spread applied +/- around the base, with a
 * per-persona direction, so the two modes sit symmetric about houseSeedBase and
 * never more than 100 apart. Deterministic — re-derived identically on every sync. */
export function houseSeedRatingForMode(persona: HousePersona, mode: DraftMode): number {
  const spread = nameHash(persona.name + "|spread") % 51; // 0..50
  const buffHigher = nameHash(persona.name + "|dir") % 2 === 0;
  const delta = (mode === "buff") === buffHigher ? spread : -spread;
  return Math.max(100, houseSeedBase(persona) + delta);
}

/** The mode-neutral seeded rating: the base. Written to the legacy users.rating
 * column and used as the fallback wherever a live per-mode bucket isn't loaded. */
export function houseSeedRating(persona: HousePersona): number {
  return Math.max(100, houseSeedBase(persona));
}

/** Batch a large statement list in bounded chunks (the 210-deep roster produces
 * ~630 statements; D1 batches have practical size limits, so never send them all
 * at once). Order within a chunk is preserved; chunks run sequentially. */
async function batchInChunks(
  db: D1Database,
  statements: D1PreparedStatement[],
  size = 90,
): Promise<void> {
  for (let i = 0; i < statements.length; i += size) {
    await db.batch(statements.slice(i, i + size));
  }
}

// Create any missing house accounts, with both per-mode rating buckets seeded
// at the persona's skill. The password hash is unparseable on purpose
// (verifyPassword requires a "pbkdf2:" prefix), so nobody can sign in as one.
// Idempotent (INSERT OR IGNORE): safe to run on every cold start. Seeds with
// the staff identity override (username/avatar/bio) when one exists, so an edit
// saved before the account row existed (fresh database) still lands. A fresh
// bot with no bio override debuts with an empty bio (the roster no longer seeds
// its location as a bio).
export async function ensureHouseUsers(db: D1Database): Promise<void> {
  const now = Date.now();
  const overrides = await loadHouseIdentityOverrides(db);
  const statements = HOUSE_ROSTER.flatMap((persona) => {
    const base = houseSeedRating(persona);
    const identity = houseIdentity(persona, overrides.get(persona.userId));
    return [
      db
        .prepare(
          `INSERT OR IGNORE INTO users (id, username, username_lower, password_hash, created_at, rating, rd, vol, avatar, bio)
           VALUES (?, ?, ?, ?, ?, ?, 150, 0.06, ?, ?)`,
        )
        .bind(persona.userId, identity.name, identity.name.toLowerCase(), "unusable", now, base, identity.avatar, identity.bio),
      // Nerf and Buff seed at DIFFERENT numbers (houseSeedRatingForMode), so a bot
      // reads like a real player who is stronger in one mode than the other.
      ...(["nerf", "buff"] as const).map((mode) => {
        const r = houseSeedRatingForMode(persona, mode);
        return db
          .prepare(
            `INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
             VALUES (?, ?, ?, 150, 0.06, ?)`,
          )
          .bind(persona.userId, mode, r, r);
      }),
    ];
  });
  await batchInChunks(db, statements);
}

/** The number of personas in the current roster — the target account count. */
export const HOUSE_ROSTER_SIZE = HOUSE_ROSTER.length;

/** How many of the CURRENT roster's accounts already exist in the users table.
 * Counts only the live roster's ids (not orphaned ids from retired rosters), so
 * it is an exact "how many personas are still missing an account" signal. One
 * cheap COUNT; the id list is the bounded roster size. Used to make seeding
 * self-healing: if this is below HOUSE_ROSTER_SIZE, personas are missing accounts
 * (a freshly grown roster, or a partial/failed prior seed) and ensureHouseUsers
 * must run to create them — the fix for "house bots with no account (ghosts)". */
export async function countSeededHouseUsers(db: D1Database): Promise<number> {
  const ids = HOUSE_ROSTER.map((p) => p.userId);
  const placeholders = ids.map(() => "?").join(",");
  try {
    const row = await db
      .prepare(`SELECT COUNT(*) AS n FROM users WHERE id IN (${placeholders})`)
      .bind(...ids)
      .first<{ n: number }>();
    return row?.n ?? 0;
  } catch {
    // A read failure reads as "assume missing" so seeding runs rather than skips.
    return 0;
  }
}

// Re-point every EXISTING house account's rating (and its per-mode buckets) at
// the current houseSeedRating, and circulate identity revisions (avatar, bio).
// ensureHouseUsers only ever INSERTs (OR IGNORE), so once an account exists a
// roster revision never reaches it; this bounded UPDATE is what actually
// circulates one. House users only (every id comes from HOUSE_ROSTER), and
// idempotent: it writes the same deterministic values every time and peak only
// ever ratchets up (MAX). Bio handling: when a staff bio override exists it is
// written verbatim (a resync never clobbers it); with no override, any bio that
// still exactly equals the persona's baked location string is CLEARED (so older
// deployments that seeded the location-as-bio get cleaned up on the next
// resync), while any other non-empty bio is left untouched. The caller gates it
// behind a versioned cold-start key so it runs once per revision rather than
// every tick. Staff identity overrides (/mod/house) win over the baked avatar
// here, so a roster identity revision never undoes a moderator's edit.
export async function syncHouseRatings(db: D1Database): Promise<void> {
  const overrides = await loadHouseIdentityOverrides(db);
  const statements = HOUSE_ROSTER.flatMap((persona) => {
    const base = houseSeedRating(persona);
    const identity = houseIdentity(persona, overrides.get(persona.userId));
    return [
      // With a bio (staff override or the baked blurb), write it; otherwise clear
      // any leftover location-as-bio (older seed) and leave a real bio alone.
      identity.bio !== null
        ? db
            .prepare(`UPDATE users SET rating = ?, avatar = ?, bio = ? WHERE id = ?`)
            .bind(base, identity.avatar, identity.bio, persona.userId)
        : db
            .prepare(
              `UPDATE users SET rating = ?, avatar = ?, bio = CASE WHEN bio = ? THEN NULL ELSE bio END WHERE id = ?`,
            )
            .bind(base, identity.avatar, persona.location, persona.userId),
      // Re-point each mode bucket at its own per-mode number (peak only ratchets up).
      ...(["nerf", "buff"] as const).map((mode) => {
        const r = houseSeedRatingForMode(persona, mode);
        return db
          .prepare(
            `UPDATE user_ratings SET rating = ?, peak = MAX(peak, ?) WHERE user_id = ? AND category = ?`,
          )
          .bind(r, r, persona.userId, mode);
      }),
    ];
  });
  await batchInChunks(db, statements);
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
