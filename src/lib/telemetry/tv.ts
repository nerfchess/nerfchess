"use client";

// Structured TV / spectator instrumentation.
//
// Every spectator surface (Nerf Chess TV, the landing-page hero, the full
// /game/[id] watch, and the profile "Playing Right Now" card) reports the same
// small set of lifecycle events through this ONE module, so tune-in health,
// snapshot/version rejects, resyncs, gaps, hash mismatches, failover, and the
// profile live-preview outcome are all observable with a uniform vocabulary.
//
// Privacy: the field allowlist below is the ONLY thing that leaves the client.
// It carries public ids, versions, seqs, hashes, and reasons ONLY. It can never
// carry a secret nerf id, an unrevealed draft card, a private offer, private
// chat, an auth secret, or any board state, because emit() copies exactly the
// allowlisted keys and drops everything else. The sink (/api/tv-telemetry)
// mirrors the /api/desync discipline: it console.warns a single structured line
// and never persists a row, so a mis-firing client cannot bloat storage.

/** Every instrumented event. Stable names a downstream sink can group on. */
export type TvTelemetryEvent =
  | "tv_tune_started"
  | "tv_tune_succeeded"
  | "tv_tune_failed"
  | "tv_snapshot_invalid"
  | "tv_snapshot_resync"
  | "tv_event_gap"
  | "tv_hash_mismatch"
  | "tv_candidate_skipped"
  | "tv_failover_succeeded"
  | "tv_game_switched"
  | "profile_live_preview_succeeded"
  | "profile_live_preview_failed";

/** Which surface emitted the event (advisory grouping only). */
export type TvSurface = "tv" | "hero" | "spectate" | "profile";

/**
 * The structured payload an event may carry. Every field is optional and every
 * field is PUBLIC: ids, versions, seqs, a snapshot age, a boolean/pair hash
 * signal, a failure reason, a retry count, a failover candidate id, and the
 * client build. Nothing here is or derives from a secret nerf, an unrevealed
 * card, a private offer, private chat, or board state.
 */
export interface TvTelemetryFields {
  /** The game the event concerns. */
  gameId?: string;
  /** The game's public section, when known. */
  mode?: "nerf" | "buff" | null;
  /** The active TV channel filter ("all" | "nerf" | "buff" | "hero" | ...). */
  filter?: string;
  /** The last board-mutating card id observed (public, revealed cards only). */
  cardId?: string;
  /** PUBLIC_SNAPSHOT_VERSION the frame/snapshot assumed. */
  schemaVersion?: number;
  /** Public state revision (== seq) the event concerns. */
  revision?: number;
  /** The seq the client expected next (for a gap / reorder). */
  expectedSeq?: number;
  /** The seq the frame actually carried. */
  receivedSeq?: number;
  /** Age of the adopted snapshot in ms (capturedAtMs -> now), when known. */
  snapshotAgeMs?: number;
  /** Hash-mismatch signal: hashes ONLY, never state. */
  hashMismatch?: { expected: string; got: string };
  /** Validation / subscription failure reason ("not_found", "timeout",
   *  "unavailable", "incompatible_version", "no_seat", "disconnect", ...). */
  reason?: string;
  /** How many retries had been spent when the event fired. */
  retryCount?: number;
  /** The next candidate a failover advanced to. */
  candidate?: string;
  /** The side reporting a hash mismatch (advisory: "spectator" | "w" | "b"). */
  side?: string;
}

// The build the client is running, so a report can be attributed to a release.
// Public and non-secret; a plain env value with a stable fallback.
export const CLIENT_BUILD_VERSION: string =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BUILD_VERSION) || "dev";

// Allowlisted keys copied onto the wire payload. Anything not in here is
// dropped, so a caller physically cannot smuggle a private value through.
const ALLOWED_KEYS: readonly (keyof TvTelemetryFields)[] = [
  "gameId",
  "mode",
  "filter",
  "cardId",
  "schemaVersion",
  "revision",
  "expectedSeq",
  "receivedSeq",
  "snapshotAgeMs",
  "hashMismatch",
  "reason",
  "retryCount",
  "candidate",
  "side",
];

// Per-page-load cap. A wedged client that loops a resync must not flood the
// sink; once the cap is hit we stop beaconing (local console.debug still fires
// in development so a developer can see the loop).
const MAX_BEACONS_PER_LOAD = 200;
let beaconCount = 0;

function sanitize(fields: TvTelemetryFields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ALLOWED_KEYS) {
    const v = fields[key];
    if (v === undefined) continue;
    if (key === "hashMismatch" && v && typeof v === "object") {
      const h = v as { expected?: unknown; got?: unknown };
      out.hashMismatch = {
        expected: typeof h.expected === "string" ? h.expected.slice(0, 16) : "",
        got: typeof h.got === "string" ? h.got.slice(0, 16) : "",
      };
      continue;
    }
    if (typeof v === "string") out[key] = v.slice(0, 48);
    else out[key] = v;
  }
  return out;
}

/**
 * Report one TV/spectator event. Fire-and-forget: a failed beacon never disturbs
 * the tune / resync that is the real work. Only the allowlisted public fields
 * leave the client. Safe to call in SSR (no-ops without a browser).
 */
export function emitTv(
  event: TvTelemetryEvent,
  surface: TvSurface,
  fields: TvTelemetryFields = {},
): void {
  if (typeof window === "undefined") return;
  const payload = {
    event,
    surface,
    build: CLIENT_BUILD_VERSION,
    ...sanitize(fields),
  };
  if (process.env.NODE_ENV !== "production") {
    // Visible during local development without needing the network tab.
    console.debug("TV", payload);
  }
  if (beaconCount >= MAX_BEACONS_PER_LOAD) return;
  beaconCount++;
  try {
    void fetch("/api/tv-telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // A telemetry failure is never allowed to surface to the user.
  }
}

/**
 * Map a spectatorSync diagnostic (from applySpectatorEnvelope / the parity
 * check) onto the telemetry vocabulary. Keeps the sync reducer free of any
 * transport concern: it emits pure structured diags, and this bridges them to
 * the sink. `tv_wrong_game` is intentionally not reported (a stale frame after a
 * switch is expected and would be noise).
 */
export function emitTvSyncDiag(
  diag: {
    event: "tv_snapshot_invalid" | "tv_event_gap" | "tv_snapshot_resync" | "tv_hash_mismatch" | "tv_wrong_game";
    gameId: string;
    seq: number;
    got?: number | string;
    expected?: number | string;
    side?: string;
  },
  surface: TvSurface,
  extra: Pick<TvTelemetryFields, "mode" | "filter"> = {},
): void {
  if (diag.event === "tv_wrong_game") return;
  const fields: TvTelemetryFields = {
    gameId: diag.gameId,
    revision: diag.seq,
    ...extra,
  };
  if (diag.event === "tv_snapshot_invalid") {
    if (typeof diag.got === "number") fields.schemaVersion = diag.got;
    fields.reason = "incompatible_version";
  } else if (diag.event === "tv_hash_mismatch") {
    fields.hashMismatch = {
      expected: String(diag.expected ?? ""),
      got: String(diag.got ?? ""),
    };
    fields.side = diag.side;
  } else if (diag.event === "tv_event_gap" || diag.event === "tv_snapshot_resync") {
    fields.expectedSeq = typeof diag.seq === "number" ? diag.seq + 1 : undefined;
  }
  emitTv(diag.event, surface, fields);
}
