// Pure featured-selection + candidate-health logic, factored out of
// useFeaturedTune so it can be unit tested without a React renderer or a live
// socket. The hook wires these into its effects; the rules themselves are
// deterministic functions over (candidates, failedIds, pinnedId) and a
// watch-start payload, so a headless harness can prove the failover and
// health-validation behavior directly.
//
// Kept intentionally free of React and of any socket/DOM import: this module is
// the single definition of "which candidate do we feature" and "is this
// watch-start a healthy game", shared by the hook and the test suite.

import { PUBLIC_SNAPSHOT_VERSION } from "@/engine/game";

/** Health verdict for a resolved watch-start (or a structured watch reject). */
export type WatchHealth = "ok" | "unavailable" | "incompatible_version";

/** The subset of an MPWatchStart the health check reads. Kept structural so a
 *  test can pass a bare object and the hook can pass the real payload. */
export interface WatchHealthInput {
  unavailable?: { code: string; replayVersion?: number } | null;
  schemaVersion?: number | null;
}

/**
 * Classify a watch-start as a health check. A structured `unavailable` frame
 * (the server could not reconstruct the game) or a snapshot whose schemaVersion
 * the client does not support is a FAILED check: the caller must not render a
 * board and must fail over. Everything else (including a legacy payload with no
 * schemaVersion) is healthy.
 */
export function watchStartHealth(setup: WatchHealthInput): WatchHealth {
  if (setup.unavailable) return "unavailable";
  if (setup.schemaVersion != null && setup.schemaVersion !== PUBLIC_SNAPSHOT_VERSION) {
    return "incompatible_version";
  }
  return "ok";
}

/** True when a watch-start passed its health check. */
export function isWatchStartHealthy(setup: WatchHealthInput): boolean {
  return watchStartHealth(setup) === "ok";
}

/**
 * Pick the featured candidate. An eligible + healthy pinned id wins; otherwise
 * the FIRST healthy candidate in the caller's ranked order. A candidate in
 * `failedIds` (exhausted its bounded backoff) is never selected, so a broken
 * featured game fails over to the next healthy one instead of being re-dialed
 * forever. Returns null when nothing healthy remains.
 */
export function selectFeaturedTarget(
  candidates: readonly string[],
  failedIds: ReadonlySet<string>,
  pinnedId: string | null,
): string | null {
  const pinnedEligible =
    pinnedId != null && candidates.includes(pinnedId) && !failedIds.has(pinnedId);
  if (pinnedEligible) return pinnedId;
  return candidates.find((id) => !failedIds.has(id)) ?? null;
}

/** The next healthy candidate to fail over to, skipping the current stream and
 *  everything already marked unhealthy. null when none remain. */
export function nextFailoverCandidate(
  candidates: readonly string[],
  failedIds: ReadonlySet<string>,
  currentId: string | null,
): string | null {
  return candidates.find((id) => id !== currentId && !failedIds.has(id)) ?? null;
}

/**
 * Prune the unhealthy set against the live directory: a candidate that dropped
 * out of `candidates` (gone from the lobby) is no longer "known failing", so a
 * transiently-stale game that recovers gets a fresh chance when it reappears.
 * Returns the SAME reference when nothing changed so a caller can skip a
 * needless state update.
 */
export function pruneFailedIds(
  prev: ReadonlySet<string>,
  candidates: readonly string[],
): Set<string> {
  const set = prev instanceof Set ? prev : new Set(prev);
  if (set.size === 0) return set;
  const next = new Set([...set].filter((id) => candidates.includes(id)));
  return next.size === set.size ? set : next;
}
