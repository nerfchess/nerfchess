// Shared surface for the expanded nerf library. A nerf handicaps YOUR OWN play
// by filtering your own legal moves (filterMoves), tracking state across turns
// (init + onTurnStart), or adding a loss condition (checkLoss). Every per-tier
// file imports only from here so the set stays consistent and typecheck-clean.
//
// SAFETY: a nerf must never leave you with zero legal moves in a normal opening
// position (that is an instant self-stalemate and a bug). Restriction nerfs
// should always leave some piece able to move from the start. The rule harness
// probes each nerf from the initial position and fails any that soft-lock.

import { attackedBy, findKing, isInCheck, makeMove } from "../../board";
import { GameContext, Nerf, NerfState, Tier } from "../../nerf";
import {
  Color,
  FILE,
  Move,
  PieceType,
  PIECE_VALUE,
  RANK,
  SQ,
  Square,
  inBoard,
} from "../../types";

export {
  attackedBy,
  findKing,
  isInCheck,
  makeMove,
  FILE,
  RANK,
  SQ,
  inBoard,
  PIECE_VALUE,
};
export type { Nerf, NerfState, GameContext, Color, Move, PieceType, Square, Tier };

/** Chebyshev (king-step) distance between two squares. */
export const cheb = (a: Square, b: Square) =>
  Math.max(Math.abs(FILE(a) - FILE(b)), Math.abs(RANK(a) - RANK(b)));

/** Are two squares king-adjacent? */
export const adj = (a: Square, b: Square) =>
  a !== b && Math.abs(FILE(a) - FILE(b)) <= 1 && Math.abs(RANK(a) - RANK(b)) <= 1;

/** Relative rank 1..8 from `color`'s perspective (1 = own back rank). */
export const relRank = (color: Color, sq: Square) =>
  color === "w" ? RANK(sq) + 1 : 8 - RANK(sq);

/** Is a square on the rim (a/h file or 1/8 rank)? */
export const onRim = (sq: Square) =>
  FILE(sq) === 0 || FILE(sq) === 7 || RANK(sq) === 0 || RANK(sq) === 7;

export type NerfMeta = {
  id: string;
  name: string;
  description: string;
  tier: Tier;
  flavor?: string;
  icon?: string;
};

/** Build a fully implemented nerf from metadata + behavior. */
export function nerf(meta: NerfMeta, mech: Partial<Nerf>): Nerf {
  return { ...meta, implemented: true, ...mech };
}

/** Bind a tier so a file declares cards without repeating the number. */
export function tierNerf(tier: Tier) {
  return (meta: Omit<NerfMeta, "tier">, mech: Partial<Nerf>): Nerf =>
    nerf({ ...meta, tier }, mech);
}

// --- Common filterMoves shapes ----------------------------------------------
// These return a Nerf["filterMoves"]. Each keeps the classic nerf contract:
// it restricts your own moves and is only responsible for its own rule.

/** A pure move filter (no state needed). */
export function filter(pred: (m: Move) => boolean): Nerf["filterMoves"] {
  return (moves) => moves.filter(pred);
}

/** Count how many moves of `color` in history match `pred` (for onTurnStart
 * counters). */
export function countHistory(ctx: GameContext, pred: (m: Move) => boolean): number {
  return ctx.board.history.filter((m) => m.color === ctx.me && pred(m)).length;
}
