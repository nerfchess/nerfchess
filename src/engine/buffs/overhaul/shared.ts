// Overhaul card set: shared vocabulary. Mirrors fantasy/shared.ts: a thin
// import barrel over helpers.ts plus the handful of scan utilities the
// overhaul roster needs (attack scans, last-move reads, cosmetic pins), so
// the tier modules stay declarative. No module here imports library.ts
// (cycle hazard); cross-card grants go through buffRegistry.

import type { Buff, BuffApi, BuffPick, CardFx, CosmeticSkin } from "../../buff";
import type { Tier } from "../../nerf";
import { BoardState, Color, FILE, Move, PieceType, RANK, SQ, Square, inBoard } from "../../types";

export {
  ALL_DIRS,
  DIAG_DIRS,
  KNIGHT_LEAPS,
  ORTHO_DIRS,
  activated,
  activatedSimple,
  addEffect,
  addNovel,
  augment,
  barLine,
  bindCandidates,
  bindPiece,
  captureSquare,
  emptySquares,
  explodeAt,
  extraMovesNow,
  freezeAllEnemies,
  freezeTarget,
  grantInventory,
  inHalf,
  instant,
  leapMoves,
  lineSweep,
  markRevived,
  mySquares,
  oppFilter,
  other,
  pawnRankOk,
  permanentAugment,
  phasingSlideMoves,
  pieceBound,
  placePieces,
  relRank,
  relocateMany,
  removeEnemies,
  reviveOne,
  revivable,
  shieldArmy,
  shieldZone,
  skipOpponent,
  slideMoves,
  spendOnVia,
  stealBuffs,
  teleportMoves,
  tickTurns,
  timedAugment,
  timedOppFilter,
  trackBoundPiece,
  turnsLeft,
  voidSquares,
} from "../helpers";
export { buffRegistry } from "../registry";
export { FILE, RANK, SQ, inBoard };
export type { Buff, BuffApi, BuffPick, Color, CosmeticSkin, Move, PieceType, Square, Tier };

import {
  addEffect,
  emptySquares as emptySquaresH,
  inHalf as inHalfH,
  mySquares as mySquaresH,
} from "../helpers";

// --- def factory ---------------------------------------------------------------

export type Mech = Partial<Buff> & Pick<Buff, "kind">;

export type OvMeta = {
  /** Advice, not a rule (see Buff.tip). */
  tip?: string;
  id: string;
  name: string;
  description: string;
  tier: Tier;
  category: Buff["category"];
  icon?: string;
  flavor?: string;
  boon?: boolean;
  fx?: CardFx;
  requires?: PieceType[];
};

export function card(meta: OvMeta, mech: Mech): Buff {
  return { ...meta, implemented: true, ...mech };
}

// --- zones -----------------------------------------------------------------------

export const myHalfZone = (api: BuffApi) => (sq: Square) => inHalfH(api.me, sq);
export const oppHalfZone = (api: BuffApi) => (sq: Square) => inHalfH(api.opp, sq);
export const anyZone = (_api: BuffApi) => (_sq: Square) => true;

/** Forward direction (rank delta as a square offset) for a color. */
export const fwdOf = (c: Color) => (c === "w" ? 8 : -8);

/** Rank index (0-7) of `color`'s Nth rank counted from its own side (0 = back
 * rank, 1 = pawn rank...). */
export function ownRank(color: Color, n: number): number {
  return color === "w" ? n : 7 - n;
}

// --- board scans -------------------------------------------------------------------

/** True when the piece on `from` attacks `target` by its normal movement
 * (pawns by their capture diagonals; sliders blocked by any piece). Pure
 * geometry over the live board; used by info/marker cards. */
export function attacksSquare(board: BoardState, from: Square, target: Square): boolean {
  const p = board.pieces[from];
  if (!p || from === target) return false;
  const df = FILE(target) - FILE(from);
  const dr = RANK(target) - RANK(from);
  const adf = Math.abs(df), adr = Math.abs(dr);
  switch (p.type) {
    case "p": {
      const dir = p.color === "w" ? 1 : -1;
      return dr === dir && adf === 1;
    }
    case "n":
      return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
    case "k":
      return adf <= 1 && adr <= 1;
    case "b":
      if (adf !== adr) return false;
      break;
    case "r":
      if (df !== 0 && dr !== 0) return false;
      break;
    case "q":
      if (adf !== adr && df !== 0 && dr !== 0) return false;
      break;
  }
  // Slider ray: clear path up to (not including) the target.
  const sf = Math.sign(df), sr = Math.sign(dr);
  let f = FILE(from) + sf, r = RANK(from) + sr;
  while (inBoard(f, r) && SQ(f, r) !== target) {
    if (board.pieces[SQ(f, r)]) return false;
    f += sf; r += sr;
  }
  return true;
}

/** Squares of `color` pieces that attack `target`. */
export function attackersOf(board: BoardState, color: Color, target: Square): Square[] {
  return mySquaresH(board, color).filter((sq) => attacksSquare(board, sq, target));
}

/** Squares of `color` pieces no OTHER piece of the same color defends. */
export function undefendedPieces(board: BoardState, color: Color): Square[] {
  const own = mySquaresH(board, color);
  return own.filter((sq) => !own.some((d) => d !== sq && attacksSquare(board, d, sq)));
}

/** The last move `color` played (board.history read; null when none). */
export function lastMoveBy(board: BoardState, color: Color): Move | null {
  for (let i = board.history.length - 1; i >= 0; i--) {
    if (board.history[i].color === color) return board.history[i];
  }
  return null;
}

/** The square of `color`'s king (null in degenerate boards). */
export function kingSquare(board: BoardState, color: Color): Square | null {
  for (const sq of mySquaresH(board, color, "k")) return sq;
  return null;
}

// --- effect shorthands ----------------------------------------------------------------

/** Pin a pure-visual cosmetic dressing to a piece. */
export function pinCosmetic(
  api: BuffApi,
  sq: Square,
  owner: Color,
  skin: CosmeticSkin,
  turns: number | null = null,
  label?: string,
) {
  addEffect(api, { kind: "cosmetic", sq, owner, turns, skin, ...(label ? { label } : {}) });
}

/** Flash a marker on squares until the opponent replies (the strike visual). */
export function flashSquares(api: BuffApi, squares: Square[], comedic = false) {
  if (squares.length === 0) return;
  addEffect(api, { kind: comedic ? "bonk" : "strike", squares, owner: api.me, turns: 1 });
}

/** Stun (freeze with the stun skin) one enemy non-king piece for `turns`. */
export function stunEnemy(api: BuffApi, sq: Square, turns: number) {
  const p = api.board.pieces[sq];
  if (!p || p.color !== api.opp || p.type === "k") return;
  addEffect(api, { kind: "freeze", sq, owner: api.opp, turns, skin: "stun" });
}

/** Advance one of my pawns a single square if the square ahead is empty and
 * legal for a pawn to stand on. Returns true when it moved. */
export function advancePawn(api: BuffApi, sq: Square): boolean {
  const p = api.board.pieces[sq];
  if (!p || p.color !== api.me || p.type !== "p") return false;
  const to = sq + fwdOf(api.me);
  if (to < 0 || to > 63 || api.board.pieces[to]) return false;
  const r = RANK(to);
  if (r === 0 || r === 7) return false;
  api.relocate(sq, to);
  return true;
}

/** My pawns that could advance one square right now. */
export function advanceablePawns(api: BuffApi): Square[] {
  return mySquaresH(api.board, api.me, "p").filter((sq) => {
    const to = sq + fwdOf(api.me);
    return to >= 0 && to <= 63 && !api.board.pieces[to] && RANK(to) !== 0 && RANK(to) !== 7;
  });
}

/** Empty squares on my Nth-from-back rank (default: the pawn rank). */
export function emptyHomeRank(api: BuffApi, n = 1): Square[] {
  const r = ownRank(api.me, n);
  return emptySquaresH(api.board, (sq) => RANK(sq) === r);
}
