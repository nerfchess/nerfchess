import { cloneBoard, generateMoves, initialBoard, makeMove, moveToUCI } from "@/engine/board";
import { BoardState, Move } from "@/engine/types";

/** Replay history moves [fromPly, toPly) onto a board known to be correct at
 * `fromPly`, without mutating it. Used to bridge plies that were never
 * individually witnessed live (several server frames applied in one tick leave
 * gaps in the per-ply snapshot map) from the nearest recorded snapshot.
 *
 * Tolerant by design: draft buffs can mutate the board outside move history
 * (summons, removals, teleports), so a recorded move may reference a piece
 * that doesn't exist on the replayed board. A move that can't be reproduced
 * ends the replay at the last clean position rather than throwing. Inventory
 * drops (from === to, `drop` set) are applied directly — makeMove can't
 * reproduce them because their origin square is empty. */
export function replayBoardSpan(
  base: BoardState,
  moves: Move[],
  fromPly: number,
  toPly: number,
): BoardState {
  let board = base;
  const end = Math.max(fromPly, Math.min(toPly, moves.length));
  for (let i = fromPly; i < end; i++) {
    const m = moves[i];
    if (m.drop) {
      const nb = cloneBoard(board);
      nb.pieces[m.to] = { type: m.drop, color: m.color };
      nb.epTarget = null;
      nb.turn = m.color === "w" ? "b" : "w";
      nb.history.push(m);
      board = nb;
      continue;
    }
    if (!board.pieces[m.from]) return board;
    try {
      board = makeMove(board, m);
    } catch {
      return board;
    }
  }
  return board;
}

export function boardAtPly(moves: Move[], ply: number): BoardState {
  // Callers should gate replay-from-start review on buffs.historyDiverged;
  // replayBoardSpan's tolerance is the backstop if a bad move slips through.
  return replayBoardSpan(initialBoard(), moves, 0, Math.max(0, Math.min(ply, moves.length)));
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
