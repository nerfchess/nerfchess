// Engine service load check (slice HB3, P9). Starts a built bundle on a local
// port and measures response latency with k concurrent clients on one fixed
// midgame record, then checks that a full queue answers 503 at once and that
// a request abandoned while queued is never searched.
//
//   node engine-service/build.mjs
//   node engine-service/test/load.mjs --k 1,2,3,4 --tier 2200 --requests 12 [--bundle <path>] [--json <out>]
//
// Local port 8874 only; nothing here talks to a production host. Exit 1 when
// a target is missed: 0% of responses over 2500ms at every k, a 503 within
// 50ms on a full queue, and 0 searches for an abandoned queued request.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
};
const BUNDLE = resolve(arg("--bundle", join(here, "..", "dist", "server.mjs")));
const KS = arg("--k", "1,2,3,4").split(",").map(Number);
const TIER = Number(arg("--tier", "2200"));
const REQUESTS = Number(arg("--requests", "12"));
const POOL = arg("--pool", "2");
const JSON_OUT = arg("--json", "");
const LIMIT_MS = 2500;
const TOKEN = "hb3-local-load-token";
const PORT = 8874;
const BASE = `http://127.0.0.1:${PORT}`;
const MIDGAME = "e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6 c1e3 e7e5 d4b3 c8e6 f2f3 f8e7 d1d2 e8g8".split(" ");
const body = (extra = {}) =>
  JSON.stringify({
    match: { setup: { whiteNerfId: "none", blackNerfId: "none", seed: 1 }, mode: "buff", moves: MIDGAME },
    skill: TIER,
    replayVersion: 3,
    remainingClockMs: 170_000,
    ...extra,
  });

function start() {
  return new Promise((ok, fail) => {
    const child = spawn(process.execPath, [BUNDLE], {
      env: { ...process.env, PORT: String(PORT), HOUSE_ENGINE_TOKEN: TOKEN, ENGINE_REPLAY_VERSION: "3", ENGINE_POOL_SIZE: POOL },
      stdio: ["ignore", "pipe", "inherit"],
    });
    child.stdout.on("data", (d) => {
      if (d.toString().includes("listening")) ok(child);
    });
    child.on("exit", (c) => fail(new Error(`server exited ${c}`)));
  });
}

async function move(extra = {}, signal) {
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE}/move`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
      body: body(extra),
      signal,
    });
    const text = await res.text();
    let j = null;
    try {
      j = JSON.parse(text);
    } catch {
      j = null;
    }
    return { status: res.status, ms: performance.now() - t0, depth: j?.depth ?? null, move: !!j?.move };
  } catch (err) {
    return { status: signal?.aborted ? "aborted" : "network", ms: performance.now() - t0, depth: null, move: false };
  }
}

async function stats() {
  const res = await fetch(`${BASE}/stats`, { headers: { authorization: `Bearer ${TOKEN}` } }).catch(() => null);
  if (!res || !res.ok) return null;
  return res.json();
}

const pct = (xs, p) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

async function runK(k) {
  const out = [];
  let next = 0;
  const client = async () => {
    while (next < REQUESTS) {
      next++;
      out.push(await move());
    }
  };
  await Promise.all(Array.from({ length: k }, client));
  const ms = out.map((r) => r.ms);
  const ok = out.filter((r) => r.status === 200 && r.move);
  const depths = ok.map((r) => r.depth).filter((d) => typeof d === "number");
  return {
    k,
    n: out.length,
    ok: ok.length,
    statuses: out.reduce((a, r) => ((a[r.status] = (a[r.status] ?? 0) + 1), a), {}),
    meanMs: Math.round(ms.reduce((a, b) => a + b, 0) / ms.length),
    p50Ms: Math.round(pct(ms, 50)),
    p95Ms: Math.round(pct(ms, 95)),
    maxMs: Math.round(Math.max(...ms)),
    over2500: out.filter((r) => r.ms > LIMIT_MS).length,
    meanDepth: depths.length ? +(depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(2) : null,
  };
}

async function main() {
  const server = await start();
  const report = { bundle: BUNDLE, tier: TIER, requests: REQUESTS, pool: Number(POOL), perK: [], queueFull: null, abandoned: null };
  try {
    await move(); // warm up
    for (const k of KS) {
      const r = await runK(k);
      report.perK.push(r);
      console.log(JSON.stringify(r));
    }

    // Queue full: pool + 2 x pool requests in flight, then one more.
    const inflight = Number(POOL) * 3;
    const held = Array.from({ length: inflight }, () => move());
    await new Promise((r) => setTimeout(r, 150));
    const extra = await move();
    await Promise.all(held);
    report.queueFull = { inflight, status: extra.status, ms: Math.round(extra.ms), pass: extra.status === 503 && extra.ms <= 50 };
    console.log("queue full:", JSON.stringify(report.queueFull));

    // Abandoned while queued: fill the threads, queue one, hang up on it.
    const before = await stats();
    const busy = Array.from({ length: Number(POOL) }, () => move());
    await new Promise((r) => setTimeout(r, 150));
    const ctl = new AbortController();
    const queued = move({}, ctl.signal);
    await new Promise((r) => setTimeout(r, 200));
    ctl.abort();
    await queued;
    await Promise.all(busy);
    await new Promise((r) => setTimeout(r, 100));
    const after = await stats();
    report.abandoned = before && after
      ? {
          searchedDelta: after.searched - before.searched,
          expectedSearches: Number(POOL),
          abortedBeforeStartDelta: after.abortedBeforeStart - before.abortedBeforeStart,
          pass: after.searched - before.searched === Number(POOL) && after.abortedBeforeStart - before.abortedBeforeStart === 1,
        }
      : { pass: false, note: "no /stats counters on this build" };
    console.log("abandoned:", JSON.stringify(report.abandoned));
  } finally {
    server.kill("SIGTERM");
  }
  const latencyOk = report.perK.every((r) => r.over2500 === 0);
  const pass = latencyOk && report.queueFull?.pass && report.abandoned?.pass;
  report.pass = !!pass;
  console.log(pass ? "RESULT: PASS" : "RESULT: FAIL");
  if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify(report, null, 2) + "\n");
  process.exit(pass ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
