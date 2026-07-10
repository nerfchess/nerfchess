// Canvas VFX specs for the funny/meta bespoke animation set (see vfxExtra.ts).
// Owned by the funny/meta workstream.
//
// One entry per funnyPlays.tsx card whose canvas moment should differ from
// the tier default: palettes matched to each card's fiction, travel/impact
// picked to fit the gag. Tier <= 3 entries stay subtle (small impacts, no
// heavy debris) and NOTHING here shakes — the board-thump convention is
// reserved for tier 7+ and none of these cards clears tier 6.

import type { CardVfx } from "./vfxSpecs";

export const FUNNY_VFX: Record<string, CardVfx> = {
  // ---- Tier 6 ----
  // A suspiciously strong "new player" drops out of the matchmaking sky onto
  // your half — smurf-blue arrival, a little landing dust, a winner's gleam.
  smurf_account: { travel: "rain", impact: "smoke", aftermath: "sparkle", palette: ["#5aa0e8", "#9fd8ff", "#ffffff"], source: "sky" },
  // The register rings at your king: golden checkout sparkle, receipts settle.
  pay_to_win: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#8fd0a0", "#fff7de"], source: "caster" },

  // ---- Tier 5 ----
  // The window slams to desktop: one hard close-button shock, no fire, no
  // glitter — just the thud of a crashed client.
  alt_f4: { travel: "none", impact: "shock", aftermath: "none", palette: ["#e84d5b", "#c9d6e8", "#232a38"], source: "lead" },
  // A green wave of lawn rolls over their king; pollen sparkles linger.
  touch_grass: { travel: "wave", impact: "sparkle", aftermath: "sparkle", palette: ["#5fae52", "#a8e063", "#2f6b2f"], source: "center" },
  // The spotlight beam finds the star from above; plot-armor glitter settles.
  main_character: { travel: "beam", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#fff7de", "#f2778f"], source: "sky" },

  // ---- Tier 4 ----
  // The nerf patch installs on their next card: a grey deflating puff, the
  // opposite of a power-up.
  day_one_patch: { travel: "none", impact: "smoke", aftermath: "none", palette: ["#9aa5ba", "#5c6880", "#e8edf6"], source: "lead" },
  // Season rewards ding at your own clock: gold tier-up sparkle.
  battle_pass: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#b98cff", "#fff7de"], source: "caster" },
  // The ad bounces IN from offscreen and lands with a bounce-shock where the
  // knight spawns.
  pop_up_ad: { travel: "arc", impact: "shock", aftermath: "none", palette: ["#e8a24d", "#ffe9a8", "#5aa0e8"], source: "sky" },
  // The mute lands as a red hush: a soft muffling puff over their heavy hitters.
  mute_button: { travel: "none", impact: "smoke", aftermath: "none", palette: ["#e84d5b", "#aab6c8", "#2a2e3a"], source: "lead" },
  // The diagnosis settles over their whole army: a sad grey-orange fizzle.
  skill_issue: { travel: "wave", impact: "smoke", aftermath: "none", palette: ["#e8a24d", "#aab6c8", "#39445c"], source: "center" },

  // ---- Tier 3 (subtle floor) ----
  // Someone found the stream: a thin red tracer from the sniper's side, a
  // quiet lock-on glint. No boom — it's a peek, not a hit.
  stream_sniper: { travel: "beam", impact: "sparkle", aftermath: "none", palette: ["#e84d5b", "#c9d6e8", "#161b26"], source: "caster" },
  // The connection dies: a tiny puff of packet-loss smoke and nothing else.
  lag_spike: { travel: "none", impact: "smoke", aftermath: "none", palette: ["#e84d5b", "#8b99b8", "#141926"], source: "lead" },
  // The undo arcs the captured piece back out of the graveyard onto its square.
  ctrl_z: { travel: "arc", impact: "sparkle", aftermath: "sparkle", palette: ["#5aa0e8", "#cfe0f5", "#ffffff"], source: "caster" },
  // The chicken arcs in from above and lands with a small squeaky shock.
  rubber_chicken: { travel: "arc", impact: "shock", aftermath: "none", palette: ["#f3c93f", "#e2554d", "#fff7de"], source: "sky" },

  // ---- Tier 2 ----
  // A small round friend arrives in your pocket: the gentlest pink sparkle.
  emotional_support_pawn: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#f2778f", "#ffe9a8", "#ffffff"], source: "lead" },
};
