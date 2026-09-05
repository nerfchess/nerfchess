// Board notation and repetition checks. Run with:
//   npx -y tsx scripts/test-san.ts
//
// Standard algebraic notation has to identify a move UNIQUELY. Before this
// harness existed, moveToSAN emitted no origin hint at all, so two knights that
// both reached d2 both rendered "Nd2": the move list showed the same text for
// two different moves, and an exported PGN could not be replayed by any reader.
//
// The invariant checked here is the one that actually matters:
//   in any position, no two legal moves may produce the same SAN.
//
// Verified over hand-built positions that force each disambiguation form, the
// standard opening, a deep random-move sweep, and the whole-list helper
// (movesToSAN) that the move list, PGN export and clip captions run on.

import {
  countRepetitions,
  generateMoves,
  initialBoard,
  makeMove,
  moveToSAN,
  moveToUCI,
  positionKey,
  movesToSAN,
  sanLabels,
} from "../src/engine/board";
import { SQ, type BoardState, type Color, type Move, type PieceType } from "../src/engine/types";

let failures = 0;
function check(name: string, ok: boolean, detail: string) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} - ${detail}`);
  if (!ok) failures++;
}

/** Square index from algebraic ("e4"). */
const S = (s: string) => SQ(s.charCodeAt(0) - 97, s.charCodeAt(1) - 49);

/** An empty board with the given pieces and no castling rights. */
function position(
  placements: [string, PieceType, Color][],
  turn: Color = "w",
): BoardState {
  const b = initialBoard();
  b.pieces = new Array(64).fill(null);
  b.castling = { wk: false, wq: false, bk: false, bq: false };
  b.epTarget = null;
  b.turn = turn;
  b.history = [];
  for (const [sq, type, color] of placements) b.pieces[S(sq)] = { type, color };
  return b;
}

/** Every SAN collision in a position: same text, different moves. */
function collisions(board: BoardState): { san: string; ucis: string[] }[] {
  const bySan = new Map<string, string[]>();
  for (const m of generateMoves(board)) {
    const san = moveToSAN(m, board);
    const list = bySan.get(san);
    if (list) list.push(moveToUCI(m));
    else bySan.set(san, [moveToUCI(m)]);
  }
  return [...bySan]
    .filter(([, ucis]) => ucis.length > 1)
    .map(([san, ucis]) => ({ san, ucis }));
}

function sanFor(board: BoardState, uci: string): string {
  const m = generateMoves(board).find((x) => moveToUCI(x) === uci);
  if (!m) throw new Error(`no legal move ${uci}`);
  return moveToSAN(m, board);
}

// --- 1. The disambiguation forms, per the PGN spec ---
// File is preferred, then rank, then the full origin square.

const knights = position([
  ["b1", "n", "w"], ["f1", "n", "w"], ["d1", "k", "w"], ["e8", "k", "b"],
]);
check(
  "file disambiguation",
  sanFor(knights, "b1d2") === "Nbd2" && sanFor(knights, "f1d2") === "Nfd2",
  `b1d2=${sanFor(knights, "b1d2")} f1d2=${sanFor(knights, "f1d2")}`,
);

const rooksFile = position([
  ["a1", "r", "w"], ["a5", "r", "w"], ["e1", "k", "w"], ["h8", "k", "b"],
]);
check(
  "rank disambiguation (same file)",
  sanFor(rooksFile, "a1a3") === "R1a3" && sanFor(rooksFile, "a5a3") === "R5a3",
  `a1a3=${sanFor(rooksFile, "a1a3")} a5a3=${sanFor(rooksFile, "a5a3")}`,
);

// Three queens where one pair shares a file and another shares a rank: the a5
// queen needs its whole origin square, the other two get away with one half.
const queens = position([
  ["a1", "q", "w"], ["a5", "q", "w"], ["e5", "q", "w"], ["h1", "k", "w"], ["h8", "k", "b"],
]);
check(
  "full-square disambiguation",
  sanFor(queens, "a1e1") === "Q1e1" &&
    sanFor(queens, "a5e1") === "Qa5e1" &&
    sanFor(queens, "e5e1") === "Qee1",
  `a1e1=${sanFor(queens, "a1e1")} a5e1=${sanFor(queens, "a5e1")} e5e1=${sanFor(queens, "e5e1")}`,
);

// A lone piece must NOT pick up a hint it does not need.
const lone = position([["b1", "n", "w"], ["d1", "k", "w"], ["e8", "k", "b"]]);
check("no hint when unique", sanFor(lone, "b1d2") === "Nd2", sanFor(lone, "b1d2"));

// Pawn captures carry their origin file already, and never a piece-style hint.
const pawns = position([
  ["a4", "p", "w"], ["c4", "p", "w"], ["b5", "n", "b"], ["e1", "k", "w"], ["h8", "k", "b"],
]);
check(
  "pawn captures keep file form",
  sanFor(pawns, "a4b5") === "axb5" && sanFor(pawns, "c4b5") === "cxb5",
  `${sanFor(pawns, "a4b5")} / ${sanFor(pawns, "c4b5")}`,
);

// --- 2. No collisions in adversarial positions ---

const adversarial: [string, BoardState][] = [
  ["two knights", knights],
  ["two rooks on a file", rooksFile],
  ["three queens", queens],
  ["pawn capture pair", pawns],
  ["opening", initialBoard()],
  [
    "four knights, one square",
    position([
      ["c3", "n", "w"], ["c5", "n", "w"], ["g3", "n", "w"], ["g5", "n", "w"],
      ["a1", "k", "w"], ["h8", "k", "b"],
    ]),
  ],
  [
    "promotion rank crowd",
    position([
      ["b7", "p", "w"], ["d7", "p", "w"], ["c8", "r", "b"],
      ["a1", "k", "w"], ["h6", "k", "b"],
    ]),
  ],
];
for (const [name, board] of adversarial) {
  const dupes = collisions(board);
  check(
    `no SAN collision: ${name}`,
    dupes.length === 0,
    dupes.length ? JSON.stringify(dupes) : `${generateMoves(board).length} legal moves, all distinct`,
  );
}

// --- 3. Random-position sweep ---
// Deterministic LCG so a failure is reproducible from the seed alone. Plays
// random legal moves and checks the invariant at every position along the way,
// which reaches promotion-heavy and lopsided-material positions that
// hand-built cases miss.

let seed = 0x5eed1234;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

let positionsChecked = 0;
let sweepFailures = 0;
let firstSweepFailure = "";
for (let game = 0; game < 60; game++) {
  let b = initialBoard();
  for (let ply = 0; ply < 120; ply++) {
    const moves = generateMoves(b);
    if (!moves.length) break;
    const dupes = collisions(b);
    positionsChecked++;
    if (dupes.length) {
      sweepFailures++;
      if (!firstSweepFailure) {
        firstSweepFailure = `game ${game} ply ${ply}: ${JSON.stringify(dupes)}`;
      }
    }
    b = makeMove(b, moves[Math.floor(rand() * moves.length)]);
    // A captured king ends the game in this variant.
    if (!b.pieces.some((p) => p && p.type === "k" && p.color === b.turn)) break;
  }
}
check(
  "random sweep",
  sweepFailures === 0,
  sweepFailures === 0
    ? `${positionsChecked} positions, no collisions`
    : `${sweepFailures}/${positionsChecked} positions collided; first: ${firstSweepFailure}`,
);

// --- 4. The whole-list helpers ---

function line(ucis: string[]): Move[] {
  let b = initialBoard();
  const out: Move[] = [];
  for (const u of ucis) {
    const m = generateMoves(b).find((x) => moveToUCI(x) === u);
    if (!m) throw new Error(`no legal move ${u}`);
    out.push(m);
    b = makeMove(b, m);
  }
  return out;
}

const fourKnights = line([
  "g1f3", "g8f6", "b1c3", "b8c6", "d2d4", "d7d5",
  "c1f4", "c8f5", "f3e5", "f6e4", "c3e4", "f5e4",
]);
const listed = movesToSAN(fourKnights);
check(
  "movesToSAN replays the line",
  listed.join(" ") === "Nf3 Nf6 Nc3 Nc6 d4 d5 Bf4 Bf5 Ne5 Ne4 Nxe4 Bxe4",
  listed.join(" "),
);

// Numbering is derived from move colors, not ply parity, because extra-move
// cards let one side move twice in a row.
const labels = sanLabels(fourKnights);
check(
  "sanLabels numbering",
  labels[0] === "1. Nf3" && labels[1] === "1… Nf6" && labels[2] === "2. Nc3",
  labels.slice(0, 3).join(" | "),
);

const doubleWhite: Move[] = [fourKnights[0], fourKnights[2]];
const doubleLabels = sanLabels(doubleWhite);
check(
  "consecutive white moves each open a number",
  doubleLabels[0] === "1. Nf3" && doubleLabels[1] === "2. Nc3",
  doubleLabels.join(" | "),
);

// Two black moves in a row (an extra-move card): the numbering must agree with
// the move list's row pairing (MoveList.tsx / MoveStrip.tsx), where a black
// move always closes its row and the next move opens a new number. The
// expected labels are derived by that exact row algorithm rather than typed
// in, so the two can never drift apart silently.
function moveListNumbers(ms: Move[]): number[] {
  const out: number[] = [];
  let num = 1;
  let openW = false;
  for (const m of ms) {
    if (m.color === "w") {
      if (openW) num += 1;
      out.push(num);
      openW = true;
    } else {
      out.push(num);
      num += 1;
      openW = false;
    }
  }
  return out;
}
{
  const [wNf3, bNf6, wNc3, bNc6] = fourKnights;
  const wbbw: Move[] = [wNf3, bNf6, bNc6, wNc3];
  const got = sanLabels(wbbw);
  const nums = moveListNumbers(wbbw);
  const want = wbbw.map((m, i) => `${nums[i]}${m.color === "w" ? ". " : "… "}${["Nf3", "Nf6", "Nc6", "Nc3"][i]}`);
  check(
    "consecutive black moves match the move list rows (w, b, b, w)",
    got.join(" | ") === want.join(" | ") && got.join(" | ") === "1. Nf3 | 1… Nf6 | 2… Nc6 | 3. Nc3",
    `got ${got.join(" | ")}; want ${want.join(" | ")}`,
  );
}

// A move the replay cannot apply (a card rewrote the board) must degrade to the
// bare form for the rest of the list rather than printing a wrong origin hint.
const bogus: Move = { from: S("h6"), to: S("h7"), piece: "r", color: "w" };
const degraded = movesToSAN([...line(["e2e4", "e7e5"]), bogus, ...line(["e2e4"])]);
check(
  "unreplayable ply degrades instead of lying",
  degraded.length === 4 && degraded[0] === "e4" && degraded[2] === "Rh7",
  degraded.join(" "),
);

// --- 5. Repetition counting ------------------------------------------------
// countRepetitions skips building position keys for positions before the last
// irreversible move, on the grounds that a capture, pawn move, or drop changes
// material or pawn structure permanently so nothing earlier can match. That is
// a real speedup on the hot path (it runs inside playMove, and the worker
// replays whole games move by move), but it is only safe if it is EXACTLY
// equivalent to the naive full scan. Pinned differentially against the naive
// implementation over repetition-heavy random play.

function naiveCountRepetitions(board: BoardState): number {
  const target = positionKey(board);
  let b = initialBoard();
  let count = positionKey(b) === target ? 1 : 0;
  for (const m of board.history) {
    b = makeMove(b, m);
    if (positionKey(b) === target) count++;
  }
  return count;
}

{
  let rseed = 987;
  const rrand = () => ((rseed = (rseed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let compared = 0;
  let mismatches = 0;
  let firstMismatch = "";
  for (let game = 0; game < 40; game++) {
    let b = initialBoard();
    for (let ply = 0; ply < 140; ply++) {
      const ms = generateMoves(b);
      if (!ms.length) break;
      // Heavily biased toward reversible moves, or repetitions never arise.
      const quiet = ms.filter((m) => m.piece !== "p" && !m.captured);
      const pool = quiet.length && rrand() < 0.93 ? quiet : ms;
      b = makeMove(b, pool[Math.floor(rrand() * pool.length)]);
      if (!b.pieces.some((p) => p && p.type === "k" && p.color === b.turn)) break;
      const naive = naiveCountRepetitions(b);
      const fast = countRepetitions(b);
      compared++;
      if (naive !== fast && !firstMismatch) {
        mismatches++;
        firstMismatch = `game ${game} ply ${ply}: naive ${naive}, fast ${fast}`;
      }
    }
  }
  check(
    "repetition counting matches the naive scan",
    mismatches === 0,
    mismatches === 0 ? `${compared} positions compared` : firstMismatch,
  );
}

console.log(
  failures === 0
    ? "\nPASS: notation and repetition OK."
    : `\nFAIL: ${failures} check(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
