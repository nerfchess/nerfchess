// Shared surface for the "funny" card set: a batch of joke and slapstick cards
// (anvils, snowballs, clones, krakens, curses with personality) that ALL reuse
// primitives that already exist in the engine. Every funny file imports ONLY
// from this module so the whole set stays consistent and typecheck-clean.
//
// Unlike hexes/shared.ts (which fixes category to "hex"), the funny set spans
// many categories: items, summons, transforms, and opponent curses. The `card`
// factory below is the general equivalent of library.ts's private `def`.
//
// Safety rails are inherited from the wrapped helpers: kings are never frozen,
// petrified, or targeted; every opponent-move filter keeps a non-empty
// fallback (via `curse`) so a card can never soft-lock the game.

import {
  ActiveEffect,
  FreezeSkin,
  Buff,
  BuffApi,
  BuffInstance,
  BuffPick,
  BuffTarget,
  BuffCategory,
  CardFx,
} from "../../buff";
import { Tier } from "../../nerf";
import {
  BoardState,
  Color,
  FILE,
  Move,
  PieceType,
  RANK,
  SQ,
  Square,
  inBoard,
} from "../../types";
import {
  ALL_DIRS,
  DIAG_DIRS,
  KNIGHT_LEAPS,
  ORTHO_DIRS,
  activated,
  activatedSimple,
  addEffect,
  augment,
  barLine,
  emptySquares,
  extraMovesNow,
  freezeTarget,
  grantInventory,
  inHalf,
  instant,
  leapMoves,
  lineSweep,
  mySquares,
  pawnRankOk,
  permanentAugment,
  pieceBound,
  placePieces,
  relRank,
  reviveOne,
  skipOpponent,
  slideMoves,
  tickTurns,
  timedAugment,
  timedOppFilter,
  turnsLeft,
  voidSquares,
} from "../helpers";

export type Mech = Partial<Buff> & Pick<Buff, "kind">;

export {
  ALL_DIRS,
  DIAG_DIRS,
  KNIGHT_LEAPS,
  ORTHO_DIRS,
  activated,
  activatedSimple,
  addEffect,
  augment,
  barLine,
  emptySquares,
  extraMovesNow,
  freezeTarget,
  grantInventory,
  inHalf,
  instant,
  leapMoves,
  lineSweep,
  mySquares,
  pawnRankOk,
  permanentAugment,
  pieceBound,
  placePieces,
  relRank,
  reviveOne,
  skipOpponent,
  slideMoves,
  tickTurns,
  timedAugment,
  timedOppFilter,
  turnsLeft,
  voidSquares,
  FILE,
  RANK,
  SQ,
  inBoard,
};
export type {
  ActiveEffect,
  Buff,
  BuffApi,
  BuffInstance,
  BuffPick,
  BuffTarget,
  BuffCategory,
  BoardState,
  CardFx,
  Color,
  Move,
  PieceType,
  Square,
  Tier,
};

/** Metadata for a funny card. Unlike a hex, the category is chosen per card. */
export type FunnyMeta = {
  id: string;
  name: string;
  description: string;
  tier: Tier;
  category: BuffCategory;
  flavor?: string;
  boon?: boolean;
  fx?: CardFx;
};

/** Build a fully implemented card from metadata + mechanics. Mirrors the `def`
 * factory in library.ts (which is private to that file). */
export function card(meta: FunnyMeta, mech: Mech): Buff {
  return { ...meta, implemented: true, ...mech };
}

// ---------------------------------------------------------------------------
// Chebyshev (king-step) distance a move travels, reused by the range curses.
// ---------------------------------------------------------------------------
export const dist = (from: number, to: number) =>
  Math.max(Math.abs(FILE(to) - FILE(from)), Math.abs(RANK(to) - RANK(from)));

// ---------------------------------------------------------------------------
// Opponent-move filter with the non-empty safety guarantee (a copy of the hex
// module's `curse`, kept local so the funny set does not import from hexes/).
// The filter MUST be partial: it can never strand the opponent with 0 moves.
// ---------------------------------------------------------------------------
export function curse(
  turns: number,
  filter: (moves: Move[], api: BuffApi) => Move[],
): Mech {
  return timedOppFilter(turns, (moves, _inst, api) => {
    if (moves.length === 0) return moves;
    const kept = filter(moves, api);
    return kept.length > 0 ? kept : moves;
  });
}

// ---------------------------------------------------------------------------
// Targeted freeze restricted to a set of piece types (Snowball hits a pawn,
// Fly Swatter a knight...). Kings are never eligible. Mirrors freezeTarget.
// ---------------------------------------------------------------------------
export function freezeTargetTyped(
  turns: number,
  types: PieceType[] | undefined,
  label: string,
  skin?: FreezeSkin,
): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length > 0
        ? null
        : {
            kind: "square",
            label,
            squares: mySquares(api.board, api.opp).filter((sq) => {
              const t = api.board.pieces[sq]!.type;
              return t !== "k" && (!types || types.includes(t));
            }),
          },
    (_inst, api, picks) => {
      if (picks[0]?.square != null) {
        addEffect(api, {
          kind: "freeze",
          sq: picks[0].square,
          owner: api.opp,
          turns,
          ...(skin ? { skin } : {}),
        });
      }
    },
  );
}

// ---------------------------------------------------------------------------
// Targeted petrify (walnut): the piece cannot move at all for `turns`. Kings
// are never eligible. Mirrors the hex module's walnutTarget but lives here so
// the funny set is self-contained.
// ---------------------------------------------------------------------------
export function petrifyTarget(
  turns: number,
  label: string,
  types?: PieceType[],
): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length > 0
        ? null
        : {
            kind: "square",
            label,
            squares: mySquares(api.board, api.opp).filter((sq) => {
              const t = api.board.pieces[sq]!.type;
              return t !== "k" && (!types || types.includes(t));
            }),
          },
    (_inst, api, picks) => {
      if (picks[0]?.square != null) {
        addEffect(api, { kind: "walnut", sq: picks[0].square, owner: api.opp, turns });
      }
    },
  );
}

// ---------------------------------------------------------------------------
// A temporary summon: place a fresh piece, then remove it again after `turns`
// of the owner's own turns. Modeled on voidSquares (activated, spendOnUse
// false, ticks its own timer on onMovePlayed, mutates the board on expiry via
// uncounted removePiece so nothing enters the revive pool). Only summons
// non-pawns so there is never a promotion edge to track.
// ---------------------------------------------------------------------------
export function summonTemp(
  type: Exclude<PieceType, "p" | "k">,
  turns: number,
  zone: (api: BuffApi) => (sq: Square) => boolean,
): Mech {
  return {
    kind: "activated",
    spendOnUse: false,
    targets: (inst, api, picks) =>
      picks.length > 0 || inst.state.sq != null
        ? null
        : {
            kind: "square",
            label: "Choose where your rental piece lands",
            squares: emptySquares(api.board, zone(api)),
          },
    effect: (inst, api, picks) => {
      const sq = picks[0]?.square;
      if (sq == null || inst.state.sq != null) return;
      api.place(sq, type, api.me);
      inst.state.sq = sq;
      inst.state.turns = turns;
    },
    onMovePlayed: (inst, move, api) => {
      const sq = inst.state.sq as Square | undefined;
      if (sq == null) return;
      // Follow the rental as it moves; retire it if it is captured or overrun.
      if (move.capturedSquare === sq && move.from !== sq) {
        inst.spent = true;
        inst.state.sq = undefined;
        return;
      }
      if (move.from === sq) {
        inst.state.sq = move.to;
      } else if (move.to === sq && move.from !== sq) {
        inst.spent = true;
        inst.state.sq = undefined;
        return;
      }
      if (move.color !== api.me) return;
      const left = ((inst.state.turns as number) ?? 0) - 1;
      inst.state.turns = left;
      if (left <= 0) {
        const cur = inst.state.sq as Square | undefined;
        if (cur != null && api.board.pieces[cur]) api.removePiece(cur, { uncounted: true });
        inst.spent = true;
        inst.state.sq = undefined;
      }
    },
    status: (inst) =>
      inst.state.sq == null
        ? "activate to summon"
        : `rental leaves in ${(inst.state.turns as number) ?? 0} of your turns`,
  };
}

// --- Common destination zones (local copies; library.ts keeps its own) ------
export const myHalfZone = (api: BuffApi) => (sq: Square) => inHalf(api.me, sq);
export const anyEmptyZone = (_api: BuffApi) => (_sq: Square) => true;
