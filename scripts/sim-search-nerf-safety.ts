/**
 * HB2 (P4): does the bot walk into a loss its OWN nerf defines?
 *
 *   ./node_modules/.bin/tsx scripts/sim-search-nerf-safety.ts --positions 240 --budget 400 --seed 1 \
 *     [--arms baseline,current,current-noP4]
 *   ./node_modules/.bin/tsx scripts/sim-search-nerf-safety.ts --ab --nerfs 8 --pairs 20 [--ab-budget 40]
 *
 * The search is blind to nerfs below the root: `isSelfLosing` drops a root move
 * that trips the mover's own `checkLoss` at once, but nothing looks one ply
 * further, where the OPPONENT's reply is what trips it (the last knight taken
 * under "lose without a knight", an enemy pawn let into your half under Hold
 * Them Back, the third check under Three Check). A human finds those replies.
 *
 * Position mode. Positions come from self-play between two random nerfs that
 * both carry a `checkLoss` hook (37 of the 241 in the opening pool), generated
 * DETERMINISTICALLY (fixed-depth sampling search with a seeded RNG, no clock)
 * and frozen to docs/polish-pass/evidence/HB/HB2/nerf-safety-positions.json, so
 * every arm and every later run reads the same boards. A position is kept when
 * the side to move holds a live `checkLoss` nerf and at least one root move is
 * safe, i.e. an alternative exists. For each arm the chosen move is judged by
 * brute force: it is UNSAFE if some opponent pseudo-legal reply (generateMoves:
 * the opponent's own nerf is never consulted, just as the filter never reads
 * it) makes the mover's `checkLoss` fire, with the capture tallies updated the
 * way playMove updates them before checkLossConditions runs.
 *
 * Arms: "baseline" (the HB2 start commit, materialised from git), "current"
 * (the working tree) and "current-noP4" (the working tree with the root filter
 * switched off through setEngineTuning), run interleaved per position so box
 * load lands on all of them equally. The depth cost of the filter is current
 * against current-noP4.
 *
 * A/B mode. Paired games at a small budget: in each pair both sides hold the
 * same checkLoss nerf, the filter is ON for one side and OFF for the other, and
 * the pair is replayed with colours swapped. Reported: the ON side's win-rate
 * delta over OFF in points with a 95% interval over pairs.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { generateMoves, makeMove, moveFromUCI, moveToUCI } from "../src/engine/board";
import {
  legalMoves,
  makeContext,
  newGame,
  nerfDisabled,
  playMove,
  type NerfGame,
} from "../src/engine/game";
import { triggersOwnNerfLoss } from "../src/engine/moveSafety";
import { openingNerfPool } from "../src/engine/nerfs/library";
import type { Nerf } from "../src/engine/nerf";
import type { Color, Move } from "../src/engine/types";

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

const EVIDENCE = "docs/polish-pass/evidence/HB/HB2";
const POS_FILE = path.join(EVIDENCE, "nerf-safety-positions.json");
const FIXED_DEPTH_BUDGET_MS = 10_000_000;

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

function wilson(k: number, n: number): [number, number] {
  if (!n) return [0, 1];
  const z = 1.96;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

const CHECKLOSS_NERFS: Nerf[] = openingNerfPool().filter((n) => !!n.checkLoss);
const NERF_BY_ID = new Map(openingNerfPool().map((n) => [n.id, n]));

/** True when some opponent pseudo-legal reply to `m` makes the mover's own
 *  checkLoss fire. This is the judge, so it is exhaustive and exact about the
 *  capture tallies; the engine's filter may be cheaper but must agree. */
function allowsNerfLossInOne(g: NerfGame, m: Move): boolean {
  const me = g.board.turn;
  const opp: Color = me === "w" ? "b" : "w";
  const slot = me === "w" ? g.white : g.black;
  if (!slot.nerf.checkLoss || nerfDisabled(g, me) || g.buffs?.diff) return false;
  const nb = makeMove(g.board, m);
  if (nb === g.board) return false;
  for (const r of generateMoves(nb)) {
    const tgt = nb.pieces[r.capturedSquare ?? r.to];
    if (tgt?.type === "k") continue; // king capture ends the game on its own terms
    const nb2 = makeMove(nb, r);
    if (nb2 === nb) continue;
    const captured = { w: { ...g.captured.w }, b: { ...g.captured.b } };
    if (m.captured) captured[me][m.captured] += 1;
    if (r.captured) captured[opp][r.captured] += 1;
    const ctx = makeContext({ ...g, board: nb2, captured }, me);
    if (slot.nerf.checkLoss(slot.state, ctx)) return true;
  }
  return false;
}

type PosRec = {
  id: string;
  whiteNerf: string;
  blackNerf: string;
  gameSeed: number;
  moves: string[];
  safe: number;
  unsafe: number;
};

function rebuild(p: PosRec): NerfGame {
  const g = newGame(NERF_BY_ID.get(p.whiteNerf)!, NERF_BY_ID.get(p.blackNerf)!, p.gameSeed);
  for (const u of p.moves) {
    const m = moveFromUCI(g.board, u);
    if (!m) throw new Error(`${p.id}: cannot replay ${u}`);
    playMove(g, m);
  }
  return g;
}

/** Deterministic self-play mover: a fixed-depth sampling search (no clock) plus
 *  a seeded 10% of random moves that do not trip the mover's nerf at once. */
function genMover(base: AiModule, rnd: (n: number) => number) {
  const weaken = {
    params: { maxDepth: 2, extendedEval: false, topK: 3, temperatureCp: 60, sampleWindowCp: 150, evalNoiseCp: 20 },
    random: rnd,
  };
  return (g: NerfGame): Move | null => {
    if (rnd(10) === 0) {
      const all = legalMoves(g).filter((m) => !triggersOwnNerfLoss(g, m));
      if (all.length) return all[rnd(all.length)];
    }
    return base.pickAIMove(g, "medium", FIXED_DEPTH_BUDGET_MS, weaken);
  };
}

async function makePositions(n: number, seed: number): Promise<PosRec[]> {
  const base = await loadEngine("baseline");
  const out: PosRec[] = [];
  for (let gi = 0; out.length < n && gi < 5000; gi++) {
    const rnd = xorshift(seed * 1_000_003 + gi * 7919 + 1);
    const wN = CHECKLOSS_NERFS[rnd(CHECKLOSS_NERFS.length)];
    const bN = CHECKLOSS_NERFS[rnd(CHECKLOSS_NERFS.length)];
    const gameSeed = seed * 1000 + gi;
    const g = newGame(wN, bN, gameSeed);
    const mover = genMover(base, rnd);
    const moves: string[] = [];
    let taken = 0;
    while (!g.result && moves.length < 160 && taken < 6 && out.length < n) {
      const me = g.board.turn;
      const slot = me === "w" ? g.white : g.black;
      if (moves.length >= 6 && moves.length % 2 === gi % 2 && slot.nerf.checkLoss && !nerfDisabled(g, me)) {
        const root = legalMoves(g).filter((m) => !triggersOwnNerfLoss(g, m));
        let safe = 0;
        let unsafe = 0;
        for (const m of root) {
          if (allowsNerfLossInOne(g, m)) unsafe++;
          else safe++;
        }
        if (safe > 0) {
          out.push({ id: `g${gi}p${moves.length}`, whiteNerf: wN.id, blackNerf: bN.id, gameSeed, moves: [...moves], safe, unsafe });
          taken++;
        }
      }
      const m = mover(g);
      if (!m) break;
      moves.push(moveToUCI(m));
      playMove(g, m);
    }
  }
  fs.mkdirSync(EVIDENCE, { recursive: true });
  fs.writeFileSync(
    POS_FILE,
    JSON.stringify(
      {
        note:
          `Generated by scripts/sim-search-nerf-safety.ts (seed ${seed}) with the baseline engine (${BASELINE_COMMIT}) ` +
          "at fixed depth 2 with seeded sampling and 10% seeded random moves. Frozen: do not regenerate.",
        positions: out,
      },
      null,
      1,
    ),
  );
  return out;
}

async function positionMode() {
  const n = Number(arg("positions", "240"));
  const budget = Number(arg("budget", "400"));
  const seed = Number(arg("seed", "1"));
  const armNames = arg("arms", "baseline,current,current-noP4").split(",");
  const outFile = arg("out", "");

  let positions: PosRec[];
  if (fs.existsSync(POS_FILE) && !flag("regen")) {
    positions = (JSON.parse(fs.readFileSync(POS_FILE, "utf8")).positions as PosRec[]).slice(0, n);
    if (positions.length < n) positions = await makePositions(n, seed);
  } else {
    positions = await makePositions(n, seed);
  }

  type Arm = { name: string; ai: AiModule; p4: boolean };
  const arms: Arm[] = [];
  for (const name of armNames) {
    if (name === "current-noP4") arms.push({ name, ai: await loadEngine("current"), p4: false });
    else arms.push({ name, ai: await loadEngine(name), p4: true });
  }
  const tune = (a: Arm) => {
    const set = (a.ai as unknown as { setEngineTuning?: (p: Record<string, unknown>) => unknown }).setEngineTuning;
    if (set) set({ nerfSafety: a.p4 });
  };

  const res = new Map<string, { unsafe: number; unsafeAtRisk: number; depth: number[]; ms: number[] }>();
  for (const a of arms) res.set(a.name, { unsafe: 0, unsafeAtRisk: 0, depth: [], ms: [] });
  const atRisk = positions.filter((p) => p.unsafe > 0).length;
  const t0 = Date.now();
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    const order = i % 2 === 0 ? arms : [...arms].reverse();
    for (const a of order) {
      tune(a);
      const g = rebuild(p);
      const st = { depth: 0, rootMoves: 0, nodes: 0 };
      const t = performance.now();
      const m = a.ai.pickAIMove(g, "hard", budget, undefined, st);
      const ms = performance.now() - t;
      const r = res.get(a.name)!;
      r.depth.push(st.depth);
      r.ms.push(ms);
      if (m && allowsNerfLossInOne(g, m)) {
        r.unsafe++;
        if (p.unsafe > 0) r.unsafeAtRisk++;
      }
    }
  }
  for (const a of arms) {
    a.p4 = true;
    tune(a);
  }

  const summary: Record<string, unknown> = {};
  console.log(
    `nerf safety: ${positions.length} positions (${atRisk} where some root move allows a loss in one), ` +
      `hard@${budget}ms, ${((Date.now() - t0) / 1000).toFixed(0)}s, load ${os.loadavg().map((x) => x.toFixed(1)).join(" ")}`,
  );
  for (const a of arms) {
    const r = res.get(a.name)!;
    const [lo, hi] = wilson(r.unsafe, positions.length);
    const meanDepth = r.depth.reduce((x, y) => x + y, 0) / r.depth.length;
    const meanMs = r.ms.reduce((x, y) => x + y, 0) / r.ms.length;
    summary[a.name] = {
      unsafe: r.unsafe,
      n: positions.length,
      rate: +(r.unsafe / positions.length).toFixed(4),
      wilson95: [+lo.toFixed(4), +hi.toFixed(4)],
      unsafeAmongAtRisk: r.unsafeAtRisk,
      atRisk,
      meanDepth: +meanDepth.toFixed(3),
      meanMs: +meanMs.toFixed(1),
    };
    console.log(
      `  ${a.name.padEnd(14)} unsafe picks ${r.unsafe}/${positions.length} ` +
        `(${(100 * r.unsafe / positions.length).toFixed(1)}%, 95% ${(100 * lo).toFixed(1)}-${(100 * hi).toFixed(1)}%), ` +
        `${r.unsafeAtRisk}/${atRisk} of the at-risk positions, mean depth ${meanDepth.toFixed(2)}, mean ${meanMs.toFixed(0)}ms`,
    );
  }
  if (outFile) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(
      outFile,
      JSON.stringify(
        {
          script: "scripts/sim-search-nerf-safety.ts",
          argv: process.argv.slice(2),
          baselineCommit: BASELINE_COMMIT,
          head: execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(),
          loadavg: os.loadavg(),
          when: new Date().toISOString(),
          summary,
        },
        null,
        1,
      ),
    );
    console.log(`wrote ${outFile}`);
  }
}

async function abMode() {
  const nerfCount = Number(arg("nerfs", "8"));
  const pairs = Number(arg("pairs", "20"));
  const budget = Number(arg("ab-budget", "40"));
  const seed = Number(arg("seed", "1"));
  const maxPlies = Number(arg("max-plies", "200"));
  const outFile = arg("out", "");
  const ai = await loadEngine("current");
  const setTuning = (ai as unknown as { setEngineTuning?: (p: Record<string, unknown>) => unknown }).setEngineTuning;
  if (!setTuning) throw new Error("the current engine has no setEngineTuning, so the filter cannot be toggled");

  const rnd0 = xorshift(seed * 7717 + 3);
  const pool = [...CHECKLOSS_NERFS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rnd0(i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const nerfs = pool.slice(0, nerfCount);

  // Score for the filter-ON side, one entry per pair: (game A + game B) / 2.
  const pairScores: number[] = [];
  const perNerf: Record<string, { pairs: number; score: number; nerfLossOn: number; nerfLossOff: number }> = {};
  const t0 = Date.now();
  for (const nerf of nerfs) {
    perNerf[nerf.id] = { pairs: 0, score: 0, nerfLossOn: 0, nerfLossOff: 0 };
    for (let p = 0; p < pairs; p++) {
      let pairScore = 0;
      for (const onColor of ["w", "b"] as Color[]) {
        const gameSeed = seed * 100_000 + nerfs.indexOf(nerf) * 1000 + p;
        const g = newGame(nerf, nerf, gameSeed);
        // A short seeded random opening so pairs differ; identical for both
        // games of the pair.
        const openRnd = xorshift(gameSeed * 31 + 7);
        const openPlies = 2 + openRnd(3);
        for (let i = 0; i < openPlies && !g.result; i++) {
          const all = legalMoves(g).filter((m) => !triggersOwnNerfLoss(g, m));
          if (!all.length) break;
          playMove(g, all[openRnd(all.length)]);
        }
        let plies = 0;
        while (!g.result && plies < maxPlies) {
          const side = g.board.turn;
          setTuning({ nerfSafety: side === onColor });
          const m = ai.pickAIMove(g, "hard", budget);
          if (!m) break;
          playMove(g, m);
          plies++;
        }
        setTuning({ nerfSafety: true });
        const w = g.result?.winner;
        const s = w === onColor ? 1 : w === "draw" || w == null ? 0.5 : 0;
        pairScore += s;
        const reason = g.result?.reason ?? "";
        if (w && w !== "draw" && !/king captured/.test(reason)) {
          // Lost to a nerf: record whose.
          if (w === onColor) perNerf[nerf.id].nerfLossOff++;
          else perNerf[nerf.id].nerfLossOn++;
        }
      }
      pairScores.push(pairScore / 2);
      perNerf[nerf.id].pairs++;
      perNerf[nerf.id].score += pairScore / 2;
    }
    const r = perNerf[nerf.id];
    console.log(
      `  ${nerf.id.padEnd(30)} ON scores ${(100 * r.score / r.pairs).toFixed(1)}% over ${r.pairs} pairs; ` +
        `nerf losses ON ${r.nerfLossOn}, OFF ${r.nerfLossOff}`,
    );
  }
  // Win-rate delta ON minus OFF, per pair: 2 * pairScore - 1, in points.
  const d = pairScores.map((s) => 100 * (2 * s - 1));
  const mean = d.reduce((a, b) => a + b, 0) / d.length;
  const sd = Math.sqrt(d.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, d.length - 1));
  const half = (1.96 * sd) / Math.sqrt(d.length);
  console.log(
    `\nA/B filter ON vs OFF: ${d.length} pairs (${2 * d.length} games), hard@${budget}ms, ` +
      `win-rate delta ${mean >= 0 ? "+" : ""}${mean.toFixed(1)} points, 95% ${(mean - half).toFixed(1)} to ${(mean + half).toFixed(1)}, ` +
      `${((Date.now() - t0) / 1000).toFixed(0)}s`,
  );
  if (outFile) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(
      outFile,
      JSON.stringify(
        {
          script: "scripts/sim-search-nerf-safety.ts --ab",
          argv: process.argv.slice(2),
          head: execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(),
          loadavg: os.loadavg(),
          when: new Date().toISOString(),
          pairs: d.length,
          deltaPoints: +mean.toFixed(2),
          ci95: [+(mean - half).toFixed(2), +(mean + half).toFixed(2)],
          perNerf,
        },
        null,
        1,
      ),
    );
    console.log(`wrote ${outFile}`);
  }
}

(flag("ab") ? abMode() : positionMode()).catch((e) => {
  console.error(e);
  process.exit(2);
});
