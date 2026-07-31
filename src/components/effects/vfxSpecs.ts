/**
 * vfxSpecs.ts — per-card VFX specs for the canvas effects engine.
 *
 * Every bespoke SIGNATURES card of tier >= 4 gets a hand-tuned CardVfx here,
 * spatially anchored to where the effect actually applies (mover / lead /
 * caster / sky / center). Generated (non-bespoke) tier-4+ cards fall back to
 * a fiction-matched per-family default in GEN_FAMILY_VFX. Tiers 1-3 get a
 * basic-but-present floor (small impact only) in resolveCardVfx below.
 *
 * The travel/impact/aftermath vocabulary is the canvas engine's contract,
 * imported type-only from ./vfx/types. CardVfx is the per-card spec shape the
 * host uses to build a VfxPlay (it supplies tier + resolved board points).
 */

import type { VfxTravel, VfxImpact, VfxAftermath } from "./vfx/types";
// Category lookup for the tier 1-3 floor (bespoke low-tier cards carry no gen
// family). The buff library is a pure engine module — no import back into any
// component — so this static import cannot form a cycle; the BoardEffects
// self-check below still uses a dynamic import because THAT edge would cycle.
import { BUFF_BY_ID } from "@/engine/buffs/library";
// Plug-in canvas specs from the funny/meta bespoke workstream (own file, so
// this large table and that set can be edited concurrently). Core CARD_VFX
// entries win on collision.
import { EXTRA_CARD_VFX } from "./vfxExtra";

export type { VfxTravel, VfxImpact, VfxAftermath };

export interface CardVfx {
  travel: VfxTravel;
  impact: VfxImpact;
  aftermath: VfxAftermath;
  /** 2-4 css colors, primary first — matched to the card's fiction. */
  palette: string[];
  /** Where the travel starts: the moving piece's origin square, the
   * choreography lead square, the caster's king, above the board, board
   * center, or the square the card was actually cast on. Resolved by
   * resolveVfxSource (vfxSource.ts) into the same board-fraction space the DOM
   * scene layer derives its geometry vars from, so the two layers always aim
   * at the same place. */
  source: "mover" | "lead" | "caster" | "sky" | "center" | "cast";
  /** Travel along the real victim order rather than fanning from one origin:
   * leg N starts where leg N-1 landed. Matches the DOM layer's per-target legs,
   * so a sweep reads as one travelling strike on both layers at once. */
  chain?: boolean;
  /** Board thump on impact — a tier 7+ privilege. No spec below tier 7 sets
   * this (the tier 5-6 "great" band tops out at travel + impact + one
   * shockwave in its overlay art). */
  shake?: boolean;
}

// --- Bespoke specs, one per tier>=4 SIGNATURES card ---------------------------
// Grouped by tier, descending. Keep keys in sync with BoardEffects.SIGNATURES;
// the dev self-check at the bottom of this file warns on any gap.

export const CARD_VFX: Record<string, CardVfx> = {
  // ---- Tier 10 — apex ----
  // RIDICULOUS band (owner pass): every tier 9/10 overlay lead is now a
  // bespoke ~3s physical-comedy set piece (fist slam, rage-quit board flip,
  // guillotine, pearly gates...), so these canvas specs run the heaviest
  // vocabulary available — big travel, hard impacts, a LINGERING aftermath on
  // every entry (nothing in this band ends quietly), and shake on. The host
  // scales particle density by tier, so tier 9/10 already draws the densest
  // impacts the engine can produce.
  // Whole army becomes amazons: a royal surge rolls out from the middle of your host.
  ascendancy: { travel: "wave", impact: "burst", aftermath: "sparkle", palette: ["#b98cff", "#ffd76a", "#ffffff"], source: "center", shake: true },
  // A fresh army thunders down out of the sky onto your half.
  grand_army: { travel: "rain", impact: "debris", aftermath: "sparkle", palette: ["#d8dee9", "#ffd76a", "#8a94a8"], source: "sky", shake: true },
  // A wave of unmaking rolls out from your king and erases the enemy army.
  oblivion: { travel: "wave", impact: "burst", aftermath: "smolder", palette: ["#7b3fbf", "#1a1030", "#e3d0ff"], source: "caster", shake: true },
  // Firebombs rain across the enemy lines while your relief force lands.
  total_war: { travel: "rain", impact: "debris", aftermath: "scorch", palette: ["#e6432c", "#ff9d3d", "#3a1c12"], source: "sky", shake: true },

  // ---- Tier 9 ----
  // The lights go out: darkness pours down over the whole enemy board. Eerie — and now
  // the dark HANGS there (apex aftermath: nothing in this band ends quietly).
  blackout: { travel: "wave", impact: "shock", aftermath: "smolder", palette: ["#141322", "#3a3766", "#0a0a12"], source: "sky", shake: true },
  // Quiet holy coronation on your own king.
  divine_right: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#ffd76a", "#fff7de", "#b98cff"], source: "sky", shake: true },
  // A glacial front sweeps the whole board and locks the enemy solid.
  ice_age: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#9fd8ff", "#e8f8ff", "#3f7fb5"], source: "center", shake: true },
  // Heavy reinforcements slam down into your half.
  iron_legion: { travel: "rain", impact: "debris", aftermath: "sparkle", palette: ["#aab6c8", "#e3e9f2", "#ffd76a"], source: "sky", shake: true },
  // A god descends: a golden shaft splits the sky and slams into the chosen
  // piece's square, divine light everywhere (owner: "effects should be way
  // cooler" — this is the apex empowerment, it thumps).
  living_god: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#ffd76a", "#fff7de", "#ffffff"], source: "sky", shake: true },
  // A stone-grey wave rolls over the enemy court and hardens it.
  mass_petrify: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#8d8d94", "#c9c9cf", "#4c4c53"], source: "center", shake: true },
  // Your queen streaks across the board to the enemy king; frost locks the court behind her.
  regicide: { travel: "bolt", impact: "shock", aftermath: "frost", palette: ["#d6234f", "#ffd76a", "#bfe6ff"], source: "mover", shake: true },
  // Every fallen piece climbs back out of the ground in a field of grave-light.
  resurrection: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#d8ffe9", "#ffd76a", "#7fd8a8"], source: "lead", shake: true },
  // A radiant queen descends and a ward settles over your whole host.
  second_coming: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#fff2c9", "#ffd76a", "#ffffff"], source: "sky", shake: true },

  // ---- Tier 8 ----
  // Crowns rain down on your knights and bishops.
  amazon_army: { travel: "rain", impact: "burst", aftermath: "sparkle", palette: ["#ffd76a", "#b98cff", "#fff7de"], source: "sky", shake: true },
  // Four moves in a row: a hard tempo snap at your king's square.
  blitzkrieg: { travel: "none", impact: "shock", aftermath: "none", palette: ["#ffcf4d", "#ffffff", "#e6432c"], source: "caster", shake: true },
  // A payload whistles down and levels a 5x5 zone.
  bombardiro_croc: { travel: "rain", impact: "debris", aftermath: "scorch", palette: ["#7c8a4a", "#ff9d3d", "#3a3526"], source: "sky", shake: true },
  // A meteor flattens a 3x3 area.
  cataclysmic_meteor: { travel: "rain", impact: "debris", aftermath: "smolder", palette: ["#ff7a29", "#e6432c", "#3a1c12"], source: "sky", shake: true },
  // Going live to the squad: a broadcast wave washes out and the frozen
  // targets keep a phone-screen glow.
  check_out_our_socials: { travel: "wave", impact: "sparkle", aftermath: "sparkle", palette: ["#5aa0e8", "#f2778f", "#fff1f6"], source: "caster", shake: true },
  // A cathedral ward blooms out from your king over your whole half.
  divine_fortress: { travel: "wave", impact: "shock", aftermath: "sparkle", palette: ["#ffd76a", "#e8fff7", "#5fc9b0"], source: "caster", shake: true },
  // The enemy court is flash-frozen into statues.
  eternal_freeze: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#bfe6ff", "#ffffff", "#5a8fc0"], source: "center", shake: true },
  // Every enemy minor and pawn is wiped away in one ashen sweep.
  extinction: { travel: "wave", impact: "burst", aftermath: "smolder", palette: ["#9a8f8a", "#e6432c", "#2b2320"], source: "center", shake: true },
  // Phoenix fire re-forms your queen, rooks, and a minor where they land.
  full_resurrection: { travel: "none", impact: "embers", aftermath: "sparkle", palette: ["#ff9d3d", "#ffd76a", "#e6432c"], source: "lead", shake: true },
  // Pocket refills to full strength: a quiet arcane restock at your king.
  grand_reset: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#ffd76a", "#6fe3ff", "#ffffff"], source: "caster", shake: true },
  // Three bolts of wrath split the sky and smite named pieces.
  heavens_wrath: { travel: "bolt", impact: "burst", aftermath: "scorch", palette: ["#ffffff", "#ffd76a", "#7fb5ff"], source: "sky", shake: true },
  // The shield closes over your own half: a warm rose ward, glitter that stays.
  i_love_my_gf: { travel: "wave", impact: "shock", aftermath: "sparkle", palette: ["#e8506e", "#ffb3c1", "#fff0f4"], source: "caster", shake: true },
  // Everything comes down at once and only the two kings are left standing.
  // The wreckage keeps burning: the heaviest aftermath in the vocabulary.
  ihatemyex: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#d6234f", "#2b2320", "#ff7a29"], source: "center", shake: true },
  // A permanent shade settles over your king. Quiet and absolute.
  immortal_king: { travel: "none", impact: "shock", aftermath: "sparkle", palette: ["#ffd76a", "#2c3e6b", "#dfe8ff"], source: "caster", shake: true },
  // The basilisk's gaze lances out and turns its victim to stone.
  medusa_stare: { travel: "beam", impact: "debris", aftermath: "smolder", palette: ["#7fae5a", "#8d8d94", "#2f3a26"], source: "caster", shake: true },
  // Grey petrification creeps across the enemy minors.
  petrified_forest: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#8d8d94", "#7fae5a", "#4c4c53"], source: "center", shake: true },
  // Every fallen piece bursts back to life in a rush of phoenix embers.
  phoenix_rebirth: { travel: "none", impact: "embers", aftermath: "sparkle", palette: ["#ff7a29", "#ffd76a", "#d6234f"], source: "lead", shake: true },
  // Your queen detonates the whole enemy board around their royals.
  queens_apocalypse: { travel: "wave", impact: "burst", aftermath: "scorch", palette: ["#d6234f", "#ff9d3d", "#1c0f18"], source: "mover", shake: true },
  // A cage of stopped time slams shut over the enemy side.
  time_prison: { travel: "none", impact: "shock", aftermath: "none", palette: ["#ffd76a", "#6fe3ff", "#3a3766"], source: "center", shake: true },
  // Three pieces are quietly forged into unkillable titans.
  titan_legion: { travel: "none", impact: "shock", aftermath: "sparkle", palette: ["#d8a85a", "#ffd76a", "#8a94a8"], source: "lead", shake: true },
  // Three annihilating darts leap from your king to the doomed pieces.
  total_annihilation: { travel: "arc", impact: "burst", aftermath: "smolder", palette: ["#8f2bbf", "#e6432c", "#2a1030"], source: "caster", shake: true },
  // Three squares tear open into hungry voids. A trap, not a bang.
  void_realm: { travel: "none", impact: "shock", aftermath: "smolder", palette: ["#5b2b8f", "#12081f", "#b98cff"], source: "lead", shake: true },
  // Stone skin ripples over your army; a protection, so no thump.
  we_stoneskin: { travel: "wave", impact: "shock", aftermath: "none", palette: ["#b0a68f", "#d9d2c0", "#6e6552"], source: "center", shake: true },
  // The world grinds to a halt: a dead-grey stillness locks the enemy army.
  world_end: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#c9cdd6", "#8a94a8", "#eef1f7"], source: "center", shake: true },

  // ---- Tier 7 ----
  // Two squares yawn open into the abyss. Trap placement, quiet dread.
  abyss: { travel: "none", impact: "shock", aftermath: "smolder", palette: ["#3b1a5e", "#0d0618", "#8f6bff"], source: "lead", shake: true },
  // (moved to tier 6 by the info-card rework — shake dropped, board thumps are a tier 7+ privilege)
  aegis: { travel: "none", impact: "shock", aftermath: "sparkle", palette: ["#5fc9b0", "#ffd76a", "#e8fff7"], source: "caster" },
  // The ancient ward rolls out from your king over everything you own.
  aegis_of_ages: { travel: "wave", impact: "shock", aftermath: "sparkle", palette: ["#c9a84c", "#5fc9b0", "#fff7de"], source: "caster", shake: true },
  // The queen is crowned an Amazon on her own square.
  amazon: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#b98cff", "#ffd76a", "#ffffff"], source: "lead", shake: true },
  // Two annihilating darts from your king unmake their targets.
  annihilation: { travel: "arc", impact: "burst", aftermath: "smolder", palette: ["#8f2bbf", "#d6234f", "#2a1030"], source: "caster", shake: true },
  // A pawn ascends in a gout of blood-light while its sibling bursts.
  blood_pact: { travel: "none", impact: "burst", aftermath: "smolder", palette: ["#a3122e", "#ff5c5c", "#1c0f12"], source: "lead", shake: true },
  // A tornado tears across the board and scrambles every pawn.
  chaos_theory: { travel: "wave", impact: "debris", aftermath: "none", palette: ["#8a94a8", "#5fc9b0", "#d8dee9"], source: "center", shake: true },
  // A creeping cold-plague enchantment drifts from your king. No immediate hit.
  contagion: { travel: "arc", impact: "shock", aftermath: "frost", palette: ["#7fd8d8", "#9fae5a", "#dff7f7"], source: "caster", shake: true },
  // Glacial cold radiates outward and locks the whole enemy army.
  deep_freeze: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#4f8fd1", "#bfe6ff", "#ffffff"], source: "center", shake: true },
  eternal_reign: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#ffd76a", "#ffffff", "#c9a84c"], source: "caster", shake: true },
  // On the beat: the piece dashes its lane and smashes through what stands in
  // it. Neon rhythm-game colors, hard landing, no residue left behind.
  geometry_dash: { travel: "beam", impact: "shatter", aftermath: "none", palette: ["#3fdf6f", "#4fe3ff", "#ffffff"], source: "mover", shake: true },
  // One knight is consecrated as a godslayer on its square.
  godslayer_knight: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#8f6bff", "#dfe3ff", "#ffd76a"], source: "lead", shake: true },
  // Queen and minor rise together in soft grave-light.
  grand_resurrection: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#fff2c9", "#7fd8a8", "#ffffff"], source: "lead", shake: true },
  // A grey hex rolls off your king and hardens the enemy flanks to stone.
  hex_of_stone: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#8d8d94", "#7fae5a", "#3a3a40"], source: "caster", shake: true },
  // She comes home shielded: a warm rose arrival on her square, ward glitter
  // hanging over it for as long as the shield lasts.
  ilovemysister: { travel: "arc", impact: "burst", aftermath: "sparkle", palette: ["#f2778f", "#ffd7e0", "#c96a8e"], source: "lead", shake: true },
  // The golden payout wheel spins down at your king and pays out in coins.
  jackpot: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#ffd76a", "#f4c430", "#ffffff"], source: "caster", shake: true },
  // A warband musters into your pocket beside your king.
  kings_legion: { travel: "none", impact: "shock", aftermath: "none", palette: ["#c94a3a", "#ffd76a", "#8a94a8"], source: "caster", shake: true },
  // A meteor slams the crossing square; rank and file go up with it.
  meteor: { travel: "rain", impact: "debris", aftermath: "smolder", palette: ["#ff7a29", "#e6432c", "#2b1a12"], source: "sky", shake: true },
  // A spectre claws up out of the square in grave-green smoke.
  necromancer: { travel: "none", impact: "shock", aftermath: "smolder", palette: ["#5fae7f", "#1a2a1e", "#c9ffd8"], source: "lead", shake: true },
  // Three moves in a row: an aggressive tempo crack at your king.
  onslaught: { travel: "none", impact: "shock", aftermath: "none", palette: ["#e6432c", "#ffcf4d", "#ffffff"], source: "caster", shake: true },
  // A thread of dominion snakes from your king into the stolen piece.
  orb_of_dominion: { travel: "arc", impact: "shock", aftermath: "sparkle", palette: ["#8f2bbf", "#ffd76a", "#e3d0ff"], source: "caster", shake: true },
  // The clock overheats: hot cyan sparks at your king.
  overclocked: { travel: "none", impact: "shock", aftermath: "none", palette: ["#6fe3ff", "#ffcf4d", "#ffffff"], source: "caster", shake: true },
  // Three pawns transmute to gold queens where they stand.
  philosophers_stone: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#ffd76a", "#fff7de", "#c9a84c"], source: "lead", shake: true },
  // A purging sweep scours one half of the board.
  purge_realm: { travel: "wave", impact: "burst", aftermath: "smolder", palette: ["#b98cff", "#ffffff", "#3b1a5e"], source: "center", shake: true },
  // The queen physically sweeps the line, smashing everything on it.
  queens_rampage: { travel: "beam", impact: "debris", aftermath: "none", palette: ["#d6234f", "#ffd76a", "#3a0e1a"], source: "mover", shake: true },
  // The ground gives way under the whole pawn line.
  ruin: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#8a7a63", "#ff9d3d", "#3a3026"], source: "center", shake: true },
  // The queen reaps a diagonal; souls stream off as pawns rise behind her.
  soul_harvest: { travel: "beam", impact: "burst", aftermath: "sparkle", palette: ["#5fae7f", "#1a1420", "#c9ffd8"], source: "mover", shake: true },
  // A dragon queen and her hatchling settle into your pocket on hot embers.
  summon_dragon: { travel: "none", impact: "embers", aftermath: "sparkle", palette: ["#d6234f", "#ffd76a", "#ff9d3d"], source: "caster", shake: true },
  // A chalk circle flares at your king and a warband steps through.
  summoning_circle: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#8f6bff", "#6fe3ff", "#e3d0ff"], source: "caster", shake: true },
  // Time skips, then ice takes the whole enemy army.
  time_freeze: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#6fe3ff", "#ffffff", "#3f7fb5"], source: "center", shake: true },
  // One piece is quietly forged into a titan.
  titan: { travel: "none", impact: "shock", aftermath: "sparkle", palette: ["#d8a85a", "#8a94a8", "#ffd76a"], source: "lead", shake: true },
  // Crowns rain down on all your knights.
  triple_amazon: { travel: "rain", impact: "burst", aftermath: "sparkle", palette: ["#ffd76a", "#8f6bff", "#fff7de"], source: "sky", shake: true },
  // The genie's smoke curls up at your king and leaves a queen behind.
  wc_genie_wish: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#c94ad1", "#5fc9b0", "#ffd76a"], source: "caster", shake: true },
  // Boulders drop out of the sky and bury the enemy heavies.
  we_landslide: { travel: "rain", impact: "debris", aftermath: "smolder", palette: ["#8a7a63", "#5c5348", "#d9d2c0"], source: "sky", shake: true },
  // A blizzard howls down over the enemy army.
  we_whiteout: { travel: "rain", impact: "shatter", aftermath: "frost", palette: ["#ffffff", "#bfe6ff", "#8fb8d8"], source: "sky", shake: true },
  // Trenches dug, heads down: an earthen ward around your king.
  ww_dug_in_defense: { travel: "none", impact: "debris", aftermath: "none", palette: ["#7c8a4a", "#b0a68f", "#d9d2c0"], source: "caster", shake: true },

  // ---- Tier 6 ----
  all_in: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#ffd76a", "#e6432c", "#1c7a4a"], source: "caster" },
  // Four dead pawns claw into your pocket on grave smoke.
  army_of_the_dead: { travel: "none", impact: "smoke", aftermath: "smolder", palette: ["#5fae7f", "#2a2a30", "#c9ffd8"], source: "caster" },
  // Detention lands on the 3x3: a chalk-dust slam over the chosen square and
  // the class stays put. Institutional green, nothing burns.
  bayview_secondary_school: { travel: "none", impact: "smoke", aftermath: "none", palette: ["#4a7a52", "#d9d2c0", "#2b3a2e"], source: "lead" },
  // A war-rage wave rolls over your whole army.
  berserker: { travel: "wave", impact: "shock", aftermath: "none", palette: ["#e6432c", "#ff9d3d", "#7a1a10"], source: "center" },
  // A sudden cold snap freezes the enemy army solid.
  brr_brr_patapim: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#9fd8ff", "#ffffff", "#4f8fd1"], source: "center" },
  // Trapdoors drop the entire enemy pawn line.
  cataclysm: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#8a7a63", "#5c5348", "#ff9d3d"], source: "center" },
  // Your bishops sprout wings of light.
  celestial_ascension: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#9fc9ff", "#ffffff", "#ffd76a"], source: "center" },
  colossus: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#d8a85a", "#8a94a8", "#fff2c9"], source: "lead" },
  // A ray of heaven's authority converts one enemy piece.
  divine_mandate: { travel: "arc", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#ffffff", "#5fc9b0"], source: "caster" },
  // Crowns rain on both knights.
  double_amazon: { travel: "rain", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#b98cff", "#ffffff"], source: "sky" },
  // The earth splits down a whole file, permanently.
  fissure: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#8a7a63", "#3a3026", "#d9d2c0"], source: "lead" },
  // The bishop is recast in ringing glass.
  glass_cannon: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#aef0ff", "#ffffff", "#ff9dd6"], source: "lead" },
  god_king: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#8f2bbf", "#fff7de"], source: "caster" },
  // Everything the king touches turns to gold.
  golden_touch: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#c9a84c", "#fff7de"], source: "caster" },
  grand_summon: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#5fc9b0", "#ffd76a", "#e8fff7"], source: "caster" },
  // Space bends inward around your king.
  gravity_well: { travel: "wave", impact: "shock", aftermath: "none", palette: ["#4a3b8f", "#8f6bff", "#12081f"], source: "caster" },
  // A VHS rewind glitch crackles from your king onto the enemy.
  groundhog_day: { travel: "arc", impact: "sparkle", aftermath: "none", palette: ["#ff4fd8", "#4fe3ff", "#ffffff"], source: "caster" },
  guardian_angel: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#ffffff", "#ffd76a", "#9fc9ff"], source: "caster" },
  // One long brass note fills your pocket.
  horn_of_summoning: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#c9a84c", "#8a6a3a", "#fff2c9"], source: "caster" },
  // Harmony spreads piece to piece across your whole formation: a soft blue
  // wave from the middle of your host, glitter left on the linked ranks.
  i_love_newjeans: { travel: "wave", impact: "sparkle", aftermath: "sparkle", palette: ["#7fb5ff", "#c9b0e8", "#fff1f6"], source: "center" },
  // The signature goes on the board: gold ink strikes the bound piece and the
  // ward glitter sits on it while the shield holds.
  joseph_leung: { travel: "beam", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#c9a84c", "#fff7de"], source: "lead" },
  // A pillar of holy light smites, then petrifies the bystanders.
  judgment_day: { travel: "bolt", impact: "burst", aftermath: "scorch", palette: ["#ffffff", "#ffd76a", "#8d8d94"], source: "sky" },
  // The kraken surfaces in a burst of black water.
  kraken: { travel: "none", impact: "burst", aftermath: "none", palette: ["#1f6e6e", "#0d2b33", "#7fd8d8"], source: "lead" },
  // Four squares get little gold deeds slapped on them.
  landlord: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#ffd76a", "#1c7a4a", "#fff7de"], source: "lead" },
  // The phylactery pulses with stored necromancy at your king.
  lich_phylactery: { travel: "none", impact: "smoke", aftermath: "smolder", palette: ["#5fae7f", "#8f2bbf", "#1a2a1e"], source: "caster" },
  // Bolts drop on up to three enemy pieces.
  lightning_strike: { travel: "bolt", impact: "burst", aftermath: "scorch", palette: ["#ffffff", "#7fb5ff", "#ffd76a"], source: "sky" },
  // A magnetic field hums across your knights.
  magnetism: { travel: "none", impact: "shock", aftermath: "none", palette: ["#5a8fc0", "#c9cdd6", "#6fe3ff"], source: "center" },
  // Frost snaps across the whole enemy army.
  mass_freeze: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#bfe6ff", "#ffffff", "#5a8fc0"], source: "center" },
  // Four mines are buried under a puff of disturbed earth.
  minefield: { travel: "none", impact: "smoke", aftermath: "none", palette: ["#7c8a4a", "#5c5348", "#c94a3a"], source: "lead" },
  // Cheeky orange-and-pink zap on up to two pieces.
  nerf_this: { travel: "bolt", impact: "burst", aftermath: "scorch", palette: ["#ff9d3d", "#ff4fa3", "#ffffff"], source: "sky" },
  overwhelm: { travel: "none", impact: "shock", aftermath: "none", palette: ["#ffcf4d", "#e6432c", "#ffffff"], source: "caster" },
  // A purging sweep runs the length of one rank.
  purge_line: { travel: "wave", impact: "burst", aftermath: "smolder", palette: ["#b98cff", "#ffffff", "#3b1a5e"], source: "lead" },
  // The queen sweeps her line, and frost blooms where she lands.
  queens_wrath: { travel: "beam", impact: "burst", aftermath: "frost", palette: ["#d6234f", "#bfe6ff", "#ffd76a"], source: "mover" },
  // Three rocs sweep down to roost in your pocket.
  roost_of_rocs: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#b58a5a", "#9fc9ff", "#fff2c9"], source: "caster" },
  // Three sinkholes crumble open on the board.
  sinkhole: { travel: "none", impact: "debris", aftermath: "none", palette: ["#6e5c48", "#2b2320", "#b0a68f"], source: "lead" },
  // A gnawing brown haze settles onto the enemy rooks.
  termites: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#8a6a3a", "#d9c9a0", "#4a3a22"], source: "caster" },
  time_lock: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#ffd76a", "#6fe3ff", "#3a3766"], source: "caster" },
  wa_quicken: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#6fe3ff", "#ffd76a", "#ffffff"], source: "caster" },
  // Warp light flickers over up to four repositioned pieces.
  warp_storm: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#8f6bff", "#6fe3ff", "#e3d0ff"], source: "center" },
  // Three pawns conga into enemy territory under festival lights.
  wc_conga_line: { travel: "arc", impact: "sparkle", aftermath: "none", palette: ["#ff4fa3", "#ffcf4d", "#4fe3ff"], source: "caster" },
  // Twin cold darts fly out and case two pieces in ice.
  wc_double_trouble: { travel: "arc", impact: "shatter", aftermath: "frost", palette: ["#9fd8ff", "#ffffff", "#4f8fd1"], source: "caster" },
  wc_juggling_act: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#e6432c", "#ffcf4d", "#ffffff"], source: "caster" },
  // The wrecking ball swings in on its arc and ploughs down the line.
  wc_wrecking_ball: { travel: "arc", impact: "debris", aftermath: "smolder", palette: ["#8a94a8", "#ff9d3d", "#3a3a40"], source: "mover" },
  // Ice bursts outward from your own king, flash-freezing the ring around it.
  we_flash_freeze: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#bfe6ff", "#ffffff", "#6fb5e8"], source: "caster" },
  // Floodwater sloshes over three squares.
  we_flood: { travel: "wave", impact: "burst", aftermath: "none", palette: ["#3f7fb5", "#7fd8d8", "#dff7ff"], source: "lead" },
  // Two walls of blue ice grind up out of the files.
  we_glacier_wall: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#7fb5e8", "#e8f8ff", "#3f6f9f"], source: "lead" },
  // A hellfire beam burns the full diagonal down to cinders.
  we_hellfire_beam: { travel: "beam", impact: "embers", aftermath: "scorch", palette: ["#e6432c", "#ff9d3d", "#1c0f0a"], source: "mover" },
  // A single rook or queen goes up in flame.
  we_immolation: { travel: "arc", impact: "embers", aftermath: "scorch", palette: ["#ff7a29", "#d6234f", "#3a1c12"], source: "caster" },
  // Two ridges of raw stone heave up along the ranks.
  we_mountain_range: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#8a7a63", "#b0a68f", "#4a4036"], source: "lead" },
  // A bramble ring bursts up around the square, all green needles.
  we_thorn_barrier: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#3f8f3f", "#1c4a1c", "#a8e07f"], source: "lead" },
  // Moon-silver curse smoke wraps the chosen pawn.
  werewolf: { travel: "none", impact: "smoke", aftermath: "none", palette: ["#c9cdd6", "#5a6b8f", "#eef1f7"], source: "lead" },
  wheel_of_fortune: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#ffd76a", "#c94ad1", "#4fe3ff"], source: "caster" },
  // A queen-tank rolls a straight line, tracks chewing the board.
  ww_armored_breakthrough: { travel: "beam", impact: "debris", aftermath: "smolder", palette: ["#7c8a4a", "#8a94a8", "#3a3526"], source: "mover" },
  ww_combined_arms: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#7c8a4a", "#c9a84c", "#d9d2c0"], source: "caster" },
  // Two trenches are thrown up along the chosen files.
  ww_double_trench: { travel: "wave", impact: "debris", aftermath: "none", palette: ["#6e5c48", "#7c8a4a", "#b0a68f"], source: "lead" },
  // A rook drops in behind enemy lines and digs in hard.
  ww_forward_outpost: { travel: "none", impact: "debris", aftermath: "none", palette: ["#8a94a8", "#7c8a4a", "#d9d2c0"], source: "lead" },
  // The sellsword queen strides in under a mercenary banner.
  ww_mercenary_queen: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#c94a3a", "#fff2c9"], source: "lead" },

  // ---- Tier 5 ----
  // One piece is unmade; frost locks its orthogonal neighbours.
  annihilate: { travel: "arc", impact: "burst", aftermath: "frost", palette: ["#8f2bbf", "#bfe6ff", "#e3d0ff"], source: "caster" },
  // A pawn ascends into godhood on the spot.
  apotheosis: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#ffffff", "#b98cff"], source: "lead" },
  // The hive opens over the center ranks: an amber swarm drifts down and the
  // buzzing stays on the squares it settles on.
  bee_swarm_simulator: { travel: "rain", impact: "sparkle", aftermath: "sparkle", palette: ["#f4c430", "#3a3526", "#fff2c9"], source: "sky" },
  // The bomber-goose lobs a stun grenade onto the zone.
  bombombini_gusini: { travel: "arc", impact: "shock", aftermath: "none", palette: ["#c9b45a", "#ffcf4d", "#7c8a4a"], source: "caster" },
  // Dusk-amber ward on the queen: her time is borrowed.
  borrowed_time: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#e8a84c", "#6b4a8f", "#fff2c9"], source: "lead" },
  // The knight thunders down its line in a cloud of hoof-shock.
  cavalry_charge: { travel: "bolt", impact: "shock", aftermath: "none", palette: ["#c9502c", "#e8b04b", "#fff7e0"], source: "mover" },
  // Lightning leaps piece to piece down the diagonal; the last one freezes.
  chain_lightning: { travel: "chain", impact: "burst", aftermath: "frost", palette: ["#7fb5ff", "#ffffff", "#3a5fbf"], source: "mover" },
  // Spectral chains lash out and lock both rooks in stone.
  chains_of_binding: { travel: "chain", impact: "debris", aftermath: "none", palette: ["#8a94a8", "#8f6bff", "#3a3a40"], source: "caster" },
  // Photocopier flashes: four pawn copies into the pocket.
  clone_army: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#eef1f7", "#6fe3ff", "#8a94a8"], source: "caster" },
  // A wasting green curse drifts across the enemy army.
  curse_of_frailty: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#8faf4a", "#6b4a8f", "#2f3a26"], source: "caster" },
  divine_intervention: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#ffffff", "#ffd76a", "#9fc9ff"], source: "caster" },
  // A decree of judgment cracks down over the enemy court.
  divine_reckoning: { travel: "bolt", impact: "shock", aftermath: "none", palette: ["#ffd76a", "#ffffff", "#8f6bff"], source: "sky" },
  // A dread maroon tide pushes the enemy back toward home.
  doom_march: { travel: "wave", impact: "smoke", aftermath: "smolder", palette: ["#6b1a2a", "#2b1218", "#c94a5a"], source: "caster" },
  // The rook unfurls dragon wings in crimson-gold light.
  dragon_form: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#d6234f", "#ffd76a", "#ff9d3d"], source: "lead" },
  // The rook breathes a line of fire straight down the board.
  dragons_breath: { travel: "beam", impact: "embers", aftermath: "scorch", palette: ["#ff7a29", "#ffd166", "#7a2e0e"], source: "mover" },
  // The blade of kings is drawn: silver light down the bishop.
  excalibur: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#dfe8ff", "#ffd76a", "#5a8fc0"], source: "lead" },
  // A wall of blue ice erupts along the whole file.
  frost_wall: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#7fb5e8", "#e8f8ff", "#3f6f9f"], source: "lead" },
  // Fingers run down the keys: the bishop glides its diagonal and sweeps the
  // line clear. Ivory and lacquer-black, struck notes hanging in the air.
  fur_elise: { travel: "beam", impact: "burst", aftermath: "sparkle", palette: ["#f5efe0", "#2b2320", "#c9a84c"], source: "mover" },
  god_knight: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#8f6bff", "#fff7de"], source: "lead" },
  // Ancient masonry grinds up along the whole rank.
  great_wall: { travel: "wave", impact: "debris", aftermath: "none", palette: ["#c9b89a", "#8a7a63", "#5c5348"], source: "lead" },
  // The griffon snatches your pieces and carries them across the sky.
  griffon_rider: { travel: "arc", impact: "sparkle", aftermath: "none", palette: ["#e8dcc0", "#b58a5a", "#9fc9ff"], source: "mover" },
  // Home turf glow settles over your half.
  home_field: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#5faf5f", "#fff7de", "#1c7a4a"], source: "center" },
  // A grey homesick fog drifts over the enemy army.
  homesick: { travel: "arc", impact: "smoke", aftermath: "none", palette: ["#8a94a8", "#5a6b8f", "#c9cdd6"], source: "caster" },
  // The king ties on his napkin: checkered picnic flare.
  last_meal: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#d94f4f", "#fff4e0", "#8c4a2f"], source: "caster" },
  // The whole rank erupts into lava.
  lava_floor: { travel: "wave", impact: "embers", aftermath: "scorch", palette: ["#ff5c1a", "#e6432c", "#1c0f0a"], source: "lead" },
  // The bank's rook arrives; money-green paperwork flutters.
  mortgage: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#1c7a4a", "#ffd76a", "#d8ffe9"], source: "lead" },
  // The pawn goes supernova straight up its file.
  nova: { travel: "beam", impact: "burst", aftermath: "scorch", palette: ["#ffffff", "#ffd76a", "#ff7a29"], source: "mover" },
  // One clean disintegrating dart from your king.
  purge: { travel: "arc", impact: "burst", aftermath: "smolder", palette: ["#b98cff", "#ffffff", "#3b1a5e"], source: "caster" },
  // A violet storm bursts over the pawn line and frost takes the rest.
  purge_storm: { travel: "rain", impact: "burst", aftermath: "frost", palette: ["#8f6bff", "#bfe6ff", "#3b1a5e"], source: "sky" },
  // Three warded pawns are set like standing stones.
  rampart: { travel: "none", impact: "debris", aftermath: "sparkle", palette: ["#b0a68f", "#5fc9b0", "#d9d2c0"], source: "lead" },
  // The loaner rook is dropped off, invoice sparkling.
  rent_a_rook: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#5a8fc0", "#ffd76a", "#dfe8ff"], source: "lead" },
  // Three spins of the wheel, three pieces gone.
  roulette: { travel: "arc", impact: "burst", aftermath: "none", palette: ["#c94a3a", "#1c1c22", "#ffd76a"], source: "caster" },
  // Orange rust creeps over the idle enemy ranks.
  rust: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#b5651d", "#7a4a1a", "#e8b04b"], source: "caster" },
  // The piece cracks apart into a heavy walnut shell.
  shatter: { travel: "arc", impact: "shatter", aftermath: "smolder", palette: ["#8a6a4a", "#c9b89a", "#4a3a2a"], source: "caster" },
  // The rook rams the line and leaves it barred behind it.
  siege_rook: { travel: "beam", impact: "debris", aftermath: "smolder", palette: ["#8a94a8", "#ff9d3d", "#4a4036"], source: "mover" },
  // A rook of star-iron crashes down out of the night.
  starfall: { travel: "rain", impact: "debris", aftermath: "smolder", palette: ["#cdd6ff", "#8b7bff", "#ffffff"], source: "sky" },
  // The golem assembles itself out of raw rock on its square.
  stone_golem: { travel: "none", impact: "debris", aftermath: "sparkle", palette: ["#8d8d94", "#7fae5a", "#4c4c53"], source: "lead" },
  swap_meet: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#e8963a", "#5fc9b0", "#fff2c9"], source: "caster" },
  time_out: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#ffcf4d", "#ffffff", "#1c1c22"], source: "caster" },
  // A gold thread of stolen seconds streams back to your clock.
  time_thief: { travel: "arc", impact: "sparkle", aftermath: "none", palette: ["#ffd76a", "#6fe3ff", "#2a2a38"], source: "caster" },
  // The drum-man's beat thumps toward the enemy king.
  tung_tung_sahur: { travel: "arc", impact: "shock", aftermath: "none", palette: ["#8a6a3a", "#c94a3a", "#e8dcc0"], source: "caster" },
  // A spotlight snaps onto the understudy waiting in the wings.
  understudy: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#ffd76a", "#ffffff", "#8f2bbf"], source: "caster" },
  union_rules: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#c94a3a", "#eef1f7", "#ffd76a"], source: "caster" },
  // Suiting up in the daily fit: a clean retail-red ward snaps onto the chosen
  // pieces and the shield glint stays while it holds.
  uniqlo_warrior: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#e6432c", "#ffffff", "#3a3a40"], source: "lead" },
  // A cold dart arrests one heavy piece in ice.
  wa_arrest_time: { travel: "arc", impact: "shatter", aftermath: "frost", palette: ["#9fd8ff", "#ffffff", "#4f8fd1"], source: "caster" },
  // A warded frontier lights up across the middle of the board.
  wa_border_ward: { travel: "wave", impact: "sparkle", aftermath: "none", palette: ["#5fc9b0", "#ffd76a", "#e8fff7"], source: "center" },
  // Pale frost takes every enemy rook and queen at once.
  wa_frozen_moment: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#bfe6ff", "#eef8ff", "#6fb5e8"], source: "caster" },
  wa_royal_aegis: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#5fc9b0", "#fff7de"], source: "caster" },
  // Two spectral minors shimmer into the pocket.
  wa_spectral_minors: { travel: "none", impact: "smoke", aftermath: "sparkle", palette: ["#7fd8d8", "#eef1f7", "#5a6b8f"], source: "caster" },
  // Two pieces blink across the board in violet light.
  wa_twin_blink: { travel: "arc", impact: "sparkle", aftermath: "sparkle", palette: ["#8f6bff", "#6fe3ff", "#e3d0ff"], source: "mover" },
  // The bishop unmakes everything down its diagonal.
  wa_unmake: { travel: "beam", impact: "burst", aftermath: "smolder", palette: ["#e3d0ff", "#8f2bbf", "#ffffff"], source: "mover" },
  // Living thorns burst up in a ring around the square.
  wall_of_thorns: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#3f8f3f", "#a8e07f", "#1c4a1c"], source: "lead" },
  // The curse arcs out and the queen crunches into a walnut.
  walnut_queen: { travel: "arc", impact: "debris", aftermath: "smolder", palette: ["#8a6a4a", "#8f2bbf", "#c9b89a"], source: "caster" },
  // Warp light flickers over three shifted pieces.
  warp_legion: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#8f6bff", "#6fe3ff", "#dfe3ff"], source: "center" },
  // Cracking the can: a cold silver-blue jolt off your king and three moves
  // back to back. Zero sugar, so nothing lingers.
  white_monster: { travel: "none", impact: "shock", aftermath: "none", palette: ["#eef1f7", "#7fd8f2", "#3a3a40"], source: "caster" },
  // The attack goose flaps in over the lines, feathers everywhere.
  wc_attack_goose: { travel: "arc", impact: "sparkle", aftermath: "none", palette: ["#eef1f7", "#e8963a", "#8a94a8"], source: "caster" },
  // One pawn snaps into a red frenzy.
  wc_berserk_pawn: { travel: "none", impact: "shock", aftermath: "none", palette: ["#e6432c", "#ff9d3d", "#7a1a10"], source: "lead" },
  wc_clown_car: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#e6432c", "#ffcf4d", "#4fa3d1"], source: "caster" },
  // Concrete pours over the target's feet and sets.
  wc_concrete_shoes: { travel: "arc", impact: "debris", aftermath: "none", palette: ["#9a9a9a", "#5c5c5c", "#d9d9d9"], source: "caster" },
  // Infernal contract smoke as the pawn is crowned and the devil collects.
  wc_deal_with_the_devil: { travel: "none", impact: "smoke", aftermath: "smolder", palette: ["#c9231a", "#1c0f0a", "#ff9d3d"], source: "lead" },
  // Two rooms go haunted under ghost-teal wisps.
  wc_haunted_house: { travel: "none", impact: "smoke", aftermath: "smolder", palette: ["#5fc9b0", "#3b1a5e", "#dff7f0"], source: "lead" },
  // The interrogation spotlight swings onto the enemy royals.
  wc_hot_seat: { travel: "arc", impact: "sparkle", aftermath: "none", palette: ["#ffcf4d", "#ffffff", "#2a2a38"], source: "caster" },
  // The music stops and two pieces trade chairs mid-air.
  wc_musical_chairs: { travel: "arc", impact: "sparkle", aftermath: "none", palette: ["#ff4fa3", "#5fc9b0", "#ffcf4d"], source: "mover" },
  // The repo rook backs in behind enemy lines, exhaust puffing.
  wc_repo_rook: { travel: "none", impact: "smoke", aftermath: "none", palette: ["#ffcf4d", "#8a94a8", "#3a3a40"], source: "lead" },
  wc_rubber_duck_squad: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#ffd23f", "#ff9d3d", "#dff7ff"], source: "caster" },
  // Lightning arcs down the rook's diagonal and jumps on to freeze.
  we_arc_lightning: { travel: "chain", impact: "burst", aftermath: "frost", palette: ["#7fb5ff", "#ffffff", "#bfe6ff"], source: "mover" },
  // Two small pieces go up together in one conflagration.
  we_conflagration: { travel: "arc", impact: "embers", aftermath: "scorch", palette: ["#ff7a29", "#e6432c", "#ffd166"], source: "caster" },
  // A jet of flame lances down the rook's rank or file.
  we_flame_lance: { travel: "beam", impact: "embers", aftermath: "scorch", palette: ["#ff9d3d", "#ffd166", "#7a2e0e"], source: "mover" },
  // A moat of frost circles your king and bites whoever steps close.
  we_frost_ward: { travel: "none", impact: "sparkle", aftermath: "frost", palette: ["#bfe6ff", "#ffffff", "#4f8fd1"], source: "caster" },
  // Grey stone takes the enemy minors for a beat.
  we_petrify_ranks: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#8d8d94", "#c9c9cf", "#5c5c63"], source: "center" },
  // A withering violet touch: frozen first, walnut forever.
  withering_touch: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#6b4a8f", "#8a6a4a", "#c9b0e8"], source: "caster" },
  // Two shells come down on the named pawns: field-drab ordnance from above,
  // debris and a burnt crater where each one stood.
  ww_bombardment: { travel: "rain", impact: "debris", aftermath: "scorch", palette: ["#7c8a4a", "#ff9d3d", "#3a3526"], source: "sky" },
  // Two claymores are staked out under drifting cordite.
  ww_claymore_line: { travel: "none", impact: "smoke", aftermath: "none", palette: ["#7c8a4a", "#c94a3a", "#3a3526"], source: "lead" },
  // A counter-battery shell drops the named gun.
  ww_counter_battery: { travel: "arc", impact: "debris", aftermath: "smolder", palette: ["#8a94a8", "#ff9d3d", "#3a3a40"], source: "caster" },
  // The infantry forms square: a tight ward around the chosen ground.
  ww_form_square: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#7c8a4a", "#ffd76a", "#d9d2c0"], source: "lead" },
  ww_muster_the_ranks: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#7c8a4a", "#c9a84c", "#eef1f7"], source: "caster" },
  // Chutes blossom and two pawns drop behind the lines.
  ww_paratroopers: { travel: "rain", impact: "smoke", aftermath: "none", palette: ["#eef1f7", "#7c8a4a", "#8a94a8"], source: "sky" },
  // Twin cold pincers clamp onto two chosen pieces.
  ww_pincer_movement: { travel: "arc", impact: "shatter", aftermath: "frost", palette: ["#9fd8ff", "#c9cdd6", "#4f8fd1"], source: "caster" },
  ww_relentless_assault: { travel: "none", impact: "shock", aftermath: "none", palette: ["#e6432c", "#ffcf4d", "#ffffff"], source: "caster" },
  // The rook spearheads through and the breach stays barred.
  ww_spearhead: { travel: "beam", impact: "debris", aftermath: "smolder", palette: ["#8a94a8", "#7c8a4a", "#d9d2c0"], source: "mover" },

  // ---- Tier 4 ----
  amazon_knight: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#8f6bff", "#fff7de"], source: "lead" },
  // The banner goes up over your cavalry and the whole line surges: a martial
  // gold-and-crimson pulse from your king, ward glint left on the knights.
  banner_of_war: { travel: "wave", impact: "sparkle", aftermath: "sparkle", palette: ["#c9a84c", "#a3122e", "#fff2c9"], source: "caster" },
  // Iron jaws snap shut on the target square.
  bear_trap: { travel: "none", impact: "shock", aftermath: "none", palette: ["#8a94a8", "#c94a3a", "#3a3a40"], source: "lead" },
  // The tire-frog drags the whole enemy army down: a heavy rubber-and-swamp
  // wave off the center, weight left sitting on them.
  boneca_ambalabu: { travel: "wave", impact: "shock", aftermath: "smolder", palette: ["#4a5a3a", "#2b2320", "#7fae5a"], source: "center" },
  buzzer_beater: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#ffd76a", "#6fe3ff", "#e6432c"], source: "caster" },
  // Matrix-green corruption crawls into the enemy clock.
  computer_virus: { travel: "arc", impact: "sparkle", aftermath: "none", palette: ["#3fdf6f", "#0a1f0f", "#a8ffc9"], source: "caster" },
  deadline: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#e6432c", "#ffd76a", "#ffffff"], source: "caster" },
  // The pawn martyrs itself in a tight 3x3 blast.
  detonate: { travel: "none", impact: "burst", aftermath: "scorch", palette: ["#ff9d3d", "#e6432c", "#3a3a40"], source: "mover" },
  // The direwolf condenses out of cold mist to hunt at your side.
  direwolf_pack: { travel: "none", impact: "smoke", aftermath: "sparkle", palette: ["#c9cdd6", "#5a6b8f", "#eef8ff"], source: "lead" },
  // A coin tumbles high over your king's head.
  double_or_nothing: { travel: "arc", impact: "sparkle", aftermath: "none", palette: ["#ffd76a", "#c9cdd6", "#fff7de"], source: "caster" },
  extra_move: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#6fe3ff", "#ffd76a", "#ffffff"], source: "caster" },
  // Foam fingers and confetti for the back-bench pawns.
  fan_club: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#ff4fa3", "#ffcf4d", "#4fe3ff"], source: "caster" },
  // The board splits along one file for a couple of turns.
  fault_line: { travel: "wave", impact: "debris", aftermath: "none", palette: ["#8a7a63", "#3a3026", "#c9b89a"], source: "lead" },
  // A lattice of cracks spiders across the enemy front.
  fissure_field: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#8a7a63", "#5c5348", "#b0a68f"], source: "center" },
  // The chancer's red-and-gold wheel spins down over the draft table.
  gamble: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#c65a4a", "#ffd76a", "#fff7de"], source: "caster" },
  // A glass dome settles over the greenhouse file.
  greenhouse: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#a8e07f", "#dff7ff", "#3f8f3f"], source: "lead" },
  // Something gets into the rook works: a sickly green gremlin-spark jitters
  // over the enemy rooks and the grime stays on them.
  gremlins: { travel: "arc", impact: "sparkle", aftermath: "smolder", palette: ["#7fae5a", "#3a3a40", "#c9ff8a"], source: "caster" },
  // The prayer is answered exactly: soft grave-light on the starting square
  // the piece is restored to.
  hallowed_return: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#fff2c9", "#7fd8a8", "#ffffff"], source: "lead" },
  // The cursed spud sizzles in someone's hands.
  hot_potato: { travel: "arc", impact: "embers", aftermath: "none", palette: ["#e8963a", "#8a6a3a", "#ffd166"], source: "caster" },
  // Bracing the core: a tight ward snaps over the central sixteen and holds.
  i_love_abs: { travel: "wave", impact: "shock", aftermath: "sparkle", palette: ["#e8963a", "#ffd76a", "#3a3a40"], source: "center" },
  insurance: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#4fa3d1", "#eef1f7", "#ffd76a"], source: "caster" },
  // The hill glows under the king's claim.
  king_of_the_hill: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#5faf5f", "#ffd76a", "#1c7a4a"], source: "center" },
  // The cactus-elephant checks its clock; time politely stops.
  lirili_larila: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#7fae5a", "#e8dcc0", "#6fe3ff"], source: "caster" },
  // The gorgon's glance flicks out and the queen crunches to walnut.
  medusas_stare: { travel: "beam", impact: "debris", aftermath: "smolder", palette: ["#7fae5a", "#8a6a4a", "#2f3a26"], source: "caster" },
  // The chrysalis splits and a rook steps out.
  metamorphosis: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#5fc9b0", "#ffd76a", "#dff7f0"], source: "lead" },
  mystery_box: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#b58a5a", "#c94ad1", "#ffd76a"], source: "caster" },
  // Everything runs backwards in clashing purple and lime.
  opposite_day: { travel: "arc", impact: "sparkle", aftermath: "none", palette: ["#8f6bff", "#a8e07f", "#ffffff"], source: "caster" },
  // The rooks fold up into paper cranes.
  origami: { travel: "arc", impact: "sparkle", aftermath: "none", palette: ["#f5efe0", "#c94a3a", "#c9cdd6"], source: "caster" },
  // The guardian condenses out of pale aether on its square.
  phantom_guardian: { travel: "none", impact: "smoke", aftermath: "sparkle", palette: ["#7fd8d8", "#eef8ff", "#4a6b8f"], source: "lead" },
  // Your pawns lean toward the light.
  photosynthesis: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#5faf5f", "#ffd23f", "#d8ffe9"], source: "center" },
  // The little liar's nose creaks a square longer.
  pinocchio: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#b58a5a", "#4fa3d1", "#f5efe0"], source: "lead" },
  // Scooter exhaust and a hot delivery into the pocket.
  pizza_delivery: { travel: "none", impact: "smoke", aftermath: "none", palette: ["#e6432c", "#ffd23f", "#f5efe0"], source: "caster" },
  // One pawn is unmade and the rest of the line locks up: a purge-violet dart
  // from your king, frost holding the survivors in place.
  purge_two: { travel: "arc", impact: "burst", aftermath: "frost", palette: ["#8f2bbf", "#e3d0ff", "#bfe6ff"], source: "caster" },
  reinforcements: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#7c8a4a", "#eef1f7", "#c9a84c"], source: "caster" },
  // Every key lights up at once: an RGB wash rolls over your minor pieces and
  // the backlight stays on for the rest of the game.
  rgb_keyboard: { travel: "wave", impact: "sparkle", aftermath: "sparkle", palette: ["#ff4fd8", "#4fe3ff", "#3fdf6f"], source: "caster" },
  // Just add water: four splashes and the little pawns hatch.
  sea_monkeys: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#5fc9b0", "#e8963a", "#dff7ff"], source: "lead" },
  second_army: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#8a94a8", "#ffd76a", "#eef1f7"], source: "caster" },
  // Stone serpents coil out and around the enemy bishops.
  serpent_brood: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#5f8f4a", "#8d8d94", "#2f3a26"], source: "caster" },
  // Cursed iron chains rattle out and bind the queen.
  shackle_the_queen: { travel: "chain", impact: "shock", aftermath: "none", palette: ["#8a94a8", "#8f6bff", "#3a3a40"], source: "caster" },
  // A soft lavender hush settles over the enemy army.
  snooze_button: { travel: "wave", impact: "sparkle", aftermath: "none", palette: ["#b9a8e8", "#2c3e6b", "#e8e0ff"], source: "center" },
  // A bubble of stopped time crystallizes around one piece.
  staff_of_stasis: { travel: "none", impact: "shatter", aftermath: "frost", palette: ["#9fd8ff", "#e8f8ff", "#4f8fd1"], source: "lead" },
  sugar_rush: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#ff9dd6", "#4fe3ff", "#fff7de"], source: "caster" },
  // The shark in sneakers blurs down its line.
  tralalero_dash: { travel: "bolt", impact: "shock", aftermath: "none", palette: ["#4fa3d1", "#eef8ff", "#2c3e6b"], source: "mover" },
  // A spring-loaded prank is rigged under the square.
  trapdoor: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#8a6a3a", "#c9a84c", "#e8dcc0"], source: "lead" },
  // The queen's head swims: green-purple wooze.
  vertigo: { travel: "arc", impact: "smoke", aftermath: "none", palette: ["#8f6bff", "#8faf4a", "#e3d0ff"], source: "caster" },
  // The midnight star-chart wheel turns and settles on a house.
  zodiac_wheel: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#2c3e6b", "#cdd6ff", "#c9a84c"], source: "caster" },
  // Stolen seconds siphon home while frost takes one piece.
  wa_chrono_siphon: { travel: "arc", impact: "sparkle", aftermath: "frost", palette: ["#ffd76a", "#6fe3ff", "#bfe6ff"], source: "caster" },
  // The gambler-mage's dice wheel rattles to a stop at your king.
  wa_high_roll: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#5a3fa0", "#f4f7f2", "#a877d8"], source: "caster" },
  // One piece steps through violet light to anywhere.
  wa_far_step: { travel: "arc", impact: "sparkle", aftermath: "sparkle", palette: ["#8f6bff", "#6fe3ff", "#e3d0ff"], source: "mover" },
  // Glowing glyphs seal the file end to end.
  wa_glyph_seal: { travel: "wave", impact: "sparkle", aftermath: "sparkle", palette: ["#5fc9b0", "#ffd76a", "#e8fff7"], source: "lead" },
  // Grey stone takes the whole enemy pawn line.
  wa_stone_pawns: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#8d8d94", "#b0a68f", "#5c5c63"], source: "center" },
  // One piece is stopped dead in a pale snap of time.
  wa_time_stop: { travel: "none", impact: "shock", aftermath: "none", palette: ["#6fe3ff", "#ffffff", "#3a3766"], source: "lead" },
  // A rift tears open and hangs there, hungry.
  wa_void_rift: { travel: "none", impact: "smoke", aftermath: "smolder", palette: ["#5b2b8f", "#12081f", "#b98cff"], source: "lead" },
  // Banana peels glisten down the greased file.
  wc_banana_peel_trail: { travel: "wave", impact: "sparkle", aftermath: "none", palette: ["#ffd23f", "#f5efa0", "#8a6a3a"], source: "lead" },
  // A pinprick of black opens on the square and stays.
  wc_black_hole: { travel: "none", impact: "smoke", aftermath: "smolder", palette: ["#12081f", "#5b2b8f", "#8f6bff"], source: "lead" },
  wc_panic_button: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#e6432c", "#ffffff", "#ffcf4d"], source: "caster" },
  // One wild swing: candy and one unlucky piece everywhere.
  wc_pinata: { travel: "arc", impact: "burst", aftermath: "sparkle", palette: ["#ff4fa3", "#ffcf4d", "#4fe3ff"], source: "caster" },
  // Hot tar seeps up under the enemy bishops.
  wc_tar_pit: { travel: "none", impact: "smoke", aftermath: "smolder", palette: ["#1c1c22", "#5c5348", "#8a7a63"], source: "center" },
  // Wind up... and the piece is yeeted deep downfield.
  wc_yeet: { travel: "arc", impact: "shock", aftermath: "none", palette: ["#ff9d3d", "#4fe3ff", "#ffffff"], source: "mover" },
  // Ice cases one piece and the frost creeps to its neighbours.
  we_glaciate: { travel: "none", impact: "shatter", aftermath: "frost", palette: ["#4f8fd1", "#bfe6ff", "#ffffff"], source: "lead" },
  // Hail rattles down across the enemy pawn line.
  we_hailstorm: { travel: "rain", impact: "shatter", aftermath: "frost", palette: ["#eef8ff", "#9fd8ff", "#6fb5e8"], source: "sky" },
  // The queen looses one clean bolt down her diagonal.
  we_lightning_bolt: { travel: "bolt", impact: "burst", aftermath: "scorch", palette: ["#ffffff", "#7fb5ff", "#ffd76a"], source: "mover" },
  // A single lick of flame takes one minor piece.
  we_scorch: { travel: "arc", impact: "embers", aftermath: "scorch", palette: ["#ff7a29", "#e6432c", "#ffd166"], source: "caster" },
  // Chisels ring: a knight and pawn are carved into the pocket.
  we_stone_soldiers: { travel: "none", impact: "debris", aftermath: "sparkle", palette: ["#b0a68f", "#8d8d94", "#e8dcc0"], source: "caster" },
  // A thundercloud congeals into a knight with a static crack.
  we_thunderhead: { travel: "none", impact: "shock", aftermath: "none", palette: ["#5a6b8f", "#7fb5ff", "#c9cdd6"], source: "lead" },
  // Bark and canopy close over your pawns.
  we_verdant_shield: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#3f8f3f", "#8a6a3a", "#a8e07f"], source: "center" },
  // The bishop lunges point-first down its diagonal.
  ww_bayonet_charge: { travel: "bolt", impact: "shock", aftermath: "none", palette: ["#c9cdd6", "#7c8a4a", "#eef1f7"], source: "mover" },
  ww_command_tent: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#7c8a4a", "#c9a84c", "#e8dcc0"], source: "caster" },
  // The knight drills the vault until it sticks: a field-drab training glint
  // on the piece, and the mark stays on it for the game.
  ww_dragoons: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#7c8a4a", "#c9a84c", "#eef1f7"], source: "lead" },
  ww_flanking_knights: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#7c8a4a", "#8a94a8", "#eef1f7"], source: "center" },
  // Covering fire rakes the enemy knights' positions.
  ww_suppressive_fire: { travel: "rain", impact: "smoke", aftermath: "none", palette: ["#7c8a4a", "#8a94a8", "#3a3526"], source: "sky" },
  // The wyvern folds its wings and streaks down the line.
  wyverns_dive: { travel: "arc", impact: "shock", aftermath: "none", palette: ["#4a8f5f", "#d6234f", "#c9ffd8"], source: "mover" },

  // ---- Tier 7+ god-plugin cards (godPlays.tsx plugin signatures) ----
  // These 69 generated-art cards now play a god-scale plugin lead, so their
  // canvas specs are hand-tuned here too (fiction-matched source + heavy
  // impact + shake) instead of riding the GEN_FAMILY_VFX defaults. Grouped
  // by god template; palettes match the plugin renderers.
  // [GodDescent] An iron-crowned god of the draft descends and takes both cards by decree.
  draft_tyranny: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#d6234f", "#ffd76a", "#1c0f18"], source: "sky", shake: true },
  // [GodDescent] The sovereign's twin-card charter blazes down out of the gold.
  sovereign_draft: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#ffd76a", "#fff7de", "#c9a84c"], source: "sky", shake: true },
  // [GodDescent] The sceptred draft-god claims your table and closes theirs.
  draft_supremacy: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#ffd76a", "#d6234f", "#ffffff"], source: "sky", shake: true },
  // [GodDescent] A pocket queen is handed down out of the light.
  divine_legion: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#fff2c9", "#ffd76a", "#b98cff"], source: "sky", shake: true },
  // [GodDescent] The great shield-god lowers its heater over your whole army.
  absolute_aegis: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#5fc9b0", "#ffd76a", "#e8fff7"], source: "sky", shake: true },
  // [GodDescent] A crowned-shield warden descends over your king.
  checkmate_denial: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#dfe8ff", "#ffd76a", "#5a8fc0"], source: "caster", shake: true },
  // [GodDescent] The chain-breaker god descends and the nerf is struck off.
  full_pardon: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#ffffff", "#ffd76a", "#5fc9b0"], source: "caster", shake: true },
  // [GodDescent] Ascension light: the nerf burns away as the spark climbs.
  transcendence: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#b98cff", "#ffd76a", "#ffffff"], source: "sky", shake: true },
  // [GodDescent] A third-eyed dominator descends and one enemy mind is claimed.
  mind_empire: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#8f2bbf", "#e3d0ff", "#ffd76a"], source: "sky", shake: true },
  // [GodDescent] The twin-eyed dominator takes two minds at once.
  mass_mind_control: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#c94ad1", "#12081f", "#6fe3ff"], source: "sky", shake: true },
  // [GodDescent] The silencing god descends; only the throne may speak.
  throne_and_silence: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#5a6b8f", "#ffd76a", "#c9cdd6"], source: "sky", shake: true },
  // [GodDescent] The inverted crown falls: every servant of the court stands down.
  abdication_edict: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#6b4a8f", "#ffd76a", "#2a1030"], source: "sky", shake: true },
  // [GodDescent] Marionette strings drop from the sky onto a rook or queen.
  wa_dominate_major: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#8f2bbf", "#ffd76a", "#e3d0ff"], source: "sky", shake: true },
  // [TitanRise] Twin pillars heave up and wall off two files for good.
  great_divide: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#b0a68f", "#8a7a63", "#ffd76a"], source: "center", shake: true },
  // [TitanRise] Three cracked pillars shear the board into quarters.
  sundering: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#5c5348", "#ff9d3d", "#d9d2c0"], source: "center", shake: true },
  // [TitanRise] A keep-titan rises under the chosen zone and holds it.
  fortress_realm: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#8a94a8", "#5fc9b0", "#d9d2c0"], source: "center", shake: true },
  // [TitanRise] The board's molten heart heaves up through the middle ranks.
  molten_heart: { travel: "wave", impact: "debris", aftermath: "scorch", palette: ["#ff5c1a", "#e6432c", "#3a1c12"], source: "center", shake: true },
  // [TitanRise] The salt-urn titan tips its urn over the enemy furrows.
  salted_earth: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#e8dcc0", "#b0a68f", "#8faf4a"], source: "center", shake: true },
  // [TitanRise] The shackled titan tears free; the broken chain whips wide.
  unshackled_wrath: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#e6432c", "#3a3a40", "#ffd166"], source: "center", shake: true },
  // [TitanRise] Every fallen pawn rises on one phoenix updraft.
  phoenix_line: { travel: "wave", impact: "embers", aftermath: "sparkle", palette: ["#ff7a29", "#ffd76a", "#d6234f"], source: "center", shake: true },
  // [SkyWrath] The storm god arms every capture with a chained warhead.
  chain_atomic: { travel: "bolt", impact: "burst", aftermath: "scorch", palette: ["#ff9d3d", "#e6432c", "#ffd166"], source: "sky", shake: true },
  // [SkyWrath] The storm god goes all in: every strike detonates and chains.
  total_atomic: { travel: "bolt", impact: "burst", aftermath: "scorch", palette: ["#e6432c", "#7a1a10", "#ffd166"], source: "sky", shake: true },
  // [SkyWrath] Fire-wrath brands the middle ranks off-limits.
  scorched_earth: { travel: "bolt", impact: "burst", aftermath: "scorch", palette: ["#ff7a29", "#3a1c12", "#ffb454"], source: "sky", shake: true },
  // [SkyWrath] A rift-bolt storm rakes the board and scrambles what it touches.
  rift_storm: { travel: "bolt", impact: "burst", aftermath: "scorch", palette: ["#8f6bff", "#12081f", "#6fe3ff"], source: "sky", shake: true },
  // [SkyWrath] Crown-bolts fall on every forward pawn: a storm of queens.
  queen_storm: { travel: "bolt", impact: "burst", aftermath: "scorch", palette: ["#ffd76a", "#b98cff", "#ffffff"], source: "sky", shake: true },
  // [AbyssMaw] A grasping void hand drags three buffs into the dark.
  buff_plunder: { travel: "wave", impact: "shock", aftermath: "smolder", palette: ["#ffd76a", "#8f2bbf", "#2a2a38"], source: "center", shake: true },
  // [AbyssMaw] The maw opens under the enemy's whole arsenal and swallows it.
  total_plunder: { travel: "wave", impact: "shock", aftermath: "smolder", palette: ["#ffd76a", "#1c0f18", "#c94ad1"], source: "center", shake: true },
  // [AbyssMaw] The null-circle maw eats their magic mid-word.
  grand_nullify: { travel: "wave", impact: "shock", aftermath: "smolder", palette: ["#8a94a8", "#8f6bff", "#eef1f7"], source: "center", shake: true },
  // [AbyssMaw] Double-null: the maw swallows the spells AND the next draft.
  absolute_nullify: { travel: "wave", impact: "shock", aftermath: "smolder", palette: ["#3a3a45", "#c94a5a", "#c9cdd6"], source: "center", shake: true },
  // [ReaperSweep] The crescent-lantern reaper draws two turns of night.
  endless_night: { travel: "wave", impact: "burst", aftermath: "smolder", palette: ["#2c3e6b", "#cdd6ff", "#8a94a8"], source: "center", shake: true },
  // [ReaperSweep] The lily reaper stills every blade near your king.
  peace_of_the_grave: { travel: "wave", impact: "burst", aftermath: "smolder", palette: ["#eef1f7", "#8a94a8", "#5fae7f"], source: "center", shake: true },
  // [ReaperSweep] The withering sweep: no enemy hand can close on a piece.
  withered_hands: { travel: "wave", impact: "burst", aftermath: "smolder", palette: ["#8a94a8", "#6b4a8f", "#c9b0e8"], source: "center", shake: true },
  // [ReaperSweep] The hex-star reaper takes their turn and their draft in one arc.
  grand_malediction: { travel: "wave", impact: "burst", aftermath: "smolder", palette: ["#6b4a8f", "#8faf4a", "#2a1030"], source: "center", shake: true },
  // [ReaperSweep] The wheat-reaper blights every enemy furrow.
  blighted_furrows: { travel: "wave", impact: "burst", aftermath: "smolder", palette: ["#8faf4a", "#5c5348", "#2f3a26"], source: "center", shake: true },
  // [ReaperSweep] The skull reaper marks the herd: one falls each turn.
  culling: { travel: "wave", impact: "burst", aftermath: "smolder", palette: ["#d6234f", "#1c1c22", "#eef1f7"], source: "center", shake: true },
  // [ReaperSweep] The venom-goblet reaper sours their next three drafts.
  poisoned_counsel: { travel: "wave", impact: "burst", aftermath: "smolder", palette: ["#8faf4a", "#2f3a26", "#c9b0e8"], source: "center", shake: true },
  // [HostMarch] The old songs march again: the laurel host crowns your officers.
  age_of_heroes: { travel: "wave", impact: "shock", aftermath: "sparkle", palette: ["#ffd76a", "#c94a3a", "#fff2c9"], source: "caster", shake: true },
  // [HostMarch] The reversed-banner host escorts your army home.
  grand_retreat: { travel: "wave", impact: "shock", aftermath: "sparkle", palette: ["#5a8fc0", "#c9cdd6", "#ffd76a"], source: "caster", shake: true },
  // [HostMarch] The rout-host drives the enemy court from the field.
  noble_rout: { travel: "wave", impact: "shock", aftermath: "sparkle", palette: ["#6b1a2a", "#c9cdd6", "#e8b04b"], source: "caster", shake: true },
  // [HostMarch] The burning-tower host sacks their capital: turn and drafts lost.
  sacked_capital: { travel: "wave", impact: "shock", aftermath: "scorch", palette: ["#ff9d3d", "#2b1218", "#c94a3a"], source: "caster", shake: true },
  // [CelestialRing] The genesis ring settles and the world is set back to seed.
  genesis: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#a8e07f", "#ffffff", "#ffd76a"], source: "sky", shake: true },
  // [CelestialRing] A hex-portal ring folds six pieces through reality.
  reality_warp: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#c94ad1", "#6fe3ff", "#e3d0ff"], source: "sky", shake: true },
  // [CelestialRing] The spiral ring lifts the whole army and sets it anywhere.
  total_warp: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#5b2b8f", "#6fe3ff", "#ffd76a"], source: "sky", shake: true },
  // [CelestialRing] Five rifts open at once under the great ring.
  warp_cataclysm: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#6fe3ff", "#8f6bff", "#ffffff"], source: "sky", shake: true },
  // [CelestialRing] The swap-arrow ring trades three pairs in one turning.
  warp_sovereign: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#8f6bff", "#ffd76a", "#e3d0ff"], source: "sky", shake: true },
  // [CelestialRing] The yin-yang ring flips your curse into a gift.
  nerf_reversal: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#a8e07f", "#8f6bff", "#ffffff"], source: "sky", shake: true },
  // [CelestialRing] The aligned spheres transfix the enemy court.
  celestial_alignment: { travel: "bolt", impact: "shatter", aftermath: "frost", palette: ["#2c3e6b", "#cdd6ff", "#ffd76a"], source: "sky", shake: true },
  // [CelestialRing] Every sign aligns: the conjunction locks the court and wards yours.
  grand_conjunction: { travel: "bolt", impact: "shatter", aftermath: "frost", palette: ["#3b1a5e", "#e3d0ff", "#ffd76a"], source: "sky", shake: true },
  // [FrostTitan] The tomb-slab titan entombs the whole enemy army in ice.
  glacial_tomb: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#9fd8ff", "#e8f8ff", "#4f8fd1"], source: "center", shake: true },
  // [FrostTitan] The snowflake titan cases two pieces solid.
  frozen_solid: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#6fe3ff", "#ffffff", "#3f7fb5"], source: "center", shake: true },
  // [FrostTitan] Absolute zero: the deep-blue titan stops every piece but the king.
  absolute_zero: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#bfe6ff", "#ffffff", "#1c3a5e"], source: "center", shake: true },
  // [FrostTitan] The everfrost shard is driven through one piece for five turns.
  everfrost_shard: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#9fd8ff", "#8f6bff", "#e8f8ff"], source: "center", shake: true },
  // [ForgeColossus] The colossal moderator gavel descends: two pieces are banned.
  ban_hammer: { travel: "bolt", impact: "debris", aftermath: "smolder", palette: ["#4fa3d1", "#8a94a8", "#ffd76a"], source: "sky", shake: true },
  // [ForgeColossus] The old greatsword falls point-first through a rook or queen.
  dragonslayer: { travel: "bolt", impact: "debris", aftermath: "smolder", palette: ["#c9cdd6", "#d6234f", "#ffd76a"], source: "sky", shake: true },
  // [ForgeColossus] The great padlock drops and their next draft never opens.
  world_lock: { travel: "bolt", impact: "debris", aftermath: "smolder", palette: ["#8a94a8", "#4fa3d1", "#ffd76a"], source: "sky", shake: true },
  // [ForgeColossus] The wax-seal stamp slams down across their next three drafts.
  sealed_archive: { travel: "bolt", impact: "debris", aftermath: "smolder", palette: ["#c9a84c", "#8a6a3a", "#e8dcc0"], source: "sky", shake: true },
  // [ForgeColossus] The chained portcullis drops on their rooks forever.
  sealed_ramparts: { travel: "bolt", impact: "debris", aftermath: "smolder", palette: ["#8a94a8", "#5c5c63", "#c94a3a"], source: "sky", shake: true },
  // [ForgeColossus] The lead weight lands on the whole enemy army: one step each.
  leaden_limbs: { travel: "bolt", impact: "debris", aftermath: "smolder", palette: ["#6e6e78", "#c9a84c", "#3a3a40"], source: "sky", shake: true },
  // [GorgonIdol] The gorgon idol's gaze crunches every enemy rook to walnut.
  walnut_court: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#8a6a4a", "#c9b89a", "#7fae5a"], source: "center", shake: true },
  // [GorgonIdol] Obsidian gaze: their towers petrify and forget how to kill.
  obsidian_bastions: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#2a2a35", "#8f6bff", "#8a94a8"], source: "center", shake: true },
  // [GorgonIdol] The idol plants a garden of minor-piece statues.
  statue_garden: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#8d8d94", "#7fae5a", "#c9c9cf"], source: "center", shake: true },
  // [GorgonIdol] The cockatrice idol stones their two heaviest minors.
  cockatrice_gaze: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#7fae5a", "#e8b04b", "#2f3a26"], source: "center", shake: true },
  // [GorgonIdol] Chisel and mallet: one piece carved to walnut, its flanks after it.
  chisel_curse: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#b0a68f", "#8d8d94", "#e8dcc0"], source: "center", shake: true },
  // [GorgonIdol] Crown and castle both crunch to walnut under the idol's gaze.
  crown_and_castle: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#ffd76a", "#8d8d94", "#8a6a4a"], source: "center", shake: true },
  // [ChronoLord] The hourglass sovereign winds five whole moves back.
  full_rewind: { travel: "bolt", impact: "shock", aftermath: "sparkle", palette: ["#6fe3ff", "#ffd76a", "#2a2a38"], source: "sky", shake: true },
  // [ChronoLord] The infinity clock: your turn does not end until blood is drawn.
  endless_turn: { travel: "bolt", impact: "shock", aftermath: "sparkle", palette: ["#e6432c", "#ffd76a", "#ffffff"], source: "caster", shake: true },
  // [ChronoLord] The torn calendar: turn, draft and clock all struck away.
  lost_fortnight: { travel: "bolt", impact: "shock", aftermath: "sparkle", palette: ["#5a6b8f", "#cdd6ff", "#ffd76a"], source: "sky", shake: true },
  // [ChronoLord] The time sovereign files your nerf away for ten turns.
  sabbatical: { travel: "bolt", impact: "shock", aftermath: "sparkle", palette: ["#5fc9b0", "#fff7de", "#ffd76a"], source: "caster", shake: true },

  // ---- Tier 5-6 great-plugin cards (greatPlays.tsx plugin signatures) ----
  // These 116 generated-art cards now play a staged "great" plugin lead
  // (one notch below the god set), so their canvas specs are hand-tuned
  // here too: fiction-matched travel + impact, NEVER a shake (tier 7+
  // privilege). Grouped by scene template; palettes match the renderers.
  // [WitchCircle] Ball and Chain.
  ball_and_chain: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#6b4a8f", "#c9b0e8", "#2a1030"], source: "caster" },
  // [WitchCircle] Royal Summons.
  royal_summons: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#8f2bbf", "#ffd76a", "#2a1030"], source: "caster" },
  // [WitchCircle] Palsied Hands.
  palsied_hands: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#6b4a8f", "#8faf4a", "#2f3a26"], source: "caster" },
  // [WitchCircle] Throne Bound.
  throne_bound: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#5b2b8f", "#c94ad1", "#1c0f18"], source: "caster" },
  // [WitchCircle] Lone Sovereign.
  lone_sovereign: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#5a6b8f", "#cdd6ff", "#1c1c2a"], source: "caster" },
  // [WitchCircle] Peasant Levy.
  peasant_levy: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#8a7a63", "#c9a84c", "#3a3026"], source: "caster" },
  // [WitchCircle] Court in Exile.
  court_in_exile: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#6b1a2a", "#e8b04b", "#2b1218"], source: "caster" },
  // [WitchCircle] Cast a Nerf.
  cast_a_nerf: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#8f6bff", "#ff9d3d", "#2a1030"], source: "caster" },
  // [WitchCircle] Royal Handicap.
  royal_handicap: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#8f2bbf", "#e3d0ff", "#1c0f18"], source: "caster" },
  // [WitchCircle] Queen's Handicap.
  queens_handicap: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#c94ad1", "#e3d0ff", "#2a1030"], source: "caster" },
  // [WitchCircle] Grounded Command.
  grounded_command: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#6b4a8f", "#ffd76a", "#1c1c2a"], source: "caster" },
  // [WitchCircle] Lunar Eclipse.
  lunar_eclipse: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#2c3e6b", "#cdd6ff", "#0d1326"], source: "caster" },
  // [WitchCircle] Hexed Satchel.
  hexed_satchel: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#8a6a3a", "#a8e07f", "#2f3a26"], source: "caster" },
  // [WitchCircle] Iron Furrow.
  iron_furrow: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#8faf4a", "#c9a84c", "#2f3a26"], source: "caster" },
  // [WitchCircle] Leaden Fields.
  leaden_fields: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#6e6e78", "#e8dcc0", "#2a2a30"], source: "caster" },
  // [WitchCircle] Voodoo Doll.
  wc_voodoo_doll: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#6b4a8f", "#c94a5a", "#1c0f18"], source: "caster" },
  // [WitchCircle] Sticky Floor.
  wc_sticky_floor: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#c9a84c", "#ffd23f", "#4a3a22"], source: "caster" },
  // [WitchCircle] Threads of Fate.
  threads_of_fate: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#5a6b8f", "#cdd6ff", "#2c3e6b"], source: "caster" },
  // [WitchCircle] Mind Control.
  mind_control: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#8f2bbf", "#c94ad1", "#12081f"], source: "caster" },
  // [WitchCircle] Mind Dominion.
  mind_dominion: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#5b2b8f", "#8f6bff", "#12081f"], source: "caster" },
  // [StoneGaze] Medusa's Verdict.
  medusas_verdict: { travel: "beam", impact: "debris", aftermath: "smolder", palette: ["#8d8d94", "#7fae5a", "#4c4c53"], source: "caster" },
  // [StoneGaze] Granite Ramparts.
  granite_ramparts: { travel: "beam", impact: "debris", aftermath: "smolder", palette: ["#8a8478", "#c9b89a", "#4a4036"], source: "caster" },
  // [StoneGaze] Stone Menagerie.
  stone_menagerie: { travel: "beam", impact: "debris", aftermath: "smolder", palette: ["#8d8d94", "#c9c9cf", "#3a3a40"], source: "caster" },
  // [StoneGaze] Stone Curse.
  stone_curse: { travel: "beam", impact: "debris", aftermath: "smolder", palette: ["#8a6a4a", "#c9b89a", "#4a3a2a"], source: "caster" },
  // [StoneGaze] Stone Riders.
  stone_riders: { travel: "beam", impact: "debris", aftermath: "smolder", palette: ["#8d8d94", "#b58a5a", "#4c4c53"], source: "caster" },
  // [StoneGaze] Stone Prelates.
  stone_prelates: { travel: "beam", impact: "debris", aftermath: "smolder", palette: ["#9a9a9a", "#e8dcc0", "#5c5c63"], source: "caster" },
  // [StoneGaze] Stone Bastions.
  stone_bastions: { travel: "beam", impact: "debris", aftermath: "smolder", palette: ["#8a94a8", "#c9b89a", "#3a3a40"], source: "caster" },
  // [StoneGaze] Queen of Stone.
  queen_of_stone: { travel: "beam", impact: "debris", aftermath: "smolder", palette: ["#8d8d94", "#ffd76a", "#4c4c53"], source: "caster" },
  // [StoneGaze] Eternal Statue.
  eternal_statue: { travel: "beam", impact: "debris", aftermath: "smolder", palette: ["#c9c9cf", "#7fae5a", "#6e6e74"], source: "caster" },
  // [StoneGaze] Nerf Hammer.
  nerf_hammer: { travel: "beam", impact: "debris", aftermath: "smolder", palette: ["#8a6a4a", "#ff9d3d", "#4a3a2a"], source: "caster" },
  // [ColdFront] The Big Chill.
  the_big_chill: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#9fd8ff", "#e8f8ff", "#3f7fb5"], source: "center" },
  // [ColdFront] Frozen Moment.
  frozen_moment: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#bfe6ff", "#ffffff", "#4f8fd1"], source: "center" },
  // [ColdFront] Creeping Frost.
  creeping_frost: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#7fd8d8", "#dff7f7", "#3f6f9f"], source: "center" },
  // [ColdFront] Glacial Flanks.
  glacial_flanks: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#9fd8ff", "#c9cdd6", "#4f8fd1"], source: "center" },
  // [ColdFront] Total Whiteout.
  total_whiteout: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#e8f8ff", "#ffffff", "#6fb5e8"], source: "center" },
  // [ColdFront] Frostbite.
  we_frostbite_curse: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#9fd8ff", "#eef8ff", "#5a8fc0"], source: "center" },
  // [ColdFront] Total Freeze.
  total_freeze: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#bfe6ff", "#e8f8ff", "#3f6f9f"], source: "center" },
  // [SiegeRoll] Atomic Captures.
  atomic_captures: { travel: "arc", impact: "debris", aftermath: "scorch", palette: ["#ff9d3d", "#ffd166", "#3a1c12"], source: "caster" },
  // [SiegeRoll] Atomic Reaction.
  atomic_reaction: { travel: "arc", impact: "debris", aftermath: "scorch", palette: ["#e6432c", "#ffd166", "#3a1c12"], source: "caster" },
  // [SiegeRoll] Detonation Field.
  detonation_field: { travel: "arc", impact: "debris", aftermath: "scorch", palette: ["#c94a3a", "#ff9d3d", "#2b1218"], source: "caster" },
  // [SiegeRoll] Demolition Charge.
  ww_demolition_charge: { travel: "arc", impact: "debris", aftermath: "scorch", palette: ["#7c8a4a", "#ffd166", "#3a3526"], source: "caster" },
  // [SiegeRoll] Confetti Cannon.
  wc_confetti_cannon: { travel: "arc", impact: "debris", aftermath: "scorch", palette: ["#c94ad1", "#ffcf4d", "#3a1030"], source: "caster" },
  // [SiegeRoll] Firestorm.
  we_firestorm: { travel: "arc", impact: "embers", aftermath: "scorch", palette: ["#ff7a29", "#ffd166", "#3a1c12"], source: "caster" },
  // [SiegeRoll] Giant's Maul.
  giants_maul: { travel: "beam", impact: "debris", aftermath: "smolder", palette: ["#8a94a8", "#ffd166", "#3a3a40"], source: "mover" },
  // [SiegeRoll] Scorched Middle.
  scorched_middle: { travel: "arc", impact: "embers", aftermath: "scorch", palette: ["#ff7a29", "#ffb454", "#3a1c12"], source: "center" },
  // [WarBanner] Checkmate Immunity.
  checkmate_immunity: { travel: "none", impact: "shock", aftermath: "sparkle", palette: ["#5a8fc0", "#dfe8ff", "#2c3e6b"], source: "lead" },
  // [WarBanner] Iron Reign.
  iron_reign: { travel: "none", impact: "shock", aftermath: "sparkle", palette: ["#8a94a8", "#ffd76a", "#3a3a40"], source: "lead" },
  // [WarBanner] Ironclad.
  ironclad: { travel: "none", impact: "shock", aftermath: "sparkle", palette: ["#aab6c8", "#e3e9f2", "#3a4556"], source: "lead" },
  // [WarBanner] Iron Bulwark.
  ww_iron_bulwark: { travel: "none", impact: "shock", aftermath: "sparkle", palette: ["#8a94a8", "#c94a3a", "#3a3a40"], source: "lead" },
  // [WarBanner] Praetorian Guard.
  ww_praetorian_guard: { travel: "none", impact: "shock", aftermath: "sparkle", palette: ["#c9a84c", "#c94a3a", "#4a3a22"], source: "lead" },
  // [WarBanner] The Round Table.
  round_table: { travel: "none", impact: "shock", aftermath: "sparkle", palette: ["#c9b89a", "#ffd76a", "#5a4a36"], source: "lead" },
  // [WarBanner] Bridgehead.
  ww_bridgehead: { travel: "none", impact: "shock", aftermath: "sparkle", palette: ["#7c8a4a", "#c94a3a", "#3a3526"], source: "lead" },
  // [WarBanner] Sealed Avenues.
  sealed_avenues: { travel: "none", impact: "shock", aftermath: "sparkle", palette: ["#8a94a8", "#ffd76a", "#5c5c63"], source: "lead" },
  // [Grove] Dryad Grove.
  dryad_grove: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#8a6a3a", "#a8e07f", "#3f8f3f"], source: "lead" },
  // [Grove] Overgrowth.
  we_overgrowth: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#3f8f3f", "#ffd76a", "#1c4a1c"], source: "lead" },
  // [Grove] Rooted.
  we_rooted: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#4a3a22", "#a8e07f", "#2f3a26"], source: "lead" },
  // [Grove] Quagmire.
  we_quagmire: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#5c5348", "#8faf4a", "#3a3026"], source: "lead" },
  // [Grove] Thorn Hedge.
  thorn_hedge: { travel: "wave", impact: "sparkle", aftermath: "sparkle", palette: ["#1c4a1c", "#a8e07f", "#0f2a0f"], source: "lead" },
  // [PhantomParade] Gossamer Veil.
  gossamer_veil: { travel: "wave", impact: "smoke", aftermath: "sparkle", palette: ["#8f6bff", "#e3d0ff", "#3b1a5e"], source: "center" },
  // [PhantomParade] Starlight Ward.
  starlight_ward: { travel: "wave", impact: "smoke", aftermath: "sparkle", palette: ["#2c3e6b", "#cdd6ff", "#12122a"], source: "center" },
  // [PhantomParade] Spirit Guide.
  spirit_guide: { travel: "wave", impact: "smoke", aftermath: "sparkle", palette: ["#4a6b8f", "#7fd8d8", "#12303a"], source: "center" },
  // [PhantomParade] Phase Army.
  phase_army: { travel: "wave", impact: "smoke", aftermath: "sparkle", palette: ["#5b2b8f", "#e3d0ff", "#2a1030"], source: "center" },
  // [PhantomParade] Ghost Legion.
  ghost_legion: { travel: "wave", impact: "smoke", aftermath: "sparkle", palette: ["#5a6b8f", "#eef8ff", "#2c3e6b"], source: "center" },
  // [PhantomParade] Valkyrie.
  valkyrie: { travel: "wave", impact: "smoke", aftermath: "sparkle", palette: ["#5a6b8f", "#ffd76a", "#2c3e6b"], source: "center" },
  // [ClockSpire] Extra Move (Repeat).
  extra_move_repeat: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#6fe3ff", "#ffd76a", "#1c3a4a"], source: "caster" },
  // [ClockSpire] Time Stop (Short).
  time_stop_short: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#3a3766", "#6fe3ff", "#12122a"], source: "caster" },
  // [ClockSpire] Time Rewind.
  time_rewind: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#5b2b8f", "#6fe3ff", "#2a1030"], source: "caster" },
  // [ClockSpire] Lost Days.
  lost_days: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#5a6b8f", "#cdd6ff", "#2c3e6b"], source: "caster" },
  // [ClockSpire] Stolen Hours.
  wa_stolen_hours: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#e8c97a", "#6fe3ff", "#4a3a22"], source: "caster" },
  // [CardRite] Sever.
  sever: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#6b4a8f", "#c94a5a", "#2a1030"], source: "caster" },
  // [CardRite] Draft Domination.
  draft_domination: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#3a3a45", "#c94a5a", "#1c1c22"], source: "caster" },
  // [CardRite] Total Nullify.
  total_nullify: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#5c5c63", "#c94a5a", "#2a2a30"], source: "caster" },
  // [CardRite] Favorable Stars.
  favorable_stars: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#2c3e6b", "#ffd76a", "#12122a"], source: "caster" },
  // [CardRite] The Tower.
  the_tower: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#2c3e6b", "#c94a3a", "#12122a"], source: "caster" },
  // [CardRite] The Death Arcana.
  death_arcana: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#12081f", "#8f6bff", "#0d0618"], source: "caster" },
  // [CardRite] Chess Diff.
  chess_diff: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#5a6b8f", "#eef1f7", "#2c3e6b"], source: "caster" },
  // [CardRite] Greed.
  wa_greed: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#8a6a3a", "#ffd76a", "#4a3a22"], source: "caster" },
  // [CardRite] Riddle Game.
  riddle_game: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#8a6a3a", "#e8dcc0", "#4a3a22"], source: "caster" },
  // [CardRite] Rehab.
  rehab: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#5fc9b0", "#eef1f7", "#1c4a3a"], source: "caster" },
  // [CardRite] Parole.
  parole: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#5a6b8f", "#eef1f7", "#2c3e6b"], source: "caster" },
  // [CardRite] Long Leash.
  long_leash: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#b58a5a", "#e8dcc0", "#5a4a36"], source: "caster" },
  // [CardRite] Warden's Bribe.
  wardens_bribe: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#8a6a3a", "#ffd76a", "#4a3a22"], source: "caster" },
  // [CardRite] Iron Will.
  iron_will: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#8a94a8", "#c9cdd6", "#3a3a40"], source: "caster" },
  // [CardRite] Wrong Way.
  wc_wrong_way: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#c94a5a", "#e8dcc0", "#5a1512"], source: "caster" },
  // [CardRite] Broken Elevator.
  wc_broken_elevator: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#8a94a8", "#ffe9b0", "#3a3a40"], source: "caster" },
  // [CardRite] Unseelie Bargain.
  unseelie_bargain: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#2a1030", "#8f6bff", "#12081f"], source: "caster" },
  // [ThiefHand] Buff Thief.
  buff_thief: { travel: "arc", impact: "smoke", aftermath: "none", palette: ["#8f6bff", "#ffd76a", "#2a2a38"], source: "caster" },
  // [ThiefHand] Buff Siphon.
  buff_siphon: { travel: "arc", impact: "smoke", aftermath: "none", palette: ["#c94ad1", "#ffd76a", "#1c0f18"], source: "caster" },
  // [ThiefHand] Spelltheft.
  wa_spelltheft: { travel: "arc", impact: "smoke", aftermath: "none", palette: ["#5b2b8f", "#e3d0ff", "#1c0f2a"], source: "caster" },
  // [ThiefHand] Draft Seize.
  draft_seize: { travel: "arc", impact: "smoke", aftermath: "none", palette: ["#6b4a8f", "#cdd6ff", "#2a1030"], source: "caster" },
  // [ThiefHand] Collapse.
  collapse: { travel: "wave", impact: "smoke", aftermath: "none", palette: ["#8f6bff", "#c9cdd6", "#1c1c2a"], source: "center" },
  // [ThiefHand] Void.
  void: { travel: "arc", impact: "smoke", aftermath: "none", palette: ["#5b2b8f", "#b98cff", "#0d0618"], source: "caster" },
  // [ThiefHand] Sabotage.
  wa_sabotage: { travel: "arc", impact: "smoke", aftermath: "none", palette: ["#5a6b8f", "#cdd6ff", "#1c1c2a"], source: "caster" },
  // [ThiefHand] Empty Handed.
  empty_handed: { travel: "arc", impact: "smoke", aftermath: "none", palette: ["#8a94a8", "#c94a5a", "#2a2a30"], source: "caster" },
  // [CrownForge] Double Queen.
  double_queen: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#ffd76a", "#fff2c9", "#8a6414"], source: "lead" },
  // [CrownForge] Twin Queens.
  twin_queens: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#ffd76a", "#ffe9b0", "#7a5b23"], source: "lead" },
  // [CrownForge] Promotion Storm.
  promotion_storm: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#c9cdd6", "#ffd76a", "#5a6b8f"], source: "lead" },
  // [CrownForge] Mass Promote Minor.
  mass_promote_minor: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#b58a5a", "#ffd76a", "#5a4a36"], source: "lead" },
  // [CrownForge] Resurrect Queen.
  resurrect_queen: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#6b1a2a", "#ffd76a", "#3a0e1a"], source: "lead" },
  // [CrownForge] Legendary Forge.
  legendary_forge: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#ff9d3d", "#ffd166", "#3a1c12"], source: "lead" },
  // [CrownForge] Royal Ascension.
  royal_ascension: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#b98cff", "#ffd76a", "#3b1a5e"], source: "lead" },
  // [CrownForge] Second King.
  second_king: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#ffd76a", "#ffe9b0", "#8a6a3a"], source: "lead" },
  // [CrownForge] Leaden Crown.
  wa_leaden_crown: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#6e6e78", "#c9a84c", "#2a2a30"], source: "lead" },
  // [CrownForge] Overclock Major.
  overclock_major: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#6fe3ff", "#ffd76a", "#1c3a4a"], source: "lead" },
  // [CrownForge] Ascendant Knight.
  ascendant_knight: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#b98cff", "#e3d0ff", "#3b1a5e"], source: "lead" },
  // [CrownForge] Nerf Breaker.
  nerf_breaker: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#8a94a8", "#ffd166", "#3a3a40"], source: "lead" },
  // [RiftGate] Fey Step.
  fey_step: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#3f8f3f", "#a8e07f", "#1c4a1c"], source: "lead" },
  // [RiftGate] Rift Walker.
  rift_walker: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#5b2b8f", "#6fe3ff", "#12081f"], source: "lead" },
  // [RiftGate] Mirror of Souls.
  mirror_of_souls: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#5a8fc0", "#bfe6ff", "#2c3e6b"], source: "lead" },
  // [RiftGate] Conjured Rook.
  wa_conjure_rook: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#8f6bff", "#e3d0ff", "#2a1030"], source: "lead" },
  // [RiftGate] Twin Familiars.
  wa_twin_familiars: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#7fd8d8", "#e3d0ff", "#12303a"], source: "lead" },
  // [RiftGate] Ley Line.
  ley_line: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#5fc9b0", "#a8e07f", "#1c4a3a"], source: "lead" },
  // [BeastRush] The Wild Hunt.
  wild_hunt: { travel: "bolt", impact: "shock", aftermath: "none", palette: ["#3b1a5e", "#b98cff", "#12081f"], source: "caster" },
  // [BeastRush] Dragon Mount.
  dragon_mount: { travel: "bolt", impact: "shock", aftermath: "none", palette: ["#4a8f5f", "#d6234f", "#1c4a2c"], source: "caster" },
  // [BeastRush] Bobrito Bandito.
  sahur: { travel: "bolt", impact: "shock", aftermath: "none", palette: ["#8a6a3a", "#c94a3a", "#4a3a22"], source: "caster" },

  // ---- Tier 4 basic-band plugin cards (basicPlays.tsx) ----
  // Palette matches each card's basicPlays template; restrained specs, no
  // shake anywhere below tier 7.
  // [ChainLash] Abandoned Post.
  abandoned_post: { travel: "chain", impact: "shock", aftermath: "none", palette: ["#8a94a8","#c9cdd6","#2e3440"], source: "caster" },
  // [BellToll] Adrenaline.
  adrenaline: { travel: "none", impact: "shock", aftermath: "none", palette: ["#ffd76a","#fff7de","#8a6a3a"], source: "caster" },
  // [PennantRaise] Army Reversal.
  army_reversal: { travel: "wave", impact: "sparkle", aftermath: "none", palette: ["#c94a3a","#ffd76a","#3a1c16"], source: "caster" },
  // [RuneStamp] Atomic Captures (Small).
  atomic_captures_small: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#8faf4a","#c9b0e8","#2f3a26"], source: "caster" },
  // [PrismFlash] Blink Army.
  blink_army: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#8f6bff","#6fe3ff","#1c1030"], source: "lead" },
  // [ChainLash] Blockade.
  blockade: { travel: "chain", impact: "shock", aftermath: "none", palette: ["#7d8aa0","#e3e9f2","#1f2734"], source: "caster" },
  // [CardFlick] Buff Thief (Minor).
  buff_thief_minor: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#b98cff","#ffd76a","#2a1a4a"], source: "caster" },
  // [ScrollSnap] Burned Dispatches.
  burned_dispatches: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#e8dcc0","#8a6a3a","#2c3e6b"], source: "caster" },
  // [ColdSnap] Cascade Freeze.
  cascade_freeze: { travel: "none", impact: "shatter", aftermath: "frost", palette: ["#9fd8ff","#e8f8ff","#2c5a80"], source: "lead" },
  // [ScrollSnap] Chain Nullify.
  chain_nullify: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#e0d0a8","#c94a3a","#2a3450"], source: "caster" },
  // [GlintArc] Changeling.
  changeling: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#6fe3ff","#ffffff","#1c3a4a"], source: "lead" },
  // [SatchelDrop] Coffee.
  coffee: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#b0824a","#ffe9b0","#3e2f1c"], source: "lead" },
  // [SatchelDrop] Comet Shard.
  comet_shard: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#8a6a3a","#ffd23f","#33261a"], source: "lead" },
  // [BellToll] Counter-Nerf.
  counter_nerf: { travel: "none", impact: "shock", aftermath: "none", palette: ["#f7c95a","#fff2c9","#6e5528"], source: "caster" },
  // [ColdSnap] Cryostasis.
  cryostasis: { travel: "none", impact: "shatter", aftermath: "frost", palette: ["#8fb5e8","#dff7ff","#22304a"], source: "lead" },
  // [ScrollSnap] Dead Letter.
  dead_letter: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#e8dcc0","#8f2bbf","#241a3a"], source: "caster" },
  // [SigilRing] Duelist.
  duelist: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#8fb5e8","#ffd76a","#22304a"], source: "lead" },
  // [LeafSpin] Faerie Ring.
  faerie_ring: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#5faf5f","#ff9dd6","#1c4a2c"], source: "lead" },
  // [HoofSpring] Firecracker.
  firecracker: { travel: "arc", impact: "shock", aftermath: "none", palette: ["#a8763a","#ffd76a","#3a2a18"], source: "mover" },
  // [KeyTurn] Flypaper File.
  flypaper_file: { travel: "none", impact: "shock", aftermath: "none", palette: ["#bfa050","#efe0b8","#36301e"], source: "lead" },
  // [ChainLash] Frozen Furrows.
  frozen_furrows: { travel: "chain", impact: "shock", aftermath: "none", palette: ["#6e7b8f","#ffd76a","#242c38"], source: "caster" },
  // [HoofSpring] Giant Slayer.
  giant_slayer: { travel: "arc", impact: "shock", aftermath: "none", palette: ["#bf9a68","#f2e6d0","#46381f"], source: "mover" },
  // [PrismFlash] Grand Recall.
  grand_recall: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#9d7fff","#7fd8d8","#221440"], source: "lead" },
  // [StoneShell] Granite Towers.
  granite_towers: { travel: "none", impact: "debris", aftermath: "smolder", palette: ["#9a8f8a","#c9b89a","#3a322c"], source: "lead" },
  // [ColdSnap] Hard Frost.
  hard_frost: { travel: "none", impact: "shatter", aftermath: "frost", palette: ["#9fd8ff","#e8f8ff","#2c5a80"], source: "lead" },
  // [ChainLash] Heavy Shackles.
  heavy_shackles: { travel: "chain", impact: "shock", aftermath: "none", palette: ["#7d8aa0","#e3e9f2","#1f2734"], source: "caster" },
  // [CardFlick] Hero's Journey.
  heros_journey: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#8f6bff","#fff2c9","#22123e"], source: "caster" },
  // [RuneStamp] Hex Doll.
  hex_doll: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#8faf4a","#c9b0e8","#2f3a26"], source: "caster" },
  // [SigilRing] Hold the Bridge.
  hold_the_bridge: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#c9a84c","#e8fff7","#3a3026"], source: "lead" },
  // [ColdSnap] Immobilizer.
  immobilizer: { travel: "none", impact: "shatter", aftermath: "frost", palette: ["#8fb5e8","#dff7ff","#22304a"], source: "lead" },
  // [SigilRing] Iron Wall.
  iron_wall: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#5fc9b0","#ffd76a","#1c4a3a"], source: "lead" },
  // [StoneShell] Ironbound Rook.
  ironbound_rook: { travel: "none", impact: "debris", aftermath: "smolder", palette: ["#b0a68f","#e3ddd0","#4a4336"], source: "lead" },
  // [GlintArc] Kingslide.
  kingslide: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#6fd8e8","#f2fcff","#173842"], source: "lead" },
  // [CogTick] Lost Weekend.
  lost_weekend: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#b5924a","#8fe8ff","#302818"], source: "lead" },
  // [PrismFlash] Mass Recall.
  mass_recall: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#a88cff","#8fe8ff","#281a48"], source: "lead" },
  // [BannerMuster] Mass Resurrect.
  mass_resurrect: { travel: "none", impact: "shock", aftermath: "sparkle", palette: ["#a83a2a","#e3e9f2","#2c100c"], source: "lead" },
  // [ScrollSnap] Mirror.
  mirror: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#f0e2c4","#4a7a5f","#2c2416"], source: "caster" },
  // [HoofSpring] Overrun.
  overrun: { travel: "arc", impact: "shock", aftermath: "none", palette: ["#c9a84c","#fff2c9","#4a3a22"], source: "mover" },
  // [ScrollSnap] Patch Notes.
  patch_notes: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#e8dcc0","#8a6a3a","#2c3e6b"], source: "caster" },
  // [BannerMuster] Phantom Rook.
  phantom_rook: { travel: "none", impact: "shock", aftermath: "sparkle", palette: ["#bf5a3a","#cdd6e0","#361812"], source: "lead" },
  // [LeafSpin] Puck's Mischief.
  pucks_mischief: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#6fae4a","#e8fff7","#243f14"], source: "lead" },
  // [CardFlick] Recast.
  recast: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#a880e8","#ffd23f","#261644"], source: "caster" },
  // [PrismFlash] Regroup.
  regroup: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#9d7fff","#7fd8d8","#221440"], source: "lead" },
  // [BellToll] Respite.
  respite: { travel: "none", impact: "shock", aftermath: "none", palette: ["#f7c95a","#fff2c9","#6e5528"], source: "caster" },
  // [LanternLift] Resurrect.
  resurrect: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#5fae7f","#ffd76a","#16301f"], source: "lead" },
  // [LanternLift] Resurrect Major.
  resurrect_major: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#8fd1b0","#ffe9c9","#22422e"], source: "lead" },
  // [GlintArc] Royal Decree.
  royal_decree: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#7fc9e8","#e3f6ff","#1c3644"], source: "lead" },
  // [KeyTurn] Sealed Gate.
  sealed_gate: { travel: "none", impact: "shock", aftermath: "none", palette: ["#d1a85a","#fff2c9","#3d3220"], source: "lead" },
  // [SigilRing] Shieldmaiden.
  shieldmaiden: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#7fd8a8","#fff2c9","#1c4a2c"], source: "lead" },
  // [PennantRaise] Solstice.
  solstice: { travel: "wave", impact: "sparkle", aftermath: "none", palette: ["#b5533a","#fff2c9","#33170f"], source: "caster" },
  // [StoneShell] Statue Stable.
  statue_stable: { travel: "none", impact: "debris", aftermath: "smolder", palette: ["#8a8478","#e8dcc0","#3c362c"], source: "lead" },
  // [StoneShell] Stone Clergy.
  stone_clergy: { travel: "none", impact: "debris", aftermath: "smolder", palette: ["#9a8f8a","#c9b89a","#3a322c"], source: "lead" },
  // [ScrollSnap] Suppress.
  suppress: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#e8dcc0","#8f2bbf","#241a3a"], source: "caster" },
  // [PrismFlash] Total Recall.
  total_recall: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#8468f0","#c9f4ff","#1a0f38"], source: "lead" },
  // [HoofSpring] Twin Knights.
  twin_knights: { travel: "arc", impact: "shock", aftermath: "none", palette: ["#9a7a4a","#e0d0b0","#332918"], source: "mover" },
  // [GlintArc] Arcane Conduit.
  wa_arcane_conduit: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#a8e0e8","#fff7de","#274048"], source: "lead" },
  // [ColdSnap] Bind the Queen.
  wa_bind_the_queen: { travel: "none", impact: "shatter", aftermath: "frost", palette: ["#7fd8d8","#eef8ff","#1c4a52"], source: "lead" },
  // [CogTick] Borrowed Minute.
  wa_borrowed_minute: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#d1aa5a","#7fd8e8","#3c3120"], source: "lead" },
  // [HoofSpring] Camel Rider.
  wa_camel_rider: { travel: "arc", impact: "shock", aftermath: "none", palette: ["#c9a84c","#fff2c9","#4a3a22"], source: "mover" },
  // [SatchelDrop] Conjured Bishop.
  wa_conjure_bishop: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#8a6a3a","#ff9dd6","#2e2214"], source: "lead" },
  // [CardFlick] Disjunction.
  wa_disjunction: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#b98cff","#ffd76a","#2a1a4a"], source: "caster" },
  // [ScrollSnap] Disrupt Ritual.
  wa_disrupt_ritual: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#f0e2c4","#4a7a5f","#2c2416"], source: "caster" },
  // [InkSplash] Dominate.
  wa_dominate_minor: { travel: "none", impact: "smoke", aftermath: "smolder", palette: ["#5b4a9f","#e8ddff","#0e0c1c"], source: "caster" },
  // [ScrollSnap] Jinx.
  wa_jinx: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#e8dcc0","#8a6a3a","#2c3e6b"], source: "caster" },
  // [EyeBlink] Mind Read.
  wa_mind_read: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#7b8fd1","#f0f4ff","#232e52"], source: "caster" },
  // [EyeBlink] Omniscience.
  wa_omniscience: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#4fa3d1","#dfe8ff","#1c2c44"], source: "caster" },
  // [PrismFlash] Fold Space.
  wa_swap_flanks: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#8f6bff","#6fe3ff","#1c1030"], source: "lead" },
  // [SigilRing] Warding Circle.
  warding_circle: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#5fc9b0","#ffd76a","#1c4a3a"], source: "lead" },
  // [PrismFlash] Warp Field.
  warp_field: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#7b5fe8","#aef0ff","#170c2e"], source: "lead" },
  // [PrismFlash] Warp Reign.
  warp_reign: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#8468f0","#c9f4ff","#1a0f38"], source: "lead" },
  // [PrismFlash] Warp Rook.
  warp_rook: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#a88cff","#8fe8ff","#281a48"], source: "lead" },
  // [SigilRing] Watermelon Rind.
  watermelon_rind: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#4fa3d1","#dff7ff","#173a52"], source: "lead" },
  // [InkSplash] Body Double.
  wc_body_double: { travel: "none", impact: "smoke", aftermath: "smolder", palette: ["#8a70e0","#efe6ff","#181430"], source: "caster" },
  // [RuneStamp] Butterfingers.
  wc_butterfingers: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#a07fd1","#ffd76a","#2a1a3a"], source: "caster" },
  // [PennantRaise] Chaos Reigns.
  wc_chaos_reigns: { travel: "wave", impact: "sparkle", aftermath: "none", palette: ["#c05a2a","#f7e3b0","#361a0c"], source: "caster" },
  // [LanternLift] Lost and Found.
  wc_lost_and_found: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#5fae7f","#ffd76a","#16301f"], source: "lead" },
  // [ChainLash] Quicksand Patch.
  wc_quicksand_patch: { travel: "chain", impact: "shock", aftermath: "none", palette: ["#95a0b5","#d6a25a","#2a3140"], source: "caster" },
  // [LeafSpin] Ancient Grove.
  we_ancient_grove: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#3f8f3f","#a8e07f","#1c4a1c"], source: "lead" },
  // [RuneStamp] Backdraft.
  we_backdraft: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#7a9440","#e3d0ff","#28301c"], source: "caster" },
  // [PrismFlash] Riptide.
  we_riptide: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#7b5fe8","#aef0ff","#170c2e"], source: "lead" },
  // [PrismFlash] Undertow.
  we_undertow: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#9d7fff","#7fd8d8","#221440"], source: "lead" },
  // [ColdSnap] Counter Charge.
  ww_counter_charge: { travel: "none", impact: "shatter", aftermath: "frost", palette: ["#6fc3e8","#ffffff","#1d4560"], source: "lead" },
  // [InkSplash] Defectors.
  ww_defectors: { travel: "none", impact: "smoke", aftermath: "smolder", palette: ["#8f6bff","#e3d0ff","#141322"], source: "caster" },
  // [PennantRaise] Field Fortification.
  ww_field_fortification: { travel: "wave", impact: "sparkle", aftermath: "none", palette: ["#b5533a","#fff2c9","#33170f"], source: "caster" },
  // [BannerMuster] Forward Observer.
  ww_forward_observer: { travel: "none", impact: "shock", aftermath: "sparkle", palette: ["#a83a2a","#e3e9f2","#2c100c"], source: "lead" },
  // [SigilRing] High Ground.
  ww_high_ground: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#7fd8a8","#fff2c9","#1c4a2c"], source: "lead" },
  // [InkSplash] Mass Defection.
  ww_mass_defection: { travel: "none", impact: "smoke", aftermath: "smolder", palette: ["#6f5fd1","#f0e8ff","#100f1e"], source: "caster" },
  // [LanternLift] Recommission.
  ww_recommission: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#8fd1b0","#ffe9c9","#22422e"], source: "lead" },
  // [BannerMuster] Reserve Cavalry.
  ww_reserve_cavalry: { travel: "none", impact: "shock", aftermath: "sparkle", palette: ["#b0402e","#e8eef7","#2e120e"], source: "lead" },
  // [SatchelDrop] Shieldbearers.
  ww_shieldbearers: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#a87a4a","#a8e07f","#3a2c1c"], source: "lead" },
};

// --- Brainrot apex band --------------------------------------------------------
// [BananApe] Chimpanzini Bananini: a banana monsoon crashes out of the sky
// onto every knight and the whole jungle shakes.
const BRAINROT_APEX_VFX: Record<string, CardVfx> = {
  chimpanzini_bananini: { travel: "rain", impact: "burst", aftermath: "sparkle", palette: ["#ffd23f", "#a3d160", "#7a5b23"], source: "sky", shake: true },
};
Object.assign(CARD_VFX, BRAINROT_APEX_VFX);

// --- Generated-family defaults (covers non-bespoke tier-4+ cards) -------------
// One fiction-matched default per genSignature family. resolveCardVfx upgrades
// these with a board shake at tier >= 7 when the impact is a heavy one.

export const GEN_FAMILY_VFX: Record<string, CardVfx> = {
  // Ice crystals grow out of the square's center.
  frostbloom: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#9fd8ff", "#e8f8ff", "#4f8fd1"], source: "lead" },
  // Embers cascade down while a flame licks up.
  emberfall: { travel: "rain", impact: "embers", aftermath: "smolder", palette: ["#ff7a29", "#ffd166", "#7a2e0e"], source: "sky" },
  // A slab cracks and stone chips fly.
  stonecarve: { travel: "none", impact: "debris", aftermath: "smolder", palette: ["#8d8d94", "#c9c9cf", "#4c4c53"], source: "lead" },
  // A gear ring ticks a hard quarter turn.
  clockwork: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#c9a84c", "#8a6a3a", "#6fe3ff"], source: "lead" },
  // An hourglass drops in while its sand column drains.
  hourglass: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#e8c97a", "#b58a5a", "#6fe3ff"], source: "lead" },
  // A dashed spell circle inscribes around a stamped rune.
  arcaneRunes: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#8f6bff", "#6fe3ff", "#e3d0ff"], source: "lead" },
  // A jagged curse sigil slams down and drips.
  hexSigil: { travel: "arc", impact: "smoke", aftermath: "smolder", palette: ["#8faf4a", "#6b4a8f", "#2f3a26"], source: "caster" },
  // Ranks of chevrons march up the square.
  pawnTide: { travel: "wave", impact: "debris", aftermath: "none", palette: ["#c9b89a", "#8a7a63", "#eef1f7"], source: "caster" },
  // Hoof prints arc across with a landing dust ring.
  knightVault: { travel: "arc", impact: "shock", aftermath: "none", palette: ["#b58a5a", "#e8dcc0", "#8a6a3a"], source: "mover" },
  // A crenellated rampart builds up from the ground.
  rookRampart: { travel: "none", impact: "debris", aftermath: "none", palette: ["#b0a68f", "#8a7a63", "#d9d2c0"], source: "lead" },
  // Two diagonal beams snap across each other.
  bishopCross: { travel: "beam", impact: "burst", aftermath: "none", palette: ["#dfe8ff", "#8f6bff", "#ffffff"], source: "mover" },
  // A full coronal flare of queenly rays.
  queenRadiance: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#ffd76a", "#ffffff", "#b98cff"], source: "lead" },
  // A royal seal stamps, ribbons fall.
  kingsDecree: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#c94a3a", "#fff7de"], source: "caster" },
  // A crown rises through popping gleams.
  crownGleam: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#fff7de", "#c9a84c"], source: "lead" },
  // A pole shoots up and its pennant snaps out.
  bannerRally: { travel: "wave", impact: "sparkle", aftermath: "none", palette: ["#c94a3a", "#ffd76a", "#eef1f7"], source: "caster" },
  // Heavy concentric shockwaves under a dropped drum.
  drumShock: { travel: "none", impact: "shock", aftermath: "none", palette: ["#8a6a3a", "#c94a3a", "#e8dcc0"], source: "lead" },
  // Dome ribs assemble over the square.
  shieldDome: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#5fc9b0", "#ffd76a", "#e8fff7"], source: "lead" },
  // A bramble ring stamps in, leaves flick up.
  thornRing: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#3f8f3f", "#a8e07f", "#1c4a1c"], source: "lead" },
  // A chain pulls taut across the square and snaps.
  chainSnap: { travel: "chain", impact: "shock", aftermath: "none", palette: ["#8a94a8", "#c9cdd6", "#3a3a40"], source: "lead" },
  // An ink wash sweeps over, wisps curl away.
  shadowVeil: { travel: "wave", impact: "smoke", aftermath: "smolder", palette: ["#1c1c2a", "#5b2b8f", "#8a94a8"], source: "caster" },
  // A spirit lantern floats up trailing motes.
  lanternFloat: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#ffcf7a", "#5fc9b0", "#fff2c9"], source: "lead" },
  // Feathers puff out and drift down.
  featherBurst: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#eef1f7", "#9fc9ff", "#c9cdd6"], source: "lead" },
  // A wave crest washes across, droplets leap.
  tideSweep: { travel: "wave", impact: "burst", aftermath: "none", palette: ["#3f7fb5", "#7fd8d8", "#eef8ff"], source: "lead" },
  // A wind spiral spins through streaking air lines.
  gustSpiral: { travel: "wave", impact: "smoke", aftermath: "none", palette: ["#bfe6e6", "#eef8ff", "#8a94a8"], source: "lead" },
  // Jagged arcs jump around a crackling bolt.
  sparkArc: { travel: "chain", impact: "burst", aftermath: "none", palette: ["#7fb5ff", "#ffffff", "#3a5fbf"], source: "lead" },
  // Two orbs helix around each other, trading places.
  swapHelix: { travel: "arc", impact: "sparkle", aftermath: "none", palette: ["#8f6bff", "#5fc9b0", "#e3d0ff"], source: "mover" },
  // A rift slit opens, sparkles, zips shut.
  teleportRift: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#8f6bff", "#6fe3ff", "#12081f"], source: "lead" },
  // A pane flickers then bursts into glass shards.
  mirrorShatter: { travel: "none", impact: "shatter", aftermath: "none", palette: ["#aef0ff", "#eef8ff", "#8a94a8"], source: "lead" },
  // A coin tumbles high and lands in a ring.
  coinFlip: { travel: "arc", impact: "sparkle", aftermath: "none", palette: ["#ffd76a", "#c9a84c", "#fff7de"], source: "caster" },
  // Dice bounce and settle.
  diceTumble: { travel: "arc", impact: "shock", aftermath: "none", palette: ["#f5efe0", "#c94a3a", "#1c1c22"], source: "caster" },
  // A scroll rolls open over ghost script lines.
  scrollUnfurl: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#e8dcc0", "#8a6a3a", "#5a6b8f"], source: "lead" },
  // A quill slashes a signature, ink drips.
  quillSign: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#2c3e6b", "#eef1f7", "#c9a84c"], source: "lead" },
  // A prism splits light into fanned rays.
  prismSplit: { travel: "beam", impact: "sparkle", aftermath: "none", palette: ["#ffffff", "#ff9dd6", "#6fe3ff"], source: "lead" },
  // A flask drops in and bubbles fizz up.
  potionFizz: { travel: "none", impact: "burst", aftermath: "sparkle", palette: ["#5faf5f", "#ff9dd6", "#dff7f0"], source: "lead" },
  // A constellation twinkles and connects.
  starChart: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#cdd6ff", "#8b7bff", "#12122a"], source: "sky" },
  // Concentric frames collapse into the square.
  gravityWell: { travel: "none", impact: "shock", aftermath: "none", palette: ["#4a3b8f", "#8f6bff", "#12081f"], source: "lead" },
  // A bell swings, ripples toll outward.
  bellToll: { travel: "none", impact: "shock", aftermath: "none", palette: ["#c9a84c", "#8a6a3a", "#fff2c9"], source: "lead" },
};

// --- Resolution ----------------------------------------------------------------

/** Category-agnostic safe fallback so no tier-4+ card ever misses a spec. */
const DEFAULT_VFX: CardVfx = {
  travel: "none",
  impact: "burst",
  aftermath: "none",
  palette: ["#cfd8ff", "#8fa3ff", "#ffffff"],
  source: "lead",
};

/** Impacts weighty enough to earn a board shake at tier >= 7. */
const HEAVY_IMPACTS: ReadonlySet<VfxImpact> = new Set(["burst", "shatter", "debris", "shock"]);

// --- Tier 1-3 floor (owner: "tiers 1-4: more basic ones but still unique for
// the name and effect") ---------------------------------------------------------
// Low tiers get a BASIC but present canvas effect: no travel, one small
// impact, no aftermath, never a shake. The palette (and which small impact)
// derives from the card's gen family when it has one, else from its category,
// so a frost card still pops icy-blue and a hex card still puffs sickly green.
// The engine's particle scaling already clamps sanely at tier 1
// (impactCount clamps to a floor of 8 particles), so no extra clamping is
// needed here — only the vocabulary is restricted.

/** The only impacts a tier 1-3 play may use — the small, cheap ones. */
const SOFT_IMPACT: Record<VfxImpact, "sparkle" | "smoke" | "burst"> = {
  sparkle: "sparkle",
  smoke: "smoke",
  burst: "burst",
  shock: "burst", // a shock ring reads as a small pop down here
  shatter: "sparkle", // icy glints instead of flying shards
  debris: "smoke", // a puff of dust instead of rubble
  embers: "sparkle", // warm glints instead of an ember storm
};

/** Per-category small-impact defaults for low-tier cards with no gen family
 * (bespoke SIGNATURES cards below tier 4, and safety for unknown ids). */
const CATEGORY_LOW_VFX: Record<string, { impact: "sparkle" | "smoke" | "burst"; palette: string[] }> = {
  movement: { impact: "sparkle", palette: ["#6fe3ff", "#dff7ff", "#ffffff"] },
  pieces: { impact: "sparkle", palette: ["#ffd76a", "#fff7de", "#c9a84c"] },
  tempo: { impact: "sparkle", palette: ["#ffcf4d", "#6fe3ff", "#ffffff"] },
  protection: { impact: "sparkle", palette: ["#5fc9b0", "#e8fff7", "#ffd76a"] },
  attack: { impact: "burst", palette: ["#e6432c", "#ff9d3d", "#ffd166"] },
  info: { impact: "sparkle", palette: ["#4fa3d1", "#dfe8ff", "#ffffff"] },
  draft: { impact: "sparkle", palette: ["#b98cff", "#ffd76a", "#ffffff"] },
  nerf: { impact: "burst", palette: ["#ff9d3d", "#ff4fa3", "#ffffff"] },
  hex: { impact: "smoke", palette: ["#8faf4a", "#6b4a8f", "#c9b0e8"] },
  item: { impact: "sparkle", palette: ["#e8963a", "#ffd23f", "#fff7de"] },
};

/** FNV-1a hash so each card's low-tier styling is its own and stable. */
function cardHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The gentle travels a tier 2-3 card may draw from its hash: cheap, quick,
 *  and quiet enough to sit below the tier-4+ band, but no longer nothing. */
const LOW_TRAVEL: CardVfx["travel"][] = ["none", "arc", "wave", "rain", "bolt"];
/** Small accents mixed into a low-tier palette by hash, so two cards of the
 *  same category still pop with visibly different light. */
const LOW_ACCENTS = ["#ffffff", "#ffd76a", "#6fe3ff", "#ff9dd6", "#a8e07f", "#b98cff", "#ffcf7a", "#9fd8ff"];
const LOW_SOURCES: CardVfx["source"][] = ["lead", "caster", "sky", "center"];

/**
 * Resolve the VFX spec for a card play.
 * - Bespoke cards (CARD_VFX / EXTRA_CARD_VFX) play their hand-tuned entry at
 *   EVERY tier — a low-tier card someone bothered to author is trusted, minus
 *   the shake (that stays a tier-7+ privilege).
 * - Non-bespoke tier 1-3: a small but OWNED effect. The palette starts from
 *   the card's gen family or category, then the card id deterministically
 *   picks an accent tint, a soft impact, a gentle travel (tier 2-3; tier 1
 *   stays travel-free), a source, and — at tier 3 — a sparkle aftermath.
 *   Two same-category commons no longer play the same pixels.
 * - Generated tier-4+ cards: their family default (pass the GenFamily string),
 *   with shake promoted at tier >= 7 for heavy impacts.
 * - Anything else: a safe neutral default — never null at tier >= 1.
 */
export function resolveCardVfx(id: string, tier: number, genFamily?: string): CardVfx | null {
  const bespoke = CARD_VFX[id] ?? EXTRA_CARD_VFX[id];
  if (tier < 4) {
    if (bespoke) return bespoke.shake ? { ...bespoke, shake: false } : bespoke;
    const fam = genFamily !== undefined ? GEN_FAMILY_VFX[genFamily] : undefined;
    const cat = CATEGORY_LOW_VFX[BUFF_BY_ID[id]?.category ?? ""];
    const h = cardHash(id);
    const basePalette = fam?.palette ?? cat?.palette ?? DEFAULT_VFX.palette;
    const accent = LOW_ACCENTS[(h >>> 3) % LOW_ACCENTS.length];
    // Keep the family/category primary (the fiction read) and thread the
    // card's own accent into the middle of the palette.
    const palette = [basePalette[0], accent, ...basePalette.slice(1)];
    const softImpact = fam ? SOFT_IMPACT[fam.impact] : (cat?.impact ?? "sparkle");
    // A third of commons trade their family impact for a hash-picked sibling,
    // widening the low-tier vocabulary without leaving the soft set.
    const impact =
      (h >>> 7) % 3 === 0
        ? (["sparkle", "smoke", "burst"] as const)[(h >>> 9) % 3]
        : softImpact;
    return {
      travel: tier >= 2 ? LOW_TRAVEL[(h >>> 11) % LOW_TRAVEL.length] : "none",
      impact,
      aftermath: tier >= 3 && (h & 2) === 2 ? "sparkle" : "none",
      palette,
      source: LOW_SOURCES[(h >>> 14) % LOW_SOURCES.length],
    };
  }
  if (bespoke) return bespoke;
  const base = (genFamily !== undefined && GEN_FAMILY_VFX[genFamily]) || DEFAULT_VFX;
  if (tier >= 7 && !base.shake && HEAVY_IMPACTS.has(base.impact)) {
    return { ...base, shake: true };
  }
  return base;
}

// --- Dev-only self-check ---------------------------------------------------------
// Warns when a tier>=4 bespoke SIGNATURES card has no CARD_VFX entry. SIGNATURES
// and the buff library are imported lazily (dynamic import) so this module never
// participates in an import cycle with BoardEffects at load time; the whole block
// is compiled away in production builds.
//
// The AUTHORITATIVE gate is scripts/check-vfx-coverage.cjs, wired into
// `test:rules` — this in-page warning is stripped from production and scrolls
// past in dev, which is exactly how 21 uncovered cards accumulated unnoticed.
// Keep the two in agreement: coverage accepts an entry in EITHER table (that is
// what resolveCardVfx reads), and orphan detection spans ALL plugin modules via
// PLUGIN_ID_SET rather than just the three imported here.

export function runVfxSelfCheck(): void {
  if (process.env.NODE_ENV === "production") return;
  void Promise.all([
    import("./BoardEffects"),
    import("@/engine/buffs/library"),
    // Every plugin module's cards anchor VFX entries too. PLUGIN_ID_SET is the
    // eager, drift-guarded union of all 13 modules' PLAYS keys (see
    // sigPlugins.tsx + scripts/check-sig-plugins.cjs), so one small import
    // covers them all — importing the modules themselves would pull ~9k lines
    // of render art out of the lazy signature-visuals chunk.
    import("./sigPlugins"),
  ])
    .then(([fx, lib, plugins]) => {
      const signatures = (fx as { SIGNATURES?: Record<string, unknown> }).SIGNATURES;
      const buffById = (lib as { BUFF_BY_ID?: Record<string, { tier?: number }> }).BUFF_BY_ID;
      const pluginIds = (plugins as { PLUGIN_ID_SET?: ReadonlySet<string> }).PLUGIN_ID_SET;
      if (!signatures || !buffById || !pluginIds) return;
      // Coverage mirrors resolveCardVfx: either table counts.
      const covered = (id: string) => !!CARD_VFX[id] || !!EXTRA_CARD_VFX[id];
      const missing: string[] = [];
      for (const id of Object.keys(signatures)) {
        const tier = buffById[id]?.tier ?? 0;
        if (tier >= 4 && !covered(id)) missing.push(`${id} (tier ${tier})`);
      }
      if (missing.length > 0) {

        console.warn(
          `[vfxSpecs] ${missing.length} tier>=4 bespoke card(s) missing a CARD_VFX entry:`,
          missing,
        );
      }
      const orphaned = [...Object.keys(CARD_VFX), ...Object.keys(EXTRA_CARD_VFX)].filter(
        (id) => !(id in signatures) && !pluginIds.has(id),
      );
      if (orphaned.length > 0) {

        console.warn(
          `[vfxSpecs] VFX entries with no SIGNATURES / plugin-PLAYS counterpart:`,
          orphaned,
        );
      }
    })
    .catch(() => {
      /* self-check is best-effort; never break the app over it */
    });
}

if (process.env.NODE_ENV !== "production") {
  runVfxSelfCheck();
}
