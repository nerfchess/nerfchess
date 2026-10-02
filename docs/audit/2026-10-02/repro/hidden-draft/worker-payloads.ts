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
  const mode = (process.argv[2] ?? "nerf") as "nerf" | "buff";
  await msg(W, "create", { timeSec: 300, incrementSec: 2, draft: true, mode });
  const created = W.frames.find((f) => f.t === "created");
  if (!created) throw new Error("no created frame: " + JSON.stringify(W.frames));
  const id = created.d.id;
  // Emulate a QUEUE match (createQueueMatch stores picksVisible: false, rated).
  const key = `match:${id}`;
  const m: any = store.get(key);
  if (process.argv[3] !== "friend") m.picksVisible = false;
  store.set(key, m);
  await msg(B, "join", { id });
  await msg(S, "watch", { id });
  const startW = W.frames.filter((f) => f.t === "start").at(-1);
  const startB = B.frames.filter((f) => f.t === "start").at(-1);
  const report: Record<string, unknown> = { mode, id };
  report.preStart_white_frame_has_nerfDraft = !!startW?.d?.nerfDraft;
  report.preStart_white_sees_black_options = startW?.d?.nerfDraft?.options?.b ?? null;
  report.preStart_white_frame_picksVisible = startW?.d?.picksVisible;
  report.preStart_white_frame_has_draftSeed = startW?.d?.draftSeed !== undefined;
  report.preStart_white_frame_has_nerfSeed = startW?.d?.nerfSeed !== undefined;
  report.spectator_frames_preStart = S.frames.map((f) => f.t);

  // Black does NOT pick (AFK). White picks option 1.
  if (startW?.d?.nerfDraft) {
    await msg(W, "dtNerfPick", { index: 1 });
    // Advance past the lock-in + grace and run the deadline sweep.
    const mm: any = store.get(key);
    mm.nerfDeadline = Date.now() - 10_000;
    store.set(key, mm);
    const live: any = store.get(key);
    await server.enforceDraftDeadlines(live, Date.now());
  }
  const after: any = store.get(key);
  const startW2 = W.frames.filter((f) => f.t === "start").at(-1);
  report.dtNerfPicked_frames_white_received = W.frames.filter((f) => f.t === "dtNerfPicked").map((f) => f.d);
  report.black_actual_nerf = after.setup.blackNerfId;
  report.black_options_index0 = after.nerfOptions?.b?.[0] ?? null;
  report.timeout_reveals_black_nerf =
    !!after.nerfOptions && after.setup.blackNerfId === after.nerfOptions.b[0];
  report.started_white_frame_revealed = startW2?.d?.revealed ?? null;
  report.started_white_frame_nerfId_is_own = startW2?.d?.nerfId === after.setup.whiteNerfId;
  report.started_white_frame_contains_black_nerf_anywhere = JSON.stringify(startW2?.d ?? {}).includes(`"${after.setup.blackNerfId}"`) && after.setup.blackNerfId !== after.setup.whiteNerfId;
  report.started_white_frame_draftSeed = startW2?.d?.draftSeed;
  report.server_draftSeed = after.draftSeed;
  // Play two legal moves after start so the spectator has live frames.
  const { legalMoves } = await import("../../../../../src/engine/game");
  const { moveToUCI } = await import("../../../../../src/engine/board");
  for (const ws of [W, B]) {
    const cur: any = store.get(key);
    if (!cur.startedAt || cur.result) break;
    const g = server.gameFromMatch(cur);
    const lm = legalMoves(g);
    await msg(ws, "move", { u: moveToUCI(lm[0]), ply: cur.moves.length });
  }
  report.moves_played = (store.get(key) as any).moves;
  report.spectator_move_frames = S.frames.filter((f) => f.t === "move").map((f) => ({ ply: f.d.ply, seq: f.e?.seq ?? null }));
  report.spectator_got_fresh_wstart_after_start = S.frames.filter((f) => f.t === "wstart").length > 1;
  report.spectator_first_wstart_started = S.frames.find((f) => f.t === "wstart")?.d?.started;
  report.spectator_first_wstart_has_pub = !!S.frames.find((f) => f.t === "wstart")?.d?.pub;
  // Spectator after start.
  report.spectator_frames = S.frames.map((f) => f.t);
  const allSpectatorText = JSON.stringify(S.frames);
  report.spectator_any_frame_mentions_black_nerf = allSpectatorText.includes(`"${after.setup.blackNerfId}"`);
  report.spectator_any_frame_mentions_white_nerf = allSpectatorText.includes(`"${after.setup.whiteNerfId}"`);
  // Any frame the white seat received (all of them) naming black's nerf?
  report.white_any_frame_mentions_black_nerf = JSON.stringify(W.frames).includes(`"${after.setup.blackNerfId}"`);
  report.white_frame_types = W.frames.map((f) => f.t);
  console.log(JSON.stringify(report, null, 2));
}
main().catch((e) => {
  console.error("HARNESS ERROR", e);
  process.exit(1);
});
