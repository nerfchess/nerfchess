// House-bot strength probes and the low-tier ladder (slice HB, track HB1).
//
//   ./node_modules/.bin/tsx scripts/sim-house-ladder.ts --probe check --positions 30 --picks 300 --seed 1
//   ./node_modules/.bin/tsx scripts/sim-house-ladder.ts --probe blunder --positions 40 --judge-ms 1000 --seed 1
//   ./node_modules/.bin/tsx scripts/sim-house-ladder.ts --ladder 800,900,1050,1200,1350,1450 \
//       --pairs adjacent,800:1200 --games 20 --seed 1
//
// Run it through scripts/polish/heavy.sh nice -n 10 on the shared box.
//
// What it measures, and why each number exists:
//
// --probe check: positions where the side to move is in check and at least one
//   legal move leaves the king safe. For every tier it asks pickHouseMove for a
//   move, many times per position, and counts the picks after which the
//   opponent can capture the king. In this variant a king left en prise is
//   simply taken, so a beginner tier that ignores check loses in a dozen moves
//   and feels broken rather than beginner-like.
//
// --probe blunder: forces the blunder branch (a profile with blunderChance 1)
//   on midgame positions and judges each blunder with analyzeBoard at
//   --judge-ms against the best line from the same position. Reports the
//   centipawn loss distribution and the king hangs. A human blunder is a missed
//   tactic, not a queen dropped at random.
//
// --ladder: plays tier pairs in Nerf mode (a nerf each, dealt from the live
//   opening pool with pickNerfPair), each seed twice with colors swapped, a
//   200-ply cap (a capped game scores as a draw). Date.now is frozen the way the
//   win-rate harness freezes it, so every search is bounded by its depth cap
//   and node cap exactly as on the Durable Object, and the run is reproducible
//   from the seed. It also records the frozen-clock CPU cost per move for the
//   800-1050 tiers (the A25 guard: HB may not raise nodes per move on the DO
//   path), with node counts when the engine reports them.
//
// The script must run unchanged against the baseline tree (the before numbers)
// and the changed tree: the only new call shape it uses is the optional 8th
// argument of pickHouseMove, which older code ignores.

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";
import {
  bakedResolvedProfile,
  pickHouseMove,
  HOUSE_SKILLS,
  type HouseSkill,
  type ResolvedSkillProfile,
} from "../src/lib/server/bots";
import { analyzeBoard, pickAIMove, type SearchStats } from "../src/engine/ai";
import { makeMove, moveToUCI, positionKey } from "../src/engine/board";
import {
  UNRESTRICTED_NERF,
  deserializeGame,
  gameInCheck,
  legalMoves,
  newGame,
  playMove,
  serializeGame,
  type NerfGame,
} from "../src/engine/game";
import { openingNerfPool, pickNerfPair } from "../src/engine/nerfs/library";
import type { Color, Move } from "../src/engine/types";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
function arg(name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}
function num(name: string, fallback: number): number {
  const v = arg(name);
  return v == null ? fallback : Number(v);
}
const SEED = num("seed", 1);
const OUT = arg("out");
const COMMIT = arg("commit") ?? gitHead();

function gitHead(): string {
  try {
    const head = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    const dirty = execSync("git status --porcelain -- src/lib/server/bots.ts src/engine/ai.ts", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return dirty ? `${head}+dirty(${dirty.split("\n").map((l) => l.trim().split(/\s+/).pop()).join(",")})` : head;
  } catch {
    return "unknown";
  }
}

// ---------------------------------------------------------------------------
// Deterministic RNG (high bits of an LCG, like sim-house-bots.ts).
// ---------------------------------------------------------------------------

function makeRng(seed: number): (max: number) => number {
  let s = (seed * 2654435761) >>> 0 || 1;
  return (max: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return Math.floor((s / 2 ** 32) * max);
  };
}

// ---------------------------------------------------------------------------
// Stats helpers
// ---------------------------------------------------------------------------

function wilson(k: number, n: number, z = 1.96): { p: number; lo: number; hi: number } {
  if (n === 0) return { p: 0, lo: 0, hi: 0 };
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const r = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { p, lo: Math.max(0, (c - r) / d), hi: Math.min(1, (c + r) / d) };
}
function quantile(xs: number[], q: number): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo);
}
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

// ---------------------------------------------------------------------------
// Position helpers
// ---------------------------------------------------------------------------

/** True when, after `move`, the opponent can capture the mover's king (buff
 * aware, the same test the move-risk warning uses). A move that captures the
 * enemy king ends the game and is never a hang. */
function leavesKingCapturable(game: NerfGame, move: Move): boolean {
  if (move.captured === "k") return false;
  const me = game.board.turn;
  const next = makeMove(game.board, move);
  return gameInCheck({ ...game, board: next }, me);
}

function kingSafeMoves(game: NerfGame): Move[] {
  return legalMoves(game).filter((m) => !leavesKingCapturable(game, m));
}

/** Rebuild a game from a start seed and a move list (plain chess, no nerfs). */
function replayPlain(seed: number, ucis: string[]): NerfGame {
  let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  for (const u of ucis) {
    const m = legalMoves(g).find((x) => moveToUCI(x) === u);
    if (!m) throw new Error(`replay: illegal ${u}`);
    g = playMove(g, m);
  }
  return g;
}

type Pos = { seed: number; moves: string[]; key: string };

const PIECE_CP: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

/**
 * A deliberately engine-free mover for harvesting positions: it must not use
 * pickHouseMove or pickAIMove, or the "before" and "after" runs would harvest
 * different positions and the comparison would be meaningless. Captures are
 * taken greedily most of the time and the king is usually kept safe, so games
 * run long enough to produce checks, loose pieces and real middlegames.
 */
function harvestMove(g: NerfGame, rng: (max: number) => number): Move | null {
  const legal = legalMoves(g);
  if (!legal.length) return null;
  const kingWin = legal.find((m) => m.captured === "k");
  if (kingWin) return kingWin;
  const safe = legal.filter((m) => !leavesKingCapturable(g, m));
  const pool = safe.length && rng(100) < 92 ? safe : legal;
  const captures = pool.filter((m) => m.captured);
  if (captures.length && rng(100) < 55) {
    captures.sort((a, b) => PIECE_CP[b.captured!] - PIECE_CP[a.captured!] || PIECE_CP[a.piece] - PIECE_CP[b.piece]);
    return captures[rng(Math.min(2, captures.length))];
  }
  // Mildly developing: prefer moves off the back rank and toward the centre.
  const scored = pool.map((m) => {
    const toFile = m.to & 7;
    const toRank = m.to >> 3;
    const centre = 3.5 - Math.max(Math.abs(toFile - 3.5), Math.abs(toRank - 3.5));
    return { m, s: centre + rng(4) };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored[rng(Math.min(4, scored.length))].m;
}

/**
 * Harvest positions from seeded plain games played by the engine-free mover.
 * Deterministic from the seed, and saved/loaded with --save-positions and
 * --load-positions so a later run can be pinned to exactly the same set.
 */
function harvest(
  count: number,
  seed: number,
  accept: (g: NerfGame, ply: number) => boolean,
  perGame: number,
): Pos[] {
  const load = arg("load-positions");
  if (load) {
    const loaded = JSON.parse(readFileSync(load, "utf8")) as Pos[];
    return loaded.slice(0, count);
  }
  const out: Pos[] = [];
  const seen = new Set<string>();
  const rng = makeRng(seed * 7919 + 17);
  for (let gi = 0; out.length < count && gi < 4000; gi++) {
    const gseed = seed * 100_000 + gi;
    let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, gseed);
    const moves: string[] = [];
    let taken = 0;
    for (let ply = 0; ply < 160 && !g.result && taken < perGame; ply++) {
      if (accept(g, ply)) {
        const key = positionKey(g.board);
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ seed: gseed, moves: [...moves], key });
          taken++;
          if (out.length >= count) break;
        }
      }
      const m = harvestMove(g, rng);
      if (!m) break;
      moves.push(moveToUCI(m));
      g = playMove(g, m);
    }
  }
  const save = arg("save-positions");
  if (save) {
    mkdirSync(dirname(save), { recursive: true });
    writeFileSync(save, JSON.stringify(out) + "\n");
  }
  return out;
}

// ---------------------------------------------------------------------------
// --probe check
// ---------------------------------------------------------------------------

function probeCheck() {
  const positions = num("positions", 30);
  const picks = num("picks", 300);
  const tiers = (arg("tiers") ?? "800,900,1050,1200,1350,1450,1550,1650").split(",").map(Number) as HouseSkill[];
  const perPos = Math.max(1, Math.round(picks / positions));
  const pos = harvest(
    positions,
    SEED,
    (g, ply) => {
      if (ply < 6) return false;
      const me = g.board.turn;
      if (!gameInCheck(g, me)) return false;
      const legal = legalMoves(g);
      const safe = legal.filter((m) => !leavesKingCapturable(g, m));
      return safe.length > 0 && safe.length < legal.length;
    },
    2,
  );
  console.log(`check probe: ${pos.length} in-check positions with a king-safe alternative, ${perPos} picks each`);
  const rows: Record<string, unknown>[] = [];
  for (const tier of tiers) {
    const rng = makeRng(SEED * 1000 + tier);
    let hang = 0;
    let n = 0;
    const t0 = performance.now();
    for (const p of pos) {
      const g = replayPlain(p.seed, p.moves);
      for (let k = 0; k < perPos; k++) {
        const m = pickHouseMove(g, tier, rng, undefined, 80);
        if (!m) continue;
        n++;
        if (leavesKingCapturable(g, m)) hang++;
      }
    }
    const w = wilson(hang, n);
    const ms = performance.now() - t0;
    console.log(
      `  ${String(tier).padStart(4)}: king left capturable ${hang}/${n} = ${pct(w.p)} (95% CI ${pct(w.lo)}-${pct(w.hi)})  [${(ms / 1000).toFixed(1)}s]`,
    );
    rows.push({ tier, hang, n, share: w.p, ciLo: w.lo, ciHi: w.hi });
  }
  return { probe: "check", positions: pos.length, picksPerPosition: perPos, rows };
}

// ---------------------------------------------------------------------------
// --probe blunder
// ---------------------------------------------------------------------------

function probeBlunder() {
  const positions = num("positions", 40);
  const judgeMs = num("judge-ms", 1000);
  const samples = num("samples", 2);
  const tiers = (arg("tiers") ?? "800,1200,1550,1900").split(",").map(Number) as HouseSkill[];
  const pos = harvest(
    positions,
    SEED + 50,
    (g, ply) => {
      if (ply < 16 || ply > 70 || ply % 5 !== 0) return false;
      const me = g.board.turn;
      if (gameInCheck(g, me)) return false;
      return kingSafeMoves(g).length >= 8;
    },
    1,
  );
  console.log(`blunder probe: ${pos.length} midgame positions, ${samples} forced blunders per tier, judge ${judgeMs}ms`);
  const judgeCache = new Map<string, { scoreCp: number; depth: number }>();
  const judge = (board: NerfGame["board"]) => {
    const key = positionKey(board);
    let r = judgeCache.get(key);
    if (!r) {
      const a = analyzeBoard(board, judgeMs);
      r = { scoreCp: a.scoreCp, depth: a.depth };
      judgeCache.set(key, r);
    }
    return r;
  };
  const cap = (cp: number) => Math.max(-2000, Math.min(2000, cp));
  const rows: Record<string, unknown>[] = [];
  const all: number[] = [];
  let allHang = 0;
  let allN = 0;
  const depths: number[] = [];
  for (const tier of tiers) {
    const rng = makeRng(SEED * 3000 + tier);
    const profile: ResolvedSkillProfile = { ...bakedResolvedProfile(tier), blunderChance: 1 };
    const cpl: number[] = [];
    let hang = 0;
    let n = 0;
    for (const p of pos) {
      const g = replayPlain(p.seed, p.moves);
      const before = judge(g.board);
      depths.push(before.depth);
      for (let k = 0; k < samples; k++) {
        const m = pickHouseMove(g, tier, rng, undefined, 80, profile);
        if (!m) continue;
        n++;
        if (leavesKingCapturable(g, m)) hang++;
        const after = judge(makeMove(g.board, m));
        const loss = Math.max(0, cap(before.scoreCp) - cap(-after.scoreCp));
        cpl.push(loss);
      }
    }
    const big = cpl.filter((x) => x >= 900).length;
    const row = {
      tier,
      n,
      kingHangs: hang,
      medianCpl: quantile(cpl, 0.5),
      p25Cpl: quantile(cpl, 0.25),
      p75Cpl: quantile(cpl, 0.75),
      share900: big / Math.max(1, cpl.length),
      share900Ci: wilson(big, cpl.length),
      zeroShare: cpl.filter((x) => x === 0).length / Math.max(1, cpl.length),
    };
    console.log(
      `  ${String(tier).padStart(4)}: n=${n} king hangs ${hang}, CPL median ${row.medianCpl.toFixed(0)} (IQR ${row.p25Cpl.toFixed(0)}-${row.p75Cpl.toFixed(0)}), >=900cp ${pct(row.share900)}, zero-loss ${pct(row.zeroShare)}`,
    );
    rows.push(row);
    all.push(...cpl);
    allHang += hang;
    allN += n;
  }
  const big = all.filter((x) => x >= 900).length;
  const pooled = {
    n: allN,
    kingHangs: allHang,
    medianCpl: quantile(all, 0.5),
    share900: big / Math.max(1, all.length),
    share900Ci: wilson(big, all.length),
    judgeDepthMean: depths.reduce((a, b) => a + b, 0) / Math.max(1, depths.length),
  };
  console.log(
    `  pooled: n=${allN} king hangs ${allHang}, CPL median ${pooled.medianCpl.toFixed(0)}, >=900cp ${pct(pooled.share900)}; judge mean depth ${pooled.judgeDepthMean.toFixed(2)}`,
  );
  return { probe: "blunder", positions: pos.length, samples, judgeMs, rows, pooled };
}

// ---------------------------------------------------------------------------
// --ladder
// ---------------------------------------------------------------------------

function ladder() {
  // Frozen clock: the search is bounded by depth and node caps only, exactly as
  // on the Durable Object, and the run does not depend on box load.
  const FROZEN = Date.now();
  Date.now = () => FROZEN;

  const tiers = (arg("ladder") ?? "800,900,1050,1200,1350,1450").split(",").map(Number) as HouseSkill[];
  for (const t of tiers) if (!HOUSE_SKILLS.includes(t)) throw new Error(`unknown tier ${t}`);
  const games = num("games", 20);
  const ceiling = num("ceiling", 1800);
  const pairSpec = (arg("pairs") ?? "adjacent").split(",");
  const pairs: Array<[HouseSkill, HouseSkill]> = [];
  for (const spec of pairSpec) {
    if (spec === "adjacent") {
      for (let i = 1; i < tiers.length; i++) pairs.push([tiers[i - 1], tiers[i]]);
    } else {
      const [a, b] = spec.split(":").map(Number) as [HouseSkill, HouseSkill];
      pairs.push([a, b]);
    }
  }
  const cpuByTier = new Map<number, number[]>();
  const nodesByTier = new Map<number, number[]>();
  // A sample of the low-tier positions, for the node-rate calibration below.
  const calib: NerfGame[] = [];
  let calibSeen = 0;
  const pool = openingNerfPool();

  function playGame(white: HouseSkill, black: HouseSkill, seed: number) {
    const rng = makeRng(seed);
    const pair = pickNerfPair(rng, pool);
    const nerfW = pool.find((n) => n.id === pair.whiteNerfId)!;
    const nerfB = pool.find((n) => n.id === pair.blackNerfId)!;
    let g = newGame(nerfW, nerfB, seed);
    let ply = 0;
    for (; ply < 200 && !g.result; ply++) {
      const turn: Color = g.board.turn;
      const tier = turn === "w" ? white : black;
      const stats: SearchStats = { depth: 0, rootMoves: 0, nodes: 0 };
      const t0 = performance.now();
      const m = (pickHouseMove as (...a: unknown[]) => Move | null)(
        g, tier, rng, undefined, ceiling, undefined, undefined, { stats },
      );
      const dt = performance.now() - t0;
      if (tier <= 1050) {
        if (calib.length < 200 && calibSeen++ % 7 === 0) calib.push(deserializeGame(serializeGame(g))!);
        (cpuByTier.get(tier) ?? cpuByTier.set(tier, []).get(tier)!).push(dt);
        if (stats.nodes) (nodesByTier.get(tier) ?? nodesByTier.set(tier, []).get(tier)!).push(stats.nodes);
      }
      if (!m) break;
      const lm = legalMoves(g).find((x) => moveToUCI(x) === moveToUCI(m));
      if (!lm) throw new Error(`illegal move from ${tier}: ${moveToUCI(m)}`);
      g = playMove(g, lm);
    }
    const w = g.result?.winner;
    return { score: w === "w" ? 1 : w === "b" ? 0 : 0.5, plies: ply, reason: g.result?.reason ?? "ply cap" };
  }

  const rows: Record<string, unknown>[] = [];
  for (const [lo, hi] of pairs) {
    let hiScore = 0;
    let hiWins = 0;
    let draws = 0;
    const lengths: number[] = [];
    const reasons: Record<string, number> = {};
    const t0 = performance.now();
    const seeds = Math.ceil(games / 2);
    let played = 0;
    for (let s = 0; s < seeds; s++) {
      const seed = SEED * 1_000_003 + lo * 7 + hi * 13 + s * 101;
      for (const hiWhite of [true, false]) {
        if (played >= games) break;
        const r = hiWhite ? playGame(hi, lo, seed) : playGame(lo, hi, seed);
        const sc = hiWhite ? r.score : 1 - r.score;
        hiScore += sc;
        if (sc === 1) hiWins++;
        if (sc === 0.5) draws++;
        lengths.push(r.plies / 2);
        const reason = r.reason.replace(/[0-9]+/g, "#");
        reasons[reason] = (reasons[reason] ?? 0) + 1;
        played++;
      }
    }
    const share = hiScore / played;
    // Wilson on the score treating a draw as half a win: an approximation that
    // is honest about the size of the interval at n=20, which is the point.
    const w = wilson(hiScore, played);
    const row = {
      lower: lo,
      higher: hi,
      games: played,
      higherScore: share,
      ciLo: w.lo,
      ciHi: w.hi,
      higherWins: hiWins,
      draws,
      medianMovesPerSide: quantile(lengths, 0.5),
      reasons,
      seconds: (performance.now() - t0) / 1000,
    };
    console.log(
      `  ${hi} vs ${lo}: ${hi} scores ${pct(share)} (95% CI ${pct(w.lo)}-${pct(w.hi)}), W${hiWins} D${draws} L${played - hiWins - draws}, median ${row.medianMovesPerSide} moves per side  [${row.seconds.toFixed(0)}s]`,
    );
    rows.push(row);
  }
  // Node-rate calibration. The sampled search the low tiers use does not report
  // nodes, so their node count is estimated from their CPU time and this box's
  // node rate right now, measured on the argmax path (which does report nodes)
  // over the same positions, with the same frozen clock.
  let calNodes = 0;
  let calMs = 0;
  for (const g of calib) {
    const st: SearchStats = { depth: 0, rootMoves: 0, nodes: 0 };
    const t0 = performance.now();
    pickAIMove(g, "medium", 40, {
      params: { maxDepth: 3, extendedEval: false, topK: 1, temperatureCp: 0, sampleWindowCp: 0, evalNoiseCp: 0 },
      random: makeRng(7),
    }, st);
    calMs += performance.now() - t0;
    calNodes += st.nodes ?? 0;
  }
  const nodesPerMs = calMs > 0 ? calNodes / calMs : NaN;
  console.log(`  node rate on this box now: ${nodesPerMs.toFixed(0)} nodes/ms (argmax depth 3 over ${calib.length} low-tier positions)`);
  const cost: Record<string, unknown> = { nodesPerMs };
  for (const [tier, xs] of [...cpuByTier.entries()].sort((a, b) => a[0] - b[0])) {
    const nodes = nodesByTier.get(tier) ?? [];
    cost[tier] = {
      moves: xs.length,
      cpuMsP50: quantile(xs, 0.5),
      cpuMsP95: quantile(xs, 0.95),
      cpuMsMax: Math.max(...xs),
      estNodesP95: Math.round(quantile(xs, 0.95) * nodesPerMs),
      estNodesMax: Math.round(Math.max(...xs) * nodesPerMs),
      nodesReported: nodes.length,
      nodesP50: nodes.length ? quantile(nodes, 0.5) : null,
      nodesP95: nodes.length ? quantile(nodes, 0.95) : null,
      nodesMax: nodes.length ? Math.max(...nodes) : null,
    };
    console.log(
      `  frozen-clock cost ${tier}: ${xs.length} moves, CPU p50 ${quantile(xs, 0.5).toFixed(2)}ms p95 ${quantile(xs, 0.95).toFixed(2)}ms max ${Math.max(...xs).toFixed(1)}ms` +
        (nodes.length
          ? `, nodes p50 ${quantile(nodes, 0.5)} p95 ${quantile(nodes, 0.95)} max ${Math.max(...nodes)}`
          : `, nodes not reported by the sampled path, estimated p95 ${Math.round(quantile(xs, 0.95) * nodesPerMs)} max ${Math.round(Math.max(...xs) * nodesPerMs)}`),
    );
  }
  return { ladder: tiers, games, ceiling, frozenClock: true, rows, cost };
}

// ---------------------------------------------------------------------------

const started = performance.now();
let result: Record<string, unknown>;
const probe = arg("probe");
if (probe === "check") result = probeCheck();
else if (probe === "blunder") result = probeBlunder();
else if (arg("ladder") != null) {
  console.log("ladder (Nerf mode, frozen clock, colors swapped per seed, 200-ply cap):");
  result = ladder();
} else {
  console.error("usage: --probe check|blunder, or --ladder <tiers>");
  process.exit(2);
}
const payload = {
  script: "scripts/sim-house-ladder.ts",
  commit: COMMIT,
  argv: argv.join(" "),
  seed: SEED,
  seconds: (performance.now() - started) / 1000,
  ...result,
};
if (OUT) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(`wrote ${OUT}`);
}
