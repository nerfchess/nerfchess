"use client";

import { useCallback, useEffect, useState } from "react";

// Local pinning of achievements, kept deliberately behind one small hook so the
// storage layer is swappable. Today it reads and writes localStorage; a future
// server-backed pin store (per account) can replace the body of readStore /
// writeStore and the effect below without the page changing at all, because the
// page only depends on the returned api shape (pinned, isPinned, togglePin,
// canPin, ready).

const STORAGE_KEY = "nc:pinned-achievements";
export const MAX_PINNED = 3;

function readStore(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, MAX_PINNED);
  } catch {
    return [];
  }
}

function writeStore(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage full or blocked (private mode): pinning is a convenience, so a
    // failed write is silently ignored rather than surfaced as an error.
  }
}

export interface PinnedApi {
  /** Pinned achievement ids, oldest first, capped at MAX_PINNED. */
  pinned: string[];
  isPinned: (id: string) => boolean;
  togglePin: (id: string) => void;
  /** True when there is room for one more pin. */
  canPin: boolean;
  /** True once hydrated from storage. Server render and first paint show none,
   *  so the page can avoid a hydration mismatch by waiting on this. */
  ready: boolean;
}

export function usePinnedAchievements(): PinnedApi {
  const [pinned, setPinned] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Deferred so the hydration write does not land synchronously inside the
    // effect body (server render and first paint intentionally show none).
    queueMicrotask(() => {
      setPinned(readStore());
      setReady(true);
    });
    // Keep multiple tabs of the same account in sync.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPinned(readStore());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const togglePin = useCallback((id: string) => {
    setPinned((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX_PINNED
          ? prev
          : [...prev, id];
      if (next === prev) return prev;
      writeStore(next);
      return next;
    });
  }, []);

  const isPinned = useCallback((id: string) => pinned.includes(id), [pinned]);

  return { pinned, isPinned, togglePin, canPin: pinned.length < MAX_PINNED, ready };
}
