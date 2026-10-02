// Perft harness against the real NerfChess engine (no cards active).
//
// Two modes:
//   legal   - standard chess legality. Uses the engine's OWN standard-rules
//             path: legalMoves() on a game whose buffs.diff is set (Chess Diff
//             sub-game), which filters generateMoves() by king safety and
//             re-imposes castling-through-check. Compared to published counts.
//   variant - the site's actual rules with no cards: legalMoves() == raw
//             generateMoves() (king may move into check, castle through check);
//             a king capture is a terminal leaf. Compared to an independent
//             reference generator (ref.ts) because no published numbers exist.
//
// usage: tsx perft.ts <legal|variant> <maxDepth> [name|all] [budgetSeconds]
import { generateMoves, makeMove, moveToUCI } from "../../../../../src/engine/board";
import { legalMoves } from "../../../../../src/engine/game";
import { fenToBoard } from "../../../../../src/lib/fen";
import type { BoardState, Move } from "../../../../../src/engine/types";

export const POSITIONS: { name: string; fen: string; expected: number[] }[] = [
  { name: "start", fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", expected: [20, 400, 8902, 197281, 4865609, 119060324] },
  { name: "kiwipete", fen: "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", expected: [48, 2039, 97862, 4085603, 193690690] },
  { name: "pos3", fen: "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", expected: [14, 191, 2812, 43238, 674624, 11030083] },
  { name: "pos4", fen: "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", expected: [6, 264, 9467, 422333, 15833292] },
  { name: "pos4m", fen: "r2q1rk1/pP1p2pp/Q4n2/bbp1p3/Np6/1B3NBn/pPPP1PPP/R3K2R b KQ - 0 1", expected: [6, 264, 9467, 422333, 15833292] },
  { name: "pos5", fen: "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", expected: [44, 1486, 62379, 2103487, 89941194] },
  { name: "pos6", fen: "r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10", expected: [46, 2079, 89890, 3894594, 164075551] },
  // FEN typos as given in the audit task (not the CPW positions); no published counts.
  { name: "kiwipete_typo", fen: "r3k2r/p1ppqpb1/bn2pnp1/3pP3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", expected: [] },
  { name: "pos4_typo", fen: "r3k2r/Pppp1ppp/1b3nbN/nP6/BBPPP3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", expected: [] },
];

// A minimal game shell that drives legalMoves() down its Chess Diff branch,
// which returns before touching any nerf/buff field.
function diffGame(board: BoardState): any {
  return { board, result: null, buffs: { diff: { active: true } }, white: {}, black: {}, captured: {} };
}

export function legalOf(board: BoardState): Move[] {
  return legalMoves(diffGame(board));
}

export function perftLegal(board: BoardState, depth: number): number {
  const moves = legalOf(board);
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) n += perftLegal(makeMove(board, m), depth - 1);
  return n;
}

export function perftVariant(board: BoardState, depth: number): number {
  const moves = generateMoves(board);
  if (depth === 1) return moves.length;
  let n = 0;
  for (const m of moves) {
    if (m.captured === "k") { n += 1; continue; } // game over: terminal leaf
    n += perftVariant(makeMove(board, m), depth - 1);
  }
  return n;
}

export function divide(board: BoardState, depth: number, mode: "legal" | "variant"): Map<string, number> {
  const out = new Map<string, number>();
  const moves = mode === "legal" ? legalOf(board) : generateMoves(board);
  for (const m of moves) {
    const key = moveToUCI(m);
    let c: number;
    if (depth === 1) c = 1;
    else if (mode === "variant" && m.captured === "k") c = 1;
    else c = mode === "legal" ? perftLegal(makeMove(board, m), depth - 1) : perftVariant(makeMove(board, m), depth - 1);
    out.set(key, (out.get(key) ?? 0) + c);
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith("perft.ts")) {
  const mode = (process.argv[2] ?? "legal") as "legal" | "variant";
  const maxDepth = Number(process.argv[3] ?? 4);
  const which = process.argv[4] ?? "all";
  const budget = Number(process.argv[5] ?? 180) * 1000;
  for (const p of POSITIONS) {
    if (which !== "all" && which !== p.name) continue;
    const b = fenToBoard(p.fen)!;
    let spent = 0;
    for (let d = 1; d <= maxDepth; d++) {
      const t0 = performance.now();
      const n = mode === "legal" ? perftLegal(b, d) : perftVariant(b, d);
      const ms = performance.now() - t0;
      spent += ms;
      const exp = mode === "legal" ? p.expected[d - 1] : undefined;
      const ok = exp === undefined ? "" : n === exp ? "OK" : `MISMATCH (expected ${exp})`;
      console.log(`${mode} ${p.name} d${d} = ${n} ${ok} ${ms.toFixed(0)}ms ${(n / (ms / 1000)).toFixed(0)} nodes/s`);
      if (spent > budget) { console.log(`  (budget reached after d${d})`); break; }
    }
  }
}
