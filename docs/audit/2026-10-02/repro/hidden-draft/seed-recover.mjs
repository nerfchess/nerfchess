// Recover the master game seed (match.setup.seed, 31-bit) from the nerfSeed a
// seat receives in its start frame (worker.ts startPayload: masterRng.fork()),
// then derive the OPPONENT's nerf seed. Mulberry32 with a 31-bit seed space is
// brute-forceable. Usage: node seed-recover.mjs [limitBits]
function first31(seed) {
  let s = (seed >>> 0) || 1;
  s = (s + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 ** 31);
}
function forks(seed) {
  // RNG(seed).fork() twice: same as startPayload's wSeed then bSeed
  let s = (seed >>> 0) || 1;
  const out = [];
  for (let i = 0; i < 2; i++) {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    out.push(Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 ** 31));
  }
  return out;
}
const bits = Number(process.argv[2] ?? 31);
const space = 2 ** bits;
const master = Math.floor(Math.random() * space); // the server's secret seed
const [wSeed, bSeed] = forks(master);
const t0 = Date.now();
const cands = [];
for (let s = 0; s < space; s++) if (first31(s) === wSeed) cands.push(s);
const ms = Date.now() - t0;
const recovered = cands.map((c) => forks(c)[1]);
console.log(JSON.stringify({ bits, master, wSeed, bSeed, candidates: cands.length, opponentSeedRecovered: recovered.includes(bSeed), uniqueOppSeeds: new Set(recovered).size, ms }));
