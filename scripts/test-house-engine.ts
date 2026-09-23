/**
 * HB2: regression checks for the engine in src/engine/ai.ts, plus the frozen
 * horizon-tactics set.
 *
 *   ./node_modules/.bin/tsx scripts/test-house-engine.ts            # assertions
 *   ./node_modules/.bin/tsx scripts/test-house-engine.ts --tactics  # solve rates
 *       [--harvest] [--budgets 40,120,400] [--engines baseline,current]
 *
 * The assertions pin what HB2 changed, one line of the HB plan each:
 *   contract   SearchStats.scoreCp on the argmax and sampling paths; king
 *              captures score +-(KING_CAPTURE_SCORE - ply), always at least
 *              90000 (the eval bar's threshold); the faster capture wins
 *   P6         quiescence does not stand pat while its own king is attacked; a
 *              search whose depth 1 never completes still returns a move that
 *              leaves the king safe
 *   P4         a root move after which an opponent reply trips the mover's own
 *              nerf is dropped while an alternative exists, and the filter
 *              never consults the opponent's nerf
 *   P7         a move back into a position from the game history scores as a
 *              draw (with the configured contempt)
 *   P12        at a fixed depth with no deadline and the selective pruning off,
 *              the transposition table changes node counts and nothing else:
 *              identical root scores on the 27 bench positions
 *   internals  the fast attack test agrees with board.isInCheck and the
 *              incremental hash agrees with a from-scratch hash
 *
 * --tactics measures the solve rate on positions whose best move is a checking
 * fork or skewer just past the depth a small budget reaches. The set is
 * harvested ONCE with the baseline engine at fixed depths (no clock) and frozen
 * to docs/polish-pass/evidence/HB/HB2/tactics-set.json: depth 4 finds a line
 * whose first or third ply is the mover's checking fork or skewer, and depth 3
 * plays something else that judges at least 150cp worse. A position counts as
 * solved when the engine plays the harvested move or any move the fixed judge
 * (baseline, depth 4 overall, the harvest's own depth) scores within 50cp of
 * the harvested score.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  attackedBy,
  generateMoves,
  isInCheck,
  makeMove,
  moveFromUCI,
  moveToUCI,
} from "../src/engine/board";
import {
  UNRESTRICTED_NERF,
  legalMoves,
  makeContext,
  newGame,
  playMove,
  type NerfGame,
} from "../src/engine/game";
import { openingNerfPool } from "../src/engine/nerfs/library";
import type { Nerf } from "../src/engine/nerf";
import type { BoardState, Color, Move, Piece, PieceType } from "../src/engine/types";

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
const TACTICS_FILE = path.join(EVIDENCE, "tactics-set.json");
/** A budget no search here reaches: a maxDepth-bounded search then runs to its
 *  depth whatever the clock does (0 would not: the deepening loop compares the
 *  elapsed time against it). */
const BIG = 10_000_000;

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

const LINES: string[][] = [
  "e2e4 e7e5 g1f3 b8c6 f1c4 f8c5 c2c3 g8f6 d2d4 e5d4 c3d4 c5b4 c1d2 b4d2 b1d2 d7d5 e4d5 f6d5 d1b3 c6e7 e1g1 e8g8 f1e1 c7c6"
    .split(" "),
  "d2d4 d7d5 c2c4 e7e6 b1c3 g8f6 c1g5 f8e7 e2e3 e8g8 g1f3 h7h6 g5h4 b7b6 c4d5 f6d5 h4e7 d8e7 c3d5 e6d5 a1c1 c8e6 f1d3 c7c5"
    .split(" "),
  "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1e3 e7e5 d4b3 f8e7 f2f3 e8g8 d1d2 b8c6 e1c1 c8e6 g2g4 b7b5 g4g5 f6d7"
    .split(" "),
];

function fromUci(moves: string[], white: Nerf = UNRESTRICTED_NERF, black: Nerf = UNRESTRICTED_NERF, seed = 7): NerfGame {
  const g = newGame(white, black, seed);
  for (const u of moves) {
    const m = moveFromUCI(g.board, u);
    if (!m) throw new Error(`illegal ${u}`);
    playMove(g, m);
  }
  return g;
}

function fromFen(fen: string, white: Nerf = UNRESTRICTED_NERF, black: Nerf = UNRESTRICTED_NERF): NerfGame {
  const [place, turn, castle, ep] = fen.split(" ");
  const pieces: (Piece | null)[] = Array(64).fill(null);
  const rows = place.split("/");
  for (let i = 0; i < 8; i++) {
    let f = 0;
    for (const ch of rows[i]) {
      if (/\d/.test(ch)) {
        f += Number(ch);
        continue;
      }
      const color: Color = ch === ch.toUpperCase() ? "w" : "b";
      pieces[(7 - i) * 8 + f] = { type: ch.toLowerCase() as PieceType, color };
      f++;
    }
  }
  const board: BoardState = {
    pieces,
    turn: turn as Color,
    castling: {
      wk: castle?.includes("K") ?? false,
      wq: castle?.includes("Q") ?? false,
      bk: castle?.includes("k") ?? false,
      bq: castle?.includes("q") ?? false,
    },
    epTarget: ep && ep !== "-" ? (ep.charCodeAt(0) - 97) + (Number(ep[1]) - 1) * 8 : null,
    halfmove: 0,
    fullmove: 1,
    history: [],
  };
  const g = newGame(white, black, 1);
  g.board = board;
  return g;
}

function midGames(): NerfGame[] {
  const out: NerfGame[] = [];
  for (const line of LINES) for (let n = 8; n <= line.length; n += 2) out.push(fromUci(line.slice(0, n)));
  return out;
}

// ---------------------------------------------------------------------------
// Assertions.
// ---------------------------------------------------------------------------
let failures = 0;
const ok = (m: string) => console.log(`  ok  ${m}`);
const bad = (m: string) => {
  failures++;
  console.log(`FAIL  ${m}`);
};
const check = (cond: boolean, m: string, why = "") => (cond ? ok(m) : bad(why ? `${m}: ${why}` : m));

type Stats = { depth: number; rootMoves: number; nodes?: number; scoreCp?: number };
const argmaxAt = (depth: number, extended = true) => ({
  params: { maxDepth: depth, extendedEval: extended, topK: 1, temperatureCp: 0, sampleWindowCp: 0, evalNoiseCp: 0 },
  random: (n: number) => n - 1,
});

async function assertions() {
  const ai = await loadEngine(arg("engine", "current"));
  const A = ai as AiModule & Record<string, unknown>;
  console.log(`engine assertions (${arg("engine", "current")})\n`);

  // --- contract -----------------------------------------------------------
  check(A.KING_CAPTURE_SCORE === 100000, "KING_CAPTURE_SCORE is exported and is 100000");
  check(typeof A.isKingCaptureScore === "function", "isKingCaptureScore is exported");
  const isKC = (cp: number) => (typeof A.isKingCaptureScore === "function" ? (A.isKingCaptureScore as (x: number) => boolean)(cp) : Math.abs(cp) >= 90000);

  {
    const st: Stats = { depth: 0, rootMoves: 0 };
    ai.pickAIMove(fromUci([]), "hard", 60, undefined, st);
    check(
      typeof st.scoreCp === "number" && Number.isFinite(st.scoreCp) && Math.abs(st.scoreCp) < 2000 && st.depth >= 1,
      "argmax path sets SearchStats.scoreCp",
      `scoreCp ${st.scoreCp}, depth ${st.depth}`,
    );
  }
  {
    const st: Stats = { depth: 0, rootMoves: 0 };
    const weaken = {
      params: { maxDepth: 2, extendedEval: false, topK: 4, temperatureCp: 120, sampleWindowCp: 300, evalNoiseCp: 60 },
      random: xorshift(5),
    };
    // 400ms, not a bullet budget: a cold first full-window search on a loaded
    // box can miss depth 1 at 60ms, and this line is about the field, not speed.
    ai.pickAIMove(fromUci(LINES[0].slice(0, 10)), "medium", 400, weaken, st);
    check(
      typeof st.scoreCp === "number" && Number.isFinite(st.scoreCp) && st.depth >= 1,
      "sampling path sets SearchStats.scoreCp and depth",
      `scoreCp ${st.scoreCp}, depth ${st.depth}`,
    );
  }
  {
    // White takes the king at once: ply 1.
    const g = fromFen("4k3/8/8/8/8/8/8/4RK2 w - - 0 1");
    const r = ai.analyzeBoard(g.board, BIG, 3);
    check(r.scoreCp === 99999 && r.move != null && moveToUCI(r.move) === "e1e8",
      "an immediate king capture scores KING_CAPTURE_SCORE - 1", `got ${r.scoreCp} ${r.move && moveToUCI(r.move)}`);
    const st: Stats = { depth: 0, rootMoves: 0 };
    ai.pickAIMove(g, "hard", 200, undefined, st);
    check(st.scoreCp === 99999, "pickAIMove reports the same king-capture score", `got ${st.scoreCp}`);
    check(isKC(99999) && isKC(-99990) && !isKC(89999) && !isKC(500), "isKingCaptureScore draws the line at 90000");
  }
  {
    // Black to move loses the king on ply 2 whatever it does.
    const g = fromFen("7k/6Q1/5K2/8/8/8/8/8 b - - 0 1");
    const r = ai.analyzeBoard(g.board, BIG, 3);
    check(r.scoreCp === -99998, "a king lost on ply 2 scores -(KING_CAPTURE_SCORE - 2)", `got ${r.scoreCp}`);
    check(Math.abs(r.scoreCp) >= 90000, "king-capture magnitudes stay at or above the eval bar's 90000");
  }
  {
    // The queen on e8 takes the king now; most other white moves keep the
    // check and take it two plies later. Flat scores tie them, so a sampling
    // tier picked among them at random. The faster one must win every time.
    const g = fromFen("4Q2k/6pp/8/8/8/8/8/4K3 w - - 0 1");
    let fast = 0;
    const N = 40;
    for (let s = 1; s <= N; s++) {
      const weaken = {
        params: { maxDepth: 2, extendedEval: false, topK: 4, temperatureCp: 150, sampleWindowCp: 300, evalNoiseCp: 0 },
        random: xorshift(s * 977),
      };
      const m = ai.pickAIMove(g, "medium", 200, weaken);
      if (m && moveToUCI(m) === "e8h8") fast++;
    }
    check(fast === N, "the faster of two king captures is chosen, sampling path", `${fast}/${N}`);
    const m = ai.pickAIMove(g, "hard", 200);
    check(!!m && moveToUCI(m) === "e8h8", "the faster of two king captures is chosen, argmax path");
  }

  // --- P6 -------------------------------------------------------------------
  {
    // Rd8 is a back-rank king capture next ply. Black is a queen and a knight
    // up, so a quiescence search that stands pat for Black after the check
    // scores Rd8 as a big minus; one that searches Black's replies sees the
    // king fall.
    const g = fromFen("7k/6pp/8/8/8/8/1q3PPP/n2R2K1 w - - 0 1");
    const r = ai.analyzeBoard(g.board, BIG, 1);
    check(!!r.move && moveToUCI(r.move) === "d1d8" && isKC(r.scoreCp),
      "no stand-pat at an in-check leaf: depth 1 sees the back-rank capture", `got ${r.move && moveToUCI(r.move)} ${r.scoreCp}`);
    const m = ai.pickAIMove(g, "hard", BIG, argmaxAt(1));
    check(!!m && moveToUCI(m) === "d1d8", "the same through pickAIMove at depth 1");
  }
  {
    // White is in check from the rook on e8. Make depth 1 time out on its
    // first node by moving the clock 50ms per read.
    const g = fromFen("4r2k/8/8/8/8/8/PP6/R3K3 w - - 0 1");
    const realNow = Date.now;
    let t = realNow();
    Date.now = () => (t += 50);
    let argmaxSafe = false;
    let sampledSafe = 0;
    const N = 20;
    try {
      const st: Stats = { depth: 0, rootMoves: 0 };
      const m = ai.pickAIMove(g, "hard", 10, undefined, st);
      argmaxSafe = !!m && !isInCheck(makeMove(g.board, m), "w");
      for (let s = 1; s <= N; s++) {
        const weaken = {
          params: { maxDepth: 3, extendedEval: false, topK: 4, temperatureCp: 150, sampleWindowCp: 300, evalNoiseCp: 50 },
          random: xorshift(s * 31),
        };
        const mm = ai.pickAIMove(g, "medium", 10, weaken);
        if (mm && !isInCheck(makeMove(g.board, mm), "w")) sampledSafe++;
      }
    } finally {
      Date.now = realNow;
    }
    check(argmaxSafe, "a depth-1 timeout returns a king-safe move (argmax path)");
    check(sampledSafe === N, "a depth-1 timeout returns a king-safe move (sampling path)", `${sampledSafe}/${N}`);
  }

  // --- P4 -------------------------------------------------------------------
  {
    const NERFS = new Map(openingNerfPool().map((n) => [n.id, n]));
    const hold = NERFS.get("hold_them_back")!;
    // exd5 wins a knight but unblocks e5, and ...e4 then puts a black pawn in
    // White's half: Hold Them Back loses on the spot.
    const g = fromFen("4k3/8/8/3np3/4P3/8/8/4K3 w - - 0 1", hold);
    const m = ai.pickAIMove(g, "hard", 300);
    const loses = (game: NerfGame, mv: Move) => {
      const nb = makeMove(game.board, mv);
      return generateMoves(nb).some((r) => {
        const nb2 = makeMove(nb, r);
        return !!hold.checkLoss!(game.white.state, makeContext({ ...game, board: nb2 }, "w"));
      });
    };
    check(!!m && moveToUCI(m) !== "e4d5" && !loses(g, m),
      "a root move allowing an own-nerf loss in one is dropped", `played ${m && moveToUCI(m)}`);
    // Every move allows ...e4 here, so nothing may be filtered away.
    const g2 = fromFen("k7/8/8/4p3/8/8/8/4K3 w - - 0 1", hold);
    check(!!ai.pickAIMove(g2, "hard", 100), "when every move allows the loss, the filter keeps them all");
    // The filter must never consult the opponent's nerf.
    let touched = 0;
    const spy: Nerf = {
      ...UNRESTRICTED_NERF,
      id: "spy",
      filterMoves: (moves) => {
        touched++;
        return moves;
      },
      checkLoss: () => {
        touched++;
        return null;
      },
    };
    const g3 = fromFen("4k3/8/8/3np3/4P3/8/8/4K3 w - - 0 1", hold, spy);
    ai.pickAIMove(g3, "hard", 100);
    check(touched === 0, "the opponent's nerf is never read by the search", `${touched} hook calls`);
  }

  // --- P7 -------------------------------------------------------------------
  {
    const rank = A.rankRootMoves as
      | ((g: NerfGame, level: string, budget: number, depth?: number) => { move: Move; scoreCp: number }[])
      | undefined;
    const tuning = typeof A.getEngineTuning === "function" ? (A.getEngineTuning as () => { contemptCp: number })() : null;
    if (!rank || !tuning) {
      bad("rankRootMoves / getEngineTuning are not exported");
    } else {
      const g = fromUci(["g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6"]);
      const ranked = rank(g, "hard", BIG, 2);
      const back = ranked.find((r) => moveToUCI(r.move) === "f3g1");
      const e4 = ranked.find((r) => moveToUCI(r.move) === "e2e4");
      check(!!back && back.scoreCp === -tuning.contemptCp,
        "a move back into a game-history position scores as a draw with contempt",
        `f3g1 ${back?.scoreCp}, contempt ${tuning.contemptCp}`);
      check(!!e4 && e4.scoreCp !== -tuning.contemptCp, "a fresh position does not", `e2e4 ${e4?.scoreCp}`);
    }
  }

  // --- P12 ------------------------------------------------------------------
  {
    const set = A.setEngineTuning as ((p: Record<string, unknown>) => Record<string, unknown>) | undefined;
    if (!set) {
      bad("setEngineTuning is not exported");
    } else {
      // The check extension goes too: its per-line budget makes the depth of a
      // node depend on the path to it, and a table entry from the deeper path
      // is then a deeper search, not the same one.
      const prev = set({ nullMove: false, lmr: false, deltaPruning: false, checkExt: false });
      const games = midGames();
      let same = 0;
      let nodesOn = 0;
      let nodesOff = 0;
      const diffs: string[] = [];
      for (let i = 0; i < games.length; i++) {
        const run = (tt: boolean) => {
          set({ tt });
          const st: Stats = { depth: 0, rootMoves: 0, nodes: 0 };
          ai.pickAIMove(games[i], "hard", BIG, argmaxAt(4), st);
          return st;
        };
        const off = run(false);
        const on = run(true);
        nodesOn += on.nodes ?? 0;
        nodesOff += off.nodes ?? 0;
        if (on.scoreCp === off.scoreCp && on.depth === 4 && off.depth === 4) same++;
        else diffs.push(`#${i}: on ${on.scoreCp}@${on.depth} off ${off.scoreCp}@${off.depth}`);
      }
      set(prev);
      check(same === games.length,
        `TT on and off give identical depth-4 root scores (${same}/${games.length}); nodes ${nodesOff} -> ${nodesOn} ` +
          `(${((100 * (nodesOn - nodesOff)) / Math.max(1, nodesOff)).toFixed(0)}%)`,
        diffs.slice(0, 4).join("; "));
    }
  }

  // --- internals --------------------------------------------------------------
  {
    const I = A.engineInternals as
      | {
          kingAttacked: (b: BoardState, c: Color) => boolean;
          positionHash: (b: BoardState, side: Color) => [number, number];
          childHash: (parent: BoardState, child: BoardState, m: Move, lo: number, hi: number) => [number, number];
        }
      | undefined;
    if (!I) {
      bad("engineInternals is not exported");
    } else {
      let checks = 0;
      let attackMismatch = 0;
      let hashMismatch = 0;
      for (let s = 1; s <= 60; s++) {
        const rnd = xorshift(s * 4099);
        let b = fromUci([]).board;
        let [lo, hi] = I.positionHash(b, b.turn);
        for (let ply = 0; ply < 120; ply++) {
          for (const c of ["w", "b"] as Color[]) {
            checks++;
            if (I.kingAttacked(b, c) !== isInCheck(b, c)) attackMismatch++;
          }
          const moves = generateMoves(b).filter((m) => b.pieces[m.to]?.type !== "k");
          if (!moves.length) break;
          // Prefer captures, promotions and castles now and then so the hash
          // sees every kind of move.
          const special = moves.filter((m) => m.captured || m.promotion || m.castle || m.isEnPassant || m.isDoublePawn);
          const pick = special.length && rnd(3) === 0 ? special[rnd(special.length)] : moves[rnd(moves.length)];
          const nb = makeMove(b, pick);
          [lo, hi] = I.childHash(b, nb, pick, lo, hi);
          const [flo, fhi] = I.positionHash(nb, nb.turn);
          if (flo !== lo || fhi !== hi) hashMismatch++;
          b = nb;
        }
      }
      check(attackMismatch === 0, `the fast attack test agrees with isInCheck (${checks} checks)`, `${attackMismatch} mismatches`);
      check(hashMismatch === 0, "the incremental hash agrees with a from-scratch hash", `${hashMismatch} mismatches`);
    }
  }

  // --- guards ------------------------------------------------------------------
  {
    const g = fromUci(LINES[1].slice(0, 12));
    const m = ai.pickAIMove(g, "easy");
    check(!!m && legalMoves(g).some((x) => x.from === m.from && x.to === m.to), "easy still returns a legal move");
  }

  if (failures) {
    console.error(`\n${failures} engine assertion(s) failed`);
    process.exit(1);
  }
  console.log("\nhouse engine: OK");
}

// ---------------------------------------------------------------------------
// Tactics.
// ---------------------------------------------------------------------------
type Tactic = {
  id: string;
  moves: string[];
  solution: string;
  solutionScore: number;
  shallowMove: string;
  shallowJudged: number;
  kind: "fork" | "skewer" | "check";
  /** 1 when the solution itself is the checking fork or skewer, 3 when it
   *  sets one up for the mover's next move. */
  motifPly: number;
};

const VAL: Record<PieceType, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

/** A checking move after which the checker also hits a piece worth a knight or
 *  more (a fork), or lines up with one behind the king (a skewer). */
function forkKind(b: BoardState, m: Move): Tactic["kind"] | null {
  const me = b.turn;
  const opp: Color = me === "w" ? "b" : "w";
  const nb = makeMove(b, m);
  if (!isInCheck(nb, opp)) return null;
  const hits = attackedBy(nb, me);
  let fork = false;
  for (let sq = 0; sq < 64; sq++) {
    const p = nb.pieces[sq];
    if (p && p.color === opp && p.type !== "k" && p.type !== "p" && hits.has(sq)) fork = true;
  }
  const piece = nb.pieces[m.to];
  if (piece && (piece.type === "b" || piece.type === "r" || piece.type === "q")) {
    // Skewer: walk from the checker through the king and look behind it.
    const ks = nb.pieces.findIndex((p) => p?.type === "k" && p.color === opp);
    const df = Math.sign((ks & 7) - (m.to & 7));
    const dr = Math.sign((ks >> 3) - (m.to >> 3));
    let f = (ks & 7) + df;
    let r = (ks >> 3) + dr;
    while (f >= 0 && f < 8 && r >= 0 && r < 8) {
      const p = nb.pieces[r * 8 + f];
      if (p) {
        if (p.color === opp && VAL[p.type] >= 320) return "skewer";
        break;
      }
      f += df;
      r += dr;
    }
  }
  return fork ? "fork" : null;
}

async function harvest(): Promise<Tactic[]> {
  const base = await loadEngine("baseline");
  const want = Number(arg("want", "40"));
  const maxCandidates = Number(arg("max-candidates", "420"));
  const out: Tactic[] = [];
  let candidates = 0;
  const t0 = Date.now();
  for (let gi = 0; out.length < want && candidates < maxCandidates && gi < 400; gi++) {
    const rnd = xorshift(gi * 2654435761 + 17);
    const line = LINES[gi % 3];
    const moves = line.slice(0, 6 + rnd(7));
    const g = fromUci(moves);
    while (!g.result && moves.length < 90 && out.length < want && candidates < maxCandidates) {
      const b = g.board;
      // Why depth 4 against depth 3: the baseline's quiescence stands pat for
      // a side in check, so a check played at its last ply is invisible to it.
      // A check-fork at ply 1 is found at depth 2; one at ply 3 needs depth 4.
      // Those ply-3 forks and skewers are exactly the horizon tactics a 40 to
      // 120ms search (depth about 3) walks past.
      const mover = b.turn;
      const opp: Color = mover === "w" ? "b" : "w";
      if (moves.length >= 12 && generateMoves(b).some((m) => isInCheck(makeMove(b, m), opp))) {
        candidates++;
        const shallow = base.analyzeBoard(b, BIG, 3).move;
        const deep = base.analyzeBoard(b, BIG, 4);
        if (shallow && deep.move && moveToUCI(shallow) !== moveToUCI(deep.move) && Math.abs(deep.scoreCp) < 90000) {
          const shallowJudged = -base.analyzeBoard(makeMove(b, shallow), BIG, 3).scoreCp;
          if (deep.scoreCp - shallowJudged >= 150) {
            // The line has to contain the motif: the solution itself, or the
            // mover's next move after the best reply, is a checking fork or
            // skewer.
            let kind = forkKind(b, deep.move);
            let at = 1;
            if (!kind) {
              const child = makeMove(b, deep.move);
              const reply = base.analyzeBoard(child, BIG, 3).move;
              if (reply) {
                const gc = makeMove(child, reply);
                const next = gc.turn === mover ? base.analyzeBoard(gc, BIG, 2).move : null;
                if (next) {
                  kind = forkKind(gc, next);
                  at = 3;
                }
              }
            }
            if (kind) {
              const sol = moveToUCI(deep.move);
              out.push({
                id: `t${out.length}-g${gi}p${moves.length}`,
                moves: [...moves],
                solution: sol,
                solutionScore: deep.scoreCp,
                shallowMove: moveToUCI(shallow),
                shallowJudged,
                kind,
                motifPly: at,
              });
              console.log(`  found ${out.length}: ${sol}, ${kind} at ply ${at}, +${deep.scoreCp - shallowJudged}cp over ` +
                `${moveToUCI(shallow)}; ${candidates} candidates, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
            }
          }
        }
      }
      // Self-play continues with the baseline at depth 2 and a seeded 15% of
      // random king-safe moves, so the games wander into loose positions.
      let mv: Move | null = null;
      if (rnd(100) < 15) {
        const safe = legalMoves(g).filter((m) => !isInCheck(makeMove(b, m), b.turn));
        if (safe.length) mv = safe[rnd(safe.length)];
      }
      if (!mv) mv = base.analyzeBoard(b, BIG, 2).move;
      if (!mv) break;
      moves.push(moveToUCI(mv));
      playMove(g, mv);
    }
  }
  fs.mkdirSync(EVIDENCE, { recursive: true });
  fs.writeFileSync(
    TACTICS_FILE,
    JSON.stringify(
      {
        note:
          `Harvested by scripts/test-house-engine.ts --tactics --harvest with the baseline engine (${BASELINE_COMMIT}) at FIXED depths: ` +
          "depth 4 finds a line whose first or third ply is the mover's checking fork or skewer, depth 3 plays something " +
          "else, and that something else judges at least 150cp worse at depth 4 overall. Frozen: do not regenerate.",
        candidatesExamined: candidates,
        positions: out,
      },
      null,
      1,
    ),
  );
  console.log(`harvested ${out.length} tactics from ${candidates} candidates in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  return out;
}

async function tactics() {
  let set: Tactic[];
  if (flag("harvest") || !fs.existsSync(TACTICS_FILE)) set = await harvest();
  else set = JSON.parse(fs.readFileSync(TACTICS_FILE, "utf8")).positions as Tactic[];
  if (flag("harvest-only")) return;
  const budgets = arg("budgets", "40,120,400").split(",").map(Number);
  const engineNames = arg("engines", "baseline,current").split(",");
  const outFile = arg("out", "");
  const judge = await loadEngine("baseline");
  const engines: { name: string; ai: AiModule }[] = [];
  for (const e of engineNames) engines.push({ name: e, ai: await loadEngine(e) });

  const judged = new Map<string, number>();
  const judgeMove = (t: Tactic, g: NerfGame, uci: string) => {
    const key = `${t.id}|${uci}`;
    if (!judged.has(key)) {
      const m = moveFromUCI(g.board, uci)!;
      judged.set(key, -judge.analyzeBoard(makeMove(g.board, m), BIG, 3).scoreCp);
    }
    return judged.get(key)!;
  };

  type Row = { solved: number; n: number; depth: number; nodes: number };
  const rows = new Map<string, Row>();
  for (let i = 0; i < set.length; i++) {
    const t = set[i];
    for (const budget of budgets) {
      const order = i % 2 === 0 ? engines : [...engines].reverse();
      for (const e of order) {
        const g = fromUci(t.moves);
        const st: Stats = { depth: 0, rootMoves: 0, nodes: 0 };
        const m = e.ai.pickAIMove(g, "hard", budget, undefined, st);
        const uci = m ? moveToUCI(m) : "";
        const solved = uci === t.solution || (!!m && judgeMove(t, g, uci) >= t.solutionScore - 50);
        const key = `${e.name}|${budget}`;
        const r = rows.get(key) ?? { solved: 0, n: 0, depth: 0, nodes: 0 };
        r.n++;
        r.solved += solved ? 1 : 0;
        r.depth += st.depth;
        r.nodes += st.nodes ?? 0;
        rows.set(key, r);
      }
    }
  }
  const summary: Record<string, unknown> = {};
  console.log(`\ntactics: ${set.length} positions, load ${os.loadavg().map((x) => x.toFixed(1)).join(" ")}`);
  for (const budget of budgets) {
    const cells = engines.map((e) => {
      const r = rows.get(`${e.name}|${budget}`)!;
      summary[`${e.name}@${budget}`] = {
        solved: r.solved,
        n: r.n,
        rate: +(r.solved / r.n).toFixed(3),
        meanDepth: +(r.depth / r.n).toFixed(2),
        meanNodes: Math.round(r.nodes / r.n),
      };
      return `${e.name} ${r.solved}/${r.n} (${((100 * r.solved) / r.n).toFixed(0)}%) depth ${(r.depth / r.n).toFixed(2)} nodes ${Math.round(r.nodes / r.n)}`;
    });
    console.log(`  ${String(budget).padStart(4)}ms  ${cells.join("  |  ")}`);
  }
  if (outFile) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(
      outFile,
      JSON.stringify(
        {
          script: "scripts/test-house-engine.ts --tactics",
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

(flag("tactics") ? tactics() : assertions()).catch((e) => {
  console.error(e);
  process.exit(2);
});
