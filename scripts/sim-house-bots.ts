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
  HOUSE_SKILLS,
  HouseSkill,
  houseDraftThinkMs,
  houseNerfPickIndex,
  houseSeedRating,
  houseThinkMs,
  pickHouseMove,
  pickHouseSeek,
  resolveSkillProfile,
  bakedResolvedProfile,
  sanitizeResolvedProfile,
  parseSkillOverrides,
  WEAKENED_PRESET,
  type ResolvedSkillProfile,
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
for (const skill of [1350, 1550, 1750] as HouseSkill[]) {
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

// The roster grew to 210 personas (an active window of 60-90 rotates daily) and
// spans the 1350-2200 skill tiers: assert the invariants that must hold whatever
// the current mix is, not a frozen census.
check(HOUSE_ROSTER.length === 210, "roster size");
check(
  HOUSE_ROSTER.every((p) => HOUSE_SKILL_PROFILES[p.skill] != null),
  "every persona uses a real skill tier",
);
check(HOUSE_ROSTER.every((p) => !/bot/i.test(p.name)), "no 'bot' in names");
// Every persona debuts with a house look: an uploaded-style image pfp
// (house_pfp:) or a flower preset. Both live only in the house avatar space.
check(
  HOUSE_ROSTER.every((p) => p.avatar.startsWith("house_pfp:") || p.avatar.endsWith("_flower")),
  "house avatar preset ids",
);
check(new Set(HOUSE_ROSTER.map((p) => p.name.toLowerCase())).size === HOUSE_ROSTER.length, "unique names");
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
// pickHouseSeek advertises an even 50/50 buff/nerf split (3b4bc02 moved it
// off the old 60/40 buff bias) so neither queue is starved: allow ±5%.
check(nerfSeeks > 4500 && nerfSeeks < 5500, `nerf seek share ${nerfSeeks / 10_000}`);
console.log(`seek mix: ${(100 - nerfSeeks / 100).toFixed(1)}% buff / ${(nerfSeeks / 100).toFixed(1)}% nerf`);

check(houseNerfPickIndex([2, 5], random) === 0, "nerf pick lower tier first");
check(houseNerfPickIndex([6, 3], random) === 1, "nerf pick lower tier second");

// ---------------------------------------------------------------------------
// 4. Skill resolution & clamping (pure — the /mod override path).
// ---------------------------------------------------------------------------

// No overrides == baked, and baked is the un-weakened search (topK 1, no noise).
for (const skill of HOUSE_SKILLS) {
  const baked = bakedResolvedProfile(skill);
  check(baked.topK === 1 && baked.temperatureCp === 0 && baked.evalNoiseCp === 0, `${skill}: baked is un-weakened`);
  check(
    JSON.stringify(resolveSkillProfile(skill, null)) === JSON.stringify(baked),
    `${skill}: null overrides == baked`,
  );
}

// A tier override merges and clamps; other tiers stay baked.
const ov = { "1350": { topK: 5, temperatureCp: 150 } };
check(resolveSkillProfile(1350, ov).topK === 5, "override applies topK");
check(resolveSkillProfile(1350, ov).temperatureCp === 150, "override applies temp");
check(resolveSkillProfile(1550, ov).topK === 1, "sibling tier stays baked");

// Out-of-range values are clamped, not rejected; garbage falls back per-field.
check(resolveSkillProfile(1350, { "1350": { topK: 999 } }).topK === 8, "topK clamped to max");
check(resolveSkillProfile(1350, { "1350": { temperatureCp: -50 } }).temperatureCp === 0, "temp clamped to min");
check(
  resolveSkillProfile(1350, { "1350": { blunderChance: "x" } }).blunderChance === bakedResolvedProfile(1350).blunderChance,
  "non-numeric falls back to baked",
);
check(resolveSkillProfile(1350, { "1350": { maxDepth: 4.7 } }).maxDepth === 5, "maxDepth rounds");
check(parseSkillOverrides("not json") === null, "bad json parses to null");
check(parseSkillOverrides("{}") !== null, "empty object parses");

// The engine-service sanitizer degrades a malformed wire profile to baked.
check(
  sanitizeResolvedProfile(2200, { topK: 3, junk: true }).topK === 3,
  "sanitize keeps valid field",
);
check(
  sanitizeResolvedProfile(2200, null).maxDepth === bakedResolvedProfile(2200).maxDepth,
  "sanitize null == baked",
);
console.log("skill resolution: overrides merge/clamp, sanitize degrades to baked");

// ---------------------------------------------------------------------------
// 5. Strength round-robin (opt-in: `--roundrobin`). Plays weakened profiles
//    against the un-weakened top tier over plain games and reports the score
//    matrix, asserting the spec's acceptance bands. Slow, so it is gated off
//    the default fast run. See docs/bot-weakening-spec.md §7.
// ---------------------------------------------------------------------------

if (process.argv.includes("--roundrobin")) {
  // A generous per-move ceiling so the strong reference gets close to its real
  // (OCI-path) strength rather than the 80ms DO clamp; weakening is
  // time-independent so the weak side is unaffected by the higher ceiling. Both
  // are env-tunable: a full run wants RR_CEILING ~150 and RR_GAMES ~24 (slow,
  // minutes); drop them for a quick indicative read. Lowering the ceiling mainly
  // handicaps the strong reference, so weak-tier scores read conservatively.
  const CEILING_MS = Number(process.env.RR_CEILING ?? 150);
  const GAMES = Number(process.env.RR_GAMES ?? 24); // per pairing, colors split

  // Result for white: 1 win / 0.5 draw / 0 loss. Unfinished (ply cap) = draw.
  function playMatch(
    wSkill: HouseSkill,
    wProfile: ResolvedSkillProfile,
    bSkill: HouseSkill,
    bProfile: ResolvedSkillProfile,
    seed: number,
  ): number {
    let game: NerfGame = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, seed);
    for (let ply = 0; ply < 200 && !game.result; ply++) {
      const turn = game.board.turn;
      const skill = turn === "w" ? wSkill : bSkill;
      const profile = turn === "w" ? wProfile : bProfile;
      const move = pickHouseMove(game, skill, random, undefined, CEILING_MS, profile);
      if (!move) break;
      const legal = legalMoves(game).find((m) => moveToUCI(m) === moveToUCI(move));
      if (!legal) break;
      game = playMove(game, legal);
    }
    const w = game.result?.winner;
    return w === "w" ? 1 : w === "b" ? 0 : 0.5;
  }

  // Score of `weak` against the un-weakened reference over GAMES games, colors
  // alternated so first-move advantage cancels.
  function scoreVsReference(
    weakSkill: HouseSkill,
    weakProfile: ResolvedSkillProfile,
    refSkill: HouseSkill,
    refProfile: ResolvedSkillProfile,
  ): number {
    let score = 0;
    for (let g = 0; g < GAMES; g++) {
      const seed = 7_000 + weakSkill * 100 + g;
      if (g % 2 === 0) score += playMatch(weakSkill, weakProfile, refSkill, refProfile, seed);
      else score += 1 - playMatch(refSkill, refProfile, weakSkill, weakProfile, seed);
    }
    return score / GAMES;
  }

  const refSkill: HouseSkill = 2200; // un-weakened top band under the preset
  const refProfile = bakedResolvedProfile(refSkill);
  const weakenedMap = WEAKENED_PRESET as Record<string, unknown>;
  // "significantly worse" (<=20% vs ref) vs "worse" (25-40% vs ref) bands.
  const significantly: HouseSkill[] = [1350, 1550, 1750, 1900];
  const worse: HouseSkill[] = [1950, 2000, 2050];

  console.log(`\nstrength round-robin (${GAMES} games/pairing vs un-weakened ${refSkill}):`);
  // Thresholds are reported, not asserted: a stochastic small-sample estimate
  // must not fail the deterministic suite above it. Raise RR_GAMES for a tighter
  // read before trusting a band verdict.
  for (const skill of [...significantly, ...worse]) {
    const profile = resolveSkillProfile(skill, { [String(skill)]: weakenedMap[String(skill)] });
    const s = scoreVsReference(skill, profile, refSkill, refProfile);
    const band = significantly.includes(skill) ? "significantly" : "worse";
    const target = band === "significantly" ? "target <=20%" : "target 25-40%";
    const inBand = band === "significantly" ? s <= 0.22 : s >= 0.2 && s <= 0.45;
    console.log(
      `  tier ${skill} (${band}): ${(s * 100).toFixed(1)}% vs ${refSkill} — ${target} ${inBand ? "OK" : "OUT"}`,
    );
  }
  console.log("  (indicative — small sample; raise RR_GAMES to tighten)");
}

if (failures) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nall checks passed");
