// For every playable nerf: never a live position where the mover has pseudo-legal
// moves but zero legal moves (nerf-caused stalemate), and how games end.
import { legalMoves, newGame, playMove, UNRESTRICTED_NERF } from "../../../../../src/engine/game";
import { generateMoves } from "../../../../../src/engine/board";
import { PLAYABLE_NERFS } from "../../../../../src/engine/nerfs/library";
function mulberry(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let stuck = 0, positions = 0, games = 0, filterNerfs = 0;
const t0 = Date.now();
for (const n of PLAYABLE_NERFS) {
  if (n.filterMoves) filterNerfs++;
  for (let k = 0; k < 4; k++) {
    const rand = mulberry(n.id.length * 131 + k);
    let g = k % 2 ? newGame(n, UNRESTRICTED_NERF, 7 + k) : newGame(UNRESTRICTED_NERF, n, 7 + k);
    games++;
    for (let p = 0; p < 160 && !g.result; p++) {
      const ms = legalMoves(g);
      positions++;
      if (ms.length === 0 && generateMoves(g.board).length > 0) { stuck++; console.log("STUCK", n.id); break; }
      if (!ms.length) break;
      g = playMove(g, ms[Math.floor(rand() * ms.length)]);
    }
  }
}
console.log(JSON.stringify({ nerfs: PLAYABLE_NERFS.length, filterNerfs, games, positions, stuck, ms: Date.now() - t0 }));
