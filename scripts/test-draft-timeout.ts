// Unit tests for deterministic draft-timeout resolution
// (src/lib/draftTimeout.ts).
//
// Deterministic by construction: the resolver takes an injected RNG, so every
// "random" pick here is reproducible. No wall-clock, no sleeps.
//
// Covers the required timeout matrix:
//   - selection confirmed normally (the non-timeout baseline);
//   - timeout with a selected card (auto-confirm that card);
//   - timeout with no selection (authoritative RNG picks an offered card);
//   - reroll immediately before timeout (fresh offer resolves, not the stale one);
//   - reconnect during reveal (offer restored, nothing resolved yet);
//   - reconnect during selection (selection restored, timeout still resolves it);
//   - duplicate timeout event (idempotent: exactly one card granted);
//   - opening-draft timeout (offer index 0);
//   - recurring-draft timeout (offer index > 0);
//   - never Skip & Bank on a silent timeout.
//
// Run: npm run test:draft-timeout

import assert from "node:assert/strict";
import {
  DraftTimeoutGuard,
  resolveDraftTimeout,
  type DraftTimeoutResolution,
} from "../src/lib/draftTimeout";

// --- a tiny, faithful model of one seat's draft lifecycle -------------------
// Mirrors the contract the real surfaces (DraftOverlay + its parents / the
// server draftPick handler) enforce: one commit per offer version, a cleared
// offer after resolution, and a reroll minting a brand new resolvable version.

interface Offer {
  index: number; // 0 == opening pick; > 0 == recurring cadence draft
  rerolled: number;
  cards: string[]; // card ids
}

class DraftSeat {
  offer: Offer | null = null;
  selected: number | null = null;
  banked = false;
  readonly granted: string[] = [];
  private committed = false;
  private readonly guard = new DraftTimeoutGuard();

  open(offer: Offer) {
    this.offer = offer;
    this.selected = null;
    this.committed = false;
  }

  private key(): string {
    return this.offer ? `${this.offer.index}:${this.offer.rerolled}` : "";
  }

  select(i: number) {
    if (this.committed) return;
    this.selected = i;
  }

  /** Explicit user confirm of the current selection (the normal, non-timeout
   * path). */
  confirm() {
    if (this.committed || this.offer == null || this.selected == null) return;
    this.pick(this.selected);
  }

  /** Explicit Skip & Bank — the ONLY path that may bank. */
  skipAndBank() {
    if (this.committed || this.offer == null) return;
    this.committed = true;
    this.banked = true;
    this.offer = null;
  }

  private pick(i: number) {
    if (this.committed || this.offer == null) return;
    this.committed = true;
    this.granted.push(this.offer.cards[i]);
    this.offer = null;
  }

  /** The decision window expired. Idempotent per offer version. */
  timeout(random?: () => number): DraftTimeoutResolution | null {
    if (this.offer == null) return null;
    return this.guard.resolve(
      this.key(),
      { offeredCount: this.offer.cards.length, selectedIndex: this.selected, random },
      (res) => this.pick(res.index),
    );
  }

  /** A reroll: same round, brand new offer version and a fresh window. */
  reroll(cards: string[]) {
    if (this.offer == null) return;
    this.offer = { ...this.offer, rerolled: this.offer.rerolled + 1, cards };
    this.selected = null;
    this.committed = false;
  }

  /** A reconnect / start replay hands the same offer version back. */
  restore(offer: Offer, selected: number | null) {
    this.offer = offer;
    this.selected = selected;
    this.committed = false;
  }
}

// --- seeded RNG (mulberry32) for reproducible "random" picks ----------------
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    passed += 1;
    console.log(`  ok: ${name}`);
  } catch (err) {
    failures.push(name);
    console.error(`  FAIL: ${name}`);
    console.error(err);
  }
}

console.log("draftTimeout:");

// --- pure resolver -----------------------------------------------------------

check("selected card is auto-confirmed on timeout", () => {
  const r = resolveDraftTimeout({ offeredCount: 3, selectedIndex: 2, random: () => 0 });
  assert.deepEqual(r, { index: 2, reason: "selected" });
});

check("no selection picks an offered card via the injected RNG", () => {
  // random() -> 0.5, count 4 -> floor(2.0) == 2
  const r = resolveDraftTimeout({ offeredCount: 4, selectedIndex: null, random: () => 0.5 });
  assert.deepEqual(r, { index: 2, reason: "auto" });
});

check("a broken RNG (>=1) still lands on a real offered card", () => {
  const r = resolveDraftTimeout({ offeredCount: 2, selectedIndex: null, random: () => 1.5 });
  assert.ok(r && r.index >= 0 && r.index < 2);
});

check("an out-of-range selection falls back to an auto pick", () => {
  const r = resolveDraftTimeout({ offeredCount: 2, selectedIndex: 9, random: () => 0 });
  assert.deepEqual(r, { index: 0, reason: "auto" });
});

check("an empty offer resolves to null (nothing to do)", () => {
  assert.equal(resolveDraftTimeout({ offeredCount: 0, selectedIndex: null }), null);
});

// --- lifecycle model ---------------------------------------------------------

check("selection confirmed normally grants exactly that card (no timeout)", () => {
  const seat = new DraftSeat();
  seat.open({ index: 2, rerolled: 0, cards: ["a", "b"] });
  seat.select(1);
  seat.confirm();
  assert.deepEqual(seat.granted, ["b"]);
  assert.equal(seat.banked, false);
  assert.equal(seat.offer, null);
});

check("timeout WITH a selected card auto-confirms that card", () => {
  const seat = new DraftSeat();
  seat.open({ index: 3, rerolled: 0, cards: ["a", "b", "c"] });
  seat.select(2);
  const res = seat.timeout(() => 0);
  assert.deepEqual(res, { index: 2, reason: "selected" });
  assert.deepEqual(seat.granted, ["c"]);
  assert.equal(seat.banked, false);
});

check("timeout with NO selection picks one offered card via authoritative RNG", () => {
  const seat = new DraftSeat();
  seat.open({ index: 5, rerolled: 0, cards: ["a", "b", "c", "d"] });
  const rng = mulberry32(1234);
  const res = seat.timeout(rng);
  assert.ok(res && res.reason === "auto");
  assert.equal(seat.granted.length, 1); // exactly one card, never zero, never two
  assert.ok(["a", "b", "c", "d"].includes(seat.granted[0]));
  assert.equal(seat.banked, false); // NEVER auto-bank
});

check("reroll immediately before timeout resolves the FRESH offer, not the stale one", () => {
  const seat = new DraftSeat();
  seat.open({ index: 4, rerolled: 0, cards: ["old1", "old2"] });
  seat.select(0); // had eyed old1...
  seat.reroll(["new1", "new2"]); // ...then rerolled at the last second
  const res = seat.timeout(() => 0); // no selection on the fresh offer -> auto index 0
  assert.deepEqual(res, { index: 0, reason: "auto" });
  assert.deepEqual(seat.granted, ["new1"]);
  assert.equal(seat.granted.includes("old1"), false);
});

check("reconnect during reveal restores the offer and resolves nothing yet", () => {
  const seat = new DraftSeat();
  // Fresh start replay hands the offer back with no selection; the window has
  // not expired, so no card is granted merely by reconnecting.
  seat.restore({ index: 1, rerolled: 0, cards: ["a", "b"] }, null);
  assert.equal(seat.granted.length, 0);
  assert.notEqual(seat.offer, null);
  // ...and a later timeout still resolves it exactly once.
  seat.timeout(() => 0);
  assert.equal(seat.granted.length, 1);
});

check("reconnect during selection keeps the selection and the timeout confirms it", () => {
  const seat = new DraftSeat();
  seat.restore({ index: 2, rerolled: 0, cards: ["a", "b", "c"] }, 1);
  const res = seat.timeout(() => 0);
  assert.deepEqual(res, { index: 1, reason: "selected" });
  assert.deepEqual(seat.granted, ["b"]);
});

check("duplicate timeout event grants exactly one card (idempotent)", () => {
  const seat = new DraftSeat();
  seat.open({ index: 6, rerolled: 0, cards: ["a", "b", "c"] });
  seat.select(0);
  const first = seat.timeout(() => 0);
  const second = seat.timeout(() => 0); // a refresh / doubled tick / reconnect echo
  const third = seat.timeout(() => 0);
  assert.deepEqual(first, { index: 0, reason: "selected" });
  assert.equal(second, null);
  assert.equal(third, null);
  assert.deepEqual(seat.granted, ["a"]); // never two cards
});

check("opening-draft timeout (offer index 0) resolves like any other", () => {
  const seat = new DraftSeat();
  seat.open({ index: 0, rerolled: 0, cards: ["opener1", "opener2"] });
  const res = seat.timeout(() => 0.99);
  assert.ok(res);
  assert.equal(seat.granted.length, 1);
  assert.equal(seat.offer, null);
});

check("recurring-draft timeout (offer index > 0) resolves like the opening one", () => {
  const seat = new DraftSeat();
  seat.open({ index: 7, rerolled: 0, cards: ["x", "y", "z"] });
  const res = seat.timeout(() => 0);
  assert.ok(res);
  assert.equal(seat.granted.length, 1);
  assert.equal(seat.offer, null);
});

check("a resolved-then-rerolled offer is resolvable again on the new version", () => {
  // Guards must key on the offer VERSION, not just the seat: an unresolved
  // reroll that then times out must still resolve.
  const seat = new DraftSeat();
  seat.open({ index: 3, rerolled: 0, cards: ["a", "b"] });
  seat.reroll(["c", "d"]); // v1 -> v2, nothing resolved yet
  const res = seat.timeout(() => 0);
  assert.deepEqual(res, { index: 0, reason: "auto" });
  assert.deepEqual(seat.granted, ["c"]);
});

check("explicit Skip & Bank is the only path that banks", () => {
  const seat = new DraftSeat();
  seat.open({ index: 2, rerolled: 0, cards: ["a", "b"] });
  seat.skipAndBank();
  assert.equal(seat.banked, true);
  assert.deepEqual(seat.granted, []);
  // A timeout after an explicit bank is a no-op (offer already consumed).
  assert.equal(seat.timeout(() => 0), null);
});

console.log("");
if (failures.length > 0) {
  console.error(`FAILED: ${failures.length} test(s): ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`OK: ${passed} draft-timeout tests passed`);
