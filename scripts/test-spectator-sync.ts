// Unit checks for the spectator event-sync reducer. Run with:
//   npx -y tsx scripts/test-spectator-sync.ts
//
// Exercises the ordering/authority rules in src/lib/spectate/spectatorSync.ts:
// baseline adoption, in-order apply, dedupe, reorder-buffer + drain, gap
// resync, wrong-game drop, version reject, replay-version drift, clock
// out-of-band, newer-snapshot replace, parity match/mismatch, switch reset,
// and no double-apply after a reconnect re-delivers frames.

import {
  applySpectatorEnvelope,
  applySpectatorSnapshot,
  beginWatch,
  checkSpectatorParity,
  createSpectatorSync,
  DEFAULT_SYNC_CONFIG,
  endWatch,
  sweepSpectatorSync,
  type SpectatorFrame,
} from "@/lib/spectate/spectatorSync";
import { PUBLIC_SNAPSHOT_VERSION } from "@/engine/game";
import type { SpectatorEnvelope, SpectatorEnvelopeType } from "@/lib/multiplayer";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) {
    console.log("  ok  " + label);
  } else {
    failures++;
    console.log("FAIL  " + label);
  }
}

function env(
  gameId: string,
  seq: number,
  type: SpectatorEnvelopeType,
  over: Partial<SpectatorEnvelope> = {},
): SpectatorEnvelope {
  return {
    gameId,
    schemaVersion: PUBLIC_SNAPSHOT_VERSION,
    replayVersion: 10,
    stateRevision: seq,
    seq,
    type,
    publicHash: "h" + seq,
    ts: 1000 + seq,
    ...over,
  };
}
function frame(e: SpectatorEnvelope, payload: unknown = {}): SpectatorFrame {
  return { env: e, payload };
}

// --- baseline: a snapshot binds the game and sets the applied seq ---
{
  const s = createSpectatorSync();
  ok(beginWatch(s, "g1") === true, "beginWatch returns true on a new id");
  ok(beginWatch(s, "g1") === false, "beginWatch is a no-op on the same id");
  const r = applySpectatorSnapshot(s, frame(env("g1", 5, "snapshot")));
  ok(r.signal === "snapshot_replaced" && r.apply.length === 1, "snapshot adopted");
  ok(s.lastAppliedSeq === 5, "baseline seq set from snapshot");
  ok(s.sessionReplayVersion === 10, "session replay version adopted");
}

// --- in-order apply + dedupe + reconnect re-delivery ---
{
  const s = createSpectatorSync();
  beginWatch(s, "g1");
  applySpectatorSnapshot(s, frame(env("g1", 5, "snapshot")));
  const r6 = applySpectatorEnvelope(s, frame(env("g1", 6, "move")));
  ok(r6.signal === "applied" && r6.apply.length === 1, "seq 6 applies in order");
  ok(s.lastAppliedSeq === 6, "baseline advanced to 6");
  const dup = applySpectatorEnvelope(s, frame(env("g1", 6, "move")));
  ok(dup.signal === "duplicate" && dup.apply.length === 0, "duplicate seq dropped");
  const old = applySpectatorEnvelope(s, frame(env("g1", 4, "move")));
  ok(old.signal === "duplicate", "older seq dropped (no double-apply after reconnect)");
  ok(s.lastAppliedSeq === 6, "baseline unchanged after dupes");
}

// --- reorder: buffer then drain when the gap fills ---
{
  const s = createSpectatorSync();
  beginWatch(s, "g1");
  applySpectatorSnapshot(s, frame(env("g1", 5, "snapshot")));
  const b8 = applySpectatorEnvelope(s, frame(env("g1", 8, "move")));
  ok(b8.signal === "buffered" && b8.apply.length === 0, "future seq 8 buffered");
  const b7 = applySpectatorEnvelope(s, frame(env("g1", 7, "move")));
  ok(b7.signal === "buffered", "future seq 7 buffered");
  const fill = applySpectatorEnvelope(s, frame(env("g1", 6, "move")));
  ok(fill.signal === "applied", "seq 6 fills the gap");
  ok(fill.apply.map((f) => f.env.seq).join(",") === "6,7,8", "buffer drains 6,7,8 in order");
  ok(s.lastAppliedSeq === 8 && s.pending.size === 0, "baseline at 8, buffer empty");
}

// --- gap: unfilled buffer past the window triggers a resync on sweep ---
{
  const s = createSpectatorSync();
  beginWatch(s, "g1");
  applySpectatorSnapshot(s, frame(env("g1", 5, "snapshot")));
  applySpectatorEnvelope(s, frame(env("g1", 9, "move")), DEFAULT_SYNC_CONFIG, 1000);
  ok(sweepSpectatorSync(s, DEFAULT_SYNC_CONFIG, 1000 + 500) === null, "no resync inside the window");
  const swept = sweepSpectatorSync(s, DEFAULT_SYNC_CONFIG, 1000 + 2000);
  ok(swept?.signal === "resync" && swept.diag?.event === "tv_event_gap", "resync after the window elapses");
  ok(s.lastAppliedSeq === -1 && s.pending.size === 0, "baseline dropped, buffer cleared on resync");
}

// --- overflow forces an immediate resync ---
{
  const s = createSpectatorSync();
  beginWatch(s, "g1");
  applySpectatorSnapshot(s, frame(env("g1", 0, "snapshot")));
  let sawResync = false;
  for (let i = 0; i < DEFAULT_SYNC_CONFIG.maxPending + 2; i++) {
    const r = applySpectatorEnvelope(s, frame(env("g1", 100 + i, "move")));
    if (r.signal === "resync" && r.diag?.event === "tv_snapshot_resync") sawResync = true;
  }
  ok(sawResync, "buffer overflow forces resync");
}

// --- wrong game dropped ---
{
  const s = createSpectatorSync();
  beginWatch(s, "g1");
  applySpectatorSnapshot(s, frame(env("g1", 5, "snapshot")));
  const r = applySpectatorEnvelope(s, frame(env("g2", 6, "move")));
  ok(r.signal === "wrong_game" && r.apply.length === 0, "frame for another game dropped");
  ok(s.lastAppliedSeq === 5, "baseline untouched by a wrong-game frame");
}

// --- incompatible schema version rejected ---
{
  const s = createSpectatorSync();
  beginWatch(s, "g1");
  applySpectatorSnapshot(s, frame(env("g1", 5, "snapshot")));
  const r = applySpectatorEnvelope(s, frame(env("g1", 6, "move", { schemaVersion: 99 })));
  ok(r.signal === "incompatible_version" && r.diag?.event === "tv_snapshot_invalid", "bad schema version rejected");
}

// --- replay-version drift requests a resync ---
{
  const s = createSpectatorSync();
  beginWatch(s, "g1");
  applySpectatorSnapshot(s, frame(env("g1", 5, "snapshot")));
  const r = applySpectatorEnvelope(s, frame(env("g1", 6, "move", { replayVersion: 11 })));
  ok(r.signal === "incompatible_version", "replay-version drift rejected");
  ok(s.lastAppliedSeq === -1, "replay drift drops the baseline (forces resync)");
}

// --- clock applied out of band (no seq gate, never deduped) ---
{
  const s = createSpectatorSync();
  beginWatch(s, "g1");
  applySpectatorSnapshot(s, frame(env("g1", 5, "snapshot")));
  const c1 = applySpectatorEnvelope(s, frame(env("g1", 5, "clock")));
  ok(c1.signal === "applied" && c1.apply.length === 1, "clock at the current seq still applies");
  const c2 = applySpectatorEnvelope(s, frame(env("g1", 5, "clock")));
  ok(c2.signal === "applied", "a second clock at the same seq is not deduped");
  ok(s.lastAppliedSeq === 5, "clock does not advance the applied seq");
}

// --- newer snapshot replaces; older snapshot ignored ---
{
  const s = createSpectatorSync();
  beginWatch(s, "g1");
  applySpectatorSnapshot(s, frame(env("g1", 5, "snapshot")));
  applySpectatorEnvelope(s, frame(env("g1", 6, "move")));
  const newer = applySpectatorEnvelope(s, frame(env("g1", 20, "snapshot")));
  ok(newer.signal === "snapshot_replaced" && s.lastAppliedSeq === 20, "newer snapshot replaces state wholesale");
  const older = applySpectatorEnvelope(s, frame(env("g1", 10, "snapshot")));
  ok(older.signal === "ignored" && s.lastAppliedSeq === 20, "older snapshot ignored (never rewinds)");
}

// --- a live frame before the snapshot is buffered, then unblocked ---
{
  const s = createSpectatorSync();
  beginWatch(s, "g1");
  const early = applySpectatorEnvelope(s, frame(env("g1", 6, "move")));
  ok(early.signal === "buffered", "live frame before baseline is buffered, not applied");
  const snap = applySpectatorSnapshot(s, frame(env("g1", 5, "snapshot")));
  ok(snap.apply.map((f) => f.env.seq).join(",") === "5,6", "snapshot drains the pre-buffered frame");
}

// --- parity check ---
{
  ok(checkSpectatorParity("h6", "h6", { gameId: "g1", seq: 6 }).ok, "matching hash passes parity");
  const mm = checkSpectatorParity("h6", "hX", { gameId: "g1", seq: 6, side: "spectator" });
  ok(!mm.ok && mm.diag?.event === "tv_hash_mismatch", "mismatched hash fails parity with diagnostic");
  ok(checkSpectatorParity("", "hX", { gameId: "g1", seq: 6 }).ok, "empty expected hash passes (legacy frame)");
}

// --- switch fully clears state ---
{
  const s = createSpectatorSync();
  beginWatch(s, "g1");
  applySpectatorSnapshot(s, frame(env("g1", 5, "snapshot")));
  applySpectatorEnvelope(s, frame(env("g1", 9, "move")));
  ok(beginWatch(s, "g2") === true, "switching game returns true");
  ok(s.gameId === "g2" && s.lastAppliedSeq === -1 && s.pending.size === 0, "switch clears seq + buffer");
  endWatch(s);
  ok(s.gameId === null && s.lastAppliedSeq === -1, "endWatch clears everything");
}

console.log("");
if (failures) {
  console.log(`SPECTATOR-SYNC: ${failures} FAILURE(S)`);
  process.exit(1);
} else {
  console.log("SPECTATOR-SYNC: all checks passed");
}
