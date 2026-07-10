/// <reference types="@cloudflare/workers-types" />

// Persistence for finished online games, shared by the game server Durable
// Object (direct env.DB) and any API code. Rating updates are Glicko-2 and
// only apply to rated games where both seats belong to accounts.

import postgres from "postgres";
import { glickoUpdatePair, GlickoRating, isProvisional } from "../glicko";
import { categoryForTimeControl, isModeCategory, SPEED_CATEGORIES, type RatingCategory } from "../speed";
import { awardAchievementsForFinishedGame, type AchievementExtras } from "./achievements";

/** One resolved draft interaction as persisted in the archive. The archive
 *  stores the stream VERBATIM as JSON and never interprets it, so this is the
 *  loose structural shape common to every opcode — deliberately NOT a copy of
 *  the exact discriminated union. That exhaustive union is the engine/DO's
 *  (worker.ts `StoredDraftAction`: pick/bank/reroll/grant/use, plus future
 *  opcodes like diffFlag) and may grow new variants without breaking archival
 *  typing. The archive keeps the FULL stream (including reroll/grant) for a
 *  lossless, deterministically-replayable record — unlike
 *  serializeMatchForEngine, which drops some opcodes for the best-effort path.
 *
 *  `grant` is an owner-only god-panel action NEVER surfaced publicly (see
 *  publicDraftActions in worker.ts). Any future endpoint that exposes a
 *  draft_record MUST filter grant actions the same way. */
export type ArchivedDraftAction = {
  ply: number;
  color: "w" | "b";
  a: string;
  [key: string]: unknown;
};

/** Everything beyond setup + moves needed to deterministically replay a draft
 *  game from the archive alone. Field names/shapes are the StoredMatch originals
 *  so a replayer can feed them straight into the gameFromMatch /
 *  replayToPosition logic. Serialized to JSON for storage (JSONB on Postgres,
 *  a TEXT string on the D1 fallback). See docs/archive-draft-record.md. */
export interface DraftRecord {
  /** "nerf" | "buff"; absent = legacy merged rules (matches StoredMatch.mode). */
  mode?: string;
  draftSeed: number;
  cadence?: number;
  stacked?: boolean;
  /** Wire-visibility only (no board effect); kept so a review UI can render the
   *  game as the players saw it. */
  picksVisible?: boolean;
  /** Moderator pool overrides frozen at match creation (StoredMatch.cardOverrides).
   *  Offers re-roll against these, so pick indexes are meaningless without them.
   *  Absent for arena games (the arena rolls its own pools). */
  cardOverrides?: unknown;
  draftActions: ArchivedDraftAction[];
}

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
  /** Rules variant the game was played under; omitted means classic. */
  ruleset?: string;
  /** Which rating bucket the game counts toward. Mode games (Draft nerf/buff)
   *  pass their mode here; omitted falls back to the speed bucket for the
   *  time control (legacy classic behavior). */
  ratingCategory?: RatingCategory;
  /** Full draft record (draft games only) so the game replays from the archive
   *  alone. Absent for classic games. */
  draftRecord?: DraftRecord;
  /** Engine REPLAY_VERSION the record was written under (provenance for every
   *  game, not just draft ones). Absent pre-dates stamping = version 1. */
  replayVersion?: number;
  startedAt: number;
  completedAt: number;
}

interface UserRatingRow {
  user_id: string;
  rating: number;
  rd: number;
  vol: number;
  games: number;
}

// Every rated bucket is stored in user_ratings, one row per (user, category).
// A user's first contact with a category seeds it lazily here (INSERT OR
// IGNORE, so accounts that already have the row are never reseeded).
//
// Seeding a mode bucket ("nerf"/"buff") starts from the best evidence we have
// of the player's strength: the games-weighted average of their legacy speed
// ratings (sum of rating * games over the speed rows with games played,
// divided by the total games). Accounts with no speed history fall back to
// the legacy shared users.rating, the original seed rule. Speed buckets (only
// reachable for legacy data paths now) keep the plain users.rating seed.
export async function seedCategoryRatings(db: D1Database, userIds: string[], category: RatingCategory) {
  const placeholders = userIds.map(() => "?").join(",");
  if (isModeCategory(category)) {
    const speedPlaceholders = SPEED_CATEGORIES.map(() => "?").join(",");
    await db
      .prepare(
        `INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
         SELECT u.id, ?, COALESCE(s.wavg, u.rating), u.rd, u.vol, COALESCE(s.wavg, u.rating)
         FROM users u
         LEFT JOIN (
           SELECT user_id, SUM(rating * games) * 1.0 / SUM(games) AS wavg
           FROM user_ratings
           WHERE category IN (${speedPlaceholders}) AND games > 0
           GROUP BY user_id
         ) s ON s.user_id = u.id
         WHERE u.id IN (${placeholders})`,
      )
      .bind(category, ...SPEED_CATEGORIES, ...userIds)
      .run();
    return;
  }
  await db
    .prepare(
      `INSERT OR IGNORE INTO user_ratings (user_id, category, rating, rd, vol, peak)
       SELECT id, ?, rating, rd, vol, rating FROM users WHERE id IN (${placeholders})`,
    )
    .bind(category, ...userIds)
    .run();
}

export type CategoryRating = GlickoRating & { games: number };

/** Load (seeding on first use) the given users' ratings for one category. */
export async function loadCategoryRatings(
  db: D1Database,
  userIds: string[],
  category: RatingCategory,
): Promise<Map<string, CategoryRating>> {
  const out = new Map<string, CategoryRating>();
  if (!userIds.length) return out;
  const readInto = async (ids: string[]) => {
    const placeholders = ids.map(() => "?").join(",");
    const rows = await db
      .prepare(
        `SELECT user_id, rating, rd, vol, games FROM user_ratings WHERE category = ? AND user_id IN (${placeholders})`,
      )
      .bind(category, ...ids)
      .all<UserRatingRow>();
    for (const row of rows.results) {
      out.set(row.user_id, { rating: row.rating, rd: row.rd, vol: row.vol, games: row.games });
    }
  };
  await readInto(userIds);
  // Seed only accounts with no bucket row yet (their first contact with this
  // category). This path runs on every join/start-frame refresh, so the
  // common already-seeded case must cost one read — not the unconditional
  // seed INSERT (a D1 write round-trip) it used to fire every call.
  const missing = userIds.filter((id) => !out.has(id));
  if (missing.length) {
    await seedCategoryRatings(db, missing, category);
    await readInto(missing);
  }
  return out;
}

export interface RatingChange {
  userId: string;
  before: number;
  after: number;
  /** True while the post-game RD is still provisional (RD > 110), so UIs can
   *  render the new rating as "1500?". */
  provisional: boolean;
}

export async function recordFinishedGame(
  db: D1Database,
  game: FinishedGameRecord,
  // Hyperdrive connection string for the OCI Postgres that holds the `games`
  // archive. When provided, the finished-game row is written there instead of
  // D1 (the hot rating/counter updates always stay on D1). When absent — e.g. a
  // worker without the Hyperdrive binding, the row falls back into the D1
  // batch so games are still recorded somewhere.
  archiveConnectionString?: string,
  // Extra per-game facts the recorded row can't carry (final-board material and
  // the highest card each side drafted), supplied by the game server so
  // achievement evaluation can see them. Optional: absent means those
  // material/draft achievements simply do not trigger for this game.
  achievementExtras: AchievementExtras = {},
): Promise<{ white: RatingChange | null; black: RatingChange | null }> {
  let whiteChange: RatingChange | null = null;
  let blackChange: RatingChange | null = null;
  let whiteAfter: GlickoRating | null = null;
  let blackAfter: GlickoRating | null = null;
  let whiteBefore: GlickoRating | null = null;
  let blackBefore: GlickoRating | null = null;

  const rated = game.rated && !!game.whiteUserId && !!game.blackUserId && game.winner !== null;
  // Which independent rating bucket this game counts toward. Only that
  // bucket's rating moves; every other bucket is untouched. Every rated game
  // is a queue game and always passes its mode ("nerf"/"buff"), so the speed
  // fallback below is only ever reached by casual (friend/challenge) games,
  // where it just labels the archived row; no speed rating is written.
  const category = game.ratingCategory ?? categoryForTimeControl(game.timeSec, game.incrementSec);

  if (rated) {
    const ratings = await loadCategoryRatings(db, [game.whiteUserId!, game.blackUserId!], category);
    const white = ratings.get(game.whiteUserId!);
    const black = ratings.get(game.blackUserId!);
    if (white && black) {
      whiteBefore = { rating: white.rating, rd: white.rd, vol: white.vol };
      blackBefore = { rating: black.rating, rd: black.rd, vol: black.vol };
      const scoreForWhite = game.winner === "w" ? 1 : game.winner === "b" ? 0 : 0.5;
      const updated = glickoUpdatePair(whiteBefore, blackBefore, scoreForWhite);
      whiteAfter = updated.a;
      blackAfter = updated.b;
      whiteChange = {
        userId: game.whiteUserId!,
        before: whiteBefore.rating,
        after: whiteAfter.rating,
        provisional: isProvisional(whiteAfter),
      };
      blackChange = {
        userId: game.blackUserId!,
        before: blackBefore.rating,
        after: blackAfter.rating,
        provisional: isProvisional(blackAfter),
      };
    }
  }

  const movesText = game.moves.join(" ");
  const ruleset = game.ruleset ?? "classic";
  // The draft record is stored as a JSON string. Postgres infers the target
  // jsonb column and parses it (the same server-side type inference the bigint
  // serializer relies on); D1 keeps it verbatim in a TEXT column.
  const draftRecordJson = game.draftRecord ? JSON.stringify(game.draftRecord) : null;
  const replayVersion = game.replayVersion ?? null;

  // The hot rating/counter updates always run on D1. The archive `games` row
  // goes to Postgres when a connection is supplied; otherwise it falls into
  // this same D1 batch (dev/no-Hyperdrive fallback).
  //
  // IDEMPOTENCY GUARD: the first statement claims this game id in
  // recorded_games (INSERT OR IGNORE) with a nonce unique to THIS call, and
  // every rating/counter update below is conditioned on this call's nonce
  // having won that insert. D1 batches run as a single transaction, so either
  // the claim + deltas all commit together (first call) or the claim is a
  // no-op and every guarded update matches zero rows (any re-run: DO evicted
  // between the DB write and the durable `recorded` flag, arena /arena/end
  // retries after its in-memory dedupe set is lost, replayed end frames).
  // One finished game can therefore apply its Glicko deltas exactly once.
  const nonce = crypto.randomUUID();
  const statements: D1PreparedStatement[] = [
    db
      .prepare(`INSERT OR IGNORE INTO recorded_games (id, nonce, recorded_at) VALUES (?, ?, ?)`)
      .bind(game.id, nonce, Date.now()),
  ];
  // Appended to guarded UPDATEs; true only when this call inserted the claim.
  const guardSql = `AND EXISTS (SELECT 1 FROM recorded_games WHERE id = ? AND nonce = ?)`;

  if (!archiveConnectionString) {
    statements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO games (
            id, white_user_id, black_user_id, white_name, black_name,
            white_nerf_id, black_nerf_id, seed, time_sec, increment_sec,
            moves, winner, reason, rated, category, ruleset,
            white_rating_before, white_rating_after, black_rating_before, black_rating_after,
            started_at, completed_at, draft_record, replay_version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          movesText,
          game.winner,
          game.reason,
          rated ? 1 : 0,
          category,
          ruleset,
          whiteBefore?.rating ?? null,
          whiteAfter?.rating ?? null,
          blackBefore?.rating ?? null,
          blackAfter?.rating ?? null,
          game.startedAt,
          game.completedAt,
          draftRecordJson,
          replayVersion,
        ),
    );
  }

  if (rated && whiteAfter && blackAfter) {
    const winCol = (won: boolean, drew: boolean) =>
      drew ? "draws = draws + 1" : won ? "wins = wins + 1" : "losses = losses + 1";
    const drew = game.winner === "draw";
    // The category bucket is the rating's single source of truth: only this
    // time control's rating moves.
    statements.push(
      db
        .prepare(
          `UPDATE user_ratings SET rating = ?, rd = ?, vol = ?, games = games + 1, peak = MAX(peak, ?),
             ${winCol(game.winner === "w", drew)}
           WHERE user_id = ? AND category = ? ${guardSql}`,
        )
        .bind(whiteAfter.rating, whiteAfter.rd, whiteAfter.vol, whiteAfter.rating, game.whiteUserId, category, game.id, nonce),
      db
        .prepare(
          `UPDATE user_ratings SET rating = ?, rd = ?, vol = ?, games = games + 1, peak = MAX(peak, ?),
             ${winCol(game.winner === "b", drew)}
           WHERE user_id = ? AND category = ? ${guardSql}`,
        )
        .bind(blackAfter.rating, blackAfter.rd, blackAfter.vol, blackAfter.rating, game.blackUserId, category, game.id, nonce),
      // Aggregate account counters (total rated games / results) still live on
      // the users row for profiles and the guest-visibility filter; the shared
      // users.rating column is legacy and no longer written.
      db
        .prepare(`UPDATE users SET games = games + 1, ${winCol(game.winner === "w", drew)} WHERE id = ? ${guardSql}`)
        .bind(game.whiteUserId, game.id, nonce),
      db
        .prepare(`UPDATE users SET games = games + 1, ${winCol(game.winner === "b", drew)} WHERE id = ? ${guardSql}`)
        .bind(game.blackUserId, game.id, nonce),
    );
  }

  const batchResults = await db.batch(statements);
  // Did THIS call win the recorded_games claim? If not, some earlier call
  // already processed this game id: every guarded update above no-opped, and
  // we must not re-report rating movement or re-run achievement progress.
  // (The archive write below stays: it is idempotent on the game id, and a
  // retry whose first attempt archived nothing should still archive.)
  const firstApplication = (batchResults[0]?.meta?.changes ?? 1) > 0;
  if (!firstApplication) {
    whiteChange = null;
    blackChange = null;
  }

  // Evaluate achievements for both seated accounts off the same D1, keyed by
  // user_id (no table scan). Runs for every finished game, rated or not, so
  // casual and Buff games unlock their achievements too — but only on the
  // game's FIRST application (achievement progress counters are not idempotent
  // and would double-advance on a replayed end). Awarding must never block the
  // game from ending, so any failure is logged and swallowed.
  if (firstApplication) {
    try {
      await awardAchievementsForFinishedGame(db, game, {
        ...achievementExtras,
        whiteRatingBefore: whiteBefore?.rating ?? null,
        blackRatingBefore: blackBefore?.rating ?? null,
      });
    } catch (err) {
      console.error("failed to award achievements", game.id, err);
    }
  }

  // Archive the finished game to Postgres (OCI, via Hyperdrive). Idempotent on
  // the primary key so retries and the one-time D1 backfill can't duplicate.
  if (archiveConnectionString) {
    const sql = postgres(archiveConnectionString, { max: 1, fetch_types: false });
    try {
      await sql`
        INSERT INTO games ${sql({
          id: game.id,
          white_user_id: game.whiteUserId,
          black_user_id: game.blackUserId,
          white_name: game.whiteName,
          black_name: game.blackName,
          white_nerf_id: game.whiteNerfId,
          black_nerf_id: game.blackNerfId,
          seed: game.seed,
          time_sec: game.timeSec,
          increment_sec: game.incrementSec,
          moves: movesText,
          winner: game.winner,
          reason: game.reason,
          rated: rated ? 1 : 0,
          category,
          ruleset,
          white_rating_before: whiteBefore?.rating ?? null,
          white_rating_after: whiteAfter?.rating ?? null,
          black_rating_before: blackBefore?.rating ?? null,
          black_rating_after: blackAfter?.rating ?? null,
          started_at: game.startedAt,
          completed_at: game.completedAt,
          draft_record: draftRecordJson,
          replay_version: replayVersion,
        })}
        ON CONFLICT (id) DO NOTHING
      `;
    } finally {
      await sql.end();
    }
  }

  return { white: whiteChange, black: blackChange };
}
