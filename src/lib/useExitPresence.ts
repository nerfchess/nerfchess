"use client";

import { useEffect, useState } from "react";

import { dur } from "@/lib/motion";

/**
 * Keep a closing element mounted long enough for its mirrored exit.
 *
 *   const pop = useExitPresence(open);
 *   {pop.mounted && <div className="m-pop" data-leaving={pop.leaving ? "" : undefined}>...}
 *
 * `leaving` is true from the moment `open` goes false until the exit has had
 * --dur-1 (scaled by the Animations tempo) to play; then `mounted` drops.
 * Reopening mid-exit cancels the exit, so a quick close and reopen never
 * blinks. With motion off the exit takes no time and the element unmounts on
 * the next tick.
 */
export function useExitPresence(open: boolean): { mounted: boolean; leaving: boolean } {
  const [mounted, setMounted] = useState(open);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setMounted(true);
  }
  const leaving = mounted && !open;
  useEffect(() => {
    if (!leaving) return;
    const id = window.setTimeout(() => setMounted(false), dur(1));
    return () => window.clearTimeout(id);
  }, [leaving]);
  return { mounted: mounted || open, leaving };
}
