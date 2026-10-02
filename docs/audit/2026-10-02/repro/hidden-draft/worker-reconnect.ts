// Drive the REAL worker.ts GameServer (Durable Object class) in Node with an
// in-memory storage + fake sockets, and record every frame each seat and a
// spectator receives. Read-only on the repo. Run from the repo root:
//   node_modules/.bin/tsx --import <scratch>/register.mjs <scratch>/worker-payloads.ts
import { GameServer } from "../../../../../worker";

type Frame = { t: string; d?: any; e?: any };
const OPEN = 1;
function fakeWs(name: string) {
  const frames: Frame[] = [];
  let att: unknown = null;
  return {
    name,
    frames,
    readyState: OPEN,
    send(s: string) {
      frames.push(JSON.parse(s));
    },
    serializeAttachment(a: unknown) {
      att = JSON.parse(JSON.stringify(a));
    },
    deserializeAttachment() {
      return att;
    },
    close() {},
  };
}
const store = new Map<string, unknown>();
let alarm: number | null = null;
const ctx = {
  getWebSockets: () => [],
  setWebSocketAutoResponse() {},
  acceptWebSocket() {},
  waitUntil() {},
  blockConcurrencyWhile: async (fn: () => Promise<unknown>) => fn(),
  storage: {
    async get(k: string | string[]) {
      if (Array.isArray(k)) return new Map(k.filter((x) => store.has(x)).map((x) => [x, structuredClone(store.get(x))]));
      return store.has(k) ? structuredClone(store.get(k)) : undefined;
    },
    async put(k: string | Record<string, unknown>, v?: unknown) {
      if (typeof k === "string") store.set(k, structuredClone(v));
      else for (const [a, b] of Object.entries(k)) store.set(a, structuredClone(b));
    },
    async delete(k: string | string[]) {
      for (const x of Array.isArray(k) ? k : [k]) store.delete(x);
      return true;
    },
    async list(opts?: { prefix?: string }) {
      return new Map([...store].filter(([k]) => !opts?.prefix || k.startsWith(opts.prefix)));
    },
    async getAlarm() {
      return alarm;
    },
    async setAlarm(t: number) {
      alarm = t;
    },
    async deleteAlarm() {
      alarm = null;
    },
  },
};
// Patch WebSocket.OPEN expectations (worker compares ws.readyState to WebSocket.OPEN)
(globalThis as any).WebSocket = { OPEN, CLOSED: 3, CONNECTING: 0, CLOSING: 2 };

const env: any = {};
const server: any = new GameServer(ctx as any, env);
const W = fakeWs("white");
const B = fakeWs("black");
const msg = (ws: any, t: string, d?: unknown) => server.webSocketMessage(ws, JSON.stringify(d === undefined ? { t } : { t, d }));

async function main() {
  const report: Record<string, unknown> = {};
  const { legalMoves } = await import("../../../../../src/engine/game");
  const { moveToUCI } = await import("../../../../../src/engine/board");
  // (1) Nerf-mode: black picks, then drops and reconnects before white picks.
  await msg(W, "create", { timeSec: 300, incrementSec: 2, draft: true, mode: "nerf" });
  const id = W.frames.find((f) => f.t === "created")!.d.id;
  const key = `match:${id}`;
  await msg(B, "join", { id });
  const bToken = B.frames.find((f) => f.t === "start")!.d.token;
  await msg(B, "dtNerfPick", { index: 1 });
  await server.webSocketClose(B, 1006, "drop", false);
  const B2 = fakeWs("black2");
  await msg(B2, "reconnect", { id, color: "b", token: bToken });
  const s = B2.frames.find((f) => f.t === "start");
  report.nerfDraft_reconnect = { gotStart: !!s, myPick: s?.d?.nerfDraft?.myPick ?? null, hasOptions: !!s?.d?.nerfDraft?.options?.b, deadline: !!s?.d?.nerfDraft?.deadline };
  await msg(W, "dtNerfPick", { index: 0 });
  const st: any = store.get(key);
  report.nerfDraft_started_after_reconnect = !!st.startedAt && st.setup.blackNerfId === st.nerfOptions.b[1];
  // (2) Mid buff offer: play to the first cadence offer, drop black, reconnect.
  for (let i = 0; i < 40; i++) {
    const cur: any = store.get(key);
    const g = server.gameFromMatch(cur);
    if (g.buffs.players.w.offer || g.buffs.players.b.offer || cur.result) break;
    const ws = g.board.turn === "w" ? W : B2;
    const lm = legalMoves(g);
    await msg(ws, "move", { u: moveToUCI(lm[0]), ply: cur.moves.length });
  }
  const cur: any = store.get(key);
  const g = server.gameFromMatch(cur);
  const serverOffer = g.buffs.players.b.offer;
  await server.webSocketClose(B2, 1006, "drop", false);
  const B3 = fakeWs("black3");
  await msg(B3, "reconnect", { id, color: "b", token: bToken });
  const s3 = B3.frames.find((f) => f.t === "start");
  report.buffOffer_reconnect = {
    plies: cur.moves.length,
    serverOffer: serverOffer?.cards?.map((c: any) => c.id) ?? null,
    reconnectOffer: s3?.d?.dtState?.players?.b?.offer?.cards?.map((c: any) => c.id) ?? null,
    deadlinePresent: s3?.d?.dtDeadline != null || s3?.d?.dtState?.deadline != null,
    dtActionsLen: s3?.d?.dtActions?.length,
  };
  // pick after reconnect works
  await msg(B3, "dtPick", { index: 0 });
  const after: any = store.get(key);
  report.pickAfterReconnect_recorded = (after.draftActions ?? []).filter((a: any) => a.color === "b" && a.a === "pick").length;
  report.b3_errors = B3.frames.filter((f) => f.t === "error").map((f) => f.d.code);
  console.log(JSON.stringify(report, null, 2));
}
main().catch((e) => { console.error("HARNESS ERROR", e); process.exit(1); });
