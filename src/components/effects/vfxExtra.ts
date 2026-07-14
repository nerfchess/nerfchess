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

// Canvas VFX for the meme-pack bespoke animations (memePlays.tsx),
// palette-matched to each card's DOM art. Only the tier-7 orbital cow shakes
// (board-thump stays a tier 7+ privilege); the tier 2-3 entries stay subtle.
const MEME_VFX: Record<string, CardVfx> = {
  // ---- Tier 7 ----
  // The ringed cow swings in from above: golden ring-dust arcs down onto the rim.
  la_vaca_saturno_saturnita: { travel: "arc", impact: "burst", aftermath: "sparkle", palette: ["#f2c46a", "#9a6cc4", "#ffe9b8"], source: "sky", shake: true },

  // ---- Tier 6 ----
  // The espresso assassin's strike: one crack of steel, a brown splash, no residue.
  cappuccino_assassino: { travel: "bolt", impact: "shock", aftermath: "none", palette: ["#c2d2e0", "#7d4e2c", "#fff8ec"], source: "caster" },

  // ---- Tier 5 ----
  // The fridge doors open: a cold front rolls over the chosen pieces and frost stays.
  frigo_camelo: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#8fd8f2", "#d6f4ff", "#4fa8cc"], source: "lead" },
  // The vortex churns the middle of the board: blue spray, nothing lingers.
  skibidi_flush: { travel: "wave", impact: "shock", aftermath: "none", palette: ["#5db6e8", "#bfeaff", "#2a6ea8"], source: "center" },

  // ---- Tier 4 ----
  // The formation twirl: soft pink sparkle where the dancers step.
  ballerina_cappuccina: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#f5a8c0", "#ffd9e4", "#c96a8e"], source: "lead" },
  // The moai lands: grey debris and dust from above, then stillness (of course).
  moai_head: { travel: "rain", impact: "debris", aftermath: "none", palette: ["#848e98", "#b4bcc4", "#4e5862"], source: "sky" },

  // ---- Tier 2-3 (subtle floor) ----
  // The shrimp legs graft on: a small coral glitch-pop on each victim.
  trippi_troppi: { travel: "none", impact: "burst", aftermath: "none", palette: ["#f2825a", "#5db6e8", "#ffb08a"], source: "lead" },
  // The chill guy passes by: the faintest grey shimmer. He would not want more.
  chill_guy: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#8b93a2", "#c9d2dc", "#5c6472"], source: "caster" },
};

export const EXTRA_CARD_VFX: Record<string, CardVfx> = { ...FUNNY_VFX, ...PERSONAL_VFX, ...MEME_VFX };
