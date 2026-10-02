// Second batch of DO behaviour probes (see net-audit.ts for the harness).
/* eslint-disable @typescript-eslint/no-explicit-any */
import { FakeStorage, FakeWS, makeCtx, loadWorker, connect, msg, drop, advance } from "./fakeRuntime";
import { fakeD1 } from "./fakeD1";

const mod = loadWorker();
let fails = 0;
function report(name: string, ok: boolean, detail = "") {
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -- " + detail : ""}`);
}
const errCodes = (ws: FakeWS) => ws.take("error").map((f) => f.d?.code);
const types = (ws: FakeWS) => ws.take().map((f) => f.t + (f.d?.code ? ":" + f.d.code : "")).join(",");

async function pairViaQueue(gs: any, pool = "3+2", mode = "buff", u1 = "u1", u2 = "u2") {
  const q1 = connect(gs, { userId: u1, username: u1 + "name" }, "Q" + u1);
  const q2 = connect(gs, { userId: u2, username: u2 + "name" }, "Q" + u2);
  await msg(gs, q1, "queue", { pool, mode });
  await msg(gs, q2, "queue", { pool, mode });
  const p1 = q1.last("paired")?.d;
  const p2 = q2.last("paired")?.d;
  return { q1, q2, p1, p2 };
}

async function queueWhilePlaying() {
  const { gs } = { gs: new mod.GameServer(makeCtx(new FakeStorage()), { DB: fakeD1() }) };
  const { p1, p2 } = await pairViaQueue(gs);
  // Both arrive and start the game.
  const g1 = connect(gs, { userId: "u1", username: "u1name" }, "G1");
  const g2 = connect(gs, { userId: "u2", username: "u2name" }, "G2");
  await msg(gs, g1, "reconnect", { id: p1.id, color: p1.color, token: p1.token });
  await msg(gs, g2, "reconnect", { id: p2.id, color: p2.color, token: p2.token });
  const started = !!g1.last("start");
  // u1 opens a second tab and quick-pairs again while the first game is live.
  const t2 = connect(gs, { userId: "u1", username: "u1name" }, "T2");
  const other = connect(gs, { userId: "u3", username: "u3name" }, "O3");
  await msg(gs, other, "queue", { pool: "1+0", mode: "nerf" });
  await msg(gs, t2, "queue", { pool: "1+0", mode: "nerf" });
  const paired2 = t2.last("paired")?.d;
  report(
    "account already in a live rated game can be paired into a second rated game",
    started && !!paired2,
    `first started=${started}; second pairing=${JSON.stringify(paired2 ?? null)}; t2=${types(t2)}`,
  );
}

async function noShow() {
  const gs = new mod.GameServer(makeCtx(new FakeStorage()), { DB: fakeD1() });
  const { p1 } = await pairViaQueue(gs, "5+0", "buff", "n1", "n2");
  const g1 = connect(gs, { userId: "n1", username: "n1name" }, "G1");
  await msg(gs, g1, "reconnect", { id: p1.id, color: p1.color, token: p1.token });
  const waitingFrames = types(g1);
  g1.clear();
  await msg(gs, g1, "abort");
  const abortErr = errCodes(g1);
  g1.clear();
  await msg(gs, g1, "claimWin");
  const claimErr = errCodes(g1);
  advance(10 * 60_000);
  await gs.alarm();
  const m = await (gs as any).loadMatch(p1.id);
  report(
    "paired opponent never arrives: arrived player has a way out (abort/claim)",
    !abortErr.length || !claimErr.length,
    `arrival frames=${waitingFrames}; abort -> ${JSON.stringify(abortErr)}; claimWin -> ${JSON.stringify(claimErr)}; after 10 min match exists=${!!m} result=${JSON.stringify(m?.result ?? null)}`,
  );
}

async function firstMoveNoShow() {
  // Both arrive, game starts, white never moves.
  const gs = new mod.GameServer(makeCtx(new FakeStorage()), { DB: fakeD1() });
  const { p1, p2 } = await pairViaQueue(gs, "3+2", "buff", "f1", "f2");
  const g1 = connect(gs, { userId: "f1", username: "f1name" }, "G1");
  const g2 = connect(gs, { userId: "f2", username: "f2name" }, "G2");
  await msg(gs, g1, "reconnect", { id: p1.id, color: p1.color, token: p1.token });
  await msg(gs, g2, "reconnect", { id: p2.id, color: p2.color, token: p2.token });
  const m0 = await (gs as any).loadMatch(p1.id);
  // resolve opener drafts quickly if any (buff mode deals openers)
  for (const [ws] of [[g1], [g2]] as [FakeWS][]) {
    await msg(gs, ws, "dtPick", { index: 0 });
  }
  const whiteWs = p1.color === "w" ? g1 : g2;
  const blackWs = p1.color === "w" ? g2 : g1;
  await drop(gs, whiteWs); // white walks away before the first move
  advance(60_000);
  await gs.alarm();
  blackWs.clear();
  await msg(gs, blackWs, "claimWin");
  const m1 = await (gs as any).loadMatch(p1.id);
  report(
    "white leaves before the first move of a rated game: black can claim/abort within ~1 min",
    !!m1?.result,
    `rated=${m0.rated} claim -> ${JSON.stringify(errCodes(blackWs))} result=${JSON.stringify(m1?.result ?? null)}`,
  );
  advance(4 * 60_000);
  await gs.alarm();
  const m2 = await (gs as any).loadMatch(p1.id);
  report("informational: what ends it eventually", true, `after +5 min: ${JSON.stringify(m2?.result ?? null)}`);
}

async function draftFuzz() {
  const gs = new mod.GameServer(makeCtx(new FakeStorage()), {});
  const a = connect(gs, {}, "A");
  await msg(gs, a, "create", { timeSec: 600, incrementSec: 0, draft: true, mode: "buff" });
  const id = a.last("created").d.id;
  const b = connect(gs, {}, "B");
  await msg(gs, b, "join", { id });
  const payloads: unknown[] = [
    undefined, null, 7, "s", [], {}, { index: 99 }, { index: -1 }, { index: "1" }, { index: 0.5 },
    { buffIndex: 0 }, { buffIndex: 0, picks: [] }, { buffIndex: 0, picks: [{}] }, { buffIndex: 0, picks: [{ square: 64 }] },
    { buffIndex: 0, picks: [{ square: -1 }] }, { buffIndex: 0, picks: [{ buffIndex: 99 }] },
    { buffIndex: 99, picks: [{ square: 1 }] }, { buffIndex: 0, picks: Array.from({ length: 32 }, (_, i) => ({ square: i })) },
  ];
  let threw = 0;
  const notes: string[] = [];
  for (let round = 0; round < 3; round++) {
    for (const t of ["dtPick", "dtBank", "dtReroll", "dtUse", "dtTarget", "dtNerfPick", "reveal", "move"]) {
      for (const d of payloads) {
        for (const ws of [a, b]) {
          (gs as any).frameBudgets.delete(ws);
          try {
            await msg(gs, ws, t, d);
          } catch (err: any) {
            threw++;
            if (notes.length < 5) notes.push(`${t} ${JSON.stringify(d)}: ${err?.message}`);
          }
        }
      }
    }
  }
  const m = await (gs as any).loadMatch(id);
  report("draft-game fuzz: no handler throws", threw === 0, `threw=${threw} ${notes.join(" | ")}; result=${JSON.stringify(m.result)} moves=${m.moves.length} actions=${(m.draftActions ?? []).length}`);
}

async function offerSpam() {
  const gs = new mod.GameServer(makeCtx(new FakeStorage()), {});
  const a = connect(gs, {}, "A");
  await msg(gs, a, "create", { timeSec: 300 });
  const id = a.last("created").d.id;
  const b = connect(gs, {}, "B");
  await msg(gs, b, "join", { id });
  await msg(gs, a, "move", { u: "e2e4", ply: 0 });
  await msg(gs, b, "move", { u: "e7e5", ply: 1 });
  b.clear();
  for (let i = 0; i < 20; i++) {
    await msg(gs, a, "takebackOffer");
    await msg(gs, b, "takebackDecline");
  }
  report("takeback offer/decline loop: offers per 40 frames reaching the opponent", true, `${b.take("takebackOffer").length} takebackOffer frames in 20 rounds (no cooldown)`);
  await msg(gs, a, "resign");
  b.clear();
  for (let i = 0; i < 20; i++) {
    (gs as any).frameBudgets.delete(a);
    await msg(gs, a, "rematch");
    await msg(gs, a, "rematchCancel");
  }
  report("rematch offer/cancel loop", true, `${b.take("rematchOffer").length} rematchOffer frames delivered to the opponent in 20 rounds`);
}

async function manySockets() {
  // One client address, many anonymous sockets: is there any cap?
  const gs = new mod.GameServer(makeCtx(new FakeStorage()), {});
  const host = await (async () => {
    const a = connect(gs, {}, "A");
    await msg(gs, a, "create", { timeSec: 300 });
    const id = a.last("created").d.id;
    const b = connect(gs, {}, "B");
    await msg(gs, b, "join", { id });
    return { id };
  })();
  const socks: FakeWS[] = [];
  for (let i = 0; i < 50; i++) {
    const s = connect(gs, { addr: "same-addr" }, "S" + i);
    await msg(gs, s, "watch", { id: host.id });
    socks.push(s);
  }
  const storage = (gs as any).ctx.storage;
  const putsBefore = storage.ops.put;
  const t = performance.now();
  for (let i = 0; i < 50; i++) for (const s of socks) await msg(gs, s, "schat", { text: "spam " + i });
  advance(600);
  for (const s of socks) await msg(gs, s, "schat", { text: "spam again" });
  report(
    "50 anonymous spectator sockets from one address all accepted and can each post spectator chat",
    true,
    `storage puts from chat=${storage.ops.put - putsBefore}; handler time=${Math.round(performance.now() - t)}ms (each delivered schat rewrites the match record)`,
  );
}

async function main() {
  for (const fn of [queueWhilePlaying, noShow, firstMoveNoShow, draftFuzz, offerSpam, manySockets]) {
    console.log(`\n=== ${fn.name}`);
    try {
      await fn();
    } catch (err: any) {
      report(`${fn.name} crashed`, false, String(err?.stack ?? err).slice(0, 800));
    }
  }
  console.log(`\n${fails} failed`);
}
main();
