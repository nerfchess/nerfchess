// House-bot opening variety and the cost of persona style (slice HB, track HB1).
//
//   ./node_modules/.bin/tsx scripts/sim-house-variety.ts --tiers 1350,1650,2000,2400 --seeds 20 --plies 8
//
// Run it through scripts/polish/heavy.sh nice -n 10 on the shared box.
//
// Three questions, each a line of the HB1 acceptance:
//
// A. With no persona (a human game on the remote engine today, which sends
//    none), does a tier play the same opening every game? Each seed plays one
//    game of the tier against itself for --plies plies, passing a varietySeed
//    derived from the seed and the side (the option older code ignores), and
//    the script counts distinct move sequences. Before: every 1350+ bot opened
//    the same way.
// B. Across 40 personas, how many distinct first moves as White?
// C. Does persona style cost search depth? applyPersonaStyle used to add a
//    temperature and noise jitter to every persona, which switched argmax tiers
//    (topK 1, no noise) onto the full-window sampling search, about a ply
//    shallower at the same budget. For each argmax tier it reports which search
//    path the styled profile takes and, where the engine reports it, the mean
//    completed depth of the styled pick against the baked one on the 27
//    middlegame positions of scripts/bench-node-throughput.ts.
//
// Searches run with Date.now frozen (the node cap bounds them, as on the
// Durable Object), so the counts depend on the seeds only, never on box load.

import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  HOUSE_ROSTER,
  applyPersonaStyle,
  bakedResolvedProfile,
  pickHouseMove,
  type HouseSkill,
} from "../src/lib/server/bots";
import type { SearchStats } from "../src/engine/ai";
import { moveFromUCI, moveToUCI } from "../src/engine/board";
import { UNRESTRICTED_NERF, legalMoves, newGame, playMove, type NerfGame } from "../src/engine/game";
import type { Move } from "../src/engine/types";

const FROZEN = Date.now();
Date.now = () => FROZEN;

const argv = process.argv.slice(2);
function arg(name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}
const TIERS = (arg("tiers") ?? "1350,1650,2000,2400").split(",").map(Number) as HouseSkill[];
const SEEDS = Number(arg("seeds") ?? 20);
const PLIES = Number(arg("plies") ?? 8);
// With the clock frozen the budget only sets the node cap (2000 nodes per ms).
// The opening question does not depend on depth, so a small cap keeps the run
// short; the depth question uses its own.
const CEILING = Number(arg("ceiling") ?? 20);
const DEPTH_CEILING = Number(arg("depth-ceiling") ?? 40);
const PERSONAS = Number(arg("personas") ?? 40);
const OUT = arg("out");

function gitHead(): string {
  try {
    const head = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    const dirty = execSync("git status --porcelain -- src/lib/server/bots.ts src/engine/ai.ts", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return dirty ? `${head}+dirty` : head;
  } catch {
    return "unknown";
  }
}
const COMMIT = arg("commit") ?? gitHead();

function makeRng(seed: number): (max: number) => number {
  let s = (seed * 2654435761) >>> 0 || 1;
  return (max: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return Math.floor((s / 2 ** 32) * max);
  };
}

type PickFn = (...a: unknown[]) => Move | null;
const pick = pickHouseMove as unknown as PickFn;

function play(g: NerfGame, m: Move): NerfGame {
  const lm = legalMoves(g).find((x) => moveToUCI(x) === moveToUCI(m));
  if (!lm) throw new Error(`illegal ${moveToUCI(m)}`);
  return playMove(g, lm);
}

// ---------------------------------------------------------------------------
// A. No persona: distinct opening sequences per tier.
// ---------------------------------------------------------------------------

const sequences: Record<string, unknown>[] = [];
console.log(`A. no persona, ${SEEDS} seeds x ${PLIES} plies per tier (frozen clock, ceiling ${CEILING}ms):`);
for (const tier of TIERS) {
  const seen = new Map<string, number>();
  const firsts = new Set<string>();
  for (let s = 0; s < SEEDS; s++) {
    const rng = makeRng(9_000 + s);
    let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 500 + s);
    const line: string[] = [];
    // A varietySeed per game and side, as the engine service would derive one
    // from the match seed when no persona is known.
    const seedFor = (color: "w" | "b") => ((s + 1) * 2654435761 + (color === "w" ? 1 : 2)) >>> 0;
    for (let ply = 0; ply < PLIES && !g.result; ply++) {
      const m = pick(g, tier, rng, undefined, CEILING, undefined, undefined, { varietySeed: seedFor(g.board.turn) });
      if (!m) break;
      line.push(moveToUCI(m));
      g = play(g, m);
    }
    const key = line.join(" ");
    seen.set(key, (seen.get(key) ?? 0) + 1);
    firsts.add(line[0]);
  }
  const top = [...seen.entries()].sort((a, b) => b[1] - a[1])[0];
  console.log(
    `  ${tier}: ${seen.size} distinct ${PLIES}-ply sequences of ${SEEDS}, ${firsts.size} distinct first moves; most common x${top[1]}: ${top[0]}`,
  );
  sequences.push({ tier, distinct: seen.size, of: SEEDS, distinctFirstMoves: firsts.size, mostCommon: top[0], mostCommonCount: top[1] });
}

// ---------------------------------------------------------------------------
// B. Personas: distinct first moves as White.
// ---------------------------------------------------------------------------

const step = Math.max(1, Math.floor(HOUSE_ROSTER.length / PERSONAS));
const sample = HOUSE_ROSTER.filter((_, i) => i % step === 0).slice(0, PERSONAS);
const firstMoves = new Map<string, number>();
for (let i = 0; i < sample.length; i++) {
  const p = sample[i];
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 700 + i);
  const m = pick(g, p.skill, makeRng(31 + i), undefined, CEILING, undefined, p);
  if (m) firstMoves.set(moveToUCI(m), (firstMoves.get(moveToUCI(m)) ?? 0) + 1);
}
console.log(
  `\nB. ${sample.length} personas as White: ${firstMoves.size} distinct first moves (${[...firstMoves.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([u, n]) => `${u}x${n}`)
    .join(" ")})`,
);

// ---------------------------------------------------------------------------
// C. Persona style and search depth for the argmax tiers.
// ---------------------------------------------------------------------------

const LINES: string[][] = [
  "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d4 e5d4 c3d4 c5b4 c1d2 b4d2 b1d2 d7d5 e4d5 f6d5 d1b3 c6e7 e1g1 e8g8 f1e1 c7c6".split(" "),
  "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8 g1f3 h7h6 g5h4 b7b6 c4d5 f6d5 h4e7 d8e7 c3d5 e6d5 a1c1 c8e6 f1d3 c7c5".split(" "),
  "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1e3 e7e5 d4b3 f8e7 f2f3 e8g8 d1d2 b8c6 e1c1 c8e6 g2g4 b7b5 g4g5 f6d7".split(" "),
];
const positions: NerfGame[] = [];
for (let li = 0; li < LINES.length; li++) {
  for (let n = 8; n <= LINES[li].length; n += 2) {
    let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 7 + li);
    for (let i = 0; i < n; i++) g = playMove(g, moveFromUCI(g.board, LINES[li][i])!);
    positions.push(g);
  }
}
const isSampling = (p: { topK: number; temperatureCp: number; evalNoiseCp: number }) =>
  p.topK > 1 || p.temperatureCp > 0 || p.evalNoiseCp > 0;
const depthRows: Record<string, unknown>[] = [];
console.log(`\nC. persona style on argmax tiers, ${positions.length} positions (frozen clock, ceiling ${DEPTH_CEILING}ms):`);
for (const tier of TIERS) {
  const baked = bakedResolvedProfile(tier);
  if (isSampling(baked)) continue;
  const personas = HOUSE_ROSTER.filter((p) => p.skill === tier);
  const styledSampling = personas.filter((p) => isSampling(applyPersonaStyle(p, baked))).length;
  const bakedDepth: number[] = [];
  const styledDepth: number[] = [];
  for (let i = 0; i < positions.length; i++) {
    const g = positions[i];
    const persona = personas[i % personas.length];
    const noBlunder = { ...baked, blunderChance: 0 };
    const sb: SearchStats = { depth: 0, rootMoves: 0, nodes: 0 };
    pick(g, tier, makeRng(i + 1), undefined, DEPTH_CEILING, noBlunder, undefined, { stats: sb });
    const ss: SearchStats = { depth: 0, rootMoves: 0, nodes: 0 };
    // Past the opening, so no repertoire move short-circuits the search.
    pick(g, tier, makeRng(i + 1), undefined, DEPTH_CEILING, noBlunder, persona, { stats: ss });
    // Paired: a position counts only when both searches report a depth (a
    // repertoire move answers without searching at all).
    if (sb.depth && ss.depth) {
      bakedDepth.push(sb.depth);
      styledDepth.push(ss.depth);
    }
  }
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const row = {
    tier,
    personas: personas.length,
    styledOnSamplingPath: styledSampling,
    bakedMeanDepth: mean(bakedDepth),
    styledMeanDepth: mean(styledDepth),
    depthReported: { baked: bakedDepth.length, styled: styledDepth.length, of: positions.length },
  };
  depthRows.push(row);
  const f = (x: number | null) => (x == null ? "not reported" : x.toFixed(2));
  console.log(
    `  ${tier}: ${styledSampling}/${personas.length} styled personas take the sampling path; mean depth baked ${f(row.bakedMeanDepth)}, styled ${f(row.styledMeanDepth)} (reported ${styledDepth.length}/${positions.length})`,
  );
}

const payload = {
  script: "scripts/sim-house-variety.ts",
  commit: COMMIT,
  argv: argv.join(" "),
  frozenClock: true,
  ceilingMs: CEILING,
  depthCeilingMs: DEPTH_CEILING,
  sequences,
  personaFirstMoves: { personas: sample.length, distinct: firstMoves.size, counts: Object.fromEntries(firstMoves) },
  styleDepth: depthRows,
};
if (OUT) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(`wrote ${OUT}`);
}
