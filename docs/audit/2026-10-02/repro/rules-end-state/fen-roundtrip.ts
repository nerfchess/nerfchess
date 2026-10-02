// FEN round-trip fuzz + leniency probes for src/lib/fen.ts.
import { fenToBoard, boardToFen, START_FEN } from "../../../../../src/lib/fen";
import { generateMoves, initialBoard, makeMove, positionKey } from "../../../../../src/engine/board";
let seed = 777;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
let checked = 0, bad = 0, first = "";
for (let g = 0; g < 200; g++) {
  let b = initialBoard();
  for (let p = 0; p < 150; p++) {
    const ms = generateMoves(b);
    if (!ms.length) break;
    b = makeMove(b, ms[Math.floor(rand() * ms.length)]);
    if (!b.pieces.some((x) => x && x.type === "k" && x.color === b.turn)) break;
    const fen = boardToFen(b);
    const back = fenToBoard(fen)!;
    checked++;
    const same = boardToFen(back) === fen && positionKey(back) === positionKey(b) && back.halfmove === b.halfmove && back.fullmove === b.fullmove;
    if (!same) { bad++; if (!first) first = fen; }
  }
}
console.log(`round-trip: ${checked} positions, ${bad} mismatches ${first}`);
const probes: [string, string][] = [
  ["no kings", "8/8/8/8/8/8/8/8 w - - 0 1"],
  ["three white kings", "k7/8/8/8/8/8/8/KKK5 w - - 0 1"],
  ["pawn on rank 1", "k7/8/8/8/8/8/8/K6P w - - 0 1"],
  ["turn field garbage", "k7/8/8/8/8/8/8/K7 x - - 0 1"],
  ["castling claimed with no rook", "k7/8/8/8/8/8/8/4K3 w KQkq - 0 1"],
  ["ep square with no pawn", "k7/8/8/8/8/8/8/4K3 w - e3 0 1"],
  ["ep on wrong rank for side", "k7/8/8/8/8/8/8/4K3 w - e3 0 1"],
  ["negative halfmove", "k7/8/8/8/8/8/8/4K3 w - - -5 1"],
];
for (const [name, fen] of probes) {
  const b = fenToBoard(fen);
  console.log(`${name}: ${b ? "ACCEPTED -> " + boardToFen(b) : "rejected"}`);
}
console.log("start ok", boardToFen(fenToBoard(START_FEN)!) === START_FEN);
