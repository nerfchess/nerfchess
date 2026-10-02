// Replay determinism for CLASSIC (non-draft) nerf games: live vs replayToPosition
// from the UCI list, twice, comparing the full serialized state and the result.
import { legalMoves, newGame, playMove, serializeGame, type NerfGame } from "../../../../../src/engine/game";
import { moveToUCI } from "../../../../../src/engine/board";
import { PLAYABLE_NERFS } from "../../../../../src/engine/nerfs/library";
import { replayToPosition } from "../../../../../src/engine/replay";
const N = Number(process.argv[2] ?? 300);
function mulberry(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const state = (g: NerfGame) => { const s = serializeGame(g) as unknown as Record<string, unknown>; delete s.startedAt; return JSON.stringify(s); };
let diverged = 0, nulls = 0, plies = 0, threw = 0;
const reasons: Record<string, number> = {};
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const rand = mulberry(1000 + i);
  const w = PLAYABLE_NERFS[Math.floor(rand() * PLAYABLE_NERFS.length)];
  const b = PLAYABLE_NERFS[Math.floor(rand() * PLAYABLE_NERFS.length)];
  const seed = Math.floor(rand() * 2 ** 31);
  let g = newGame(w, b, seed);
  const moves: string[] = [];
  try {
    while (!g.result && moves.length < 250) {
      const ms = legalMoves(g);
      if (!ms.length) break;
      // bias toward captures so games end
      const caps = ms.filter((m) => m.captured);
      const pool = caps.length && rand() < 0.5 ? caps : ms;
      const m = pool[Math.floor(rand() * pool.length)];
      moves.push(moveToUCI(m));
      g = playMove(g, m);
    }
  } catch (e) { threw++; console.log("live threw", i, w.id, b.id, (e as Error).message); continue; }
  plies += moves.length;
  const key = g.result ? g.result.reason.replace(/^.*: /, "nerf: ") : "unfinished";
  reasons[key] = (reasons[key] ?? 0) + 1;
  const r1 = replayToPosition({ setup: { whiteNerfId: w.id, blackNerfId: b.id, seed }, moves });
  const r2 = replayToPosition({ setup: { whiteNerfId: w.id, blackNerfId: b.id, seed }, moves });
  if (!r1 || !r2) { nulls++; console.log("replay null", i, w.id, b.id); continue; }
  if (state(r1) !== state(g) || state(r2) !== state(r1)) { diverged++; console.log("DIVERGED", i, w.id, b.id); }
}
console.log(JSON.stringify({ games: N, plies, diverged, nulls, threw, ms: Date.now() - t0, reasons }, null, 1));
