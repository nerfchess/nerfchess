// Detailed player statistics (a la Lichess) computed from recorded games.
// Pure aggregation over rows from the `games` table so it can run in the
// stats API route and be exercised directly in tests.

import { categoryForTimeControl, RATING_CATEGORY_IDS, type RatingCategoryId } from "./ratingCategories";

export type StatsGameRow = {
  id: string;
  rated: number;
  winner: "w" | "b" | "draw" | null;
  reason: string;
  white_user_id: string | null;
  black_user_id: string | null;
  white_name: string;
  black_name: string;
  white_rating_before: number | null;
  black_rating_before: number | null;
  white_rating_after: number | null;
  black_rating_after: number | null;
  time_sec: number;
  increment_sec: number;
  started_at: number;
  completed_at: number;
};

export type StreakInfo = { length: number; from: number | null; to: number | null };

export type SpeedStats = { games: number; wins: number; draws: number; losses: number };

export type PlayerStats = {
  totalGames: number;
  ratedGames: number;
  wins: number;
  draws: number;
  losses: number;
  /** Losses where the player's clock ran out. */
  timeoutLosses: number;
  /** Wall-clock time spent in recorded games, capped per game. */
  timePlayedMs: number;
  /** Mean rating of opponents in rated games (their rating going in). */
  avgOpponentRating: number | null;
  highest: { rating: number; at: number } | null;
  lowest: { rating: number; at: number } | null;
  winStreak: { longest: StreakInfo; current: number };
  lossStreak: { longest: StreakInfo; current: number };
  /** Strongest rated opponents beaten, one entry per opponent. */
  bestWins: Array<{ id: string; opponent: string; rating: number; at: number }>;
  perSpeed: Record<RatingCategoryId, SpeedStats>;
  firstGameAt: number | null;
};

// A single game can't credibly last longer than this; guards the time-played
// sum against clock skew or a match that idled before being recorded.
const MAX_GAME_MS = 4 * 60 * 60 * 1000;

function emptyStreak(): StreakInfo {
  return { length: 0, from: null, to: null };
}

/** Aggregate stats for `userId` from their games, oldest first. */
export function computePlayerStats(userId: string, rows: StatsGameRow[]): PlayerStats {
  const perSpeed = {} as Record<RatingCategoryId, SpeedStats>;
  for (const id of RATING_CATEGORY_IDS) perSpeed[id] = { games: 0, wins: 0, draws: 0, losses: 0 };

  const stats: PlayerStats = {
    totalGames: 0,
    ratedGames: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    timeoutLosses: 0,
    timePlayedMs: 0,
    avgOpponentRating: null,
    highest: null,
    lowest: null,
    winStreak: { longest: emptyStreak(), current: 0 },
    lossStreak: { longest: emptyStreak(), current: 0 },
    bestWins: [],
    perSpeed,
    firstGameAt: rows.length ? rows[0].completed_at : null,
  };

  let opponentRatingSum = 0;
  let opponentRatingCount = 0;
  let runWins = emptyStreak();
  let runLosses = emptyStreak();
  const bestByOpponent = new Map<string, { id: string; opponent: string; rating: number; at: number }>();

  const takeLongest = (run: StreakInfo, longest: StreakInfo) =>
    run.length > longest.length ? { ...run } : longest;

  for (const row of rows) {
    const color: "w" | "b" = row.white_user_id === userId ? "w" : "b";
    const speed = perSpeed[categoryForTimeControl(row.time_sec, row.increment_sec)];

    stats.totalGames++;
    speed.games++;
    if (row.rated) stats.ratedGames++;
    stats.timePlayedMs += Math.min(Math.max(0, row.completed_at - row.started_at), MAX_GAME_MS);

    const opponentName = color === "w" ? row.black_name : row.white_name;
    const opponentRating = color === "w" ? row.black_rating_before : row.white_rating_before;
    const myRatingAfter = color === "w" ? row.white_rating_after : row.black_rating_after;

    if (row.rated && opponentRating != null) {
      opponentRatingSum += opponentRating;
      opponentRatingCount++;
    }
    if (row.rated && myRatingAfter != null) {
      const point = { rating: myRatingAfter, at: row.completed_at };
      if (!stats.highest || point.rating > stats.highest.rating) stats.highest = point;
      if (!stats.lowest || point.rating < stats.lowest.rating) stats.lowest = point;
    }

    // Aborted / unresolved games (no winner) count toward totals only.
    if (row.winner !== "w" && row.winner !== "b" && row.winner !== "draw") continue;

    if (row.winner === "draw") {
      stats.draws++;
      speed.draws++;
      runWins = emptyStreak();
      runLosses = emptyStreak();
      continue;
    }

    if (row.winner === color) {
      stats.wins++;
      speed.wins++;
      runWins = {
        length: runWins.length + 1,
        from: runWins.from ?? row.completed_at,
        to: row.completed_at,
      };
      stats.winStreak.longest = takeLongest(runWins, stats.winStreak.longest);
      runLosses = emptyStreak();
      if (row.rated && opponentRating != null) {
        const existing = bestByOpponent.get(opponentName.toLowerCase());
        if (!existing || opponentRating > existing.rating) {
          bestByOpponent.set(opponentName.toLowerCase(), {
            id: row.id,
            opponent: opponentName,
            rating: Math.round(opponentRating),
            at: row.completed_at,
          });
        }
      }
    } else {
      stats.losses++;
      speed.losses++;
      if (/ran out of time/i.test(row.reason)) stats.timeoutLosses++;
      runLosses = {
        length: runLosses.length + 1,
        from: runLosses.from ?? row.completed_at,
        to: row.completed_at,
      };
      stats.lossStreak.longest = takeLongest(runLosses, stats.lossStreak.longest);
      runWins = emptyStreak();
    }
  }

  stats.winStreak.current = runWins.length;
  stats.lossStreak.current = runLosses.length;
  stats.avgOpponentRating =
    opponentRatingCount > 0 ? Math.round(opponentRatingSum / opponentRatingCount) : null;
  stats.bestWins = [...bestByOpponent.values()].sort((a, b) => b.rating - a.rating).slice(0, 5);
  return stats;
}
