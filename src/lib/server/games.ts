/// <reference types="@cloudflare/workers-types" />

// Persistence for finished online games, shared by the game server Durable
// Object (direct env.DB) and any API code. Rating updates are Glicko-2 and
// only apply to rated games where both seats belong to accounts.

import { glickoUpdatePair, GlickoRating } from "../glicko";

export interface FinishedGameRecord {
  id: string;
  whiteUserId: string | null;
  blackUserId: string | null;
  whiteName: string;
  blackName: string;
  whiteNerfId: string;
  blackNerfId: string;
  seed: number;
  timeSec: number;
  incrementSec: number;
  moves: string[];
  winner: "w" | "b" | "draw" | null;
  reason: string;
  rated: boolean;
  startedAt: number;
  completedAt: number;
}

interface UserRatingRow {
  id: string;
  rating: number;
  rd: number;
  vol: number;
}

export interface RatingChange {
  userId: string;
  before: number;
  after: number;
}

export async function recordFinishedGame(
  db: D1Database,
  game: FinishedGameRecord,
): Promise<{ white: RatingChange | null; black: RatingChange | null }> {
  let whiteChange: RatingChange | null = null;
  let blackChange: RatingChange | null = null;
  let whiteAfter: GlickoRating | null = null;
  let blackAfter: GlickoRating | null = null;
  let whiteBefore: GlickoRating | null = null;
  let blackBefore: GlickoRating | null = null;

  const rated = game.rated && !!game.whiteUserId && !!game.blackUserId && game.winner !== null;

  if (rated) {
    const rows = await db
      .prepare("SELECT id, rating, rd, vol FROM users WHERE id IN (?, ?)")
      .bind(game.whiteUserId, game.blackUserId)
      .all<UserRatingRow>();
    const white = rows.results.find((r) => r.id === game.whiteUserId);
    const black = rows.results.find((r) => r.id === game.blackUserId);
    if (white && black) {
      whiteBefore = { rating: white.rating, rd: white.rd, vol: white.vol };
      blackBefore = { rating: black.rating, rd: black.rd, vol: black.vol };
      const scoreForWhite = game.winner === "w" ? 1 : game.winner === "b" ? 0 : 0.5;
      const updated = glickoUpdatePair(whiteBefore, blackBefore, scoreForWhite);
      whiteAfter = updated.a;
      blackAfter = updated.b;
      whiteChange = { userId: white.id, before: whiteBefore.rating, after: whiteAfter.rating };
      blackChange = { userId: black.id, before: blackBefore.rating, after: blackAfter.rating };
    }
  }

  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT OR IGNORE INTO games (
          id, white_user_id, black_user_id, white_name, black_name,
          white_nerf_id, black_nerf_id, seed, time_sec, increment_sec,
          moves, winner, reason, rated,
          white_rating_before, white_rating_after, black_rating_before, black_rating_after,
          started_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        game.id,
        game.whiteUserId,
        game.blackUserId,
        game.whiteName,
        game.blackName,
        game.whiteNerfId,
        game.blackNerfId,
        game.seed,
        game.timeSec,
        game.incrementSec,
        game.moves.join(" "),
        game.winner,
        game.reason,
        rated ? 1 : 0,
        whiteBefore?.rating ?? null,
        whiteAfter?.rating ?? null,
        blackBefore?.rating ?? null,
        blackAfter?.rating ?? null,
        game.startedAt,
        game.completedAt,
      ),
  ];

  if (rated && whiteAfter && blackAfter) {
    const winCol = (won: boolean, drew: boolean) =>
      drew ? "draws = draws + 1" : won ? "wins = wins + 1" : "losses = losses + 1";
    const drew = game.winner === "draw";
    statements.push(
      db
        .prepare(
          `UPDATE users SET rating = ?, rd = ?, vol = ?, games = games + 1, ${winCol(game.winner === "w", drew)} WHERE id = ?`,
        )
        .bind(whiteAfter.rating, whiteAfter.rd, whiteAfter.vol, game.whiteUserId),
      db
        .prepare(
          `UPDATE users SET rating = ?, rd = ?, vol = ?, games = games + 1, ${winCol(game.winner === "b", drew)} WHERE id = ?`,
        )
        .bind(blackAfter.rating, blackAfter.rd, blackAfter.vol, game.blackUserId),
    );
  }

  await db.batch(statements);
  return { white: whiteChange, black: blackChange };
}
