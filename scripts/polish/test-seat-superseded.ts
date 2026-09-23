// F082 regression: two tabs on the same seat must not steal it back and forth
// forever. The server closes the older socket with the "seat superseded"
// close code; the client that receives it must stop auto-reconnecting (no
// timer, no wake-driven reclaim from a background tab), tell the UI, and only
// take the seat back when the reader asks (reclaim()) or brings that tab to
// the foreground with focus.
//
//   ./node_modules/.bin/tsx scripts/polish/test-seat-superseded.ts
//
// Runs MPSession against a fake WebSocket and fake timers; no server needed.

export {};

type Timer = { id: number; at: number; fn: () => void; every?: number };
let now = 0;
let nextId = 1;
const timers = new Map<number, Timer>();
const listeners = new Map<string, Set<() => void>>();
const docListeners = new Map<string, Set<() => void>>();
let visibility: "visible" | "hidden" = "visible";
let focused = true;

function advance(ms: number) {
  const end = now + ms;
  for (;;) {
    const due = [...timers.values()].filter((t) => t.at <= end).sort((a, b) => a.at - b.at)[0];
    if (!due) break;
    now = due.at;
    if (due.every) due.at += due.every;
    else timers.delete(due.id);
    due.fn();
  }
  now = end;
}

const fakeWindow: any = {
  location: { protocol: "http:", port: "3000", hostname: "localhost", host: "localhost:3000" },
  setTimeout: (fn: () => void, ms: number) => {
    const id = nextId++;
    timers.set(id, { id, at: now + ms, fn });
    return id;
  },
  clearTimeout: (id: number) => void timers.delete(id),
  setInterval: (fn: () => void, ms: number) => {
    const id = nextId++;
    timers.set(id, { id, at: now + ms, fn, every: ms });
    return id;
  },
  clearInterval: (id: number) => void timers.delete(id),
  addEventListener: (type: string, fn: () => void) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type)!.add(fn);
  },
  removeEventListener: (type: string, fn: () => void) => void listeners.get(type)?.delete(fn),
};
const fakeDocument: any = {
  get visibilityState() {
    return visibility;
  },
  hasFocus: () => focused,
  addEventListener: (type: string, fn: () => void) => {
    if (!docListeners.has(type)) docListeners.set(type, new Set());
    docListeners.get(type)!.add(fn);
  },
  removeEventListener: (type: string, fn: () => void) => void docListeners.get(type)?.delete(fn),
};
function fire(type: string) {
  for (const fn of [...(listeners.get(type) ?? [])]) fn();
  for (const fn of [...(docListeners.get(type) ?? [])]) fn();
}

const sockets: FakeSocket[] = [];
class FakeSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  readyState = 0;
  sent: string[] = [];
  onopen: ((e?: unknown) => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: ((e?: unknown) => void) | null = null;
  onclose: ((e: { code: number; reason: string }) => void) | null = null;
  constructor(public url: string) {
    sockets.push(this);
    fakeWindow.setTimeout(() => {
      this.readyState = 1;
      this.onopen?.();
    }, 5);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
  }
  serverClose(code: number, reason = "") {
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }
}

(globalThis as any).window = fakeWindow;
(globalThis as any).document = fakeDocument;
(globalThis as any).WebSocket = FakeSocket;
(globalThis as any).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

let failures = 0;
function ok(cond: boolean, label: string) {
  console.log((cond ? "  ok  " : "FAIL  ") + label);
  if (!cond) failures++;
}

async function flush() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

async function main() {
  const mp = await import("../../src/lib/multiplayer");
  const { MPSession } = mp;
  const SUPERSEDED: number | undefined = (mp as any).SEAT_SUPERSEDED_CLOSE;
  ok(SUPERSEDED === 4001, "multiplayer exports SEAT_SUPERSEDED_CLOSE = 4001");
  const code = SUPERSEDED ?? 4001;

  const session = new MPSession();
  session.persistFriendSession = false;
  const events: string[] = [];
  const states: string[] = [];
  session.on((e) => events.push(e.type));
  session.onConnectionState((s) => states.push(s));

  const seat = { id: "g1", color: "w" as const, token: "tok" };
  const resumed = session.resume(seat);
  await flush();
  advance(10);
  await flush();
  const first = sockets[0];
  ok(!!first && first.sent.some((s) => s.includes('"reconnect"')), "resume sends a reconnect frame");
  first.onmessage?.({ data: JSON.stringify({ t: "created", d: { id: "g1", color: "w", token: "tok" } }) });
  await resumed;

  // Control: an ordinary drop still auto-reconnects.
  first.serverClose(1006);
  advance(20000);
  await flush();
  advance(20);
  await flush();
  ok(sockets.length === 2, "an ordinary drop (1006) reconnects on its own");
  const second = sockets[1];
  ok(!!second && second.sent.some((s) => s.includes('"reconnect"')), "the reconnect re-sends the seat claim");

  // Another tab took the seat: the server closes this socket with 4001.
  events.length = 0;
  states.length = 0;
  second.serverClose(code, "Seat opened in another tab");
  advance(60000);
  await flush();
  ok(sockets.length === 2, "a superseded close does not auto-reconnect (no steal-back loop)");
  ok(events.includes("superseded"), "a superseded close emits a superseded event");
  ok(!events.includes("reconnecting"), "a superseded close does not report reconnecting");

  // Background wake signals must not steal the seat back.
  focused = false;
  fire("online");
  fire("pageshow");
  advance(20000);
  await flush();
  ok(sockets.length === 2, "an unfocused wake (online, pageshow) does not reclaim the seat");

  visibility = "hidden";
  fire("visibilitychange");
  advance(1000);
  await flush();
  ok(sockets.length === 2, "a hidden visibilitychange does not reclaim the seat");

  // The reader brings this tab to the front and focuses it: it takes the seat.
  visibility = "visible";
  focused = true;
  fire("focus");
  advance(20);
  await flush();
  advance(20);
  await flush();
  ok(sockets.length === 3, "focusing the tab reclaims the seat once");
  const third = sockets[2];
  ok(!!third && third.sent.some((s) => s.includes('"reconnect"')), "the reclaim sends the seat claim");

  // Superseded again, then the explicit reclaim() path.
  third.serverClose(code);
  advance(60000);
  await flush();
  ok(sockets.length === 3, "a second superseded close stays quiet");
  const reclaim = (session as any).reclaim as (() => boolean) | undefined;
  ok(typeof reclaim === "function", "MPSession exposes reclaim()");
  if (typeof reclaim === "function") {
    ok(reclaim.call(session) === true, "reclaim() returns true while holding a seat");
    advance(20);
    await flush();
    ok(sockets.length === 4, "reclaim() opens a new socket and claims the seat");
  }

  // Review round 1: a session that was superseded and is then reused for a
  // NEW seat must get auto-reconnect back for that game. The flag used to be
  // cleared only by reclaim(), so a new seat from created/start/paired kept
  // reconnects and resync() off for the whole next game.
  const latest = sockets[sockets.length - 1];
  latest.serverClose(code);
  advance(60000);
  await flush();
  ok(session.isSuperseded(), "the session is superseded again before the new game");
  const countBefore = sockets.length;
  const joined = session.join("g2");
  advance(20);
  await flush();
  const joinSock = sockets[sockets.length - 1];
  ok(sockets.length === countBefore + 1 && joinSock.sent.some((s) => s.includes('"join"')), "join opens a socket for the new game");
  joinSock.onmessage?.({
    data: JSON.stringify({ t: "start", d: { id: "g2", color: "b", token: "tok2" } }),
  });
  await joined.catch(() => {});
  await flush();
  ok(!session.isSuperseded(), "a new seat (start frame) clears the superseded state");
  joinSock.serverClose(1006);
  advance(20000);
  await flush();
  advance(20);
  await flush();
  ok(sockets.length === countBefore + 2, "an ordinary drop in the new game reconnects on its own");
  const rejoin = sockets[sockets.length - 1];
  ok(!!rejoin && rejoin.sent.some((s) => s.includes('"reconnect"') && s.includes("g2")), "the reconnect claims the new seat");

  session.destroy();
  if (failures) {
    console.log(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\nall seat-superseded checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
