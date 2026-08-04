/// <reference types="@cloudflare/workers-types" />

// The tournament engine: pairs rounds, creates real games, collects results,
// and completes the event.
//
// DRIVER CHOICE (documented on purpose): the engine advances LAZILY, on read.
// GET /api/tournaments/[id] calls advanceTournament() before building its
// response, so the tournament moves forward whenever anyone is looking at it
// (the detail page polls while an event is live, so an open tab IS the
// scheduler). This was chosen over a DO alarm because tournaments live
// entirely in D1 (there is no tournaments Durable Object to hang an alarm
// on), the existing phase model is already read-derived (see
// src/lib/tournaments.ts), and the game-server DO's alarm loop is a hot,
// carefully budgeted path that must not grow a D1 tournament scan. The cost:
// a tournament nobody fetches does not advance until the next fetch — which
// is fine, because results only matter when someone looks.
//
// GAME CREATION: each board asks the game-server Durable Object (the same DO
// that hosts queue and friend games) to create a match with both seats
// pre-assigned, via the internal /tournament/create-game endpoint (stub-only:
// the public worker never routes that path to the DO). The DO returns the
// match id plus both seat tokens; tokens are stored on the tournament_games
// row and handed only to their owner by the detail API, so each player can
// claim their seat from the tournament page exactly like a queue "paired"
// frame would have.
//
// SCORING: results are collected lazily from the finished-game archive
// (pgAll: OCI Postgres via Hyperdrive in prod, the D1 games table in dev —
// the same dual-backend read path /api/games uses). Win 1, draw 0.5, bye 1.
// A game that never finishes before the round deadline (players never showed,
// or it was aborted) is voided: no points, and the round can complete. All
// score updates are guarded by a compare-and-swap on the tournament_games row
// (result IS NULL -> result set), so two concurrent fetches cannot double-
// apply a result; the round advance itself is guarded by a CAS on
// tournaments.current_round, so only one reader ever creates a round.

import { pairKey, pairSwissRound, type PairingEntrant } from "../tournamentPairing";
import { tournamentPhase, tournamentEndsAt } from "../tournaments";
import { isModeCategory } from "../speed";
import { categoryRatingSql } from "./ratingSql";
import { pgAll } from "./pg";
import { getGameServerStub } from "./gameServer";

/** The tournament columns the engine needs. */
export type EngineTournamentRow = {
  id: string;
  format: string;
  mode: string;
  rated: number;
  clock_time_sec: number;
  clock_increment_sec: number;
  duration_min: number;
  starts_at: number | null;
  status: string;
  rounds_total: number;
  current_round: number;
  round_started_at: number | null;
};

/** One public pairing row (no tokens). */
export type TournamentRoundGame = {
  round: number;
  board: number;
  game_id: string | null;
  white_user_id: string;
  white_username: string;
  black_user_id: string | null;
  black_username: string | null;
  result: string | null;
  created_at: number;
};

type FullGameRow = TournamentRoundGame & {
  white_token: string | null;
  black_token: string | null;
};

const ENGINE_COLUMNS =
  "id, format, mode, rated, clock_time_sec, clock_increment_sec, duration_min, starts_at, status, rounds_total, current_round, round_started_at";

/**
 * A round must resolve within twice the clock plus an increment allowance
 * (80 moves a side) plus five minutes of show-up slack. Games still pending
 * at the deadline are voided so the tournament cannot stall on a no-show.
 */
function roundCapMs(t: EngineTournamentRow): number {
  return (2 * t.clock_time_sec + 160 * t.clock_increment_sec) * 1000 + 5 * 60_000;
}

/**
 * Advance a tournament as far as the clock allows: collect finished results,
 * void expired games, pair the next round when due, and complete the event.
 * Best-effort by design — callers wrap it in try/catch and still serve the
 * page if the engine hiccups (the next read retries).
 */
export async function advanceTournament(db: D1Database, tournamentId: string): Promise<void> {
  const t = await db
    .prepare(`SELECT ${ENGINE_COLUMNS} FROM tournaments WHERE id = ?`)
    .bind(tournamentId)
    .first<EngineTournamentRow>();
  if (!t || t.status === "finished") return;

  const now = Date.now();
  const phase = tournamentPhase(t.starts_at, t.duration_min, now);
  if (phase === "upcoming") return;

  // 1. Collect results for the current round.
  if (t.current_round > 0) {
    await collectRoundResults(db, t, now);
    const pending = await pendingCount(db, t.id, t.current_round);
    if (pending > 0) return; // round still running
  }

  // 2. Round done (or none started yet). Complete or pair the next one.
  // Every format currently runs this same Swiss engine; format-specific
  // brackets (single-elim) can specialize the pairing call later.
  const roundsDone = t.rounds_total > 0 && t.current_round >= t.rounds_total;
  const endsAt = tournamentEndsAt(t.starts_at, t.duration_min);
  // Do not open a round that cannot plausibly finish: require at least a
  // quarter of the round cap (roughly half a game's clock) left on the event.
  const nextRoundFits =
    !roundsDone && phase === "ongoing" && (endsAt == null || now + roundCapMs(t) / 4 < endsAt);
  if (!nextRoundFits) {
    if (phase === "finished" || roundsDone) {
      await db
        .prepare(`UPDATE tournaments SET status = 'finished', finished_at = ? WHERE id = ? AND status != 'finished'`)
        .bind(now, t.id)
        .run();
    }
    return;
  }

  await startNextRound(db, t, now);
}

async function pendingCount(db: D1Database, tournamentId: string, round: number): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM tournament_games WHERE tournament_id = ? AND round = ? AND result IS NULL`)
    .bind(tournamentId, round)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

async function collectRoundResults(db: D1Database, t: EngineTournamentRow, now: number): Promise<void> {
  const pending = await db
    .prepare(
      `SELECT round, board, game_id, white_user_id, black_user_id
       FROM tournament_games
       WHERE tournament_id = ? AND round = ? AND result IS NULL`,
    )
    .bind(t.id, t.current_round)
    .all<{ round: number; board: number; game_id: string | null; white_user_id: string; black_user_id: string | null }>();
  if (!pending.results.length) return;

  // Finished games land in the archive (PG in prod, D1 games in dev) under
  // the same id the DO created; join by id, never by scanning.
  const withGame = pending.results.filter((g) => g.game_id);
  const finished = new Map<string, string | null>();
  if (withGame.length) {
    const placeholders = withGame.map(() => "?").join(",");
    try {
      const rows = await pgAll<{ id: string; winner: string | null }>(
        `SELECT id, winner FROM games WHERE id IN (${placeholders})`,
        withGame.map((g) => g.game_id),
      );
      for (const row of rows) finished.set(row.id, row.winner);
    } catch (err) {
      console.error("tournament result collection failed", t.id, err);
    }
  }

  const expired = t.round_started_at != null && now > t.round_started_at + roundCapMs(t);
  for (const g of pending.results) {
    const archived = g.game_id ? finished.has(g.game_id) : false;
    if (archived) {
      const winner = finished.get(g.game_id!) ?? null;
      // winner NULL in the archive means aborted: nobody scores.
      const result = winner === "w" || winner === "b" || winner === "draw" ? winner : "void";
      await applyResult(db, t, g.round, g.board, g.white_user_id, g.black_user_id, result, now);
    } else if (expired || g.game_id == null) {
      // Past the deadline (or the game was never created): void the board so
      // the round can complete. No points move.
      await applyResult(db, t, g.round, g.board, g.white_user_id, g.black_user_id, "void", now);
    }
  }
}

/**
 * Stamp one board's result and move the points, exactly once: the UPDATE is
 * a CAS on result IS NULL, and the entry updates only run when this call won
 * it. Win 1, draw 0.5 each, void nothing.
 */
async function applyResult(
  db: D1Database,
  t: EngineTournamentRow,
  round: number,
  board: number,
  whiteUserId: string,
  blackUserId: string | null,
  result: "w" | "b" | "draw" | "void",
  now: number,
): Promise<void> {
  const claim = await db
    .prepare(
      `UPDATE tournament_games SET result = ?, resolved_at = ?
       WHERE tournament_id = ? AND round = ? AND board = ? AND result IS NULL`,
    )
    .bind(result, now, t.id, round, board)
    .run();
  if ((claim.meta.changes ?? 0) === 0) return; // another reader got here first
  if (result === "void" || !blackUserId) return;

  const entry = (userId: string, points: number, won: boolean) =>
    db
      .prepare(
        `UPDATE tournament_entries
         SET score = score + ?, games_played = games_played + 1,
             streak = ${won ? "streak + 1" : "0"}
         WHERE tournament_id = ? AND user_id = ?`,
      )
      .bind(points, t.id, userId);
  const whitePoints = result === "w" ? 1 : result === "draw" ? 0.5 : 0;
  const blackPoints = result === "b" ? 1 : result === "draw" ? 0.5 : 0;
  await db.batch([
    entry(whiteUserId, whitePoints, result === "w"),
    entry(blackUserId, blackPoints, result === "b"),
  ]);
}

async function startNextRound(db: D1Database, t: EngineTournamentRow, now: number): Promise<void> {
  // Entrants ranked by current score then live rating in this event's mode
  // bucket — the same rating rule the standings table shows.
  const ratingCategory = isModeCategory(t.mode) ? t.mode : "nerf";
  const entrants = await db
    .prepare(
      `SELECT te.user_id, te.username, te.score, ${categoryRatingSql("u")} AS rating
       FROM tournament_entries te
       JOIN users u ON u.id = te.user_id
       WHERE te.tournament_id = ?
       LIMIT 500`,
    )
    .bind(ratingCategory, t.id)
    .all<{ user_id: string; username: string; score: number; rating: number }>();
  if (entrants.results.length < 2) return; // nothing to pair; retry on a later read

  // CAS the round counter FIRST so only one concurrent reader builds the
  // round. Losing the race is normal and silent.
  const nextRound = t.current_round + 1;
  const cas = await db
    .prepare(
      `UPDATE tournaments SET current_round = ?, round_started_at = ?, status = 'running'
       WHERE id = ? AND current_round = ?`,
    )
    .bind(nextRound, now, t.id, t.current_round)
    .run();
  if ((cas.meta.changes ?? 0) === 0) return;

  // Rematch and bye history from every earlier round.
  const history = await db
    .prepare(
      `SELECT white_user_id, black_user_id, result FROM tournament_games WHERE tournament_id = ?`,
    )
    .bind(t.id)
    .all<{ white_user_id: string; black_user_id: string | null; result: string | null }>();
  const previousPairs = new Set<string>();
  const previousByes = new Set<string>();
  for (const row of history.results) {
    if (row.black_user_id) previousPairs.add(pairKey(row.white_user_id, row.black_user_id));
    else previousByes.add(row.white_user_id);
  }

  const field: PairingEntrant[] = entrants.results.map((e) => ({
    userId: e.user_id,
    username: e.username,
    score: e.score,
    rating: e.rating,
  }));
  const { boards, bye } = pairSwissRound(field, previousPairs, previousByes);

  const statements: D1PreparedStatement[] = [];
  const stub = getGameServerStub();
  for (let board = 0; board < boards.length; board++) {
    const { white, black } = boards[board];
    let gameId: string | null = null;
    let whiteToken: string | null = null;
    let blackToken: string | null = null;
    if (stub) {
      try {
        const resp = await stub.fetch("https://game-server/tournament/create-game", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            whiteId: white.userId,
            whiteName: white.username,
            blackId: black.userId,
            blackName: black.username,
            timeSec: t.clock_time_sec,
            incrementSec: t.clock_increment_sec,
            mode: ratingCategory,
            rated: t.rated === 1,
          }),
          signal: AbortSignal.timeout(5000),
        });
        if (resp.ok) {
          const data = (await resp.json()) as { id?: string; whiteToken?: string; blackToken?: string };
          if (data.id && data.whiteToken && data.blackToken) {
            gameId = data.id;
            whiteToken = data.whiteToken;
            blackToken = data.blackToken;
          }
        }
      } catch (err) {
        console.error("tournament game creation failed", t.id, nextRound, board, err);
      }
    }
    // A board whose game could not be created is recorded voided (game_id
    // NULL, result 'void') so the round never waits on a game that does not
    // exist; both players simply score nothing and get repaired next round.
    statements.push(
      db
        .prepare(
          `INSERT INTO tournament_games (
             tournament_id, round, board, game_id,
             white_user_id, white_username, black_user_id, black_username,
             white_token, black_token, result, created_at, resolved_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          t.id,
          nextRound,
          board,
          gameId,
          white.userId,
          white.username,
          black.userId,
          black.username,
          whiteToken,
          blackToken,
          gameId ? null : "void",
          now,
          gameId ? null : now,
        ),
    );
  }
  if (bye) {
    // The bye scores its point immediately (single-writer: we hold the round
    // CAS). games_played does not move — a bye is not a game.
    statements.push(
      db
        .prepare(
          `INSERT INTO tournament_games (
             tournament_id, round, board, game_id,
             white_user_id, white_username, black_user_id, black_username,
             white_token, black_token, result, created_at, resolved_at
           ) VALUES (?, ?, ?, NULL, ?, ?, NULL, NULL, NULL, NULL, 'bye', ?, ?)`,
        )
        .bind(t.id, nextRound, boards.length, bye.userId, bye.username, now, now),
      db
        .prepare(`UPDATE tournament_entries SET score = score + 1 WHERE tournament_id = ? AND user_id = ?`)
        .bind(t.id, bye.userId),
    );
  }
  if (statements.length) await db.batch(statements);
}

/** Every pairing row for the detail page, newest round first (no tokens). */
export async function listRoundGames(db: D1Database, tournamentId: string): Promise<TournamentRoundGame[]> {
  const rows = await db
    .prepare(
      `SELECT round, board, game_id, white_user_id, white_username,
              black_user_id, black_username, result, created_at
       FROM tournament_games
       WHERE tournament_id = ?
       ORDER BY round DESC, board ASC
       LIMIT 1000`,
    )
    .bind(tournamentId)
    .all<TournamentRoundGame>();
  return rows.results;
}

export type MyTournamentGame = { gameId: string; color: "w" | "b"; token: string; round: number };

/**
 * The caller's own pending game in the current round, WITH its seat token —
 * the one place a token leaves the database, and only to its owner.
 */
export async function myPendingGame(
  db: D1Database,
  tournamentId: string,
  currentRound: number,
  userId: string,
): Promise<MyTournamentGame | null> {
  if (currentRound <= 0) return null;
  const row = await db
    .prepare(
      `SELECT round, game_id, white_user_id, black_user_id, white_token, black_token
       FROM tournament_games
       WHERE tournament_id = ? AND round = ? AND result IS NULL AND game_id IS NOT NULL
         AND (white_user_id = ? OR black_user_id = ?)`,
    )
    .bind(tournamentId, currentRound, userId, userId)
    .first<Pick<FullGameRow, "round" | "game_id" | "white_user_id" | "black_user_id" | "white_token" | "black_token">>();
  if (!row?.game_id) return null;
  const color: "w" | "b" = row.white_user_id === userId ? "w" : "b";
  const token = color === "w" ? row.white_token : row.black_token;
  if (!token) return null;
  return { gameId: row.game_id, color, token, round: row.round };
}
