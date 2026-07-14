// Plug-in signatures: extra card play-animations registered OUTSIDE
// BoardEffects.tsx, so several workstreams can add spectacle art in their own
// modules without touching the (very large) core file. Board resolves a card's
// signature as SIGNATURES[id] ?? PLUGIN_SIGNATURES[id] ?? generated, and
// SignatureOverlay's default case routes any `x:<key>` visual back to the
// merged registry (sigPluginsMerged.tsx).
//
// Contract for a plugin module (see godPlays.tsx / funnyPlays.tsx):
//   export const PLAYS: Record<string, SigPlugin> = {
//     card_id: {
//       config: { ordering, staggerMs, victims, hasLead, sound, source? },
//       Render: ({ lead, delayMs }) => <YourBurst .../>,
//     },
//   };
// Rules:
//   - Key by CARD id. A key already present in SIGNATURES is ignored (the
//     bespoke core entry wins) — do not shadow core entries; edit them there.
//   - `sound` must be an EXISTING SigSoundKey (Board's playSignature switch);
//     pick the closest voice, no new sound plumbing from plugins.
//   - Render must be fully self-contained (own SVG + its own CSS file):
//     transform/opacity animations only, reduced-motion gated by the caller's
//     layer, no imports from BoardEffects.tsx (cycle hazard).
//
// CODE SPLIT: this module is the EAGER facade only — it must stay tiny and
// must NOT import the plugin modules (their ~9k lines of render art ride in
// the lazy signature-visuals chunk; see sigPluginsMerged.tsx / sigVisuals.tsx
// and the prefetchSignatureVisuals note in BoardEffects.tsx). Plugin modules
// import only the SigPlugin TYPE from here, which is erased at compile time.

import type { ComponentType } from "react";
import type { SignatureConfig } from "./BoardEffects";

export interface SigPlugin {
  config: Omit<SignatureConfig, "visual">;
  Render: ComponentType<{ lead: boolean; delayMs: number }>;
}

/** Full SignatureConfig per plugin card id, visual keyed back to the merged
 * registry (`x:<card_id>`). Starts EMPTY and is populated (in place) the
 * moment sigPluginsMerged.tsx evaluates inside the lazy signature-visuals
 * chunk — Board prefetches that chunk on mount, so the registry is complete
 * long before a card can be played. Until then Board's resolveSignature
 * simply finds no bespoke entry and falls back to the deterministic generated
 * signature, which needs no chunk at all. Reads happen at card-fire time
 * (never cached across the fill), so late population is always picked up. */
export const PLUGIN_SIGNATURES: Record<string, SignatureConfig> = {};

/**
 * Every card id covered by a plugin module, known EAGERLY (the modules
 * themselves ride in the lazy signature-visuals chunk). Before that chunk
 * evaluates, PLUGIN_SIGNATURES is still empty; without this list the resolver
 * would fall back to the GENERATED signature for a plugin-covered card and
 * play the wrong art ("default effects blocking the customized ones").
 * Board treats these ids as "pending bespoke" pre-load: no art rather than
 * wrong art. Static on purpose so it costs zero bytes of render code (the
 * modules ride the lazy chunk).
 *
 * SINGLE SOURCE OF TRUTH: this array is MACHINE-GENERATED from each plugin
 * module's `PLAYS` keys by scripts/check-sig-plugins.cjs. Do NOT edit the
 * generated block by hand — regenerate it with:
 *     node scripts/check-sig-plugins.cjs --write
 * The same script runs in `test:rules` and FAILS the build the moment this
 * list drifts from the real merged keys (an id missing here plays the wrong
 * generated art over the hand-made one; a stale id renders no art at all), so
 * drift can never ship. This replaces the old dev-only console.warn, which was
 * stripped from production and so shipped silently.
 */
// <plugin-ids:generated>
export const PLUGIN_IDS: readonly string[] = [
  // basicPlays.tsx (304)
  "cornerstone", "firm_footing", "guarded_king", "holy_hell", "loose_pawn", "pawn_shield",
  "steady_hand", "bulwark", "fork_guard", "reinforce", "screen", "shielded_advance",
  "sidestep_king", "chain_mail", "deflect", "fortress", "iron_bishop", "phalanx",
  "wa_sigil_ward", "duelist", "hold_the_bridge", "iron_wall", "shieldmaiden", "warding_circle",
  "watermelon_rind", "ww_high_ground", "butterfingers", "cold_feet", "crossed_wires", "foggy_glasses",
  "royal_restraint", "stage_fright", "blunted_lance", "lame_horses", "rusted_hinges", "safe_passage",
  "timid_king", "sown_salt", "wc_backseat_driver", "atomic_captures_small", "hex_doll", "wc_butterfingers",
  "we_backdraft", "cold_open", "heavy_boots", "knock_knees", "molasses", "slippery_grip",
  "stiff_joints", "anchor", "butter_bishops", "leaden_queen", "seized_axles", "short_leash",
  "trench_line", "anchored_rooks", "blinkered_bishops", "leaden_crown", "magnet", "pawn_nerf",
  "pin_breaker", "spooked_steeds", "we_static_field", "abandoned_post", "blockade", "frozen_furrows",
  "heavy_shackles", "wc_quicksand_patch", "cold_snap", "hard_reset", "pinned_down", "we_frost_nip",
  "frost", "frostbite", "snap_freeze", "twist_the_knife", "wa_stasis_field", "wall",
  "wc_clumsy_dash", "wc_slip_on_ice", "wc_stage_fright", "cascade_freeze", "cryostasis", "hard_frost",
  "immobilizer", "wa_bind_the_queen", "ww_counter_charge", "gargoyles", "stone_hooves", "gorgons_glance",
  "hobbled_cavalry", "petrified_towers", "granite_towers", "ironbound_rook", "statue_stable", "stone_clergy",
  "ferz_king", "half_step", "loyal_pawn", "quiet_march", "rook_slide", "sentinel_pawn",
  "sidestep", "tempo_shuffle", "ghost_pawn", "pawn_push", "phase_rook", "reposition",
  "wazir_rook", "we_thunder_step", "grasshopper", "promote_now", "queens_echo", "rank_runner",
  "vanguard", "wa_transmute", "we_ball_lightning", "we_riverflow", "ww_phalanx_advance", "changeling",
  "kingslide", "royal_decree", "wa_arcane_conduit", "bishop_polish", "diagonal_step", "little_leap",
  "nudge", "camel_knight", "long_knight", "mind_nudge", "rally", "spring_pawn",
  "teleport_knight", "vault", "wazir_bishop", "wc_kangaroo_hop", "we_updraft", "bishop_archbishop",
  "board_quake", "cannon", "dragon_pawn", "hunter_knight", "knight_nightrook", "overclock",
  "rook_chancellor", "sliding_king", "tidal_push", "trampoline", "wa_ghostwalk_bishop", "ww_flank_march",
  "ww_forced_retreat", "ww_pontoon_bridge", "ww_war_wagon", "firecracker", "giant_slayer", "overrun",
  "twin_knights", "wa_camel_rider", "steady_march", "counterstep", "double_step_army", "pawn_storm",
  "ww_pikemen", "berolina_pawns", "momentum", "split_march", "wc_moonwalk", "army_reversal",
  "solstice", "wc_chaos_reigns", "ww_field_fortification", "cut_purse", "sealed_orders", "royal_duty",
  "wa_suppress_magic", "wc_red_tape", "burned_dispatches", "chain_nullify", "dead_letter", "mirror",
  "patch_notes", "suppress", "wa_disrupt_ritual", "wa_jinx", "prep", "trade_up",
  "buff_thief_minor", "heros_journey", "recast", "wa_disjunction", "extra_glance", "peek",
  "quick_glance", "scout", "watchtower", "draft_insight", "oracles_eye", "third_eye",
  "north_star", "wa_foresight", "wa_mind_read", "wa_omniscience", "castle_early", "drawbridge",
  "toll_gate", "long_castle_anywhere", "no_mans_land", "wc_shy_pieces", "board_lock", "bunker",
  "no_trespass", "flypaper_file", "sealed_gate", "second_wind", "minor_recall", "we_regrow",
  "ww_field_hospital", "ww_reclaim_the_fallen", "seance", "second_wind_major", "will_o_wisp", "ww_last_reserves",
  "resurrect", "resurrect_major", "wc_lost_and_found", "ww_recommission", "walnut_shell", "apple",
  "banana_peel", "coconut_bonk", "kings_guard", "bodyguard", "split_bishop", "ww_sapper_team",
  "coffee", "comet_shard", "wa_conjure_bishop", "ww_shieldbearers", "free_retreat", "rewind_one",
  "wasted_hour", "lost_weekend", "wa_borrowed_minute", "deep_breath", "reprieve", "small_mercies",
  "defiance", "held_breath", "hunters_relief", "loosen_the_leash", "slack_chain", "break_the_nerf",
  "grace_period", "half_measure", "piece_parole", "timely_lull", "underdogs_grit", "adrenaline",
  "counter_nerf", "respite", "durian", "pixie_dust", "seelie_blessing", "we_bramble_wall",
  "we_creeping_roots", "we_seedlings", "faerie_ring", "pucks_mischief", "we_ancient_grove", "escape_hatch",
  "piece_swap", "recall", "ww_regroup_lines", "guard_rotation", "wa_blink", "warp_home",
  "warp_step", "blink_army", "grand_recall", "mass_recall", "regroup", "total_recall",
  "wa_swap_flanks", "warp_field", "warp_reign", "warp_rook", "we_riptide", "we_undertow",
  "decoy", "regenerate", "summon_knight", "wa_conjure_scout", "ww_outriders", "mass_resurrect",
  "phantom_rook", "ww_forward_observer", "ww_reserve_cavalry", "shadow_step", "glamour", "piece_steal",
  "wa_dominate_minor", "wc_body_double", "ww_defectors", "ww_mass_defection",
  // godPlays.tsx (68)
  "draft_tyranny", "sovereign_draft", "draft_supremacy", "divine_legion", "absolute_aegis", "checkmate_denial",
  "full_pardon", "transcendence", "mind_empire", "mass_mind_control", "throne_and_silence", "abdication_edict",
  "wa_dominate_major", "great_divide", "sundering", "fortress_realm", "molten_heart", "salted_earth",
  "unshackled_wrath", "phoenix_line", "chain_atomic", "total_atomic", "scorched_earth", "rift_storm",
  "queen_storm", "buff_plunder", "total_plunder", "grand_nullify", "absolute_nullify", "endless_night",
  "peace_of_the_grave", "withered_hands", "grand_malediction", "blighted_furrows", "culling", "poisoned_counsel",
  "age_of_heroes", "grand_retreat", "noble_rout", "sacked_capital", "genesis", "reality_warp",
  "total_warp", "warp_cataclysm", "warp_sovereign", "nerf_reversal", "celestial_alignment", "grand_conjunction",
  "glacial_tomb", "frozen_solid", "absolute_zero", "everfrost_shard", "ban_hammer", "dragonslayer",
  "world_lock", "sealed_archive", "sealed_ramparts", "leaden_limbs", "walnut_court", "obsidian_bastions",
  "statue_garden", "cockatrice_gaze", "chisel_curse", "crown_and_castle", "full_rewind", "endless_turn",
  "lost_fortnight", "sabbatical",
  // greatPlays.tsx (115)
  "ball_and_chain", "royal_summons", "palsied_hands", "throne_bound", "lone_sovereign", "peasant_levy",
  "court_in_exile", "cast_a_nerf", "royal_handicap", "queens_handicap", "grounded_command", "lunar_eclipse",
  "hexed_satchel", "iron_furrow", "leaden_fields", "wc_voodoo_doll", "wc_sticky_floor", "threads_of_fate",
  "mind_control", "mind_dominion", "medusas_verdict", "granite_ramparts", "stone_menagerie", "stone_curse",
  "stone_riders", "stone_prelates", "stone_bastions", "queen_of_stone", "eternal_statue", "nerf_hammer",
  "the_big_chill", "frozen_moment", "creeping_frost", "glacial_flanks", "total_whiteout", "we_frostbite_curse",
  "total_freeze", "atomic_captures", "atomic_reaction", "detonation_field", "ww_demolition_charge", "wc_confetti_cannon",
  "we_firestorm", "giants_maul", "scorched_middle", "checkmate_immunity", "iron_reign", "ironclad",
  "ww_iron_bulwark", "ww_praetorian_guard", "round_table", "ww_bridgehead", "sealed_avenues", "dryad_grove",
  "we_overgrowth", "we_rooted", "we_quagmire", "thorn_hedge", "gossamer_veil", "starlight_ward",
  "spirit_guide", "phase_army", "ghost_legion", "valkyrie", "extra_move_repeat", "time_stop_short",
  "time_rewind", "lost_days", "wa_stolen_hours", "sever", "draft_domination", "total_nullify",
  "favorable_stars", "the_tower", "death_arcana", "chess_diff", "wa_greed", "riddle_game",
  "rehab", "parole", "long_leash", "wardens_bribe", "iron_will", "wc_wrong_way",
  "wc_broken_elevator", "unseelie_bargain", "buff_thief", "buff_siphon", "wa_spelltheft", "draft_seize",
  "collapse", "void", "wa_sabotage", "empty_handed", "double_queen", "twin_queens",
  "promotion_storm", "mass_promote_minor", "resurrect_queen", "legendary_forge", "royal_ascension", "second_king",
  "wa_leaden_crown", "overclock_major", "ascendant_knight", "nerf_breaker", "fey_step", "rift_walker",
  "mirror_of_souls", "wa_conjure_rook", "wa_twin_familiars", "ley_line", "wild_hunt", "dragon_mount",
  "sahur",
  // funnyPlays.tsx (16)
  "emotional_support_pawn", "stream_sniper", "lag_spike", "ctrl_z", "rubber_chicken", "day_one_patch",
  "battle_pass", "pop_up_ad", "mute_button", "skill_issue", "alt_f4", "touch_grass",
  "main_character", "smurf_account", "pay_to_win", "expansion_permit",
  // personalPlays.tsx (20)
  "muscle_up", "bench_225", "handstand_pushup", "full_planche", "fingertip_maltese", "onearmmuscleupismydream",
  "monkeytype", "rubiks_cube", "ilovewhimperingaudios", "ilovemakingout", "ilovechaewon", "hyein",
  "minji", "hanni", "danielle", "haerin", "i_love_cam", "daniel_caesar",
  "middle_part", "forearm_veins",
  // memePlays.tsx (9)
  "cappuccino_assassino", "ballerina_cappuccina", "la_vaca_saturno_saturnita", "frigo_camelo", "trippi_troppi", "chill_guy",
  "moai_head", "skibidi_flush", "tung_tung_sahur",
];
// </plugin-ids:generated>

export const PLUGIN_ID_SET: ReadonlySet<string> = new Set(PLUGIN_IDS);
