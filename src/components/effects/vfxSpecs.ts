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
   * choreography lead square, the caster's king, above the board, or
   * board center. */
  source: "mover" | "lead" | "caster" | "sky" | "center";
  /** Board thump on impact (reserved for tier 7+ heavy hits and a handful
   * of lower-tier line-wipes / meteoric crashes). */
  shake?: boolean;
}

// --- Bespoke specs, one per tier>=4 SIGNATURES card ---------------------------
// Grouped by tier, descending. Keep keys in sync with BoardEffects.SIGNATURES;
// the dev self-check at the bottom of this file warns on any gap.

export const CARD_VFX: Record<string, CardVfx> = {
  // ---- Tier 10 — apex ----
  // Whole army becomes amazons: a royal surge rolls out from the middle of your host.
  ascendancy: { travel: "wave", impact: "sparkle", aftermath: "sparkle", palette: ["#b98cff", "#ffd76a", "#ffffff"], source: "center", shake: true },
  // A fresh army thunders down out of the sky onto your half.
  grand_army: { travel: "rain", impact: "smoke", aftermath: "sparkle", palette: ["#d8dee9", "#ffd76a", "#8a94a8"], source: "sky", shake: true },
  // A wave of unmaking rolls out from your king and erases the enemy army.
  oblivion: { travel: "wave", impact: "burst", aftermath: "smolder", palette: ["#7b3fbf", "#1a1030", "#e3d0ff"], source: "caster", shake: true },
  // Firebombs rain across the enemy lines while your relief force lands.
  total_war: { travel: "rain", impact: "debris", aftermath: "scorch", palette: ["#e6432c", "#ff9d3d", "#3a1c12"], source: "sky", shake: true },

  // ---- Tier 9 ----
  // The lights go out: darkness pours down over the whole enemy board. Eerie, not thumpy.
  blackout: { travel: "wave", impact: "smoke", aftermath: "none", palette: ["#141322", "#3a3766", "#0a0a12"], source: "sky" },
  // Quiet holy coronation on your own king.
  divine_right: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#fff7de", "#b98cff"], source: "caster" },
  // A glacial front sweeps the whole board and locks the enemy solid.
  ice_age: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#9fd8ff", "#e8f8ff", "#3f7fb5"], source: "center", shake: true },
  // Heavy reinforcements slam down into your half.
  iron_legion: { travel: "rain", impact: "smoke", aftermath: "sparkle", palette: ["#aab6c8", "#e3e9f2", "#ffd76a"], source: "sky", shake: true },
  // A god descends: a golden shaft splits the sky and slams into the chosen
  // piece's square, divine light everywhere (owner: "effects should be way
  // cooler" — this is the apex empowerment, it thumps).
  living_god: { travel: "bolt", impact: "burst", aftermath: "sparkle", palette: ["#ffd76a", "#fff7de", "#ffffff"], source: "sky", shake: true },
  // A stone-grey wave rolls over the enemy court and hardens it.
  mass_petrify: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#8d8d94", "#c9c9cf", "#4c4c53"], source: "center", shake: true },
  // Your queen streaks across the board to the enemy king; frost locks the court behind her.
  regicide: { travel: "bolt", impact: "shock", aftermath: "frost", palette: ["#d6234f", "#ffd76a", "#bfe6ff"], source: "mover", shake: true },
  // Every fallen piece climbs back out of the ground in a field of grave-light.
  resurrection: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#d8ffe9", "#ffd76a", "#7fd8a8"], source: "lead", shake: true },
  // A radiant queen descends and a ward settles over your whole host.
  second_coming: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#fff2c9", "#ffd76a", "#ffffff"], source: "lead" },

  // ---- Tier 8 ----
  // Crowns rain down on your knights and bishops.
  amazon_army: { travel: "rain", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#b98cff", "#fff7de"], source: "sky" },
  // Four moves in a row: a hard tempo snap at your king's square.
  blitzkrieg: { travel: "none", impact: "shock", aftermath: "none", palette: ["#ffcf4d", "#ffffff", "#e6432c"], source: "caster" },
  // A payload whistles down and levels a 5x5 zone.
  bombardiro_croc: { travel: "rain", impact: "debris", aftermath: "scorch", palette: ["#7c8a4a", "#ff9d3d", "#3a3526"], source: "sky", shake: true },
  // A meteor flattens a 3x3 area.
  cataclysmic_meteor: { travel: "rain", impact: "debris", aftermath: "smolder", palette: ["#ff7a29", "#e6432c", "#3a1c12"], source: "sky", shake: true },
  // A cathedral ward blooms out from your king over your whole half.
  divine_fortress: { travel: "wave", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#e8fff7", "#5fc9b0"], source: "caster" },
  // The enemy court is flash-frozen into statues.
  eternal_freeze: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#bfe6ff", "#ffffff", "#5a8fc0"], source: "center", shake: true },
  // Every enemy minor and pawn is wiped away in one ashen sweep.
  extinction: { travel: "wave", impact: "burst", aftermath: "smolder", palette: ["#9a8f8a", "#e6432c", "#2b2320"], source: "center", shake: true },
  // Phoenix fire re-forms your queen, rooks, and a minor where they land.
  full_resurrection: { travel: "none", impact: "embers", aftermath: "sparkle", palette: ["#ff9d3d", "#ffd76a", "#e6432c"], source: "lead", shake: true },
  // Pocket refills to full strength: a quiet arcane restock at your king.
  grand_reset: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#ffd76a", "#6fe3ff", "#ffffff"], source: "caster" },
  // Three bolts of wrath split the sky and smite named pieces.
  heavens_wrath: { travel: "bolt", impact: "burst", aftermath: "scorch", palette: ["#ffffff", "#ffd76a", "#7fb5ff"], source: "sky", shake: true },
  // A permanent shade settles over your king. Quiet and absolute.
  immortal_king: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#2c3e6b", "#dfe8ff"], source: "caster" },
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
  titan_legion: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#d8a85a", "#ffd76a", "#8a94a8"], source: "lead" },
  // Three annihilating darts leap from your king to the doomed pieces.
  total_annihilation: { travel: "arc", impact: "burst", aftermath: "smolder", palette: ["#8f2bbf", "#e6432c", "#2a1030"], source: "caster", shake: true },
  // Three squares tear open into hungry voids. A trap, not a bang.
  void_realm: { travel: "none", impact: "smoke", aftermath: "smolder", palette: ["#5b2b8f", "#12081f", "#b98cff"], source: "lead" },
  // Stone skin ripples over your army; a protection, so no thump.
  we_stoneskin: { travel: "wave", impact: "sparkle", aftermath: "none", palette: ["#b0a68f", "#d9d2c0", "#6e6552"], source: "center" },
  // The world grinds to a halt: a dead-grey stillness locks the enemy army.
  world_end: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#c9cdd6", "#8a94a8", "#eef1f7"], source: "center", shake: true },

  // ---- Tier 7 ----
  // Two squares yawn open into the abyss. Trap placement, quiet dread.
  abyss: { travel: "none", impact: "smoke", aftermath: "smolder", palette: ["#3b1a5e", "#0d0618", "#8f6bff"], source: "lead" },
  aegis: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#5fc9b0", "#ffd76a", "#e8fff7"], source: "caster" },
  // The ancient ward rolls out from your king over everything you own.
  aegis_of_ages: { travel: "wave", impact: "sparkle", aftermath: "sparkle", palette: ["#c9a84c", "#5fc9b0", "#fff7de"], source: "caster" },
  // The queen is crowned an Amazon on her own square.
  amazon: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#b98cff", "#ffd76a", "#ffffff"], source: "lead" },
  // Two annihilating darts from your king unmake their targets.
  annihilation: { travel: "arc", impact: "burst", aftermath: "smolder", palette: ["#8f2bbf", "#d6234f", "#2a1030"], source: "caster", shake: true },
  // A pawn ascends in a gout of blood-light while its sibling bursts.
  blood_pact: { travel: "none", impact: "burst", aftermath: "smolder", palette: ["#a3122e", "#ff5c5c", "#1c0f12"], source: "lead", shake: true },
  // A tornado tears across the board and scrambles every pawn.
  chaos_theory: { travel: "wave", impact: "smoke", aftermath: "none", palette: ["#8a94a8", "#5fc9b0", "#d8dee9"], source: "center", shake: true },
  // A creeping cold-plague enchantment drifts from your king. No immediate hit.
  contagion: { travel: "arc", impact: "smoke", aftermath: "frost", palette: ["#7fd8d8", "#9fae5a", "#dff7f7"], source: "caster" },
  // Glacial cold radiates outward and locks the whole enemy army.
  deep_freeze: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#4f8fd1", "#bfe6ff", "#ffffff"], source: "center", shake: true },
  eternal_reign: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#ffffff", "#c9a84c"], source: "caster" },
  // One knight is consecrated as a godslayer on its square.
  godslayer_knight: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#8f6bff", "#dfe3ff", "#ffd76a"], source: "lead" },
  // Queen and minor rise together in soft grave-light.
  grand_resurrection: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#fff2c9", "#7fd8a8", "#ffffff"], source: "lead" },
  // A grey hex rolls off your king and hardens the enemy flanks to stone.
  hex_of_stone: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#8d8d94", "#7fae5a", "#3a3a40"], source: "caster", shake: true },
  // The golden payout wheel spins down at your king and pays out in coins.
  jackpot: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#f4c430", "#ffffff"], source: "caster" },
  // A warband musters into your pocket beside your king.
  kings_legion: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#c94a3a", "#ffd76a", "#8a94a8"], source: "caster" },
  // A meteor slams the crossing square; rank and file go up with it.
  meteor: { travel: "rain", impact: "debris", aftermath: "smolder", palette: ["#ff7a29", "#e6432c", "#2b1a12"], source: "sky", shake: true },
  // A spectre claws up out of the square in grave-green smoke.
  necromancer: { travel: "none", impact: "smoke", aftermath: "smolder", palette: ["#5fae7f", "#1a2a1e", "#c9ffd8"], source: "lead" },
  // Three moves in a row: an aggressive tempo crack at your king.
  onslaught: { travel: "none", impact: "shock", aftermath: "none", palette: ["#e6432c", "#ffcf4d", "#ffffff"], source: "caster" },
  // A thread of dominion snakes from your king into the stolen piece.
  orb_of_dominion: { travel: "arc", impact: "shock", aftermath: "sparkle", palette: ["#8f2bbf", "#ffd76a", "#e3d0ff"], source: "caster" },
  // The clock overheats: hot cyan sparks at your king.
  overclocked: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#6fe3ff", "#ffcf4d", "#ffffff"], source: "caster" },
  // Three pawns transmute to gold queens where they stand.
  philosophers_stone: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#fff7de", "#c9a84c"], source: "lead" },
  // A purging sweep scours one half of the board.
  purge_realm: { travel: "wave", impact: "burst", aftermath: "smolder", palette: ["#b98cff", "#ffffff", "#3b1a5e"], source: "center", shake: true },
  // The queen physically sweeps the line, smashing everything on it.
  queens_rampage: { travel: "beam", impact: "debris", aftermath: "none", palette: ["#d6234f", "#ffd76a", "#3a0e1a"], source: "mover", shake: true },
  // The ground gives way under the whole pawn line.
  ruin: { travel: "wave", impact: "debris", aftermath: "smolder", palette: ["#8a7a63", "#ff9d3d", "#3a3026"], source: "center", shake: true },
  // The queen reaps a diagonal; souls stream off as pawns rise behind her.
  soul_harvest: { travel: "beam", impact: "smoke", aftermath: "sparkle", palette: ["#5fae7f", "#1a1420", "#c9ffd8"], source: "mover", shake: true },
  // A dragon queen and her hatchling settle into your pocket on hot embers.
  summon_dragon: { travel: "none", impact: "embers", aftermath: "sparkle", palette: ["#d6234f", "#ffd76a", "#ff9d3d"], source: "caster" },
  // A chalk circle flares at your king and a warband steps through.
  summoning_circle: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#8f6bff", "#6fe3ff", "#e3d0ff"], source: "caster" },
  // Time skips, then ice takes the whole enemy army.
  time_freeze: { travel: "none", impact: "shatter", aftermath: "frost", palette: ["#6fe3ff", "#ffffff", "#3f7fb5"], source: "center", shake: true },
  // One piece is quietly forged into a titan.
  titan: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#d8a85a", "#8a94a8", "#ffd76a"], source: "lead" },
  // Crowns rain down on all your knights.
  triple_amazon: { travel: "rain", impact: "sparkle", aftermath: "sparkle", palette: ["#ffd76a", "#8f6bff", "#fff7de"], source: "sky" },
  // The genie's smoke curls up at your king and leaves a queen behind.
  wc_genie_wish: { travel: "none", impact: "smoke", aftermath: "sparkle", palette: ["#c94ad1", "#5fc9b0", "#ffd76a"], source: "caster" },
  // Boulders drop out of the sky and bury the enemy heavies.
  we_landslide: { travel: "rain", impact: "debris", aftermath: "smolder", palette: ["#8a7a63", "#5c5348", "#d9d2c0"], source: "sky", shake: true },
  // A blizzard howls down over the enemy army.
  we_whiteout: { travel: "rain", impact: "shatter", aftermath: "frost", palette: ["#ffffff", "#bfe6ff", "#8fb8d8"], source: "sky", shake: true },
  // Trenches dug, heads down: an earthen ward around your king.
  ww_dug_in_defense: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#7c8a4a", "#b0a68f", "#d9d2c0"], source: "caster" },

  // ---- Tier 6 ----
  all_in: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#ffd76a", "#e6432c", "#1c7a4a"], source: "caster" },
  // Four dead pawns claw into your pocket on grave smoke.
  army_of_the_dead: { travel: "none", impact: "smoke", aftermath: "smolder", palette: ["#5fae7f", "#2a2a30", "#c9ffd8"], source: "caster" },
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
  // A pillar of holy light smites, then petrifies the bystanders.
  judgment_day: { travel: "bolt", impact: "burst", aftermath: "scorch", palette: ["#ffffff", "#ffd76a", "#8d8d94"], source: "sky", shake: true },
  // The kraken surfaces in a burst of black water.
  kraken: { travel: "none", impact: "burst", aftermath: "none", palette: ["#1f6e6e", "#0d2b33", "#7fd8d8"], source: "lead" },
  // Four squares get little gold deeds slapped on them.
  landlord: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#ffd76a", "#1c7a4a", "#fff7de"], source: "lead" },
  // The phylactery pulses with stored necromancy at your king.
  lich_phylactery: { travel: "none", impact: "smoke", aftermath: "smolder", palette: ["#5fae7f", "#8f2bbf", "#1a2a1e"], source: "caster" },
  // Bolts drop on up to three enemy pieces.
  lightning_strike: { travel: "bolt", impact: "burst", aftermath: "scorch", palette: ["#ffffff", "#7fb5ff", "#ffd76a"], source: "sky", shake: true },
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
  wc_wrecking_ball: { travel: "arc", impact: "debris", aftermath: "smolder", palette: ["#8a94a8", "#ff9d3d", "#3a3a40"], source: "mover", shake: true },
  // Ice bursts outward from your own king, flash-freezing the ring around it.
  we_flash_freeze: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#bfe6ff", "#ffffff", "#6fb5e8"], source: "caster" },
  // Floodwater sloshes over three squares.
  we_flood: { travel: "wave", impact: "burst", aftermath: "none", palette: ["#3f7fb5", "#7fd8d8", "#dff7ff"], source: "lead" },
  // Two walls of blue ice grind up out of the files.
  we_glacier_wall: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#7fb5e8", "#e8f8ff", "#3f6f9f"], source: "lead" },
  // A hellfire beam burns the full diagonal down to cinders.
  we_hellfire_beam: { travel: "beam", impact: "embers", aftermath: "scorch", palette: ["#e6432c", "#ff9d3d", "#1c0f0a"], source: "mover", shake: true },
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
  // The bomber-goose lobs a stun grenade onto the zone.
  bombombini_gusini: { travel: "arc", impact: "shock", aftermath: "none", palette: ["#c9b45a", "#ffcf4d", "#7c8a4a"], source: "caster" },
  // Dusk-amber ward on the queen: her time is borrowed.
  borrowed_time: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#e8a84c", "#6b4a8f", "#fff2c9"], source: "lead" },
  // The knight thunders down its line in a cloud of hoof-shock.
  cavalry_charge: { travel: "bolt", impact: "shock", aftermath: "none", palette: ["#c9502c", "#e8b04b", "#fff7e0"], source: "mover" },
  // Lightning leaps piece to piece down the diagonal; the last one freezes.
  chain_lightning: { travel: "chain", impact: "burst", aftermath: "frost", palette: ["#7fb5ff", "#ffffff", "#3a5fbf"], source: "mover", shake: true },
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
  dragons_breath: { travel: "beam", impact: "embers", aftermath: "scorch", palette: ["#ff7a29", "#ffd166", "#7a2e0e"], source: "mover", shake: true },
  // The blade of kings is drawn: silver light down the bishop.
  excalibur: { travel: "none", impact: "sparkle", aftermath: "sparkle", palette: ["#dfe8ff", "#ffd76a", "#5a8fc0"], source: "lead" },
  // A wall of blue ice erupts along the whole file.
  frost_wall: { travel: "wave", impact: "shatter", aftermath: "frost", palette: ["#7fb5e8", "#e8f8ff", "#3f6f9f"], source: "lead" },
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
  nova: { travel: "beam", impact: "burst", aftermath: "scorch", palette: ["#ffffff", "#ffd76a", "#ff7a29"], source: "mover", shake: true },
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
  siege_rook: { travel: "beam", impact: "debris", aftermath: "smolder", palette: ["#8a94a8", "#ff9d3d", "#4a4036"], source: "mover", shake: true },
  // A rook of star-iron crashes down out of the night.
  starfall: { travel: "rain", impact: "debris", aftermath: "smolder", palette: ["#cdd6ff", "#8b7bff", "#ffffff"], source: "sky", shake: true },
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
  // Iron jaws snap shut on the target square.
  bear_trap: { travel: "none", impact: "shock", aftermath: "none", palette: ["#8a94a8", "#c94a3a", "#3a3a40"], source: "lead" },
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
  // The cursed spud sizzles in someone's hands.
  hot_potato: { travel: "arc", impact: "embers", aftermath: "none", palette: ["#e8963a", "#8a6a3a", "#ffd166"], source: "caster" },
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
  reinforcements: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#7c8a4a", "#eef1f7", "#c9a84c"], source: "caster" },
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
  ww_flanking_knights: { travel: "none", impact: "sparkle", aftermath: "none", palette: ["#7c8a4a", "#8a94a8", "#eef1f7"], source: "center" },
  // Covering fire rakes the enemy knights' positions.
  ww_suppressive_fire: { travel: "rain", impact: "smoke", aftermath: "none", palette: ["#7c8a4a", "#8a94a8", "#3a3526"], source: "sky" },
  // The wyvern folds its wings and streaks down the line.
  wyverns_dive: { travel: "arc", impact: "shock", aftermath: "none", palette: ["#4a8f5f", "#d6234f", "#c9ffd8"], source: "mover" },
};

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

/**
 * Resolve the VFX spec for a card play.
 * - tier 1-3: a BASIC but present effect — travel "none", one small impact
 *   (sparkle/smoke/burst) in a palette derived from the card's gen family or
 *   category, aftermath "none", never a shake.
 * - Bespoke tier-4+ cards: their hand-tuned CARD_VFX entry.
 * - Generated tier-4+ cards: their family default (pass the GenFamily string),
 *   with shake promoted at tier >= 7 for heavy impacts.
 * - Anything else: a safe neutral default — never null at tier >= 1.
 */
export function resolveCardVfx(id: string, tier: number, genFamily?: string): CardVfx | null {
  if (tier < 4) {
    const fam = genFamily !== undefined ? GEN_FAMILY_VFX[genFamily] : undefined;
    const cat = CATEGORY_LOW_VFX[BUFF_BY_ID[id]?.category ?? ""];
    return {
      travel: "none",
      impact: fam ? SOFT_IMPACT[fam.impact] : (cat?.impact ?? "sparkle"),
      aftermath: "none",
      palette: fam?.palette ?? cat?.palette ?? DEFAULT_VFX.palette,
      source: "lead",
    };
  }
  const bespoke = CARD_VFX[id] ?? EXTRA_CARD_VFX[id];
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

export function runVfxSelfCheck(): void {
  if (process.env.NODE_ENV === "production") return;
  void Promise.all([import("./BoardEffects"), import("@/engine/buffs/library")])
    .then(([fx, lib]) => {
      const signatures = (fx as { SIGNATURES?: Record<string, unknown> }).SIGNATURES;
      const buffById = (lib as { BUFF_BY_ID?: Record<string, { tier?: number }> }).BUFF_BY_ID;
      if (!signatures || !buffById) return;
      const missing: string[] = [];
      for (const id of Object.keys(signatures)) {
        const tier = buffById[id]?.tier ?? 0;
        if (tier >= 4 && !CARD_VFX[id]) missing.push(`${id} (tier ${tier})`);
      }
      if (missing.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `[vfxSpecs] ${missing.length} tier>=4 bespoke card(s) missing a CARD_VFX entry:`,
          missing,
        );
      }
      const orphaned = Object.keys(CARD_VFX).filter((id) => !(id in signatures));
      if (orphaned.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(`[vfxSpecs] CARD_VFX entries with no SIGNATURES counterpart:`, orphaned);
      }
    })
    .catch(() => {
      /* self-check is best-effort; never break the app over it */
    });
}

if (process.env.NODE_ENV !== "production") {
  runVfxSelfCheck();
}
