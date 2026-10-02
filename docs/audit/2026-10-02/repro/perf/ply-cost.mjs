// Main-thread engine cost per ply (legalMoves + playMove) in draft games, from
// the minified engine bundle built by engine-load.mjs. A lower bound on the
// work a move click does before React renders (INP proxy).
const E = await import("./out/engine.mjs");
const samples = [];
for (const seed of [1, 2, 3, 4, 5, 6]) {
  let g = E.newGame(E.UNRESTRICTED_NERF, E.UNRESTRICTED_NERF, seed);
  E.enableDraftMode(g, seed);
  let r = seed;
  for (let ply = 0; ply < 80 && !g.result; ply++) {
    for (const c of ["w", "b"]) if (g.buffs?.players[c].offer) E.aiResolveDraft(g, c);
    const t0 = performance.now();
    const ms = E.legalMoves(g);
    if (!ms.length) break;
    r = (r * 9301 + 49297) % 233280;
    const next = E.playMove(g, ms[Math.floor((r / 233280) * ms.length)]);
    const t1 = performance.now();
    E.legalMoves(next); // the reply's move list, which the UI also builds
    const t2 = performance.now();
    samples.push([t1 - t0, t2 - t1]);
    g = next;
  }
}
const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.floor(p * (a.length - 1))].toFixed(2);
const a = samples.map((s) => s[0] + s[1]);
console.log(`plies ${samples.length}: legalMoves+playMove+legalMoves ms p50 ${pct(a, 0.5)} p95 ${pct(a, 0.95)} max ${pct(a, 1)}`);
