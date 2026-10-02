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
const S = fakeWs("spectator");
const msg = (ws: any, t: string, d?: unknown) => server.webSocketMessage(ws, JSON.stringify(d === undefined ? { t } : { t, d }));

async function main() {
  const timeSec = Number(process.argv[2] ?? 0);
  await msg(W, "create", { timeSec, incrementSec: 0, draft: true, mode: "buff" });
  const id = W.frames.find((f) => f.t === "created")!.d.id;
  const key = `match:${id}`;
  await msg(B, "join", { id });
  const { legalMoves } = await import("../../../../../src/engine/game");
  const { moveToUCI } = await import("../../../../../src/engine/board");
  const lastErr = (ws: any) => ws.frames.filter((f: Frame) => f.t === "error").at(-1)?.d?.code ?? null;
  // Resolve the opening pick for both seats.
  await msg(W, "dtPick", { index: 0 });
  await msg(B, "dtPick", { index: 0 });
  // Play until a cadence offer appears.
  for (let i = 0; i < 40; i++) {
    const cur: any = store.get(key);
    const g = server.gameFromMatch(cur);
    if (g.buffs.players.w.offer || g.buffs.players.b.offer) break;
    const ws = g.board.turn === "w" ? W : B;
    const lm = legalMoves(g);
    await msg(ws, "move", { u: moveToUCI(lm[0]), ply: cur.moves.length });
  }
  let cur: any = store.get(key);
  let g = server.gameFromMatch(cur);
  const report: Record<string, unknown> = { timeSec, plies: cur.moves.length, offers: { w: !!g.buffs.players.w.offer, b: !!g.buffs.players.b.offer }, turn: g.board.turn };
  // White resolves; black (the staller) never does.
  if (g.buffs.players.w.offer) await msg(W, "dtPick", { index: 0 });
  cur = store.get(key);
  cur.dtDeadline = Date.now() - 1000;
  store.set(key, cur);
  await server.enforceDraftDeadlines(store.get(key), Date.now());
  // Simulate an hour passing with the alarm sweep running.
  for (let k = 0; k < 3; k++) { try { await server.alarm(); } catch (e) { report.alarmError = String(e); } }
  cur = store.get(key);
  g = server.gameFromMatch(cur);
  report.after = { result: cur.result, blackOfferStillOpen: !!g.buffs.players.b.offer, turn: g.board.turn, runningSince: cur.runningSince, clocks: cur.clocks };
  // The waiting seat tries everything it can.
  if (g.board.turn === "w") {
    const lm = legalMoves(g);
    await msg(W, "move", { u: moveToUCI(lm[0]), ply: cur.moves.length });
    report.whiteMoveError = lastErr(W);
  }
  await msg(W, "claimWin");
  report.whiteClaimWinError = lastErr(W);
  await msg(W, "abort");
  report.whiteAbortError = lastErr(W);
  console.log(JSON.stringify(report, null, 2));
}
main().catch((e) => { console.error("HARNESS ERROR", e); process.exit(1); });
