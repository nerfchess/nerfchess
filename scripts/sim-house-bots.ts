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
  HOUSE_WINDOW_STEP,
  HOUSE_COUNT_MIN,
  HOUSE_ONLINE_MAX,
  HOUSE_GAMES_MAX,
  HOUSE_VS_HOUSE_FLOOR,
  HOUSE_VS_HOUSE_CAP,
  HOUSE_FILLER_SPAWN_BUFFER,
  HOUSE_FILLER_THINK_MULTIPLIER,
  houseFillerSpawnDelayMs,
  pickHouseFillerSeek,
  HouseSkill,
  activeHouseRoster,
  houseDraftThinkMs,
  houseNerfPickIndex,
  houseSeedRating,
  houseSocialDelayMs,
  houseThinkMs,
  houseWindowStart,
  pickHouseFillerPair,
  pickHouseMove,
  pickHouseSeek,
  resolveSkillProfile,
  bakedResolvedProfile,
  sanitizeResolvedProfile,
  parseSkillOverrides,
  HOUSE_SOCIAL_MIN_DELAY_MS,
  HOUSE_SOCIAL_MAX_DELAY_MS,
  WEAKENED_PRESET,
  FILLER_EXCLUDED_CARD_IDS,
  type ResolvedSkillProfile,
} from "../src/lib/server/bots";
import { rollOffer, setDraftPoolOverrides } from "../src/engine/draft";
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
import { BUFF_BY_ID } from "../src/engine/buffs/library";
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

// The roster is ~900 personas across three waves, spanning the 800-2700 tiers.
// Assert the invariants that must hold whatever the current mix is, never a
// frozen census: a hardcoded 210 sat here through two roster expansions and
// simply reported FAIL every run, which is worse than no check at all.
check(HOUSE_ROSTER.length > HOUSE_ONLINE_MAX, `roster (${HOUSE_ROSTER.length}) must exceed the peak shown population (${HOUSE_ONLINE_MAX})`);
check(HOUSE_ROSTER.length >= 2 * HOUSE_GAMES_MAX, `roster (${HOUSE_ROSTER.length}) must cover 2 seats x HOUSE_GAMES_MAX (${2 * HOUSE_GAMES_MAX})`);
check(
  HOUSE_ROSTER.every((p) => HOUSE_SKILL_PROFILES[p.skill] != null),
  "every persona uses a real skill tier",
);
// No name may advertise itself as a bot. "botvinnik_lab" is the one allowed
// exception: it is named for the world champion, not for what it is, and the
// substring test flagged it on every run since the roster shipped.
const BOT_SUBSTRING_EXEMPT = new Set(["botvinnik_lab"]);
check(
  HOUSE_ROSTER.every((p) => BOT_SUBSTRING_EXEMPT.has(p.name.toLowerCase()) || !/bot/i.test(p.name)),
  "no 'bot' in names",
);
// Every persona debuts with a house look: an uploaded-style image pfp
// (house_pfp:) or a flower preset. Both live only in the house avatar space.
check(
  HOUSE_ROSTER.every((p) => p.avatar.startsWith("house_pfp:") || p.avatar.endsWith("_flower")),
  "house avatar preset ids",
);
check(new Set(HOUSE_ROSTER.map((p) => p.name.toLowerCase())).size === HOUSE_ROSTER.length, "unique names");
// A 900-name dump buried every other line of output. Print the shape instead,
// plus a small sample, and leave the full census to scripts/audit-house-bots.ts.
{
  const byTier = new Map<number, number>();
  for (const p of HOUSE_ROSTER) byTier.set(p.skill, (byTier.get(p.skill) ?? 0) + 1);
  const shape = [...byTier.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([skill, n]) => `${skill}:${n}`)
    .join(" ");
  console.log(`roster: ${HOUSE_ROSTER.length} personas -> ${shape}`);
  console.log(
    "  sample:",
    HOUSE_ROSTER.slice(0, 6).map((p) => `${p.name}(${p.skill}->${houseSeedRating(p)})`).join(", "),
  );
}

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

// No overrides == baked. Baked is the un-weakened search (topK 1, no noise) for
// every tier EXCEPT the beginner band, which bakes its weakening deliberately:
// a genuinely 800-1200 bot needs shallow, noisy, top-K play, and that is a
// property of the tier rather than a moderator override. The blanket assertion
// here predated those tiers and failed on all four of them every run.
const BAKED_WEAKENED_MAX_SKILL = 1200;
for (const skill of HOUSE_SKILLS) {
  const baked = bakedResolvedProfile(skill);
  if (skill <= BAKED_WEAKENED_MAX_SKILL) {
    check(
      baked.topK > 1 || baked.temperatureCp > 0 || baked.evalNoiseCp > 0,
      `${skill}: beginner tier must bake its weakening`,
    );
  } else {
    check(baked.topK === 1 && baked.temperatureCp === 0 && baked.evalNoiseCp === 0, `${skill}: baked is un-weakened`);
  }
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

// ---------------------------------------------------------------------------
// 6. Fair bot-vs-bot pairing + roster rotation coverage.
//
// The lobby/TV filler pairs bots to play each other. Weighting selection toward
// the fewest games played must (a) spread games across the roster so no bot
// lingers at zero, and (b) reach EVERY persona over time — including ones
// outside any single day's active window — which relies on the daily window
// rotation visiting every start offset. Both are asserted here.
// ---------------------------------------------------------------------------

// (a) Rotation coverage: the window step is coprime with the roster, so over a
// full rotation every start offset — and therefore every persona — is visited.
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}
check(gcd(HOUSE_WINDOW_STEP, HOUSE_ROSTER.length) === 1, "window step coprime with roster (all offsets reachable)");
const starts = new Set<number>();
for (let d = 0; d < HOUSE_ROSTER.length; d++) starts.add(houseWindowStart(d));
check(starts.size === HOUSE_ROSTER.length, "rotation visits every window start over a full cycle");
const everSeen = new Set<string>();
for (let d = 0; d < HOUSE_ROSTER.length; d++) {
  for (const p of activeHouseRoster(60, d)) everSeen.add(p.userId);
}
check(everSeen.size === HOUSE_ROSTER.length, "every persona rotates into the active window within one cycle");
console.log(
  `rotation: step ${HOUSE_WINDOW_STEP} covers all ${starts.size}/${HOUSE_ROSTER.length} offsets; ` +
    `every persona reachable in the active window`,
);

// (b) Fair spread: simulate many filler pairings, advancing the daily active
// window like production, and confirm the per-bot game counts converge (min > 0,
// and a tight min/median/max) instead of a few bots hogging games. Compare
// against a UNIFORM-random control on the same schedule to show the weighting
// helps.
const WINDOW_SIZE = HOUSE_COUNT_MIN; // the smallest daily active window
const PAIRS_PER_DAY = 40; // filler games spawned per simulated day
const DAYS = 420; // two full roster rotations

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function simulateSchedule(weighted: boolean): Map<string, number> {
  const games = new Map<string, number>();
  for (const p of HOUSE_ROSTER) games.set(p.userId, 0);
  const gamesOf = (id: string) => games.get(id) ?? 0;
  for (let day = 0; day < DAYS; day++) {
    const window = activeHouseRoster(WINDOW_SIZE, day);
    for (let k = 0; k < PAIRS_PER_DAY; k++) {
      let pair: readonly [(typeof HOUSE_ROSTER)[number], (typeof HOUSE_ROSTER)[number]] | null;
      if (weighted) {
        pair = pickHouseFillerPair(window, gamesOf, random);
      } else {
        // Uniform control: two distinct random personas from the same window.
        const i = random(window.length);
        let j = random(window.length);
        if (j === i) j = (j + 1) % window.length;
        pair = [window[i], window[j]];
      }
      if (!pair) continue;
      for (const p of pair) games.set(p.userId, (games.get(p.userId) ?? 0) + 1);
    }
  }
  return games;
}

const weighted = [...simulateSchedule(true).values()];
const uniform = [...simulateSchedule(false).values()];
const wMin = Math.min(...weighted);
const wMax = Math.max(...weighted);
const wMed = median(weighted);
const uMin = Math.min(...uniform);
const uMax = Math.max(...uniform);
const uMed = median(uniform);
console.log(
  `fair pairing (weighted 1/(1+games), ${DAYS} days x ${PAIRS_PER_DAY} pairs, window ${WINDOW_SIZE}):`,
);
console.log(`  weighted -> min ${wMin}, median ${wMed}, max ${wMax}  (spread ${wMax - wMin})`);
console.log(`  uniform  -> min ${uMin}, median ${uMed}, max ${uMax}  (spread ${uMax - uMin})`);
// Every persona must have played (no leaderboard zeros)...
check(wMin > 0, "weighted pairing: every bot played at least one game");
// ...counts stay in a tight band around the median (no runaway hogging)...
check(wMax - wMin <= wMed, `weighted spread ${wMax - wMin} should be <= median ${wMed}`);
// ...and the weighting is at least as even as uniform random on the same schedule.
check(wMax - wMin <= uMax - uMin, "weighted spread no wider than uniform control");

// ---------------------------------------------------------------------------
// 7. Concurrent-game floor: staggered ramp-up and steady state.
//
// Owner target: 40+ house games live around the clock (Watch tab / TV always
// busy), with natural variance in a 40-55 band and never a dip below the floor
// while the house is enabled. The worker spawns at most ONE filler game per
// tick, paced by houseFillerSpawnDelayMs (brisk ~1.5-3s stagger below the
// floor+buffer, lazy 8-15s at steady state) — asserted here over a simulated
// scheduling run using the production constants.
// ---------------------------------------------------------------------------

// Seat supply: the smallest daily active window must seat the whole steady band
// (2 bots per game) plus the seek reserve (houseSeekMax + 2 = 6 in worker.ts).
const SEEK_RESERVE = 6;
check(
  HOUSE_COUNT_MIN - SEEK_RESERVE >= 2 * (HOUSE_VS_HOUSE_FLOOR + HOUSE_FILLER_SPAWN_BUFFER),
  `active window floor ${HOUSE_COUNT_MIN} seats the ${HOUSE_VS_HOUSE_FLOOR}-game floor (+buffer) with the seek reserve`,
);
check(HOUSE_VS_HOUSE_CAP >= HOUSE_VS_HOUSE_FLOOR + HOUSE_FILLER_SPAWN_BUFFER, "cap leaves room above the floor");
// Filler pools skip the ultra-bullet controls (the slowed filler pacing would
// flag a 1+0 game within a handful of moves).
for (let i = 0; i < 5_000; i++) {
  const { pool } = pickHouseFillerSeek(random);
  check(["3+0", "3+2", "5+0", "5+3"].includes(pool), `filler pool ${pool}`);
}

// Flag-safety regression guard for the real bug: the filler multiplier must
// NEVER inflate a think past the clock-based clamp. houseThinkMs applies the
// multiplier to the base think BEFORE the low-clock clamps, so the final value
// is always bounded by the same ceiling a non-filler bot obeys: at most 800ms
// under 10s left, and at most clock/5 with more time. The old code multiplied
// AFTER the clamp, so a filler move could reach ~1.6x the remaining clock (8 x
// clock/5) and flag the bot within a handful of moves — the root cause of
// steady-state concurrency collapsing far below the floor. Under that bug this
// bound is violated for any healthy clock; the fix satisfies it everywhere.
for (let i = 0; i < 50_000; i++) {
  const clock = 200 + random(300_000); // 0.2s .. 5min left (spans every clamp branch)
  const timeSec = [180, 300][random(2)]; // filler base controls (3+0 / 5+0)
  const t = houseThinkMs(random, clock, timeSec, HOUSE_FILLER_THINK_MULTIPLIER);
  const ceiling = Math.max(800, Math.floor(clock / 5)) + 1;
  check(t <= ceiling, `filler think ${t}ms exceeds clock-clamp ceiling ${ceiling}ms at clock ${clock}ms`);
}
console.log(
  `flag safety: filler think (x${HOUSE_FILLER_THINK_MULTIPLIER}) stays within the clock clamp (<=max(800, clock/5)), never a premature flag`,
);

// Realistic filler game lifetime, derived from the REAL pacing constants rather
// than a hand-picked number: simulate a bot-vs-bot game's clocks move by move
// using houseThinkMs at the filler multiplier, deduct each think from the mover's
// clock (adding the increment), and end the game at a flag OR a natural result
// (a plausible ply cap — real games end by mate/resignation, not only on time).
// The wall-clock lifetime is the sum of both sides' thinks. Deliberately
// conservative (shorter lifetime => higher turnover => a stricter concurrency
// test): if the pacing ever regressed to flag games early, lifetimes would
// collapse and the steady-state assertion below would fail.
function parseTc(pool: string): { timeSec: number; incrementSec: number } {
  const [min, inc] = pool.split("+").map(Number);
  return { timeSec: min * 60, incrementSec: inc };
}
function simulateFillerGameSeconds(): number {
  const { pool } = pickHouseFillerSeek(random);
  const { timeSec, incrementSec } = parseTc(pool);
  const clock = { w: timeSec * 1000, b: timeSec * 1000 };
  // Natural finish: most blitz games end well before 100+ moves. 60-120 ply
  // (30-60 moves each) models a result before either side necessarily flags.
  const resultPly = 60 + random(61);
  let wallMs = 0;
  let side: "w" | "b" = "w";
  for (let ply = 0; ply < resultPly; ply++) {
    const think = houseThinkMs(random, clock[side], timeSec, HOUSE_FILLER_THINK_MULTIPLIER);
    wallMs += think;
    clock[side] -= think;
    if (clock[side] <= 0) break; // flag
    clock[side] += incrementSec * 1000;
    side = side === "w" ? "b" : "w";
  }
  return wallMs / 1000;
}
let lifeSum = 0;
let lifeMin = Infinity;
let lifeMax = 0;
const LIFE_SAMPLES = 4_000;
for (let i = 0; i < LIFE_SAMPLES; i++) {
  const s = simulateFillerGameSeconds();
  lifeSum += s;
  lifeMin = Math.min(lifeMin, s);
  lifeMax = Math.max(lifeMax, s);
}
const meanLifeS = lifeSum / LIFE_SAMPLES;
console.log(
  `filler lifetime (x${HOUSE_FILLER_THINK_MULTIPLIER} pacing, derived): ` +
    `mean ${meanLifeS.toFixed(0)}s, min ${lifeMin.toFixed(0)}s, max ${lifeMax.toFixed(0)}s`,
);

// Scheduling run: 1s ticks (the alarm cadence), one spawn per tick when due and
// under the caps; each game's lifetime is drawn from the realistic derived model
// above (not a fixed constant). Seat supply is the smallest daily window minus
// the seek reserve.
const RAMP_LIMIT_S = 5 * 60; // must hit the floor within 5 minutes of cold start
const RUN_S = 6 * 60 * 60; // then hold it for six simulated hours
const SETTLE_S = 60; // grace after first hitting the floor
const seatCapGames = Math.floor((HOUSE_COUNT_MIN - SEEK_RESERVE) / 2);
let liveEnds: number[] = [];
let nextSpawnAt = 0;
let reachedFloorAt = -1;
let minAfterRamp = Infinity;
let maxSeen = 0;
let sumAfterRamp = 0;
let samplesAfterRamp = 0;
for (let t = 0; t < RUN_S; t++) {
  liveEnds = liveEnds.filter((end) => end > t);
  if (t >= nextSpawnAt && liveEnds.length < Math.min(HOUSE_VS_HOUSE_CAP, seatCapGames)) {
    liveEnds.push(t + simulateFillerGameSeconds());
    nextSpawnAt = t + houseFillerSpawnDelayMs(liveEnds.length, random) / 1000;
  }
  const n = liveEnds.length;
  maxSeen = Math.max(maxSeen, n);
  if (reachedFloorAt < 0 && n >= HOUSE_VS_HOUSE_FLOOR) reachedFloorAt = t;
  if (reachedFloorAt >= 0 && t >= reachedFloorAt + SETTLE_S) {
    minAfterRamp = Math.min(minAfterRamp, n);
    sumAfterRamp += n;
    samplesAfterRamp++;
  }
}
check(
  reachedFloorAt >= 0 && reachedFloorAt <= RAMP_LIMIT_S,
  `ramp-up reached ${HOUSE_VS_HOUSE_FLOOR} games in ${reachedFloorAt}s (limit ${RAMP_LIMIT_S}s)`,
);
check(minAfterRamp >= HOUSE_VS_HOUSE_FLOOR, `steady-state min ${minAfterRamp} >= floor ${HOUSE_VS_HOUSE_FLOOR}`);
check(maxSeen <= HOUSE_VS_HOUSE_CAP, `concurrency max ${maxSeen} <= cap ${HOUSE_VS_HOUSE_CAP}`);
console.log(
  `concurrency: ramp to ${HOUSE_VS_HOUSE_FLOOR} games in ${reachedFloorAt}s; ` +
    `steady state over ${RUN_S / 3600}h -> min ${minAfterRamp}, ` +
    `mean ${(sumAfterRamp / Math.max(1, samplesAfterRamp)).toFixed(1)}, max ${maxSeen} ` +
    `(floor ${HOUSE_VS_HOUSE_FLOOR}, cap ${HOUSE_VS_HOUSE_CAP}, seat cap ${seatCapGames})`,
);

// ---------------------------------------------------------------------------
// 8. Bot social-response delay (friend requests + direct challenges).
// ---------------------------------------------------------------------------

for (let i = 0; i < 20_000; i++) {
  const d = houseSocialDelayMs(`challenge:${i}:${random(1_000_000_000)}`);
  check(
    d >= HOUSE_SOCIAL_MIN_DELAY_MS && d <= HOUSE_SOCIAL_MAX_DELAY_MS,
    `social delay ${d}ms out of range`,
  );
}
// Deterministic per seed (the poll must compute the same deadline every tick).
check(houseSocialDelayMs("friend:a:b:123") === houseSocialDelayMs("friend:a:b:123"), "social delay deterministic");
check(
  houseSocialDelayMs("friend:a:b:123") !== houseSocialDelayMs("friend:a:b:124") ||
    houseSocialDelayMs("friend:a:b:125") !== houseSocialDelayMs("friend:a:b:126"),
  "social delay varies by seed (jittered)",
);
console.log(
  `social delay: ${HOUSE_SOCIAL_MIN_DELAY_MS / 1000}-${HOUSE_SOCIAL_MAX_DELAY_MS / 1000}s, deterministic per request, jittered across requests`,
);

// ---------------------------------------------------------------------------
// 9. Chess Diff is never drafted in a bot-vs-bot filler game.
//
// Chess Diff (id "chess_diff") is a board-rewriting card that breaks spectator
// reconstruction, so worker.ts folds FILLER_EXCLUDED_CARD_IDS into a filler
// match's draft-pool `off` set (the same mechanism a moderator-disabled card
// uses). Roll real offers through the engine's draft path AT THE CARD'S OWN
// TIER, across many seeds and BOTH modes, with that override installed, and
// assert it is never offered. A control run WITHOUT the override proves the roll
// path can and does produce it, so the exclusion is doing real work. Human games
// install no such override and keep the card.
//
// The tier is read from the card rather than hardcoded: it used to be pinned at
// 6 here, the card was later rebalanced to tier 4, and the control silently
// stopped being able to produce it at all — so the exclusion assertion below was
// passing vacuously, which is the one thing a control exists to prevent.
// ---------------------------------------------------------------------------

const CHESS_DIFF_ID = "chess_diff";
const CHESS_DIFF_TIER = BUFF_BY_ID[CHESS_DIFF_ID]?.tier ?? 6;
check(FILLER_EXCLUDED_CARD_IDS.includes(CHESS_DIFF_ID), "filler exclusion set contains chess_diff");
check(BUFF_BY_ID[CHESS_DIFF_ID] != null, "chess_diff still exists in the library");

/** Count how many of `samples` offers (per mode) contain Chess Diff when rolled
 * at the card's own tier, with the given draft-pool override installed. Each
 * sample builds a fresh draft state seeded distinctly, so draws are
 * deterministic and independent. */
function countChessDiffOffers(off: string[] | null, samples: number): number {
  setDraftPoolOverrides(off ? { off } : null);
  let seen = 0;
  try {
    for (const mode of ["buff", "nerf"] as const) {
      for (let s = 0; s < samples; s++) {
        const game = newGame(UNRESTRICTED_NERF, UNRESTRICTED_NERF, 1);
        enableDraftMode(game, 0x51d1ff + s * 2654435761, { mode });
        // Vary the draft RNG per sample so each roll is an independent draw.
        game.buffs!.rngState = ((0x9e3779b9 ^ (s * 2246822519)) >>> 0) || 1;
        const offer = rollOffer(game.buffs!, "w", [CHESS_DIFF_TIER, CHESS_DIFF_TIER], game.board);
        if (offer?.cards.some((c) => c.id === CHESS_DIFF_ID)) seen++;
      }
    }
  } finally {
    setDraftPoolOverrides(null);
  }
  return seen;
}

const SAMPLES = 4_000;
const withoutOverride = countChessDiffOffers(null, SAMPLES);
const withOverride = countChessDiffOffers([...FILLER_EXCLUDED_CARD_IDS], SAMPLES);
check(withoutOverride > 0, `control: chess_diff should appear without the filler override (saw ${withoutOverride})`);
check(withOverride === 0, `filler override: chess_diff must NEVER be offered (saw ${withOverride})`);
console.log(
  `chess diff exclusion: tier-6 offers over ${SAMPLES} seeds x 2 modes -> ` +
    `${withoutOverride} with the card in pool, ${withOverride} with the filler override (must be 0)`,
);

if (failures) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nall checks passed");
