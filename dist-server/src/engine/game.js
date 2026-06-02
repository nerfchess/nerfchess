"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newGame = newGame;
exports.makeContext = makeContext;
exports.applyTurnStart = applyTurnStart;
exports.legalMoves = legalMoves;
exports.checkLossConditions = checkLossConditions;
exports.playMove = playMove;
exports.currentHint = currentHint;
exports.resign = resign;
const board_1 = require("./board");
const rng_1 = require("./rng");
function emptyCounts() {
    return { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
}
function newGame(whiteDrawback, blackDrawback, seed) {
    const rng = new rng_1.RNG(seed);
    const wRng = rng.fork();
    const bRng = rng.fork();
    const board = (0, board_1.initialBoard)();
    const white = {
        drawback: whiteDrawback,
        state: whiteDrawback.init ? whiteDrawback.init(wRng, "w") : {},
        color: "w",
        rng: wRng,
    };
    const black = {
        drawback: blackDrawback,
        state: blackDrawback.init ? blackDrawback.init(bRng, "b") : {},
        color: "b",
        rng: bRng,
    };
    const game = {
        board,
        white,
        black,
        result: null,
        startedAt: Date.now(),
        captured: { w: emptyCounts(), b: emptyCounts() },
    };
    // Run onTurnStart for the first player
    applyTurnStart(game);
    return game;
}
function makeContext(game, color) {
    const me = color === "w" ? game.white : game.black;
    const opp = color === "w" ? game.black : game.white;
    // count moves I've made
    const moveNumber = game.board.history.filter((m) => m.color === color).length;
    const myLast = [...game.board.history].reverse().find((m) => m.color === color) ?? null;
    const oppLast = [...game.board.history].reverse().find((m) => m.color !== color) ?? null;
    return {
        board: game.board,
        me: color,
        opponentLastMove: oppLast,
        myLastMove: myLast,
        moveNumber,
        capturedByMe: game.captured[color],
        capturedFromMe: game.captured[color === "w" ? "b" : "w"],
    };
}
function applyTurnStart(game) {
    const slot = game.board.turn === "w" ? game.white : game.black;
    if (slot.drawback.onTurnStart) {
        const ctx = makeContext(game, slot.color);
        slot.state = slot.drawback.onTurnStart(slot.state, ctx, slot.rng);
    }
}
function legalMoves(game) {
    if (game.result)
        return [];
    const all = (0, board_1.generateMoves)(game.board);
    const slot = game.board.turn === "w" ? game.white : game.black;
    if (!slot.drawback.filterMoves)
        return all;
    const ctx = makeContext(game, slot.color);
    return slot.drawback.filterMoves(all, slot.state, ctx);
}
function checkLossConditions(game) {
    // King capture check first
    const captured = (0, board_1.kingCaptured)(game.board);
    if (captured) {
        return { winner: captured === "w" ? "b" : "w", reason: "king captured" };
    }
    for (const color of ["w", "b"]) {
        const slot = color === "w" ? game.white : game.black;
        if (!slot.drawback.checkLoss)
            continue;
        const ctx = makeContext(game, color);
        const res = slot.drawback.checkLoss(slot.state, ctx);
        if (res) {
            return { winner: color === "w" ? "b" : "w", reason: `${slot.drawback.name}: ${res.reason}` };
        }
    }
    return null;
}
function playMove(game, move) {
    if (game.result)
        return game;
    if (move.captured) {
        game.captured[move.color][move.captured] += 1;
    }
    game.board = (0, board_1.makeMove)(game.board, move);
    // Check loss conditions
    const result = checkLossConditions(game);
    if (result) {
        game.result = result;
        return game;
    }
    // No moves available = loss for side to move (king will be captured)
    const slot = game.board.turn === "w" ? game.white : game.black;
    // Apply onTurnStart for the new mover BEFORE legal-move evaluation
    applyTurnStart(game);
    const moves = legalMoves(game);
    if (moves.length === 0) {
        game.result = {
            winner: game.board.turn === "w" ? "b" : "w",
            reason: "no legal moves",
        };
    }
    return game;
}
function currentHint(game, color) {
    const slot = color === "w" ? game.white : game.black;
    if (!slot.drawback.hint)
        return null;
    if (game.result || game.board.turn !== color)
        return null;
    const ctx = makeContext(game, color);
    return slot.drawback.hint(slot.state, ctx, legalMoves(game));
}
function resign(game, color) {
    if (game.result)
        return game;
    game.result = { winner: color === "w" ? "b" : "w", reason: "resignation" };
    return game;
}
