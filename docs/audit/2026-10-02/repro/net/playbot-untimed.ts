/* eslint-disable @typescript-eslint/no-explicit-any */
import { FakeStorage, makeCtx, loadWorker, connect, msg } from "./fakeRuntime";
import { fakeD1 } from "./fakeD1";
const mod = loadWorker();
(async () => {
  const gs = new mod.GameServer(makeCtx(new FakeStorage()), { DB: fakeD1() });
  const u = connect(gs, { userId: "pb1", username: "pb1name" }, "U");
  await msg(gs, u, "playbot", { difficulty: "hard", mode: "buff", timeSec: 0, incrementSec: 0, color: "w" });
  const frames = u.take().map((f: any) => f.t + (f.d?.code ? ":" + f.d.code : ""));
  const p = u.last("paired")?.d;
  const m = p ? await gs.loadMatch(p.id) : null;
  console.log("frames:", frames.join(","), "match rated=", m?.rated, "timeSec=", m?.setup?.timeSec, "bots=", JSON.stringify(m?.bots));
  const u2 = connect(gs, { userId: "pb2", username: "pb2name" }, "U2");
  // targeted house seek with a prototype-key pool
  await msg(gs, u2, "queue", { pool: "toString", mode: "buff", target: { userId: "hp_x" } });
  console.log("targeted toString pool frames:", u2.take().map((f: any) => f.t + (f.d?.code ? ":" + f.d.code : "")).join(","));
})().catch((e) => { console.error(e); process.exit(1); });
