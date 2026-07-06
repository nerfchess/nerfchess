// Extra board-paint zones for the effect overlays, derived from the same
// public BuffMatchState both game surfaces already hold (game.buffs). These
// cover the effect kinds draftZones does not paint: king_safe (royal guard),
// no_pawn_advance (pawn clamp fences, distinguished from king_only's chain
// jail), and pending turn skips (stun flourish over the skipped king).
// Shared by the bot game page and OnlineMatch so both surfaces behave
// identically.

import type { BuffMatchState } from "@/engine/buff";
import type { BoardState, Color } from "@/engine/types";

export interface FxVisual {
  /** Square of each king protected by an active king_safe ward. */
  kingSafeSquares: number[];
  /** Squares of pawns halted by an active no_pawn_advance hex. */
  pawnClampSquares: number[];
  /** Kings of players with pending skips; `n` is the remaining skip count so
   * each application AND each consumed skip replays the one-shot stun. */
  stunSquares: { sq: number; n: number }[];
}

const EMPTY: FxVisual = { kingSafeSquares: [], pawnClampSquares: [], stunSquares: [] };

export function computeFxVisual(game: { board: BoardState; buffs?: BuffMatchState | null }): FxVisual {
  const bs = game.buffs;
  if (!bs) return EMPTY;
  const out: FxVisual = { kingSafeSquares: [], pawnClampSquares: [], stunSquares: [] };
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
  return out;
}
