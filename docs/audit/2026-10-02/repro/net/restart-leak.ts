// A started game whose sockets vanish with an isolate restart (deploy, CPU
// reset): nobody returns. Is it ever cleaned up, and does it stay in the lobby?
/* eslint-disable @typescript-eslint/no-explicit-any */
import { FakeStorage, makeCtx, loadWorker, connect, msg, advance } from "./fakeRuntime";
const mod = loadWorker();
async function run(timeSec: number) {
  const storage = new FakeStorage();
  const gs = new mod.GameServer(makeCtx(storage), {});
  const a = connect(gs, {}, "A");
  await msg(gs, a, "create", { timeSec, incrementSec: 0 });
  const id = a.last("created").d.id;
  const b = connect(gs, {}, "B");
  await msg(gs, b, "join", { id });
  await msg(gs, a, "move", { u: "e2e4", ply: 0 });
  await msg(gs, b, "move", { u: "e7e5", ply: 1 });
  // Restart: new isolate, no sockets survive, no webSocketClose delivered.
  const gs2 = new mod.GameServer(makeCtx(storage, []), {});
  const lobbyBefore = await gs2.buildLobbyPayload();
  for (const hours of [1, 6, 48]) {
    advance(hours * 3600_000);
    for (let i = 0; i < 3; i++) await gs2.alarm();
  }
  const m = await gs2.loadMatch(id);
  const lobby: any = await (gs2 as any).buildLobbyPayload();
  const listed = (lobby.games ?? []).some((g: any) => g.id === id);
  console.log(`timeSec=${timeSec}: after 55h -> stored=${!!m} result=${JSON.stringify(m?.result ?? null)} inLiveIndex=${JSON.stringify(storage.map.get("live:ids"))?.includes(id)} listedInLobbyGames=${listed} (lobby games before=${(lobbyBefore as any).games?.length})`);
}
(async () => { await run(0); await run(300); })().catch((e) => { console.error(e); process.exit(1); });
