// Regression checks for the game socket's inbound guard and the public
// diagnostics (slice H: F068, F050, F056, F090, and the internal human count).
//
//   ./node_modules/.bin/tsx scripts/polish/test-socket-guard.ts
//
// Part 1 exercises src/lib/server/socketGuard.ts directly. Part 2 reads
// worker.ts, because the Durable Object cannot run under next dev: it asserts
// the public /healthz bodies carry no error text or stack, that the worker's
// own JSON carries nosniff, that the internal /mod/online route is not one the
// public fetch forwards, and that closed sockets are pruned from the throttle
// maps.

import { readFileSync } from "node:fs";
import { join } from "node:path";

let failures = 0;
function ok(cond: boolean, label: string) {
  console.log((cond ? "  ok  " : "FAIL  ") + label);
  if (!cond) failures++;
}

async function main() {
  let guard: typeof import("../../src/lib/server/socketGuard") | null = null;
  try {
    guard = await import("../../src/lib/server/socketGuard");
  } catch {
    guard = null;
  }
  ok(!!guard, "src/lib/server/socketGuard.ts exists");
  if (guard) {
    const { checkClientFrame, newFrameBudget, spendFrame, FRAME_BUDGET } = guard;
    const good = checkClientFrame('{"t":"move","d":{"u":"e2e4","ply":0}}');
    ok(good.ok && good.frame.t === "move", "a normal move frame passes");
    ok(checkClientFrame('{"t":"p"}').ok, "a frame without d passes");
    for (const [raw, code, label] of [
      ["null", "bad_frame", "JSON null"],
      ["42", "bad_frame", "a bare number"],
      ['"move"', "bad_frame", "a bare string"],
      ["[1,2]", "bad_frame", "an array"],
      ['{"d":{}}', "bad_frame", "an object without t"],
      ['{"t":5}', "bad_frame", "a numeric t"],
      ['{"t":""}', "bad_frame", "an empty t"],
      [`{"t":"${"x".repeat(40)}"}`, "bad_frame", "a 40-char t"],
      ["{nope", "bad_json", "broken JSON"],
    ] as const) {
      const r = checkClientFrame(raw);
      ok(!r.ok && r.code === code, `${label} is rejected as ${code}`);
    }
    const big = JSON.stringify({ t: "chat", d: { text: "a".repeat(9000) } });
    const rBig = checkClientFrame(big);
    ok(!rBig.ok && rBig.code === "frame_too_large", "a 9KB string frame is rejected before parsing");
    const bigBuf = new TextEncoder().encode(big).buffer as ArrayBuffer;
    const rBuf = checkClientFrame(bigBuf);
    ok(!rBuf.ok && rBuf.code === "frame_too_large", "a 9KB binary frame is rejected before parsing");
    // 3000 three-byte characters: under 8192 UTF-16 units, over 8192 bytes.
    const wide = JSON.stringify({ t: "chat", d: { text: "€".repeat(3000) } });
    const rWideSmall = checkClientFrame(wide);
    ok(!rWideSmall.ok && rWideSmall.code === "frame_too_large", "a 3000-char euro frame (9KB UTF-8, 3KB of units) is rejected by its byte size");
    const wideOk = JSON.stringify({ t: "chat", d: { text: "€".repeat(2700) } });
    ok(checkClientFrame(wideOk).ok, "a 2700-char euro frame (about 8.1KB UTF-8) is under the byte limit and passes");
    const wide2 = JSON.stringify({ t: "chat", d: { text: "€".repeat(9000) } });
    const rWide = checkClientFrame(wide2);
    ok(!rWide.ok && rWide.code === "frame_too_large", "a 27KB UTF-8 frame is rejected");

    // Token bucket: a real burst passes, a flood is dropped then closed, and
    // a client that backs off recovers.
    let t = 1_000_000;
    const b = newFrameBudget(t);
    let passed = 0;
    for (let i = 0; i < FRAME_BUDGET.capacity; i++) if (spendFrame(b, t) === "ok") passed++;
    ok(passed === FRAME_BUDGET.capacity, `a burst of ${FRAME_BUDGET.capacity} frames at once passes`);
    ok(spendFrame(b, t) === "drop", "the next frame in the same instant is dropped");
    t += 1000;
    let after = 0;
    for (let i = 0; i < 20; i++) if (spendFrame(b, t) === "ok") after++;
    ok(after === FRAME_BUDGET.perSecond, `one second later ${FRAME_BUDGET.perSecond} more pass`);
    let verdict = "ok";
    let n = 0;
    while (verdict !== "close" && n < 10_000) {
      verdict = spendFrame(b, t);
      n++;
    }
    ok(verdict === "close" && n <= FRAME_BUDGET.closeAfterDropped + 1, `a sustained flood is closed after about ${FRAME_BUDGET.closeAfterDropped} drops (took ${n})`);
    const steady = newFrameBudget(t);
    let steadyDropped = 0;
    for (let i = 0; i < 600; i++) {
      t += 200; // 5 frames a second for two minutes: far above real play
      if (spendFrame(steady, t) !== "ok") steadyDropped++;
    }
    ok(steadyDropped === 0, "5 frames a second for two minutes never drops");

    // Match creation window (F067).
    const g = guard as unknown as Record<string, unknown>;
    const Limiter = g.WindowLimiter as
      | (new (limit: number, windowMs: number, maxKeys?: number) => { take(keys: string[], now: number): boolean; size(): number })
      | undefined;
    const limits = g.MATCH_CREATE_LIMITS as { windowMs: number; perAccount: number; perAddress: number } | undefined;
    ok(typeof Limiter === "function" && !!limits, "socketGuard exports WindowLimiter and MATCH_CREATE_LIMITS (F067)");
    if (Limiter && limits) {
      const lim = new Limiter(limits.perAccount, limits.windowMs);
      let now = 5_000_000;
      let allowed = 0;
      for (let i = 0; i < 1000; i++) if (lim.take(["acct"], (now += 10))) allowed++;
      ok(allowed === limits.perAccount, `a create loop gets ${limits.perAccount} matches per window, not 1000 (got ${allowed})`);
      ok(lim.take(["other"], now), "another account is not affected");
      ok(lim.take(["acct"], now + limits.windowMs + 1), "the account can create again after the window");
      const small = new Limiter(1, 1000, 50);
      for (let i = 0; i < 500; i++) small.take([`k${i}`], 1_000 + i * 10);
      ok(small.size() <= 50, `the limiter's key map stays bounded (size ${small.size()})`);
    }

    // Who spends which bucket (F067 review round 1): the address bucket is only
    // for callers that can mint identities (anonymous sockets and guests), so
    // one abuser on a shared address cannot lock full accounts out, and a
    // refused create spends nothing.
    const CreateLimiter = g.MatchCreateLimiter as
      | (new (limits?: { windowMs: number; perAccount: number; perAddress: number }) => {
          take(who: { userId?: string; guest?: boolean; addr?: string }, now: number): boolean;
          byAccount: { count(key: string, now: number): number };
          byAddress: { count(key: string, now: number): number };
        })
      | undefined;
    ok(typeof CreateLimiter === "function", "socketGuard exports MatchCreateLimiter (F067)");
    if (CreateLimiter && limits) {
      const cl = new CreateLimiter(limits);
      const t0 = 9_000_000;
      let guestsAllowed = 0;
      for (let i = 0; i < 200; i++) if (cl.take({ userId: `guest${i}`, guest: true, addr: "shared" }, t0 + i)) guestsAllowed++;
      ok(guestsAllowed === limits.perAddress, `fresh guests on one address get ${limits.perAddress} games in total (got ${guestsAllowed})`);
      let anonAllowed = 0;
      for (let i = 0; i < 100; i++) if (cl.take({ addr: "anon-addr" }, t0 + i)) anonAllowed++;
      ok(anonAllowed === limits.perAddress, `anonymous sockets on one address get ${limits.perAddress} games (got ${anonAllowed})`);
      ok(!cl.take({ userId: "guest-fresh", guest: true, addr: "shared" }, t0 + 300), "a new guest behind the exhausted address is refused");
      ok(cl.byAccount.count("guest-fresh", t0 + 300) === 0, "the refused guest create left its account count at 0");
      ok(cl.take({ userId: "member", addr: "shared" }, t0 + 301), "a full account behind the exhausted address can still create");
      ok(cl.byAddress.count("shared", t0 + 301) === limits.perAddress, "a full account's create does not spend the address bucket");
      let memberAllowed = 1;
      for (let i = 0; i < 100; i++) if (cl.take({ userId: "member", addr: "shared" }, t0 + 400 + i)) memberAllowed++;
      ok(memberAllowed === limits.perAccount, `the full account still has its own ${limits.perAccount}-game limit (got ${memberAllowed})`);
      const before = cl.byAccount.count("member", t0 + 600);
      ok(!cl.take({ userId: "member", addr: "shared" }, t0 + 600), "the full account is refused past its own limit");
      ok(cl.byAccount.count("member", t0 + 600) === before, "a refused create leaves the account count unchanged");
      ok(cl.take({ userId: "member", addr: "shared" }, t0 + limits.windowMs + 500), "the full account can create again after the window");
      // A guest with its own bucket full is refused without spending the address.
      const g2 = new CreateLimiter(limits);
      for (let i = 0; i < limits.perAccount; i++) g2.take({ userId: "g", guest: true, addr: "a2" }, t0 + i);
      const addrBefore = g2.byAddress.count("a2", t0 + 100);
      ok(!g2.take({ userId: "g", guest: true, addr: "a2" }, t0 + 100), "a guest past its account limit is refused");
      ok(g2.byAddress.count("a2", t0 + 100) === addrBefore, "that refusal does not spend the address bucket");
    }
  }

  // Part 2: worker.ts source checks.
  const worker = readFileSync(process.env.POLISH_WORKER_PATH ?? join(__dirname, "..", "..", "worker.ts"), "utf8");
  // Everything below reads the worker.ts source (the Durable Object does not
  // run under next dev), so each label says "source check" to keep it apart
  // from the behavioural checks above.
  const src = (cond: boolean, label: string) => ok(cond, `source check: ${label}`);
  const healthzBodies = [...worker.matchAll(/Response\.json\(\s*\{\s*ok: false[^}]*\}/g)].map((m) => m[0]);
  src(healthzBodies.length >= 2, "found the ok:false /healthz bodies");
  src(healthzBodies.every((b) => !/error|stack/.test(b)), "no ok:false /healthz body carries error text or a stack");
  const healthzStart = worker.indexOf('if (url.pathname === "/healthz") {');
  const healthzEnd = worker.indexOf('if (url.pathname === "/lobby"', healthzStart);
  const healthz = worker.slice(healthzStart, healthzEnd);
  src(healthzStart > 0 && healthzEnd > healthzStart, "found the /healthz handler");
  src(!/lastError: this\.dbLastError,/.test(healthz), "/healthz does not return the D1 error text");
  src(!/tickError: this\.houseTickError,/.test(healthz), "/healthz does not return the tick error text");
  src(!/lastDesync: this\.houseLastDesync,/.test(healthz), "/healthz does not return desync detail (game id, draft actions)");
  src(!/lastEngineReject: this\.houseLastEngineReject,/.test(healthz), "/healthz does not return the engine reject detail");
  src(!/error: err instanceof Error \? err\.message/.test(healthz), "/healthz lobby probe does not return the error message");
  src(/x-content-type-options": "nosniff"/.test(worker), "worker JSON sets nosniff");
  src(/headers: workerJsonHeaders/.test(healthz), "/healthz sends the nosniff header");

  const publicFetch = worker.slice(worker.indexOf("export default {"));
  src(!publicFetch.includes("/mod/online"), "the public worker fetch never forwards /mod/online");
  src(worker.includes('url.pathname === "/mod/online"'), "the DO serves the internal /mod/online route");

  const closeBody = worker.slice(worker.indexOf("async webSocketClose("), worker.indexOf("async webSocketError("));
  src(/forgetSocket\(ws\)/.test(closeBody), "webSocketClose prunes per-socket throttle state");
  src(/this\.lastChatAt\.delete\(/.test(worker), "lastChatAt entries are deleted (F090)");
  src((worker.match(/if \(!this\.allowMatchCreate\(ws, session\)\) return;/g) ?? []).length === 2, "friend games and bot games both go through the create limit (F067)");
  src(/this\.createLimiter\.take\(session, /.test(worker), "allowMatchCreate delegates to MatchCreateLimiter, which decides who spends the address bucket");
  src(/attachment\.addr = fnv1a\(/.test(worker), "the address key is an FNV-1a digest, not the raw address string");
  src(/SEAT_SUPERSEDED_CLOSE/.test(worker.slice(worker.indexOf("private async attachSession("))), "a superseded seat is closed with SEAT_SUPERSEDED_CLOSE (F082)");

  if (failures) {
    console.log(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\nall socket guard checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
