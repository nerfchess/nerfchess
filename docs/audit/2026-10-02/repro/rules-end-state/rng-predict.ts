// Card-effect RNG (fxRng) is a pure function of PUBLIC state: a client holding
// the public snapshot can compute a random card's outcome before choosing it.
import { UNRESTRICTED_NERF, acquireBuff, deserializeGame, enableDraftMode, legalMoves, newGame, playMove, serializeGame, type NerfGame } from "../../../../../src/engine/game";
import type { Color } from "../../../../../src/engine/types";
function mulberry(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let agree = 0, total = 0;
const outcomes: Record<string, number> = {};
for (let i = 0; i < 40; i++) {
  const rand = mulberry(50 + i);
  // Two DIFFERENT server draft seeds: the outcome must not depend on any server secret.
  const games: NerfGame[] = [];
  for (const draftSeed of [1111 + i, 999999 + i * 7]) {
    let g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 42);
    enableDraftMode(g, draftSeed, {});
    for (const c of ["w", "b"] as Color[]) g.buffs!.players[c].offer = undefined as never;
    g.buffs!.nextDraftAtPly = 100000;
    games.push(g);
  }
  // identical public move sequence on both
  const r2 = mulberry(900 + i);
  for (let p = 0; p < 8; p++) {
    const ms = legalMoves(games[0]);
    const m = ms[Math.floor(r2() * ms.length)];
    games[0] = playMove(games[0], m);
    const m1 = legalMoves(games[1]).find((x) => x.from === m.from && x.to === m.to && x.promotion === m.promotion)!;
    games[1] = playMove(games[1], m1);
  }
  // "predictor": a clone built from the public snapshot of game 0
  const predictor = deserializeGame(serializeGame(games[0]))!;
  const color = games[0].board.turn;
  acquireBuff(predictor, color, "wheel_of_fortune", 4 as never);
  acquireBuff(games[0], color, "wheel_of_fortune", 4 as never);
  acquireBuff(games[1], color, "wheel_of_fortune", 4 as never);
  const out = (g: NerfGame) => String(g.buffs!.players[color].buffs.at(-1)!.state.outcome);
  total++;
  if (out(predictor) === out(games[0]) && out(games[0]) === out(games[1])) agree++;
  outcomes[out(games[0])] = (outcomes[out(games[0])] ?? 0) + 1;
  void rand;
}
console.log(`Wheel of Fortune outcome predicted from public state (and independent of the server draft seed) in ${agree}/${total} positions`);
console.log(outcomes);
