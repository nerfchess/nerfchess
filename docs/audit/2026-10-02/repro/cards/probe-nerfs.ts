import { RNG } from "../../../../../src/engine/rng";
import { newGame, legalMoves, playMove, NerfGame, enableDraftMode } from "../../../../../src/engine/game";
import { PLAYABLE_NERFS } from "../../../../../src/engine/nerfs/library";
import { isRetired } from "../../../../../src/engine/retired";
const live = PLAYABLE_NERFS.filter((n) => !isRetired(n.id));
const out: Record<string, string> = {}; let relaxPlies = 0, plies = 0; const relaxBy: Record<string, number> = {}; const earlyLoss: Record<string, number> = {};
const t0 = Date.now();
for (const n of live) for (let s = 0; s < 8; s++) {
  const rng = new RNG(77 + s * 13);
  const other = rng.pick(live);
  let g: NerfGame = s % 2 ? newGame(n, other, s) : newGame(other, n, s);
  enableDraftMode(g, s + 3, { mode: "nerf", cadence: 1000 }); g.buffs!.players.w.offer = null; g.buffs!.players.b.offer = null;
  try {
    for (let p = 0; p < 80 && !g.result; p++) {
      const lm = legalMoves(g); plies++;
      const rep = g.lastNerfFilter as any; if (rep?.relaxed) { relaxPlies++; relaxBy[rep.nerfId] = (relaxBy[rep.nerfId] ?? 0) + 1; }
      if (!lm.length) { out[n.id] = `NO_MOVES at ply ${p}`; break; }
      g = playMove(g, rng.pick(lm));
    }
    if (g.result && g.board.history.length <= 4 && g.result.reason.includes(":")) earlyLoss[g.result.reason] = (earlyLoss[g.result.reason] ?? 0) + 1;
  } catch (e: any) { out[n.id] = "THROW " + e?.message; }
}
console.log("live nerfs", live.length, "games", live.length * 8, "plies", plies, "secs", (Date.now() - t0) / 1000);
console.log("failures", Object.keys(out).length, JSON.stringify(out).slice(0, 600));
console.log("plies where a nerf filter emptied the list and was relaxed:", relaxPlies, "top:", Object.entries(relaxBy).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => k + "=" + v).join(", "));
console.log("nerf losses within 4 plies:", JSON.stringify(earlyLoss));
