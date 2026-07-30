// Deterministic spectator event-sync reducer.
//
// A spectator (the full /game/[id] watch, Nerf Chess TV, the landing-page hero,
// and the profile current-game card) receives a live stream of SpectatorEnvelope
// frames over an MPSession. This module is the SINGLE source of truth for how a
// consumer turns that stream into ordered, deduped, version-checked state
// transitions. Every consumer routes its frames through applySpectatorEnvelope
// so the ordering, gap, resync, and parity rules are implemented exactly once.
//
// It never touches the board itself: it is a pure ordering/authority layer that
// tells the caller WHICH frames to apply, in what order, and when to throw the
// local state away and re-fetch. The caller applies the returned frames through
// the real engine reconstruction (featuredBoard / buildSpectatorDraftGame) and
// only afterward recomputes its own public-state hash to feed back into the
// parity check. Because the reducer is synchronous and side-effect free, a
// consumer physically cannot let an animation block canonical state
// application: it applies the frames first, then fires any flourish.
//
// The rules (mirrored from the approved design):
//   WRONG GAME  env.gameId != watched id       -> drop silently (stale socket).
//   BAD VERSION env.schemaVersion != supported  -> reject, structured error.
//               env.replayVersion drift          -> reject, request resync.
//   DUPLICATE   env.seq <= lastAppliedSeq        -> drop (no double-apply).
//   IN ORDER    env.seq == lastAppliedSeq + 1    -> apply + drain buffered run.
//   REORDER     env.seq >  lastAppliedSeq + 1    -> buffer, start the gap clock.
//   GAP         buffer window elapses / overflow -> resync (fresh snapshot).
//   SNAPSHOT    seq >= lastAppliedSeq            -> replace local state wholesale.
//   PARITY      local hash != env.publicHash     -> stop, resync.
//   CLOCK       type == "clock"                  -> apply out of band (no seq gate).
//
// The header carries only public metadata, so nothing here can leak a secret
// nerf id, an unrevealed card, a private offer, or a future delayed event: the
// reducer only ever reads ids, versions, a seq, a timestamp, and a public hash.

import type { SpectatorEnvelope, SpectatorEnvelopeType } from "@/lib/multiplayer";
import { PUBLIC_SNAPSHOT_VERSION } from "@/engine/game";

/** One live frame: the server header plus the (public) payload body the header
 *  describes. The payload is opaque here; the caller interprets it by env.type. */
export interface SpectatorFrame {
  env: SpectatorEnvelope;
  payload: unknown;
}

/** Structured diagnostic for the telemetry beacon. Carries ids, versions,
 *  seqs, and hashes ONLY -- never any board or private state. `event` is the
 *  stable name a later telemetry stage forwards to the desync-style sink. */
export interface SpectatorSyncDiag {
  event:
    | "tv_snapshot_invalid"
    | "tv_event_gap"
    | "tv_snapshot_resync"
    | "tv_hash_mismatch"
    | "tv_wrong_game";
  gameId: string;
  seq: number;
  /** For a version reject: what the frame claimed. */
  got?: number | string;
  /** For a version reject / hash mismatch: what the client expected. */
  expected?: number | string;
  /** For a hash mismatch: the side reporting it (advisory). */
  side?: string;
}

export type SpectatorSyncSignal =
  | "wrong_game"
  | "incompatible_version"
  | "duplicate"
  | "buffered"
  | "applied"
  | "snapshot_replaced"
  | "resync"
  | "ignored";

export interface SpectatorSyncResult {
  signal: SpectatorSyncSignal;
  /** Frames the caller must apply IN ORDER. Non-empty only on "applied" (one
   *  frame plus any buffered run it unblocked) and "snapshot_replaced" (the one
   *  authoritative snapshot frame, applied by wholesale replacement). */
  apply: SpectatorFrame[];
  /** Set on "incompatible_version", "resync", and "wrong_game": forward to the
   *  telemetry beacon. Never carries state. */
  diag?: SpectatorSyncDiag;
}

export interface SpectatorSyncState {
  /** The game currently watched. Frames for any other id are dropped. */
  gameId: string | null;
  /** Highest seq applied in order. -1 before the first authoritative snapshot,
   *  which is also the "please resync" sentinel a fresh snapshot clears. */
  lastAppliedSeq: number;
  /** REPLAY_VERSION adopted from the join snapshot; a live frame that drifts
   *  from it means the server redeployed and we must resync. null until known. */
  sessionReplayVersion: number | null;
  /** Out-of-order frames held for the reorder window, keyed by seq. */
  pending: Map<number, SpectatorFrame>;
  /** When the current gap was first observed (ms), or null when contiguous. */
  gapSince: number | null;
  /** publicHash of the last applied envelope (for the parity check). */
  lastHash: string | null;
  /** The server is emitting a PUBLIC_SNAPSHOT_VERSION this bundle cannot read.
   * Unlike a replayVersion drift, re-watching cannot fix this: the fresh
   * wstart fails the identical check, so asking for a resync just loops on
   * every frame. Latched here so the caller stops re-watching and can prompt a
   * reload instead. Cleared only by switching game or ending the watch. */
  protocolStalled: boolean;
}

export interface SpectatorSyncConfig {
  /** How long a gap may persist before we give up and resync. Default 1500ms. */
  reorderWindowMs: number;
  /** How many out-of-order frames we buffer before forcing a resync. */
  maxPending: number;
}

export const DEFAULT_SYNC_CONFIG: SpectatorSyncConfig = {
  reorderWindowMs: 1500,
  maxPending: 32,
};

/** Types the reducer sequences. A "clock" frame is intentionally NOT here: it
 *  is applied out of band because clocks are excluded from the parity hash and
 *  a clock update must never be dropped by seq dedupe. */
const SEQUENCED_TYPES: ReadonlySet<SpectatorEnvelopeType> = new Set([
  "move",
  "draftUsed",
  "draftResolved",
  "draftState",
  "draftDiff",
  "end",
  "takeback",
]);

/** A fresh, unbound sync state (before any game is watched). */
export function createSpectatorSync(): SpectatorSyncState {
  return {
    gameId: null,
    lastAppliedSeq: -1,
    sessionReplayVersion: null,
    pending: new Map(),
    gapSince: null,
    lastHash: null,
    protocolStalled: false,
  };
}

/** Reset every field in place. Used on a hard switch and before adopting a new
 *  baseline. Keeps the same object so a caller holding a ref stays valid. */
function hardReset(state: SpectatorSyncState) {
  state.gameId = null;
  state.lastAppliedSeq = -1;
  state.sessionReplayVersion = null;
  state.pending.clear();
  state.gapSince = null;
  state.lastHash = null;
  state.protocolStalled = false;
}

/**
 * Switch the watched game. Fully clears ordering/buffer/hash state so no frame
 * from the old game can be applied to the new one. Idempotent: re-binding to the
 * SAME id is a no-op (returns false), so a caller can guard against duplicate
 * subscriptions by only (re)subscribing when this returns true.
 */
export function beginWatch(state: SpectatorSyncState, gameId: string): boolean {
  if (state.gameId === gameId) return false;
  hardReset(state);
  state.gameId = gameId;
  return true;
}

/** Unsubscribe entirely: clears the game and all local ordering state. The
 *  caller separately clears its board/clocks/timers. */
export function endWatch(state: SpectatorSyncState) {
  hardReset(state);
}

/** True when the server's snapshot schema is newer than this bundle can read.
 *  Terminal for the session: no rewatch can clear it, so a consumer should stop
 *  re-watching and prompt the viewer to reload rather than spin. */
export function isProtocolStalled(state: SpectatorSyncState): boolean {
  return state.protocolStalled;
}

/** True once we hold an authoritative baseline (a snapshot has been adopted).
 *  Before that, live frames cannot be ordered and are held or dropped. */
export function hasBaseline(state: SpectatorSyncState): boolean {
  return state.lastAppliedSeq >= 0;
}

/** Mark the session as needing a fresh snapshot: drop the baseline and buffer so
 *  the next snapshot replaces state wholesale. The caller should re-watch. */
export function requestResync(state: SpectatorSyncState) {
  state.lastAppliedSeq = -1;
  state.sessionReplayVersion = null;
  state.pending.clear();
  state.gapSince = null;
}

/**
 * Adopt an authoritative public snapshot (a "snapshot"-type envelope, delivered
 * on watch-start or on a resync rewatch). A snapshot whose seq is at least the
 * current baseline REPLACES local state wholesale; an older one is ignored so a
 * late-arriving stale snapshot never rewinds a live board. On adoption the
 * pending buffer is drained of any frames that are now contiguous.
 */
export function applySpectatorSnapshot(
  state: SpectatorSyncState,
  frame: SpectatorFrame,
): SpectatorSyncResult {
  const env = frame.env;
  if (state.gameId !== null && env.gameId !== state.gameId) {
    return {
      signal: "wrong_game",
      apply: [],
      diag: { event: "tv_wrong_game", gameId: env.gameId, seq: env.seq },
    };
  }
  if (env.schemaVersion !== PUBLIC_SNAPSHOT_VERSION) {
    // Latch it: a rewatch cannot clear this. spectatorBaselineEnvelope applies
    // the same check to the fresh wstart and returns null, so no new baseline
    // is ever adopted — without the latch the caller re-watched on every single
    // frame for as long as the tab stayed open after a deploy that bumped
    // PUBLIC_SNAPSHOT_VERSION.
    state.protocolStalled = true;
    return {
      signal: "incompatible_version",
      apply: [],
      diag: {
        event: "tv_snapshot_invalid",
        gameId: env.gameId,
        seq: env.seq,
        got: env.schemaVersion,
        expected: PUBLIC_SNAPSHOT_VERSION,
      },
    };
  }
  // An older snapshot than what we already show is stale; never rewind.
  if (state.lastAppliedSeq >= 0 && env.seq < state.lastAppliedSeq) {
    return { signal: "ignored", apply: [] };
  }
  // Bind the game if this is the first snapshot after a bare beginWatch.
  if (state.gameId === null) state.gameId = env.gameId;
  state.lastAppliedSeq = env.seq;
  state.sessionReplayVersion = env.replayVersion;
  state.lastHash = env.publicHash;
  state.gapSince = null;
  // Drop anything at or below the new baseline; keep strictly-later frames.
  for (const seq of [...state.pending.keys()]) {
    if (seq <= env.seq) state.pending.delete(seq);
  }
  const drained = drainContiguous(state);
  return {
    signal: "snapshot_replaced",
    apply: [frame, ...drained],
  };
}

/**
 * Ingest one live event frame. Returns the ordered run the caller should apply
 * (possibly several frames when a buffered gap just filled), or a control
 * signal (duplicate / buffered / wrong_game / incompatible_version / resync).
 */
export function applySpectatorEnvelope(
  state: SpectatorSyncState,
  frame: SpectatorFrame,
  config: SpectatorSyncConfig = DEFAULT_SYNC_CONFIG,
  now: number = Date.now(),
): SpectatorSyncResult {
  const env = frame.env;

  // A "snapshot" envelope routes to the wholesale-replace path.
  if (env.type === "snapshot") return applySpectatorSnapshot(state, frame);

  // WRONG GAME: a frame left over from a socket that has since switched games.
  if (state.gameId !== null && env.gameId !== state.gameId) {
    return {
      signal: "wrong_game",
      apply: [],
      diag: { event: "tv_wrong_game", gameId: env.gameId, seq: env.seq },
    };
  }

  // INCOMPATIBLE VERSION: reject and ask for a fresh snapshot rather than
  // rendering a board we may misinterpret.
  if (env.schemaVersion !== PUBLIC_SNAPSHOT_VERSION) {
    // Latch it: a rewatch cannot clear this. spectatorBaselineEnvelope applies
    // the same check to the fresh wstart and returns null, so no new baseline
    // is ever adopted — without the latch the caller re-watched on every single
    // frame for as long as the tab stayed open after a deploy that bumped
    // PUBLIC_SNAPSHOT_VERSION.
    state.protocolStalled = true;
    return {
      signal: "incompatible_version",
      apply: [],
      diag: {
        event: "tv_snapshot_invalid",
        gameId: env.gameId,
        seq: env.seq,
        got: env.schemaVersion,
        expected: PUBLIC_SNAPSHOT_VERSION,
      },
    };
  }
  if (
    state.sessionReplayVersion !== null &&
    env.replayVersion !== state.sessionReplayVersion
  ) {
    requestResync(state);
    return {
      signal: "incompatible_version",
      apply: [],
      diag: {
        event: "tv_snapshot_invalid",
        gameId: env.gameId,
        seq: env.seq,
        got: env.replayVersion,
        expected: state.sessionReplayVersion,
      },
    };
  }

  // CLOCK: applied out of band. Clocks are excluded from the parity hash and
  // must never be dropped by seq dedupe, so a clock frame is always delivered
  // once we hold a baseline (before that there is no board to time).
  if (env.type === "clock") {
    if (!hasBaseline(state)) return { signal: "ignored", apply: [] };
    return { signal: "applied", apply: [frame] };
  }

  // Only the ordered board/draft events are sequenced past here.
  if (!SEQUENCED_TYPES.has(env.type)) {
    return { signal: "ignored", apply: [] };
  }

  // No authoritative baseline yet (a live frame beat the join snapshot): hold it
  // until the snapshot lands, so nothing is applied to an empty board.
  if (!hasBaseline(state)) {
    return bufferFrame(state, frame, config, now);
  }

  // DUPLICATE: already applied (a re-delivery after reconnect, or an echo).
  if (env.seq <= state.lastAppliedSeq) {
    return { signal: "duplicate", apply: [] };
  }

  // IN ORDER: apply this frame and any buffered run it unblocks.
  if (env.seq === state.lastAppliedSeq + 1) {
    state.lastAppliedSeq = env.seq;
    state.lastHash = env.publicHash;
    const drained = drainContiguous(state);
    if (state.pending.size === 0) state.gapSince = null;
    return { signal: "applied", apply: [frame, ...drained] };
  }

  // REORDER: a later frame arrived before the gap filled -> buffer it.
  return bufferFrame(state, frame, config, now);
}

/** Buffer an out-of-order frame; force a resync if the buffer overflows. */
function bufferFrame(
  state: SpectatorSyncState,
  frame: SpectatorFrame,
  config: SpectatorSyncConfig,
  now: number,
): SpectatorSyncResult {
  state.pending.set(frame.env.seq, frame);
  if (state.gapSince === null) state.gapSince = now;
  if (state.pending.size > config.maxPending) {
    const seq = frame.env.seq;
    const gameId = frame.env.gameId;
    requestResync(state);
    return {
      signal: "resync",
      apply: [],
      diag: { event: "tv_snapshot_resync", gameId, seq },
    };
  }
  return { signal: "buffered", apply: [] };
}

/** Pop the contiguous run of buffered frames that now follows lastAppliedSeq,
 *  advancing the baseline and hash as it drains. */
function drainContiguous(state: SpectatorSyncState): SpectatorFrame[] {
  const out: SpectatorFrame[] = [];
  let next = state.lastAppliedSeq + 1;
  while (state.pending.has(next)) {
    const f = state.pending.get(next)!;
    state.pending.delete(next);
    state.lastAppliedSeq = next;
    state.lastHash = f.env.publicHash;
    out.push(f);
    next++;
  }
  return out;
}

/**
 * Timer tick: call periodically (or on each frame) to give up on a gap that
 * never filled. When the reorder window has elapsed with frames still stranded
 * in the buffer, we drop the baseline and ask the caller to rewatch for a fresh
 * authoritative snapshot -- this is what stops one dropped frame from freezing a
 * spectator forever. Returns a resync result to act on, or null when healthy.
 */
export function sweepSpectatorSync(
  state: SpectatorSyncState,
  config: SpectatorSyncConfig = DEFAULT_SYNC_CONFIG,
  now: number = Date.now(),
): SpectatorSyncResult | null {
  if (state.gapSince === null) return null;
  if (now - state.gapSince < config.reorderWindowMs) return null;
  const gameId = state.gameId ?? "";
  const seq = state.lastAppliedSeq;
  requestResync(state);
  return {
    signal: "resync",
    apply: [],
    diag: { event: "tv_event_gap", gameId, seq },
  };
}

// ---------------------------------------------------------------------------
// Consumer routing helpers
//
// Thin adapters that let a production consumer (the full spectator view, the TV
// featured board) route its live MPSession frames through the reducer above
// without re-implementing the ordering contract. The consumer keeps its own
// board model; these only decide WHICH payloads to apply, in order, and when to
// re-watch. The payload is opaque here (the caller casts it back to its event).
// ---------------------------------------------------------------------------

export interface SpectatorRoute {
  /** Payloads the caller must apply IN ORDER (the events it stored on the
   *  frames). Empty when the frame was buffered / deduped / dropped. */
  apply: unknown[];
  /** True when the caller must re-issue session.watch() so a fresh wstart
   *  replaces state wholesale (a gap timed out, the buffer overflowed, or the
   *  server's version drifted). */
  resync: boolean;
}

/**
 * Route ONE live frame. A frame WITHOUT an envelope (an older server, or a
 * player frame) predates the ordered protocol, so it is applied directly,
 * bypassing the reducer -- plain non-spectator play never regresses. A frame
 * with an envelope is sequenced/deduped/gap-checked; the returned `apply` is
 * the ordered run to apply (one frame plus any buffered run it unblocked), and
 * `resync` asks the caller to re-watch.
 */
export function routeSpectatorLiveFrame(
  state: SpectatorSyncState,
  env: SpectatorEnvelope | undefined,
  payload: unknown,
  config: SpectatorSyncConfig = DEFAULT_SYNC_CONFIG,
  now: number = Date.now(),
): SpectatorRoute {
  if (!env) return { apply: [payload], resync: false };
  const r = applySpectatorEnvelope(state, { env, payload }, config, now);
  if (r.signal === "resync" || r.signal === "incompatible_version") {
    // A stalled protocol is not resyncable — asking would loop forever (see
    // protocolStalled). Report the frame as unapplied and let the caller
    // surface a reload prompt via isProtocolStalled().
    return { apply: [], resync: !state.protocolStalled };
  }
  return { apply: r.apply.map((f) => f.payload), resync: false };
}

/**
 * Adopt a wstart as the authoritative baseline. The caller has already rebuilt
 * its board from the wstart payload directly, so the snapshot frame itself is
 * dropped from the returned run; only the DRAINED buffered live frames (events
 * that beat the snapshot) are returned to apply on top.
 */
export function routeSpectatorBaseline(
  state: SpectatorSyncState,
  env: SpectatorEnvelope,
): SpectatorRoute {
  const r = applySpectatorSnapshot(state, { env, payload: null });
  return { apply: r.apply.slice(1).map((f) => f.payload), resync: false };
}

/**
 * Build the "snapshot" envelope a wstart implies from its ordered-protocol
 * fields (seq / schemaVersion / replayVersion / publicHash). Returns null when
 * those fields are absent (a legacy server) or the schema is unsupported, in
 * which case the caller bypasses the reducer entirely and keeps the moves-only
 * bootstrap, exactly as before.
 */
export function spectatorBaselineEnvelope(setup: {
  id: string;
  seq?: number;
  schemaVersion?: number;
  replayVersion?: number;
  publicHash?: string;
}): SpectatorEnvelope | null {
  if (setup.seq == null || setup.schemaVersion == null || setup.replayVersion == null) {
    return null;
  }
  if (setup.schemaVersion !== PUBLIC_SNAPSHOT_VERSION) return null;
  return {
    gameId: setup.id,
    schemaVersion: setup.schemaVersion,
    replayVersion: setup.replayVersion,
    stateRevision: setup.seq,
    seq: setup.seq,
    type: "snapshot",
    publicHash: setup.publicHash ?? "",
    ts: Date.now(),
  };
}

export interface ParityCheckResult {
  ok: boolean;
  diag?: SpectatorSyncDiag;
}

/**
 * Parity check, run by the caller AFTER it has applied a frame and recomputed
 * publicStateHash over its own local public projection. `expected` is the
 * env.publicHash the applied frame carried. On a mismatch the caller must stop
 * incremental application and resync (this function does NOT mutate the sync
 * state -- the caller decides, then calls requestResync + rewatch), so a failed
 * visual can never strand a wrong board: the resync always lands on the
 * server-authoritative snapshot.
 */
export function checkSpectatorParity(
  expected: string,
  localHash: string,
  ctx: { gameId: string; seq: number; side?: string },
): ParityCheckResult {
  // An empty expected hash means the server did not stamp one (legacy frame);
  // treat as a pass rather than a spurious resync.
  if (!expected || expected === localHash) return { ok: true };
  return {
    ok: false,
    diag: {
      event: "tv_hash_mismatch",
      gameId: ctx.gameId,
      seq: ctx.seq,
      got: localHash,
      expected,
      side: ctx.side,
    },
  };
}
