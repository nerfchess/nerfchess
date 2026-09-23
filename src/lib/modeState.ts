"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { DraftMode } from "@/engine/buff";
import { LAST_MODE_COOKIE, parseMode as parseModeValue } from "@/lib/modeCookie";
import { useSeededMode } from "@/lib/session/SessionProvider";

// The one source of truth for "which NerfChess mode is selected" across the
// site. Buff is the universal default: it starts from normal chess, so it is
// the easiest first game. Precedence when a page loads:
//   1. an explicit ?mode=nerf / ?mode=buff query param (deliberate links win),
//   2. the last mode this browser picked (localStorage),
//   3. Buff.
export const LAST_MODE_KEY = "dc:last-mode";
export const DEFAULT_MODE: DraftMode = "buff";

export function parseMode(value: string | null | undefined): DraftMode | null {
  return parseModeValue(value);
}

/** Mirror the choice into the nc_mode cookie so the next server render can
 *  preselect it (F006). A display preference, nothing reads it for access. */
function writeModeCookie(mode: DraftMode) {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${LAST_MODE_COOKIE}=${mode}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  } catch {}
}

/** Resolve the mode for the current page: URL param > saved choice > Buff. */
export function resolvePreferredMode(search?: string): DraftMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  try {
    const query = new URLSearchParams(search ?? window.location.search);
    const fromQuery = parseMode(query.get("mode"));
    if (fromQuery) return fromQuery;
  } catch {}
  try {
    const saved = parseMode(window.localStorage.getItem(LAST_MODE_KEY));
    if (saved) return saved;
  } catch {}
  return DEFAULT_MODE;
}

export function savePreferredMode(mode: DraftMode) {
  try {
    window.localStorage.setItem(LAST_MODE_KEY, mode);
  } catch {}
  writeModeCookie(mode);
}

/**
 * Shared mode selection for a page. The server renders the mode it can know
 * (the ?mode= param, else the nc_mode cookie the root layout read, else Buff)
 * and the client hydrates from the same values, so a returning player's mode
 * is on the first paint instead of flipping after mount (F006). The effect
 * below still reconciles with localStorage, which covers browsers whose choice
 * predates the cookie (it flips once, then the cookie carries it). The setter
 * persists the choice so it follows the player to the lobby, friend setup,
 * and bot setup.
 */
export function useSharedMode(): [DraftMode, (mode: DraftMode) => void] {
  const seeded = useSeededMode();
  // Reactive, unlike reading window.location.search once on mount. A link to
  // /lobby?mode=nerf clicked while ALREADY on /lobby is a same-segment App
  // Router navigation: the component re-renders but never remounts, so a
  // mount-only effect never re-ran and the URL said one mode while the UI
  // showed another. The homepage links to exactly that.
  const params = useSearchParams();
  const fromQuery = parseMode(params.get("mode"));
  const [mode, setMode] = useState<DraftMode>(() => fromQuery ?? seeded ?? DEFAULT_MODE);
  // Only re-apply when the QUERY changes, never on an unrelated re-render, so
  // a manual pick is not clobbered by a stale param still sitting in the URL.
  const appliedQueryRef = useRef<DraftMode | null | undefined>(undefined);
  useEffect(() => {
    // Deferred a microtask so the preselect doesn't set state synchronously
    // in the effect body (same pattern as the rest of the codebase).
    queueMicrotask(() => {
      const first = appliedQueryRef.current === undefined;
      if (!first && appliedQueryRef.current === fromQuery) return;
      appliedQueryRef.current = fromQuery;
      // An explicit param always wins; otherwise fall back to the saved
      // preference, but only on the first pass (a later param removal should
      // not yank the mode out from under a manual pick).
      if (fromQuery) setMode(fromQuery);
      else if (first) {
        let saved: DraftMode | null = null;
        try {
          saved = parseMode(window.localStorage.getItem(LAST_MODE_KEY));
        } catch {}
        const preferred = saved ?? seeded ?? DEFAULT_MODE;
        setMode(preferred);
        // Carry a pre-cookie localStorage choice into the cookie once.
        if (preferred !== seeded) writeModeCookie(preferred);
      }
    });
  }, [fromQuery, seeded]);
  const pick = useCallback((next: DraftMode) => {
    setMode(next);
    savePreferredMode(next);
  }, []);
  return [mode, pick];
}
