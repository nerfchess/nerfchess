import { makeMove } from "./board";
import { buffAugmentedAttacks, gameInCheck, makeContext, NerfGame } from "./game";
import { Move } from "./types";

export type MoveRisk = "check" | "nerf" | null;

// True if making `move` would immediately trip the mover's own nerf's
// checkLoss condition on the resulting position — i.e. the same check the
// real game engine runs right after every move in checkLossConditions().
export function triggersOwnNerfLoss(game: NerfGame, move: Move): boolean {
  const me = game.board.turn;
  const slot = me === "w" ? game.white : game.black;
  if (!slot.nerf.checkLoss) return false;
  const nextBoard = makeMove(game.board, move);
  const ctx = makeContext({ ...game, board: nextBoard }, me);
  return !!slot.nerf.checkLoss(slot.state, ctx);
}

// Classifies a legal move so the UI can warn before it's played: "check" if
// it leaves/moves the mover's own king in check (kings aren't auto-protected
// in this variant — see board.ts), "nerf" if it would trip the mover's own
// drawback loss condition on the resulting position.
export function evaluateMoveRisk(game: NerfGame, move: Move): MoveRisk {
  const me = game.board.turn;
  const nextBoard = makeMove(game.board, move);
  // gameInCheck, not the bare isInCheck: buffs can grant the opponent extra
  // movement (a rook that also steps diagonally, a camel knight, an amazon),
  // and those squares only appear in the attack set when the check test is
  // given game context. The board's own check indicator already uses the
  // buff-aware test, so the bare one here meant a king attacked ONLY through a
  // buff-granted move lit up as in check but drew no warning on the move that
  // hung it.
  if (gameInCheck({ ...game, board: nextBoard }, me)) return "check";
  if (triggersOwnNerfLoss(game, move)) return "nerf";
  return null;
}

export function moveRiskKey(m: Pick<Move, "from" | "to" | "promotion">): string {
  return `${m.from}-${m.to}-${m.promotion ?? ""}`;
}

export function computeMoveRisks(game: NerfGame, moves: Move[]): Map<string, MoveRisk> {
  const out = new Map<string, MoveRisk>();
  for (const m of moves) out.set(moveRiskKey(m), evaluateMoveRisk(game, m));
  return out;
}
