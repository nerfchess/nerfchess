import { cloneBoard, generateMoves } from "@/engine/board";
import type { Nerf, NerfState, GameContext } from "@/engine/nerf";
import { FILE, inBoard, RANK, SQ, type BoardState, type Color, type Move, type PieceType } from "@/engine/types";

const PROMOTIONS: PieceType[] = ["q", "r", "b", "n"];

function moveKey(move: Move): string {
  return `${move.from}:${move.to}:${move.promotion ?? ""}:${move.captured ?? ""}`;
}

function pushUnique(moves: Move[], move: Move) {
  if (!moves.some((existing) => moveKey(existing) === moveKey(move))) {
    moves.push(move);
  }
}

// Pseudo-legal premove options on a turn-flipped board. The active nerf's
// filterMoves is applied to the base move list so nerf-illegal premoves
// are not queueable. Friendly-target moves are added separately so a player can
// premove onto one of their own pieces in anticipation of an opponent capture.
export function premoveOptionsFor(
  board: BoardState,
  me: Color,
  nerf: Nerf | null,
  nerfState: NerfState | null,
  ctx: GameContext | null,
): Move[] {
  const base = generateMoves(board);
  let filtered: Move[] = base;
  if (nerf?.filterMoves && nerfState && ctx) {
    try {
      filtered = nerf.filterMoves(base, nerfState, ctx);
    } catch {
      filtered = base;
    }
  }
  const extras: Move[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = board.pieces[sq];
    if (!p || p.color !== me || p.type === "k") continue;

    const targetFile = FILE(sq);
    const targetRank = RANK(sq);
    const pawnDir = me === "w" ? 1 : -1;
    const pawnFromRank = targetRank - pawnDir;
    const promoRank = me === "w" ? 7 : 0;
    for (const df of [-1, 1]) {
      const pawnFromFile = targetFile + df;
      if (!inBoard(pawnFromFile, pawnFromRank)) continue;
      const from = SQ(pawnFromFile, pawnFromRank);
      const pawn = board.pieces[from];
      if (!pawn || pawn.color !== me || pawn.type !== "p") continue;
      const base: Move = {
        from,
        to: sq,
        piece: "p",
        color: me,
        captured: p.type,
        capturedSquare: sq,
      };
      if (targetRank === promoRank) {
        for (const promotion of PROMOTIONS) {
          pushUnique(extras, { ...base, promotion });
        }
      } else {
        pushUnique(extras, base);
      }
    }

    const tmp = cloneBoard(board);
    tmp.pieces[sq] = null;
    const all = generateMoves(tmp);
    for (const m of all) {
      if (m.to !== sq) continue;
      if (m.piece === "p" && FILE(m.from) === FILE(m.to)) continue;
      pushUnique(extras, { ...m, captured: p.type, capturedSquare: sq });
    }
  }
  return [...filtered, ...extras];
}
