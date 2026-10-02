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
const msg = (ws: any, t: string, d?: unknown) => server.webSocketMessage(ws, JSON.stringify(d === undefined ? { t } : { t, d }));

async function main() {
  const { legalMoves } = await import("../../../../../src/engine/game");
  const { moveToUCI } = await import("../../../../../src/engine/board");
  const report: Record<string, unknown> = {};
  let leaks = 0, games = 0, specLeaks = 0, seedFrames = 0;
  for (let n = 0; n < 25; n++) {
    const w = fakeWs("w"), b = fakeWs("b"), s = fakeWs("s");
    await msg(w, "create", { timeSec: 300, incrementSec: 0 });
    const id = w.frames.find((f) => f.t === "created")!.d.id;
    const key = `match:${id}`;
    await msg(b, "join", { id });
    await msg(s, "watch", { id });
    for (let i = 0; i < 6; i++) {
      const cur: any = store.get(key);
      if (cur.result) break;
      const g = server.gameFromMatch(cur);
      const lm = legalMoves(g);
      if (!lm.length) break;
      await msg(g.board.turn === "w" ? w : b, "move", { u: moveToUCI(lm[0]), ply: cur.moves.length });
    }
    const m: any = store.get(key);
    if (m.result) continue;
    games++;
    const wn = m.setup.whiteNerfId, bn = m.setup.blackNerfId;
    if (wn === bn) continue;
    if (JSON.stringify(w.frames).includes(`"${bn}"`)) leaks++;
    if (JSON.stringify(b.frames).includes(`"${wn}"`)) leaks++;
    if (JSON.stringify(s.frames).includes(`"${wn}"`) || JSON.stringify(s.frames).includes(`"${bn}"`)) specLeaks++;
    if (w.frames.some((f) => f.t === "start" && f.d.draftSeed !== undefined)) seedFrames++;
  }
  report.classicGamesChecked = games; report.seatFramesNamingOpponentNerf = leaks; report.spectatorFramesNamingANerf = specLeaks; report.classicStartFramesWithDraftSeed = seedFrames;
  console.log(JSON.stringify(report));
}
main().catch((e) => { console.error("HARNESS ERROR", e); process.exit(1); });
