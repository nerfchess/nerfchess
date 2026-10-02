// Scratch (audit balance-ai): quick nodes-per-ms on this box, hard level,
// 200ms budget, 12 middlegame positions from a fixed line. For comparison
// with the 450 (July), 208 (HB1) and 186 (round 11) quoted in docs.
import { pickAIMove, type SearchStats } from "../../../../../src/engine/ai";
import { legalMoves, newGame, playMove, UNRESTRICTED_NERF } from "../../../../../src/engine/game";
import { moveToUCI } from "../../../../../src/engine/board";
const LINE = "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d4 e5d4 c3d4 c5b4 c1d2 b4d2 b1d2 d7d5 e4d5 f6d5 d1b3 c6e7 e1g1 e8g8 f1e1 c7c6 a1c1 d8d6 d2e4 d6g6".split(" ");
const rates: number[] = [];
for (let k = 8; k < LINE.length; k += 2) {
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
  for (const u of LINE.slice(0, k)) playMove(g, legalMoves(g).find((m) => moveToUCI(m) === u)!);
  const st: SearchStats = { depth: 0, rootMoves: 0 };
  const t = performance.now();
  pickAIMove(g, "hard", 200, undefined, st);
  const ms = performance.now() - t;
  rates.push((st.nodes ?? 0) / ms);
  console.log(`ply ${k}: depth ${st.depth} nodes ${st.nodes} in ${ms.toFixed(0)}ms = ${((st.nodes ?? 0) / ms).toFixed(0)} nodes/ms`);
}
rates.sort((a, b) => a - b);
console.log(`median ${rates[Math.floor(rates.length / 2)].toFixed(0)} nodes/ms, min ${rates[0].toFixed(0)}, max ${rates[rates.length - 1].toFixed(0)} (n=${rates.length})`);
