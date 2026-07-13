// "Stronger pieces shine": presentational layers for the self-grant card fx
// (empower / ward / rally). EmpowerShine breathes a soft tier-tinted halo +
// crisp 1px ring UNDER an empowered piece (rendered before the piece div, so
// the piece always paints on top); EdgeAura washes a whisper of the same tint
// along the viewer's edge of the board crop while any of their passive grants
// is live. All paint/animation lives in globals.css (.empower-shine /
// .edge-aura-*); keyframes are transform/opacity only and are cut by the
// prefers-reduced-motion gate there.
//
// PER-CARD AURA IDENTITY: two different empower cards used to wear identical
// shines (same tier = same color, same art). Every aura now derives a stable
// visual identity from the CARD ID alone — (a) a hue rotation of the tier
// color (auraTint), so two tier-6 empowers glow in visibly different shades
// of the same tier family, and (b) a shape variant (auraVariant: halo / orbit
// glints / rune frame / rising motes / pulsing diamond / twin arcs) picking
// which decoration layer rides the shared pooled-glow base. Both are pure
// functions of the id (hash only — no randomness, no state), so both players
// and every reload render the identical aura. Alpha values all live in the
// CSS and are unchanged: a re-hued aura never obscures the piece more than
// the old one did.

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

// The hostile base tint (terracotta) NerfAura wore before per-card identity;
// still the fallback for id-less mounts (banned squares, forced pieces).
const NERF_RGB = "224 119 107";

/** Same 31-multiplier string hash the badge accents use (BoardEffects
 * nameHash): deterministic across clients, seeded by the card ID only. */
function cardHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Rotate an "R G B" triplet's hue by `deg` degrees (RGB→HSL→RGB, saturation
 * and lightness preserved), returning a new "R G B" triplet. Pure math. */
function rotateHueTriplet(triplet: string, deg: number): string {
  const [r0, g0, b0] = triplet.split(/\s+/).map((n) => Number(n) / 255);
  const max = Math.max(r0, g0, b0);
  const min = Math.min(r0, g0, b0);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d > 0) {
    if (max === r0) h = ((g0 - b0) / d) % 6;
    else if (max === g0) h = (b0 - r0) / d + 2;
    else h = (r0 - g0) / d + 4;
    h *= 60;
  }
  h = ((h + deg) % 360 + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const seg: [number, number, number] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return seg.map((v) => Math.round((v + m) * 255)).join(" ");
}

/** Linear mix of two "R G B" triplets: a*(1-t) + b*t. */
function mixTriplet(a: string, b: string, t: number): string {
  const av = a.split(/\s+/).map(Number);
  const bv = b.split(/\s+/).map(Number);
  return av.map((v, i) => Math.round(v * (1 - t) + bv[i] * t)).join(" ");
}

// Derived tints are pure functions of (tier, id): memoize at module level so
// per-square renders never redo the HSL round-trip.
const tintCache = new Map<string, string>();

/** Per-card shine tint: the card's TIER color hue-rotated by a card-id-hashed
 * offset in [-28°, +28°] — far enough that two same-tier cards read as
 * different shades, close enough that the tier family stays recognizable.
 * Without an id (legacy mounts) it is exactly the tier color. */
export function auraTint(tier: number, cardId?: string): string {
  if (!cardId) return tierRgb(tier);
  const key = `e:${tier}:${cardId}`;
  let v = tintCache.get(key);
  if (!v) {
    v = rotateHueTriplet(tierRgb(tier), (cardHash(cardId) % 57) - 28);
    tintCache.set(key, v);
  }
  return v;
}

/** Per-card hostile tint: the terracotta ember pulled 35% toward the card's
 * tier color, then hue-rotated by a smaller hashed offset ([-20°, +20°] — it
 * must stay warm/hostile). Id-less mounts keep the plain terracotta. */
export function nerfTint(cardId?: string, tier?: number): string {
  if (!cardId) return NERF_RGB;
  const key = `n:${tier ?? 0}:${cardId}`;
  let v = tintCache.get(key);
  if (!v) {
    const base = tier != null ? mixTriplet(NERF_RGB, tierRgb(tier), 0.35) : NERF_RGB;
    v = rotateHueTriplet(base, (cardHash(cardId) % 41) - 20);
    tintCache.set(key, v);
  }
  return v;
}

/** The six aura shape variants. "orbit" is the pre-identity look (three
 * orbiting glints) and stays the default for id-less mounts, so existing
 * NerfAura call sites without a card render exactly as before. */
export type AuraVariant = "halo" | "orbit" | "rune" | "motes" | "diamond" | "arcs";
const AURA_VARIANTS: AuraVariant[] = ["halo", "orbit", "rune", "motes", "diamond", "arcs"];

/** Hash-picked aura shape for a card. Divided by 997 before the modulo so the
 * variant choice decorrelates from the hue offset (which uses hash % 57). */
export function auraVariant(cardId?: string): AuraVariant {
  if (!cardId) return "orbit";
  return AURA_VARIANTS[Math.floor(cardHash(cardId) / 997) % AURA_VARIANTS.length];
}

/** The variant's decoration layer, riding the shared pooled-glow base. Every
 * layer is CSS-animated (transform/opacity only, globals.css) and stilled or
 * hidden by the reduced-motion gate there. */
function AuraVariantLayer({ variant }: { variant: AuraVariant }) {
  switch (variant) {
    case "orbit":
      return (
        <span className="empower-orbit">
          <i className="empower-glint empower-glint--1" />
          <i className="empower-glint empower-glint--2" />
          <i className="empower-glint empower-glint--3" />
        </span>
      );
    case "rune":
      return <span className="empower-rune" />;
    case "motes":
      return (
        <>
          <i className="empower-mote empower-mote--1" />
          <i className="empower-mote empower-mote--2" />
          <i className="empower-mote empower-mote--3" />
        </>
      );
    case "diamond":
      return <span className="empower-diamond" />;
    case "arcs":
      return <span className="empower-arcs" />;
    default:
      // halo: the pooled glow + shine sweep alone — the calm variant.
      return null;
  }
}

/** Shining aura under a piece empowered by a self-grant card: a soft breathing
 * pool of light in the CARD's own tint (tier color hue-shifted per card id),
 * decorated by the card's hash-picked shape variant (orbiting glints, rune
 * frame, rising motes...). Purely decorative; never intercepts input and never
 * obscures the piece (mount it before the piece div). */
export function EmpowerShine({ tier, cardId }: { tier: number; cardId?: string }) {
  return (
    <div
      aria-hidden
      className="empower-shine absolute inset-0 pointer-events-none"
      style={{ "--tier-rgb": auraTint(tier, cardId) } as React.CSSProperties}
    >
      <AuraVariantLayer variant={auraVariant(cardId)} />
    </div>
  );
}

/** Hostile twin of EmpowerShine: a slow, ominous ember glow marking a square
 * the viewer's NERF is acting on (a banned square, a forced piece, a piece
 * cursed by a constraint card...). Reuses the shine plumbing with the
 * .nerf-aura overrides in globals.css: slower breathe, reversed motion, no
 * cheerful sweep. When mounted for a CARD (cardId given), the ember is tinted
 * and shaped per card exactly like EmpowerShine, so two different curses read
 * differently; id-less mounts keep the classic terracotta orbit. Mounted
 * before the piece div so pieces always paint on top. */
export function NerfAura({ cardId, tier }: { cardId?: string; tier?: number }) {
  return (
    <div
      aria-hidden
      className="empower-shine nerf-aura absolute inset-0 pointer-events-none"
      style={{ "--tier-rgb": nerfTint(cardId, tier) } as React.CSSProperties}
    >
      <AuraVariantLayer variant={auraVariant(cardId)} />
    </div>
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
