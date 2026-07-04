// Mines tactics puzzles for /puzzles from engine self-play games.
//
//   npx tsx scripts/generatePuzzles.ts
//
// Every emitted puzzle is verified against the real engine: the solution line
// is replayed move by move, and "mate" uses the site's king-capture rules
// (defender in check, and every pseudo-legal reply still loses the king).
// Output is written to src/lib/puzzleData.ts.

import { writeFileSync } from "node:fs";
import { generateMoves, initialBoard, isInCheck, makeMove, moveToUCI } from "../src/engine/board";
import { canCaptureKing, isMated } from "../src/engine/mate";
import { NerfGame, playMove } from "../src/engine/game";
import { pickAIMove } from "../src/engine/ai";
import { Nerf } from "../src/engine/nerf";
import { RNG } from "../src/engine/rng";
import { boardToFen } from "../src/lib/fen";
import type { BoardState, Color, Move } from "../src/engine/types";

const NOOP: Nerf = { id: "noop", name: "None", description: "", tier: 1, implemented: true };

function plainGame(seed: number): NerfGame {
  const rng = new RNG(seed);
  return {
    board: initialBoard(),
    white: { nerf: NOOP, state: {}, color: "w", rng: rng.fork() },
    black: { nerf: NOOP, state: {}, color: "b", rng: rng.fork() },
    result: null,
    startedAt: Date.now(),
    captured: {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    },
  };
}

function mateInOneMoves(board: BoardState): Move[] {
  return generateMoves(board).filter((m) => m.captured !== "k" && isMated(makeMove(board, m)));
}

type MinedPuzzle = { fen: string; line: string[]; theme: "mateIn1" | "mateIn2" };

// Forced mate in two with a unique first move (restricted to checking first
// moves — the standard puzzle-mining heuristic; quiet mate-in-2s exist but
// checking ones make cleaner puzzles). Returns the main line or null.
function findMateInTwo(board: BoardState): string[] | null {
  const candidates: { first: Move; reply: Move; finisher: Move }[] = [];
  for (const first of generateMoves(board)) {
    if (first.captured === "k") continue;
    const afterFirst = makeMove(board, first);
    if (!isInCheck(afterFirst, afterFirst.turn)) continue; // checking moves only
    if (isMated(afterFirst)) continue; // that's a mate in 1, not 2
    const replies = generateMoves(afterFirst);
    if (replies.length === 0) continue;
    let forced = true;
    // The defender's best try: the reply that leaves us the fewest mates.
    let bestReply: { reply: Move; finisher: Move; mates: number } | null = null;
    for (const reply of replies) {
      const afterReply = makeMove(afterFirst, reply);
      if (canCaptureKing(afterReply)) continue; // reply hangs the king outright
      const mates = mateInOneMoves(afterReply);
      if (mates.length === 0) {
        forced = false;
        break;
      }
      if (!bestReply || mates.length < bestReply.mates) {
        bestReply = { reply, finisher: mates[0], mates: mates.length };
      }
    }
    if (forced && bestReply) {
      candidates.push({ first, reply: bestReply.reply, finisher: bestReply.finisher });
      if (candidates.length > 1) return null; // not unique — ambiguous puzzle
    }
  }
  if (candidates.length !== 1) return null;
  const c = candidates[0];
  return [moveToUCI(c.first), moveToUCI(c.reply), moveToUCI(c.finisher)];
}

function minePosition(board: BoardState, seen: Set<string>): MinedPuzzle | null {
  if (canCaptureKing(board)) return null; // position already decided
  const fen = boardToFen(board);
  const key = fen.split(" ").slice(0, 2).join(" ");
  if (seen.has(key)) return null;

  const mates = mateInOneMoves(board);
  if (mates.length >= 1 && mates.length <= 3) {
    seen.add(key);
    return { fen, line: [moveToUCI(mates[0])], theme: "mateIn1" };
  }
  if (mates.length === 0) {
    const line = findMateInTwo(board);
    if (line) {
      seen.add(key);
      return { fen, line, theme: "mateIn2" };
    }
  }
  return null;
}

function randomOpeningPly(game: NerfGame, rng: () => number): Move | null {
  const moves = generateMoves(game.board).filter((m) => {
    if (m.captured === "k") return false;
    const after = makeMove(game.board, m);
    return !canCaptureKing(after); // don't hang the king in the opening
  });
  if (!moves.length) return null;
  return moves[Math.floor(rng() * moves.length)];
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function main() {
  const puzzles: (MinedPuzzle & { id: string; rating: number })[] = [];
  const seen = new Set<string>();
  const targetM1 = 120;
  const targetM2 = 90;
  let m1 = 0;
  let m2 = 0;

  for (let seed = 1; seed <= 2000 && (m1 < targetM1 || m2 < targetM2); seed++) {
    const rng = mulberry32(seed * 2654435761);
    let game = plainGame(seed);
    // Random opening plies for variety, then engine play (weaker engine on
    // one side so games actually end in mating attacks).
    const openingPlies = 4 + Math.floor(rng() * 6);
    for (let ply = 0; ply < 160 && !game.result; ply++) {
      const board = game.board;
      if (ply >= openingPlies) {
        const found = minePosition(board, seen);
        if (found) {
          const want = found.theme === "mateIn1" ? m1 < targetM1 : m2 < targetM2;
          if (want) {
            if (found.theme === "mateIn1") m1++;
            else m2++;
            const rating =
              found.theme === "mateIn1"
                ? 600 + Math.floor(rng() * 500)
                : 1150 + Math.floor(rng() * 600);
            puzzles.push({ ...found, id: `gen-${seed}-${ply}`, rating });
          }
        }
      }
      let move: Move | null;
      if (ply < openingPlies) {
        move = randomOpeningPly(game, rng);
      } else {
        const level = (game.board.turn === (seed % 2 === 0 ? "w" : "b") ? "medium" : "easy") as
          | "medium"
          | "easy";
        move = pickAIMove(game, level, 60);
      }
      if (!move) break;
      game = playMove(game, move);
    }
    if (seed % 25 === 0) {
      console.log(`seed ${seed}: ${m1} mate-in-1, ${m2} mate-in-2`);
    }
  }

  // Final safety pass: re-verify every solution line replays legally and ends
  // in mate, exactly as the puzzle page will replay it.
  const verified = puzzles.filter((p) => {
    let board = fenReplayBoard(p.fen);
    if (!board) return false;
    for (const uci of p.line) {
      const move = generateMoves(board).find((m) => moveToUCI(m) === uci);
      if (!move) return false;
      board = makeMove(board, move);
    }
    return isMated(board);
  });

  verified.sort((a, b) => a.rating - b.rating);
  const body = verified
    .map((p) => `  { id: ${JSON.stringify(p.id)}, fen: ${JSON.stringify(p.fen)}, line: ${JSON.stringify(p.line)}, theme: ${JSON.stringify(p.theme)}, rating: ${p.rating} },`)
    .join("\n");
  const file = `// Generated by scripts/generatePuzzles.ts — do not edit by hand.
// Every puzzle was mined from engine self-play and verified against the
// engine's king-capture mate rules.

export type PuzzleTheme = "mateIn1" | "mateIn2";

export interface PuzzleData {
  id: string;
  fen: string;
  /** UCI solution line: solver's move, (opponent reply, solver's move)... */
  line: string[];
  theme: PuzzleTheme;
  rating: number;
}

export const PUZZLES: PuzzleData[] = [
${body}
];
`;
  writeFileSync("src/lib/puzzleData.ts", file);
  console.log(`Wrote ${verified.length} puzzles (${m1} mate-in-1, ${m2} mate-in-2) to src/lib/puzzleData.ts`);
}

import { fenToBoard } from "../src/lib/fen";
function fenReplayBoard(fen: string) {
  return fenToBoard(fen);
}

main();
