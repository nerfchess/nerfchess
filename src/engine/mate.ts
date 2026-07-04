// Mate detection under the site's king-capture rules. There is no stalemate
// bookkeeping in the engine (moving into check is a legal-but-losing move),
// so "checkmate" means: the side to move is in check and every pseudo-legal
// reply still leaves the king to be captured on the very next move.

import { generateMoves, isInCheck, makeMove } from "./board";
import { BoardState } from "./types";

export function canCaptureKing(board: BoardState): boolean {
  return generateMoves(board).some((m) => m.captured === "k");
}

export function isMated(board: BoardState): boolean {
  if (!isInCheck(board, board.turn)) return false;
  const replies = generateMoves(board);
  if (replies.length === 0) return true;
  return replies.every((r) => canCaptureKing(makeMove(board, r)));
}
