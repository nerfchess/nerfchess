"use client";

// The profile's left rail, Lichess's per-perf list: one row per rated mode
// with its icon, an uppercase label, the rating, the trailing-window change
// in green or red, the game count, and the board rank when the player holds
// one. A mode with no games reads "?" like an unrated perf.

import Link from "next/link";
import { MODE_RATING_CATEGORIES } from "@/lib/ratingCategories";
import { isProvisionalRd } from "@/lib/ratingDisplay";
import type { LaurelPlacement } from "@/lib/laurels";
import { recentRatingDelta, type HistoryPoint } from "@/components/ratings/RatingHistoryPanel";

export interface RailRatingRow {
  rating: number;
  rd: number;
  games: number;
}

export function RatingRail({
  ratings,
  history,
  placements,
  selected,
  onSelect,
}: {
  ratings?: Record<string, RailRatingRow>;
  history: HistoryPoint[];
  placements: LaurelPlacement[];
  /** The mode whose line the chart is showing; the rail highlights it. */
  selected?: string | null;
  onSelect?: (id: string) => void;
}) {
  return (
    <ul className="divide-y divide-[color:var(--edge)] border-y border-[color:var(--edge)] lg:border-y-0">
      {MODE_RATING_CATEGORIES.map((c) => {
        const row = ratings?.[c.id];
        const Icon = c.icon;
        const delta = recentRatingDelta(history, c.id, 30);
        const rank = placements.find((p) => p.category === c.id)?.rank ?? null;
        const provisional = row ? isProvisionalRd(row.rd) : false;
        const active = selected === c.id;
        const body = (
          <>
            <Icon
              size={30}
              strokeWidth={1.4}
              aria-hidden
              className={"shrink-0 " + (row ? "text-parchment-300" : "text-parchment-500")}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] uppercase tracking-[0.06em] text-parchment-400">{c.label}</span>
              <span className="flex flex-wrap items-baseline gap-x-1.5">
                <span className={"text-[17px] font-semibold tabular-nums " + (row ? "text-parchment-50" : "text-parchment-400")}>
                  {row ? Math.round(row.rating) : "?"}
                  {row && provisional && <span className="text-parchment-400">?</span>}
                </span>
                {delta != null && delta !== 0 && (
                  <span
                    className={
                      "text-[12px] tabular-nums " + (delta > 0 ? "text-verdigris-glow" : "text-oxblood-glow")
                    }
                  >
                    {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
                  </span>
                )}
                <span className="text-[12px] text-parchment-400">
                  {row ? `${row.games.toLocaleString()} ${row.games === 1 ? "game" : "games"}` : "0 games"}
                </span>
              </span>
              {rank != null && (
                <span className="block text-[12px] text-parchment-400">Rank: {rank.toLocaleString()}</span>
              )}
            </span>
          </>
        );
        const cls =
          "flex w-full items-center gap-3 px-3 py-2.5 text-left no-underline transition-colors " +
          (active ? "bg-[color:var(--bg-panel)]" : "hover:bg-[color:var(--bg-panel)]");
        return (
          <li key={c.id}>
            {onSelect ? (
              <button type="button" onClick={() => onSelect(c.id)} aria-pressed={active} className={cls}>
                {body}
              </button>
            ) : (
              <Link href="/leaderboard" className={cls}>
                {body}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
