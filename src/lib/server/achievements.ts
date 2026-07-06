/// <reference types="@cloudflare/workers-types" />

// Server-side achievement awarding. Called once per finished game (from
// recordFinishedGame) for each seated account. It reduces the game to the plain
// facts the pure catalog needs (src/lib/achievements.ts), then upserts progress
// for every achievement the game advanced. All queries are keyed by user_id, so
// there is no table scan: one bounded read of the player's unlocked ids, then a
// small batch of idempotent upserts.

import {
  ACHIEVEMENTS_BY_ID,
  buildAchievementContext,
  evaluateAchievements,
  type FinishedGameFacts,
} from "../achievements";
import { getNerf } from "../../engine/nerfs/library";
import type { FinishedGameRecord } from "./games";

// Per-game facts the recorded row can't carry: material on the final board and
// the highest card drafted, both computed by the game server from the replayed
// end state, plus the pre-game ratings (known only for rated games).
export interface AchievementExtras {
  material?: { w: number; b: number };
  maxBuffTier?: { w: number; b: number };
  whiteRatingBefore?: number | null;
  blackRatingBefore?: number | null;
}

async function unlockedIds(db: D1Database, userId: string): Promise<Set<string>> {
  const rows = await db
    .prepare(`SELECT achievement_id FROM user_achievements WHERE user_id = ? AND unlocked_at IS NOT NULL`)
    .bind(userId)
    .all<{ achievement_id: string }>();
  return new Set(rows.results.map((r) => r.achievement_id));
}

// Upsert one achievement's progress for one user. Progress accumulates; once it
// reaches the goal, unlocked_at is stamped and then preserved (COALESCE), so a
// later game never rewrites the unlock time.
function upsert(
  db: D1Database,
  userId: string,
  achievementId: string,
  amount: number,
  goal: number,
  now: number,
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO user_achievements (user_id, achievement_id, progress, unlocked_at)
       VALUES (?, ?, ?, CASE WHEN ? >= ? THEN ? ELSE NULL END)
       ON CONFLICT(user_id, achievement_id) DO UPDATE SET
         progress = progress + excluded.progress,
         unlocked_at = COALESCE(unlocked_at, CASE WHEN progress + excluded.progress >= ? THEN ? ELSE NULL END)`,
    )
    .bind(userId, achievementId, amount, amount, goal, now, goal, now);
}

/** Award (and advance progress toward) achievements for both seated accounts of
 *  a just-finished game. Safe to call for every finished game; anonymous seats
 *  are skipped. Throwing is the caller's problem to swallow: awarding must never
 *  block the game from ending. */
export async function awardAchievementsForFinishedGame(
  db: D1Database,
  game: FinishedGameRecord,
  extras: AchievementExtras = {},
): Promise<void> {
  const seats: Array<{ userId: string; color: "w" | "b" }> = [];
  if (game.whiteUserId) seats.push({ userId: game.whiteUserId, color: "w" });
  if (game.blackUserId) seats.push({ userId: game.blackUserId, color: "b" });
  if (!seats.length) return;

  const mode: "nerf" | "buff" = game.ratingCategory === "buff" ? "buff" : "nerf";
  const draft = game.ruleset === "draft";
  const rated = game.rated && !!game.whiteUserId && !!game.blackUserId && game.winner !== null;
  const plies = game.moves.length;
  const now = game.completedAt || Date.now();

  const statements: D1PreparedStatement[] = [];
  for (const seat of seats) {
    const other: "w" | "b" = seat.color === "w" ? "b" : "w";
    const myNerfId = seat.color === "w" ? game.whiteNerfId : game.blackNerfId;
    const facts: FinishedGameFacts = {
      winner: game.winner,
      color: seat.color,
      reason: game.reason,
      mode,
      draft,
      rated,
      myNerfId,
      myNerfTier: getNerf(myNerfId)?.tier ?? 0,
      plies,
      maxBuffTier: extras.maxBuffTier?.[seat.color] ?? 0,
      myMaterial: extras.material?.[seat.color] ?? 0,
      oppMaterial: extras.material?.[other] ?? 0,
      myRatingBefore:
        seat.color === "w" ? extras.whiteRatingBefore ?? null : extras.blackRatingBefore ?? null,
      oppRatingBefore:
        other === "w" ? extras.whiteRatingBefore ?? null : extras.blackRatingBefore ?? null,
      unlocked: await unlockedIds(db, seat.userId),
    };
    const ctx = buildAchievementContext(facts);
    for (const { id, amount } of evaluateAchievements(ctx)) {
      const goal = ACHIEVEMENTS_BY_ID[id]?.goal ?? 1;
      statements.push(upsert(db, seat.userId, id, amount, goal, now));
    }
  }

  if (statements.length) await db.batch(statements);
}
