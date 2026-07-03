import { findKing, generateMoves, makeMove } from "./board";
import { NerfGame, legalMoves } from "./game";
import { triggersOwnNerfLoss } from "./moveSafety";
import { BoardState, Color, Move, PieceType } from "./types";

// A move is self-losing if it trips our own nerf's checkLoss on the resulting board.
const isSelfLosing = triggersOwnNerfLoss;

const VAL: Record<PieceType, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// Piece-square tables — white's perspective, indexed by sq (rank 0 = white's back rank).
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

function evaluate(board: BoardState, me: Color): number {
  let score = 0;
  for (let sq = 0; sq < 64; sq++) {
    const p = board.pieces[sq];
    if (!p) continue;
    const idx = p.color === "w" ? sq : sq ^ 56;
    const v = VAL[p.type] + PST[p.type][idx];
    score += p.color === me ? v : -v;
  }
  return score;
}

function sameMove(a: Move, b: Move): boolean {
  return a.from === b.from && a.to === b.to && (a.promotion ?? null) === (b.promotion ?? null);
}

// Per-search ordering memory. Killer moves are quiet moves that caused a beta
// cutoff at the same ply; the history table counts cutoffs per from/to square
// pair. Both make alpha-beta prune far more of the tree within the same time
// budget, which is where most of the engine's strength comes from.
type SearchState = {
  killers: (Move | null)[][];
  history: Int32Array;
};

function newSearchState(): SearchState {
  return { killers: [], history: new Int32Array(64 * 64) };
}

// MVV-LVA for captures (most valuable victim taken by least valuable attacker
// first), then killers, then quiet moves by history score. An optional
// priority move (the PV move from the previous iteration) sorts before all.
function orderMoves(moves: Move[], priority?: Move | null, state?: SearchState, ply?: number): Move[] {
  const killers = state && ply != null ? state.killers[ply] : undefined;
  const scored = moves.map((m) => {
    let s = 0;
    if (m.captured) s = 1_000_000 + VAL[m.captured] * 10 - VAL[m.piece];
    else if (killers?.[0] && sameMove(m, killers[0])) s = 900_000;
    else if (killers?.[1] && sameMove(m, killers[1])) s = 800_000;
    else if (state) s = state.history[m.from * 64 + m.to];
    if (m.promotion) s += VAL[m.promotion];
    if (priority && sameMove(m, priority)) s += 100_000_000;
    return { m, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.m);
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

export type AILevel = "easy" | "medium" | "hard";

// Time budgets per difficulty: the search runs iterative-deepening until it
// either finishes the cap depth or exceeds the budget, whichever comes first.
const TIME_BUDGET_MS: Record<AILevel, number> = { easy: 0, medium: 900, hard: 2000 };
const MAX_DEPTH: Record<AILevel, number> = { easy: 1, medium: 5, hard: 8 };

// Randomness added to easy's one-ply evaluation, in centipawns. Enough to vary
// its play and misjudge quiet positions, small enough that it still grabs
// hanging material instead of moving at random.
const EASY_NOISE = 60;

export function pickAIMove(game: NerfGame, level: AILevel): Move | null {
  const all = legalMoves(game);
  if (!all.length) return null;
  const safe = all.filter((m) => !isSelfLosing(game, m));
  const moves = safe.length ? safe : all;

  const me = game.board.turn;

  if (level === "easy") {
    // Greedy one-ply search: take the move with the best immediate evaluation,
    // with noise. No lookahead, so it still walks into tactics.
    let best: Move | null = null;
    let bestScore = -Infinity;
    for (const m of moves) {
      const score = evaluate(makeMove(game.board, m), me) + Math.random() * EASY_NOISE;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best ?? moves[0];
  }

  const opp: Color = me === "w" ? "b" : "w";
  const budget = TIME_BUDGET_MS[level];
  const maxDepth = MAX_DEPTH[level];
  const start = Date.now();
  const state = newSearchState();

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

    for (const m of orderMoves(moves, bestMove, state, 0)) {
      const nb = makeMove(game.board, m);
      const score = -negamax(nb, d - 1, -beta, -alpha, opp, me, start, budget, state, 1);
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

    if (!timedOut && depthBest) bestMove = depthBest;

    // After depth 1 has run, respect the time budget.
    if (d >= 1 && Date.now() - start > budget) break;
  }

  return bestMove ?? moves[0];
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
  root: Color,
  start: number,
  budget: number,
  state: SearchState,
  ply: number,
): number {
  if (budget > 0 && Date.now() - start > budget * 2) return TIMEOUT_SENTINEL;

  const wk = findKing(board, "w");
  const bk = findKing(board, "b");
  if (wk == null) return side === root ? -100000 : 100000;
  if (bk == null) return side === root ? 100000 : -100000;
  if (depth === 0) return quiesce(board, alpha, beta, side, 6);

  const moves = orderMoves(generateMoves(board), null, state, ply);
  const opp: Color = side === "w" ? "b" : "w";
  let best = -Infinity;
  for (const m of moves) {
    const nb = makeMove(board, m);
    const v = -negamax(nb, depth - 1, -beta, -alpha, opp, root, start, budget, state, ply + 1);
    if (Number.isNaN(v)) return TIMEOUT_SENTINEL;
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) {
      recordCutoff(state, ply, m, depth);
      break;
    }
  }
  if (best === -Infinity) return evaluate(board, side);
  return best;
}

// Quiescence search: only consider captures so the leaf eval isn't called on a
// position where the side to move can immediately win/lose major material.
function quiesce(
  board: BoardState,
  alpha: number,
  beta: number,
  side: Color,
  depth: number,
): number {
  const wk = findKing(board, "w");
  const bk = findKing(board, "b");
  if (wk == null) return side === "w" ? -100000 : 100000;
  if (bk == null) return side === "b" ? -100000 : 100000;

  const standPat = evaluate(board, side);
  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;
  if (depth === 0) return alpha;

  const captures = orderMoves(generateMoves(board).filter((m) => m.captured));
  const opp: Color = side === "w" ? "b" : "w";
  for (const m of captures) {
    const nb = makeMove(board, m);
    const score = -quiesce(nb, -beta, -alpha, opp, depth - 1);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}
