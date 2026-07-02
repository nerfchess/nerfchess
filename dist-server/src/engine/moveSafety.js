"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggersOwnNerfLoss = triggersOwnNerfLoss;
exports.evaluateMoveRisk = evaluateMoveRisk;
exports.moveRiskKey = moveRiskKey;
exports.computeMoveRisks = computeMoveRisks;
const board_1 = require("./board");
const game_1 = require("./game");
// True if making `move` would immediately trip the mover's own nerf's
// checkLoss condition on the resulting position — i.e. the same check the
// real game engine runs right after every move in checkLossConditions().
function triggersOwnNerfLoss(game, move) {
    const me = game.board.turn;
    const slot = me === "w" ? game.white : game.black;
    if (!slot.nerf.checkLoss)
        return false;
    const nextBoard = (0, board_1.makeMove)(game.board, move);
    const ctx = (0, game_1.makeContext)({ ...game, board: nextBoard }, me);
    return !!slot.nerf.checkLoss(slot.state, ctx);
}
// Classifies a legal move so the UI can warn before it's played: "check" if
// it leaves/moves the mover's own king in check (kings aren't auto-protected
// in this variant — see board.ts), "nerf" if it would trip the mover's own
// drawback loss condition on the resulting position.
function evaluateMoveRisk(game, move) {
    const me = game.board.turn;
    const nextBoard = (0, board_1.makeMove)(game.board, move);
    if ((0, board_1.isInCheck)(nextBoard, me))
        return "check";
    if (triggersOwnNerfLoss(game, move))
        return "nerf";
    return null;
}
function moveRiskKey(m) {
    return `${m.from}-${m.to}-${m.promotion ?? ""}`;
}
function computeMoveRisks(game, moves) {
    const out = new Map();
    for (const m of moves)
        out.set(moveRiskKey(m), evaluateMoveRisk(game, m));
    return out;
}
