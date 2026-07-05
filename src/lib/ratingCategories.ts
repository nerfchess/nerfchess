// Central, data-driven registry of rated categories. Everything else in the
// rating / stats / leaderboard / profile stack is generated from this list, so
// adding a future queue (Classical, Hyperbullet, Daily, …) is a one-line edit
// here — no matchmaking or storage code needs to change.
//
// NOTE: this only describes the *rating buckets*. Actual time controls and
// matchmaking are intentionally out of scope for now.

import { Flame, Rabbit, Rocket, ShieldOff, Sparkles, Zap, type LucideIcon } from "lucide-react";
import {
  categoryForTimeControl as speedCategoryForTimeControl,
  type RatingCategory as RatingCategoryUnion,
  type SpeedCategory,
} from "./speed";

export type RatingCategoryId = RatingCategoryUnion;

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
// rocket, fire for Blitz, and the rapid rabbit. These are the legacy speed
// buckets: rated queue games moved to the per-mode buckets below, so speed
// ratings only move for games recorded before the switch.
export const RATING_CATEGORIES: RatingCategory[] = [
  { id: "ultrabullet", label: "UltraBullet", icon: Zap,    accent: "#b78fd6", blurb: "Pure reflexes: 15 seconds" },
  { id: "bullet",      label: "Bullet",      icon: Rocket, accent: "#c66860", blurb: "Lightning-fast games" },
  { id: "blitz",       label: "Blitz",       icon: Flame,  accent: "#4a9fee", blurb: "Fast, tactical games" },
  { id: "rapid",       label: "Rapid",       icon: Rabbit, accent: "#7eb59a", blurb: "Room to think it through" },
];

// The two mode buckets. Queue games are rated here, one bucket per pool,
// wearing the mode color identity (Nerf red, Buff blue) from PR #129.
export const MODE_RATING_CATEGORIES: RatingCategory[] = [
  { id: "nerf", label: "Nerf", icon: ShieldOff, accent: "#dc5a54", blurb: "Secret handicaps, hidden until the end" },
  { id: "buff", label: "Buff", icon: Sparkles,  accent: "#4a9fee", blurb: "No nerfs: draft buffs and outplay them" },
];

// Every bucket, for id lookups across old and new games. Keep
// RATING_CATEGORY_IDS speed-only: per-speed stats tables key off it.
const ALL_CATEGORIES: RatingCategory[] = [...MODE_RATING_CATEGORIES, ...RATING_CATEGORIES];

export const RATING_CATEGORY_IDS = RATING_CATEGORIES.map((c) => c.id);

// UltraBullet is retired: no queue pool or time preset under 30 seconds can
// feed it anymore. The category stays in RATING_CATEGORIES so historical
// rating rows, stats buckets, and archived games keep resolving; tabbed
// surfaces (leaderboard, profile rating history) offer only the active ones.
export const RETIRED_CATEGORY_IDS: RatingCategoryId[] = ["ultrabullet"];

// Tabbed surfaces (leaderboard, profile) list the mode buckets first: they
// are the pools rated play happens in now.
export const ACTIVE_RATING_CATEGORIES = [
  ...MODE_RATING_CATEGORIES,
  ...RATING_CATEGORIES.filter((c) => !RETIRED_CATEGORY_IDS.includes(c.id)),
];

// The bucket that existing single-rating data migrates into, and the default
// view for tabbed surfaces (leaderboard, profile).
export const DEFAULT_CATEGORY: RatingCategoryId = "blitz";

export function getCategory(id: RatingCategoryId): RatingCategory {
  return ALL_CATEGORIES.find((c) => c.id === id) ?? RATING_CATEGORIES[0];
}

export function isRatingCategoryId(value: unknown): value is RatingCategoryId {
  return typeof value === "string" && ALL_CATEGORIES.some((c) => c.id === value);
}

/** Classify a time control into a speed bucket. Shared with the game servers
 *  via lib/speed.ts so client and server always agree on the bucket. */
export const categoryForTimeControl = speedCategoryForTimeControl;
