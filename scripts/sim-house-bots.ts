// Focused engine-side simulation for the house-player roster. Run with:
//
//   npx -y tsx scripts/sim-house-bots.ts
//
// Proves, off the server, the three properties the Durable Object relies on:
// 1. Every skill tier produces a LEGAL move within its hard-capped budget
//    across full Draft games (both modes), including offer resolves and buff
//    activations.
// 2. The move-pacing distribution matches the spec: 1-4s base, ~1 in 10
//    moves 6-10s, clamped when the clock runs low.
// 3. The draft pacing stays inside the 15s lock-in window.

import {
  HOUSE_ROSTER,
  HOUSE_SKILL_PROFILES,
  HouseSkill,
  houseDraftThinkMs,
  houseNerfPickIndex,
  houseSeedRating,
  houseThinkMs,
  pickHouseMove,
  pickHouseSeek,
} from "../src/lib/server/bots";
import {
  UNRESTRICTED_NERF,
  aiChooseBuffActivation,
  aiDraftChoice,
  activateBuff,
  bankDraft,
  enableDraftMode,
  legalMoves,
  newGame,
  pickDraftCard,
  type NerfGame,
} from "../src/engine/game";
import { moveToUCI } from "../src/engine/board";
import { PLAYABLE_NERFS } from "../src/engine/nerfs/library";
import type { Color } from "../src/engine/types";
import { playMove } from "../src/engine/game";

// Deterministic RNG so a failure reproduces. Uses the high bits (an LCG's
// low bits cycle with tiny periods and would bias `% max`).
let rngState = 0x9e3779b9;
function random(max: number): number {
  rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0;
  return Math.floor((rngState / 2 ** 32) * max);
}

let failures = 0;
function check(ok: boolean, label: string) {
  if (!ok) {
    failures++;
    console.error("FAIL:", label);
  }
}

// ---------------------------------------------------------------------------
// 1. Legal moves within budget, across full draft games at every skill tier.
// ---------------------------------------------------------------------------

function playSimGame(skill: HouseSkill, mode: "nerf" | "buff", seed: number) {
  const nerfFor = () =>
    mode === "buff" ? UNRESTRICTED_NERF : PLAYABLE_NERFS[random(PLAYABLE_NERFS.length)];
  let game: NerfGame = newGame(nerfFor(), nerfFor(), seed);
  enableDraftMode(game, seed + 1, { mode });

  let maxMs = 0;
  let moves = 0;
  for (let ply = 0; ply < 140 && !game.result; ply++) {
    // Resolve any pending offers first, like the server does.
    for (const color of ["w", "b"] as Color[]) {
      if (!game.buffs?.players[color].offer) continue;
      const choice = aiDraftChoice(game, color);
      check(choice !== null, `${skill}/${mode}: offer with no ai choice`);
      if (!choice) return { maxMs, moves };
      if (choice.action === "bank") bankDraft(game, color);
      else pickDraftCard(game, color, choice.index);
    }
    if (game.result) break;

    const turn = game.board.turn;
    // Occasionally fire a held buff, like the server's 40% coin.
    if (random(100) < 40) {
      const activation = aiChooseBuffActivation(game, turn);
      if (activation) {
        check(
          activateBuff(game, turn, activation.buffIndex, activation.picks),
          `${skill}/${mode}: chosen activation rejected`,
        );
        if (game.result || game.board.turn !== turn) continue;
      }
    }

    const start = Date.now();
    const move = pickHouseMove(game, skill, random, undefined);
    const elapsed = Date.now() - start;
    maxMs = Math.max(maxMs, elapsed);
    if (!move) {
      // Engine reports no legal move: only acceptable with a result pending
      // or a genuinely empty move list (the server resigns here).
      check(legalMoves(game).length === 0, `${skill}/${mode}: null move with legal moves available`);
      break;
    }
    const uci = moveToUCI(move);
    const legal = legalMoves(game).find((m) => moveToUCI(m) === uci);
    check(!!legal, `${skill}/${mode}: illegal move ${uci} at ply ${ply}`);
    if (!legal) break;
    game = playMove(game, legal);
    moves++;
  }
  return { maxMs, moves };
}

console.log("house move legality + budget:");
for (const skill of [1200, 1400, 1600, 1750] as HouseSkill[]) {
  for (const mode of ["nerf", "buff"] as const) {
    let worst = 0;
    let total = 0;
    for (let g = 0; g < 3; g++) {
      const { maxMs, moves } = playSimGame(skill, mode, 1000 * skill + g);
      worst = Math.max(worst, maxMs);
      total += moves;
    }
    // Budget ceiling is 80ms; the search checks its clock at budget*2, so
    // anything under 400ms (including replay overhead on slow CI) is sane.
    check(worst <= 400, `${skill}/${mode}: move took ${worst}ms`);
    console.log(
      `  skill ${skill} ${mode}: ${total} moves ok, worst search ${worst}ms (budget ${HOUSE_SKILL_PROFILES[skill].budgetMs}ms)`,
    );
  }
}

// ---------------------------------------------------------------------------
// 2. Pacing distributions.
// ---------------------------------------------------------------------------

const N = 100_000;
let long = 0;
for (let i = 0; i < N; i++) {
  const d = houseThinkMs(random, 120_000, 600); // slow control (10+0): full pacing
  check(d >= 1000 && d <= 10_000, `think ${d}ms out of range`);
  if (d > 4001) long++;
}
const longShare = long / N;
check(longShare > 0.07 && longShare < 0.13, `long-think share ${longShare}`);
console.log(`pacing: base 1-4s, long 6-10s share ${(longShare * 100).toFixed(1)}% (target ~10%)`);

// Fast time controls (base <= 180s: 1+0, 2+1, 3+0): snappy 1-3s, never the
// 6-10s long think, so a bullet/blitz game against a bot stays live.
for (let i = 0; i < 20_000; i++) {
  const f = houseThinkMs(random, 120_000, 180);
  check(f >= 1000 && f <= 3000, `fast-TC think ${f}ms out of range`);
}
console.log("pacing: fast TC (<=180s) stays within 1-3s");

for (let i = 0; i < 10_000; i++) {
  const low = houseThinkMs(random, 6_000, 600); // 6s left on the clock
  check(low <= 900, `low-clock think ${low}ms too slow`);
  const mid = houseThinkMs(random, 20_000, 600);
  check(mid <= 1600, `mid-clock think ${mid}ms too slow`);
  const draft = houseDraftThinkMs(random);
  check(draft >= 2000 && draft <= 8000, `draft think ${draft}ms out of range`);
}
console.log("pacing: low-clock clamps and 2-8s draft picks ok");

// ---------------------------------------------------------------------------
// 3. Roster shape, seek mix, nerf pick.
// ---------------------------------------------------------------------------

const bySkill = new Map<number, number>();
for (const p of HOUSE_ROSTER) bySkill.set(p.skill, (bySkill.get(p.skill) ?? 0) + 1);
check(HOUSE_ROSTER.length === 16, "roster size");
check(bySkill.get(1200) === 6 && bySkill.get(1400) === 5 && bySkill.get(1600) === 3 && bySkill.get(1750) === 2, "skill mix 6/5/3/2");
check(HOUSE_ROSTER.every((p) => !/bot/i.test(p.name)), "no 'bot' in names");
check(HOUSE_ROSTER.every((p) => p.avatar.endsWith("_flower")), "flower avatars");
check(new Set(HOUSE_ROSTER.map((p) => p.name.toLowerCase())).size === 16, "unique names");
console.log(
  "roster:",
  HOUSE_ROSTER.map((p) => `${p.name}(${p.skill}->${houseSeedRating(p)})`).join(", "),
);

let nerfSeeks = 0;
for (let i = 0; i < 10_000; i++) {
  const { pool, mode } = pickHouseSeek(random);
  check(["1+0", "2+1", "3+0", "3+2", "5+0", "5+3"].includes(pool), `seek pool ${pool}`);
  if (mode === "nerf") nerfSeeks++;
}
check(nerfSeeks > 3000 && nerfSeeks < 5000, `nerf seek share ${nerfSeeks / 10_000}`);
console.log(`seek mix: ${(100 - nerfSeeks / 100).toFixed(1)}% buff / ${(nerfSeeks / 100).toFixed(1)}% nerf`);

check(houseNerfPickIndex([2, 5], random) === 0, "nerf pick lower tier first");
check(houseNerfPickIndex([6, 3], random) === 1, "nerf pick lower tier second");

if (failures) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nall checks passed");
