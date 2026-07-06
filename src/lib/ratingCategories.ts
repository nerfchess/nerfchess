// Central, data-driven registry of rated categories. Everything else in the
// rating / stats / leaderboard / profile stack is generated from this list, so
// adding a future queue (Classical, Hyperbullet, Daily, …) is a one-line edit
// here — no matchmaking or storage code needs to change.
//
// NOTE: this only describes the *rating buckets*. Actual time controls and
// matchmaking are intentionally out of scope for now.

import { ShieldOff, Sparkles } from "lucide-react";
import type { ComponentType } from "react";
import {
  BlitzIcon,
  BulletIcon,
  RapidIcon,
  UltraBulletIcon,
  type SpeedIconProps,
} from "@/components/SpeedIcons";
import {
  categoryForTimeControl as speedCategoryForTimeControl,
  type RatingCategory as RatingCategoryUnion,
  type SpeedCategory,
} from "./speed";

export type RatingCategoryId = RatingCategoryUnion;

export interface RatingCategory {
  id: RatingCategoryId;
  label: string;
  /** Small icon shown beside the category everywhere it appears. Accepts the
   *  lucide contract (size, style, className, strokeWidth), so both lucide
   *  icons and the hand-drawn SpeedIcons fit. */
  icon: ComponentType<SpeedIconProps>;
  /** Accent colour (hex) used for highlights, selected tabs, sparklines, etc. */
  accent: string;
  /** One-line description of the intended pace — shown on cards/tooltips. */
  blurb: string;
}

// Lichess-style speed iconography, drawn in-house (src/components/SpeedIcons):
// a flame for UltraBullet, a bullet for Bullet, a lightning bolt for Blitz,
// and the rapid rabbit. These are the legacy speed buckets: rated queue games
// moved to the per-mode buckets below, so speed ratings only move for games
// recorded before the switch.
export const RATING_CATEGORIES: RatingCategory[] = [
  { id: "ultrabullet", label: "UltraBullet", icon: UltraBulletIcon, accent: "#b78fd6", blurb: "Pure reflexes: 15 seconds" },
  { id: "bullet",      label: "Bullet",      icon: BulletIcon,      accent: "#c66860", blurb: "Lightning-fast games" },
  { id: "blitz",       label: "Blitz",       icon: BlitzIcon,       accent: "#4a9fee", blurb: "Fast, tactical games" },
  { id: "rapid",       label: "Rapid",       icon: RapidIcon,       accent: "#7eb59a", blurb: "Room to think it through" },
];

// The two mode buckets. Queue games are rated here, one bucket per pool,
// wearing the mode color identity (Nerf red, Buff blue) from PR #129.
export const MODE_RATING_CATEGORIES: RatingCategory[] = [
  { id: "nerf", label: "Nerf", icon: ShieldOff, accent: "#dc5a54", blurb: "Secret handicaps, hidden until the end" },
  { id: "buff", label: "Buff", icon: Sparkles,  accent: "#4a9fee", blurb: "No nerfs: draft buffs and outplay them" },
];

// Every bucket, for id lookups across old and new games. Keep
// RATING_CATEGORY_IDS speed-only: legacy per-speed data keys off it.
const ALL_CATEGORIES: RatingCategory[] = [...MODE_RATING_CATEGORIES, ...RATING_CATEGORIES];

export const RATING_CATEGORY_IDS = RATING_CATEGORIES.map((c) => c.id);

/** Every rated bucket id, modes first, for stats tables that must be able to
 *  file any recorded game (old speed-rated games included). */
export const ALL_RATING_CATEGORY_IDS = ALL_CATEGORIES.map((c) => c.id);

// Every speed bucket is retired: Nerf and Buff are the only two visible
// ratings now. The speed categories stay in RATING_CATEGORIES so historical
// rating rows, stats buckets, and archived games keep resolving; tabbed
// surfaces (leaderboard, profile rating history) offer only the active ones.
export const RETIRED_CATEGORY_IDS: RatingCategoryId[] = [
  "ultrabullet",
  "bullet",
  "blitz",
  "rapid",
];

// Tabbed surfaces (leaderboard, profile) offer exactly the mode buckets:
// Nerf and Buff are the only ratings players see.
export const ACTIVE_RATING_CATEGORIES = [
  ...MODE_RATING_CATEGORIES,
  ...RATING_CATEGORIES.filter((c) => !RETIRED_CATEGORY_IDS.includes(c.id)),
];

// The default view for tabbed surfaces (leaderboard, profile).
export const DEFAULT_CATEGORY: RatingCategoryId = "nerf";

// The bucket the old single local (vs-bot) rating migrated into, kept stable
// so localStorage data written before the two-ratings switch still resolves.
export const LEGACY_LOCAL_CATEGORY: RatingCategoryId = "blitz";

export function getCategory(id: RatingCategoryId): RatingCategory {
  return ALL_CATEGORIES.find((c) => c.id === id) ?? RATING_CATEGORIES[0];
}

export function isRatingCategoryId(value: unknown): value is RatingCategoryId {
  return typeof value === "string" && ALL_CATEGORIES.some((c) => c.id === value);
}

/** Classify a time control into a speed bucket. Shared with the game servers
 *  via lib/speed.ts so client and server always agree on the bucket. */
export const categoryForTimeControl = speedCategoryForTimeControl;
