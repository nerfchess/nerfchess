"use client";

// A single category's rating, shown as an accented card. Two sizes: "compact"
// for the home strip, "large" for the profile header. Reused so the rating
// visual language stays identical everywhere.

import { getCategory, type RatingCategoryId } from "@/lib/ratingCategories";
import type { CategoryStats } from "@/lib/ratings";

export function RatingCard({
  categoryId,
  stats,
  variant = "compact",
  href,
}: {
  categoryId: RatingCategoryId;
  stats: CategoryStats;
  variant?: "compact" | "large";
  href?: string;
}) {
  const c = getCategory(categoryId);
  const Icon = c.icon;
  const large = variant === "large";

  const inner = (
    <div
      className={
        "group relative flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] transition-colors " +
        (href ? "hover:border-white/20 hover:bg-white/[0.04] " : "") +
        (large ? "p-4" : "p-3")
      }
    >
      <span
        className={
          "grid shrink-0 place-items-center rounded-md " + (large ? "h-11 w-11" : "h-9 w-9")
        }
        style={{ background: c.accent + "1f", boxShadow: `inset 0 0 0 1px ${c.accent}55` }}
      >
        <Icon className={large ? "h-5 w-5" : "h-4 w-4"} style={{ color: c.accent }} strokeWidth={2.2} />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] text-parchment-400">{c.label}</div>
        <div
          className={
            "font-display tabular-nums leading-tight text-parchment " + (large ? "text-3xl" : "text-xl")
          }
        >
          {Math.round(stats.rating)}
        </div>
      </div>
    </div>
  );

  if (href) {
    // Local import avoided to keep this a pure presentational component; callers
    // wrap in <Link> when navigation is desired. Kept simple with an anchor.
    return (
      <a href={href} className="block no-underline">
        {inner}
      </a>
    );
  }
  return inner;
}
