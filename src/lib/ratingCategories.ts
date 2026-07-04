// Central, data-driven registry of rated categories. Everything else in the
// rating / stats / leaderboard / profile stack is generated from this list, so
// adding a future queue (Classical, Hyperbullet, Daily, …) is a one-line edit
// here — no matchmaking or storage code needs to change.
//
// NOTE: this only describes the *rating buckets*. Actual time controls and
// matchmaking are intentionally out of scope for now.

import { Flame, Rabbit, Rocket, Zap, type LucideIcon } from "lucide-react";
import { categoryForTimeControl as speedCategoryForTimeControl, type SpeedCategory } from "./speed";

export type RatingCategoryId = SpeedCategory;

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

// Lichess-style speed iconography: lightning for UltraBullet, a bullet-fast
// rocket, fire for Blitz, and the rapid rabbit.
export const RATING_CATEGORIES: RatingCategory[] = [
  { id: "ultrabullet", label: "UltraBullet", icon: Zap,    accent: "#b78fd6", blurb: "Pure reflexes: 15 seconds" },
  { id: "bullet",      label: "Bullet",      icon: Rocket, accent: "#c66860", blurb: "Lightning-fast games" },
  { id: "blitz",       label: "Blitz",       icon: Flame,  accent: "#4a9fee", blurb: "Fast, tactical games" },
  { id: "rapid",       label: "Rapid",       icon: Rabbit, accent: "#7eb59a", blurb: "Room to think it through" },
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

/** Classify a time control into a speed bucket. Shared with the game servers
 *  via lib/speed.ts so client and server always agree on the bucket. */
export const categoryForTimeControl = speedCategoryForTimeControl;
