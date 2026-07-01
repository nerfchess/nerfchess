// Central, data-driven registry of rated categories. Everything else in the
// rating / stats / leaderboard / profile stack is generated from this list, so
// adding a future queue (Classical, Hyperbullet, Daily, …) is a one-line edit
// here — no matchmaking or storage code needs to change.
//
// NOTE: this only describes the *rating buckets*. Actual time controls and
// matchmaking are intentionally out of scope for now.

import { Flame, Timer, Zap, type LucideIcon } from "lucide-react";

export type RatingCategoryId = "bullet" | "blitz" | "rapid";

export interface RatingCategory {
  id: RatingCategoryId;
  label: string;
  /** Small icon shown beside the category everywhere it appears. */
  icon: LucideIcon;
  /** Accent colour (hex) used for highlights, selected tabs, sparklines, etc. */
  accent: string;
  /** One-line description of the intended pace — shown on cards/tooltips. */
  blurb: string;
}

export const RATING_CATEGORIES: RatingCategory[] = [
  { id: "bullet", label: "Bullet", icon: Zap,   accent: "#c66860", blurb: "Lightning-fast games" },
  { id: "blitz",  label: "Blitz",  icon: Flame, accent: "#4a9fee", blurb: "Fast, tactical games" },
  { id: "rapid",  label: "Rapid",  icon: Timer, accent: "#7eb59a", blurb: "Room to think it through" },
];

export const RATING_CATEGORY_IDS = RATING_CATEGORIES.map((c) => c.id);

// The bucket that existing single-rating data migrates into, and the default
// view for tabbed surfaces (leaderboard, profile).
export const DEFAULT_CATEGORY: RatingCategoryId = "blitz";

export function getCategory(id: RatingCategoryId): RatingCategory {
  return RATING_CATEGORIES.find((c) => c.id === id) ?? RATING_CATEGORIES[0];
}

export function isRatingCategoryId(value: unknown): value is RatingCategoryId {
  return typeof value === "string" && RATING_CATEGORY_IDS.includes(value as RatingCategoryId);
}
