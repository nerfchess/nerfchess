// Shared surface for the "mystic" card set: prophecy and fate, star signs and
// moon phases, tarot, spirits, seances, and ley lines. Every card reuses
// primitives that already live in the engine; this module mirrors
// fantasy/shared.ts (and funny/shared.ts before it) so the whole set stays
// consistent and typecheck-clean. Every mystic file imports ONLY from this
// module.
//
// Like the fantasy and funny sets (and unlike hexes/shared.ts, which fixes
// category to "hex"), the mystic set spans many categories, so the `card`
// factory takes a category per card. Safety rails are inherited from the
// wrapped helpers: kings are never frozen, petrified, or targeted; every
// opponent-move filter keeps a non-empty fallback (via `curse`) so a card can
// never soft-lock the game.

import {
  ActiveEffect,
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
  bindCandidates,
  bindPiece,
  emptySquares,
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
  pawnRankOk,
  permanentAugment,
  pieceBound,
  placePieces,
  relRank,
  relocateMany,
  removeEnemies,
  reviveOne,
  revivable,
  shieldArmy,
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
  bindCandidates,
  bindPiece,
  emptySquares,
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
  pawnRankOk,
  permanentAugment,
  pieceBound,
  placePieces,
  relRank,
  relocateMany,
  removeEnemies,
  reviveOne,
  revivable,
  shieldArmy,
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

/** Metadata for a mystic card. Like a fantasy card, the category is per card. */
export type MysticMeta = {
  /** Advice, not a rule (see Buff.tip). */
  tip?: string;
  id: string;
  name: string;
  description: string;
  tier: Tier;
  category: BuffCategory;
  flavor?: string;
  boon?: boolean;
  fx?: CardFx;
  /** Apex cards are flagged special: never offered by the normal draft roll. */
  special?: boolean;
  /** Per-card lucide-react icon name; overrides the category glyph. */
  icon?: string;
  /** Piece types the caster must own on the board for this card to be offered
   * (dead-draft guard). Omit for cards that work regardless of your pieces. */
  requires?: PieceType[];
};

/** Build a fully implemented card from metadata + mechanics. Mirrors the `def`
 * factory in library.ts (private to that file) and fantasy/shared.ts's `card`. */
export function card(meta: MysticMeta, mech: Mech): Buff {
  return { ...meta, implemented: true, ...mech };
}

// ---------------------------------------------------------------------------
// Common destination zones (local copies; the sibling sets keep theirs).
// ---------------------------------------------------------------------------
export const myHalfZone = (api: BuffApi) => (sq: Square) => inHalf(api.me, sq);
export const anyEmptyZone = (_api: BuffApi) => (_sq: Square) => true;
export const backRankZone = (api: BuffApi) => (sq: Square) =>
  RANK(sq) === (api.me === "w" ? 0 : 7);

// ---------------------------------------------------------------------------
// Opponent-move filter with the non-empty safety guarantee (a copy of the hex,
// funny, and fantasy modules' `curse`, kept local so the mystic set does not
// import from those sibling folders). The filter MUST be partial: it can never
// strand the opponent with 0 moves.
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
// Instant: every enemy piece of the given types becomes a walnut (petrified,
// cannot move) for `turns` of the owner's turns. Kings are never petrified.
// Mirrors fantasy/shared.ts's walnutAll, kept local for self-containment.
// ---------------------------------------------------------------------------
export function walnutAll(types: PieceType[], turns: number): Mech {
  return instant((_inst, api) => {
    for (const sq of mySquares(api.board, api.opp)) {
      const t = api.board.pieces[sq]!.type;
      if (t === "k" || !types.includes(t)) continue;
      addEffect(api, { kind: "walnut", sq, owner: api.opp, turns });
    }
  });
}

// ---------------------------------------------------------------------------
// Targeted petrify (walnut): one enemy piece cannot move for `turns`. Kings are
// never eligible. Mirrors the fantasy module's petrifyTarget.
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
// of the owner's own turns. Copied verbatim from fantasy/shared.ts (which
// copied funny/shared.ts, which models it on voidSquares): activated,
// spendOnUse false, ticks its own timer on onMovePlayed, and removes the
// visitor via an uncounted removePiece so nothing enters the revive pool. Only
// summons non-pawns so there is never a promotion edge to track.
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
            label: "Choose where the summoned spirit appears",
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
      // Follow the spirit; let it pass on if captured or overrun.
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
        : `the spirit departs in ${(inst.state.turns as number) ?? 0} of your turns`,
  };
}

// ---------------------------------------------------------------------------
// Activated: convert `count` enemy pieces of the given types to your color.
// A local copy of fantasy/shared.ts's convertEnemies (itself a copy of
// library.ts's private one). buffNextTarget ends collection gracefully once
// eligible targets run short, so it never soft-locks even when fewer than
// `count` enemies of those types exist. Kings are never eligible (they are
// never listed among the offered types).
// ---------------------------------------------------------------------------
export function convertEnemies(count: number, types: PieceType[], label: string): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length >= count
        ? null
        : {
            kind: "square",
            label: count > 1 ? `${label} (${picks.length + 1}/${count})` : label,
            squares: mySquares(api.board, api.opp).filter((sq) => {
              const p = api.board.pieces[sq]!;
              return types.includes(p.type) && !picks.some((k) => k.square === sq);
            }),
          },
    (_inst, api, picks) => {
      for (const k of picks) if (k.square != null) api.setPieceColor(k.square, api.me);
    },
  );
}
