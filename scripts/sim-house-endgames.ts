/**
 * HB2 (P7): do house bots convert won endgames, or throw them away by repetition?
 *
 *   ./node_modules/.bin/tsx scripts/sim-house-endgames.ts \
 *     --starts 10 --tiers 1350,1750 --defender-ms 80 --seed 1 [--engine current|baseline]
 *
 * Three families of won starts, `--starts` of each, seeded:
 *   kqk    king and queen against a bare king
 *   krk    king and rook against a bare king
 *   krpkp  king, rook and pawn against king and pawn (a rook up with pawns on)
 * The attacker has 50 of its own moves to capture the king. Anything else is a
 * failure and is reported by reason: threefold, fifty-move rule, or the 50-move
 * window running out. The attacker is White on even starts and Black on odd
 * ones, so a sign error on either side shows up.
 *
 * The attacker plays a house tier's move policy with the tier's profile PINNED
 * below as it was at the HB2 start commit (level, search budget, blunder roll as
 * a uniformly random legal move that does not trip its own nerf, which is what
 * pickHouseMove did), calling the chosen engine directly. It does not go through
 * bots.ts, so this measures the engine and nothing HB1 changes in parallel. The
 * budget is the tier's own (the remote engine clamps at 1800, so a 600ms tier
 * searches 600ms there), not the 80ms Durable Object ceiling.
 *
 * The defender is `hard` at `--defender-ms`, by default the SAME engine as the
 * attacker, because a defender that knows about repetition will try to use it,
 * and that is what a human in a lost ending does too.
 *
 * Engines: "current" is the working tree; "baseline" is src/engine/ai.ts at the
 * HB2 start commit, materialised from git into HB2_SCRATCH with its imports
 * pointed back at this checkout's rules files.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { UNRESTRICTED_NERF, legalMoves, newGame, playMove, type NerfGame } from "../src/engine/game";
import { triggersOwnNerfLoss } from "../src/engine/moveSafety";
import type { BoardState, Color, Piece, PieceType } from "../src/engine/types";

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

/** Tier profiles as of the HB2 start commit (src/lib/server/bots.ts,
 *  HOUSE_SKILL_PROFILES). Pinned so before and after measure the same policy. */
const PINNED_TIERS: Record<number, { level: "medium" | "hard"; budgetMs: number; blunderChance: number }> = {
  1350: { level: "medium", budgetMs: 120, blunderChance: 0.05 },
  1450: { level: "medium", budgetMs: 180, blunderChance: 0.035 },
  1550: { level: "hard", budgetMs: 240, blunderChance: 0.02 },
  1650: { level: "hard", budgetMs: 400, blunderChance: 0.01 },
  1750: { level: "hard", budgetMs: 600, blunderChance: 0.003 },
  1900: { level: "hard", budgetMs: 760, blunderChance: 0.002 },
  2000: { level: "hard", budgetMs: 1160, blunderChance: 0.001 },
  2200: { level: "hard", budgetMs: 1800, blunderChance: 0.0005 },
};

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

const FILE = (sq: number) => sq & 7;
const RANK = (sq: number) => sq >> 3;
const cheb = (a: number, b: number) => Math.max(Math.abs(FILE(a) - FILE(b)), Math.abs(RANK(a) - RANK(b)));

type Family = "kqk" | "krk" | "krpkp";

/** A random won start for `family` with `attacker` to move. Nothing attacks the
 *  defender's king at the start, the kings are not adjacent, and pawns sit on
 *  their own ranks 2 to 6. */
async function makeStart(family: Family, attacker: Color, rnd: (n: number) => number): Promise<BoardState> {
  const { isInCheck } = await import("../src/engine/board");
  const defender: Color = attacker === "w" ? "b" : "w";
  for (;;) {
    const pieces: (Piece | null)[] = Array(64).fill(null);
    const used = new Set<number>();
    const place = (type: PieceType, color: Color, ok: (sq: number) => boolean = () => true): number => {
      for (;;) {
        const sq = rnd(64);
        if (used.has(sq) || !ok(sq)) continue;
        used.add(sq);
        pieces[sq] = { type, color };
        return sq;
      }
    };
    const pawnOk = (color: Color) => (sq: number) => {
      const rel = color === "w" ? RANK(sq) : 7 - RANK(sq);
      return rel >= 1 && rel <= 5;
    };
    const ak = place("k", attacker);
    const dk = place("k", defender, (sq) => cheb(sq, ak) > 1);
    if (family === "kqk") place("q", attacker);
    else place("r", attacker);
    if (family === "krpkp") {
      place("p", attacker, pawnOk(attacker));
      place("p", defender, pawnOk(defender));
    }
    const board: BoardState = {
      pieces,
      turn: attacker,
      castling: { wk: false, wq: false, bk: false, bq: false },
      epTarget: null,
      halfmove: 0,
      fullmove: 1,
      history: [],
    };
    // The attacker moves first, so a piece standing next to the defender's
    // king is not lost; only a start where the king can be taken at once is
    // rejected, since that is not an ending at all.
    if (isInCheck(board, defender) || cheb(dk, ak) <= 1) continue;
    return board;
  }
}

function toFen(b: BoardState): string {
  let s = "";
  for (let r = 7; r >= 0; r--) {
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const p = b.pieces[r * 8 + f];
      if (!p) {
        empty++;
        continue;
      }
      if (empty) s += empty;
      empty = 0;
      s += p.color === "w" ? p.type.toUpperCase() : p.type;
    }
    if (empty) s += empty;
    if (r) s += "/";
  }
  return `${s} ${b.turn}`;
}

type GameOut = {
  family: Family;
  tier: number;
  start: number;
  fen: string;
  attacker: Color;
  outcome: "win" | "loss" | "threefold" | "fifty" | "window" | "other";
  reason: string;
  attackerMoves: number;
  blunders: number;
};

async function main() {
  const starts = Number(arg("starts", "10"));
  const tiers = arg("tiers", "1350,1750").split(",").map(Number);
  const defenderMs = Number(arg("defender-ms", "80"));
  const seed = Number(arg("seed", "1"));
  const engineName = arg("engine", "current");
  const defenderName = arg("defender-engine", engineName);
  const families = arg("families", "kqk,krk,krpkp").split(",") as Family[];
  const outFile = arg("out", "");
  const WINDOW = 50;

  const attackerAi = await loadEngine(engineName);
  const defenderAi = defenderName === engineName ? attackerAi : await loadEngine(defenderName);

  const games: GameOut[] = [];
  const t0 = Date.now();
  for (const tier of tiers) {
    const prof = PINNED_TIERS[tier];
    if (!prof) throw new Error(`no pinned profile for tier ${tier}`);
    for (const family of families) {
      for (let i = 0; i < starts; i++) {
        // The start depends only on (seed, family, i), so every tier and every
        // engine plays the same positions.
        const startRnd = xorshift((seed * 1_000_003) ^ (families.indexOf(family) * 7919 + i * 104729 + 17));
        const attacker: Color = i % 2 === 0 ? "w" : "b";
        const board = await makeStart(family, attacker, startRnd);
        const fen = toFen(board);
        const g: NerfGame = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed + i);
        g.board = board;
        const rnd = xorshift((seed * 31337) ^ (tier * 97 + families.indexOf(family) * 13 + i * 7 + 1));
        let attackerMoves = 0;
        let blunders = 0;
        while (!g.result && attackerMoves < WINDOW) {
          const mover = g.board.turn;
          let mv;
          if (mover === attacker) {
            if (rnd(10_000) < Math.round(prof.blunderChance * 10_000)) {
              const all = legalMoves(g);
              const safe = all.filter((m) => !triggersOwnNerfLoss(g, m));
              const pool = safe.length ? safe : all;
              mv = pool.length ? pool[rnd(pool.length)] : null;
              blunders++;
            } else {
              mv = attackerAi.pickAIMove(g, prof.level, prof.budgetMs);
            }
            attackerMoves++;
          } else {
            mv = defenderAi.pickAIMove(g, "hard", defenderMs);
          }
          if (!mv) break;
          playMove(g, mv);
        }
        let outcome: GameOut["outcome"] = "window";
        const reason = g.result?.reason ?? `no king capture in ${WINDOW} moves`;
        if (g.result) {
          if (g.result.winner === attacker) outcome = "win";
          else if (g.result.winner === (attacker === "w" ? "b" : "w")) outcome = "loss";
          else if (/threefold/.test(g.result.reason)) outcome = "threefold";
          else if (/fifty/.test(g.result.reason)) outcome = "fifty";
          else outcome = "other";
        }
        games.push({ family, tier, start: i, fen, attacker, outcome, reason, attackerMoves, blunders });
        process.stdout.write(
          `${tier} ${family} #${i} ${attacker}: ${outcome.padEnd(9)} after ${attackerMoves} moves` +
            `${blunders ? ` (${blunders} blunder rolls)` : ""}\n`,
        );
      }
    }
  }

  const wilson = (k: number, n: number) => {
    if (!n) return [0, 0];
    const z = 1.96;
    const p = k / n;
    const d = 1 + (z * z) / n;
    const c = (p + (z * z) / (2 * n)) / d;
    const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
    return [Math.max(0, c - h), Math.min(1, c + h)];
  };
  const summary: Record<string, unknown> = {};
  console.log(`\nengine ${engineName} (defender ${defenderName} hard@${defenderMs}ms), ${starts} starts per family, ` +
    `seed ${seed}, ${((Date.now() - t0) / 1000).toFixed(0)}s, load ${os.loadavg().map((x) => x.toFixed(1)).join(" ")}`);
  for (const tier of tiers) {
    for (const family of families) {
      const xs = games.filter((g) => g.tier === tier && g.family === family);
      const wins = xs.filter((g) => g.outcome === "win");
      const [lo, hi] = wilson(wins.length, xs.length);
      const by = (o: GameOut["outcome"]) => xs.filter((g) => g.outcome === o).length;
      const med = wins.map((g) => g.attackerMoves).sort((a, b) => a - b)[wins.length >> 1] ?? null;
      summary[`${tier}/${family}`] = {
        n: xs.length,
        wins: wins.length,
        wilson95: [+lo.toFixed(3), +hi.toFixed(3)],
        threefold: by("threefold"),
        fifty: by("fifty"),
        window: by("window"),
        loss: by("loss"),
        medianMovesToWin: med,
      };
      console.log(
        `  ${tier} ${family.padEnd(6)} converted ${wins.length}/${xs.length} (95% ${Math.round(lo * 100)}-${Math.round(hi * 100)}%)` +
          `  threefold ${by("threefold")}  fifty ${by("fifty")}  window ${by("window")}  loss ${by("loss")}` +
          `  median moves to win ${med ?? "-"}`,
      );
    }
  }
  const threefolds = games.filter((g) => g.outcome === "threefold").length;
  console.log(`  threefold draws with a rook or more ahead: ${threefolds} of ${games.length}`);

  if (outFile) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(
      outFile,
      JSON.stringify(
        {
          script: "scripts/sim-house-endgames.ts",
          argv: process.argv.slice(2),
          baselineCommit: BASELINE_COMMIT,
          head: execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim(),
          loadavg: os.loadavg(),
          when: new Date().toISOString(),
          summary,
          threefolds,
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
