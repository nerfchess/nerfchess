// Brute-force a legal-looking position where the side to move has ZERO pseudo-legal moves.
import { generateMoves } from "../../../../../src/engine/board";
import { boardToFen, fenToBoard } from "../../../../../src/lib/fen";
import type { BoardState, PieceType } from "../../../../../src/engine/types";
let s = 12345;
const r = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const types: PieceType[] = ["p", "p", "p", "b", "n", "r"];
let found = 0;
for (let t = 0; t < 3_000_000 && found < 3; t++) {
  const b = fenToBoard("8/8/8/8/8/8/8/8 w - - 0 1")!;
  b.pieces[0] = { type: "k", color: "w" };
  b.pieces[63] = { type: "k", color: "b" };
  // fill the 4x4 corner region
  for (let f = 0; f < 4; f++) for (let rk = 0; rk < 5; rk++) {
    const sq = rk * 8 + f;
    if (sq === 0) continue;
    const x = r();
    if (x < 0.45) continue;
    const ty = types[Math.floor(r() * types.length)];
    const col = r() < 0.6 ? "w" : "b";
    if (ty === "p" && (rk === 0 || rk === 7)) continue;
    b.pieces[sq] = { type: col === "b" ? "p" : ty, color: col };
  }
  if (generateMoves(b).length === 0) {
    found++;
    console.log(boardToFen(b));
  }
}
console.log("found", found);
