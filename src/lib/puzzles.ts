// Client-side puzzle progress: a local Elo-style puzzle rating, solve streak,
// and the set of already-solved puzzles, persisted in localStorage (puzzles
// are single-player and free, so no server round-trip is needed).

import { PUZZLES, PuzzleData } from "./puzzleData";

export type { PuzzleData, PuzzleTheme } from "./puzzleData";

export interface PuzzleProgress {
  rating: number;
  streak: number;
  bestStreak: number;
  solved: number;
  failed: number;
  done: string[]; // puzzle ids already attempted (solved or failed)
}

const KEY = "nerfchess.puzzles.v1";
const START_RATING = 1000;
const K = 32;

export function loadPuzzleProgress(): PuzzleProgress {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<PuzzleProgress>;
        return {
          rating: typeof p.rating === "number" ? p.rating : START_RATING,
          streak: p.streak ?? 0,
          bestStreak: p.bestStreak ?? 0,
          solved: p.solved ?? 0,
          failed: p.failed ?? 0,
          done: Array.isArray(p.done) ? p.done : [],
        };
      }
    } catch {}
  }
  return { rating: START_RATING, streak: 0, bestStreak: 0, solved: 0, failed: 0, done: [] };
}

export function savePuzzleProgress(p: PuzzleProgress) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

/** Elo delta for the solver against the puzzle's rating. */
export function ratingDelta(playerRating: number, puzzleRating: number, won: boolean): number {
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - playerRating) / 400));
  return Math.round(K * ((won ? 1 : 0) - expected));
}

export function applyPuzzleResult(p: PuzzleProgress, puzzle: PuzzleData, won: boolean): PuzzleProgress {
  const next: PuzzleProgress = {
    ...p,
    rating: p.rating + ratingDelta(p.rating, puzzle.rating, won),
    streak: won ? p.streak + 1 : 0,
    solved: p.solved + (won ? 1 : 0),
    failed: p.failed + (won ? 0 : 1),
    done: p.done.includes(puzzle.id) ? p.done : [...p.done, puzzle.id],
  };
  next.bestStreak = Math.max(next.bestStreak, next.streak);
  savePuzzleProgress(next);
  return next;
}

/**
 * Pick the next puzzle: prefer fresh puzzles rated near the player, widening
 * the band until something matches; once every puzzle has been attempted,
 * recycle the full set.
 */
export function pickPuzzle(p: PuzzleProgress, excludeId?: string): PuzzleData {
  const doneSet = new Set(p.done);
  let pool = PUZZLES.filter((z) => !doneSet.has(z.id) && z.id !== excludeId);
  if (pool.length === 0) pool = PUZZLES.filter((z) => z.id !== excludeId);
  if (pool.length === 0) pool = PUZZLES;
  for (const band of [200, 350, 600, Infinity]) {
    const near = pool.filter((z) => Math.abs(z.rating - p.rating) <= band);
    if (near.length > 0) return near[Math.floor(Math.random() * near.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
