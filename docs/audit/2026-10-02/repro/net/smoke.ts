import { FakeStorage, makeCtx, loadWorker, connect, msg } from "./fakeRuntime";
async function main() {
  const t0 = Date.now();
  const mod = loadWorker();
  console.log("loaded worker in", Date.now() - t0, "ms; exports:", Object.keys(mod));
  const storage = new FakeStorage();
  const gs = new mod.GameServer(makeCtx(storage), {});
  const a = connect(gs, {}, "A");
  await msg(gs, a, "create", { timeSec: 300, incrementSec: 0 });
  console.log(a.sent);
  const id = a.last("created").d.id;
  const b = connect(gs, {}, "B");
  await msg(gs, b, "join", { id });
  console.log(b.sent.map((f: any) => f.t));
  await msg(gs, a, "move", { u: "e2e4", ply: 0 });
  console.log("A got", a.sent.slice(-2).map((f: any) => JSON.stringify(f).slice(0, 150)));
}
main().catch((e) => { console.error("FAILED", e); process.exit(1); });
