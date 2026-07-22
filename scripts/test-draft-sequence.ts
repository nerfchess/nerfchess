// Unit tests for the draft lifecycle state machine (src/lib/draftSequence.ts)
// and the UI interrupt gate (src/lib/uiInterrupts.ts).
//
// Deterministic by construction: the machine takes an injected clock and
// timer pair, so every "wait" here is a fake-clock advance plus microtask
// flushes. No wall-clock sleeps anywhere.
//
// Run: npm run test:draft-sequence

import assert from "node:assert/strict";
import {
  DRAFT_PHASE_ORDER,
  DraftSequence,
  draftPhaseReached,
  draftPrepLabel,
  whenIdle,
} from "../src/lib/draftSequence";
import {
  UI_PRIORITY,
  pushUiHold,
  requestUiSlot,
  resetUiInterruptsForTest,
  uiInterruptsHeld,
} from "../src/lib/uiInterrupts";

// --- tiny fake timer world ---------------------------------------------------

class FakeClock {
  nowMs = 100_000;
  private timers = new Map<number, { at: number; fn: () => void }>();
  private nextId = 1;
  now = () => this.nowMs;
  setTimeout = (fn: () => void, ms: number): unknown => {
    const id = this.nextId++;
    this.timers.set(id, { at: this.nowMs + Math.max(0, ms), fn });
    return id;
  };
  clearTimeout = (h: unknown): void => {
    this.timers.delete(h as number);
  };
  /** Advance the clock, firing due timers in time order. */
  advance(ms: number) {
    const target = this.nowMs + ms;
    for (;;) {
      let dueId: number | null = null;
      let dueAt = Infinity;
      for (const [id, t] of this.timers) {
        if (t.at <= target && t.at < dueAt) {
          dueAt = t.at;
          dueId = id;
        }
      }
      if (dueId == null) break;
      const t = this.timers.get(dueId)!;
      this.timers.delete(dueId);
      this.nowMs = Math.max(this.nowMs, t.at);
      t.fn();
    }
    this.nowMs = target;
  }
  get pendingTimerCount() {
    return this.timers.size;
  }
}

/** Flush pending microtasks (promise continuations) without advancing time. */
async function flush(times = 6) {
  for (let i = 0; i < times; i++) await Promise.resolve();
}

function makeSeq(clock: FakeClock, onStall?: (label: string, kind: string) => void) {
  const phases: string[] = [];
  const seq = new DraftSequence({
    now: clock.now,
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    onPhase: (p) => phases.push(p),
    onStall,
  });
  return { seq, phases };
}

let passed = 0;
const failures: string[] = [];
async function check(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    passed += 1;
    console.log(`  ok: ${name}`);
  } catch (err) {
    failures.push(name);
    console.error(`  FAIL: ${name}`);
    console.error(err);
  }
}

// --- DraftSequence tests ----------------------------------------------------

async function run() {
  console.log("draftSequence:");

  await check("phase order lists all nine phases exactly once", () => {
    assert.equal(DRAFT_PHASE_ORDER.length, 9);
    assert.equal(new Set(DRAFT_PHASE_ORDER).size, 9);
    assert.equal(DRAFT_PHASE_ORDER[0], "MOVE_RESOLVING");
    assert.equal(DRAFT_PHASE_ORDER[8], "DRAFT_COMPLETE");
    assert.ok(draftPhaseReached("DRAFT_DECIDING", "CARDS_READY"));
    assert.ok(!draftPhaseReached("CARDS_PREPARING", "CARDS_READY"));
  });

  await check("prep labels exist for every pre-decision phase, none after", () => {
    assert.equal(draftPrepLabel("MOVE_RESOLVING"), "Resolving effects");
    assert.equal(draftPrepLabel("ANIMATIONS_PLAYING"), "Resolving effects");
    assert.equal(draftPrepLabel("CARDS_PREPARING"), "Opening your draft");
    assert.equal(draftPrepLabel("CARDS_READY"), "Dealing the cards");
    assert.equal(draftPrepLabel("DRAFT_DECIDING"), null);
    assert.equal(draftPrepLabel("DRAFT_COMPLETE"), null);
  });

  await check("countdown cannot start before the cards are ready", () => {
    const clock = new FakeClock();
    const { seq } = makeSeq(clock);
    assert.equal(seq.startDecision(20_000), null);
    seq.to("ANIMATIONS_PLAYING");
    assert.equal(seq.startDecision(20_000), null);
    seq.to("CARDS_PREPARING");
    assert.equal(seq.startDecision(20_000), null);
    assert.equal(seq.deadline, null);
    seq.to("CARDS_READY");
    const deadline = seq.startDecision(20_000);
    assert.equal(deadline, clock.nowMs + 20_000);
    assert.equal(seq.phase, "DRAFT_DECIDING");
  });

  await check("the full window is granted no matter how long prep took", () => {
    const clock = new FakeClock();
    const { seq } = makeSeq(clock);
    seq.to("ANIMATIONS_PLAYING");
    clock.advance(7_345); // long spectacle chain
    seq.to("CARDS_PREPARING");
    clock.advance(2_900); // chest + deal
    seq.to("CARDS_READY");
    const deadline = seq.startDecision(20_000)!;
    assert.equal(deadline - clock.nowMs, 20_000);
  });

  await check("tracked animation completion gates the advance", async () => {
    const clock = new FakeClock();
    const { seq } = makeSeq(clock);
    let done!: () => void;
    seq.track("spectacle", new Promise<void>((r) => (done = r)));
    let advanced = false;
    void seq.advanceWhenSettled("CARDS_PREPARING").then((ok) => (advanced = ok));
    await flush();
    assert.equal(advanced, false);
    assert.equal(seq.phase, "MOVE_RESOLVING");
    done();
    await flush();
    assert.equal(advanced, true);
    assert.equal(seq.phase, "CARDS_PREPARING");
  });

  await check("a FAILED animation cannot deadlock the sequence", async () => {
    const clock = new FakeClock();
    const stalls: string[] = [];
    const { seq } = makeSeq(clock, (label, kind) => stalls.push(`${label}:${kind}`));
    seq.track("broken", Promise.reject(new Error("animation crashed")));
    const ok = await seq.advanceWhenSettled("CARDS_PREPARING");
    assert.equal(ok, true);
    assert.equal(seq.phase, "CARDS_PREPARING");
    assert.deepEqual(stalls, ["broken:error"]);
  });

  await check("a LOST completion event is capped by the watchdog", async () => {
    const clock = new FakeClock();
    const stalls: string[] = [];
    const { seq } = makeSeq(clock, (label, kind) => stalls.push(`${label}:${kind}`));
    seq.track("never-fires", new Promise(() => {}), 3_000);
    let advanced = false;
    void seq.advanceWhenSettled("CARDS_PREPARING").then(() => (advanced = true));
    await flush();
    assert.equal(advanced, false);
    clock.advance(2_999);
    await flush();
    assert.equal(advanced, false);
    clock.advance(1);
    await flush();
    assert.equal(advanced, true);
    assert.deepEqual(stalls, ["never-fires:timeout"]);
  });

  await check("reduced motion (instant completion) advances immediately", async () => {
    const clock = new FakeClock();
    const { seq } = makeSeq(clock);
    seq.track("reduced-motion", Promise.resolve());
    const ok = await seq.advanceWhenSettled("CARDS_PREPARING");
    assert.equal(ok, true);
    assert.equal(seq.phase, "CARDS_PREPARING");
  });

  await check("reroll restarts preparation and re-grants a full window", () => {
    const clock = new FakeClock();
    const { seq } = makeSeq(clock);
    seq.to("CARDS_READY");
    const first = seq.startDecision(20_000)!;
    clock.advance(6_000); // player thought for 6s, then rerolled
    assert.ok(seq.restartPreparation());
    assert.equal(seq.phase, "CARDS_PREPARING");
    assert.equal(seq.deadline, null);
    clock.advance(2_500); // reroll shuffle + fresh deal
    seq.to("CARDS_READY");
    const second = seq.startDecision(20_000)!;
    assert.equal(second - clock.nowMs, 20_000);
    assert.ok(second > first);
  });

  await check("backward and duplicate transitions are ignored", () => {
    const clock = new FakeClock();
    const { seq, phases } = makeSeq(clock);
    seq.to("DRAFT_DECIDING" as never); // forward skip is allowed by design
    assert.equal(seq.to("CARDS_PREPARING"), false); // backward: no
    assert.equal(seq.to("DRAFT_DECIDING"), false); // duplicate: no
    assert.deepEqual(phases, ["DRAFT_DECIDING"]);
  });

  await check("a restart invalidates an in-flight gated advance", async () => {
    const clock = new FakeClock();
    const { seq } = makeSeq(clock);
    seq.to("CARDS_PREPARING");
    let resolveAnim!: () => void;
    seq.track("deal", new Promise<void>((r) => (resolveAnim = r)));
    let result: boolean | null = null;
    void seq.advanceWhenSettled("CARDS_READY").then((ok) => (result = ok));
    await flush();
    seq.restartPreparation(); // reroll arrived mid-deal
    await flush();
    assert.equal(result, false); // the stale advance reports failure
    assert.equal(seq.phase, "CARDS_PREPARING");
    resolveAnim(); // late completion of the dropped animation: harmless
    await flush();
    assert.equal(seq.phase, "CARDS_PREPARING");
  });

  await check("startDecision is idempotent once deciding (no double windows)", () => {
    const clock = new FakeClock();
    const { seq } = makeSeq(clock);
    seq.to("CARDS_READY");
    const first = seq.startDecision(20_000);
    clock.advance(5_000);
    const second = seq.startDecision(20_000);
    assert.equal(second, first);
  });

  await check("confirm flow walks the tail phases in order", () => {
    const clock = new FakeClock();
    const { seq, phases } = makeSeq(clock);
    seq.to("CARDS_READY");
    seq.startDecision(20_000);
    seq.to("DRAFT_CONFIRMING");
    seq.to("SELECTION_ANIMATING");
    seq.to("RETURNING_TO_GAME");
    seq.to("DRAFT_COMPLETE");
    assert.deepEqual(phases.slice(-4), [
      "DRAFT_CONFIRMING",
      "SELECTION_ANIMATING",
      "RETURNING_TO_GAME",
      "DRAFT_COMPLETE",
    ]);
    // Terminal: nothing moves, tracking is inert.
    assert.equal(seq.to("DRAFT_COMPLETE"), false);
    seq.track("late", Promise.resolve());
    assert.equal(seq.phase, "DRAFT_COMPLETE");
  });

  await check("dispose clears every pending watchdog", () => {
    const clock = new FakeClock();
    const { seq } = makeSeq(clock);
    seq.track("a", new Promise(() => {}));
    seq.track("b", new Promise(() => {}));
    assert.ok(clock.pendingTimerCount >= 2);
    seq.dispose();
    assert.equal(clock.pendingTimerCount, 0);
  });

  await check("whenIdle resolves immediately when idle, later when busy", async () => {
    let busy = true;
    const subs = new Set<() => void>();
    const subscribe = (cb: () => void) => {
      subs.add(cb);
      return () => subs.delete(cb);
    };
    let settled = false;
    void whenIdle(() => busy, subscribe).then(() => (settled = true));
    await flush();
    assert.equal(settled, false);
    busy = false;
    for (const cb of subs) cb();
    await flush();
    assert.equal(settled, true);
    assert.equal(subs.size, 0); // unsubscribed itself
    // Already idle: instant.
    let instant = false;
    void whenIdle(() => false, subscribe).then(() => (instant = true));
    await flush();
    assert.equal(instant, true);
  });

  // --- uiInterrupts tests ---------------------------------------------------

  console.log("uiInterrupts:");

  await check("an interrupter presents immediately when nothing is held", () => {
    resetUiInterruptsForTest();
    let shown = 0;
    requestUiSlot(UI_PRIORITY.performance, (release) => {
      shown += 1;
      release();
    });
    assert.equal(shown, 1);
  });

  await check("a draft hold defers the performance prompt until release", () => {
    resetUiInterruptsForTest();
    const release = pushUiHold();
    assert.ok(uiInterruptsHeld());
    let shown = false;
    requestUiSlot(UI_PRIORITY.performance, (r) => {
      shown = true;
      r();
    });
    assert.equal(shown, false); // never over an active draft
    release();
    assert.equal(shown, true);
    assert.ok(!uiInterruptsHeld());
  });

  await check("queued interrupts present one at a time in priority order", () => {
    resetUiInterruptsForTest();
    const releaseHold = pushUiHold();
    const order: string[] = [];
    const releases: (() => void)[] = [];
    requestUiSlot(UI_PRIORITY.performance, (r) => {
      order.push("performance");
      releases.push(r);
    });
    requestUiSlot(UI_PRIORITY.achievement, (r) => {
      order.push("achievement");
      releases.push(r);
    });
    requestUiSlot(UI_PRIORITY.tour, (r) => {
      order.push("tour");
      releases.push(r);
    });
    releaseHold();
    // Only ONE presents at a time; achievements outrank tours outrank perf.
    assert.deepEqual(order, ["achievement"]);
    releases.shift()!();
    assert.deepEqual(order, ["achievement", "tour"]);
    releases.shift()!();
    assert.deepEqual(order, ["achievement", "tour", "performance"]);
  });

  await check("cancelling a queued interrupt removes it", () => {
    resetUiInterruptsForTest();
    const releaseHold = pushUiHold();
    let shown = false;
    const cancel = requestUiSlot(UI_PRIORITY.achievement, () => {
      shown = true;
    });
    cancel();
    releaseHold();
    assert.equal(shown, false);
  });

  await check("nested holds only clear when the LAST one releases", () => {
    resetUiInterruptsForTest();
    const a = pushUiHold();
    const b = pushUiHold();
    let shown = false;
    requestUiSlot(UI_PRIORITY.announcement, (r) => {
      shown = true;
      r();
    });
    a();
    assert.equal(shown, false);
    a(); // double release of the same hold is safe and does nothing extra
    assert.equal(shown, false);
    b();
    assert.equal(shown, true);
  });

  // --- summary --------------------------------------------------------------

  console.log("");
  if (failures.length > 0) {
    console.error(`FAILED: ${failures.length} test(s): ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log(`OK: ${passed} draft-sequence tests passed`);
}

void run();
