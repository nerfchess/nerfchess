"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FIRST_GAME_TOUR_HREF } from "@/components/tutorial/tourState";

// The "New here?" onboarding chip in the home hero: a quiet door into the guided
// first-game tour. It is aimed at brand-new players, so returning players get a
// "not new" control beside it that closes it out for good (persisted in
// localStorage under nerf.newHereDismissed) — after that the chip never shows
// again on this device.
const DISMISS_KEY = "nerf.newHereDismissed";

export function NewHereChip() {
  // "loading" until the stored flag is read on mount: the server can't know it,
  // so we render nothing on the first paint rather than flash the chip to a
  // returning player who already dismissed it (and avoid a hydration mismatch).
  const [state, setState] = useState<"loading" | "shown" | "hidden">("loading");

  useEffect(() => {
    // Deferred a microtask (the project's pattern for reading a stored flag after
    // mount) so the state settle isn't a synchronous set inside the effect body.
    queueMicrotask(() => {
      try {
        setState(localStorage.getItem(DISMISS_KEY) === "1" ? "hidden" : "shown");
      } catch {
        setState("shown");
      }
    });
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setState("hidden");
  };

  if (state !== "shown") return null;

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Link
        href={FIRST_GAME_TOUR_HREF}
        className="inline-flex items-center gap-1.5 border border-gold/40 bg-gold/10 px-2.5 py-1 text-[11px] text-gold-leaf no-underline transition-colors hover:bg-gold/20"
      >
        <span className="smallcaps">New here?</span>
        <span className="hidden sm:inline">Learn the game in 3 minutes</span>
        <span aria-hidden>→</span>
      </Link>
      {/* "Not new" — a returning player closes the onboarding chip out for good. */}
      <button
        type="button"
        onClick={dismiss}
        title="Not new? Hide this"
        aria-label="Not new, hide the onboarding chip"
        className="inline-flex items-center gap-1 border border-white/15 px-1.5 py-1 text-[10px] text-parchment-400 transition-colors hover:border-white/30 hover:text-parchment-100"
      >
        <span className="smallcaps hidden sm:inline">not new</span>
        <span aria-hidden className="text-[12px] leading-none">×</span>
      </button>
    </div>
  );
}
