// Glicko-2 single-player rating, updated after every completed game vs the AI.
// Bots get fixed seed ratings by difficulty so the player's rating converges
// toward a stable estimate of their strength.
//
// This module is a backwards-compatible facade over the multi-category store
// in lib/ratings.ts: the historical "single rating" is the Blitz bucket
// (DEFAULT_CATEGORY). Existing callers — including the game flow — keep using
// loadRating / saveRating / applyResult unchanged; the rating just lives in,
// and migrates from, the new per-category storage. The Glicko-2 math itself is
// shared with the server-side online ratings in lib/glicko.ts. Online rated
// games use the account rating in D1 instead — see src/lib/server/games.ts.

import { glickoUpdate } from "./glicko";
import { DEFAULT_CATEGORY, type RatingCategoryId } from "./ratingCategories";
import { loadRatings, saveRatings, type CategoryStats } from "./ratings";

export interface Rating {
  rating: number;
  rd: number;
  vol: number;
  games: number;
}

export type AILevel = "easy" | "medium" | "hard";

const BOT_RATING: Record<AILevel, { rating: number; rd: number }> = {
  easy: { rating: 1100, rd: 60 },
  medium: { rating: 1500, rd: 60 },
  hard: { rating: 1900, rd: 60 },
};

function toRating(s: CategoryStats): Rating {
  return { rating: s.rating, rd: s.rd, vol: s.vol, games: s.games };
}

export function loadRating(): Rating {
  return loadRatingFor(DEFAULT_CATEGORY);
}

export function saveRating(r: Rating) {
  saveRatingFor(DEFAULT_CATEGORY, r);
}

// Per-time-control buckets: each category has its own independent rating, and
// a rated game only ever touches the bucket its time control falls into.
export function loadRatingFor(category: RatingCategoryId): Rating {
  return toRating(loadRatings()[category]);
}

export function saveRatingFor(category: RatingCategoryId, r: Rating, outcome?: "win" | "loss" | "draw") {
  if (typeof window === "undefined") return;
  const all = loadRatings();
  const s = all[category];
  s.rating = r.rating;
  s.rd = r.rd;
  s.vol = r.vol;
  s.games = r.games;
  s.peak = Math.max(s.peak, r.rating);
  if (outcome === "win") s.wins += 1;
  else if (outcome === "loss") s.losses += 1;
  else if (outcome === "draw") s.draws += 1;
  saveRatings(all);
}

// score: 1 = win, 0.5 = draw, 0 = loss
export function applyResult(current: Rating, level: AILevel, score: 0 | 0.5 | 1): Rating {
  const bot = BOT_RATING[level];
  const next = glickoUpdate(
    { rating: current.rating, rd: current.rd, vol: current.vol },
    { rating: bot.rating, rd: bot.rd, vol: 0.06 },
    score,
  );
  return { ...next, games: current.games + 1 };
}
