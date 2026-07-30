import { BoardState, Color, Move } from "./types";
import { RNG } from "./rng";

export type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10; // 1 = trivial, 8 = unhinged, 9 = apex, 10 = mythic (9 and 10 never in the normal draft)

export interface GameContext {
  board: BoardState;
  me: Color; // the side whose nerf this is
  opponentLastMove: Move | null;
  myLastMove: Move | null;
  moveNumber: number; // full move number from my perspective (turns I've made)
  capturedByMe: { p: number; n: number; b: number; r: number; q: number; k: number };
  capturedFromMe: { p: number; n: number; b: number; r: number; q: number; k: number };
}

export type NerfState = Record<string, unknown>;

export interface Nerf {
  id: string;
  name: string;
  description: string;
  flavor?: string;
  tier: Tier;
  icon?: string;
  implemented: boolean;

  init?: (rng: RNG, color: Color) => NerfState;
  onTurnStart?: (state: NerfState, ctx: GameContext, rng: RNG) => NerfState;
  filterMoves?: (moves: Move[], state: NerfState, ctx: GameContext) => Move[];
  checkLoss?: (
    state: NerfState,
    ctx: GameContext
  ) => null | { reason: string };

  // Optional hint surfaced in the UI when the nerf narrows or forces moves
  // this turn. Returned squares (if any) will be highlighted on the board.
  hint?: (
    state: NerfState,
    ctx: GameContext,
    legalMoves: Move[]
  ) => null | { text: string; squares?: number[]; tone?: "info" | "warn" };

  // Hooks for visualization
  visual?: (state: NerfState, ctx: GameContext) => {
    fogged?: boolean;
    /** Flooded squares, as explicit square indices. Deliberately NOT a rank
     * number: the flood rises from the OWNER's back rank, so a rank alone
     * cannot be painted without re-deriving the colour mirroring in the view.
     * That is exactly what went wrong before — Rising Water's rule mirrored by
     * colour while the board painted white's geometry for both sides, washing
     * a black-side flood over rank 1 (and so over a corner rook). The nerf now
     * hands over the same squares its own move filter uses. */
    waterSquares?: number[];
    duckSquare?: number;
    bannedSquares?: number[];
    highlightSquares?: number[];
  };

  // Trackable progress for nerfs tied to a counter (captures, moves, etc.).
  // Returned as 0..1 fraction plus a short label like "2/3 pawns eaten".
  progress?: (state: NerfState, ctx: GameContext) => null | {
    value: number;
    max: number;
    label: string;
  };
}
