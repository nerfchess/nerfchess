// verify: recover opp nerf options from own nerfSeed
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
const W = fakeWs("white"); const B = fakeWs("black");
const msg = (ws: any, t: string, d?: unknown) => server.webSocketMessage(ws, JSON.stringify(d === undefined ? { t } : { t, d }));
function h(s0: number) {
  let s = (s0 + 0x6d2b79f5) >>> 0;
  let t = s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 ** 31);
}
async function main() {
  await msg(W, "create", { timeSec: 300, incrementSec: 2, draft: true, mode: "nerf" });
  const id = W.frames.find((f) => f.t === "created")!.d.id;
  const m: any = store.get(`match:${id}`); m.picksVisible = false; store.set(`match:${id}`, m);
  await msg(B, "join", { id });
  const start = W.frames.filter((f) => f.t === "start").at(-1)!.d;
  const nerfSeed = start.nerfSeed;
  const t0 = Date.now();
  const cands: number[] = [];
  for (let s = 0; s < 2 ** 31; s++) if (h(s) === nerfSeed) cands.push(s);
  // RNG(seed) treats 0 as 1; include
  const derived = cands.map((c) => server.dealNerfDraftOptions({ setup: { seed: c } } as any));
  const real: any = store.get(`match:${id}`);
  console.log(JSON.stringify({ nerfSeed, cands, ms: Date.now() - t0, realMaster: real.setup.seed,
    derivedB: derived.map((d: any) => d.b), realB: real.nerfOptions.b,
    match: derived.some((d: any) => JSON.stringify(d.b) === JSON.stringify(real.nerfOptions.b)) }));
}
main().catch((e) => { console.error(e); process.exit(1); });
