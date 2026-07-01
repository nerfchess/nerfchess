// Glicko-2 single-player rating persistence (localStorage) for the bot ladder.
// One rating per player, updated after every completed rated game vs the AI.
// Bots get fixed seed ratings by difficulty so the player's rating converges
// toward a stable estimate of their strength. Online rated games use the
// server-side rating in D1 instead — see src/lib/server/games.ts.

import { glickoUpdate } from "./glicko";

const STORAGE_KEY = "dc:rating-v1";

export interface Rating {
  rating: number;
  rd: number;
  vol: number;
  games: number;
}

const DEFAULT: Rating = { rating: 1500, rd: 350, vol: 0.06, games: 0 };

export type AILevel = "easy" | "medium" | "hard";

const BOT_RATING: Record<AILevel, { rating: number; rd: number }> = {
  easy: { rating: 1100, rd: 60 },
  medium: { rating: 1500, rd: 60 },
  hard: { rating: 1900, rd: 60 },
};

export function loadRating(): Rating {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.rating === "number" &&
      typeof parsed?.rd === "number" &&
      typeof parsed?.vol === "number"
    ) {
      return { rating: parsed.rating, rd: parsed.rd, vol: parsed.vol, games: parsed.games ?? 0 };
    }
  } catch {}
  return { ...DEFAULT };
}

export function saveRating(r: Rating) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
  } catch {}
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
