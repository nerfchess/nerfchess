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

const EMPTY_SET: ReadonlySet<string> = new Set();

/**
 * Pick the featured candidate, STICKILY, so a directory that re-ranks every
 * lobby poll does not tear down a healthy stream. Preference order:
 *
 *   (a) The PINNED id, when it is still eligible: neither failed nor ended, and
 *       either still listed in `candidates` or the id we are currently showing
 *       (`currentId`). Honoring a pin that is momentarily missing from a single
 *       poll but is the live board we are on makes a manual pick robust to a
 *       transient directory drop.
 *   (b) Otherwise the CURRENT stream id (`currentId`) when it is still listed and
 *       still eligible. This is the anti-churn rule: while the game we are
 *       already watching remains a healthy, listed candidate we keep showing it,
 *       even as `candidates[0]` flips around underneath us on each re-rank.
 *   (c) Otherwise the FIRST eligible candidate in the caller's ranked order.
 *
 * A candidate is INELIGIBLE if it is in `failedIds` (exhausted its bounded
 * backoff) or in `endedIds` (its game finished). Neither the current stream nor a
 * pin is sticky once it becomes ineligible, so a broken OR a just-finished
 * featured game immediately fails over to the next live candidate instead of
 * being clung to. The caller is expected to pass `currentId` as null once the
 * current game is over so an ended board can never win rules (a)/(b). Returns
 * null when nothing eligible remains (the caller then shows its recent-replay
 * fallback rather than spinning).
 *
 * Pure over its inputs: no React, no socket, no clock -- fully unit testable.
 */
export function selectFeaturedTarget(
  candidates: readonly string[],
  failedIds: ReadonlySet<string>,
  pinnedId: string | null,
  currentId: string | null = null,
  endedIds: ReadonlySet<string> = EMPTY_SET,
): string | null {
  const ineligible = (id: string) => failedIds.has(id) || endedIds.has(id);
  // (a) An eligible pin wins -- held across a single transient poll drop while it
  //     is still the live board we are showing.
  if (
    pinnedId != null &&
    !ineligible(pinnedId) &&
    (candidates.includes(pinnedId) || currentId === pinnedId)
  ) {
    return pinnedId;
  }
  // (b) Otherwise keep the game we are already showing while it stays a listed,
  //     eligible candidate -- this is what stops the per-poll churn.
  if (currentId != null && candidates.includes(currentId) && !ineligible(currentId)) {
    return currentId;
  }
  // (c) Otherwise the first eligible candidate in ranked order.
  return candidates.find((id) => !ineligible(id)) ?? null;
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
