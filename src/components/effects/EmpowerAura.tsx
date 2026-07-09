// "Stronger pieces shine": presentational layers for the self-grant card fx
// (empower / ward / rally). EmpowerShine breathes a soft tier-tinted halo +
// crisp 1px ring UNDER an empowered piece (rendered before the piece div, so
// the piece always paints on top); EdgeAura washes a whisper of the same tint
// along the viewer's edge of the board crop while any of their passive grants
// is live. All paint/animation lives in globals.css (.empower-shine /
// .edge-aura-*); keyframes are transform/opacity only and are cut by the
// prefers-reduced-motion gate there.

import React from "react";
import type { Color } from "@/engine/types";

/** Tier accent colors as "R G B" triplets — mirrors the --tier-rgb custom
 * property the .tier-bg-N classes set in globals.css, so the shine always
 * matches the card chrome without depending on class stacking. */
const TIER_RGB: Record<number, string> = {
  1: "126 181 154", // sage
  2: "139 169 196", // slate
  3: "216 181 110", // brass
  4: "199 148 104", // clay
  5: "198 104 96", // brick
  6: "198 95 143", // rose
  7: "168 119 216", // violet
  8: "224 82 82", // blood
  9: "244 196 48", // apex gold
  10: "34 211 238", // mythic cyan
};

/** The tier's "R G B" triplet (brass fallback for anything out of range). */
export function tierRgb(tier: number): string {
  return TIER_RGB[tier] ?? TIER_RGB[3];
}

/** Soft breathing glow ring/halo under a piece empowered by a self-grant
 * card, in the card's tier color. Purely decorative; never intercepts input
 * and never obscures the piece (mount it before the piece div). */
export function EmpowerShine({ tier }: { tier: number }) {
  return (
    <div
      aria-hidden
      className="empower-shine absolute inset-0 pointer-events-none"
      style={{ "--tier-rgb": tierRgb(tier) } as React.CSSProperties}
    />
  );
}

/** Faint ambient glow hugging the viewer's edge of the board crop while they
 * hold any live passive/perk grant. `tint` is an "R G B" triplet (use
 * tierRgb); the aura sits on the bottom edge when the board is oriented the
 * viewer's way, the top edge otherwise (spectating flipped). */
export function EdgeAura({
  color,
  orientation,
  tint,
}: {
  color: Color;
  orientation: Color;
  tint: string;
}) {
  const atBottom = color === orientation;
  return (
    <div
      aria-hidden
      className={`edge-aura ${atBottom ? "edge-aura-bottom" : "edge-aura-top"} pointer-events-none`}
      style={{ "--tier-rgb": tint } as React.CSSProperties}
    />
  );
}
