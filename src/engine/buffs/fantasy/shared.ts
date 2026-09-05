// Shared surface for the "fantasy" card set: an epic, high-fantasy batch of
// cards (dragons and beasts, gods and the divine, necromancy and undeath,
// elements and cataclysm, mythic artifacts, curses and dark magic, summoning,
// legendary transformations) that ALL reuse primitives already living in the
// engine. Every fantasy file imports ONLY from this module so the whole set
// stays consistent and typecheck-clean.
//
// Like funny/shared.ts (and unlike hexes/shared.ts, which fixes category to
// "hex"), the fantasy set spans many categories, so the `card` factory takes a
// category per card. Safety rails are inherited from the wrapped helpers:
// kings are never frozen, petrified, or targeted; every opponent-move filter
// keeps a non-empty fallback (via `curse`) so a card can never soft-lock the
// game.

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
  mySquares,
  pawnRankOk,
  permanentAugment,
  pieceBound,
  placePieces,
  relRank,
  relocateMany,
  removeEnemies,
  reviveOne,
  shieldArmy,
  shieldZone,
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
  mySquares,
  pawnRankOk,
  permanentAugment,
  pieceBound,
  placePieces,
  relRank,
  relocateMany,
  removeEnemies,
  reviveOne,
  shieldArmy,
  shieldZone,
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

/** Metadata for a fantasy card. Like a funny card, the category is per card. */
export type FantasyMeta = {
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
  /** Per-card lucide-react icon name; overrides the category glyph. */
  icon?: string;
  /** Piece types the caster must own on the board for this card to be offered
   * (dead-draft guard). Omit for cards that work regardless of your pieces. */
  requires?: PieceType[];
};

/** Build a fully implemented card from metadata + mechanics. Mirrors the `def`
 * factory in library.ts (private to that file) and funny/shared.ts's `card`. */
export function card(meta: FantasyMeta, mech: Mech): Buff {
  return { ...meta, implemented: true, ...mech };
}

// ---------------------------------------------------------------------------
// Common destination zones (local copies; library.ts and funny/ keep theirs).
// ---------------------------------------------------------------------------
export const myHalfZone = (api: BuffApi) => (sq: Square) => inHalf(api.me, sq);
export const anyEmptyZone = (_api: BuffApi) => (_sq: Square) => true;
export const backRankZone = (api: BuffApi) => (sq: Square) =>
  RANK(sq) === (api.me === "w" ? 0 : 7);

// ---------------------------------------------------------------------------
// Opponent-move filter with the non-empty safety guarantee (a copy of the hex
// and funny modules' `curse`, kept local so the fantasy set does not import
// from those sibling folders). The filter MUST be partial: it can never strand
// the opponent with 0 moves.
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
// Mirrors hexes/shared.ts's walnutAll, kept local for self-containment.
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
// never eligible. Mirrors the funny module's petrifyTarget.
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
// of the owner's own turns. Copied verbatim from funny/shared.ts (which models
// it on voidSquares): activated, spendOnUse false, ticks its own timer on
// onMovePlayed, and removes the rental via an uncounted removePiece so nothing
// enters the revive pool. Only summons non-pawns so there is never a promotion
// edge to track.
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
            label: "Choose where your conjured piece appears",
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
      // Follow the conjured piece; retire it if captured or overrun.
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
        : `conjured piece fades in ${(inst.state.turns as number) ?? 0} of your turns`,
  };
}

// ---------------------------------------------------------------------------
// Activated: convert `count` enemy pieces of the given types to your color.
// A local copy of library.ts's private convertEnemies. buffNextTarget ends
// collection gracefully once eligible targets run short, so it never soft-locks
// even when fewer than `count` enemies of those types exist. Kings are never
// eligible (they are never listed among the offered types).
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

// ---------------------------------------------------------------------------
// Activated: transmute `count` of your own pieces of `fromTypes` into `to`
// (never a king). Uses setPieceType, exactly like library.ts's promotePawns,
// and terminates gracefully on sparse boards through buffNextTarget.
// ---------------------------------------------------------------------------
export function transformOwn(
  count: number,
  fromTypes: PieceType[],
  to: Exclude<PieceType, "k">,
  label: string,
): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length >= count
        ? null
        : {
            kind: "square",
            label: count > 1 ? `${label} (${picks.length + 1}/${count})` : label,
            squares: mySquares(api.board, api.me).filter((sq) => {
              const t = api.board.pieces[sq]!.type;
              return fromTypes.includes(t) && !picks.some((k) => k.square === sq);
            }),
          },
    (_inst, api, picks) => {
      for (const k of picks) if (k.square != null) api.setPieceType(k.square, to);
    },
  );
}

// ---------------------------------------------------------------------------
// Activated: pick one of your non-king pieces, then any empty square, and set
// it down there. A generalized relocate (recall is back-rank only). Two steps,
// so it always terminates; pawn destinations respect the never-on-rank-1/8
// rule. Board mutation only, no move-legality filter, so it cannot soft-lock.
// ---------------------------------------------------------------------------
export function relocateAnywhere(pieceLabel: string, destLabel: string): Mech {
  const dests = (api: BuffApi, from: Square): Square[] =>
    emptySquares(api.board).filter(
      (sq) => api.board.pieces[from]?.type !== "p" || pawnRankOk(sq),
    );
  return activated(
    (_inst, api, picks) => {
      if (picks.length === 0) {
        return {
          kind: "square",
          label: pieceLabel,
          squares: mySquares(api.board, api.me).filter(
            (sq) => api.board.pieces[sq]!.type !== "k" && dests(api, sq).length > 0,
          ),
        };
      }
      if (picks.length === 1 && picks[0].square != null) {
        return { kind: "square", label: destLabel, squares: dests(api, picks[0].square) };
      }
      return null;
    },
    (_inst, api, picks) => {
      const from = picks[0]?.square, to = picks[1]?.square;
      if (from != null && to != null && api.board.pieces[from] && !api.board.pieces[to]) {
        api.relocate(from, to);
      }
    },
  );
}

// ---------------------------------------------------------------------------
// Activated: pick an empty square; the 8 squares around it become impassable to
// the opponent for `turns` of their turns. The kraken/tentacle motif, modeled
// exactly on funny/chaos.ts's Kraken (a partial barred zone that can never
// seal the whole board, so it never soft-locks a turn).
// ---------------------------------------------------------------------------
export function barNeighbors(turns: number, label: string): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length > 0
        ? null
        : { kind: "square", label, squares: emptySquares(api.board) },
    (_inst, api, picks) => {
      const c = picks[0]?.square;
      if (c == null) return;
      const squares: Square[] = [];
      for (const [df, dr] of ALL_DIRS) {
        const f = FILE(c) + df, r = RANK(c) + dr;
        if (inBoard(f, r)) squares.push(SQ(f, r));
      }
      if (squares.length) {
        addEffect(api, { kind: "barred", squares, against: api.opp, turns });
      }
    },
  );
}
