/**
 * HB2 (P12): how deep does the engine get at the budgets the house tiers use?
 *
 *   ./node_modules/.bin/tsx scripts/bench-house-search.ts \
 *     --budgets 25,80,120,400,1800 --levels medium,hard --engines baseline,current
 *
 * Positions: the 27 middlegame positions of scripts/bench-node-throughput.ts
 * (three opening lines, plies 8 to 24, every second ply) plus 20 late positions
 * at plies 60 to 120. The late set is generated once, deterministically, by the
 * BASELINE engine at a fixed depth with a seeded RNG, and frozen to
 * docs/polish-pass/evidence/HB/HB2/late-positions.json so every later run and
 * every engine version reads the same boards.
 *
 * Engines: "baseline" is src/engine/ai.ts as of the HB2 start commit, read from
 * git into a scratch dir with its imports pointed back at this checkout's rules
 * files (HB2_SCRATCH, default os.tmpdir()/hb2-engines). "current" is the
 * working tree. When both are listed they run INTERLEAVED per position, with the
 * order alternating, so the load on a shared box lands on both equally; that is
 * the only honest way to compare wall-clock depth on a machine other agents are
 * using at the same time.
 *
 * Output: a table on stdout and, with --out, a JSON file. `--table` prints the
 * completed-depth table HB1 re-spaces the ladder from (budgets 25 to 1800).
 * `--frozen` freezes Date.now inside each search, as a Cloudflare Worker does,
 * so the node cap is the only stop and "ms" is the CPU of a capped search.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

// ---------------------------------------------------------------------------
// Engine loader (duplicated in each HB2 script on purpose: scripts do not share
// helper modules in this repo, and the baseline must be materialised the same
// way everywhere).
// ---------------------------------------------------------------------------
const BASELINE_COMMIT = "bbe4271";
type AiModule = typeof import("../src/engine/ai");

async function loadEngine(spec: string): Promise<AiModule> {
  if (spec === "current") return import("../src/engine/ai");
  const commit = spec === "baseline" ? BASELINE_COMMIT : spec;
  const root = process.cwd();
  const src = execFileSync("git", ["show", `${commit}:src/engine/ai.ts`], { cwd: root, encoding: "utf8" });
  const dir = process.env.HB2_SCRATCH ?? path.join(os.tmpdir(), "hb2-engines");
  fs.mkdirSync(dir, { recursive: true });
  const out = src.replace(
    /from "\.\/([A-Za-z]+)"/g,
    (_m, f: string) => `from ${JSON.stringify(path.join(root, "src/engine", f))}`,
  );
  const file = path.join(dir, `ai-${commit}.ts`);
  fs.writeFileSync(file, out);
  return (await import(pathToFileURL(file).href)) as AiModule;
}

// ---------------------------------------------------------------------------
// Positions.
// ---------------------------------------------------------------------------
const LINES: string[][] = [
  "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d4 e5d4 c3d4 c5b4 c1d2 b4d2 b1d2 d7d5 e4d5 f6d5 d1b3 c6e7 e1g1 e8g8 f1e1 c7c6"
    .split(" "),
  "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8 g1f3 h7h6 g5h4 b7b6 c4d5 f6d5 h4e7 d8e7 c3d5 e6d5 a1c1 c8e6 f1d3 c7c5"
    .split(" "),
  "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1e3 e7e5 d4b3 f8e7 f2f3 e8g8 d1d2 b8c6 e1c1 c8e6 g2g4 b7b5 g4g5 f6d7"
    .split(" "),
];

const EVIDENCE = "docs/polish-pass/evidence/HB/HB2";
const LATE_FILE = path.join(EVIDENCE, "late-positions.json");
/** A budget no search here reaches, so a maxDepth-bounded search runs to that
 *  depth whatever the clock does. */
const FIXED_DEPTH_BUDGET_MS = 10_000_000;

type Pos = { label: string; moves: string[] };

function arg(name: string, dflt: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

function xorshift(seed: number) {
  let s = seed >>> 0 || 0x9e3779b9;
  return (max: number) => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s % max;
  };
}

async function rules() {
  const game = await import("../src/engine/game");
  const board = await import("../src/engine/board");
  return { game, board };
}

function midPositions(): Pos[] {
  const out: Pos[] = [];
  for (let li = 0; li < LINES.length; li++) {
    for (let n = 8; n <= LINES[li].length; n += 2) out.push({ label: `L${li}p${n}`, moves: LINES[li].slice(0, n) });
  }
  return out;
}

/** Generate the late set with the BASELINE engine at fixed depth 3 (no clock,
 *  so it is deterministic) plus a seeded 10% of random king-safe moves, then
 *  freeze it. Plain chess rules (both nerfs unrestricted). */
async function makeLatePositions(): Promise<Pos[]> {
  const base = await loadEngine("baseline");
  const { game, board } = await rules();
  const out: Pos[] = [];
  let seed = 1;
  for (let i = 0; out.length < 20 && seed < 400; seed++) {
    const target = 60 + 3 * i;
    const line = LINES[i % 3];
    const rnd = xorshift(seed * 7919);
    let g = game.newGame(game.UNRESTRICTED_NERF, game.UNRESTRICTED_NERF, 7);
    const played: string[] = [];
    for (const u of line) {
      g = game.playMove(g, board.moveFromUCI(g.board, u)!);
      played.push(u);
    }
    let ok = true;
    while (played.length < target) {
      if (g.result) {
        ok = false;
        break;
      }
      const legal = game.legalMoves(g);
      let mv = null as ReturnType<typeof board.moveFromUCI>;
      if (rnd(10) === 0) {
        const safe = legal.filter((m) => !board.isInCheck(board.makeMove(g.board, m), g.board.turn));
        if (safe.length) mv = safe[rnd(safe.length)];
      }
      // A huge budget, not 0: the deepening loop breaks once an iteration takes
      // longer than the budget, so 0 would make this depend on the clock.
      if (!mv) mv = base.analyzeBoard(g.board, FIXED_DEPTH_BUDGET_MS, 3).move;
      if (!mv) {
        ok = false;
        break;
      }
      played.push(board.moveToUCI(mv));
      g = game.playMove(g, mv);
    }
    // A late position worth benchmarking still has play in it: both kings on,
    // no result, and at least a few pieces besides pawns.
    if (!ok || g.result) continue;
    const nonPawn = g.board.pieces.filter((p) => p && p.type !== "p" && p.type !== "k").length;
    if (nonPawn < 3) continue;
    out.push({ label: `late${i}p${target}`, moves: played });
    i++;
  }
  fs.mkdirSync(EVIDENCE, { recursive: true });
  fs.writeFileSync(
    LATE_FILE,
    JSON.stringify(
      {
        note: `Generated by scripts/bench-house-search.ts with the baseline engine (${BASELINE_COMMIT}) at fixed depth 3 plus seeded 10% random king-safe moves. Frozen: do not regenerate.`,
        positions: out,
      },
      null,
      1,
    ),
  );
  return out;
}

async function latePositions(): Promise<Pos[]> {
  if (fs.existsSync(LATE_FILE)) return JSON.parse(fs.readFileSync(LATE_FILE, "utf8")).positions as Pos[];
  return makeLatePositions();
}

type Stats = { depth: number; rootMoves: number; nodes?: number; scoreCp?: number };
type Sample = { depth: number; nodes: number; ms: number };

function summarize(xs: Sample[]) {
  const n = xs.length;
  const mean = (f: (s: Sample) => number) => xs.reduce((a, s) => a + f(s), 0) / Math.max(1, n);
  const depths = xs.map((s) => s.depth).sort((a, b) => a - b);
  const nodes = xs.reduce((a, s) => a + s.nodes, 0);
  const ms = xs.reduce((a, s) => a + s.ms, 0);
  return {
    n,
    meanDepth: +mean((s) => s.depth).toFixed(3),
    minDepth: depths[0] ?? 0,
    maxDepth: depths[n - 1] ?? 0,
    meanNodes: Math.round(mean((s) => s.nodes)),
    meanMs: +mean((s) => s.ms).toFixed(1),
    nodesPerMs: +(nodes / Math.max(1, ms)).toFixed(1),
  };
}

async function main() {
  const budgets = arg("budgets", "25,80,120,400,1800").split(",").map(Number);
  const levels = arg("levels", "medium,hard").split(",");
  const engineNames = arg("engines", "baseline,current").split(",");
  const sets = arg("sets", "mid,late").split(",");
  const outFile = arg("out", "");
  const table = flag("table");
  // --frozen: Date.now stands still during each search, as it does inside a
  // Cloudflare Worker, so only the node cap stops it and "ms" is the CPU a
  // capped search costs on the Durable Object's local fallback (A25).
  const frozen = flag("frozen");

  const engines: { name: string; ai: AiModule }[] = [];
  for (const e of engineNames) engines.push({ name: e, ai: await loadEngine(e) });
  const { game, board } = await rules();

  const build = (p: Pos) => {
    let g = game.newGame(game.UNRESTRICTED_NERF, game.UNRESTRICTED_NERF, 7);
    for (const u of p.moves) {
      const m = board.moveFromUCI(g.board, u);
      if (!m) throw new Error(`${p.label}: illegal ${u}`);
      g = game.playMove(g, m);
    }
    return g;
  };

  const posSets: Record<string, Pos[]> = {};
  if (sets.includes("mid")) posSets.mid = midPositions();
  if (sets.includes("late")) posSets.late = await latePositions();

  // Warm the JIT on every engine: the first pass pays compilation no later
  // pass does.
  for (const e of engines) {
    for (const p of posSets.mid?.slice(0, 3) ?? []) e.ai.pickAIMove(build(p), "hard", 60);
  }

  const results: Record<string, Record<string, Record<string, Record<string, ReturnType<typeof summarize>>>>> = {};
  const started = Date.now();
  let k = 0;
  for (const [setName, positions] of Object.entries(posSets)) {
    const samples = new Map<string, Sample[]>();
    for (let pi = 0; pi < positions.length; pi++) {
      const p = positions[pi];
      for (const level of levels) {
        for (const budget of budgets) {
          const order = (pi + k++) % 2 === 0 ? engines : [...engines].reverse();
          for (const e of order) {
            const g = build(p);
            const st: Stats = { depth: 0, rootMoves: 0, nodes: 0 };
            const t0 = performance.now();
            const realNow = Date.now;
            if (frozen) {
              const at = realNow();
              Date.now = () => at;
            }
            try {
              e.ai.pickAIMove(g, level as "medium" | "hard", budget, undefined, st);
            } finally {
              Date.now = realNow;
            }
            const ms = performance.now() - t0;
            const key = `${e.name}|${level}|${budget}`;
            if (!samples.has(key)) samples.set(key, []);
            samples.get(key)!.push({ depth: st.depth, nodes: st.nodes ?? 0, ms });
          }
        }
      }
    }
    for (const [key, xs] of samples) {
      const [e, level, budget] = key.split("|");
      ((((results[setName] ??= {})[e] ??= {})[level] ??= {})[budget] = summarize(xs));
    }
  }

  const load = os.loadavg().map((x) => x.toFixed(2)).join(" ");
  console.log(`bench-house-search: ${Object.entries(posSets).map(([k2, v]) => `${v.length} ${k2}`).join(" + ")} positions, ` +
    `engines ${engineNames.join(" vs ")} (baseline = ${BASELINE_COMMIT}), node ${process.version}, load ${load}, ` +
    `${((Date.now() - started) / 1000).toFixed(0)}s\n`);
  for (const [setName, byEngine] of Object.entries(results)) {
    console.log(`[${setName}]`);
    console.log("level   budget  " + engineNames.map((e) => `${e.padEnd(10)} depth(min-max)  nodes     n/ms   ms`).join(" | "));
    for (const level of levels) {
      for (const budget of budgets) {
        const cells = engineNames.map((e) => {
          const s = byEngine[e]?.[level]?.[String(budget)];
          if (!s) return "";
          return `${"".padEnd(10)} ${s.meanDepth.toFixed(2).padStart(5)} (${s.minDepth}-${s.maxDepth})    ` +
            `${String(s.meanNodes).padStart(8)} ${s.nodesPerMs.toFixed(0).padStart(6)} ${s.meanMs.toFixed(0).padStart(5)}`;
        });
        console.log(`${level.padEnd(7)} ${String(budget).padStart(5)}ms ${cells.join(" | ")}`);
      }
    }
    if (engineNames.length === 2) {
      const [a, b] = engineNames;
      for (const level of levels) {
        const deltas = budgets.map((bu) => {
          const x = byEngine[a]?.[level]?.[String(bu)];
          const y = byEngine[b]?.[level]?.[String(bu)];
          return x && y ? `${bu}ms ${(y.meanDepth - x.meanDepth >= 0 ? "+" : "")}${(y.meanDepth - x.meanDepth).toFixed(2)} ply, n/ms x${(y.nodesPerMs / Math.max(1, x.nodesPerMs)).toFixed(2)}` : "";
        });
        console.log(`  ${b} vs ${a}, ${level}: ${deltas.join("; ")}`);
      }
    }
    console.log("");
  }

  if (table) {
    console.log("Completed-depth table (mean over the set, for HB1's ladder re-spacing):");
    for (const [setName, byEngine] of Object.entries(results)) {
      for (const e of engineNames) {
        for (const level of levels) {
          const row = budgets.map((bu) => `${bu}:${byEngine[e]?.[level]?.[String(bu)]?.meanDepth.toFixed(2)}`);
          console.log(`  ${setName} ${e} ${level}  ${row.join("  ")}`);
        }
      }
    }
  }

  if (outFile) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(
      outFile,
      JSON.stringify(
        {
          script: "scripts/bench-house-search.ts",
          argv: process.argv.slice(2),
          baselineCommit: BASELINE_COMMIT,
          head: execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(),
          node: process.version,
          loadavg: os.loadavg(),
          frozenClock: frozen,
          when: new Date().toISOString(),
          results,
        },
        null,
        1,
      ),
    );
    console.log(`wrote ${outFile}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});

export {};
