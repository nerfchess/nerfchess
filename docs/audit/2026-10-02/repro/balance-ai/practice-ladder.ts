// Scratch (audit balance-ai): do the client practice levels (easy/medium/hard in
// src/engine/ai.ts LEVELS) beat each other, and do medium/hard vary their
// openings? Plain chess (no nerfs, no draft) to isolate the engine.
//   tsx practice-ladder.ts --games 10 --secs 170
import { pickAIMove, type AILevel } from "../../../../../src/engine/ai";
import { legalMoves, newGame, playMove, UNRESTRICTED_NERF } from "../../../../../src/engine/game";
import { moveToUCI } from "../../../../../src/engine/board";

const argv = process.argv.slice(2);
const arg = (n: string, d: string) => (argv.indexOf(`--${n}`) >= 0 ? argv[argv.indexOf(`--${n}`) + 1] : d);
const GAMES = Number(arg("games", "10"));
const SECS = Number(arg("secs", "170"));
const HARD_MS = Number(arg("hard-ms", "300"));
const t0 = Date.now();

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 1. Opening variety: same position, same level, repeated.
for (const lvl of ["medium", "hard"] as AILevel[]) {
  const firsts = new Map<string, number>();
  const replies = new Map<string, number>();
  for (let i = 0; i < 5; i++) {
    const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1000 + i);
    const m = pickAIMove(g, lvl, lvl === "hard" ? HARD_MS : undefined)!;
    firsts.set(moveToUCI(m), (firsts.get(moveToUCI(m)) ?? 0) + 1);
    const g2 = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 2000 + i);
    playMove(g2, legalMoves(g2).find((x) => moveToUCI(x) === "e2e4")!);
    const r = pickAIMove(g2, lvl, lvl === "hard" ? HARD_MS : undefined)!;
    replies.set(moveToUCI(r), (replies.get(moveToUCI(r)) ?? 0) + 1);
  }
  console.log(`variety ${lvl}${lvl === "hard" ? `@${HARD_MS}ms` : ""}: first move as White over 5 runs ${JSON.stringify([...firsts])}; reply to 1.e4 ${JSON.stringify([...replies])}`);
}

// 2. Mini ladder.
function play(a: AILevel, b: AILevel, seed: number, aWhite: boolean): number {
  Math.random = mulberry32(seed);
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  for (let ply = 0; ply < 200 && !g.result; ply++) {
    const lvl = (g.board.turn === "w") === aWhite ? a : b;
    const m = pickAIMove(g, lvl, lvl === "hard" ? HARD_MS : lvl === "medium" ? 400 : undefined);
    if (!m) break;
    playMove(g, m);
  }
  if (!g.result || g.result.winner === "draw") return 0.5;
  return (g.result.winner === "w") === aWhite ? 1 : 0;
}
for (const [a, b] of [["medium", "easy"], ["hard", "medium"]] as [AILevel, AILevel][]) {
  let score = 0;
  let n = 0;
  for (let i = 0; i < GAMES; i++) {
    if ((Date.now() - t0) / 1000 > SECS) break;
    score += play(a, b, 77 + i, i % 2 === 0);
    n++;
  }
  console.log(`${a} vs ${b}: ${a} scores ${score}/${n} = ${n ? ((100 * score) / n).toFixed(0) : "-"}%  (hard budget ${HARD_MS}ms, medium 400ms, real clock)`);
}
console.log(`secs ${((Date.now() - t0) / 1000).toFixed(0)}`);
