// Extra board-paint zones for the effect overlays, derived from the same
// public BuffMatchState both game surfaces already hold (game.buffs). These
// cover the effect kinds draftZones does not paint: king_safe (royal guard),
// no_pawn_advance (pawn clamp fences, distinguished from king_only's chain
// jail), pending turn skips (stun flourish over the skipped king), and the
// per-card motifs cards declare through CardFx: constraint badges (jail /
// muzzle / anchor / blindfold / slow) on the cursed side's pieces, and
// empowerment marks (empower / ward / rally) on the card owner's own pieces.
// Shared by the bot game page and OnlineMatch so both surfaces behave
// identically.

import type { Buff, BuffCategory, BuffInstance, BuffMatchState, CardFx } from "@/engine/buff";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import type { BoardState, Color, PieceType } from "@/engine/types";

export type MotifKind = CardFx["motif"];

/** One card-fx mark: a running card's motif painted on an affected piece's
 * square. Identity is public in both directions (the card surfaced in the
 * plays ledger when it was cast), so both players see both sides' motifs.
 * `tier` and `category` carry the CARD's rolled tier and suit so the board
 * badge can tint and stamp itself per card: two different muzzle cards read
 * differently at a glance. `turns` is the timed countdown when the card
 * records one (helpers' state.turns convention), null while it simply holds. */
export interface MotifMark {
  sq: number;
  motif: MotifKind;
  /** Card name, for the hover tooltip. */
  name: string;
  /** Rolled tier of the card instance: tints the badge (tier palette). */
  tier: number;
  /** Card category: the micro-glyph stamped beside the motif. */
  category: BuffCategory;
  /** Empower only: the granted movement's piece silhouette. */
  moveAs?: PieceType;
  turns: number | null;
}

export interface FxVisual {
  /** Square of each king protected by an active king_safe ward. */
  kingSafeSquares: number[];
  /** Squares of pawns halted by an active no_pawn_advance hex. */
  pawnClampSquares: number[];
  /** Kings of players with pending skips; `n` is the remaining skip count so
   * each application AND each consumed skip replays the one-shot stun. */
  stunSquares: { sq: number; n: number }[];
  /** Card motifs for BOTH sides' running cards, one mark per square: when
   * several cards hit the same square the strongest motif wins (constraints
   * first: jail > muzzle > anchor > blindfold > slow, then empower > ward >
   * rally). */
  motifs: MotifMark[];
}

const EMPTY: FxVisual = { kingSafeSquares: [], pawnClampSquares: [], stunSquares: [], motifs: [] };

// Strongest motif first when several cards touch the same square: a piece's
// restrictions matter more than its perks.
const MOTIF_RANK: Record<MotifKind, number> = {
  jail: 0,
  muzzle: 1,
  anchor: 2,
  blindfold: 3,
  slow: 4,
  empower: 5,
  ward: 6,
  rally: 7,
};

/** The timed countdown a card records, if any. Timed filters and passives
 * (helpers.timedOppFilter, timedAugment and friends) keep their remaining
 * turns in state.turns; anything else has no counter to read. */
function motifTurns(inst: BuffInstance): number | null {
  return typeof inst.state.turns === "number" ? inst.state.turns : null;
}

/** Piece-bound cards (helpers.pieceBound / bindPiece) follow ONE designated
 * piece via state.sq; their fx paints that square alone, never every piece
 * of the type. */
function boundSquare(inst: BuffInstance): number | null {
  return typeof inst.state.sq === "number" ? inst.state.sq : null;
}

/** True while a held card's fx is actually running. Concrete instance state
 * is authoritative: a recorded countdown (state.turns) or charge pool
 * (state.charges) that reached zero leaves the card in the list but inert.
 * Activated cards run only once cast, evidenced by a bound square, a
 * countdown, or charges (their status line also covers pre-activation
 * prompts like "activate to choose a piece", so it cannot be trusted
 * alone). Passives without any counter fall back to their status line
 * (non-null = live, the same liveness the dock's "against you" rows use)
 * and permanent passives simply run while held. */
function fxRunning(def: Buff, inst: BuffInstance): boolean {
  const turns = motifTurns(inst);
  if (turns != null && turns <= 0) return false;
  const charges = typeof inst.state.charges === "number" ? inst.state.charges : null;
  if (charges != null && charges <= 0) return false;
  if (def.kind === "activated") {
    return boundSquare(inst) != null || turns != null || charges != null;
  }
  if (turns != null || charges != null) return true;
  if (def.status) return def.status(inst) != null;
  return true;
}

export function computeFxVisual(game: { board: BoardState; buffs?: BuffMatchState | null }): FxVisual {
  const bs = game.buffs;
  if (!bs) return EMPTY;
  const out: FxVisual = { kingSafeSquares: [], pawnClampSquares: [], stunSquares: [], motifs: [] };
  const kingSquare = (color: Color): number | null => {
    for (let sq = 0; sq < 64; sq++) {
      const p = game.board.pieces[sq];
      if (p && p.color === color && p.type === "k") return sq;
    }
    return null;
  };
  for (const e of bs.effects) {
    if (e.turns != null && e.turns <= 0) continue;
    if (e.kind === "king_safe") {
      const sq = kingSquare(e.owner);
      if (sq != null && !out.kingSafeSquares.includes(sq)) out.kingSafeSquares.push(sq);
    } else if (e.kind === "no_pawn_advance") {
      for (let sq = 0; sq < 64; sq++) {
        const p = game.board.pieces[sq];
        if (p && p.color === e.against && p.type === "p" && !out.pawnClampSquares.includes(sq)) {
          out.pawnClampSquares.push(sq);
        }
      }
    }
  }
  for (const color of ["w", "b"] as Color[]) {
    const n = bs.skips[color];
    if (n > 0) {
      const sq = kingSquare(color);
      if (sq != null) out.stunSquares.push({ sq, n });
    }
  }
  // Card motifs: each side's active (not spent or nullified) cards whose
  // CardFx names the pieces it touches. Constraint motifs paint on the OTHER
  // side's matching pieces; self fx (empower / ward / rally grants) paint on
  // the OWNER's pieces, and both directions are visible to both players.
  // Cards with no piece scope (draft locks, square-scoped bans) paint
  // nothing here: the barred / zone overlays already cover those squares.
  // Masked placeholder instances have an empty id, so nothing hidden can
  // ever surface. Rally is army-wide and transient, so it plants its banner
  // on the rallied side's king square alone instead of tiling the army.
  const best = new Map<number, MotifMark>();
  const consider = (sq: number, mark: MotifMark) => {
    const cur = best.get(sq);
    if (!cur || MOTIF_RANK[mark.motif] < MOTIF_RANK[cur.motif]) best.set(sq, mark);
  };
  for (const caster of ["w", "b"] as Color[]) {
    for (const inst of bs.players[caster].buffs) {
      if (inst.spent || inst.nullified || !inst.id) continue;
      const def = BUFF_BY_ID[inst.id];
      const fx = def?.fx;
      if (!fx?.pieces) continue;
      if (!fxRunning(def, inst)) continue;
      const target: Color = fx.self ? caster : caster === "w" ? "b" : "w";
      const mark: Omit<MotifMark, "sq"> = {
        motif: fx.motif,
        name: def.name,
        tier: inst.tier,
        category: def.category,
        ...(fx.moveAs ? { moveAs: fx.moveAs } : {}),
        turns: motifTurns(inst),
      };
      if (fx.motif === "rally") {
        const sq = kingSquare(target);
        if (sq != null) consider(sq, { sq, ...mark });
        continue;
      }
      // Piece-bound cards empower/guard ONE designated piece: paint its
      // tracked square alone, not every piece of the type.
      const bound = boundSquare(inst);
      if (bound != null) {
        const p = game.board.pieces[bound];
        if (p && p.color === target) consider(bound, { sq: bound, ...mark });
        continue;
      }
      for (let sq = 0; sq < 64; sq++) {
        const p = game.board.pieces[sq];
        if (!p || p.color !== target) continue;
        if (fx.pieces !== "all" && !fx.pieces.includes(p.type)) continue;
        consider(sq, { sq, ...mark });
      }
    }
  }
  out.motifs = [...best.values()];
  return out;
}
