"use client";

// The skeleton timing contract (brief section 5.2): a skeleton waits ~150ms
// before it shows, and once it has shown it stays a minimum time, so a fast
// load looks instant and a slow one looks calm instead of popping after a few
// frames.
//
// The show-delay is CSS: `.skeleton` fades in after `--skeleton-delay` (150ms,
// globals.css) and keeps its box the whole time, so nothing moves. That half
// needs no JS. The minimum duration does, because only the component knows
// when its data arrived. This hook is that half, for skeletons a client
// component swaps out when its data lands:
//
//   const held = useSkeletonHold(!rows && !error);
//   {error ? <Failed/> : !rows || held ? <RowsSkeleton/> : <Rows rows={rows}/>}
//
// - Data inside the show-delay: the skeleton was never visible (opacity 0 in
//   its reserved box), so the content replaces it at once. Fast loads look
//   instant.
// - Data after the skeleton showed: the skeleton stays until it has been on
//   screen for SKELETON_MIN_MS, then the content replaces it. No 40ms flash.
//
// When the clock starts matters. A skeleton a client render puts in the page
// starts its CSS show-delay when it commits, so the hook starts its clock in
// the layout effect. A skeleton that came in the server HTML (a hard load of
// /leaderboard, /clubs, /tournaments, /inbox, /community) started its delay at
// first paint, often a second or more before hydration. For a loading spell
// that is already on at hydration, the clock starts at first contentful paint,
// so a skeleton that has already been up long enough is not held again.
//
// The swap happens before paint (layout effect), so a fast load never paints
// one extra frame of the invisible skeleton. The hold only delays the swap;
// the skeleton and the content are drawn at the same geometry by each caller,
// so the hold never changes layout. Errors are not held: callers check their
// error first.

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

/** Must match `--skeleton-delay` on `.skeleton` in globals.css. */
export const SKELETON_DELAY_MS = 150;
/** How long a skeleton stays once it has become visible. */
export const SKELETON_MIN_MS = 400;

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/**
 * When the server HTML was first painted, on the performance.now() clock: the
 * first-contentful-paint entry, else first-paint, else the time origin (the
 * page has painted by the time it hydrates).
 */
function firstPaintAt(): number {
  if (typeof performance === "undefined" || typeof performance.getEntriesByType !== "function") return 0;
  const paints = performance.getEntriesByType("paint");
  const fcp = paints.find((e) => e.name === "first-contentful-paint") ?? paints.find((e) => e.name === "first-paint");
  return fcp ? fcp.startTime : 0;
}

const noSubscribe = () => () => {};
/** True in the render that hydrates server HTML, false in a client render. */
const useIsHydrating = () =>
  useSyncExternalStore(
    noSubscribe,
    () => false,
    () => true,
  );

/**
 * True while the caller should keep drawing its skeleton: while `loading`, and
 * after it, until a skeleton that became visible has been up SKELETON_MIN_MS.
 */
export function useSkeletonHold(loading: boolean): boolean {
  const [held, setHeld] = useState(loading);
  // When the current loading spell was committed (the skeleton went into the
  // page and its CSS show-delay started), or null.
  const startedAt = useRef<number | null>(null);
  // Whether this instance mounted by hydrating server HTML. Read once: only the
  // loading spell that is on at mount can have a server-rendered skeleton.
  const hydrating = useIsHydrating();
  const mountedHydrating = useRef<boolean | null>(null);
  if (mountedHydrating.current === null) mountedHydrating.current = hydrating;
  const firstSpell = useRef(true);

  useIsoLayoutEffect(() => {
    const first = firstSpell.current;
    firstSpell.current = false;
    if (loading) {
      if (startedAt.current === null) startedAt.current = first && mountedHydrating.current ? firstPaintAt() : now();
      setHeld(true);
      return undefined;
    }
    const start = startedAt.current;
    startedAt.current = null;
    if (start === null) {
      setHeld(false);
      return undefined;
    }
    const visibleAt = start + SKELETON_DELAY_MS;
    const t = now();
    const wait = t < visibleAt ? 0 : visibleAt + SKELETON_MIN_MS - t;
    if (wait <= 0) {
      setHeld(false);
      return undefined;
    }
    const id = setTimeout(() => setHeld(false), wait);
    return () => clearTimeout(id);
  }, [loading]);

  return loading || held;
}
