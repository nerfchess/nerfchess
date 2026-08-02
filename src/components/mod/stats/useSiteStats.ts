"use client";

// Shared fetch and types for the mod stats pages. /api/stats returns both
// scopes in one payload: the top-level fields count EVERYTHING (house-bot
// seats and the anonymous bot-game counter included), and `humans` is the same
// shape recomputed over human-vs-human archive rows only.

import { useEffect, useState } from "react";

export interface ScopeGames {
  total: number;
  rated: number;
  today: number;
  whiteWins: number;
  blackWins: number;
  draws: number;
  averageMoves: number;
}

export interface NerfRow {
  id: string;
  dealt: number;
  wins: number;
}

export interface SiteStats {
  games: ScopeGames & { vsBots?: number };
  players: { total: number; withGames: number };
  topNerfs: NerfRow[];
  humans: {
    games: ScopeGames;
    players: { withGames: number };
    topNerfs: NerfRow[];
  };
}

/** Fetches /api/stats once on mount. The stats pages mount the component that
 *  calls this only after the mod check passes, so non-mods never trigger the
 *  request (the data has always been public, but there is no reason to fetch
 *  it for a page that hides itself). */
export function useSiteStats(): { stats: SiteStats | null; failed: boolean } {
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then((res) => (res.ok ? (res.json() as Promise<SiteStats>) : Promise.reject()))
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, failed };
}
