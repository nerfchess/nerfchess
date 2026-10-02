// Does a transient D1 failure at game end lose the game record for good?
/* eslint-disable @typescript-eslint/no-explicit-any */
import { FakeStorage, makeCtx, loadWorker, connect, msg, advance } from "./fakeRuntime";
import { fakeD1 } from "./fakeD1";
const mod = loadWorker();
async function main() {
  const log: string[] = [];
  const base: any = fakeD1(log);
  let failing = false;
  const flaky: any = {
    ...base,
    prepare: (sql: string) => {
      const s = base.prepare(sql);
      const wrap = (fn: any) => async (...a: any[]) => {
        if (failing) throw new Error("D1_ERROR: simulated blip");
        return fn(...a);
      };
      const out: any = { ...s, first: wrap(s.first), all: wrap(s.all), run: wrap(s.run) };
      out.bind = (..._x: any[]) => out;
      return out;
    },
    batch: async (stmts: any[]) => {
      if (failing) throw new Error("D1_ERROR: simulated blip");
      return base.batch(stmts);
    },
    exec: async (q: string) => {
      if (failing) throw new Error("D1_ERROR: simulated blip");
      return base.exec(q);
    },
  };
  const gs = new mod.GameServer(makeCtx(new FakeStorage()), { DB: flaky });
  const a = connect(gs, { userId: "r1", username: "r1name" }, "A");
  await msg(gs, a, "create", { timeSec: 300, rated: true });
  const id = a.last("created").d.id;
  const b = connect(gs, { userId: "r2", username: "r2name" }, "B");
  await msg(gs, b, "join", { id });
  await msg(gs, a, "move", { u: "e2e4", ply: 0 });
  await msg(gs, b, "move", { u: "e7e5", ply: 1 });
  failing = true;
  const before = log.length;
  await msg(gs, a, "resign");
  const m = await (gs as any).loadMatch(id);
  console.log("after resign during D1 blip: result=", JSON.stringify(m.result), "recorded flag=", m.recorded, "D1 statements that succeeded during end:", log.length - before);
  failing = false;
  // Anything retry? Run the alarm a few times over the retention window.
  const logBefore = log.length;
  for (let i = 0; i < 4; i++) { advance(70_000); await gs.alarm(); }
  const inserted = log.slice(logBefore).filter((q) => /INSERT|UPDATE/i.test(q));
  const m2 = await (gs as any).loadMatch(id);
  console.log("after D1 recovers and ~5 min of alarms: match still stored=", !!m2, "write statements issued=", inserted.length, inserted.slice(0, 5));
}
main().catch((e) => { console.error(e); process.exit(1); });
