// Detailed player statistics (a la Lichess) computed from recorded games.
// Pure aggregation over rows from the `games` table so it can run in the
// stats API route and be exercised directly in tests.

import {
  ALL_RATING_CATEGORY_IDS,
  categoryForTimeControl,
  isRatingCategoryId,
  type RatingCategoryId,
} from "./ratingCategories";

export type StatsGameRow = {
  id: string;
  rated: number;
  winner: "w" | "b" | "draw" | null;
  reason: string;
  white_user_id: string | null;
  black_user_id: string | null;
  white_name: string;
  black_name: string;
  white_nerf_id: string;
  black_nerf_id: string;
  white_rating_before: number | null;
  black_rating_before: number | null;
  white_rating_after: number | null;
  black_rating_after: number | null;
  time_sec: number;
  increment_sec: number;
  /** Rated bucket the game was recorded under ("nerf"/"buff" for mode games,
   *  a speed id for legacy games); null rows predate the column and fall back
   *  to the time-control bucket. */
  category?: string | null;
  /** Plies in the game, computed in SQL from the space-separated move list. */
  move_count: number;
  started_at: number;
  completed_at: number;
};

export type StreakInfo = { length: number; from: number | null; to: number | null };

export type SpeedStats = { games: number; wins: number; draws: number; losses: number };

export type HeadToHeadEntry = {
  opponent: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  lastPlayed: number;
};

export type SessionInfo = {
  startedAt: number;
  endedAt: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  durationMs: number;
};

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
  highest: { rating: number; at: number; gameId: string } | null;
  lowest: { rating: number; at: number; gameId: string } | null;
  winStreak: { longest: StreakInfo; current: number };
  lossStreak: { longest: StreakInfo; current: number };
  /** Strongest rated opponents beaten, one entry per opponent. */
  bestWins: Array<{ id: string; opponent: string; rating: number; at: number }>;
  /** The five most-played opponents, with the record against each. */
  headToHead: HeadToHeadEntry[];
  gameLength: { avgPlies: number | null; avgDurationMs: number | null };
  /** Play sessions: runs of games separated by less than an hour. */
  sessions: { count: number; longestGames: number; avgGames: number; recent: SessionInfo[] };
  /** Record per rated bucket. The UI shows only the mode buckets (Nerf and
   *  Buff); the retired speed buckets are still tallied here so old games
   *  keep a home. */
  perSpeed: Record<RatingCategoryId, SpeedStats>;
  firstGameAt: number | null;
};

// A single game can't credibly last longer than this; guards the time-played
// sum against clock skew or a match that idled before being recorded.
const MAX_GAME_MS = 4 * 60 * 60 * 1000;

// Games closer together than this belong to the same play session.
const SESSION_GAP_MS = 60 * 60 * 1000;

function emptyStreak(): StreakInfo {
  return { length: 0, from: null, to: null };
}

/** Aggregate stats for `userId` from their games, oldest first. */
export function computePlayerStats(userId: string, rows: StatsGameRow[]): PlayerStats {
  const perSpeed = {} as Record<RatingCategoryId, SpeedStats>;
  for (const id of ALL_RATING_CATEGORY_IDS) perSpeed[id] = { games: 0, wins: 0, draws: 0, losses: 0 };

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
    headToHead: [],
    gameLength: { avgPlies: null, avgDurationMs: null },
    sessions: { count: 0, longestGames: 0, avgGames: 0, recent: [] },
    perSpeed,
    firstGameAt: rows.length ? rows[0].completed_at : null,
  };

  let opponentRatingSum = 0;
  let opponentRatingCount = 0;
  let runWins = emptyStreak();
  let runLosses = emptyStreak();
  const bestByOpponent = new Map<string, { id: string; opponent: string; rating: number; at: number }>();
  const byOpponent = new Map<string, HeadToHeadEntry>();
  let plySum = 0;
  let plyGames = 0;
  const sessions: SessionInfo[] = [];

  const takeLongest = (run: StreakInfo, longest: StreakInfo) =>
    run.length > longest.length ? { ...run } : longest;

  for (const row of rows) {
    const color: "w" | "b" = row.white_user_id === userId ? "w" : "b";
    // File the game under its recorded bucket (mode games say "nerf"/"buff");
    // rows without one (pre-column history) fall back to the speed bucket.
    const speed =
      perSpeed[
        isRatingCategoryId(row.category)
          ? row.category
          : categoryForTimeControl(row.time_sec, row.increment_sec)
      ];

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
      const point = { rating: myRatingAfter, at: row.completed_at, gameId: row.id };
      if (!stats.highest || point.rating > stats.highest.rating) stats.highest = point;
      if (!stats.lowest || point.rating < stats.lowest.rating) stats.lowest = point;
    }

    // Head-to-head, sessions, and game length track every game; the
    // win/loss/draw tallies below only cover decided ones.
    const h2hKey = opponentName.toLowerCase();
    let h2h = byOpponent.get(h2hKey);
    if (!h2h) {
      h2h = { opponent: opponentName, games: 0, wins: 0, losses: 0, draws: 0, lastPlayed: row.completed_at };
      byOpponent.set(h2hKey, h2h);
    }
    h2h.games++;
    h2h.lastPlayed = row.completed_at;

    if (row.move_count > 0) {
      plySum += row.move_count;
      plyGames++;
    }

    // Rows arrive oldest first, so a session is just the tail entry as long
    // as the next game starts within the gap.
    const tail = sessions[sessions.length - 1];
    let session: SessionInfo;
    if (tail && row.started_at - tail.endedAt < SESSION_GAP_MS) {
      session = tail;
      session.games++;
      session.endedAt = Math.max(session.endedAt, row.completed_at);
    } else {
      session = {
        startedAt: row.started_at,
        endedAt: row.completed_at,
        games: 1,
        wins: 0,
        losses: 0,
        draws: 0,
        durationMs: 0,
      };
      sessions.push(session);
    }

    // Aborted / unresolved games (no winner) count toward totals only.
    if (row.winner !== "w" && row.winner !== "b" && row.winner !== "draw") continue;

    if (row.winner === "draw") {
      stats.draws++;
      speed.draws++;
      h2h.draws++;
      session.draws++;
      runWins = emptyStreak();
      runLosses = emptyStreak();
      continue;
    }

    if (row.winner === color) {
      stats.wins++;
      speed.wins++;
      h2h.wins++;
      session.wins++;
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
      h2h.losses++;
      session.losses++;
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
  stats.headToHead = [...byOpponent.values()]
    .sort((a, b) => b.games - a.games || b.lastPlayed - a.lastPlayed)
    .slice(0, 5);
  stats.gameLength = {
    avgPlies: plyGames > 0 ? plySum / plyGames : null,
    avgDurationMs: stats.totalGames > 0 ? stats.timePlayedMs / stats.totalGames : null,
  };
  for (const session of sessions) session.durationMs = Math.max(0, session.endedAt - session.startedAt);
  stats.sessions = {
    count: sessions.length,
    longestGames: sessions.reduce((longest, s) => Math.max(longest, s.games), 0),
    avgGames: sessions.length > 0 ? Math.round((stats.totalGames / sessions.length) * 10) / 10 : 0,
    recent: sessions.slice(-5).reverse(),
  };
  return stats;
}
