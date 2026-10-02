/* eslint-disable @typescript-eslint/no-explicit-any */
import { FakeStorage, makeCtx, loadWorker, connect, msg, advance } from "../net/fakeRuntime";
import { fakeD1 } from "../net/fakeD1";
const mod = loadWorker();
async function protoPool() {
  for (const pool of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
    const gs = new mod.GameServer(makeCtx(new FakeStorage()), { DB: fakeD1() });
    const a = connect(gs, { userId: "x1", username: "x1n" });
    const b = connect(gs, { userId: "x2", username: "x2n" });
    await msg(gs, a, "queue", { pool, mode: "buff" });
    await msg(gs, b, "queue", { pool, mode: "buff" });
    const p = b.last("paired")?.d;
    const m = p ? await gs.loadMatch(p.id) : null;
    console.log(`pool=${pool}: a=${a.sent.map((f: any) => f.t + (f.d?.code ? ":" + f.d.code : "")).join(",")} b=${b.sent.map((f: any) => f.t + (f.d?.code ? ":" + f.d.code : "")).join(",")} rated=${m?.rated} timeSec=${m?.setup?.timeSec} clocks=${JSON.stringify(m?.clocks ?? null)}`);
    if (p) {
      // can the game be played?
      const g1 = connect(gs, { userId: "x1", username: "x1n" });
      const g2 = connect(gs, { userId: "x2", username: "x2n" });
      const pa = a.last("paired").d;
      await msg(gs, g1, "reconnect", { id: pa.id, color: pa.color, token: pa.token });
      await msg(gs, g2, "reconnect", { id: p.id, color: p.color, token: p.token });
      const w = pa.color === "w" ? g1 : g2;
      w.clear();
      await msg(gs, w, "move", { u: "e2e4", ply: 0 });
      const m2 = await gs.loadMatch(p.id);
      console.log("   after start+move: moves=", m2.moves?.length, "result=", JSON.stringify(m2.result), "frames=", w.sent.map((f: any) => f.t + (f.d?.code ? ":" + f.d.code : "")).join(","), "clocks=", JSON.stringify(m2.clocks));
      advance(3600_000); await gs.alarm();
      const m3 = await gs.loadMatch(p.id);
      console.log("   +1h alarm: result=", JSON.stringify(m3?.result ?? null));
    }
  }
}
async function dupMove() {
  const gs = new mod.GameServer(makeCtx(new FakeStorage()), {});
  const a = connect(gs, {}, "A");
  await msg(gs, a, "create", { timeSec: 300, incrementSec: 0 });
  const id = a.last("created").d.id;
  const b = connect(gs, {}, "B");
  await msg(gs, b, "join", { id });
  const white = a.last("start")?.d?.color === "b" ? b : a;
  const black = white === a ? b : a;
  white.clear();
  await msg(gs, white, "move", { u: "e2e4", ply: 0 });
  await msg(gs, white, "move", { u: "e2e4", ply: 0 });
  console.log("dup same ply ->", white.sent.map((f: any) => f.t + (f.d?.code ? ":" + f.d.code : "")).join(","));
  await msg(gs, black, "move", { u: "e7e5", ply: 1 });
  white.clear();
  await msg(gs, white, "move", { u: "g1f3", ply: "7" });
  const m = await gs.loadMatch(id);
  console.log("string ply '7' at ply 2 ->", white.sent.map((f: any) => f.t + (f.d?.code ? ":" + f.d.code : "")).join(","), "moves=", m.moves.length);
}
(async () => { await protoPool(); await dupMove(); })().catch((e) => { console.error(e); process.exit(1); });
