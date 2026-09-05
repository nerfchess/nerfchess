"use client";

// Frame-time governor: samples requestAnimationFrame deltas while `sampling`
// is true and calls `onSlow` once when sustained slowness is seen (12 of 20
// consecutive frames over 40ms, ignoring tab-hidden gaps over 500ms). The
// same shape DraftOverlay's ambient auto-calm uses, shared so the 3D board
// layer measures the same way. A 1200ms warm-up skips mount jank.

import { useEffect, useRef } from "react";

export function useFrameGovernor(sampling: boolean, onSlow: () => void, opts?: { warmupMs?: number; windowFrames?: number; slowFrames?: number; slowMs?: number }) {
  const cb = useRef(onSlow);
  useEffect(() => {
    cb.current = onSlow;
  });
  useEffect(() => {
    if (!sampling) return;
    const warmup = opts?.warmupMs ?? 1200;
    const windowFrames = opts?.windowFrames ?? 20;
    const slowFrames = opts?.slowFrames ?? 12;
    const slowMs = opts?.slowMs ?? 40;
    let raf = 0;
    let frames = 0;
    let slow = 0;
    let last = 0;
    let done = false;
    const loop = (t: number) => {
      if (done) return;
      if (last > 0) {
        const dt = t - last;
        if (dt > slowMs && dt < 500) slow++;
        if (dt < 500) frames++;
        if (frames >= windowFrames) {
          if (slow >= slowFrames) {
            done = true;
            cb.current();
            return;
          }
          frames = 0;
          slow = 0;
        }
      }
      last = t;
      raf = requestAnimationFrame(loop);
    };
    const timer = window.setTimeout(() => {
      raf = requestAnimationFrame(loop);
    }, warmup);
    return () => {
      done = true;
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
    // opts are plain numbers read once per sampling window.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampling]);
}
