import { findKing, generateMoves, initialBoard, makeMove, positionKey } from "./board";
import {
  NerfGame,
  SearchBuffs,
  applySearchAugments,
  buildSearchBuffs,
  legalMoves,
  makeContext,
  markAugmentSpent,
  nerfDisabled,
} from "./game";
import { triggersOwnNerfLoss } from "./moveSafety";
import { BoardState, Color, Move, PieceType } from "./types";

// A move is self-losing if it trips our own nerf's checkLoss on the resulting board.
const isSelfLosing = triggersOwnNerfLoss;

const VAL: Record<PieceType, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

/**
 * Score of a captured king, from the side that captured it. The search reports
 * it as `KING_CAPTURE_SCORE - ply` (ply counted from the root), so a capture
 * two plies away outranks one four plies away and the bot takes the fastest
 * win and delays the slowest loss. Magnitudes stay at or above
 * KING_CAPTURE_FLOOR, the line the eval bar and the house layer read.
 */
export const KING_CAPTURE_SCORE = 100000;
const KING_CAPTURE_FLOOR = 90000;

/** True for a score that means a king is captured somewhere in the line. */
export function isKingCaptureScore(cp: number): boolean {
  return Math.abs(cp) >= KING_CAPTURE_FLOOR;
}

// Piece-square tables, white's perspective, indexed by sq (rank 0 = white's back rank).
// Black uses `sq ^ 56` to mirror vertically. Values adapted from Chess Programming
// Wiki's simplified evaluation function.
const PST: Record<PieceType, number[]> = {
  p: [
       0,   0,   0,   0,   0,   0,   0,   0,
       5,  10,  10, -20, -20,  10,  10,   5,
       5,  -5, -10,   0,   0, -10,  -5,   5,
       0,   0,   0,  20,  20,   0,   0,   0,
       5,   5,  10,  25,  25,  10,   5,   5,
      10,  10,  20,  30,  30,  20,  10,  10,
      50,  50,  50,  50,  50,  50,  50,  50,
       0,   0,   0,   0,   0,   0,   0,   0,
  ],
  n: [
     -50, -40, -30, -30, -30, -30, -40, -50,
     -40, -20,   0,   5,   5,   0, -20, -40,
     -30,   5,  10,  15,  15,  10,   5, -30,
     -30,   0,  15,  20,  20,  15,   0, -30,
     -30,   5,  15,  20,  20,  15,   5, -30,
     -30,   0,  10,  15,  15,  10,   0, -30,
     -40, -20,   0,   0,   0,   0, -20, -40,
     -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
     -20, -10, -10, -10, -10, -10, -10, -20,
     -10,   5,   0,   0,   0,   0,   5, -10,
     -10,  10,  10,  10,  10,  10,  10, -10,
     -10,   0,  10,  10,  10,  10,   0, -10,
     -10,   5,   5,  10,  10,   5,   5, -10,
     -10,   0,   5,  10,  10,   5,   0, -10,
     -10,   0,   0,   0,   0,   0,   0, -10,
     -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
       0,   0,   0,   5,   5,   0,   0,   0,
      -5,   0,   0,   0,   0,   0,   0,  -5,
      -5,   0,   0,   0,   0,   0,   0,  -5,
      -5,   0,   0,   0,   0,   0,   0,  -5,
      -5,   0,   0,   0,   0,   0,   0,  -5,
      -5,   0,   0,   0,   0,   0,   0,  -5,
       5,  10,  10,  10,  10,  10,  10,   5,
       0,   0,   0,   0,   0,   0,   0,   0,
  ],
  q: [
     -20, -10, -10,  -5,  -5, -10, -10, -20,
     -10,   0,   5,   0,   0,   0,   0, -10,
     -10,   5,   5,   5,   5,   5,   0, -10,
       0,   0,   5,   5,   5,   5,   0,  -5,
      -5,   0,   5,   5,   5,   5,   0,  -5,
     -10,   0,   5,   5,   5,   5,   0, -10,
     -10,   0,   0,   0,   0,   0,   0, -10,
     -20, -10, -10,  -5,  -5, -10, -10, -20,
  ],
  // Middlegame king: tucked in behind its pawns.
  k: [
      20,  30,  10,   0,   0,  10,  30,  20,
      20,  20,   0,   0,   0,   0,  20,  20,
     -10, -20, -20, -20, -20, -20, -20, -10,
     -20, -30, -30, -40, -40, -30, -30, -20,
     -30, -40, -40, -50, -50, -40, -40, -30,
     -30, -40, -40, -50, -50, -40, -40, -30,
     -30, -40, -40, -50, -50, -40, -40, -30,
     -30, -40, -40, -50, -50, -40, -40, -30,
  ],
};

// Endgame king: walks to the centre. Blended with PST.k by game phase, so a
// king in a rook ending stops hiding in the corner (it used to, because the
// middlegame table was the only one), and a lone king's corner is where it
// scores worst.
const KING_EG = [
   -50, -30, -30, -30, -30, -30, -30, -50,
   -30, -30,   0,   0,   0,   0, -30, -30,
   -30, -10,  20,  30,  30,  20, -10, -30,
   -30, -10,  30,  40,  40,  30, -10, -30,
   -30, -10,  30,  40,  40,  30, -10, -30,
   -30, -10,  20,  30,  30,  20, -10, -30,
   -30, -20, -10,   0,   0, -10, -20, -30,
   -50, -40, -30, -20, -20, -30, -40, -50,
];

// Game phase: 24 with every minor, rook and queen on the board, 0 with none.
const PHASE_WEIGHT: Record<PieceType, number> = { p: 0, n: 1, b: 1, r: 2, q: 4, k: 0 };
const PHASE_MAX = 24;

// A passed pawn's bonus by its rank from its own side (index 1 = home rank),
// the full value in an endgame and half of it in the middlegame.
const PASSED_BONUS = [0, 5, 10, 20, 35, 60, 100, 0];

// Mop-up: when one side is a rook or more ahead and the other has no pawns
// left, drive the lone king to the edge and bring the winning king close. The
// search sees the king capture only once the net is nearly closed; without
// this the attacker shuffles and the game ends in a repetition (P7).
const MOPUP_MARGIN = 500;

// Extended terms (hard only): bishop pair and doubled-pawn structure. Cheap
// enough to compute inside the same board scan, and enough to give the hard
// bot visibly better piece-trade and pawn-structure judgement.
const BISHOP_PAIR_BONUS = 40;
const DOUBLED_PAWN_PENALTY = 18;

// Scratch for evaluate: pawn ranks per file as bitmasks, and the pawn squares.
const wPawnRanks = new Uint8Array(8);
const bPawnRanks = new Uint8Array(8);
const pawnList = new Int16Array(64);

function taper(mg: number, eg: number, phase: number): number {
  return ((mg * phase + eg * (PHASE_MAX - phase)) / PHASE_MAX) | 0;
}

function popcount8(x: number): number {
  let n = 0;
  while (x) {
    x &= x - 1;
    n++;
  }
  return n;
}

// The winning side's bonus in a mop-up: the lone king pushed off the centre,
// the kings close together, and the lone king's safe squares taken away. The
// last one matters most here: in this game a king with no safe square has to
// step into capture, so boxing it in wins outright, no mate needed.
function mopUp(board: BoardState, att: number, def: number): number {
  const df = def & 7;
  const dr = def >> 3;
  const centre = Math.max(3 - df, df - 4) + Math.max(3 - dr, dr - 4);
  const dist = Math.abs((att & 7) - df) + Math.abs((att >> 3) - dr);
  const defender = board.pieces[def]!.color;
  const by: Color = defender === "w" ? "b" : "w";
  let safe = 0;
  for (let df2 = -1; df2 <= 1; df2++) {
    for (let dr2 = -1; dr2 <= 1; dr2++) {
      if (!df2 && !dr2) continue;
      const f = df + df2;
      const r = dr + dr2;
      if (f < 0 || f > 7 || r < 0 || r > 7) continue;
      const q = board.pieces[r * 8 + f];
      if (q && q.color === defender) continue;
      if (!squareAttacked(board, r * 8 + f, by)) safe++;
    }
  }
  return 10 * centre + 4 * (14 - dist) + 12 * (8 - safe);
}

function evaluate(board: BoardState, me: Color, extended = false): number {
  let score = 0; // white's point of view, flipped at the end
  let wBishops = 0;
  let bBishops = 0;
  let phase = 0;
  let wMat = 0;
  let bMat = 0;
  let wPawns = 0;
  let bPawns = 0;
  let wK = -1;
  let bK = -1;
  let np = 0;
  wPawnRanks.fill(0);
  bPawnRanks.fill(0);
  const pieces = board.pieces;
  for (let sq = 0; sq < 64; sq++) {
    const p = pieces[sq];
    if (!p) continue;
    const white = p.color === "w";
    if (p.type === "k") {
      if (white) wK = sq;
      else bK = sq;
      continue;
    }
    const v = VAL[p.type] + PST[p.type][white ? sq : sq ^ 56];
    phase += PHASE_WEIGHT[p.type];
    if (white) {
      score += v;
      wMat += VAL[p.type];
    } else {
      score -= v;
      bMat += VAL[p.type];
    }
    if (p.type === "p") {
      if (white) {
        wPawns++;
        wPawnRanks[sq & 7] |= 1 << (sq >> 3);
      } else {
        bPawns++;
        bPawnRanks[sq & 7] |= 1 << (sq >> 3);
      }
      pawnList[np++] = sq;
    } else if (p.type === "b") {
      if (white) wBishops++;
      else bBishops++;
    }
  }
  if (phase > PHASE_MAX) phase = PHASE_MAX;
  // King value: 20000 on each side cancels, so only the square matters.
  if (wK >= 0) score += taper(PST.k[wK], KING_EG[wK], phase);
  if (bK >= 0) score -= taper(PST.k[bK ^ 56], KING_EG[bK ^ 56], phase);

  for (let i = 0; i < np; i++) {
    const sq = pawnList[i];
    const f = sq & 7;
    const r = sq >> 3;
    const white = pieces[sq]!.color === "w";
    const enemy = white ? bPawnRanks : wPawnRanks;
    // Ranks in front of the pawn, from its own side's point of view.
    const ahead = white ? (0xff << (r + 1)) & 0xff : (1 << r) - 1;
    const block = (f > 0 ? enemy[f - 1] : 0) | enemy[f] | (f < 7 ? enemy[f + 1] : 0);
    if ((block & ahead) !== 0) continue;
    const bonus = PASSED_BONUS[white ? r : 7 - r];
    const v = taper(bonus >> 1, bonus, phase);
    score += white ? v : -v;
  }

  if (extended) {
    if (wBishops >= 2) score += BISHOP_PAIR_BONUS;
    if (bBishops >= 2) score -= BISHOP_PAIR_BONUS;
    for (let f = 0; f < 8; f++) {
      const wExtra = Math.max(0, popcount8(wPawnRanks[f]) - 1);
      const bExtra = Math.max(0, popcount8(bPawnRanks[f]) - 1);
      score -= (wExtra - bExtra) * DOUBLED_PAWN_PENALTY;
    }
  }

  if (wK >= 0 && bK >= 0) {
    if (bPawns === 0 && wMat - bMat >= MOPUP_MARGIN) score += mopUp(board, wK, bK);
    else if (wPawns === 0 && bMat - wMat >= MOPUP_MARGIN) score -= mopUp(board, bK, wK);
  }
  return me === "w" ? score : -score;
}

// ---------------------------------------------------------------------------
// Fast attack test. Agrees with board.isInCheck (standard piece movement, no
// buff-granted attacks, same as every other interior node of this search) but
// looks outward from one square instead of building the whole attack set, so
// it is cheap enough to run at every node.
// ---------------------------------------------------------------------------
const KNIGHT_DF = [1, 2, -1, -2, 1, 2, -1, -2];
const KNIGHT_DR = [2, 1, 2, 1, -2, -1, -2, -1];
const DIAG_DF = [1, 1, -1, -1];
const DIAG_DR = [1, -1, 1, -1];
const ORTHO_DF = [1, -1, 0, 0];
const ORTHO_DR = [0, 0, 1, -1];

function squareAttacked(board: BoardState, sq: number, by: Color): boolean {
  const P = board.pieces;
  const f = sq & 7;
  const r = sq >> 3;
  // A pawn of `by` strikes diagonally forward, so it sits one rank behind.
  const pr = by === "w" ? r - 1 : r + 1;
  if (pr >= 0 && pr < 8) {
    if (f > 0) {
      const p = P[pr * 8 + f - 1];
      if (p && p.color === by && p.type === "p") return true;
    }
    if (f < 7) {
      const p = P[pr * 8 + f + 1];
      if (p && p.color === by && p.type === "p") return true;
    }
  }
  for (let i = 0; i < 8; i++) {
    const nf = f + KNIGHT_DF[i];
    const nr = r + KNIGHT_DR[i];
    if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
    const p = P[nr * 8 + nf];
    if (p && p.color === by && p.type === "n") return true;
  }
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (!df && !dr) continue;
      const nf = f + df;
      const nr = r + dr;
      if (nf < 0 || nf > 7 || nr < 0 || nr > 7) continue;
      const p = P[nr * 8 + nf];
      if (p && p.color === by && p.type === "k") return true;
    }
  }
  for (let i = 0; i < 4; i++) {
    const df = ORTHO_DF[i];
    const dr = ORTHO_DR[i];
    let nf = f + df;
    let nr = r + dr;
    while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
      const p = P[nr * 8 + nf];
      if (p) {
        if (p.color === by && (p.type === "r" || p.type === "q")) return true;
        break;
      }
      nf += df;
      nr += dr;
    }
  }
  for (let i = 0; i < 4; i++) {
    const df = DIAG_DF[i];
    const dr = DIAG_DR[i];
    let nf = f + df;
    let nr = r + dr;
    while (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
      const p = P[nr * 8 + nf];
      if (p) {
        if (p.color === by && (p.type === "b" || p.type === "q")) return true;
        break;
      }
      nf += df;
      nr += dr;
    }
  }
  return false;
}

function kingAttacked(board: BoardState, color: Color): boolean {
  const ks = findKing(board, color);
  if (ks == null) return false;
  return squareAttacked(board, ks, color === "w" ? "b" : "w");
}

// Both king squares in one scan (-1 when captured), for the node entry test.
let scanW = -1;
let scanB = -1;
function scanKings(board: BoardState): void {
  scanW = -1;
  scanB = -1;
  const P = board.pieces;
  for (let sq = 0; sq < 64; sq++) {
    const p = P[sq];
    if (p && p.type === "k") {
      if (p.color === "w") scanW = sq;
      else scanB = sq;
    }
  }
}

// True when `side`'s king, which stood on `ks` before move `m`, is attacked
// after it. The king only changes square when it is the piece that moved.
function hangsKing(board: BoardState, side: Color, ks: number, m: Move): boolean {
  const sq = m.piece === "k" && m.color === side ? m.to : ks;
  const p = board.pieces[sq];
  if (!p || p.type !== "k" || p.color !== side) return kingAttacked(board, side);
  return squareAttacked(board, sq, side === "w" ? "b" : "w");
}

function hasNonPawnMaterial(board: BoardState, side: Color): boolean {
  for (const p of board.pieces) {
    if (p && p.color === side && p.type !== "p" && p.type !== "k") return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Zobrist hashing, two 32-bit halves. Covers what positionKey covers (pieces,
// side to move, castling rights, en passant square), so a hash repeat is a
// repeat under the game's own threefold rule.
// ---------------------------------------------------------------------------
const PIECE_INDEX: Record<PieceType, number> = { p: 0, n: 1, b: 2, r: 3, q: 4, k: 5 };
const Z = (() => {
  let s = 0x2545f491;
  const next = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return s | 0;
  };
  const fill = (n: number) => {
    const a = new Int32Array(n);
    for (let i = 0; i < n; i++) a[i] = next();
    return a;
  };
  return {
    pieceLo: fill(12 * 64),
    pieceHi: fill(12 * 64),
    castleLo: fill(16),
    castleHi: fill(16),
    epLo: fill(64),
    epHi: fill(64),
    sideLo: next(),
    sideHi: next(),
  };
})();

function castleIndex(b: BoardState): number {
  const c = b.castling;
  return (c.wk ? 1 : 0) | (c.wq ? 2 : 0) | (c.bk ? 4 : 0) | (c.bq ? 8 : 0);
}

function positionHash(b: BoardState, side: Color): [number, number] {
  let lo = 0;
  let hi = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = b.pieces[sq];
    if (!p) continue;
    const k = ((p.color === "w" ? 0 : 6) + PIECE_INDEX[p.type]) * 64 + sq;
    lo ^= Z.pieceLo[k];
    hi ^= Z.pieceHi[k];
  }
  const ci = castleIndex(b);
  lo ^= Z.castleLo[ci];
  hi ^= Z.castleHi[ci];
  if (b.epTarget != null) {
    lo ^= Z.epLo[b.epTarget];
    hi ^= Z.epHi[b.epTarget];
  }
  if (side === "b") {
    lo ^= Z.sideLo;
    hi ^= Z.sideHi;
  }
  return [lo, hi];
}

// Incremental hash of `child = makeMove(parent, m)`, written to hashLo/hashHi.
// makeMove only ever touches the from, to and captured squares and, on a
// castle, the rook's two squares, so those are the only squares to diff.
let hashLo = 0;
let hashHi = 0;
const touched = new Int8Array(6);
// Append `sq` to `touched` unless it is already there (a square XORed twice
// would cancel out); returns the new length.
function pushSquare(n: number, sq: number): number {
  for (let i = 0; i < n; i++) if (touched[i] === sq) return n;
  touched[n] = sq;
  return n + 1;
}

function childHashInto(parent: BoardState, child: BoardState, m: Move, lo: number, hi: number): void {
  if (child === parent) {
    hashLo = lo;
    hashHi = hi;
    return;
  }
  let n = pushSquare(0, m.from);
  n = pushSquare(n, m.to);
  if (m.capturedSquare != null) n = pushSquare(n, m.capturedSquare);
  if (m.castle) {
    const home = m.color === "w" ? 0 : 56;
    n = pushSquare(n, m.castle === "k" ? home + 7 : home);
    n = pushSquare(n, m.castle === "k" ? home + 5 : home + 3);
  }
  for (let i = 0; i < n; i++) {
    const sq = touched[i];
    const a = parent.pieces[sq];
    const b = child.pieces[sq];
    if (a === b) continue;
    if (a) {
      const k = ((a.color === "w" ? 0 : 6) + PIECE_INDEX[a.type]) * 64 + sq;
      lo ^= Z.pieceLo[k];
      hi ^= Z.pieceHi[k];
    }
    if (b) {
      const k = ((b.color === "w" ? 0 : 6) + PIECE_INDEX[b.type]) * 64 + sq;
      lo ^= Z.pieceLo[k];
      hi ^= Z.pieceHi[k];
    }
  }
  const pc = castleIndex(parent);
  const cc = castleIndex(child);
  if (pc !== cc) {
    lo ^= Z.castleLo[pc] ^ Z.castleLo[cc];
    hi ^= Z.castleHi[pc] ^ Z.castleHi[cc];
  }
  if (parent.epTarget != null) {
    lo ^= Z.epLo[parent.epTarget];
    hi ^= Z.epHi[parent.epTarget];
  }
  if (child.epTarget != null) {
    lo ^= Z.epLo[child.epTarget];
    hi ^= Z.epHi[child.epTarget];
  }
  if (parent.turn !== child.turn) {
    lo ^= Z.sideLo;
    hi ^= Z.sideHi;
  }
  hashLo = lo;
  hashHi = hi;
}

// ---------------------------------------------------------------------------
// Transposition table: 2^17 entries in typed arrays (about 2.9 MB), allocated
// on the first search so importing this module (the client bundle, the eval
// bar) costs nothing. Every search takes a fresh `age`, and an entry from
// another search is never trusted, so a table shared across games and levels
// can never leak a score from one search into another. Off whenever a
// move-granting buff is live, because the spent-charge mask would have to be
// part of the key (backlog A13).
// ---------------------------------------------------------------------------
const TT_BITS = 17;
const TT_SIZE = 1 << TT_BITS;
const TT_MASK = TT_SIZE - 1;
const TT_EXACT = 1;
const TT_LOWER = 2;
const TT_UPPER = 3;
type TT = {
  lo: Int32Array;
  hi: Int32Array;
  score: Int32Array;
  move: Int32Array;
  age: Int32Array;
  depth: Int8Array;
  flag: Uint8Array;
};
let ttTable: TT | null = null;
let ttAge = 0;
function tt(): TT {
  if (!ttTable) {
    ttTable = {
      lo: new Int32Array(TT_SIZE),
      hi: new Int32Array(TT_SIZE),
      score: new Int32Array(TT_SIZE),
      move: new Int32Array(TT_SIZE),
      age: new Int32Array(TT_SIZE),
      depth: new Int8Array(TT_SIZE),
      flag: new Uint8Array(TT_SIZE),
    };
  }
  return ttTable;
}

const PROMO_CODE: Record<PieceType, number> = { p: 0, n: 1, b: 2, r: 3, q: 4, k: 5 };
function packMove(m: Move): number {
  return (
    1 +
    (m.from | (m.to << 6) | ((m.promotion ? PROMO_CODE[m.promotion] : 0) << 12) |
      (m.castle ? 1 << 15 : 0) | (m.drop ? 1 << 16 : 0) | (m.via ? 1 << 17 : 0))
  );
}

// Scores near a king capture are stored relative to the node, so a line found
// at one ply reads correctly when the same position turns up at another.
function toTT(s: number, ply: number): number {
  if (s >= KING_CAPTURE_FLOOR) return s + ply;
  if (s <= -KING_CAPTURE_FLOOR) return s - ply;
  return s;
}
function fromTT(s: number, ply: number): number {
  if (s >= KING_CAPTURE_FLOOR) return s - ply;
  if (s <= -KING_CAPTURE_FLOOR) return s + ply;
  return s;
}

// ---------------------------------------------------------------------------
// Tuning. The defaults are what ships; the switches exist so the HB2 scripts
// can measure each piece on its own (scripts/test-house-engine.ts holds the
// transposition table to "changes node counts and nothing else" with the
// selective pieces off, and sim-search-nerf-safety.ts measures the root
// nerf filter against the same engine without it).
// ---------------------------------------------------------------------------
export type EngineTuning = {
  /** Transposition table. */
  tt: boolean;
  /** Null-move pruning (not in check, not with king and pawns only). */
  nullMove: boolean;
  /** Late move reductions for late quiet moves. */
  lmr: boolean;
  /** Principal variation search: null window for every move after the first. */
  pvs: boolean;
  /** Quiescence delta pruning: skip a capture that cannot lift alpha. */
  deltaPruning: boolean;
  /** One extra ply when the side to move is in check, twice per line at most. */
  checkExt: boolean;
  /** Drop root moves that let the opponent trip the mover's own nerf next ply. */
  nerfSafety: boolean;
  /** Score a repeated position (game history or the search line) as a draw. */
  repetition: boolean;
  /** How much worse than 0 a draw looks to the side that is searching. */
  contemptCp: number;
};
const DEFAULT_TUNING: EngineTuning = {
  tt: true,
  nullMove: true,
  lmr: true,
  pvs: true,
  deltaPruning: true,
  checkExt: true,
  nerfSafety: true,
  repetition: true,
  contemptCp: 20,
};
let tuning: EngineTuning = { ...DEFAULT_TUNING };

export function getEngineTuning(): EngineTuning {
  return { ...tuning };
}

/** Change some switches; returns the previous full tuning so a caller can restore it. */
export function setEngineTuning(p: Partial<EngineTuning>): EngineTuning {
  const prev = { ...tuning };
  tuning = { ...tuning, ...p };
  return prev;
}

const MAX_EXTENSIONS = 2;
const MAX_PLY = 120;
const LMR_MIN_DEPTH = 3;
const LMR_MIN_INDEX = 3;
// Later still, and with depth to spare, the reduction is two plies.
const LMR_DEEP_INDEX = 8;
const LMR_DEEP_DEPTH = 5;
const DELTA_MARGIN = 200;

function sameMove(a: Move, b: Move): boolean {
  return a.from === b.from && a.to === b.to && (a.promotion ?? null) === (b.promotion ?? null);
}

// Per-search state. Killer moves are quiet moves that caused a beta cutoff at
// the same ply; the history table counts cutoffs per from/to square pair. Both
// make alpha-beta prune far more of the tree within the same time budget.
type SearchState = {
  killers: (Move | null)[][];
  history: Int32Array;
  // Whether leaf evaluation uses the extended terms (hard only).
  extended: boolean;
  // Node-count abort: the wall-clock budget check is USELESS on Cloudflare
  // Workers, where Date.now() is frozen during synchronous compute. A search
  // there never observes time passing and runs to full depth, which is exactly
  // the Durable Object exceededCpu blowup of 2026-07-08/-10. The node cap is
  // the platform-independent backstop: sized from the time budget
  // (NODES_PER_MS) so on ordinary runtimes the clock check still fires first.
  nodes: number;
  nodeCap: number;
  // Move-granting buffs held at the root, prepared per ply so interior nodes
  // see the same augmented move set legalMoves produces (backlog A13). Null
  // whenever nobody holds such a card, which is the common case.
  buffs: SearchBuffs | null;
  // The hard deadline: wall-clock start and budget (0 = none).
  start: number;
  budget: number;
  // Transposition table on for this search, and this search's age.
  tt: boolean;
  age: number;
  // Hash of the position at each ply of the current line (index 0 = root).
  hLo: Int32Array;
  hHi: Int32Array;
  // Hashes of the game's positions since its last irreversible move, or null.
  histLo: Int32Array | null;
  histHi: Int32Array | null;
  // Draws: seen from `rootSide`, a draw is worth -contempt.
  rootSide: Color;
  contempt: number;
  repetition: boolean;
};

// Rough search throughput used to convert a time budget into a node cap.
// Measured 2026-07-10 on hard-level midgame searches: ~450 nodes/ms median
// (317-727 across 30 samples), so 1000 deliberately overshoots ~2x: on any
// runtime with a working clock the clock check fires first and playing
// strength is unchanged; the node cap only bites where the clock is frozen.
// Precision does not matter, only the order of magnitude.
//
// The cap is deliberately UNCHANGED by the 2026-09 hard-deadline fix and by
// the HB2 search work: for any given budget it allows exactly the node count
// it always did (A25), so the frozen-clock (Durable Object) path is bounded
// exactly as before. On a frozen clock the cap contains a runaway search to
// 2000 nodes per ms-of-budget, about 4.4x the budget's worth of real CPU at
// the measured 450 nodes/ms. Tightening THAT is a separate, strength-affecting
// change to the house tiers' local fallback.
const NODES_PER_MS = 1000;

// The HB2 search visits far fewer nodes to a given depth (transposition
// table, null move, reductions), and the nodes it drops are mostly the cheap
// ones: quiescence leaves that stand pat without generating a move. So the
// average node it does visit costs more, and a node cap reached at the old
// count would cost more CPU on the frozen-clock path. A move generation is
// therefore charged as GEN_COST extra nodes. With 2, a capped hard search
// with the clock frozen spends no more CPU than the pre-HB2 engine did at the
// same cap, and reaches about a ply deeper (scripts/bench-house-search.ts
// --frozen, docs/polish-pass/evidence/HB/HB2/bench-frozen.json), which is what
// A25 asks of the cap.
const GEN_COST = 2;

function newSearchState(
  extended: boolean,
  budgetMs = 0,
  buffs: SearchBuffs | null = null,
  start = Date.now(),
  rootSide: Color = "w",
  contempt = 0,
): SearchState {
  return {
    killers: [],
    history: new Int32Array(64 * 64),
    extended,
    nodes: 0,
    nodeCap: budgetMs > 0 ? budgetMs * 2 * NODES_PER_MS : 0,
    buffs,
    start,
    budget: budgetMs,
    tt: tuning.tt && !buffs,
    age: ++ttAge,
    hLo: new Int32Array(MAX_PLY + 8),
    hHi: new Int32Array(MAX_PLY + 8),
    histLo: null,
    histHi: null,
    rootSide,
    contempt,
    repetition: tuning.repetition,
  };
}

/**
 * Point the search at `board`: the root hash, and the board the search walks.
 * Without move-granting buffs nothing below the root reads the move history
 * (generateMoves, evaluate and the hash do not), so the search runs on a copy
 * with an empty history: makeMove copies the history array at every node, and
 * at ply 100 that copy was a large share of each node's cost.
 */
function prepareRoot(state: SearchState, board: BoardState): BoardState {
  const [lo, hi] = positionHash(board, board.turn);
  state.hLo[0] = lo;
  state.hHi[0] = hi;
  return state.buffs ? board : { ...board, history: [] };
}

/**
 * Hashes of the game positions since the last irreversible move (a capture, a
 * pawn move or a drop), from replaying the history. Null when threefold does
 * not apply: a Chess Diff, a board a buff rewrote outside its history (the
 * game suspends repetition detection then too), or a replay that does not
 * land on the current board.
 */
function gameHistoryHashes(game: NerfGame): [Int32Array, Int32Array] | null {
  const h = game.board.history;
  if (!h.length || game.buffs?.diff || game.buffs?.historyDiverged) return null;
  let from = 0;
  for (let i = h.length - 1; i >= 0; i--) {
    const m = h[i];
    if (m.piece === "p" || m.captured || m.drop) {
      from = i + 1;
      break;
    }
  }
  if (from >= h.length) return null;
  const lo: number[] = [];
  const hi: number[] = [];
  let b = initialBoard();
  if (from === 0) {
    const [l, x] = positionHash(b, b.turn);
    lo.push(l);
    hi.push(x);
  }
  for (let i = 0; i < h.length; i++) {
    b = makeMove(b, h[i]);
    b.history.length = 0; // keep each replay step O(1)
    // Position i + 1; the last one is the root itself.
    if (i + 1 >= from && i + 1 < h.length) {
      const [l, x] = positionHash(b, b.turn);
      lo.push(l);
      hi.push(x);
    }
  }
  if (positionKey(b) !== positionKey(game.board)) return null;
  return [Int32Array.from(lo), Int32Array.from(hi)];
}

function drawScore(state: SearchState, side: Color): number {
  return side === state.rootSide ? -state.contempt : state.contempt;
}

function isRepetition(state: SearchState, board: BoardState, ply: number): boolean {
  const lo = state.hLo[ply];
  const hi = state.hHi[ply];
  const hm = board.halfmove;
  for (let i = ply - 2; i >= 0 && i >= ply - hm; i -= 2) {
    if (state.hLo[i] === lo && state.hHi[i] === hi) return true;
  }
  // No irreversible move on the line from the root: the game's own recent
  // positions count too, but only where the game itself would call the draw,
  // that is a position already seen twice. Scoring a single earlier sighting
  // as a draw let the bot "hold" a lost position by stepping back into it,
  // when the opponent was free to play on and win the piece.
  if (state.histLo && hm >= ply) {
    const hl = state.histLo;
    const hh = state.histHi!;
    let seen = 0;
    for (let i = 0; i < hl.length; i++) if (hl[i] === lo && hh[i] === hi && ++seen >= 2) return true;
  }
  return false;
}

// Quiescence depth, and therefore how far past `maxDepth` a granted move can
// still turn up. The per-ply augment table has to cover both.
const QUIESCE_DEPTH = 6;

// Interior move generation. Identical to `generateMoves` unless the side to
// move holds a move-granting card, in which case it also runs that card's
// `augmentMoves` hook, which is the whole point of A13.
function genMoves(board: BoardState, state: SearchState, ply: number, spentMask: number): Move[] {
  const moves = generateMoves(board);
  if (state.buffs) applySearchAugments(state.buffs, board, ply, spentMask, moves);
  return moves;
}

// A granted move consumes its card's charge for the rest of THIS line only.
function childMask(state: SearchState, ply: number, m: Move, spentMask: number): number {
  return state.buffs ? markAugmentSpent(state.buffs, ply, m, spentMask) : spentMask;
}

// MVV-LVA for captures (most valuable victim taken by least valuable attacker
// first), then killers, then quiet moves by history score. An optional
// priority move (the PV move from the previous iteration, or the table's best
// move) sorts before all.
function orderMoves(
  moves: Move[],
  priority?: Move | null,
  state?: SearchState,
  ply?: number,
  packed = 0,
): Move[] {
  const killers = state && ply != null ? state.killers[ply] : undefined;
  const k0 = killers?.[0] ?? null;
  const k1 = killers?.[1] ?? null;
  const n = moves.length;
  const scored: { m: Move; s: number }[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const m = moves[i];
    let s = 0;
    if (m.captured) s = 1_000_000 + VAL[m.captured] * 10 - VAL[m.piece];
    else if (k0 && sameMove(m, k0)) s = 900_000;
    else if (k1 && sameMove(m, k1)) s = 800_000;
    else if (state) s = state.history[m.from * 64 + m.to];
    if (m.promotion) s += VAL[m.promotion];
    if (priority && sameMove(m, priority)) s += 100_000_000;
    else if (packed && packMove(m) === packed) s += 100_000_000;
    scored[i] = { m, s };
  }
  scored.sort(byScoreDesc);
  const out: Move[] = new Array(n);
  for (let i = 0; i < n; i++) out[i] = scored[i].m;
  return out;
}

function byScoreDesc(a: { s: number }, b: { s: number }): number {
  return b.s - a.s;
}

function recordCutoff(state: SearchState, ply: number, m: Move, depth: number) {
  if (m.captured) return;
  state.history[m.from * 64 + m.to] += depth * depth;
  const killers = (state.killers[ply] ??= [null, null]);
  if (!killers[0] || !sameMove(m, killers[0])) {
    killers[1] = killers[0];
    killers[0] = m;
  }
}

function isKiller(state: SearchState, ply: number, m: Move): boolean {
  const k = state.killers[ply];
  return !!k && ((!!k[0] && sameMove(m, k[0])) || (!!k[1] && sameMove(m, k[1])));
}

export type AILevel = "easy" | "medium" | "hard";

// Per-difficulty playing profile. The three levels are deliberately far
// apart so the difference is obvious within a few games:
// - easy:   one-ply greedy with heavy evaluation noise plus outright random
//           moves: grabs free material sometimes, but regularly overlooks
//           captures and walks into simple tactics. Beginner level.
// - medium: shallow but sound alpha-beta (3 plies + quiescence): plays
//           solid moves, sees basic tactics, avoids hanging pieces outright,
//           misses deeper combinations. Casual-player level.
// - hard:   deep iterative-deepening search with a richer evaluation and no
//           noise: finds multi-move tactics consistently.
type LevelProfile = {
  maxDepth: number;
  // Search time budget; iterative deepening stops at the cap depth or when
  // the budget runs out, whichever comes first.
  budgetMs: number;
  // Uniform noise (centipawns) added to easy's one-ply evaluation. Not used
  // by the searching levels: root moves pruned by alpha-beta return inexact
  // bounds, so noising those scores would randomly promote refuted moves.
  rootNoise: number;
  // Chance to ignore the search entirely and play a random (non-self-losing)
  // legal move.
  blunderChance: number;
  // Extended evaluation terms (bishop pair, pawn structure).
  extendedEval: boolean;
};

// `budgetMs` here is WALL TIME the search may spend, and since 2026-09 that is
// the truth rather than half of it: negamax used to abort at `budget * 2`, so
// medium's old 700 really cost 1400ms and hard's old 2000 really cost 4000ms.
// These numbers are doubled from those old nominals for exactly that reason:
// the practice bot thinks for the same length of time it always did, the label
// on the tin now matches the tin. Do not read the doubling as a strength buff;
// reverting it would be a strength CUT.
const LEVELS: Record<AILevel, LevelProfile> = {
  easy: { maxDepth: 1, budgetMs: 0, rootNoise: 120, blunderChance: 0.22, extendedEval: false },
  medium: { maxDepth: 3, budgetMs: 1400, rootNoise: 0, blunderChance: 0, extendedEval: false },
  hard: { maxDepth: 12, budgetMs: 4000, rootNoise: 0, blunderChance: 0, extendedEval: true },
};

// The search shape a level runs at by default (depth + whether leaf eval uses
// the extended terms). Exposed so the house-bot layer can resolve a weakening
// profile's omitted maxDepth/extendedEval against the true level defaults
// without duplicating (and drifting from) the LEVELS table.
export function defaultSearchShape(level: AILevel): { maxDepth: number; extendedEval: boolean } {
  return { maxDepth: LEVELS[level].maxDepth, extendedEval: LEVELS[level].extendedEval };
}

// Search budget for a level, capped to a slice of the bot's remaining clock
// so the bot spends time like a human player and can never think its whole
// bank away in fast time controls.
//
// That sentence is now true as written. It was not before: the returned number
// was a budget the search was allowed to double, so a bot at the 60ms floor in
// a 1+0 game spent 120ms of a clock it did not have, and every clamp here was
// half as tight as it read. `budgetMs` is a hard wall-clock deadline in the
// search (see negamax), so a tenth of the remaining clock is a tenth of the
// remaining clock.
export function aiBudgetMs(level: AILevel, remainingClockMs?: number): number {
  const base = LEVELS[level].budgetMs;
  if (remainingClockMs == null) return base;
  // `base || 300` covers easy, whose profile budget is 0 because it never
  // searches; the value only reaches a caller's bookkeeping, not a search.
  return Math.max(60, Math.min(base || 300, remainingClockMs / 10));
}

// Move-quality weakening for the house bots. Applied ONLY when a caller passes
// a `weaken` block whose sampling is actually active (topK > 1, or a non-zero
// temperature/noise); with topK:1, temperatureCp:0 and evalNoiseCp:0 the search
// takes the argmax path. The point is a *human-shaped* handicap (inaccuracies,
// the occasional 2nd/3rd-best move) rather than a time-starved-but-flawless
// engine, which is why the lever is move choice, not search time.
export type WeakenParams = {
  // Search shape (override LEVELS defaults for this move).
  maxDepth: number;
  extendedEval: boolean;
  // Sample from the top `topK` root moves (1 = always the best move).
  topK: number;
  // Softmax temperature over root scores, centipawns (0 = argmax among the
  // survivors, no random spread).
  temperatureCp: number;
  // Only root moves within this centipawn margin of the best are candidates.
  sampleWindowCp: number;
  // Uniform +-noise (centipawns) added to each root score before sampling, so
  // positional judgement gets fuzzed without ever promoting a move the search
  // sees as outright losing (that floor is enforced separately).
  evalNoiseCp: number;
};

export type WeakenOptions = {
  params: WeakenParams;
  // Caller-supplied RNG (int in [0, max)), same one the house code threads
  // everywhere so weakened move choice stays testable/deterministic under seed.
  random: (max: number) => number;
};

// A root move a full-window search scored. Distinct from the argmax root loop,
// which narrows alpha across moves and so returns inexact bounds for all but
// the best: those bounds are unsafe to sample from (they can rank a refuted
// move above a sound one), which is why sampling needs this separate pass.
type RankedRootMove = { move: Move; scoreCp: number };

/**
 * Diagnostics an interested caller can ask for. Optional and write-only, so
 * nothing about the search changes when it is absent.
 *
 * `depth` exists because "the bot played worse while holding this card" and
 * "the card is bad" look identical from a win rate, and the difference is
 * whether the search got shallower. A card that widens the legal move set
 * buys fewer plies out of a fixed time budget, and the win-rate harness runs
 * at a 60ms budget, so that is not a hypothetical.
 */
export interface SearchStats {
  /** The deepest ply the search actually completed, not the depth it aimed at. */
  depth: number;
  /** Root moves considered, which is the branching factor being paid for. */
  rootMoves: number;
  /**
   * Nodes visited across every deepening iteration. Depth alone cannot tell a
   * search that got cheaper from one that got shallower at the same budget,
   * which is the question A13's per-node augment step has to answer.
   */
  nodes?: number;
  /**
   * The root's best score in centipawns from the mover's side, at the deepest
   * completed depth (on the sampling path, the best score before noise).
   * Undefined when no depth completed. King captures read as
   * +-(KING_CAPTURE_SCORE - ply); see isKingCaptureScore.
   */
  scoreCp?: number;
}

/**
 * Drop the root moves after which some opponent reply trips the mover's OWN
 * nerf (the last knight taken under "lose without a knight", an enemy pawn let
 * into your half under Hold Them Back), unless nothing else is left. The
 * search never applies nerfs below the root, so without this it walked into
 * those losses (P4). Replies come from generateMoves: the opponent's own nerf,
 * which may be hidden from this player, is never read. At most a quarter of
 * the budget goes here; moves not yet checked when it runs out are kept.
 */
function dropNerfLossInOne(game: NerfGame, moves: Move[], start: number, budget: number): Move[] {
  if (!tuning.nerfSafety || moves.length < 2) return moves;
  const me = game.board.turn;
  const slot = me === "w" ? game.white : game.black;
  const checkLoss = slot.nerf.checkLoss;
  if (!checkLoss || game.buffs?.diff || nerfDisabled(game, me)) return moves;
  const opp: Color = me === "w" ? "b" : "w";
  const cap = budget > 0 ? budget / 4 : Infinity;
  const kept: Move[] = [];
  for (let i = 0; i < moves.length; i++) {
    if (Date.now() - start > cap) {
      for (let j = i; j < moves.length; j++) kept.push(moves[j]);
      break;
    }
    const m = moves[i];
    const nb = makeMove(game.board, m);
    let loses = false;
    if (nb !== game.board) {
      for (const r of generateMoves(nb)) {
        // A king capture ends the game on its own terms.
        if (nb.pieces[r.capturedSquare ?? r.to]?.type === "k") continue;
        const nb2 = makeMove(nb, r);
        if (nb2 === nb) continue;
        // The tallies playMove updates before checkLossConditions runs.
        const captured = { w: { ...game.captured.w }, b: { ...game.captured.b } };
        if (m.captured) captured[me][m.captured] += 1;
        if (r.captured) captured[opp][r.captured] += 1;
        let hit = false;
        try {
          hit = !!checkLoss(slot.state, makeContext({ ...game, board: nb2, captured }, me));
        } catch {
          hit = false;
        }
        if (hit) {
          loses = true;
          break;
        }
      }
    }
    if (!loses) kept.push(m);
  }
  return kept.length ? kept : moves;
}

/**
 * One-ply ranking for when not even depth 1 finished (a loaded box, a tiny
 * budget): a move that takes the king first, then moves that leave the king
 * safe by static evaluation, then moves that hang it. Before, the argmax path
 * returned the first root move unsorted and the sampling path sampled among
 * moves all scored 0, and in check that mostly meant hanging the king (P6).
 */
function staticRank(board: BoardState, moves: Move[], me: Color, extended: boolean): RankedRootMove[] {
  const opp: Color = me === "w" ? "b" : "w";
  const out = moves.map((move) => {
    const nb = makeMove(board, move);
    let scoreCp: number;
    if (findKing(nb, opp) == null) scoreCp = KING_CAPTURE_SCORE - 1;
    else if (kingAttacked(nb, me)) scoreCp = -(KING_CAPTURE_SCORE - 2);
    else scoreCp = evaluate(nb, me, extended);
    return { move, scoreCp };
  });
  out.sort((a, b) => b.scoreCp - a.scoreCp);
  return out;
}

function setupState(
  game: NerfGame,
  extended: boolean,
  budget: number,
  searchBuffs: SearchBuffs | null,
  start: number,
): { state: SearchState; root: BoardState } {
  const me = game.board.turn;
  const state = newSearchState(extended, budget, searchBuffs, start, me, tuning.contemptCp);
  if (state.repetition) {
    const hist = gameHistoryHashes(game);
    if (hist) [state.histLo, state.histHi] = hist;
  }
  const root = prepareRoot(state, game.board);
  return { state, root };
}

// `overrideBudgetMs` caps the search time regardless of level, used by the
// game server's house players so a bot-vs-bot move never blocks the (single
// threaded) Durable Object long enough to stall live sockets or the lobby,
// and by the client so the bot's thinking never exceeds its remaining clock.
// It is a HARD wall-clock deadline: the search returns within it (give or take
// the cost of one node), not within twice it. On a runtime whose clock is
// frozen mid-compute (Cloudflare Workers, i.e. the DO's local fallback) the
// node cap is what bounds the search instead; see NODES_PER_MS.
// `weaken` (house bots only) degrades move CHOICE for a realistic handicap;
// see WeakenParams.
export function pickAIMove(
  game: NerfGame,
  level: AILevel,
  overrideBudgetMs?: number,
  weaken?: WeakenOptions,
  stats?: SearchStats,
): Move | null {
  const all = legalMoves(game);
  if (!all.length) return null;
  const safe = all.filter((m) => !isSelfLosing(game, m));
  let moves = safe.length ? safe : all;
  if (stats) {
    stats.rootMoves = moves.length;
    stats.depth = 0;
    stats.nodes = 0;
    stats.scoreCp = undefined;
  }

  const me = game.board.turn;
  const cfg = LEVELS[level];

  if (cfg.blunderChance > 0 && Math.random() < cfg.blunderChance) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if (level === "easy") {
    // Greedy one-ply search: take the move with the best immediate evaluation,
    // with heavy noise. No lookahead, so it still walks into tactics. Weakening
    // never targets easy (it is already the weakest profile).
    let best: Move | null = null;
    let bestScore = -Infinity;
    for (const m of moves) {
      const score = evaluate(makeMove(game.board, m), me) + Math.random() * cfg.rootNoise;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best ?? moves[0];
  }

  const start = Date.now();
  const opp: Color = me === "w" ? "b" : "w";
  const budget = overrideBudgetMs ?? cfg.budgetMs;
  const maxDepth = weaken?.params.maxDepth ?? cfg.maxDepth;
  const extended = weaken?.params.extendedEval ?? cfg.extendedEval;

  moves = dropNerfLossInOne(game, moves, start, budget);
  if (stats) stats.rootMoves = moves.length;

  // Sampling is only worth its extra cost (a full-window root pass) when it can
  // actually change the choice. Otherwise take the argmax search.
  const p = weaken?.params;
  const sampling = !!p && (p.topK > 1 || p.temperatureCp > 0 || p.evalNoiseCp > 0);

  // The root already sees granted moves (legalMoves ran the augments above);
  // this is what lets every node BELOW the root see them too.
  const searchBuffs = buildSearchBuffs(game, maxDepth + QUIESCE_DEPTH + MAX_EXTENSIONS + 1);
  const { state, root } = setupState(game, extended, budget, searchBuffs, start);

  if (sampling && weaken) {
    const ranked = rankedRoot(root, moves, opp, maxDepth, state, stats);
    return sampleWeakened(ranked, weaken.params, weaken.random);
  }

  let bestMove: Move | null = null;

  // Iterative deepening: search depth 1, 2, 3, ... up to maxDepth. The best move
  // from each completed depth is the first one tried at the next depth, which
  // dramatically improves alpha-beta cutoffs.
  for (let d = 1; d <= maxDepth; d++) {
    let depthBest: Move | null = null;
    let depthBestScore = -Infinity;
    let alpha = -Infinity;
    const beta = Infinity;
    let timedOut = false;

    let first = true;
    for (const m of orderMoves(moves, bestMove, state, 0)) {
      const nb = makeMove(root, m);
      childHashInto(root, nb, m, state.hLo[0], state.hHi[0]);
      state.hLo[1] = hashLo;
      state.hHi[1] = hashHi;
      const cm = childMask(state, 0, m, 0);
      const score =
        !first && tuning.pvs && alpha > -KING_CAPTURE_FLOOR && alpha < KING_CAPTURE_FLOOR
          ? pvsChild(nb, d, alpha, beta, opp, state, 0, cm, 0)
          : -negamax(nb, d - 1, -beta, -alpha, opp, state, 1, cm, 0, true);
      first = false;
      if (Number.isNaN(score)) {
        timedOut = true;
        break;
      }
      if (score > depthBestScore) {
        depthBestScore = score;
        depthBest = m;
      }
      if (score > alpha) alpha = score;
    }

    if (!timedOut && depthBest) {
      bestMove = depthBest;
      if (stats) {
        stats.depth = d;
        stats.scoreCp = depthBestScore;
      }
    }

    // A timed-out depth means the budget (clock or node cap) is spent; going
    // deeper would only burn more nodes to time out again immediately.
    if (timedOut) break;
    if (Date.now() - start > budget) break;
  }

  if (stats) stats.nodes = state.nodes;
  if (bestMove) return bestMove;
  return staticRank(root, moves, me, extended)[0].move;
}

/**
 * Full-window root ranking (the sampling path's scores), exported for the HB2
 * scripts and for callers that want every root move scored: the legal moves
 * less the self-losing ones and the nerf-loss-in-one filter, best first.
 * `depth` defaults to the level's own.
 */
export function rankRootMoves(
  game: NerfGame,
  level: AILevel,
  budgetMs: number,
  depth?: number,
  stats?: SearchStats,
): { move: Move; scoreCp: number }[] {
  const all = legalMoves(game);
  if (!all.length) return [];
  const safe = all.filter((m) => !isSelfLosing(game, m));
  const start = Date.now();
  const moves = dropNerfLossInOne(game, safe.length ? safe : all, start, budgetMs);
  const cfg = LEVELS[level];
  const maxDepth = depth ?? cfg.maxDepth;
  const me = game.board.turn;
  const searchBuffs = buildSearchBuffs(game, maxDepth + QUIESCE_DEPTH + MAX_EXTENSIONS + 1);
  const { state, root } = setupState(game, cfg.extendedEval, budgetMs, searchBuffs, start);
  return rankedRoot(root, moves, me === "w" ? "b" : "w", maxDepth, state, stats);
}

// Iterative-deepening root search that scores EVERY root move with a full
// window (alpha stays -Inf across root moves) so the returned scores are
// directly comparable and safe to sample from. Interior nodes still narrow and
// prune normally as alpha rises within each subtree; only the root-level
// narrowing that produces inexact bounds is dropped. Costs roughly 2-4x the
// argmax search at equal depth, fine at the shallow depths weakened tiers use,
// and the node cap remains the frozen-clock backstop. Returns the ranked list
// (best first) from the deepest fully completed depth, or the one-ply
// king-safe ranking when not even depth 1 completed.
function rankedRoot(
  root: BoardState,
  moves: Move[],
  opp: Color,
  maxDepth: number,
  state: SearchState,
  stats?: SearchStats,
): RankedRootMove[] {
  let ranked: RankedRootMove[] | null = null;
  let priority: Move | null = null;

  for (let d = 1; d <= maxDepth; d++) {
    const scored: RankedRootMove[] = [];
    let timedOut = false;
    for (const m of orderMoves(moves, priority, state, 0)) {
      const nb = makeMove(root, m);
      childHashInto(root, nb, m, state.hLo[0], state.hHi[0]);
      state.hLo[1] = hashLo;
      state.hHi[1] = hashHi;
      // Full window (-Inf, +Inf): no root-level alpha narrowing, so each move
      // gets an exact score rather than a bound.
      const score = -negamax(nb, d - 1, -Infinity, Infinity, opp, state, 1, childMask(state, 0, m, 0), 0, true);
      if (Number.isNaN(score)) {
        timedOut = true;
        break;
      }
      scored.push({ move: m, scoreCp: score });
    }
    if (!timedOut && scored.length) {
      scored.sort((a, b) => b.scoreCp - a.scoreCp);
      ranked = scored;
      priority = scored[0].move; // best-so-far first at the next depth
      if (stats) {
        stats.depth = d;
        stats.scoreCp = scored[0].scoreCp;
      }
    }
    if (timedOut) break;
    if (Date.now() - state.start > state.budget) break;
  }
  if (stats) stats.nodes = state.nodes;
  return ranked ?? staticRank(root, moves, root.turn, state.extended);
}

// Pick a weakened move from ranked root scores: fuzz each score by uniform
// noise, keep those within the window of the best, cap to topK, then softmax-
// sample by temperature. A candidate the search scores as outright losing
// (mate-range) is never chosen while a non-losing move exists, so a weakened
// bot plays inaccuracies and the odd second-best move but not one-move suicides
// the search already saw. When the search sees the king fall, the fastest
// capture is played: king-capture scores differ by a few points per ply, so
// sampling among them would dither between a win now and a win later.
const MATE_SCORE = 50000;

function sampleWeakened(ranked: RankedRootMove[], p: WeakenParams, random: (max: number) => number): Move {
  if (!ranked.length) throw new Error("sampleWeakened: no moves");
  const rawBest = ranked[0].scoreCp; // ranked is best-first from rankedRoot
  if (rawBest >= KING_CAPTURE_FLOOR) return ranked[0].move;
  const noised = ranked.map((r) => ({
    move: r.move,
    raw: r.scoreCp,
    s: r.scoreCp + (p.evalNoiseCp > 0 ? random(2 * p.evalNoiseCp + 1) - p.evalNoiseCp : 0),
  }));

  // Window on the (noised) score, mate-floor on the true score.
  let cands = noised.filter((c) => c.s >= rawBest - p.sampleWindowCp);
  if (rawBest > -MATE_SCORE) {
    const safe = cands.filter((c) => c.raw > -MATE_SCORE);
    if (safe.length) cands = safe;
  }
  if (!cands.length) cands = [noised[0]];

  cands.sort((a, b) => b.s - a.s);
  cands = cands.slice(0, Math.max(1, p.topK));

  if (p.temperatureCp <= 0 || cands.length === 1) return cands[0].move;

  const top = cands[0].s;
  const weights = cands.map((c) => Math.exp((c.s - top) / p.temperatureCp));
  const sum = weights.reduce((a, b) => a + b, 0);
  // random(max) is an int RNG; build a [0,1) float from a large draw.
  let roll = (random(1_000_000) / 1_000_000) * sum;
  for (let i = 0; i < cands.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return cands[i].move;
  }
  return cands[cands.length - 1].move;
}

export interface BoardAnalysis {
  /** Best move found, or null if the side to move has no moves. */
  move: Move | null;
  /** Score in centipawns from the side to move's perspective. */
  scoreCp: number;
  /** Deepest fully-searched depth. */
  depth: number;
}

// Plain-chess analysis for the analysis board: same iterative-deepening
// negamax as the hard bot, but over a bare BoardState (no nerfs) and
// returning the score alongside the move so callers can drive an eval bar.
// Draws inside the search line score 0 here (no contempt): the eval bar is
// an assessment, not a player trying to win.
//
// `budgetMs` is a hard wall-clock deadline (see negamax). It used to be a
// number the search doubled, which is why `analyzeBoard(board, 300)` on
// /analysis was a measured 601ms main-thread block; a caller that wants 600ms
// of search now writes 600.
export function analyzeBoard(board: BoardState, budgetMs = 300, maxDepth = 10): BoardAnalysis {
  const moves = generateMoves(board);
  const me = board.turn;
  if (!moves.length) return { move: null, scoreCp: 0, depth: 0 };

  const opp: Color = me === "w" ? "b" : "w";
  const start = Date.now();
  const state = newSearchState(true, budgetMs, null, start, me, 0);
  const root = prepareRoot(state, board);
  let bestMove: Move | null = null;
  let bestScore = 0;
  let completed = 0;

  for (let d = 1; d <= maxDepth; d++) {
    let depthBest: Move | null = null;
    let depthBestScore = -Infinity;
    let alpha = -Infinity;
    let timedOut = false;
    for (const m of orderMoves(moves, bestMove, state, 0)) {
      const nb = makeMove(root, m);
      childHashInto(root, nb, m, state.hLo[0], state.hHi[0]);
      state.hLo[1] = hashLo;
      state.hHi[1] = hashHi;
      const score = -negamax(nb, d - 1, -Infinity, -alpha, opp, state, 1, 0, 0, true);
      if (Number.isNaN(score)) {
        timedOut = true;
        break;
      }
      if (score > depthBestScore) {
        depthBestScore = score;
        depthBest = m;
      }
      if (score > alpha) alpha = score;
    }
    if (!timedOut && depthBest) {
      bestMove = depthBest;
      bestScore = depthBestScore;
      completed = d;
    }
    if (timedOut) break;
    if (Date.now() - start > budgetMs) break;
  }

  return { move: bestMove ?? moves[0], scoreCp: bestScore, depth: completed };
}

// NaN survives negation unchanged, so a timed-out subtree is detectable at
// every level of the negamax recursion with a single isNaN check.
const TIMEOUT_SENTINEL = Number.NaN;

function negamax(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  side: Color,
  state: SearchState,
  ply: number,
  spentMask: number,
  ext: number,
  nullOk: boolean,
): number {
  // Node cap first: on Workers the clock check below never fires (Date.now()
  // is frozen during synchronous compute), so this is the only abort there.
  // Counted unconditionally so `SearchStats.nodes` is meaningful even for an
  // uncapped search.
  state.nodes++;
  if (state.nodeCap > 0 && state.nodes > state.nodeCap) return TIMEOUT_SENTINEL;
  // `budget` is a HARD deadline: the search may not spend more wall-clock time
  // than the caller asked for. It used to abort at `budget * 2`, which (since
  // the deepening loops only check the clock BETWEEN depths) let a depth that
  // started a millisecond under the budget run to twice it; measured over 27
  // midgame positions (scripts/bench-search-deadline.ts) the headroom bought
  // no depth at an equal wall ceiling. One tight deadline keeps aiBudgetMs's
  // clamp, the house tiers' margin under the engine service's 3000ms timeout
  // and the DO-safe search ceiling all true at once.
  if (state.budget > 0 && Date.now() - state.start > state.budget) return TIMEOUT_SENTINEL;

  // A captured king scores from the side to move's perspective, and sooner is
  // bigger: the side that loses its king at ply 3 prefers that to ply 1.
  scanKings(board);
  const wk = scanW;
  const bk = scanB;
  if (wk < 0) return side === "w" ? -(KING_CAPTURE_SCORE - ply) : KING_CAPTURE_SCORE - ply;
  if (bk < 0) return side === "b" ? -(KING_CAPTURE_SCORE - ply) : KING_CAPTURE_SCORE - ply;

  // Draws: fifty moves; a position repeated from earlier in this line (scored
  // at the first repeat, as engines do, since the side that can repeat once
  // can repeat twice); and a position the game has already seen twice.
  if (board.halfmove >= 100) return drawScore(state, side);
  if (state.repetition && isRepetition(state, board, ply)) return drawScore(state, side);
  if (ply >= MAX_PLY) return evaluate(board, side, state.extended);

  const opp: Color = side === "w" ? "b" : "w";
  const inCheck = squareAttacked(board, side === "w" ? wk : bk, opp);
  if (inCheck && tuning.checkExt && ext < MAX_EXTENSIONS) {
    depth++;
    ext++;
  }
  if (depth <= 0) return quiesce(board, alpha, beta, side, QUIESCE_DEPTH, state, ply, spentMask);

  const lo = state.hLo[ply];
  const hi = state.hHi[ply];
  let ttMove = 0;
  let t: TT | null = null;
  if (state.tt) {
    t = tt();
    const i = lo & TT_MASK;
    if (t.age[i] === state.age && t.lo[i] === lo && t.hi[i] === hi) {
      ttMove = t.move[i];
      if (t.depth[i] >= depth) {
        const s = fromTT(t.score[i], ply);
        const f = t.flag[i];
        if (f === TT_EXACT) return s;
        if (f === TT_LOWER && s >= beta) return s;
        if (f === TT_UPPER && s <= alpha) return s;
      }
    }
  }

  // Null move: if passing the turn still leaves this side at or above beta, a
  // real move will too. Not in check (the king would be taken), not with king
  // and pawns only (zugzwang), never twice in a row, never with buff state.
  if (
    tuning.nullMove && nullOk && !inCheck && depth >= 3 && beta < KING_CAPTURE_FLOOR &&
    !state.buffs && hasNonPawnMaterial(board, side) && evaluate(board, side, state.extended) >= beta
  ) {
    const R = depth >= 6 ? 3 : 2;
    const nb: BoardState = { ...board, turn: opp, epTarget: null, halfmove: 0 };
    let nlo = lo ^ Z.sideLo;
    let nhi = hi ^ Z.sideHi;
    if (board.epTarget != null) {
      nlo ^= Z.epLo[board.epTarget];
      nhi ^= Z.epHi[board.epTarget];
    }
    state.hLo[ply + 1] = nlo;
    state.hHi[ply + 1] = nhi;
    const v = -negamax(nb, depth - 1 - R, -beta, -beta + 1, opp, state, ply + 1, spentMask, ext, false);
    if (Number.isNaN(v)) return TIMEOUT_SENTINEL;
    if (v >= beta) return beta;
  }

  // Generating and ordering the moves is the expensive half of a node, so it
  // counts as one more (see NODE_COST below).
  state.nodes += GEN_COST;
  const moves = orderMoves(genMoves(board, state, ply, spentMask), null, state, ply, ttMove);
  const alpha0 = alpha;
  let best = -Infinity;
  let bestMove: Move | null = null;
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    const nb = makeMove(board, m);
    childHashInto(board, nb, m, lo, hi);
    state.hLo[ply + 1] = hashLo;
    state.hHi[ply + 1] = hashHi;
    const cm = childMask(state, ply, m, spentMask);
    let v: number;
    if (m.captured !== "k" && hangsKing(nb, side, side === "w" ? wk : bk, m)) {
      // The reply takes the king. This is exactly what searching the child
      // returns (its first ordered move is that capture), without generating
      // its moves: in check, most pseudo-legal moves are these. It still
      // counts as a node, so the frozen-clock node cap (A25) keeps meaning
      // roughly the CPU it meant before.
      state.nodes++;
      v = -(KING_CAPTURE_SCORE - ply - 2);
    } else if (
      // Late move reduction: a quiet move far down the ordering is searched a
      // ply shallower with a null window first, and only searched in full
      // when it beats alpha after all.
      tuning.lmr && depth >= LMR_MIN_DEPTH && i >= LMR_MIN_INDEX && !inCheck && alpha > -KING_CAPTURE_FLOOR &&
      !m.captured && !m.promotion && !isKiller(state, ply, m) && !kingAttacked(nb, opp)
    ) {
      const r = i >= LMR_DEEP_INDEX && depth >= LMR_DEEP_DEPTH ? 2 : 1;
      v = -negamax(nb, depth - 1 - r, -alpha - 1, -alpha, opp, state, ply + 1, cm, ext, true);
      if (!Number.isNaN(v) && v > alpha) v = pvsChild(nb, depth, alpha, beta, opp, state, ply, cm, ext);
    } else if (i > 0 && tuning.pvs && alpha > -KING_CAPTURE_FLOOR && beta - alpha > 1) {
      v = pvsChild(nb, depth, alpha, beta, opp, state, ply, cm, ext);
    } else {
      v = -negamax(nb, depth - 1, -beta, -alpha, opp, state, ply + 1, cm, ext, true);
    }
    if (Number.isNaN(v)) return TIMEOUT_SENTINEL;
    if (v > best) {
      best = v;
      bestMove = m;
    }
    if (best > alpha) alpha = best;
    if (alpha >= beta) {
      recordCutoff(state, ply, m, depth);
      break;
    }
  }
  if (best === -Infinity) return evaluate(board, side, state.extended);

  if (t) {
    const i = lo & TT_MASK;
    if (t.age[i] !== state.age || t.depth[i] <= depth) {
      t.lo[i] = lo;
      t.hi[i] = hi;
      t.age[i] = state.age;
      t.depth[i] = depth;
      t.score[i] = toTT(best, ply);
      t.flag[i] = best <= alpha0 ? TT_UPPER : best >= beta ? TT_LOWER : TT_EXACT;
      t.move[i] = bestMove ? packMove(bestMove) : 0;
    }
  }
  return best;
}

// Principal variation search for a move after the first: a null window
// proves it is no better than alpha, which is usually true once the moves are
// well ordered, and only a move that beats alpha is searched again with the
// full window. Exact: it changes node counts, never a score.
function pvsChild(
  nb: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  opp: Color,
  state: SearchState,
  ply: number,
  cm: number,
  ext: number,
): number {
  let v = -negamax(nb, depth - 1, -alpha - 1, -alpha, opp, state, ply + 1, cm, ext, true);
  if (!Number.isNaN(v) && v > alpha && v < beta) {
    v = -negamax(nb, depth - 1, -beta, -alpha, opp, state, ply + 1, cm, ext, true);
  }
  return v;
}

// Quiescence search: only consider captures so the leaf eval isn't called on a
// position where the side to move can immediately win/lose major material.
// A side whose king is attacked does not stand pat: it searches every move,
// because in this game a king left in check is simply taken (P6). Counts
// against the same node cap as negamax; an over-cap subtree returns the NaN
// sentinel, which propagates up the recursion like any timeout.
function quiesce(
  board: BoardState,
  alpha: number,
  beta: number,
  side: Color,
  depth: number,
  state: SearchState,
  ply: number,
  spentMask: number,
): number {
  state.nodes++;
  if (state.nodeCap > 0 && state.nodes > state.nodeCap) return TIMEOUT_SENTINEL;
  scanKings(board);
  const wk = scanW;
  const bk = scanB;
  if (wk < 0) return side === "w" ? -(KING_CAPTURE_SCORE - ply) : KING_CAPTURE_SCORE - ply;
  if (bk < 0) return side === "b" ? -(KING_CAPTURE_SCORE - ply) : KING_CAPTURE_SCORE - ply;

  const opp: Color = side === "w" ? "b" : "w";
  const inCheck = depth > 0 && squareAttacked(board, side === "w" ? wk : bk, opp);
  const standPat = inCheck ? 0 : evaluate(board, side, state.extended);
  if (!inCheck) {
    if (standPat >= beta) return beta;
    if (alpha < standPat) alpha = standPat;
    if (depth === 0) return alpha;
  }

  // A buff-granted move can be a capture, so the augment step belongs here too
  // or the quiescence search still resolves the position as if the card were
  // not held.
  state.nodes += GEN_COST;
  const all = genMoves(board, state, ply, spentMask);
  const moves = orderMoves(inCheck ? all : all.filter((m) => m.captured));
  let best = -Infinity;
  for (const m of moves) {
    if (
      !inCheck && tuning.deltaPruning && m.captured && m.captured !== "k" && !m.promotion &&
      standPat + VAL[m.captured] + DELTA_MARGIN <= alpha
    ) {
      continue;
    }
    const nb = makeMove(board, m);
    const hangs = m.captured !== "k" && hangsKing(nb, side, side === "w" ? wk : bk, m);
    if (hangs) state.nodes++;
    const score = hangs
      ? -(KING_CAPTURE_SCORE - ply - 2)
      : -quiesce(nb, -beta, -alpha, opp, depth - 1, state, ply + 1, childMask(state, ply, m, spentMask));
    if (Number.isNaN(score)) return TIMEOUT_SENTINEL;
    if (score >= beta) return beta;
    if (score > best) best = score;
    if (score > alpha) alpha = score;
  }
  if (inCheck && best === -Infinity) return evaluate(board, side, state.extended);
  return alpha;
}

/** Internals for scripts/test-house-engine.ts; not part of the engine's API. */
export const engineInternals = {
  kingAttacked,
  positionHash,
  childHash(parent: BoardState, child: BoardState, m: Move, lo: number, hi: number): [number, number] {
    childHashInto(parent, child, m, lo, hi);
    return [hashLo, hashHi];
  },
  evaluate,
};
