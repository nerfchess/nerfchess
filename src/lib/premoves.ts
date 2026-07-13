import { cloneBoard, generateMoves, makeMove } from "@/engine/board";
import { gameInCheck, legalMoves, type NerfGame } from "@/engine/game";
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

// Premove safety net, checked at EXECUTION time: a queued premove that would
// land or leave your own king in check is cancelled instead of played. Moving
// into check is legal in this variant and stays available as a DELIBERATE
// manual move; a premove firing blind must never do it for you. Buff-aware
// (an amazon's queen+knight attacks count), and fail-open: if the simulation
// throws, the premove plays as before rather than dead-locking the queue.
export function premoveSelfChecks(game: NerfGame, move: Move, me: Color): boolean {
  try {
    const after = makeMove(cloneBoard(game.board), move);
    return gameInCheck({ ...game, board: after }, me);
  } catch {
    return false;
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

  // Speculative pawn captures: offer a pawn's forward-diagonal squares as
  // premove targets even when EMPTY, so a player can pre-capture a piece they
  // expect to land there. Enemy-occupied diagonals are already legal in `base`
  // and own-piece diagonals are the recapture case handled above; this fills
  // in the empty squares. Re-validation at execution fires it only if a real
  // capture exists then (a pawn cannot legally move diagonally onto an empty
  // square), so an anticipated capture that never materializes just drops.
  for (let sq = 0; sq < 64; sq++) {
    const pawn = board.pieces[sq];
    if (!pawn || pawn.color !== me || pawn.type !== "p") continue;
    const dir = me === "w" ? 1 : -1;
    const toRank = RANK(sq) + dir;
    if (toRank < 0 || toRank > 7) continue;
    const promoRank = me === "w" ? 7 : 0;
    for (const df of [-1, 1]) {
      const toFile = FILE(sq) + df;
      if (!inBoard(toFile, toRank)) continue;
      const to = SQ(toFile, toRank);
      if (board.pieces[to]) continue; // enemy/own diagonals handled elsewhere
      const mv: Move = { from: sq, to, piece: "p", color: me };
      if (toRank === promoRank) {
        for (const promotion of PROMOTIONS) pushUnique(extras, { ...mv, promotion });
      } else {
        pushUnique(extras, mv);
      }
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

/** The moves `color` could play if it were their turn right now: the engine's
 * full legal-move pipeline (buff-granted movement, freezes, and walls all
 * included) on a turn-flipped shallow clone. Powers the enemy-piece
 * inspection preview — click an opponent's piece, see where it can go.
 * Fail-soft: any engine hiccup returns [] because a preview must never crash
 * the board. */
export function previewMovesFor(game: NerfGame, color: Color): Move[] {
  if (game.result) return [];
  try {
    if (game.board.turn === color) return legalMoves(game);
    return legalMoves({ ...game, board: { ...cloneBoard(game.board), turn: color } });
  } catch {
    return [];
  }
}
