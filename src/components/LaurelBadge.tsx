"use client";

// The top-10 laurel: a small inline SVG wreath worn beside a player's name
// while they hold a top-10 leaderboard spot (see lib/laurels.ts for the rules
// and data path). Rank-tiered like classical honors — the champion's wreath is
// crowned and radiant gold, second and third wear plain gold, fourth through
// tenth a quieter silver-brass. Pure display: given a rank outside the top 10
// it renders nothing, so callers can pass any rank straight through.

import { useEffect, useState } from "react";
import {
  fetchTopStandings,
  laurelTier,
  type LaurelPlacement,
  type LaurelTier,
} from "@/lib/laurels";

// Fixed hues in the site's metal register: sun-glow for the radiant champion,
// gold-leaf's brassier cousin for 2-3, and a muted silver-brass (parchment
// warmed toward brass) for 4-10. Hex on purpose, like the mode identities —
// medals must not change color with the accent setting.
const TIER_COLOR: Record<LaurelTier, string> = {
  champion: "#ffd97e",
  gold: "#e0b256",
  silver: "#b3aa96",
};

export function LaurelBadge({
  rank,
  title,
  size = 14,
  className = "",
}: {
  rank: number;
  /** Tooltip / accessible label, e.g. from placementTitle(). */
  title?: string;
  size?: number;
  className?: string;
}) {
  const tier = laurelTier(rank);
  if (!tier) return null;
  const label = title ?? `Top 10 · #${rank}`;
  return (
    <span
      title={label}
      role="img"
      aria-label={label}
      className={"inline-grid shrink-0 place-items-center align-middle " + className}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill={TIER_COLOR[tier]}
        aria-hidden="true"
        style={
          tier === "champion"
            ? { filter: "drop-shadow(0 0 3px rgba(255,217,126,0.65))" }
            : undefined
        }
      >
        {/* Two mirrored branches: one leaf shape swept around the wreath's
            center, leaving the classical opening at the top. */}
        {[-1, 1].map((side) =>
          [32, 68, 104, 140].map((angle) => (
            <path
              key={`${side}:${angle}`}
              d="M12 22.6c-1.5-1.4-1.7-3.3 0-5 1.7 1.7 1.5 3.6 0 5z"
              transform={`rotate(${side * angle} 12 12.6)`}
            />
          )),
        )}
        {tier === "champion" && (
          // The champion's crown sits in the wreath's opening.
          <path d="M8.2 7.4 7.4 2.9 9.9 4.5 12 1.6l2.1 2.9 2.5-1.6-.8 4.5C14.6 6.9 13.3 6.6 12 6.6c-1.3 0-2.6.3-3.8.8z" />
        )}
      </svg>
    </span>
  );
}

/** The player's current top-10 placements (best rank first, [] when none),
 *  derived from the cached leaderboard standings. Stale-proof: while a new
 *  username's fetch is in flight it reports [], never the previous player's
 *  honors. */
export function useTopPlacements(username: string | null | undefined): LaurelPlacement[] {
  const key = (username ?? "").toLowerCase();
  const [state, setState] = useState<{ key: string; placements: LaurelPlacement[] }>({
    key: "",
    placements: [],
  });

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetchTopStandings()
      .then((standings) => {
        if (!cancelled) setState({ key, placements: standings.get(key) ?? [] });
      })
      .catch(() => {
        /* standings are decoration; pages stay correct without them */
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return state.key === key ? state.placements : [];
}
