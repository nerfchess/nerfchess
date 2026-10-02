// Behavioural audit of the GameServer Durable Object (worker.ts) under a fake
// runtime. Run from the repo root so tsx picks up tsconfig path aliases:
//   cd . && ./node_modules/.bin/tsx <scratch>/net-audit.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { FakeStorage, FakeWS, makeCtx, loadWorker, connect, msg, raw, drop, advance } from "./fakeRuntime";
import { fakeD1 } from "./fakeD1";

const mod = loadWorker();
const results: { name: string; ok: boolean; detail: string }[] = [];
function report(name: string, ok: boolean, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
}
function errCodes(ws: FakeWS) {
  return ws.take("error").map((f) => f.d?.code);
}

function newServer(env: any = {}, storage = new FakeStorage(), sockets: FakeWS[] = []) {
  const gs = new mod.GameServer(makeCtx(storage, sockets), env);
  return { gs, storage };
}

async function startClassic(gs: any, timeSec = 300, incrementSec = 0) {
  const a = connect(gs, {}, "A");
  await msg(gs, a, "create", { timeSec, incrementSec });
  const created = a.last("created").d;
  const b = connect(gs, {}, "B");
  await msg(gs, b, "join", { id: created.id });
  const bStart = b.last("start")?.d;
  return { a, b, id: created.id, aTok: created.token, bTok: bStart?.token };
}

// ---------------------------------------------------------------------------
async function fuzzGarbage() {
  const { gs } = newServer();
  const { a, b, id } = await startClassic(gs);
  const types = [
    "create", "join", "reconnect", "move", "resign", "abort", "claimWin", "claimDraw", "drawOffer",
    "drawAccept", "drawDecline", "takebackOffer", "takebackAccept", "takebackDecline", "queue", "playbot",
    "queueCancel", "watch", "watchLeave", "lobby", "rematch", "rematchCancel", "chat", "schat", "reveal",
    "dtPick", "dtBank", "dtReroll", "dtUse", "dtTarget", "dtNerfPick", "adjustOppClock", "adminGrant",
    "seeOppBuffs", "godRerolls", "p", "hb", "__proto__", "constructor", "toString", "nonsense",
  ];
  const payloads: unknown[] = [
    undefined, null, 0, -1, 1e308, "", "x".repeat(3000), true, [], [1, 2, 3], {},
    { id: 123 }, { id: {} }, { id: null }, { id: "__proto__" }, { id: "constructor" },
    { u: 5 }, { u: "e2e4", ply: "0" }, { u: "e2e4", ply: -1 }, { u: "e2e4", ply: 1e20 }, { u: "zz99" }, { u: "e2e4".repeat(500) },
    { index: "0" }, { index: 1e9 }, { index: -1 }, { index: null },
    { buffIndex: -1, picks: "x" }, { buffIndex: 0, picks: [null, 1, "a", { square: 1e9 }] },
    { buffIndex: 0, picks: Array.from({ length: 33 }, () => ({ square: 1 })) },
    { text: 123 }, { text: {} }, { text: "a".repeat(2500) }, { text: "‮​gg" },
    { pool: {} }, { pool: "__proto__" }, { pool: "constructor" }, { mode: {} }, { target: { userId: {} } },
    { delta: "x" }, { delta: 1e9 }, { on: "yes" }, { timeSec: 1e9 }, { timeSec: -5 }, { timeSec: 1.5 },
    { difficulty: "insane", color: "x" }, { color: "x", token: {} }, { id: "AAAAA", color: "w", token: null },
    { __proto__: { polluted: 1 } }, JSON.parse('{"__proto__":{"polluted":1}}'),
  ];
  let threw = 0;
  const throws: string[] = [];
  let frames = 0;
  // Use a third, unseated socket for most of the fuzz so the seated sockets'
  // frame budget is not exhausted, then a seated one for seat-scoped handlers.
  for (const sock of [connect(gs, {}, "Z"), a]) {
    for (const t of types) {
      for (const d of payloads) {
        if (sock === a && (t === "resign" || t === "abort" || t === "claimWin" || t === "claimDraw" || t === "drawOffer")) continue;
        frames++;
        // Refill the frame bucket so the guard does not mask handler behaviour.
        (gs as any).frameBudgets.delete(sock);
        try {
          await msg(gs, sock, t, d);
        } catch (err: any) {
          threw++;
          if (throws.length < 10) throws.push(`${t} ${JSON.stringify(d)?.slice(0, 60)}: ${String(err?.message ?? err).slice(0, 120)}`);
        }
      }
    }
  }
  // Raw non-frame inputs.
  const raws: (string | ArrayBuffer)[] = [
    "", "null", "5", '"str"', "[]", "[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]", '{"t":5}', '{"t":""}',
    `{"t":"${"x".repeat(40)}"}`, "{", "\u0000", "é".repeat(4000), "x".repeat(9000), "[".repeat(8000),
    new TextEncoder().encode('{"t":"p"}').buffer, new Uint8Array([0xff, 0xfe, 0xfd]).buffer,
    new Uint8Array(9000).buffer,
  ];
  const z = connect(gs, {}, "Z2");
  for (const r of raws) {
    frames++;
    (gs as any).frameBudgets.delete(z);
    try {
      await raw(gs, z, r);
    } catch (err: any) {
      threw++;
      if (throws.length < 10) throws.push(`raw ${String(r).slice(0, 30)}: ${String(err?.message ?? err).slice(0, 120)}`);
    }
  }
  report(
    "fuzz: no handler throws on garbage input",
    threw === 0,
    `${frames} frames, ${threw} threw${throws.length ? "; " + throws.join(" | ") : ""}`,
  );
  report("fuzz: Object.prototype not polluted", ({} as any).polluted === undefined);
  // The room must still work afterwards.
  (gs as any).frameBudgets.clear();
  const match = await (gs as any).loadMatch(id);
  const ply = match.moves.length;
  const turnWs = ply % 2 === 0 ? a : b;
  const legal = ply % 2 === 0 ? (ply === 0 ? "e2e4" : null) : "e7e5";
  a.clear();
  b.clear();
  if (!match.result && legal) {
    await msg(gs, turnWs, "move", { u: legal, ply });
    const ok = !!a.last("move") && !!b.last("move");
    report("fuzz: room still accepts a legal move afterwards", ok, `result=${JSON.stringify(match.result)} ply=${ply}`);
  } else {
    report("fuzz: room still alive afterwards", !match.result, `result=${JSON.stringify(match.result)} moves=${match.moves.join(" ")}`);
  }
  // Did garbage end the game or alter it?
  const after = await (gs as any).loadMatch(id);
  report("fuzz: garbage did not change the game result", !after.result, JSON.stringify(after.result));
  // Unknown type reply.
  const u = connect(gs, {}, "U");
  await msg(gs, u, "nonsense");
  report("unknown type answered with unknown_message", errCodes(u).includes("unknown_message"), JSON.stringify(errCodes(u)));
  await raw(gs, u, "x".repeat(9000));
  report("9000-byte frame rejected frame_too_large", errCodes(u).includes("frame_too_large"));
}

// ---------------------------------------------------------------------------
async function duplicateAndOrder() {
  const { gs } = newServer();
  const { a, b, id } = await startClassic(gs);
  await msg(gs, a, "move", { u: "e2e4", ply: 0 });
  a.clear();
  await msg(gs, a, "move", { u: "e2e4", ply: 0 });
  const m1 = await (gs as any).loadMatch(id);
  report("duplicate move (same ply) rejected, applied once", m1.moves.length === 1 && errCodes(a).includes("stale_ply"), `moves=${m1.moves} errs=${errCodes(a)}`);
  a.clear();
  await msg(gs, a, "move", { u: "e2e4" });
  const m2 = await (gs as any).loadMatch(id);
  report("duplicate move (no ply) rejected, applied once", m2.moves.length === 1, `moves=${m2.moves} errs=${errCodes(a)}`);
  // A future ply from the right seat
  b.clear();
  await msg(gs, b, "move", { u: "e7e5", ply: 5 });
  const m3 = await (gs as any).loadMatch(id);
  report("out-of-order ply (ahead) rejected", m3.moves.length === 1 && errCodes(b).includes("stale_ply"), `errs=${errCodes(b)}`);
  // Non-integer ply silently bypasses the ply guard
  b.clear();
  await msg(gs, b, "move", { u: "e7e5", ply: "7" });
  const m4 = await (gs as any).loadMatch(id);
  report(
    "non-integer ply is ignored (guard skipped, move judged on position only)",
    true,
    `string ply "7" -> moves=${m4.moves.join(" ")} errs=${errCodes(b)} (informational)`,
  );
  // Out-of-turn
  a.clear();
  await msg(gs, a, "move", { u: "d2d4", ply: m4.moves.length });
  report("out-of-turn move rejected", errCodes(a).some((c: string) => c === "not_your_turn" || c === "illegal_move"), JSON.stringify(errCodes(a)));
}

// ---------------------------------------------------------------------------
async function twoTabs() {
  const { gs } = newServer();
  const { a, b, id, aTok } = await startClassic(gs);
  const a2 = connect(gs, {}, "A2");
  await msg(gs, a2, "reconnect", { id, color: "w", token: aTok });
  report("second tab on the same seat gets start", !!a2.last("start"));
  report("first tab closed with 4001 (seat superseded)", a.closed?.code === 4001, JSON.stringify(a.closed));
  // Old tab's late frame must not act on the seat
  (a as any).readyState = 1; // pretend the close has not landed yet
  a.clear();
  await msg(gs, a, "move", { u: "e2e4", ply: 0 });
  const m = await (gs as any).loadMatch(id);
  report("frame from the superseded socket cannot move", m.moves.length === 0, `moves=${m.moves} errs=${errCodes(a)}`);
  void b;
}

// ---------------------------------------------------------------------------
async function abandonmentAndClaim() {
  const { gs } = newServer();
  const { a, b, id } = await startClassic(gs, 600, 0);
  await msg(gs, a, "move", { u: "e2e4", ply: 0 });
  await msg(gs, b, "move", { u: "e7e5", ply: 1 });
  await drop(gs, b);
  a.clear();
  await msg(gs, a, "claimWin");
  report("claim refused immediately after a drop", errCodes(a).includes("no_claim"));
  advance(16_000);
  await gs.alarm();
  report("opponentGone sent after ~15s grace", !!a.last("opponentGone"), JSON.stringify(a.take().map((f) => f.t)));
  advance(15_000);
  a.clear();
  await msg(gs, a, "claimWin");
  const m = await (gs as any).loadMatch(id);
  report("claimWin after 30s ends the game for the claimer", m?.result?.winner === "w" && m?.result?.reason === "abandonment", JSON.stringify(m?.result));
}

// ---------------------------------------------------------------------------
async function restartMidGame() {
  // Isolate 1
  const storage = new FakeStorage();
  const { gs } = newServer({}, storage);
  const { a, b, id, aTok, bTok } = await startClassic(gs, 0, 0); // untimed
  await msg(gs, a, "move", { u: "e2e4", ply: 0 });
  await msg(gs, b, "move", { u: "e7e5", ply: 1 });
  // Deploy / eviction: the runtime drops every socket; the old isolate's
  // webSocketClose never runs, the new one starts with no sockets.
  const gs2 = new mod.GameServer(makeCtx(storage, []), {});
  const a2 = connect(gs2, {}, "A-after");
  await msg(gs2, a2, "reconnect", { id, color: "w", token: aTok });
  const start = a2.last("start")?.d;
  report("after restart: reconnect restores the game", !!start && Array.isArray(start.moves) && start.moves.length === 2, `moves=${start?.moves}`);
  await msg(gs2, a2, "move", { u: "g1f3", ply: 2 });
  const m = await (gs2 as any).loadMatch(id);
  report("after restart: play continues", m.moves.length === 3, `moves=${m.moves}`);
  // Black never returns.
  advance(60_000);
  await gs2.alarm();
  report(
    "after restart: opponentGone ever sent for a seat that vanished with the old isolate",
    !!a2.last("opponentGone"),
    `disconnectedAt=${JSON.stringify(m.disconnectedAt)} frames=${a2.take().map((f) => f.t).join(",")}`,
  );
  a2.clear();
  await msg(gs2, a2, "claimWin");
  const m2 = await (gs2 as any).loadMatch(id);
  report(
    "after restart: remaining player can claim the win after 60s",
    m2?.result?.reason === "abandonment",
    `errs=${errCodes(a2)} result=${JSON.stringify(m2?.result)}`,
  );
  // Does the dead game ever get GC'd? Leave A connected: no. Drop A: then
  // disconnectedAt.w is stamped and the 30 minute expiry applies.
  advance(3 * 60 * 60 * 1000);
  await gs2.alarm();
  const m3 = await (gs2 as any).loadMatch(id);
  report("after restart, 3h later with player still connected: game still live (stuck)", !!m3 && !m3.result, `exists=${!!m3} result=${JSON.stringify(m3?.result)}`);
  void bTok;
}

// Timed version: how long must the survivor wait?
async function restartTimed() {
  const storage = new FakeStorage();
  const { gs } = newServer({}, storage);
  const { a, b, id, aTok } = await startClassic(gs, 1800, 0); // 30+0
  await msg(gs, a, "move", { u: "e2e4", ply: 0 });
  await msg(gs, b, "move", { u: "e7e5", ply: 1 });
  await msg(gs, a, "move", { u: "g1f3", ply: 2 });
  const gs2 = new mod.GameServer(makeCtx(storage, []), {});
  const a2 = connect(gs2, {}, "A-after");
  await msg(gs2, a2, "reconnect", { id, color: "w", token: aTok });
  advance(5 * 60_000);
  await gs2.alarm();
  a2.clear();
  await msg(gs2, a2, "claimWin");
  report("timed 30+0, 5 min after restart with black gone: claim possible", !errCodes(a2).includes("no_claim"), `errs=${errCodes(a2)}`);
}

// ---------------------------------------------------------------------------
async function rematch() {
  const { gs } = newServer();
  const { a, b, id } = await startClassic(gs);
  await msg(gs, a, "resign");
  await msg(gs, a, "rematch");
  report("rematch offer reaches opponent", !!b.last("rematchOffer"));
  await msg(gs, b, "rematch");
  const ra = a.last("rematched")?.d;
  const rb = b.last("rematched")?.d;
  report("rematch: both get rematched frame with swapped colours", ra?.color === "b" && rb?.color === "w" && ra?.id === rb?.id, JSON.stringify({ ra, rb }));
  // double tap
  a.clear();
  await msg(gs, a, "rematch");
  report("rematch: double tap after start is refused", errCodes(a).includes("rematch_done"), JSON.stringify(errCodes(a)));
  void id;
}

// ---------------------------------------------------------------------------
async function spectate() {
  const { gs } = newServer();
  const { a, b, id } = await startClassic(gs);
  const w = connect(gs, {}, "W");
  await msg(gs, w, "watch", { id });
  const ws = w.last("wstart")?.d;
  report("spectator gets wstart", !!ws, ws ? Object.keys(ws).join(",") : "");
  const leaks = ws ? JSON.stringify(ws) : "";
  report("wstart carries no seat tokens", !leaks.includes(a.last("created")?.d?.token ?? "@@") && !/"token"/.test(leaks));
  report("wstart carries no nerf ids before the end", !(ws?.nerfs) , JSON.stringify(ws?.nerfs ?? null));
  await msg(gs, a, "move", { u: "e2e4", ply: 0 });
  const mv = w.last("move");
  report("spectator receives moves with a seq envelope", !!mv && typeof mv.e?.seq === "number", JSON.stringify(mv?.e ?? null));
  void b;
}

// ---------------------------------------------------------------------------
async function chatAndFlood() {
  const { gs } = newServer();
  const { a, b } = await startClassic(gs);
  await msg(gs, a, "chat", { text: "hi" });
  await msg(gs, a, "chat", { text: "hi again" });
  const got = b.take("chat").length;
  report("chat throttled to one per 500ms per socket", got === 1, `opponent got ${got} of 2`);
  // Per-account bypass: same account, many sockets? (anonymous here: spectator sockets)
  // Flood
  const f = connect(gs, {}, "F");
  let n = 0;
  for (let i = 0; i < 400 && !f.closed; i++) {
    n++;
    await msg(gs, f, "lobby");
  }
  report("flooding socket closed with 1008", f.closed?.code === 1008, `closed after ${n} frames: ${JSON.stringify(f.closed)}; rate_limited errors=${errCodes(f).filter((c: string) => c === "rate_limited").length}`);
}

// ---------------------------------------------------------------------------
async function cleanup() {
  const storage = new FakeStorage();
  const { gs } = newServer({}, storage);
  // 10 unstarted, 10 finished, 10 abandoned-started
  const ids: Record<string, string[]> = { unstarted: [], finished: [], abandoned: [] };
  for (let i = 0; i < 10; i++) {
    const h = connect(gs, {}, "H");
    await msg(gs, h, "create", { timeSec: 300 });
    ids.unstarted.push(h.last("created").d.id);
    await drop(gs, h);
  }
  for (let i = 0; i < 10; i++) {
    const g = await startClassic(gs);
    await msg(gs, g.a, "resign");
    ids.finished.push(g.id);
    await drop(gs, g.a);
    await drop(gs, g.b);
  }
  for (let i = 0; i < 10; i++) {
    const g = await startClassic(gs, 0, 0);
    await msg(gs, g.a, "move", { u: "e2e4", ply: 0 });
    ids.abandoned.push(g.id);
    await drop(gs, g.a);
    await drop(gs, g.b);
  }
  const countKeys = () => [...storage.map.keys()].filter((k) => k.startsWith("match:")).length;
  const before = countKeys();
  advance(6 * 60_000);
  for (let i = 0; i < 5; i++) await gs.alarm();
  const after6 = countKeys();
  advance(31 * 60_000);
  for (let i = 0; i < 5; i++) await gs.alarm();
  const after37 = countKeys();
  report("finished games GC'd after 5 min retention", after6 <= before - 10, `match keys before=${before} +6min=${after6} +37min=${after37}`);
  report("unstarted and abandoned games GC'd after 30 min", after37 === 0, `remaining=${after37}; other keys=${[...storage.map.keys()].filter((k) => !k.startsWith("match:")).join(",")}`);
  report("alarm left armed only if needed", true, `alarm=${storage.alarm ? new Date(storage.alarm).toISOString() : null}`);
}

// ---------------------------------------------------------------------------
async function queueWithDb() {
  const { gs } = newServer({ DB: fakeD1() });
  const u1 = connect(gs, { userId: "u1", username: "alice" }, "Q1");
  const u2 = connect(gs, { userId: "u2", username: "bob" }, "Q2");
  await msg(gs, u1, "queue", { pool: "constructor", mode: "nerf" });
  report("queue: prototype key 'constructor' accepted as a pool (should be bad_pool)", !errCodes(u1).includes("bad_pool"), `frames=${u1.take().map((f) => f.t + (f.d?.code ? ":" + f.d.code : "")).join(",")}`);
  await msg(gs, u2, "queue", { pool: "constructor", mode: "nerf" });
  const p = u2.last("paired")?.d;
  if (p) {
    const m = await (gs as any).loadMatch(p.id);
    report("queue: 'constructor' pool pairs a RATED game with no time control", true, `rated=${m.rated} timeSec=${m.setup.timeSec} clocks=${JSON.stringify(m.clocks)}`);
  } else {
    report("queue: 'constructor' pool did not pair", true, u2.take().map((f) => f.t).join(","));
  }
  // Queue cancel: instant?
  const u3 = connect(gs, { userId: "u3", username: "carol" }, "Q3");
  await msg(gs, u3, "queue", { pool: "3+2", mode: "buff" });
  await msg(gs, u3, "queueCancel");
  const u4 = connect(gs, { userId: "u4", username: "dave" }, "Q4");
  await msg(gs, u4, "queue", { pool: "3+2", mode: "buff" });
  report("queueCancel: cancelled player is not paired afterwards", !u3.last("paired") && !!u3.last("queueCancelled") && !u4.last("paired"), `u3=${u3.take().map((f) => f.t)} u4=${u4.take().map((f) => f.t)}`);
  // Rating spread: queue 1 and 2 with very different ratings? fakeD1 returns no rows so ratings are default.
  // Same account from two tabs
  const t1 = connect(gs, { userId: "u5", username: "eve" }, "T1");
  const t2 = connect(gs, { userId: "u5", username: "eve" }, "T2");
  await msg(gs, t1, "queue", { pool: "5+0", mode: "buff" });
  await msg(gs, t2, "queue", { pool: "5+0", mode: "buff" });
  report("queue: same account in two tabs does not pair with itself", !t1.last("paired") && !t2.last("paired"), `t1=${t1.take().map((f) => f.t)} t2=${t2.take().map((f) => f.t)}`);
  report("queue: the first tab is told its seek was replaced", t1.take().some((f) => f.t === "queueCancelled" || (f.t === "error")), `t1=${t1.take().map((f) => f.t)}`);
}

async function main() {
  const which = process.argv[2];
  const all: Record<string, () => Promise<void>> = {
    fuzzGarbage, duplicateAndOrder, twoTabs, abandonmentAndClaim, restartMidGame, restartTimed, rematch, spectate, chatAndFlood, cleanup, queueWithDb,
  };
  for (const [name, fn] of Object.entries(all)) {
    if (which && which !== name) continue;
    console.log(`\n=== ${name}`);
    try {
      await fn();
    } catch (err: any) {
      report(`${name} crashed`, false, String(err?.stack ?? err).slice(0, 600));
    }
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length} checks, ${failed.length} failed`);
}
main();
