// Scratch (audit balance-ai): how long does the practice bot's card policy take?
// src/app/game/page.tsx calls aiActivateBuffs(game, botColor) on the MAIN
// thread before posting the search to the worker. Time aiChooseBuffActivation
// (the decision, which simulates activations on cloned games) over random
// midgames where the mover holds several activated cards.
import { ALL_BUFFS } from "../../../../../src/engine/buffs/library";
import { isRetired } from "../../../../../src/engine/retired";
import {
  acquireBuff,
  aiChooseBuffActivation,
  enableDraftMode,
  legalMoves,
  newGame,
  playMove,
  UNRESTRICTED_NERF,
} from "../../../../../src/engine/game";
import { performance } from "node:perf_hooks";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const activated = ALL_BUFFS.filter((b) => b.implemented && !isRetired(b.id) && b.kind === "activated");
const times: { ms: number; ids: string }[] = [];
const t0 = performance.now();
for (let seed = 1; seed <= 400 && performance.now() - t0 < 90_000; seed++) {
  const rnd = mulberry32(seed);
  const ri = (n: number) => Math.floor(rnd() * n);
  const g = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
  enableDraftMode(g, seed, { mode: "buff" });
  for (const c of ["w", "b"] as const) if (g.buffs?.players[c].offer) g.buffs.players[c].offer = null;
  // random-ish midgame
  const plies = 10 + ri(30);
  for (let p = 0; p < plies && !g.result; p++) {
    const ms = legalMoves(g);
    if (!ms.length) break;
    const caps = ms.filter((m) => m.captured && m.captured !== "k");
    playMove(g, caps.length && ri(3) === 0 ? caps[ri(caps.length)] : ms[ri(ms.length)]);
    for (const c of ["w", "b"] as const) if (g.buffs?.players[c].offer) g.buffs.players[c].offer = null;
  }
  if (g.result) continue;
  const me = g.board.turn;
  const ids: string[] = [];
  for (let i = 0; i < 4; i++) {
    const b = activated[ri(activated.length)];
    acquireBuff(g, me, b.id, b.tier);
    ids.push(b.id);
  }
  if (g.result) continue;
  const s = performance.now();
  try {
    aiChooseBuffActivation(g, me);
  } catch {}
  times.push({ ms: performance.now() - s, ids: ids.join(",") });
}
times.sort((a, b) => a.ms - b.ms);
const q = (p: number) => times[Math.min(times.length - 1, Math.floor(p * times.length))].ms.toFixed(1);
console.log(`aiChooseBuffActivation with 4 held activated cards: n=${times.length} p50 ${q(0.5)}ms p90 ${q(0.9)}ms p99 ${q(0.99)}ms max ${times[times.length - 1].ms.toFixed(1)}ms`);
console.log("over 50ms:", times.filter((t) => t.ms > 50).length, "worst:", times.slice(-3).map((t) => `${t.ms.toFixed(0)}ms [${t.ids}]`).join(" | "));
