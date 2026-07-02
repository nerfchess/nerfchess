"use client";

// Segmented control for switching between rating categories. Data-driven from
// the registry, so it automatically reflects any future queue. Shared by the
// leaderboard and profile pages.

import { RATING_CATEGORIES, type RatingCategoryId } from "@/lib/ratingCategories";

export function CategoryTabs({
  value,
  onChange,
  className = "",
}: {
  value: RatingCategoryId;
  onChange: (id: RatingCategoryId) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Rating category"
      className={"inline-flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1 " + className}
    >
      {RATING_CATEGORIES.map((c) => {
        const Icon = c.icon;
        const selected = value === c.id;
        return (
          <button
            key={c.id}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(c.id)}
            className={
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 " +
              (selected
                ? "text-parchment"
                : "text-parchment-400 hover:text-parchment-200 hover:bg-white/[0.04]")
            }
            style={selected ? { background: c.accent + "22", boxShadow: `inset 0 0 0 1px ${c.accent}66` } : undefined}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: selected ? c.accent : undefined }} strokeWidth={2.2} />
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
