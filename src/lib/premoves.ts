import { cloneBoard, generateMoves } from "@/engine/board";
import { legalMoves, type NerfGame } from "@/engine/game";
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
//
// When `game` is provided, buff-granted movement is UNIONED in: a piece whose
// movement a card upgraded (a pawn that now moves like a queen, god-knight
// leaps...) can be premoved with its real moves, not just its base-type ones.
// A union, never a replacement: the plain pseudo-legal set stays, because a
// piece that is frozen or filtered RIGHT NOW may be free by the time the
// premove fires; queued premoves are always re-validated at execution.
export function premoveOptionsFor(
  board: BoardState,
  me: Color,
  nerf: Nerf | null,
  nerfState: NerfState | null,
  ctx: GameContext | null,
  game?: NerfGame | null,
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

  // Buff-aware union: run the REAL move pipeline on a turn-flipped shallow
  // copy of the game so card-granted movement shows up as premovable. The
  // clone is never mutated (legalMoves only reads), and any engine hiccup
  // falls back to the plain set: premoves must never crash the board.
  if (game && !game.result) {
    try {
      const flipped: NerfGame = {
        ...game,
        board: { ...cloneBoard(board), turn: me },
      };
      for (const m of legalMoves(flipped)) pushUnique(extras, m);
    } catch {}
  }

  return [...filtered, ...extras];
}
