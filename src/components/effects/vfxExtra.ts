// Plug-in canvas VFX specs, registered outside vfxSpecs.ts so other
// workstreams can add entries without editing the (very large) core table.
// Keyed by card id; a key already present in CARD_VFX is ignored (core wins).
// Same CardVfx contract as vfxSpecs.ts: travel/impact/aftermath/palette/
// source, optional shake (tier 7+ only by convention).

import type { CardVfx } from "./vfxSpecs";
import { FUNNY_VFX } from "./funnyVfx";

// Canvas VFX for the personal-set bespoke animations (personalPlays.tsx),
// palette-matched to each card's DOM art. Only the tier-8 charm takeover
// shakes (the board-thump convention is reserved for tier 7+); the tier-3
// entry stays subtle per the low-tier floor.
const PERSONAL_VFX: Record<string, CardVfx> = {
  // ---- Tier 8 ----
  // The whimper broadcast: rose charm-waves wash the board and glitter hangs.
  ilovewhimperingaudios: { travel: "wave", impact: "sparkle", aftermath: "sparkle", palette: ["#f2778f", "#c9b0e8", "#ffd7e0"], source: "caster", shake: true },

  // ---- Tier 6 ----
  // 225 comes down over the middle: one heavy racking shock, no glitter.
  bench_225: { travel: "none", impact: "shock", aftermath: "none", palette: ["#aab6c8", "#e84d5b", "#39445c"], source: "center" },
  // The bond arcs between the couple: rose sparkle, lingering warmth.
  ilovemakingout: { travel: "arc", impact: "sparkle", aftermath: "sparkle", palette: ["#e8506e", "#ffb3c1", "#fff0f4"], source: "caster" },

  // ---- Tier 5 ----
  // The face wrenches loose: a chunky sticker-colored pop where it lands.
  rubiks_cube: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#ffd23f", "#e6432c", "#4fa3d1"], source: "lead" },
  // The gold part-line drops from above: a clean beam down the center.
  middle_part: { travel: "beam", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#fff2c9", "#e8b04b"], source: "sky" },
  // The stride bounds from the caster's side: spring-green kick-up.
  hyein: { travel: "arc", impact: "sparkle", aftermath: "sparkle", palette: ["#7fd68a", "#a8e063", "#3f7a52"], source: "caster" },

  // ---- Tier 4 ----
  // Chalk blast at the bar: a white dust puff and a golden lock-out glint.
  muscle_up: { travel: "none", impact: "smoke", aftermath: "sparkle", palette: ["#e8edf6", "#aab6c8", "#ffd76a"], source: "lead" },
  // The grip surges up from the caster's ranks: a crimson pulse, no debris.
  forearm_veins: { travel: "wave", impact: "shock", aftermath: "none", palette: ["#d6234f", "#ff8a7a", "#5a1512"], source: "caster" },
  // The hush rolls over the middle of the board: smooth blue, nothing burns.
  daniel_caesar: { travel: "wave", impact: "sparkle", aftermath: "none", palette: ["#4a7fd6", "#9fc4ff", "#1c2c52"], source: "center" },

  // ---- Tier 3 (subtle floor) ----
  // Keycaps patter down: a light yellow-grey sprinkle, no boom.
  monkeytype: { travel: "rain", impact: "sparkle", aftermath: "none", palette: ["#e8d24d", "#e8edf6", "#39445c"], source: "sky" },
};

export const EXTRA_CARD_VFX: Record<string, CardVfx> = { ...FUNNY_VFX, ...PERSONAL_VFX };
