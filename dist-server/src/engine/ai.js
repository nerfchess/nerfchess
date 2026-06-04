"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickAIMove = pickAIMove;
const board_1 = require("./board");
const game_1 = require("./game");
// A move is self-losing if making it (a) lets the opponent capture our king for free
// next ply, or (b) trips our own nerf's checkLoss on the resulting board.
function isSelfLosing(game, move) {
    const me = game.board.turn;
    const slot = me === "w" ? game.white : game.black;
    const nb = (0, board_1.makeMove)(game.board, move);
    if (slot.nerf.checkLoss) {
        const ctx = {
            board: nb,
            me,
            opponentLastMove: game.board.history[game.board.history.length - 1] ?? null,
            myLastMove: move,
            moveNumber: nb.history.filter((m) => m.color === me).length,
            capturedByMe: game.captured[me],
            capturedFromMe: game.captured[me === "w" ? "b" : "w"],
        };
        if (slot.nerf.checkLoss(slot.state, ctx))
            return true;
    }
    return false;
}
const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
// Piece-square tables — white's perspective, indexed by sq (rank 0 = white's back rank).
// Black uses `sq ^ 56` to mirror vertically. Values adapted from Chess Programming
// Wiki's simplified evaluation function.
const PST = {
    p: [
        0, 0, 0, 0, 0, 0, 0, 0,
        5, 10, 10, -20, -20, 10, 10, 5,
        5, -5, -10, 0, 0, -10, -5, 5,
        0, 0, 0, 20, 20, 0, 0, 0,
        5, 5, 10, 25, 25, 10, 5, 5,
        10, 10, 20, 30, 30, 20, 10, 10,
        50, 50, 50, 50, 50, 50, 50, 50,
        0, 0, 0, 0, 0, 0, 0, 0,
    ],
    n: [
        -50, -40, -30, -30, -30, -30, -40, -50,
        -40, -20, 0, 5, 5, 0, -20, -40,
        -30, 5, 10, 15, 15, 10, 5, -30,
        -30, 0, 15, 20, 20, 15, 0, -30,
        -30, 5, 15, 20, 20, 15, 5, -30,
        -30, 0, 10, 15, 15, 10, 0, -30,
        -40, -20, 0, 0, 0, 0, -20, -40,
        -50, -40, -30, -30, -30, -30, -40, -50,
    ],
    b: [
        -20, -10, -10, -10, -10, -10, -10, -20,
        -10, 5, 0, 0, 0, 0, 5, -10,
        -10, 10, 10, 10, 10, 10, 10, -10,
        -10, 0, 10, 10, 10, 10, 0, -10,
        -10, 5, 5, 10, 10, 5, 5, -10,
        -10, 0, 5, 10, 10, 5, 0, -10,
        -10, 0, 0, 0, 0, 0, 0, -10,
        -20, -10, -10, -10, -10, -10, -10, -20,
    ],
    r: [
        0, 0, 0, 5, 5, 0, 0, 0,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        5, 10, 10, 10, 10, 10, 10, 5,
        0, 0, 0, 0, 0, 0, 0, 0,
    ],
    q: [
        -20, -10, -10, -5, -5, -10, -10, -20,
        -10, 0, 5, 0, 0, 0, 0, -10,
        -10, 5, 5, 5, 5, 5, 0, -10,
        0, 0, 5, 5, 5, 5, 0, -5,
        -5, 0, 5, 5, 5, 5, 0, -5,
        -10, 0, 5, 5, 5, 5, 0, -10,
        -10, 0, 0, 0, 0, 0, 0, -10,
        -20, -10, -10, -5, -5, -10, -10, -20,
    ],
    k: [
        20, 30, 10, 0, 0, 10, 30, 20,
        20, 20, 0, 0, 0, 0, 20, 20,
        -10, -20, -20, -20, -20, -20, -20, -10,
        -20, -30, -30, -40, -40, -30, -30, -20,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
    ],
};
function evaluate(board, me) {
    let score = 0;
    for (let sq = 0; sq < 64; sq++) {
        const p = board.pieces[sq];
        if (!p)
            continue;
        const idx = p.color === "w" ? sq : sq ^ 56;
        const v = VAL[p.type] + PST[p.type][idx];
        score += p.color === me ? v : -v;
    }
    return score;
}
function sameMove(a, b) {
    return a.from === b.from && a.to === b.to && (a.promotion ?? null) === (b.promotion ?? null);
}
// MVV-LVA — most valuable victim taken by least valuable attacker is best.
// Optional priority move (e.g., PV move from prior iteration) sorts first.
function orderMoves(moves, priority) {
    const scored = moves.map((m) => {
        let s = m.captured ? VAL[m.captured] * 10 - VAL[m.piece] : 0;
        if (m.promotion)
            s += VAL[m.promotion];
        if (priority && sameMove(m, priority))
            s += 1000000;
        return { m, s };
    });
    scored.sort((a, b) => b.s - a.s);
    return scored.map((x) => x.m);
}
// Time budgets per difficulty — the search runs iterative-deepening until it
// either finishes the cap depth or exceeds the budget, whichever comes first.
const TIME_BUDGET_MS = { easy: 0, medium: 700, hard: 1600 };
const MAX_DEPTH = { easy: 1, medium: 4, hard: 6 };
function pickAIMove(game, level) {
    const all = (0, game_1.legalMoves)(game);
    if (!all.length)
        return null;
    const safe = all.filter((m) => !isSelfLosing(game, m));
    const moves = safe.length ? safe : all;
    if (level === "easy") {
        const caps = moves.filter((m) => m.captured);
        const pool = caps.length ? caps : moves;
        return pool[Math.floor(Math.random() * pool.length)];
    }
    const me = game.board.turn;
    const opp = me === "w" ? "b" : "w";
    const budget = TIME_BUDGET_MS[level];
    const maxDepth = MAX_DEPTH[level];
    const start = Date.now();
    let bestMove = null;
    // Iterative deepening: search depth 1, 2, 3, ... up to maxDepth. The best move
    // from each completed depth is the first one tried at the next depth, which
    // dramatically improves alpha-beta cutoffs.
    for (let d = 1; d <= maxDepth; d++) {
        let depthBest = null;
        let depthBestScore = -Infinity;
        let alpha = -Infinity;
        const beta = Infinity;
        let timedOut = false;
        for (const m of orderMoves(moves, bestMove)) {
            const nb = (0, board_1.makeMove)(game.board, m);
            const score = -negamax(nb, d - 1, -beta, -alpha, opp, me, start, budget);
            if (score === TIMEOUT_SENTINEL) {
                timedOut = true;
                break;
            }
            if (score > depthBestScore) {
                depthBestScore = score;
                depthBest = m;
            }
            if (score > alpha)
                alpha = score;
        }
        if (!timedOut && depthBest)
            bestMove = depthBest;
        // After depth 1 has run, respect the time budget.
        if (d >= 1 && Date.now() - start > budget)
            break;
    }
    return bestMove ?? moves[0];
}
const TIMEOUT_SENTINEL = Number.NEGATIVE_INFINITY + 1;
function negamax(board, depth, alpha, beta, side, root, start, budget) {
    if (budget > 0 && Date.now() - start > budget * 2)
        return TIMEOUT_SENTINEL;
    const wk = (0, board_1.findKing)(board, "w");
    const bk = (0, board_1.findKing)(board, "b");
    if (!wk)
        return side === root ? -100000 : 100000;
    if (!bk)
        return side === root ? 100000 : -100000;
    if (depth === 0)
        return quiesce(board, alpha, beta, side, 6);
    const moves = orderMoves((0, board_1.generateMoves)(board));
    const opp = side === "w" ? "b" : "w";
    let best = -Infinity;
    for (const m of moves) {
        const nb = (0, board_1.makeMove)(board, m);
        const v = -negamax(nb, depth - 1, -beta, -alpha, opp, root, start, budget);
        if (v === -TIMEOUT_SENTINEL)
            return TIMEOUT_SENTINEL;
        if (v > best)
            best = v;
        if (best > alpha)
            alpha = best;
        if (alpha >= beta)
            break;
    }
    if (best === -Infinity)
        return evaluate(board, side);
    return best;
}
// Quiescence search: only consider captures so the leaf eval isn't called on a
// position where the side to move can immediately win/lose major material.
function quiesce(board, alpha, beta, side, depth) {
    const wk = (0, board_1.findKing)(board, "w");
    const bk = (0, board_1.findKing)(board, "b");
    if (!wk)
        return side === "w" ? -100000 : 100000;
    if (!bk)
        return side === "b" ? -100000 : 100000;
    const standPat = evaluate(board, side);
    if (standPat >= beta)
        return beta;
    if (alpha < standPat)
        alpha = standPat;
    if (depth === 0)
        return alpha;
    const captures = orderMoves((0, board_1.generateMoves)(board).filter((m) => m.captured));
    const opp = side === "w" ? "b" : "w";
    for (const m of captures) {
        const nb = (0, board_1.makeMove)(board, m);
        const score = -quiesce(nb, -beta, -alpha, opp, depth - 1);
        if (score >= beta)
            return beta;
        if (score > alpha)
            alpha = score;
    }
    return alpha;
}
