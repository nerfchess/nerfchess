// House-bot clock model (slice HB, track HB1): does a bot facing a human run
// its own clock out, and does its pacing look like a person's?
//
//   ./node_modules/.bin/tsx scripts/sim-house-clock.ts --runs 400 --rtt 500 --alarm 250-300 \
//       --config today,requested --seed 1
//
// Run it through scripts/polish/heavy.sh nice -n 10 on the shared box.
//
// There is no board here. The model replays, move by move, what worker.ts does
// with a house seat in a human game, using the bots.ts functions it imports:
//
//   1. armBotAction: a snap reply (houseSnapReplyMs) when the human just traded
//      and the persona's appetite roll comes up, else houseThinkMs. The first
//      own move gets the worker's 10s first-move grace on the clock it passes.
//   2. The alarm: the action lands no earlier than max(botActAt, now + 250-300ms)
//      (candidateAlarm and scheduleNextAlarm), so a think shorter than the alarm
//      floor still costs the floor.
//   3. playHouseAction: the remote engine or the local search. The search budget
//      is charged as wall time (the engine hard-deadlines at the ask), the remote
//      path adds the round trip (--rtt), and a remote reply slower than the
//      worker's 3000ms timeout falls back to a local search on top.
//   4. The clock is charged think + alarm + search, less the grace on the first
//      move, then gains the increment. The bot flags when it reaches zero.
//
// Two worker configurations:
//
//   today      worker.ts as it is: houseThinkMs(random, clock + grace, timeSec,
//              1, tempo) with no options, remote whenever more than 5000ms is
//              left (HOUSE_ENGINE_TIMEOUT_MS + 2000), pickHouseMove with no
//              options (so no increment reaches houseMoveBudgetMs).
//   requested  with REQUESTS R1 and R2 from docs/polish-pass/slices/HB.md: remote
//              only when houseMoveBudgetMs(budget, remaining, 1800, inc) exceeds
//              the 80ms DO ceiling, the increment passed to the local budget,
//              and houseThinkMs given { incrementSec, expectedSearchMs,
//              ownMoveIndex, kingSafeMoves, capturesAvailable }.
//
// Run against the baseline tree, both configurations collapse to today's
// behaviour (the options are ignored and houseExpectedSearchMs does not exist),
// which is exactly the before number.
//
// It also checks the filler freeze: over 10k seeded draws, houseThinkMs with a
// thinkMultiplier above 1 must return exactly what an embedded copy of the
// 2026-09-23 function returns for the same RNG draws (hard limit 3 in the slice
// plan), with and without the new options argument.

import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import * as bots from "../src/lib/server/bots";
import {
  HOUSE_ROSTER,
  HOUSE_SEARCH_CEILING_MS,
  HOUSE_FILLER_THINK_MULTIPLIER,
  bakedResolvedProfile,
  houseStyle,
  houseSnapReplyMs,
  houseThinkMs,
  houseMoveBudgetMs,
  type HouseSkill,
} from "../src/lib/server/bots";

const argv = process.argv.slice(2);
function arg(name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}
const RUNS = Number(arg("runs") ?? 400);
const RTT = Number(arg("rtt") ?? 500);
const [ALARM_LO, ALARM_HI] = (arg("alarm") ?? "250-300").split("-").map(Number);
const CONFIGS = (arg("config") ?? "today,requested").split(",");
const SEED = Number(arg("seed") ?? 1);
const TIERS = (arg("tiers") ?? "800,1200,1350,1650,1900,2200,2400").split(",").map(Number) as HouseSkill[];
const POOLS = (arg("pools") ?? "1+0,2+1,3+0,3+2,5+0,5+3").split(",");
const OUT = arg("out");
const MAX_MOVES = 200;
const GRACE_MS = 10_000; // worker.ts firstMoveGraceMs
const WORKER_TIMEOUT_MS = 3000; // worker.ts HOUSE_ENGINE_TIMEOUT_MS
const REMOTE_CEILING_MS = 1800; // engine-service REMOTE_SEARCH_CEILING_MS
const COMMIT_OVERHEAD_MS = 10;

function gitHead(): string {
  try {
    const head = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    const dirty = execSync("git status --porcelain -- src/lib/server/bots.ts", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    return dirty ? `${head}+dirty(bots.ts)` : head;
  } catch {
    return "unknown";
  }
}
const COMMIT = arg("commit") ?? gitHead();

function makeRng(seed: number): (max: number) => number {
  let s = (seed * 2654435761) >>> 0 || 1;
  return (max: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return Math.floor((s / 2 ** 32) * max);
  };
}
function quantile(xs: number[], q: number): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo);
}
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

// Optional API from the HB1 change; absent on the baseline tree.
type ExpectedSearch = (budgetMs: number, remainingMs: number, remote: boolean, incrementSec?: number) => number;
const houseExpectedSearchMs = (bots as unknown as { houseExpectedSearchMs?: ExpectedSearch }).houseExpectedSearchMs;
type ThinkFn = (
  random: (max: number) => number,
  myClockMs: number,
  timeSec: number,
  thinkMultiplier?: number,
  tempo?: number,
  opts?: Record<string, unknown>,
) => number;
const think = houseThinkMs as unknown as ThinkFn;
type BudgetFn = (budgetMs: number, remainingClockMs?: number, ceilingMs?: number, incrementSec?: number) => number;
const budgetOf = houseMoveBudgetMs as unknown as BudgetFn;

// ---------------------------------------------------------------------------
// The 2026-09-23 houseThinkMs, embedded verbatim (minus comments) so the filler
// freeze can be checked against it forever, whatever bots.ts becomes.
// ---------------------------------------------------------------------------
function houseThinkMs20260923(
  random: (max: number) => number,
  myClockMs: number,
  timeSec: number,
  thinkMultiplier = 1,
  tempo = 1,
): number {
  const hasClock = timeSec > 0;
  const fast = hasClock && timeSec <= 180;
  let delay: number;
  if (fast) delay = 1000 + random(2001);
  else if (random(10) < 9) delay = 1000 + random(3001);
  else delay = 6000 + random(4001);
  if (thinkMultiplier > 1) delay = Math.round(delay * thinkMultiplier);
  if (tempo !== 1) delay = Math.round(delay * Math.max(0.5, Math.min(1.5, tempo)));
  if (hasClock) {
    if (myClockMs < 10_000) delay = Math.min(delay, 300 + random(501));
    else if (myClockMs < 25_000) delay = Math.min(delay, 700 + random(801));
    else if (delay > myClockMs / 5) delay = Math.max(500, Math.floor(myClockMs / 5));
  }
  return delay;
}

function fillerFreeze(): { draws: number; mismatches: number; mismatchesWithOpts: number } {
  let mismatches = 0;
  let mismatchesWithOpts = 0;
  const draws = 10_000;
  const pick = makeRng(SEED + 99);
  for (let i = 0; i < draws; i++) {
    const clock = 100 + pick(600_000);
    const timeSec = [0, 60, 120, 180, 300, 600][pick(6)];
    const mult = [2, 3, 5, HOUSE_FILLER_THINK_MULTIPLIER][pick(4)];
    const tempo = 0.75 + pick(61) / 100;
    const a = makeRng(1_000 + i);
    const b = makeRng(1_000 + i);
    const c = makeRng(1_000 + i);
    const want = houseThinkMs20260923(a, clock, timeSec, mult, tempo);
    if (think(b, clock, timeSec, mult, tempo) !== want) mismatches++;
    const opts = { incrementSec: pick(4), expectedSearchMs: pick(2000), ownMoveIndex: pick(40), kingSafeMoves: 1 + pick(30), capturesAvailable: pick(5) };
    if (think(c, clock, timeSec, mult, tempo, opts) !== want) mismatchesWithOpts++;
  }
  return { draws, mismatches, mismatchesWithOpts };
}

// ---------------------------------------------------------------------------
// One simulated game from the bot's side of the clock.
// ---------------------------------------------------------------------------

type RunResult = {
  flagMove: number | null; // own move number the bot flagged on, null if it never did in MAX_MOVES
  budgets: number[]; // search budget of each own move (first 40 kept)
  delays: { move: number; ms: number; forced: boolean }[]; // pacing of each own move
};

function simulate(config: string, tier: HouseSkill, pool: string, rng: (max: number) => number): RunResult {
  const [min, inc] = pool.split("+").map(Number);
  const timeSec = min * 60;
  const incMs = inc * 1000;
  // 2200 has no personas on the roster curve (the engine tier still exists for
  // overrides and the ladder), so fall back to the whole roster for the tempo.
  const tierPersonas = HOUSE_ROSTER.filter((p) => p.skill === tier);
  const from = tierPersonas.length ? tierPersonas : HOUSE_ROSTER;
  const persona = from[rng(from.length)];
  const tempo = houseStyle(persona).tempo;
  const profile = bakedResolvedProfile(tier);
  const requested = config === "requested";
  let clock = timeSec * 1000;
  const budgets: number[] = [];
  const delays: RunResult["delays"] = [];
  for (let i = 0; i < MAX_MOVES; i++) {
    const grace = i === 0 ? GRACE_MS : 0;
    // Position features the worker has from snapContext: a trade to answer
    // about 15% of the time, one king-safe move about 3% of the time.
    const traded = rng(100) < 15;
    const forced = rng(100) < 3;
    const kingSafeMoves = forced ? 1 : 8 + rng(30);
    const capturesAvailable = rng(5);
    // snapContext's legalCount is the pseudo-legal count, which is never 1 in
    // practice; the requested worker also passes the king-safe count (R2/R11).
    const pseudoLegal = kingSafeMoves + 3 + rng(10);
    const snapCtx: Parameters<typeof houseSnapReplyMs>[2] & { kingSafeCount?: number } = {
      capturedOn: traded ? 27 : null,
      myCaptureTargets: traded ? [27] : [],
      legalCount: pseudoLegal,
    };
    if (requested) snapCtx.kingSafeCount = kingSafeMoves;
    const snap = houseSnapReplyMs(persona, rng, snapCtx);
    let delay: number;
    if (snap != null) delay = snap;
    else if (requested) {
      const remoteGuess = budgetOf(profile.budgetMs, clock, REMOTE_CEILING_MS, inc) > HOUSE_SEARCH_CEILING_MS;
      const expected = houseExpectedSearchMs ? houseExpectedSearchMs(profile.budgetMs, clock, remoteGuess, inc) : 0;
      delay = think(rng, clock + grace, timeSec, 1, tempo, {
        incrementSec: inc,
        expectedSearchMs: expected,
        ownMoveIndex: i,
        kingSafeMoves,
        capturesAvailable,
      });
    } else {
      delay = think(rng, clock + grace, timeSec, 1, tempo);
    }
    delays.push({ move: i, ms: delay, forced });
    // The alarm floor: the action cannot land sooner than 250-300ms out.
    const acted = Math.max(delay, ALARM_LO + rng(ALARM_HI - ALARM_LO + 1));
    const remaining = clock + grace - acted;
    let spend = acted;
    if (remaining <= 0) {
      return { flagMove: i + 1, budgets, delays };
    }
    const remoteBudget = budgetOf(profile.budgetMs, remaining, REMOTE_CEILING_MS);
    const useRemote = requested
      ? budgetOf(profile.budgetMs, remaining, REMOTE_CEILING_MS, inc) > HOUSE_SEARCH_CEILING_MS
      : remaining > WORKER_TIMEOUT_MS + 2000;
    let searched: number;
    if (useRemote) {
      const rtt = RTT * (0.8 + rng(41) / 100); // +-20% jitter
      if (rtt + remoteBudget > WORKER_TIMEOUT_MS) {
        const local = budgetOf(profile.budgetMs, remaining - WORKER_TIMEOUT_MS, HOUSE_SEARCH_CEILING_MS, requested ? inc : undefined);
        spend += WORKER_TIMEOUT_MS + local;
        searched = local;
      } else {
        spend += rtt + remoteBudget;
        searched = remoteBudget;
      }
    } else {
      const local = budgetOf(profile.budgetMs, remaining, HOUSE_SEARCH_CEILING_MS, requested ? inc : undefined);
      spend += local;
      searched = local;
    }
    spend += COMMIT_OVERHEAD_MS;
    if (i < 40) budgets.push(searched);
    clock = clock + grace - spend;
    if (clock <= 0) return { flagMove: i + 1, budgets, delays };
    clock += incMs;
  }
  return { flagMove: null, budgets, delays };
}

// ---------------------------------------------------------------------------

const started = Date.now();
const freeze = fillerFreeze();
console.log(
  `filler freeze: ${freeze.draws} draws, ${freeze.mismatches} mismatches without options, ${freeze.mismatchesWithOpts} with options (both must be 0)`,
);

const cells: Record<string, unknown>[] = [];
for (const config of CONFIGS) {
  console.log(`\nconfig ${config} (rtt ${RTT}ms, alarm ${ALARM_LO}-${ALARM_HI}ms, ${RUNS} runs per cell):`);
  for (const pool of POOLS) {
    for (const tier of TIERS) {
      const rng = makeRng(SEED * 1_000_003 + tier * 31 + POOLS.indexOf(pool) * 7 + CONFIGS.indexOf(config));
      const flags: number[] = [];
      let flaggedBy150 = 0;
      let lowBudget = 0;
      let budgetN = 0;
      let early = 0;
      let earlyFast = 0;
      let longThinks = 0;
      let allThinks = 0;
      let forcedLong = 0;
      let forcedN = 0;
      const tierBudget = bakedResolvedProfile(tier).budgetMs;
      for (let r = 0; r < RUNS; r++) {
        const res = simulate(config, tier, pool, rng);
        flags.push(res.flagMove ?? MAX_MOVES + 1);
        if (res.flagMove != null && res.flagMove <= 150) flaggedBy150++;
        for (const b of res.budgets) {
          budgetN++;
          if (b <= 30) lowBudget++;
        }
        for (const d of res.delays) {
          if (d.move < 5) {
            early++;
            if (d.ms < 1200) earlyFast++;
          }
          allThinks++;
          if (d.ms >= 6000) longThinks++;
          if (d.forced) {
            forcedN++;
            if (d.ms >= 6000) forcedLong++;
          }
        }
      }
      const cell = {
        config,
        pool,
        tier,
        tierBudgetMs: tierBudget,
        flagMedian: quantile(flags, 0.5),
        flagP10: quantile(flags, 0.1),
        neverFlaggedShare: flags.filter((f) => f > MAX_MOVES).length / RUNS,
        flaggedWithin150Share: flaggedBy150 / RUNS,
        // Only meaningful where the tier's own budget is above 30ms: 800 and 900
        // are depth-capped tiers whose budget is 24-30ms by design.
        first40AtOrUnder30ms: tierBudget > 30 ? lowBudget / Math.max(1, budgetN) : null,
        earlyUnder1200Share: earlyFast / Math.max(1, early),
        longThinkShare: longThinks / Math.max(1, allThinks),
        forcedLongThinkShare: forcedLong / Math.max(1, forcedN),
      };
      cells.push(cell);
      const flagText =
        cell.flagMedian > MAX_MOVES ? `never (>${MAX_MOVES})` : `median ${cell.flagMedian} p10 ${cell.flagP10}`;
      console.log(
        `  ${pool.padEnd(4)} ${String(tier).padStart(4)}: flag ${flagText}, flagged<=150 ${pct(cell.flaggedWithin150Share)}, ` +
          `first40<=30ms ${cell.first40AtOrUnder30ms == null ? "n/a" : pct(cell.first40AtOrUnder30ms)}, ` +
          `moves1-5 <1.2s ${pct(cell.earlyUnder1200Share)}, >=6s ${pct(cell.longThinkShare)} (forced ${pct(cell.forcedLongThinkShare)})`,
      );
    }
  }
}

const payload = {
  script: "scripts/sim-house-clock.ts",
  commit: COMMIT,
  argv: argv.join(" "),
  runs: RUNS,
  rttMs: RTT,
  alarmMs: [ALARM_LO, ALARM_HI],
  maxMoves: MAX_MOVES,
  fillerFreeze: freeze,
  seconds: (Date.now() - started) / 1000,
  cells,
};
if (OUT) {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(`wrote ${OUT}`);
}
if (freeze.mismatches || freeze.mismatchesWithOpts) process.exitCode = 1;
