// Minimal fake Cloudflare Durable Object runtime so worker.ts's GameServer can
// be driven in-process under tsx. READ-ONLY with respect to the repo: it only
// imports worker.ts by absolute path.
/* eslint-disable @typescript-eslint/no-explicit-any */
import Module from "node:module";
import path from "node:path";
import fs from "node:fs";

const SCRATCH = __dirname;
const stubDir = path.join(SCRATCH, "stubs");
fs.mkdirSync(stubDir, { recursive: true });
fs.writeFileSync(
  path.join(stubDir, "cf-workers.cjs"),
  "class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }\nmodule.exports = { DurableObject };\n",
);
fs.writeFileSync(path.join(stubDir, "open-next.cjs"), "module.exports = { default: { fetch() { return new Response('next stub'); } } };\n");

const origResolve = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (request: string, parent: any, ...rest: any[]) {
  if (request === "cloudflare:workers") return path.join(stubDir, "cf-workers.cjs");
  if (request.endsWith(".open-next/worker.js")) return path.join(stubDir, "open-next.cjs");
  return origResolve.call(this, request, parent, ...rest);
};

// ---- clock control -------------------------------------------------------
let offset = 0;
const realNow = Date.now.bind(Date);
Date.now = () => realNow() + offset;
export function advance(ms: number) {
  offset += ms;
}

// ---- WebSocket fakes ------------------------------------------------------
export class FakeWS {
  static nextId = 1;
  readyState = 1;
  sent: any[] = [];
  closed: { code?: number; reason?: string } | null = null;
  attachment: any = null;
  name: string;
  constructor(name?: string) {
    this.name = name ?? `ws${FakeWS.nextId++}`;
  }
  send(s: string) {
    if (this.readyState !== 1) throw new Error("send on closed socket");
    this.sent.push(JSON.parse(s));
  }
  close(code?: number, reason?: string) {
    this.closed = { code, reason };
    this.readyState = 3;
  }
  serializeAttachment(a: any) {
    this.attachment = a === undefined ? null : JSON.parse(JSON.stringify(a));
  }
  deserializeAttachment() {
    return this.attachment === null ? null : JSON.parse(JSON.stringify(this.attachment));
  }
  take(t?: string) {
    const out = t ? this.sent.filter((f) => f.t === t) : [...this.sent];
    return out;
  }
  last(t: string) {
    const all = this.sent.filter((f) => f.t === t);
    return all[all.length - 1];
  }
  clear() {
    this.sent = [];
  }
}

(globalThis as any).WebSocketPair = class {
  0: FakeWS;
  1: FakeWS;
  constructor() {
    this[0] = new FakeWS("client");
    this[1] = new FakeWS("server");
  }
};
(globalThis as any).WebSocketRequestResponsePair = class {
  constructor(public req: string, public res: string) {}
};
if (!(globalThis as any).WebSocket) (globalThis as any).WebSocket = { OPEN: 1 };

// ---- storage fake ---------------------------------------------------------
export class FakeStorage {
  map = new Map<string, any>();
  alarm: number | null = null;
  ops = { get: 0, put: 0, delete: 0, list: 0, bytesPut: 0 };
  async get(key: string | string[]): Promise<any> {
    this.ops.get++;
    if (Array.isArray(key)) {
      const out = new Map<string, any>();
      for (const k of key) if (this.map.has(k)) out.set(k, structuredClone(this.map.get(k)));
      return out;
    }
    return this.map.has(key) ? structuredClone(this.map.get(key)) : undefined;
  }
  async put(key: string, value: any) {
    this.ops.put++;
    const v = structuredClone(value);
    this.ops.bytesPut += JSON.stringify(v ?? null).length;
    this.map.set(key, v);
  }
  async delete(key: string | string[]) {
    this.ops.delete++;
    if (Array.isArray(key)) {
      let n = 0;
      for (const k of key) if (this.map.delete(k)) n++;
      return n;
    }
    return this.map.delete(key);
  }
  async list(opts: { prefix?: string; start?: string; end?: string; limit?: number } = {}) {
    this.ops.list++;
    const keys = [...this.map.keys()].sort();
    const out = new Map<string, any>();
    for (const k of keys) {
      if (opts.prefix && !k.startsWith(opts.prefix)) continue;
      if (opts.start && k < opts.start) continue;
      if (opts.end && k >= opts.end) continue;
      out.set(k, structuredClone(this.map.get(k)));
      if (opts.limit && out.size >= opts.limit) break;
    }
    return out;
  }
  async getAlarm() {
    return this.alarm;
  }
  async setAlarm(at: number) {
    this.alarm = at;
  }
  async deleteAlarm() {
    this.alarm = null;
  }
  sizeBytes() {
    let n = 0;
    for (const [k, v] of this.map) n += k.length + JSON.stringify(v).length;
    return n;
  }
}

export function makeCtx(storage: FakeStorage, sockets: FakeWS[] = []) {
  return {
    storage,
    id: { toString: () => "fake-do" },
    getWebSockets: () => sockets.filter((s) => s.readyState === 1),
    acceptWebSocket: (_ws: any) => {},
    setWebSocketAutoResponse: (_p: any) => {},
    waitUntil: (_p: Promise<any>) => {},
    blockConcurrencyWhile: async (fn: () => Promise<any>) => fn(),
  };
}

export function loadWorker(): any {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../../../../../worker.ts");
}

// Attach a fresh socket to a GameServer the way handleFetch would (bypassing
// the 101 Response, which Node's Response refuses).
export function connect(gs: any, attachment: Record<string, unknown> = {}, name?: string): FakeWS {
  const ws = new FakeWS(name);
  const att = { id: crypto.randomUUID(), ...attachment };
  ws.serializeAttachment(att);
  gs.sessions.set(ws, att);
  return ws;
}

export async function msg(gs: any, ws: FakeWS, t: string, d?: unknown) {
  const frame: any = { t };
  if (d !== undefined) frame.d = d;
  await gs.webSocketMessage(ws, JSON.stringify(frame));
}

export async function raw(gs: any, ws: FakeWS, s: string | ArrayBuffer) {
  await gs.webSocketMessage(ws, s);
}

export async function drop(gs: any, ws: FakeWS) {
  ws.readyState = 3;
  await gs.webSocketClose(ws, 1006, "", false);
}
