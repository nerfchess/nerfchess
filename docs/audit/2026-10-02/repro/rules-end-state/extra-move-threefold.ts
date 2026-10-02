// Does threefold count positions after an extra move (same side to move again)
// as if the other side were to move? Compare the engine's verdict with a count
// of TRUE positions (placement + real side to move + castling + ep), recorded
// after playMove's turn handover.
import { NerfGame, UNRESTRICTED_NERF, enableDraftMode, legalMoves, newGame, playMove } from "../../../../../src/engine/game";
import { moveToUCI, positionKey } from "../../../../../src/engine/board";
import type { Color } from "../../../../../src/engine/types";
function mulberry(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const KN = new Set(["g1f3", "f3g1", "g1h3", "h3g1", "g8f6", "f6g8", "g8h6", "h6g8", "b1c3", "c3b1", "b8c6", "c6b8"]);
let falseDraws = 0, trueDraws = 0, games = 0, example = "";
for (let s = 0; s < 3000; s++) {
  const rand = mulberry(s);
  let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
  enableDraftMode(g, 5, {});
  for (const c of ["w", "b"] as Color[]) g.buffs!.players[c].offer = undefined as never;
  g.buffs!.nextDraftAtPly = 1e9;
  const seen = new Map<string, number>([[positionKey(g.board), 1]]);
  const line: string[] = [];
  games++;
  for (let p = 0; p < 40 && !g.result; p++) {
    const ms = legalMoves(g).filter((m) => KN.has(moveToUCI(m)));
    if (!ms.length) break;
    if (rand() < 0.15) g.buffs!.extraMoves[g.board.turn] = 1; // as an extra-move card would grant
    const m = ms[Math.floor(rand() * ms.length)];
    line.push((g.buffs!.extraMoves[g.board.turn] ? "+" : "") + moveToUCI(m));
    g = playMove(g, m);
    const k = positionKey(g.board); // true side to move after handover
    seen.set(k, (seen.get(k) ?? 0) + 1);
    if (g.result && /threefold/.test(g.result.reason)) {
      const trueMax = Math.max(...seen.values());
      if (trueMax < 3) { falseDraws++; if (!example) example = line.join(" "); } else trueDraws++;
    }
  }
}
console.log(JSON.stringify({ games, threefoldDeclared: falseDraws + trueDraws, falseDraws, trueDraws, example }));
