// Per-category rating + statistics storage (localStorage). This is the single
// source of truth for every rated bucket defined in ratingCategories.ts.
//
// Backwards compatibility: the app previously stored one Glicko-2 rating under
// "dc:rating-v1". On first load we migrate that value into the Blitz bucket
// (see LEGACY_LOCAL_CATEGORY) and seed the other buckets at their defaults.
// The old key is left in place, untouched, as a safety net.
//
// Only rating / games / peak are wired to live play today (via lib/rating.ts,
// which keeps the legacy single-rating API working against the Blitz bucket).
// wins / losses / draws are part of the schema and UI now but are populated
// later, when real rated queues land — hence "stored and displayed" for now.

import {
  LEGACY_LOCAL_CATEGORY,
  RATING_CATEGORIES,
  type RatingCategoryId,
} from "./ratingCategories";

export interface CategoryStats {
  rating: number;
  rd: number;
  vol: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  peak: number;
}

export type Ratings = Record<RatingCategoryId, CategoryStats>;

const STORAGE_KEY = "dc:ratings-v2";
const LEGACY_KEY = "dc:rating-v1";

export const DEFAULT_STATS: CategoryStats = {
  rating: 1500,
  rd: 350,
  vol: 0.06,
  games: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  peak: 1500,
};

function freshRatings(): Ratings {
  const out = {} as Ratings;
  for (const c of RATING_CATEGORIES) out[c.id] = { ...DEFAULT_STATS };
  return out;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Coerce arbitrary parsed JSON into a complete, valid Ratings object. New
 *  categories that aren't present in stored data fall back to defaults, so the
 *  registry can grow without a storage migration. */
function normalize(parsed: unknown): Ratings {
  const out = freshRatings();
  if (parsed && typeof parsed === "object") {
    const record = parsed as Record<string, Partial<CategoryStats>>;
    for (const c of RATING_CATEGORIES) {
      const s = record[c.id];
      if (s && typeof s === "object") {
        const rating = num(s.rating, DEFAULT_STATS.rating);
        out[c.id] = {
          rating,
          rd: num(s.rd, DEFAULT_STATS.rd),
          vol: num(s.vol, DEFAULT_STATS.vol),
          games: num(s.games, 0),
          wins: num(s.wins, 0),
          losses: num(s.losses, 0),
          draws: num(s.draws, 0),
          peak: num(s.peak, rating),
        };
      }
    }
  }
  return out;
}

/** Build the initial multi-category store from any legacy single rating. */
function migrateLegacy(): Ratings {
  const out = freshRatings();
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<CategoryStats> | null;
      if (p && typeof p.rating === "number") {
        out[LEGACY_LOCAL_CATEGORY] = {
          ...DEFAULT_STATS,
          rating: p.rating,
          rd: num(p.rd, DEFAULT_STATS.rd),
          vol: num(p.vol, DEFAULT_STATS.vol),
          games: num(p.games, 0),
          peak: Math.max(DEFAULT_STATS.peak, p.rating),
        };
      }
    }
  } catch {}
  return out;
}

export function loadRatings(): Ratings {
  if (typeof window === "undefined") return freshRatings();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
    // First run on this device: migrate the legacy rating, then persist so the
    // migration is a one-time event.
    const migrated = migrateLegacy();
    saveRatings(migrated);
    return migrated;
  } catch {}
  return freshRatings();
}

export function saveRatings(r: Ratings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
  } catch {}
}

export function loadCategory(id: RatingCategoryId): CategoryStats {
  return loadRatings()[id];
}

export function saveCategory(id: RatingCategoryId, stats: CategoryStats) {
  const all = loadRatings();
  all[id] = stats;
  saveRatings(all);
}

// --- Derived helpers -------------------------------------------------------

/** Decisive-plus-drawn games actually recorded, which may trail `games` for
 *  legacy Blitz data migrated before W/L/D tracking existed. */
export function decidedGames(s: CategoryStats): number {
  return s.wins + s.losses + s.draws;
}

/** Win rate in [0,1], or null when no outcomes have been recorded yet. */
export function winRate(s: CategoryStats): number | null {
  const decided = decidedGames(s);
  return decided === 0 ? null : s.wins / decided;
}

export function formatWinRate(s: CategoryStats): string {
  const rate = winRate(s);
  return rate === null ? "-" : `${Math.round(rate * 100)}%`;
}
