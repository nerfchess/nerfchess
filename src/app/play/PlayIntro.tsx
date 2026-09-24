"use client";

// The top of /play above the setup card: the title, the first-game tour note
// and the door into the online lobby. Static, so it prerenders with the page
// and the route's loading.tsx renders the very same component.

import Link from "next/link";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  FIRST_GAME_TOUR_HREF,
  TUTORIAL_DONE_KEY,
  TUTORIAL_NUDGE_DISMISSED_KEY,
} from "@/components/tutorial/tourState";

export function PlayIntro() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Play the computer</h1>
          <p className="mt-1.5 text-[13px] text-parchment-300">
            Buff, Nerf, or plain chess. Casual, never rated.
          </p>
        </div>
      </div>

      <TourNudge />

      {/* This page is bot practice only. Anyone who came here wanting a real
          opponent gets a prominent door into the online lobby up top, so no
          one lands here and gets stuck. */}
      <Link
        href="/lobby"
        className="mt-4 plate group flex items-center gap-3 border-mode-buff/40 bg-mode-buff/5 p-3 no-underline transition-colors hover:border-mode-buff/70 hover:bg-mode-buff/10"
      >
        <span
          aria-hidden
          className="grid h-[44px] w-[44px] shrink-0 place-items-center border border-mode-buff/50 bg-mode-buff/10 text-mode-buffGlow"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-semibold text-parchment-50">Play online</span>
          <span className="block text-[13px] leading-snug text-parchment-300">
            Find a real opponent in the lobby.
          </span>
        </span>
        <span
          aria-hidden
          className="shrink-0 font-display text-sm font-semibold text-gold-leaf motion-safe:transition-transform motion-safe:duration-200 group-hover:translate-x-0.5"
        >
          &rarr;
        </span>
      </Link>
    </>
  );
}

// The tour note is local-storage state the server cannot see, so it is decided
// before the first paint instead of after it: the inline script below runs
// while the HTML is parsed and stamps html[data-tour-nudge] for a visitor who
// has neither finished the first-game tour nor dismissed this note, and the
// note's CSS shows it only under that stamp. Hydration then takes over from
// the same storage read. It used to appear a frame after hydration and push
// the door and the setup card down 58px (0.053 CLS on a phone, F006).
//
// The script is inline, so it only runs on a hard load. On a client-side
// navigation the component mounts fresh and the layout effect decides before
// the browser paints, so neither path shows the note and then moves it.
const TOUR_NUDGE_ATTR = "data-tour-nudge";
const TOUR_NUDGE_STAMP = `try{var s=window.localStorage;if(s.getItem(${JSON.stringify(TUTORIAL_DONE_KEY)})==null&&s.getItem(${JSON.stringify(TUTORIAL_NUDGE_DISMISSED_KEY)})==null)document.documentElement.setAttribute(${JSON.stringify(TOUR_NUDGE_ATTR)},"")}catch(e){}`;

// useLayoutEffect on the client, useEffect on the server (where a layout
// effect only warns).
const useClientLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

function readTourNudge(): boolean {
  try {
    return (
      window.localStorage.getItem(TUTORIAL_DONE_KEY) == null &&
      window.localStorage.getItem(TUTORIAL_NUDGE_DISMISSED_KEY) == null
    );
  } catch {
    // Storage unavailable: never nag.
    return false;
  }
}

function TourNudge() {
  // null until the client has read storage: the stamp decides the first paint.
  const [show, setShow] = useState<boolean | null>(null);
  useClientLayoutEffect(() => {
    // One synchronous storage read, settled before the browser paints.
    setShow(readTourNudge());
  }, []);

  if (show === false) return null;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: TOUR_NUDGE_STAMP }} />
      <div
        role="note"
        className={
          "mt-4 items-center gap-3 plate border-gold/30 bg-gold/5 px-4 py-2.5 " +
          (show ? "flex" : "hidden [html[data-tour-nudge]_&]:flex")
        }
      >
        <span className="min-w-0 text-[13px] text-parchment-200">
          New here?{" "}
          <Link
            href={FIRST_GAME_TOUR_HREF}
            className="font-semibold text-gold-leaf underline decoration-gold/50 underline-offset-2 hover:decoration-gold"
          >
            Take the tour
          </Link>
          <span className="hidden sm:inline">: a guided first game, about 3 minutes.</span>
        </span>
        <button
          type="button"
          aria-label="Dismiss tour suggestion"
          onClick={() => {
            setShow(false);
            document.documentElement.removeAttribute(TOUR_NUDGE_ATTR);
            try {
              window.localStorage.setItem(TUTORIAL_NUDGE_DISMISSED_KEY, "1");
            } catch {
              // Storage unavailable: it just hides for this visit.
            }
          }}
          // 24.5x24.5 before this: h-7 is 1.75rem, and the root font size
          // here is 14px, so every rem-based size renders at 87.5% of its
          // nominal px value. The glyph stays 24.5px; only the hit area
          // grows, and it relaxes back on a pointer that can hit 24px.
          className="ml-auto grid h-[44px] w-[44px] shrink-0 place-items-center text-parchment-400 transition hover:bg-white/10 hover:text-parchment-100 [@media(pointer:fine)]:h-7 [@media(pointer:fine)]:w-7"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </>
  );
}
