// Shared surface for the expanded hex library. Every per-tier hex file imports
// ONLY from this module so the whole set stays consistent and typecheck-clean.
//
// A hex is a buff with category "hex": a curse cast on the OPPONENT, drafted in
// nerf mode's pool. Safety rails (enforced by every helper here): kings are
// never frozen or walnutted, and every opponent-move filter keeps a fallback so
// a hex can never soft-lock the game.

import { isInCheck } from "../../board";
import {
  Buff,
  BuffApi,
  BuffInstance,
  BuffPick,
  BuffTarget,
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
  activated,
  activatedSimple,
  addEffect,
  emptySquares,
  freezeAllEnemies,
  freezeTarget,
  instant,
  mySquares,
  oppFilter,
  other,
  pawnRankOk,
  relRank,
  skipOpponent,
  stealBuffs,
  tickTurns,
  timedOppFilter,
  turnsLeft,
} from "../helpers";

/** Mechanical part of a Buff (helpers.ts keeps this type private, so we
 * redeclare it here for the hex modules). */
export type Mech = Partial<Buff> & Pick<Buff, "kind">;

export {
  activated,
  activatedSimple,
  addEffect,
  emptySquares,
  freezeAllEnemies,
  freezeTarget,
  instant,
  isInCheck,
  mySquares,
  oppFilter,
  other,
  pawnRankOk,
  relRank,
  skipOpponent,
  stealBuffs,
  tickTurns,
  timedOppFilter,
  turnsLeft,
  FILE,
  RANK,
  SQ,
  inBoard,
};
export type {
  Buff,
  BuffApi,
  BuffInstance,
  BuffPick,
  BuffTarget,
  BoardState,
  CardFx,
  Color,
  Move,
  PieceType,
  Square,
  Tier,
};

/** Metadata for a hex card. Category is always "hex". */
export type HexMeta = {
  id: string;
  name: string;
  description: string;
  tier: Tier;
  /** Per-card lucide-react icon name; overrides the category glyph. */
  icon?: string;
  flavor?: string;
  /** Board motif drawn on the cursed pieces while the constraint runs.
   * Display metadata only; never consulted by move generation. */
  fx?: CardFx;
};

/** Build a fully implemented hex from metadata + mechanics. Mirrors the `def`
 * factory in library.ts but fixes category to "hex". */
export function hex(meta: HexMeta, mech: Mech): Buff {
  return { ...meta, category: "hex", implemented: true, ...mech };
}

/** Bind a tier so a tier file can declare cards without repeating the number
 * (and without risk of setting the wrong tier). Usage:
 *   const H = tierHexes(3);
 *   export const HEXES_T3 = [ H({ id, name, description }, curse(...)) ]; */
export function tierHexes(tier: Tier) {
  return (meta: Omit<HexMeta, "tier">, mech: Mech): Buff =>
    hex({ ...meta, tier }, mech);
}

// ---------------------------------------------------------------------------
// Hex-specific mechanic builders. These wrap the generic helpers into the
// shapes hexes use most, so a tier file reads as a list of one-line cards.
// ---------------------------------------------------------------------------

/** Instant: every enemy piece of the given types becomes a walnut (inert, can
 * never move) for `turns` of its owner's turns. Kings are never walnutted. */
export function walnutAll(types: PieceType[], turns: number): Mech {
  return instant((_inst, api) => {
    for (const sq of mySquares(api.board, api.opp)) {
      const t = api.board.pieces[sq]!.type;
      if (t === "k" || !types.includes(t)) continue;
      addEffect(api, { kind: "walnut", sq, owner: api.opp, turns });
    }
  });
}

/** Activated: turn one targeted enemy piece of an allowed type into a walnut. */
export function walnutTarget(turns: number, types?: PieceType[]): Mech {
  return activated(
    (_inst, api, picks) =>
      picks.length > 0
        ? null
        : {
            kind: "square",
            label: "Choose an enemy piece to petrify",
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

/** Passive: restrict which of the opponent's pieces/moves are legal FOREVER.
 * Use for standing curses; higher tier than the timed variants. The filter
 * MUST return a non-empty list whenever the input is non-empty (fall back to
 * the original moves) so it can never soft-lock. */
export function permaOppFilter(
  filter: (moves: Move[], api: BuffApi) => Move[],
): Mech {
  return oppFilter((moves, _inst, api) => {
    if (moves.length === 0) return moves;
    const kept = filter(moves, api);
    return kept.length > 0 ? kept : moves;
  });
}

/** Timed opponent-move filter with the same non-empty safety guarantee, active
 * for the owner's next `turns` turns. */
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

/** Instant: opponent's next `n` drafts are skipped outright. */
export function blockDrafts(n: number): Mech {
  return instant((_inst, api) => {
    api.theirs.flags.blockedDrafts = (api.theirs.flags.blockedDrafts ?? 0) + n;
  });
}

/** Instant: opponent's next `n` drafted buffs arrive nullified (inert). */
export function nullifyDrafts(n: number): Mech {
  return instant((_inst, api) => {
    api.theirs.flags.nullifyIncoming = (api.theirs.flags.nullifyIncoming ?? 0) + n;
  });
}

/** Instant: opponent's next `n` offers exclude draft-manipulation cards. */
export function suppressDraftCards(n: number): Mech {
  return instant((_inst, api) => {
    api.theirs.flags.noDraftCards = (api.theirs.flags.noDraftCards ?? 0) + n;
  });
}

/** Convenience predicates for move filters. */
export const isPiece = (m: Move, t: PieceType) => m.piece === t;
export const isCapture = (m: Move) => !!m.captured;
