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

// Extended terms (hard only): bishop pair and doubled-pawn structure. Cheap
// enough to compute inside the same board scan, and enough to give the hard
// bot visibly better piece-trade and pawn-structure judgement.
const BISHOP_PAIR_BONUS = 40;
const DOUBLED_PAWN_PENALTY = 18;

function evaluate(board: BoardState, me: Color, extended = false): number {
  let score = 0;
  let wBishops = 0;
  let bBishops = 0;
  // Pawn counts per file, white in [0..7], black in [8..15].
  const pawnFiles = extended ? new Uint8Array(16) : null;
  for (let sq = 0; sq < 64; sq++) {
    const p = board.pieces[sq];
    if (!p) continue;
    const idx = p.color === "w" ? sq : sq ^ 56;
    const v = VAL[p.type] + PST[p.type][idx];
    score += p.color === me ? v : -v;
    if (extended) {
      if (p.type === "b") {
        if (p.color === "w") wBishops++;
        else bBishops++;
      } else if (p.type === "p") {
        pawnFiles![(p.color === "w" ? 0 : 8) + (sq & 7)]++;
      }
    }
  }
  if (extended) {
    let bonus = 0;
    if (wBishops >= 2) bonus += me === "w" ? BISHOP_PAIR_BONUS : -BISHOP_PAIR_BONUS;
    if (bBishops >= 2) bonus += me === "b" ? BISHOP_PAIR_BONUS : -BISHOP_PAIR_BONUS;
    for (let f = 0; f < 8; f++) {
      const wExtra = Math.max(0, pawnFiles![f] - 1);
      const bExtra = Math.max(0, pawnFiles![8 + f] - 1);
      bonus -= (me === "w" ? wExtra - bExtra : bExtra - wExtra) * DOUBLED_PAWN_PENALTY;
    }
    score += bonus;
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
  // Whether leaf evaluation uses the extended terms (hard only).
  extended: boolean;
};

function newSearchState(extended: boolean): SearchState {
  return { killers: [], history: new Int32Array(64 * 64), extended };
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

// Per-difficulty playing profile. The three levels are deliberately far
// apart so the difference is obvious within a few games:
// - easy:   one-ply greedy with heavy evaluation noise plus outright random
//           moves — grabs free material sometimes, but regularly overlooks
//           captures and walks into simple tactics. Beginner level.
// - medium: shallow but sound alpha-beta (3 plies + quiescence) — plays
//           solid moves, sees basic tactics, avoids hanging pieces outright,
//           misses deeper combinations. Casual-player level.
// - hard:   deep iterative-deepening search with a richer evaluation and no
//           noise — finds multi-move tactics consistently.
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

const LEVELS: Record<AILevel, LevelProfile> = {
  easy: { maxDepth: 1, budgetMs: 0, rootNoise: 120, blunderChance: 0.22, extendedEval: false },
  medium: { maxDepth: 3, budgetMs: 700, rootNoise: 0, blunderChance: 0, extendedEval: false },
  hard: { maxDepth: 12, budgetMs: 2000, rootNoise: 0, blunderChance: 0, extendedEval: true },
};

// Search budget for a level, capped to a slice of the bot's remaining clock
// so the bot spends time like a human player and can never think its whole
// bank away in fast time controls.
export function aiBudgetMs(level: AILevel, remainingClockMs?: number): number {
  const base = LEVELS[level].budgetMs;
  if (remainingClockMs == null) return base;
  return Math.max(60, Math.min(base || 300, remainingClockMs / 10));
}

// `overrideBudgetMs` caps the search time regardless of level, used by the
// game server's house players so a bot-vs-bot move never blocks the (single
// threaded) Durable Object long enough to stall live sockets or the lobby,
// and by the client so the bot's thinking never exceeds its remaining clock.
export function pickAIMove(game: NerfGame, level: AILevel, overrideBudgetMs?: number): Move | null {
  const all = legalMoves(game);
  if (!all.length) return null;
  const safe = all.filter((m) => !isSelfLosing(game, m));
  const moves = safe.length ? safe : all;

  const me = game.board.turn;
  const cfg = LEVELS[level];

  if (cfg.blunderChance > 0 && Math.random() < cfg.blunderChance) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if (level === "easy") {
    // Greedy one-ply search: take the move with the best immediate evaluation,
    // with heavy noise. No lookahead, so it still walks into tactics.
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

  const opp: Color = me === "w" ? "b" : "w";
  const budget = overrideBudgetMs ?? cfg.budgetMs;
  const maxDepth = cfg.maxDepth;
  const start = Date.now();
  const state = newSearchState(cfg.extendedEval);

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
      const score = -negamax(nb, d - 1, -beta, -alpha, opp, start, budget, state, 1);
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
  start: number,
  budget: number,
  state: SearchState,
  ply: number,
): number {
  if (budget > 0 && Date.now() - start > budget * 2) return TIMEOUT_SENTINEL;

  // Terminal king captures score from the side to move's perspective (like
  // quiesce below). Scoring them relative to the search root inverted the
  // signs whenever the engine played black, poisoning every deep search.
  const wk = findKing(board, "w");
  const bk = findKing(board, "b");
  if (wk == null) return side === "w" ? -100000 : 100000;
  if (bk == null) return side === "b" ? -100000 : 100000;
  if (depth === 0) return quiesce(board, alpha, beta, side, 6, state.extended);

  const moves = orderMoves(generateMoves(board), null, state, ply);
  const opp: Color = side === "w" ? "b" : "w";
  let best = -Infinity;
  for (const m of moves) {
    const nb = makeMove(board, m);
    const v = -negamax(nb, depth - 1, -beta, -alpha, opp, start, budget, state, ply + 1);
    if (Number.isNaN(v)) return TIMEOUT_SENTINEL;
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) {
      recordCutoff(state, ply, m, depth);
      break;
    }
  }
  if (best === -Infinity) return evaluate(board, side, state.extended);
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
  extended = false,
): number {
  const wk = findKing(board, "w");
  const bk = findKing(board, "b");
  if (wk == null) return side === "w" ? -100000 : 100000;
  if (bk == null) return side === "b" ? -100000 : 100000;

  const standPat = evaluate(board, side, extended);
  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;
  if (depth === 0) return alpha;

  const captures = orderMoves(generateMoves(board).filter((m) => m.captured));
  const opp: Color = side === "w" ? "b" : "w";
  for (const m of captures) {
    const nb = makeMove(board, m);
    const score = -quiesce(nb, -beta, -alpha, opp, depth - 1, extended);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}
