import { generateMoves, initialBoard, makeMove, moveToUCI } from "@/engine/board";
import { BoardState, Move } from "@/engine/types";

export function boardAtPly(moves: Move[], ply: number): BoardState {
  let board = initialBoard();
  const clamped = Math.max(0, Math.min(ply, moves.length));
  for (let i = 0; i < clamped; i++) {
    board = makeMove(board, moves[i]);
  }
  return board;
}

// Rebuilds a position from server UCI strings. Nerf legality doesn't matter
// here: the server already validated every move, and nerf-legal moves are a
// subset of the pseudo-legal move set.
export function replayUci(uciMoves: string[]): { board: BoardState; history: Move[] } {
  let board = initialBoard();
  for (const uci of uciMoves) {
    const move = generateMoves(board).find((candidate) => moveToUCI(candidate) === uci);
    if (!move) break;
    board = makeMove(board, move);
  }
  return { board, history: board.history };
}
