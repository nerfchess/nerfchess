"use client";

// Rating history with the caller-owned controls the profile page needs
// (spec 2.5): mode chips (Nerf / Buff, both on by default) and a time range
// (7d / 30d / 90d / All, All default) wrapped around the shared RatingChart.
//
// Two things this layer is responsible for that the bare chart is not:
//  1. Reconciliation. The archived ratingHistory can lag the live rating (a
//     just-finished game, a decay tick). For every visible series we append a
//     synthetic point at (now, currentRatings[mode]) when a current value
//     exists, so the drawn line ENDS exactly at the number the rating card
//     shows. Chart and card can never disagree.
//  2. The empty-range state. "No rated games in this period" is keyed off the
//     REAL history points inside the window, not the synthetic now-point (which
//     is always in range and would otherwise mask an empty period).

import { useMemo, useState } from "react";
import { RatingChart, type RatingPoint, type RatingSeries } from "@/components/RatingChart";
import { ACTIVE_RATING_CATEGORIES, type RatingCategoryId } from "@/lib/ratingCategories";

const DAY = 86_400_000;

export type HistoryPoint = RatingPoint & { category?: string | null };

// Range chips. `days = null` means "All" (no trailing-window filter).
// Lichess's ranges. YTD is computed at render from the calendar.
const RANGES: { key: string; label: string; days: number | null | "ytd" }[] = [
  { key: "1m", label: "1M", days: 30 },
  { key: "3m", label: "3M", days: 90 },
  { key: "6m", label: "6M", days: 180 },
  { key: "ytd", label: "YTD", days: "ytd" },
  { key: "all", label: "ALL", days: null },
];

function ytdDays(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1).getTime();
  return Math.max(1, Math.ceil((now.getTime() - start) / DAY));
}

/** Rating change over the trailing `days` window for one mode. Pure — safe for
 *  the rating cards and any list rendering. Returns:
 *   - `null` when the mode has NO games at all, or none inside the window (no
 *     recent movement to report -> the card omits its movement chip);
 *   - otherwise the signed delta between the latest rating and the baseline
 *     (the last point BEFORE the window, or the first point inside it when the
 *     account's whole history is younger than the window).
 */
export function recentRatingDelta(
  points: HistoryPoint[],
  category: string,
  days: number,
): number | null {
  const series = points
    .filter((p) => (p.category ?? null) === category)
    .sort((a, b) => a.at - b.at);
  if (series.length === 0) return null;

  const cutoff = Date.now() - days * DAY;
  const inWindow = series.filter((p) => p.at >= cutoff);
  if (inWindow.length === 0) return null; // no games in the window -> no movement

  const latest = series[series.length - 1].rating;
  const before = series.filter((p) => p.at < cutoff);
  // Baseline is the rating as the window opened: the last point before it, or
  // (for a brand-new account) the first point inside it.
  const baseline = before.length > 0 ? before[before.length - 1].rating : inWindow[0].rating;
  return Math.round(latest - baseline);
}

export interface RatingHistoryPanelProps {
  points: HistoryPoint[];
  /** Live current rating per mode, used to anchor each line's final point so
   *  the chart reconciles with the rating cards. Missing/undefined = skip. */
  currentRatings: Record<string, number | undefined>;
  className?: string;
}

export function RatingHistoryPanel({ points, currentRatings, className = "" }: RatingHistoryPanelProps) {
  // Mode toggles: both on by default. We never let the user turn the last one
  // off (mirrors the chart's own "never hide the last line" rule), so there is
  // always something to draw or an honest empty state.
  const [visibleModes, setVisibleModes] = useState<Set<RatingCategoryId>>(
    () => new Set(ACTIVE_RATING_CATEGORIES.map((c) => c.id)),
  );
  // Default range: the shortest window that still holds two real games for
  // some mode, so a dormant account opens on its history instead of an empty
  // "No rated games in this period" plate (the old fixed 3M did exactly that).
  const [rangeKey, setRangeKey] = useState<string>(() => {
    const now = Date.now();
    for (const r of RANGES) {
      if (r.days == null) return r.key;
      const days = r.days === "ytd" ? ytdDays() : r.days;
      const cutoff = now - days * DAY;
      const ok = ACTIVE_RATING_CATEGORIES.some(
        (c) => points.filter((p) => (p.category ?? null) === c.id && p.at >= cutoff).length >= 2,
      );
      if (ok) return r.key;
    }
    return "all";
  });
  const rawDays = RANGES.find((r) => r.key === rangeKey)?.days ?? null;
  const rangeDays = rawDays === "ytd" ? ytdDays() : rawDays;

  const toggleMode = (id: RatingCategoryId) =>
    setVisibleModes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id); // keep at least one mode visible
      } else {
        next.add(id);
      }
      return next;
    });

  // One series per visible mode: real history points plus the synthetic
  // now-point when a live rating exists for that mode.
  const series = useMemo<RatingSeries[]>(() => {
    return ACTIVE_RATING_CATEGORIES.filter((c) => visibleModes.has(c.id)).map((c) => {
      const real = points
        .filter((p) => (p.category ?? null) === c.id)
        .map((p) => ({ at: p.at, rating: p.rating }))
        .sort((a, b) => a.at - b.at);
      const current = currentRatings[c.id];
      // The synthetic "now" point anchors the line to the current time by design.
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();
      const last = real[real.length - 1];
      // Skip the anchor when the newest archived game is at (or ahead of) the
      // client clock: a zero- or negative-width final segment gave the smooth
      // line a place to fold back on itself.
      const withNow =
        typeof current === "number" && (!last || now - last.at > 60_000)
          ? [...real, { at: now, rating: current }]
          : real;
      return { id: c.id, label: c.label, color: c.accent, points: withNow };
    });
  }, [points, currentRatings, visibleModes]);

  // Empty-range detection uses only REAL points (the synthetic now-point is
  // always in range and would hide a genuinely empty period). A series needs a
  // real point inside the window to count as "has rated games here".
  const hasGamesInRange = useMemo(() => {
    // Trailing window is anchored to the current time by design (display-only).
    // eslint-disable-next-line react-hooks/purity
    const cutoff = rangeDays == null ? -Infinity : Date.now() - rangeDays * DAY;
    return ACTIVE_RATING_CATEGORIES.some(
      (c) =>
        visibleModes.has(c.id) &&
        points.some((p) => (p.category ?? null) === c.id && p.at >= cutoff),
    );
  }, [points, visibleModes, rangeDays]);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        {/* Range tabs, Lichess's segmented metal control. */}
        <div className="flex" role="group" aria-label="Time range">
          {RANGES.map((r) => {
            const on = r.key === rangeKey;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setRangeKey(r.key)}
                aria-pressed={on}
                className={
                  "min-h-[32px] border border-[color:var(--edge)] px-2.5 text-[12px] font-medium tabular-nums transition-colors first:border-r-0 last:border-l-0 " +
                  (on
                    ? "bg-[color:var(--bg-raised)] text-parchment-50"
                    : "bg-[color:var(--bg-panel)] text-parchment-400 hover:text-parchment-100")
                }
              >
                {r.label}
              </button>
            );
          })}
        </div>
        {/* Legend: the mode lines, click to hide one (never the last). */}
        <div className="flex items-center gap-3" role="group" aria-label="Rating modes">
          {ACTIVE_RATING_CATEGORIES.map((c) => {
            const on = visibleModes.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleMode(c.id)}
                aria-pressed={on}
                className={"inline-flex items-center gap-1.5 text-[12px] " + (on ? "text-parchment-200" : "text-parchment-500 line-through")}
              >
                <span aria-hidden className="h-2 w-5" style={{ background: c.accent, opacity: on ? 1 : 0.35 }} />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2">
        {hasGamesInRange ? (
          // The chart pre-filters to the same window via rangeDays and drops
          // its own chrome (bare + hideLegend), so this panel is the single
          // plate and the sole owner of the mode/range controls.
          <RatingChart series={series} rangeDays={rangeDays} hideLegend bare />
        ) : (
          <div className="p-4 text-sm text-parchment-400">No rated games in this period</div>
        )}
      </div>
    </div>
  );
}
