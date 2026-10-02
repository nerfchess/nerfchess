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
  const { GOD_PANEL_USERNAMES } = await import("../../../../../src/lib/godPanel") as any;
  const report: Record<string, unknown> = {};
  await msg(W, "create", { timeSec: 300, incrementSec: 2, draft: true, mode: "nerf" });
  const id = W.frames.find((f) => f.t === "created")!.d.id;
  const key = `match:${id}`;
  const m: any = store.get(key); m.picksVisible = false; store.set(key, m); // queue-like
  await msg(B, "join", { id });
  await msg(W, "dtNerfPick", { index: 0 });
  await msg(B, "dtNerfPick", { index: 0 });
  const st: any = store.get(key);
  report.started = !!st.startedAt;
  report.whiteNerf = st.setup.whiteNerfId;
  // Give black's (fake) socket a god-panel username so adminGrant can seat
  // Extra Glance exactly as a normal pick would (scratch harness only).
  const sess = server.session(B);
  sess.username = (GOD_PANEL_USERNAMES ?? [])[0];
  server.sessions.set(B, sess);
  const before = B.frames.length;
  await msg(B, "adminGrant", { id: "extra_glance" });
  const after = B.frames.slice(before);
  report.grantFrames = after.map((f) => f.t);
  report.grantErrors = after.filter((f) => f.t === "error").map((f) => f.d.code);
  const g = server.gameFromMatch(store.get(key));
  report.serverSaysBlackCanSeeWhiteNerf = !!g.buffs.players.b.oppNerfRevealed;
  report.blackHeld = g.buffs.players.b.buffs.map((b: any) => b.id);
  report.postGrantFramesNameWhiteNerf = JSON.stringify(after).includes(`"${st.setup.whiteNerfId}"`);
  report.anyFrameToBlackNamesWhiteNerf_inclPreStartOptions = JSON.stringify(B.frames).includes(`"${st.setup.whiteNerfId}"`);
  // A reconnect start frame for black: does `revealed` carry white's nerf?
  const B2 = fakeWs("black2");
  const tok = B.frames.find((f) => f.t === "start")!.d.token;
  await server.webSocketClose(B, 1006, "x", false);
  await msg(B2, "reconnect", { id, color: "b", token: tok });
  const s2 = B2.frames.find((f) => f.t === "start");
  report.reconnectRevealed = s2?.d?.revealed ?? null;
  report.reconnectFrameNamesWhiteNerf = JSON.stringify(B2.frames).includes(`"${st.setup.whiteNerfId}"`);
  console.log(JSON.stringify(report, null, 2));
}
main().catch((e) => { console.error("HARNESS ERROR", e); process.exit(1); });
