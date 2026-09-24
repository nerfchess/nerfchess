// How a house bot answers a human's draw offer in worker.ts (docs/polish-pass/
// slices/HB.md R6). Server-only: nothing here is ever put in a frame.
//
// Two rules sit around bots.ts houseDrawDecision:
//   1. The answer is taken on the position when it lands. When the human has
//      moved since the bot's last recorded evaluation (the bot is to move), a
//      short fresh search scores the position, so a human blunder is seen.
//   2. A decline is remembered. Until the position has really changed, a
//      repeat offer is declined without a new roll, the way a person who just
//      said no says no again. Without this each offer was a fresh roll and a
//      player a pawn down could spam offers into a rated draw.

import { pickAIMove, type SearchStats } from "../../engine/ai";
import type { NerfGame } from "../../engine/game";
import type { Color } from "../../engine/types";
import { houseDeadLevel, houseMaterialEvalCp } from "./bots";

/** A remembered decline, kept on the match (server-only). */
export type HouseDrawDecline = {
  /** The bot's own-move count when it declined. */
  own: number;
  /** The evaluation it declined on, centipawns from its side. */
  evalCp: number;
  /** The material balance then, from its side. */
  material: number;
  /** Non-king pieces on the board then. */
  pieces: number;
  /** How many times it has declined this game. */
  count: number;
};

/** Own moves the bot must make after a decline before an unchanged position
 * is thought about again; doubles with every further decline. */
export const HOUSE_DRAW_REROLL_MOVES = 10;
/** A drop in the bot's eval or material (centipawns) that reopens the question. */
export const HOUSE_DRAW_REROLL_DROP_CP = 100;
/** Non-king pieces traded off since the decline that reopen the question. */
export const HOUSE_DRAW_REROLL_TRADES = 4;
/** The fresh search budget when the human has moved since the last eval. */
export const HOUSE_DRAW_EVAL_MS = 150;

const clampCp = (n: number) => Math.max(-5000, Math.min(5000, Math.round(n)));

export function houseNonKingPieces(game: NerfGame): number {
  let n = 0;
  for (let sq = 0; sq < 64; sq++) {
    const pc = game.board.pieces[sq];
    if (pc && pc.type !== "k") n++;
  }
  return n;
}

/**
 * Whether an offer may be rolled again after an earlier decline. Always when
 * there was none, or the ending is now dead level. Otherwise only when the
 * position has changed against the bot or thinned out: its material or a later
 * recorded eval has dropped by HOUSE_DRAW_REROLL_DROP_CP, HOUSE_DRAW_REROLL_TRADES
 * pieces have come off, or it has made HOUSE_DRAW_REROLL_MOVES more moves
 * (doubled per earlier decline). Cheap: no search, so a spammed offer costs
 * nothing.
 */
export function houseDrawRerollAllowed(
  decline: HouseDrawDecline | null | undefined,
  now: { game: NerfGame; color: Color; own: number; lastEvalCp?: number },
): boolean {
  if (!decline) return true;
  if (houseDeadLevel(now.game)) return true;
  const gap = HOUSE_DRAW_REROLL_MOVES * 2 ** Math.max(0, decline.count - 1);
  if (now.own - decline.own >= gap) return true;
  if (houseMaterialEvalCp(now.game, now.color) <= decline.material - HOUSE_DRAW_REROLL_DROP_CP) return true;
  if (now.own > decline.own && now.lastEvalCp != null && now.lastEvalCp <= decline.evalCp - HOUSE_DRAW_REROLL_DROP_CP) {
    return true;
  }
  return decline.pieces - houseNonKingPieces(now.game) >= HOUSE_DRAW_REROLL_TRADES;
}

/**
 * The evaluation, from the bot's side, that a draw answer is taken on. When
 * the bot is to move the human has moved since its last recorded eval, so a
 * short fresh search scores the position now; if it does not finish a ply the
 * last eval (or the material) stands. On the human's turn the last eval was
 * recorded after the bot's own move and is current.
 */
export function houseDrawAnswerEvalCp(
  game: NerfGame,
  color: Color,
  lastEvalCp: number | undefined,
  searchMs = HOUSE_DRAW_EVAL_MS,
): number {
  const fallback = lastEvalCp ?? houseMaterialEvalCp(game, color);
  if (game.board.turn !== color) return clampCp(fallback);
  const stats: SearchStats = { depth: 0, rootMoves: 0 };
  try {
    pickAIMove(game, "medium", searchMs, undefined, stats);
  } catch {
    return clampCp(fallback);
  }
  if (stats.depth > 0 && typeof stats.scoreCp === "number" && Number.isFinite(stats.scoreCp)) {
    return clampCp(stats.scoreCp);
  }
  return clampCp(fallback);
}

/** The memory after a decline on `evalCp`. */
export function houseDrawDeclineRecord(
  prev: HouseDrawDecline | null | undefined,
  now: { game: NerfGame; color: Color; own: number; evalCp: number },
): HouseDrawDecline {
  return {
    own: now.own,
    evalCp: now.evalCp,
    material: houseMaterialEvalCp(now.game, now.color),
    pieces: houseNonKingPieces(now.game),
    count: (prev?.count ?? 0) + 1,
  };
}
