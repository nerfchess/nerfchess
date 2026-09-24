/**
 * HB2 (P12): is the new engine stronger than the one it replaced, head to head?
 *
 *   ./node_modules/.bin/tsx scripts/sim-house-engine-ab.ts --baseline bbe4271 --budget 120 --pairs 60 --seed 1
 *
 * The baseline is src/engine/ai.ts at `--baseline`, read from git into a scratch
 * dir (HB2_SCRATCH, default os.tmpdir()/hb2-engines) with its imports pointed
 * back at this checkout's rules files, so no second engine copy is committed and
 * both engines play under exactly the same rules code. The challenger is the
 * working tree.
 *
 * Each pair starts from one of 30 book openings (the second pass over the book
 * adds one seeded random king-safe ply), and is played twice with colours
 * swapped. Both sides play `hard` at `--budget` ms per move with no nerfs, and
 * the game runs under playMove's own rules: king capture, threefold, fifty
 * moves. At `--max-plies` the game is adjudicated: a side 300cp or more ahead
 * in material wins, anything closer is a draw.
 *
 * Reported: the challenger's score (wins + draws/2) with a Wilson 95% interval
 * over games, and the pair-level mean with a normal 95% interval (the pair is
 * the unit that controls for the opening).
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isInCheck, makeMove, moveFromUCI } from "../src/engine/board";
import { UNRESTRICTED_NERF, legalMoves, newGame, playMove, type NerfGame } from "../src/engine/game";
import type { Color } from "../src/engine/types";

type AiModule = typeof import("../src/engine/ai");

async function loadEngine(spec: string): Promise<AiModule> {
  if (spec === "current") return import("../src/engine/ai");
  const root = process.cwd();
  const src = execFileSync("git", ["show", `${spec}:src/engine/ai.ts`], { cwd: root, encoding: "utf8" });
  const dir = process.env.HB2_SCRATCH ?? path.join(os.tmpdir(), "hb2-engines");
  fs.mkdirSync(dir, { recursive: true });
  const out = src.replace(
    /from "\.\/([A-Za-z]+)"/g,
    (_m, f: string) => `from ${JSON.stringify(path.join(root, "src/engine", f))}`,
  );
  const file = path.join(dir, `ai-${spec}.ts`);
  fs.writeFileSync(file, out);
  return (await import(pathToFileURL(file).href)) as AiModule;
}

function arg(name: string, dflt: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}

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

const BOOK: string[] = [
  "e2e4 e7e5 g1f3 b8c6 f1b5 a7a6",
  "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4",
  "e2e4 e7e6 d2d4 d7d5 b1c3 g8f6",
  "e2e4 c7c6 d2d4 d7d5 e4e5 c8f5",
  "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6",
  "d2d4 g8f6 c2c4 g7g6 b1c3 f8g7",
  "d2d4 g8f6 c2c4 e7e6 b1c3 f8b4",
  "c2c4 e7e5 b1c3 g8f6 g1f3 b8c6",
  "g1f3 d7d5 g2g3 g8f6 f1g2 e7e6",
  "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5",
  "e2e4 d7d5 e4d5 d8d5 b1c3 d5a5",
  "e2e4 g8f6 e4e5 f6d5 d2d4 d7d6",
  "d2d4 d7d5 c2c4 c7c6 g1f3 g8f6",
  "e2e4 e7e5 f2f4 e5f4 g1f3 g7g5",
  "d2d4 f7f5 g2g3 g8f6 f1g2 e7e6",
  "e2e4 d7d6 d2d4 g8f6 b1c3 g7g6",
  "e2e4 e7e5 g1f3 g8f6 f3e5 d7d6",
  "d2d4 g8f6 c2c4 c7c5 d4d5 e7e6",
  "e2e4 c7c5 b1c3 b8c6 g2g3 g7g6",
  "c2c4 c7c5 g1f3 g8f6 b1c3 b8c6",
  "e2e4 e7e5 g1f3 b8c6 d2d4 e5d4",
  "d2d4 d7d5 g1f3 g8f6 c1f4 e7e6",
  "e2e4 c7c5 g1f3 b8c6 d2d4 c5d4",
  "e2e4 c7c5 g1f3 e7e6 d2d4 c5d4",
  "d2d4 g8f6 g1f3 g7g6 g2g3 f8g7",
  "e2e4 e7e5 b1c3 g8f6 f2f4 d7d5",
  "b2b3 e7e5 c1b2 b8c6 e2e3 d7d5",
  "e2e4 b7b6 d2d4 c8b7 f1d3 e7e6",
  "d2d4 e7e6 c2c4 f8b4 c1d2 d8e7",
  "e2e4 e7e5 g1f3 b8c6 b1c3 g8f6",
];

const VAL: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
function material(g: NerfGame, c: Color): number {
  let s = 0;
  for (const p of g.board.pieces) if (p && p.color === c) s += VAL[p.type];
  return s;
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

async function main() {
  const baselineSpec = arg("baseline", "bbe4271");
  const budget = Number(arg("budget", "120"));
  const pairs = Number(arg("pairs", "60"));
  const seed = Number(arg("seed", "1"));
  const maxPlies = Number(arg("max-plies", "240"));
  const level = arg("level", "hard") as "medium" | "hard";
  const outFile = arg("out", "");

  const base = await loadEngine(baselineSpec);
  const cur = await loadEngine("current");

  type GameRec = { pair: number; newColor: Color; opening: string; result: string; score: number; plies: number };
  const games: GameRec[] = [];
  const pairScores: number[] = [];
  const t0 = Date.now();
  for (let p = 0; p < pairs; p++) {
    const opening = BOOK[p % BOOK.length].split(" ");
    const extra = p >= BOOK.length ? 1 : 0;
    let pairScore = 0;
    let openingDesc = "";
    for (const newColor of ["w", "b"] as Color[]) {
      const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed + p);
      const played: string[] = [];
      for (const u of opening) {
        playMove(g, moveFromUCI(g.board, u)!);
        played.push(u);
      }
      // The extra ply is a pure function of (seed, pair), so both games of the
      // pair start from the same position.
      if (extra) {
        const safe = legalMoves(g).filter((m) => !isInCheck(makeMove(g.board, m), g.board.turn));
        const pick = safe[xorshift(seed * 31 + p)(safe.length)];
        playMove(g, pick);
        played.push(`${pick.from}-${pick.to}`);
      }
      openingDesc = played.join(" ");
      let plies = 0;
      while (!g.result && plies < maxPlies) {
        const engine = g.board.turn === newColor ? cur : base;
        const m = engine.pickAIMove(g, level, budget);
        if (!m) break;
        playMove(g, m);
        plies++;
      }
      let score: number;
      let result: string;
      if (g.result) {
        const w = g.result.winner;
        score = w === newColor ? 1 : w === "draw" || w == null ? 0.5 : 0;
        result = g.result.reason;
      } else {
        const diff = material(g, newColor) - material(g, newColor === "w" ? "b" : "w");
        score = diff >= 300 ? 1 : diff <= -300 ? 0 : 0.5;
        result = `adjudicated at ${maxPlies} plies (material ${diff >= 0 ? "+" : ""}${diff})`;
      }
      pairScore += score;
      games.push({ pair: p, newColor, opening: openingDesc, result, score, plies });
    }
    pairScores.push(pairScore / 2);
    const done = games.length;
    const total = games.reduce((a, x) => a + x.score, 0);
    process.stdout.write(
      `pair ${String(p + 1).padStart(2)}: new scores ${pairScore}/2  running ${(100 * total / done).toFixed(1)}% over ${done} games, ` +
        `${((Date.now() - t0) / 1000).toFixed(0)}s\n`,
    );
  }

  const n = games.length;
  const wins = games.filter((x) => x.score === 1).length;
  const draws = games.filter((x) => x.score === 0.5).length;
  const losses = n - wins - draws;
  const score = (wins + draws / 2) / n;
  const [lo, hi] = wilson(wins + draws / 2, n);
  const mean = pairScores.reduce((a, b) => a + b, 0) / pairScores.length;
  const sd = Math.sqrt(pairScores.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, pairScores.length - 1));
  const half = (1.96 * sd) / Math.sqrt(pairScores.length);
  console.log(
    `\nnew engine vs ${baselineSpec}: ${level}@${budget}ms, ${pairs} pairs (${n} games): +${wins} =${draws} -${losses}, ` +
      `score ${(100 * score).toFixed(1)}% (Wilson 95% ${(100 * lo).toFixed(1)}-${(100 * hi).toFixed(1)}%; ` +
      `pair mean 95% ${(100 * (mean - half)).toFixed(1)}-${(100 * (mean + half)).toFixed(1)}%), ` +
      `${((Date.now() - t0) / 60000).toFixed(1)} min, load ${os.loadavg().map((x) => x.toFixed(1)).join(" ")}`,
  );
  if (outFile) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(
      outFile,
      JSON.stringify(
        {
          script: "scripts/sim-house-engine-ab.ts",
          argv: process.argv.slice(2),
          head: execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(),
          loadavg: os.loadavg(),
          when: new Date().toISOString(),
          wins,
          draws,
          losses,
          score: +score.toFixed(4),
          wilson95: [+lo.toFixed(4), +hi.toFixed(4)],
          pairMean95: [+(mean - half).toFixed(4), +(mean + half).toFixed(4)],
          games,
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
