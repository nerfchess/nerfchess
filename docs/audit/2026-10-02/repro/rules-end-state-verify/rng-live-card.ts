// Live (non-retired) gamble card: predict its coin flip from a public clone, under two different server seeds.
import { UNRESTRICTED_NERF, acquireBuff, activateBuff, deserializeGame, enableDraftMode, legalMoves, newGame, playMove, serializeGame, type NerfGame } from "../../../../../src/engine/game";
import { isRetired } from "../../../../../src/engine/retired";
function mulberry(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ID = "gm_heads_or_tails";
console.log(ID, "retired?", isRetired(ID));
let agree = 0, total = 0; const res: Record<string, number> = {};
for (let i = 0; i < 40; i++) {
  const gs: NerfGame[] = [];
  for (const seed of [1000 + i, 777777 + 13 * i]) { const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 42); enableDraftMode(g, seed, {}); for (const c of ["w","b"] as const) g.buffs!.players[c].offer = undefined as never; g.buffs!.nextDraftAtPly = 1e9; gs.push(g); }
  const r = mulberry(300 + i);
  for (let p = 0; p < 6; p++) { const ms = legalMoves(gs[0]); const m = ms[Math.floor(r() * ms.length)]; gs[0] = playMove(gs[0], m); gs[1] = playMove(gs[1], legalMoves(gs[1]).find((x) => x.from === m.from && x.to === m.to && x.promotion === m.promotion)!); }
  const color = gs[0].board.turn;
  for (const g of gs) acquireBuff(g, color, ID, 3 as never);
  const pred = deserializeGame(serializeGame(gs[0]))!;
  const outs = [pred, ...gs].map((g) => { const idx = g.buffs!.players[color].buffs.findIndex((b) => b.id === ID); const ok = activateBuff(g, color, idx, []); return `${ok}:${g.buffs!.extraMoves[color]}:${g.buffs!.players[color].buffs[idx].state.result}`; });
  total++; if (outs.every((o) => o === outs[0])) agree++; res[outs[1]] = (res[outs[1]] ?? 0) + 1;
}
console.log(`predicted ${agree}/${total}`, res);
