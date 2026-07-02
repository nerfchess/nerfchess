"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialBoard = initialBoard;
exports.cloneBoard = cloneBoard;
exports.attackedBy = attackedBy;
exports.findKing = findKing;
exports.isInCheck = isInCheck;
exports.generateMoves = generateMoves;
exports.makeMove = makeMove;
exports.kingCaptured = kingCaptured;
exports.moveToUCI = moveToUCI;
exports.moveToSAN = moveToSAN;
const types_1 = require("./types");
function initialBoard() {
    const pieces = Array(64).fill(null);
    const back = ["r", "n", "b", "q", "k", "b", "n", "r"];
    for (let f = 0; f < 8; f++) {
        pieces[(0, types_1.SQ)(f, 0)] = { type: back[f], color: "w" };
        pieces[(0, types_1.SQ)(f, 1)] = { type: "p", color: "w" };
        pieces[(0, types_1.SQ)(f, 6)] = { type: "p", color: "b" };
        pieces[(0, types_1.SQ)(f, 7)] = { type: back[f], color: "b" };
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
function cloneBoard(b) {
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
function attackedBy(board, color) {
    const attacked = new Set();
    for (let sq = 0; sq < 64; sq++) {
        const p = board.pieces[sq];
        if (!p || p.color !== color)
            continue;
        const f = (0, types_1.FILE)(sq), r = (0, types_1.RANK)(sq);
        switch (p.type) {
            case "p": {
                const dir = color === "w" ? 1 : -1;
                for (const df of [-1, 1]) {
                    const nf = f + df, nr = r + dir;
                    if ((0, types_1.inBoard)(nf, nr))
                        attacked.add((0, types_1.SQ)(nf, nr));
                }
                break;
            }
            case "n":
                for (const [df, dr] of KNIGHT_OFFSETS) {
                    const nf = f + df, nr = r + dr;
                    if ((0, types_1.inBoard)(nf, nr))
                        attacked.add((0, types_1.SQ)(nf, nr));
                }
                break;
            case "k":
                for (const [df, dr] of KING_DIRS) {
                    const nf = f + df, nr = r + dr;
                    if ((0, types_1.inBoard)(nf, nr))
                        attacked.add((0, types_1.SQ)(nf, nr));
                }
                break;
            default: {
                const dirs = p.type === "b" ? BISHOP_DIRS :
                    p.type === "r" ? ROOK_DIRS :
                        [...BISHOP_DIRS, ...ROOK_DIRS];
                for (const [df, dr] of dirs) {
                    let nf = f + df, nr = r + dr;
                    while ((0, types_1.inBoard)(nf, nr)) {
                        const tsq = (0, types_1.SQ)(nf, nr);
                        attacked.add(tsq);
                        if (board.pieces[tsq])
                            break;
                        nf += df;
                        nr += dr;
                    }
                }
            }
        }
    }
    return attacked;
}
function findKing(board, color) {
    for (let sq = 0; sq < 64; sq++) {
        const p = board.pieces[sq];
        if (p && p.type === "k" && p.color === color)
            return sq;
    }
    return null;
}
function isInCheck(board, color) {
    const ks = findKing(board, color);
    if (ks == null)
        return false;
    return attackedBy(board, color === "w" ? "b" : "w").has(ks);
}
/**
 * Generate all pseudo-legal moves for the side to move.
 * In Nerf Chess, kings CAN move into check, castle through check, etc.
 */
function generateMoves(board) {
    const moves = [];
    const me = board.turn;
    const opp = me === "w" ? "b" : "w";
    for (let sq = 0; sq < 64; sq++) {
        const p = board.pieces[sq];
        if (!p || p.color !== me)
            continue;
        const f = (0, types_1.FILE)(sq), r = (0, types_1.RANK)(sq);
        const add = (to, extra = {}) => {
            const target = board.pieces[to];
            const move = {
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
                if ((0, types_1.inBoard)(f, oneR)) {
                    const oneSq = (0, types_1.SQ)(f, oneR);
                    if (!board.pieces[oneSq]) {
                        if (oneR === promoRank) {
                            for (const promo of ["q", "r", "b", "n"]) {
                                add(oneSq, { promotion: promo });
                            }
                        }
                        else {
                            add(oneSq);
                            // two squares
                            if (r === startRank) {
                                const twoR = r + 2 * dir;
                                const twoSq = (0, types_1.SQ)(f, twoR);
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
                    if (!(0, types_1.inBoard)(nf, nr))
                        continue;
                    const tsq = (0, types_1.SQ)(nf, nr);
                    const tp = board.pieces[tsq];
                    if (tp && tp.color === opp) {
                        if (nr === promoRank) {
                            for (const promo of ["q", "r", "b", "n"]) {
                                add(tsq, { promotion: promo });
                            }
                        }
                        else {
                            add(tsq);
                        }
                    }
                    else if (board.epTarget === tsq) {
                        const capSq = (0, types_1.SQ)(nf, r);
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
                    if (!(0, types_1.inBoard)(nf, nr))
                        continue;
                    const tsq = (0, types_1.SQ)(nf, nr);
                    const tp = board.pieces[tsq];
                    if (!tp || tp.color === opp)
                        add(tsq);
                }
                break;
            case "k": {
                for (const [df, dr] of KING_DIRS) {
                    const nf = f + df, nr = r + dr;
                    if (!(0, types_1.inBoard)(nf, nr))
                        continue;
                    const tsq = (0, types_1.SQ)(nf, nr);
                    const tp = board.pieces[tsq];
                    if (!tp || tp.color === opp)
                        add(tsq);
                }
                // castling; in nerf chess, can castle through/into/out of check
                const homeR = me === "w" ? 0 : 7;
                if (r === homeR && f === 4) {
                    const ck = me === "w" ? board.castling.wk : board.castling.bk;
                    const cq = me === "w" ? board.castling.wq : board.castling.bq;
                    if (ck && !board.pieces[(0, types_1.SQ)(5, homeR)] && !board.pieces[(0, types_1.SQ)(6, homeR)]) {
                        const rookSq = (0, types_1.SQ)(7, homeR);
                        const rook = board.pieces[rookSq];
                        if (rook && rook.type === "r" && rook.color === me) {
                            add((0, types_1.SQ)(6, homeR), { castle: "k" });
                        }
                    }
                    if (cq &&
                        !board.pieces[(0, types_1.SQ)(1, homeR)] &&
                        !board.pieces[(0, types_1.SQ)(2, homeR)] &&
                        !board.pieces[(0, types_1.SQ)(3, homeR)]) {
                        const rookSq = (0, types_1.SQ)(0, homeR);
                        const rook = board.pieces[rookSq];
                        if (rook && rook.type === "r" && rook.color === me) {
                            add((0, types_1.SQ)(2, homeR), { castle: "q" });
                        }
                    }
                }
                break;
            }
            default: {
                const dirs = p.type === "b" ? BISHOP_DIRS :
                    p.type === "r" ? ROOK_DIRS :
                        [...BISHOP_DIRS, ...ROOK_DIRS];
                for (const [df, dr] of dirs) {
                    let nf = f + df, nr = r + dr;
                    while ((0, types_1.inBoard)(nf, nr)) {
                        const tsq = (0, types_1.SQ)(nf, nr);
                        const tp = board.pieces[tsq];
                        if (!tp) {
                            add(tsq);
                        }
                        else {
                            if (tp.color === opp)
                                add(tsq);
                            break;
                        }
                        nf += df;
                        nr += dr;
                    }
                }
            }
        }
    }
    return moves;
}
function makeMove(board, move) {
    const nb = cloneBoard(board);
    const piece = nb.pieces[move.from];
    // Safety guard: never allow "self-capture" (should be impossible for legal moves,
    // but can happen due to UI/premove timing bugs). If it does, treat it as a no-op.
    const capSq = move.capturedSquare != null ? move.capturedSquare : (move.captured ? move.to : null);
    if (capSq != null) {
        const capPiece = nb.pieces[capSq];
        if (capPiece && capPiece.color === piece.color) {
            return board;
        }
    }
    if (move.capturedSquare == null && nb.pieces[move.to] && nb.pieces[move.to].color === piece.color) {
        return board;
    }
    // Remove any captured piece first (handles en passant / king en passant)
    if (move.capturedSquare != null) {
        nb.pieces[move.capturedSquare] = null;
    }
    else if (nb.pieces[move.to]) {
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
            nb.pieces[(0, types_1.SQ)(5, homeR)] = nb.pieces[(0, types_1.SQ)(7, homeR)];
            nb.pieces[(0, types_1.SQ)(7, homeR)] = null;
        }
        else {
            nb.pieces[(0, types_1.SQ)(3, homeR)] = nb.pieces[(0, types_1.SQ)(0, homeR)];
            nb.pieces[(0, types_1.SQ)(0, homeR)] = null;
        }
    }
    // Update castling rights
    if (piece.type === "k") {
        if (piece.color === "w") {
            nb.castling.wk = false;
            nb.castling.wq = false;
        }
        else {
            nb.castling.bk = false;
            nb.castling.bq = false;
        }
    }
    if (piece.type === "r") {
        if (move.from === (0, types_1.SQ)(0, 0))
            nb.castling.wq = false;
        if (move.from === (0, types_1.SQ)(7, 0))
            nb.castling.wk = false;
        if (move.from === (0, types_1.SQ)(0, 7))
            nb.castling.bq = false;
        if (move.from === (0, types_1.SQ)(7, 7))
            nb.castling.bk = false;
    }
    if (move.captured === "r") {
        if (move.capturedSquare === (0, types_1.SQ)(0, 0))
            nb.castling.wq = false;
        if (move.capturedSquare === (0, types_1.SQ)(7, 0))
            nb.castling.wk = false;
        if (move.capturedSquare === (0, types_1.SQ)(0, 7))
            nb.castling.bq = false;
        if (move.capturedSquare === (0, types_1.SQ)(7, 7))
            nb.castling.bk = false;
    }
    // En passant target
    nb.epTarget = null;
    if (move.isDoublePawn) {
        nb.epTarget = (move.from + move.to) >> 1;
    }
    nb.turn = piece.color === "w" ? "b" : "w";
    if (piece.color === "b")
        nb.fullmove++;
    nb.halfmove = piece.type === "p" || move.captured ? 0 : nb.halfmove + 1;
    nb.history.push(move);
    return nb;
}
function kingCaptured(board) {
    // Returns color of the king that was captured (i.e. is missing).
    const w = findKing(board, "w");
    const b = findKing(board, "b");
    if (!w)
        return "w";
    if (!b)
        return "b";
    return null;
}
function moveToUCI(m) {
    const files = "abcdefgh";
    const a = files[(0, types_1.FILE)(m.from)] + ((0, types_1.RANK)(m.from) + 1);
    const b = files[(0, types_1.FILE)(m.to)] + ((0, types_1.RANK)(m.to) + 1);
    return a + b + (m.promotion ?? "");
}
function moveToSAN(m) {
    const files = "abcdefgh";
    const dest = files[(0, types_1.FILE)(m.to)] + ((0, types_1.RANK)(m.to) + 1);
    if (m.castle === "k")
        return "O-O";
    if (m.castle === "q")
        return "O-O-O";
    let s = "";
    if (m.piece !== "p")
        s += m.piece.toUpperCase();
    if (m.captured) {
        if (m.piece === "p")
            s += files[(0, types_1.FILE)(m.from)];
        s += "x";
    }
    s += dest;
    if (m.promotion)
        s += "=" + m.promotion.toUpperCase();
    return s;
}
