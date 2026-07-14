"use client";

import { useCallback, useEffect, useState } from "react";
import type { DraftMode } from "@/engine/buff";

// The one source of truth for "which NerfChess mode is selected" across the
// site. Buff is the universal default: it starts from normal chess, so it is
// the easiest first game. Precedence when a page loads:
//   1. an explicit ?mode=nerf / ?mode=buff query param (deliberate links win),
//   2. the last mode this browser picked (localStorage),
//   3. Buff.
export const LAST_MODE_KEY = "dc:last-mode";
export const DEFAULT_MODE: DraftMode = "buff";

export function parseMode(value: string | null | undefined): DraftMode | null {
  return value === "nerf" || value === "buff" ? value : null;
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
}

/**
 * Shared mode selection for a page. Renders Buff on the server and first
 * client paint (deterministic hydration), then applies the URL/saved
 * preference in an effect. The setter persists the choice so it follows the
 * player to the lobby, friend setup, and bot setup.
 */
export function useSharedMode(): [DraftMode, (mode: DraftMode) => void] {
  const [mode, setMode] = useState<DraftMode>(DEFAULT_MODE);
  useEffect(() => {
    // Deferred a microtask so the preselect doesn't set state synchronously
    // in the effect body (same pattern as the rest of the codebase).
    queueMicrotask(() => {
      const preferred = resolvePreferredMode();
      if (preferred !== DEFAULT_MODE) setMode(preferred);
    });
  }, []);
  const pick = useCallback((next: DraftMode) => {
    setMode(next);
    savePreferredMode(next);
  }, []);
  return [mode, pick];
}
