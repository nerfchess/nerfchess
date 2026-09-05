"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FIRST_GAME_TOUR_HREF } from "@/components/tutorial/tourState";
import { fetchMe } from "@/lib/authClient";

// The "New here?" onboarding chip in the home hero: a quiet door into the guided
// first-game tour. It is aimed at brand-new players, so it only shows to someone
// who has never finished a match — a visitor with no account yet, or an account
// with zero games played. The moment a player has a game on record it hides
// itself. A "not new" control beside it also closes it out for good (persisted
// in localStorage under nerf.newHereDismissed) — after that the chip never shows
// again on this device.
const DISMISS_KEY = "nerf.newHereDismissed";

export function NewHereChip() {
  // "loading" until the stored flag is read on mount: the server can't know it,
  // so we render nothing on the first paint rather than flash the chip to a
  // returning player who already dismissed it (and avoid a hydration mismatch).
  const [state, setState] = useState<"loading" | "shown" | "hidden">("loading");

  useEffect(() => {
    let cancelled = false;
    // Deferred a microtask (the project's pattern for reading a stored flag after
    // mount) so the state settle isn't a synchronous set inside the effect body.
    queueMicrotask(() => {
      let dismissed = false;
      try {
        dismissed = localStorage.getItem(DISMISS_KEY) === "1";
      } catch {
        // localStorage unavailable — fall through to the games check.
      }
      if (dismissed) {
        if (!cancelled) setState("hidden");
        return;
      }
      // No stored "not new" flag: gate on match history. A visitor with no
      // account yet, or an account with zero games, is new and sees the chip;
      // anyone who has already played a match does not.
      fetchMe().then((me) => {
        if (cancelled) return;
        setState(me && me.games > 0 ? "hidden" : "shown");
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setState("hidden");
  };

  if (state !== "shown") return null;

  return (
    <div className="flex w-full items-center gap-1">
      <Link
        href={FIRST_GAME_TOUR_HREF}
        className="inline-flex min-w-0 flex-1 items-center gap-1.5 whitespace-nowrap border border-gold/40 bg-gold/10 px-2.5 py-1.5 text-[12px] text-gold-leaf no-underline transition-colors hover:bg-gold/20"
      >
        <span>New here?</span>
        <span className="hidden sm:inline">Learn the game in 3 minutes</span>
        <span aria-hidden>→</span>
      </Link>
      {/* "Not new" — a returning player closes the onboarding chip out for good. */}
      <button
        type="button"
        onClick={dismiss}
        title="Not new? Hide this"
        aria-label="Not new, hide the onboarding chip"
        className="inline-flex items-center gap-1 px-1.5 py-1 text-[12px] text-parchment-400 transition-colors hover:text-parchment-100"
        style={{ border: "1px solid var(--edge)" }}
      >
        <span className="hidden sm:inline">Not new</span>
        <span aria-hidden className="text-[13px] leading-none">×</span>
      </button>
    </div>
  );
}
