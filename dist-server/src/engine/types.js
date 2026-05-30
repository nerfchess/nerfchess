"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PIECE_VALUE = exports.inBoard = exports.SQ = exports.RANK = exports.FILE = void 0;
exports.squareName = squareName;
exports.parseSquare = parseSquare;
const FILE = (sq) => sq & 7;
exports.FILE = FILE;
const RANK = (sq) => sq >> 3;
exports.RANK = RANK;
const SQ = (file, rank) => rank * 8 + file;
exports.SQ = SQ;
const inBoard = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
exports.inBoard = inBoard;
exports.PIECE_VALUE = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 1000,
};
function squareName(sq) {
    return "abcdefgh"[(0, exports.FILE)(sq)] + ((0, exports.RANK)(sq) + 1);
}
function parseSquare(name) {
    return (0, exports.SQ)(name.charCodeAt(0) - 97, parseInt(name[1]) - 1);
}
