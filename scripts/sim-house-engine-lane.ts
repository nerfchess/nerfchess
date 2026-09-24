// Lane model for the house bots' remote engine path (slice HB3, goal 7).
//
// The game-server DO plays every human-facing bot move from houseTick
// (worker.ts): on each alarm (every 250-300ms) it drains the due bot actions in
// order, at most 3 per tick and none after 250ms of the tick have gone, and
// each one AWAITS its remote engine fetch before the next starts. So with N
// humans playing bots at once, one bot's round trip is every other bot's
// wait, and a hung engine charges each move a full timeout. This models that
// lane and the fixes REQUESTS R7 (breaker, budget-sized timeout) and R8
// (fetch started when the bot is armed, off the serial lane) propose.
//
//   ./node_modules/.bin/tsx scripts/sim-house-engine-lane.ts --n 5,8 \
//     --engine healthy,hung --policy today,breaker,breaker+concurrent [--runs 20] [--json out]
//
// Reported per bot move: "extra wait", from when the move was due (the end of
// its visible think) to when it was committed, which is what a human sees as
// the bot hanging (it includes the move's own search and round trip on the
// serial path); and "lane wait", how long the action sat behind other games'
// actions after it could have started (due, and with R8 its fetch settled).
// The model's assumptions are printed with the results; it measures the lane,
// not the engine, so nothing here searches.
import { writeFileSync } from "node:fs";
import {
  HOUSE_SKILL_PROFILES,
  HouseEngineBreaker,
  houseEngineTimeoutMs,
  type HouseSkill,
} from "../src/lib/server/bots";

const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
};
const NS = arg("--n", "5,8").split(",").map(Number);
const ENGINES = arg("--engine", "healthy,hung").split(",") as ("healthy" | "hung")[];
const POLICIES = arg("--policy", "today,breaker,breaker+concurrent").split(",") as Policy[];
const RUNS = Number(arg("--runs", "20"));
const SIM_MS = Number(arg("--minutes", "10")) * 60_000;
const SEED = Number(arg("--seed", "1"));
const JSON_OUT = arg("--json", "");

type Policy = "today" | "breaker" | "breaker+concurrent";

// Model constants (worker.ts and bots.ts as of this slice).
const TICK_MIN_MS = 250; // alarm floor
const TICK_MAX_MS = 300;
const FOLLOW_UP_MS = 10; // the prompt follow-up alarm after deferred work
const MAX_ACTIONS_PER_TICK = 3; // houseMaxActionsPerTick
const TICK_BUDGET_MS = 250; // houseTickBudgetMs
const RTT_MS = 500; // HOUSE_REMOTE_RTT_ESTIMATE_MS, both ways together
const LOCAL_SEARCH_MS = 80; // HOUSE_SEARCH_CEILING_MS, on the DO's one thread
const COMMIT_MS = 3; // applying an already fetched move
const TODAY_TIMEOUT_MS = 3000; // HOUSE_ENGINE_TIMEOUT_MS
const DEADLINE_MS = TODAY_TIMEOUT_MS - 700; // R3's deadlineMs
const DEADLINE_MARGIN_MS = 250; // engine-service searchPool.ts

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The engine box. `today` is the old single-threaded service (one search at a
// time, no deadline); the new one has a pool of 2 and shrinks each search to
// what its deadline leaves after the queue wait.
class EngineBox {
  private free: number[];
  constructor(
    private readonly pool: number,
    private readonly deadline: boolean,
    private readonly hung: boolean,
  ) {
    this.free = Array.from({ length: pool }, () => 0);
  }
  /** When the answer to a request sent at `sentAt` reaches the DO, or
   * Infinity when it never does. */
  answer(sentAt: number, budgetMs: number): number {
    if (this.hung) return Infinity;
    const arrive = sentAt + RTT_MS / 2;
    let slot = 0;
    for (let i = 1; i < this.pool; i++) if (this.free[i] < this.free[slot]) slot = i;
    const start = Math.max(arrive, this.free[slot]);
    let search = budgetMs;
    if (this.deadline) search = Math.min(budgetMs, DEADLINE_MS - (start - arrive) - DEADLINE_MARGIN_MS);
    if (search < 20) return arrive + RTT_MS / 2; // 503: an immediate refusal
    this.free[slot] = start + search;
    return start + search + RTT_MS / 2;
  }
}

type Game = {
  botActAt: number | null; // due time of the pending bot move
  budget: number;
  fetch: { settleAt: number; ok: boolean } | null; // concurrent policy only
};

type Ev = { t: number; kind: "tick" | "arm" | "settle"; g?: Game; seq: number };

function simulate(n: number, engine: "healthy" | "hung", policy: Policy, seed: number): { waits: number[]; lanes: number[] } {
  const rnd = mulberry32(seed);
  const tiers = Object.keys(HOUSE_SKILL_PROFILES).map(Number) as HouseSkill[];
  const budgetOf = () => Math.min(1800, HOUSE_SKILL_PROFILES[tiers[Math.floor(rnd() * tiers.length)]].budgetMs);
  // A human's think: log-normal, median 4s, clamped to 0.4-30s.
  const humanThink = () => {
    const z = Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
    return Math.max(400, Math.min(30_000, 4000 * Math.exp(0.8 * z)));
  };
  const botThink = () => 800 + rnd() * 1700;
  const box = new EngineBox(policy === "today" ? 1 : 2, policy !== "today", engine === "hung");
  const breaker = new HouseEngineBreaker();
  const waits: number[] = [];
  const lanes: number[] = [];

  let seq = 0;
  const queue: Ev[] = [];
  const push = (e: Omit<Ev, "seq">) => {
    queue.push({ ...e, seq: seq++ });
  };
  const pop = (): Ev | undefined => {
    let best = 0;
    for (let i = 1; i < queue.length; i++) {
      if (queue[i].t < queue[best].t || (queue[i].t === queue[best].t && queue[i].seq < queue[best].seq)) best = i;
    }
    return queue.splice(best, 1)[0];
  };

  const games: Game[] = [];
  for (let i = 0; i < n; i++) {
    const g: Game = { botActAt: null, budget: 0, fetch: null };
    games.push(g);
    push({ t: humanThink(), kind: "arm", g }); // the human's first move
  }
  push({ t: 0, kind: "tick" });

  const timeoutOf = (budget: number) => (policy === "today" ? TODAY_TIMEOUT_MS : houseEngineTimeoutMs(budget));

  for (let ev = pop(); ev && ev.t < SIM_MS; ev = pop()) {
    const t = ev.t;
    if (ev.kind === "arm") {
      const g = ev.g!;
      g.budget = budgetOf();
      g.botActAt = t + botThink();
      g.fetch = null;
      if (policy === "breaker+concurrent" && breaker.allow(t)) {
        const answer = box.answer(t, g.budget);
        const timeout = timeoutOf(g.budget);
        const ok = answer - t <= timeout;
        g.fetch = { settleAt: ok ? answer : t + timeout, ok };
        push({ t: g.fetch.settleAt, kind: "settle", g });
      }
      continue;
    }
    if (ev.kind === "settle") {
      const f = ev.g!.fetch;
      if (f) breaker.record(f.ok ? "ok" : "timeout", t, f.ok ? t : undefined);
      continue;
    }

    // A tick: drain the due human-facing bot actions, serially.
    const due = games
      .filter((g) => g.botActAt != null && g.botActAt <= t)
      .filter((g) => policy !== "breaker+concurrent" || !g.fetch || g.fetch.settleAt <= t)
      .sort((a, b) => a.botActAt! - b.botActAt!);
    let cur = t;
    let acted = 0;
    let deferred = false;
    for (const g of due) {
      if (acted >= MAX_ACTIONS_PER_TICK || cur - t > TICK_BUDGET_MS) {
        deferred = true;
        break;
      }
      // Lane wait: how long this action waited behind the others, from the
      // moment it could have started (due, and for R8 its fetch settled).
      lanes.push(cur - Math.max(g.botActAt!, g.fetch?.settleAt ?? 0));
      if (policy === "breaker+concurrent") {
        cur += g.fetch?.ok ? COMMIT_MS : LOCAL_SEARCH_MS;
      } else if (policy === "today" || breaker.allow(cur)) {
        const answer = box.answer(cur, g.budget);
        const timeout = timeoutOf(g.budget);
        if (answer - cur <= timeout) {
          if (policy === "breaker") breaker.record("ok", answer, answer - cur);
          cur = answer;
        } else {
          cur += timeout;
          if (policy === "breaker") breaker.record("timeout", cur);
          cur += LOCAL_SEARCH_MS;
        }
      } else {
        cur += LOCAL_SEARCH_MS;
      }
      acted++;
      waits.push(cur - g.botActAt!);
      g.botActAt = null;
      g.fetch = null;
      push({ t: cur + humanThink(), kind: "arm", g });
    }
    push({ t: deferred ? cur + FOLLOW_UP_MS : Math.max(cur, t + TICK_MIN_MS + rnd() * (TICK_MAX_MS - TICK_MIN_MS)), kind: "tick" });
  }
  return { waits, lanes };
}

const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

const rows: Record<string, unknown>[] = [];
console.log(
  `lane model: ${RUNS} runs x ${SIM_MS / 60_000} min per cell, alarm ${TICK_MIN_MS}-${TICK_MAX_MS}ms, ` +
    `${MAX_ACTIONS_PER_TICK} actions or ${TICK_BUDGET_MS}ms per tick, RTT ${RTT_MS}ms, local fallback ${LOCAL_SEARCH_MS}ms, ` +
    `human think log-normal median 4s, bot think 0.8-2.5s, tier budgets uniform over the roster (capped 1800ms). ` +
    `today: old single-threaded engine, flat ${TODAY_TIMEOUT_MS}ms timeout; breaker: R7 (2 failures open it 45s, timeout budget+1s) with the pooled engine (2 threads, deadline ${DEADLINE_MS}ms); ` +
    `breaker+concurrent: R7 plus R8 (fetch starts when the bot is armed, commit at max(due, fetch done)).`,
);
console.log("N  engine   policy               moves    mean s   p95 s  lane mean  lane p95");
for (const n of NS) {
  for (const engine of ENGINES) {
    for (const policy of POLICIES) {
      const all: number[] = [];
      const lane: number[] = [];
      for (let r = 0; r < RUNS; r++) {
        const out = simulate(n, engine, policy, SEED * 1000 + r);
        all.push(...out.waits);
        lane.push(...out.lanes);
      }
      const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length) / 1000;
      const row = {
        n,
        engine,
        policy,
        moves: all.length,
        meanS: +mean(all).toFixed(2),
        p95S: +((pct(all, 95) ?? 0) / 1000).toFixed(2),
        laneMeanS: +mean(lane).toFixed(2),
        laneP95S: +((pct(lane, 95) ?? 0) / 1000).toFixed(2),
      };
      rows.push(row);
      console.log(
        `${String(n).padEnd(3)}${engine.padEnd(9)}${policy.padEnd(21)}${String(all.length).padStart(6)}` +
          `${row.meanS.toFixed(2).padStart(9)}${row.p95S.toFixed(2).padStart(8)}${row.laneMeanS.toFixed(2).padStart(10)}${row.laneP95S.toFixed(2).padStart(9)}`,
      );
    }
  }
}
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ runs: RUNS, minutes: SIM_MS / 60_000, seed: SEED, rows }, null, 2) + "\n");
