// Which opening-pool nerfs draw from their slot RNG (init / onTurnStart)?
// Those are the nerfs whose hidden per-game parameters an opponent who
// recovers the master seed (or the opponent's fork state) could predict.
import { openingNerfPool, PLAYABLE_NERFS } from "../../../../../src/engine/nerfs/library";
import { RNG } from "../../../../../src/engine/rng";

class CountingRNG extends RNG {
  draws = 0;
  next(): number {
    this.draws++;
    return super.next();
  }
}
const pool = openingNerfPool();
let initUsers = 0;
let turnUsers = 0;
const names: string[] = [];
for (const n of pool) {
  const r = new CountingRNG(12345);
  let st = n.init ? n.init(r, "w") : {};
  const a = r.draws;
  let b = 0;
  if (n.onTurnStart) {
    const r2 = new CountingRNG(777);
    try {
      // minimal ctx; most nerfs only read the board lazily
      n.onTurnStart(st, { board: { pieces: [], turn: "w", history: [] } as never, me: "w", opponentLastMove: null, myLastMove: null, moveNumber: 1, capturedByMe: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 }, capturedFromMe: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 } }, r2);
    } catch {}
    b = r2.draws;
  }
  if (a > 0) initUsers++;
  if (b > 0) turnUsers++;
  if (a > 0 || b > 0) names.push(`${n.id}(init:${a},turn:${b})`);
}
console.log(`opening pool ${pool.length} nerfs, playable ${PLAYABLE_NERFS.length}`);
console.log(`init draws rng: ${initUsers}; onTurnStart draws rng: ${turnUsers}`);
console.log(names.join(" "));
