// Shared rarity theme: one color identity per achievement rarity, used by
// every surface that renders an achievement (the trophy wall, the profile
// strip, the unlock toast). Each rarity carries:
//   color  - the solid hue (icon tint, text, progress segments)
//   rgb    - the same hue as an "R G B" triple for rgb(<rgb> / a) layering
//   softBg - a low-opacity wash for chips and medallion fills
//   border - the resting border/ring tone
//   glow   - the soft outer glow color for unlocked medallions
//
// Identities (dark parchment site, gold reserved for the top of the ladder):
//   common    = parchment / silver (quiet, everyday)
//   rare      = verdigris / teal   (a step up, cool)
//   epic      = violet             (matches the tier-7 violet family)
//   legendary = gold / sun         (the reward hue, with a soft glow)

import type { AchievementRarity } from "@/lib/achievements";

export interface RarityTheme {
  label: string;
  color: string;
  rgb: string;
  softBg: string;
  border: string;
  glow: string;
}

export const RARITY_THEME: Record<AchievementRarity, RarityTheme> = {
  common: {
    label: "Common",
    color: "#c8c3b6",
    rgb: "200 195 182",
    softBg: "rgba(200,195,182,0.08)",
    border: "rgba(200,195,182,0.30)",
    glow: "rgba(200,195,182,0.18)",
  },
  rare: {
    label: "Rare",
    color: "#58c0ad",
    rgb: "88 192 173",
    softBg: "rgba(88,192,173,0.10)",
    border: "rgba(88,192,173,0.38)",
    glow: "rgba(88,192,173,0.26)",
  },
  epic: {
    label: "Epic",
    color: "#a877d8",
    rgb: "168 119 216",
    softBg: "rgba(168,119,216,0.10)",
    border: "rgba(168,119,216,0.42)",
    glow: "rgba(168,119,216,0.28)",
  },
  legendary: {
    label: "Legendary",
    color: "#eec25e",
    rgb: "238 194 94",
    softBg: "rgba(238,194,94,0.12)",
    border: "rgba(238,194,94,0.48)",
    glow: "rgba(238,194,94,0.34)",
  },
};

// Easiest to hardest: the display order for filters, sorting inside category
// sections, and the segmented progress bar.
export const RARITY_ASC: AchievementRarity[] = ["common", "rare", "epic", "legendary"];
