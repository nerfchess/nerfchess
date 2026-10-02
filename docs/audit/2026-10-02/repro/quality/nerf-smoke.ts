// Every nerf (not only the 81 EXPANDED_NERFS test:nerfs covers): play it as each side's handicap
// for N random plies; flag throws, a side to move with zero legal moves and no result, and kings missing.
import { ALL_NERFS } from "../../../../../src/engine/nerfs/library";
import { newGame, legalMoves, playMove, UNRESTRICTED_NERF } from "../../../../../src/engine/game";
const PLIES = Number(process.argv[2] ?? 60);
const SEEDS = Number(process.argv[3] ?? 3);
let rngState = 12345;
const rand = () => ((rngState = (rngState * 1103515245 + 12345) >>> 0) / 4294967296);
const fails: string[] = [];
let games = 0, plies = 0;
const t0 = Date.now();
for (const n of ALL_NERFS) {
  for (const side of ["w", "b"] as const) for (let s = 1; s <= SEEDS; s++) {
    games++;
    let g;
    try { g = side === "w" ? newGame(n, UNRESTRICTED_NERF, s * 7919) : newGame(UNRESTRICTED_NERF, n, s * 7919); } catch (e) { fails.push(`${n.id}/${side}/seed${s}: newGame threw ${(e as Error).message}`); continue; }
    for (let p = 0; p < PLIES && !g.result; p++) {
      let ms;
      try { ms = legalMoves(g); } catch (e) { fails.push(`${n.id}/${side}/seed${s} ply${p}: legalMoves threw ${(e as Error).message}`); break; }
      if (ms.length === 0) { fails.push(`${n.id}/${side}/seed${s} ply${p}: no legal moves and no result (turn ${(g as any).board?.turn})`); break; }
      const m = ms[Math.floor(rand() * ms.length)];
      try { g = playMove(g, m); plies++; } catch (e) { fails.push(`${n.id}/${side}/seed${s} ply${p}: playMove threw ${(e as Error).message}`); break; }
      const sq: any[] = (g as any).board?.pieces ?? [];
      const flat = sq;
      if (flat.length) {
        const kings = flat.filter((x: any) => x && (x.type === "k")).length;
        if (kings !== 2 && !g.result) { fails.push(`${n.id}/${side}/seed${s} ply${p}: ${kings} kings on board, no result`); break; }
      }
    }
  }
}
console.log(`nerfs ${ALL_NERFS.length}, games ${games}, plies ${plies}, ${((Date.now() - t0) / 1000).toFixed(1)}s, failures ${fails.length}`);
for (const f of fails.slice(0, 40)) console.log("  " + f);
