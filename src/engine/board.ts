import {
  BoardState,
  Color,
  FILE,
  Move,
  Piece,
  PieceType,
  RANK,
  SQ,
  Square,
  inBoard,
} from "./types";

export function initialBoard(): BoardState {
  const pieces: (Piece | null)[] = Array(64).fill(null);
  const back: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let f = 0; f < 8; f++) {
    pieces[SQ(f, 0)] = { type: back[f], color: "w" };
    pieces[SQ(f, 1)] = { type: "p", color: "w" };
    pieces[SQ(f, 6)] = { type: "p", color: "b" };
    pieces[SQ(f, 7)] = { type: back[f], color: "b" };
  }
  return {
    pieces,
    turn: "w",
    castling: { wk: true, wq: true, bk: true, bq: true },
    epTarget: null,
    halfmove: 0,
    fullmove: 1,
    history: [],
  };
}

export function cloneBoard(b: BoardState): BoardState {
  return {
    pieces: b.pieces.slice(),
    turn: b.turn,
    castling: { ...b.castling },
    epTarget: b.epTarget,
    halfmove: b.halfmove,
    fullmove: b.fullmove,
    history: b.history.slice(),
  };
}

const KNIGHT_OFFSETS = [
  [1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1],
];
const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const KING_DIRS = [...BISHOP_DIRS, ...ROOK_DIRS];

// Squares attacked by `color`; used for detecting check and rule-specific constraints.
export function attackedBy(board: BoardState, color: Color): Set<Square> {
  const attacked = new Set<Square>();
  for (let sq = 0; sq < 64; sq++) {
    const p = board.pieces[sq];
    if (!p || p.color !== color) continue;
    const f = FILE(sq), r = RANK(sq);
    switch (p.type) {
      case "p": {
        const dir = color === "w" ? 1 : -1;
        for (const df of [-1, 1]) {
          const nf = f + df, nr = r + dir;
          if (inBoard(nf, nr)) attacked.add(SQ(nf, nr));
        }
        break;
      }
      case "n":
        for (const [df, dr] of KNIGHT_OFFSETS) {
          const nf = f + df, nr = r + dr;
          if (inBoard(nf, nr)) attacked.add(SQ(nf, nr));
        }
        break;
      case "k":
        for (const [df, dr] of KING_DIRS) {
          const nf = f + df, nr = r + dr;
          if (inBoard(nf, nr)) attacked.add(SQ(nf, nr));
        }
        break;
      default: {
        const dirs =
          p.type === "b" ? BISHOP_DIRS :
          p.type === "r" ? ROOK_DIRS :
          [...BISHOP_DIRS, ...ROOK_DIRS];
        for (const [df, dr] of dirs) {
          let nf = f + df, nr = r + dr;
          while (inBoard(nf, nr)) {
            const tsq = SQ(nf, nr);
            attacked.add(tsq);
            if (board.pieces[tsq]) break;
            nf += df; nr += dr;
          }
        }
      }
    }
  }
  return attacked;
}

export function findKing(board: BoardState, color: Color): Square | null {
  for (let sq = 0; sq < 64; sq++) {
    const p = board.pieces[sq];
    if (p && p.type === "k" && p.color === color) return sq;
  }
  return null;
}

export function isInCheck(board: BoardState, color: Color): boolean {
  const ks = findKing(board, color);
  if (ks == null) return false;
  return attackedBy(board, color === "w" ? "b" : "w").has(ks);
}

/**
 * Generate all pseudo-legal moves for the side to move.
 * In Nerf Chess, kings CAN move into check, castle through check, etc.
 */
export function generateMoves(board: BoardState): Move[] {
  const moves: Move[] = [];
  const me = board.turn;
  const opp: Color = me === "w" ? "b" : "w";

  for (let sq = 0; sq < 64; sq++) {
    const p = board.pieces[sq];
    if (!p || p.color !== me) continue;
    const f = FILE(sq), r = RANK(sq);

    const add = (to: Square, extra: Partial<Move> = {}) => {
      const target = board.pieces[to];
      const move: Move = {
        from: sq,
        to,
        piece: p.type,
        color: me,
        ...(target ? { captured: target.type, capturedSquare: to } : {}),
        ...extra,
      };
      moves.push(move);
    };

    switch (p.type) {
      case "p": {
        const dir = me === "w" ? 1 : -1;
        const startRank = me === "w" ? 1 : 6;
        const promoRank = me === "w" ? 7 : 0;
        const oneR = r + dir;
        if (inBoard(f, oneR)) {
          const oneSq = SQ(f, oneR);
          if (!board.pieces[oneSq]) {
            if (oneR === promoRank) {
              for (const promo of ["q", "r", "b", "n"] as PieceType[]) {
                add(oneSq, { promotion: promo });
              }
            } else {
              add(oneSq);
              // two squares
              if (r === startRank) {
                const twoR = r + 2 * dir;
                const twoSq = SQ(f, twoR);
                if (!board.pieces[twoSq]) {
                  add(twoSq, { isDoublePawn: true });
                }
              }
            }
          }
        }
        // captures
        for (const df of [-1, 1]) {
          const nf = f + df, nr = r + dir;
          if (!inBoard(nf, nr)) continue;
          const tsq = SQ(nf, nr);
          const tp = board.pieces[tsq];
          if (tp && tp.color === opp) {
            if (nr === promoRank) {
              for (const promo of ["q", "r", "b", "n"] as PieceType[]) {
                add(tsq, { promotion: promo });
              }
            } else {
              add(tsq);
            }
          } else if (board.epTarget === tsq) {
            const capSq = SQ(nf, r);
            moves.push({
              from: sq,
              to: tsq,
              piece: "p",
              color: me,
              captured: "p",
              capturedSquare: capSq,
              isEnPassant: true,
            });
          }
        }
        break;
      }
      case "n":
        for (const [df, dr] of KNIGHT_OFFSETS) {
          const nf = f + df, nr = r + dr;
          if (!inBoard(nf, nr)) continue;
          const tsq = SQ(nf, nr);
          const tp = board.pieces[tsq];
          if (!tp || tp.color === opp) add(tsq);
        }
        break;
      case "k": {
        for (const [df, dr] of KING_DIRS) {
          const nf = f + df, nr = r + dr;
          if (!inBoard(nf, nr)) continue;
          const tsq = SQ(nf, nr);
          const tp = board.pieces[tsq];
          if (!tp || tp.color === opp) add(tsq);
        }
        // castling; in nerf chess, can castle through/into/out of check
        const homeR = me === "w" ? 0 : 7;
        if (r === homeR && f === 4) {
          const ck = me === "w" ? board.castling.wk : board.castling.bk;
          const cq = me === "w" ? board.castling.wq : board.castling.bq;
          if (ck && !board.pieces[SQ(5, homeR)] && !board.pieces[SQ(6, homeR)]) {
            const rookSq = SQ(7, homeR);
            const rook = board.pieces[rookSq];
            if (rook && rook.type === "r" && rook.color === me) {
              add(SQ(6, homeR), { castle: "k" });
            }
          }
          if (
            cq &&
            !board.pieces[SQ(1, homeR)] &&
            !board.pieces[SQ(2, homeR)] &&
            !board.pieces[SQ(3, homeR)]
          ) {
            const rookSq = SQ(0, homeR);
            const rook = board.pieces[rookSq];
            if (rook && rook.type === "r" && rook.color === me) {
              add(SQ(2, homeR), { castle: "q" });
            }
          }
        }
        break;
      }
      default: {
        const dirs =
          p.type === "b" ? BISHOP_DIRS :
          p.type === "r" ? ROOK_DIRS :
          [...BISHOP_DIRS, ...ROOK_DIRS];
        for (const [df, dr] of dirs) {
          let nf = f + df, nr = r + dr;
          while (inBoard(nf, nr)) {
            const tsq = SQ(nf, nr);
            const tp = board.pieces[tsq];
            if (!tp) {
              add(tsq);
            } else {
              if (tp.color === opp) add(tsq);
              break;
            }
            nf += df; nr += dr;
          }
        }
      }
    }
  }
  return moves;
}

export function makeMove(board: BoardState, move: Move): BoardState {
  const nb = cloneBoard(board);
  const piece = nb.pieces[move.from];

  // Safety guard: a move whose origin square is empty is treated as a no-op
  // instead of crashing. This happens when history is replayed over a board
  // that buffs have mutated outside history (summons/removals), e.g. by a
  // nerf inspecting a past position in a draft game.
  if (!piece) return board;

  // Safety guard: never allow "self-capture" (should be impossible for legal moves,
  // but can happen due to UI/premove timing bugs). If it does, treat it as a no-op.
  const capSq = move.capturedSquare != null ? move.capturedSquare : (move.captured ? move.to : null);
  if (capSq != null) {
    const capPiece = nb.pieces[capSq];
    if (capPiece && capPiece.color === piece.color) {
      return board;
    }
  }
  if (move.capturedSquare == null && nb.pieces[move.to] && nb.pieces[move.to]!.color === piece.color) {
    return board;
  }

  // Remove any captured piece first (handles en passant / king en passant)
  if (move.capturedSquare != null) {
    nb.pieces[move.capturedSquare] = null;
  } else if (nb.pieces[move.to]) {
    nb.pieces[move.to] = null;
  }
  nb.pieces[move.from] = null;
  nb.pieces[move.to] = move.promotion
    ? { type: move.promotion, color: piece.color }
    : piece;

  // Castling: move the rook
  if (move.castle) {
    const homeR = piece.color === "w" ? 0 : 7;
    if (move.castle === "k") {
      nb.pieces[SQ(5, homeR)] = nb.pieces[SQ(7, homeR)];
      nb.pieces[SQ(7, homeR)] = null;
    } else {
      nb.pieces[SQ(3, homeR)] = nb.pieces[SQ(0, homeR)];
      nb.pieces[SQ(0, homeR)] = null;
    }
  }

  // Update castling rights
  if (piece.type === "k") {
    if (piece.color === "w") { nb.castling.wk = false; nb.castling.wq = false; }
    else { nb.castling.bk = false; nb.castling.bq = false; }
  }
  if (piece.type === "r") {
    if (move.from === SQ(0, 0)) nb.castling.wq = false;
    if (move.from === SQ(7, 0)) nb.castling.wk = false;
    if (move.from === SQ(0, 7)) nb.castling.bq = false;
    if (move.from === SQ(7, 7)) nb.castling.bk = false;
  }
  if (move.captured === "r") {
    if (move.capturedSquare === SQ(0, 0)) nb.castling.wq = false;
    if (move.capturedSquare === SQ(7, 0)) nb.castling.wk = false;
    if (move.capturedSquare === SQ(0, 7)) nb.castling.bq = false;
    if (move.capturedSquare === SQ(7, 7)) nb.castling.bk = false;
  }

  // En passant target
  nb.epTarget = null;
  if (move.isDoublePawn) {
    nb.epTarget = (move.from + move.to) >> 1;
  }

  nb.turn = piece.color === "w" ? "b" : "w";
  if (piece.color === "b") nb.fullmove++;
  nb.halfmove = piece.type === "p" || move.captured ? 0 : nb.halfmove + 1;
  nb.history.push(move);
  return nb;
}

export function kingCaptured(board: BoardState): Color | null {
  // Returns color of the king that was captured (i.e. is missing).
  const w = findKing(board, "w");
  const b = findKing(board, "b");
  if (w == null) return "w";
  if (b == null) return "b";
  return null;
}

// Compact identity of a position for repetition detection: piece placement,
// side to move, castling rights, and en passant target (FEN fields 1–4).
export function positionKey(board: BoardState): string {
  let s = "";
  for (let sq = 0; sq < 64; sq++) {
    const p = board.pieces[sq];
    s += p ? (p.color === "w" ? p.type.toUpperCase() : p.type) : ".";
  }
  s += board.turn;
  s +=
    (board.castling.wk ? "K" : "") +
    (board.castling.wq ? "Q" : "") +
    (board.castling.bk ? "k" : "") +
    (board.castling.bq ? "q" : "");
  s += board.epTarget ?? "-";
  return s;
}

// How many times the current position has occurred over the whole game,
// including right now. Replays the move history from the initial position;
// the board only ever evolves through makeMove, so the replay is exact.
// Positions before the last capture or pawn move can never match the current
// one (material/pawn structure differ), so a plain full replay is correct.
export function countRepetitions(board: BoardState): number {
  const target = positionKey(board);
  let b = initialBoard();
  let count = positionKey(b) === target ? 1 : 0;
  for (const m of board.history) {
    b = makeMove(b, m);
    if (positionKey(b) === target) count++;
  }
  return count;
}

export function moveToUCI(m: Move): string {
  const files = "abcdefgh";
  const a = files[FILE(m.from)] + (RANK(m.from) + 1);
  const b = files[FILE(m.to)] + (RANK(m.to) + 1);
  return a + b + (m.promotion ?? "");
}

export function moveToSAN(m: Move): string {
  const files = "abcdefgh";
  const dest = files[FILE(m.to)] + (RANK(m.to) + 1);
  if (m.castle === "k") return "O-O";
  if (m.castle === "q") return "O-O-O";
  let s = "";
  if (m.piece !== "p") s += m.piece.toUpperCase();
  if (m.captured) {
    if (m.piece === "p") s += files[FILE(m.from)];
    s += "x";
  }
  s += dest;
  if (m.promotion) s += "=" + m.promotion.toUpperCase();
  return s;
}
