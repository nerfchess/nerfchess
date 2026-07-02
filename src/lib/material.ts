import { BoardState, Color, PieceType } from "@/engine/types";

const PIECE_ORDER: PieceType[] = ["p", "n", "b", "r", "q", "k"];
const PIECE_VALUES: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const START_COUNTS: Record<PieceType, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };

export function opponentOf(color: Color): Color {
  return color === "w" ? "b" : "w";
}

// Pieces `capturer` has taken, inferred from what's missing from the opponent's
// starting set. Promotion skews this slightly (an extra queen can offset a
// captured one) but it matches what a player expects to see at a glance.
export function capturedPiecesFor(board: BoardState, capturer: Color): PieceType[] {
  const opponent = opponentOf(capturer);
  const remaining: Record<PieceType, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  for (const piece of board.pieces) {
    if (piece?.color === opponent) remaining[piece.type]++;
  }

  const captured: PieceType[] = [];
  for (const type of PIECE_ORDER) {
    const missing = Math.max(0, START_COUNTS[type] - remaining[type]);
    for (let i = 0; i < missing; i++) captured.push(type);
  }
  return captured;
}

export function capturedValue(pieces: PieceType[]): number {
  return pieces.reduce((total, piece) => total + PIECE_VALUES[piece], 0);
}
