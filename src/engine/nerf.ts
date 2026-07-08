import { BoardState, Color, Move } from "./types";
import { RNG } from "./rng";

export type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9; // 1 = trivial, 8 = unhinged, 9 = apex (never in the normal draft)

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
    waterRank?: number; // ranks 1..8 underwater
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
