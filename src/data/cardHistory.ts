// Editorial history for the codex card pages: when each card entered the
// game, plus curated per-card balance notes. Server-safe pure data (no React,
// no client APIs) so the card routes render it statically as crawlable HTML.
//
// Two layers:
// - WAVES: one "added" event per shipping wave, dated from the git history of
//   the card barrels and the PR numbers in docs/CHANGELOG.md. Every card maps
//   to a wave via resolveWave, so every page has at least one history line.
// - CARD_HISTORY: hand-curated per-card events (tier moves, reworks) keyed
//   "buff:<id>" / "nerf:<id>". Starts sparse; grows as balance changes ship.
//
// Runtime moderator changes (card_overrides edits) are NOT here: those are
// recorded in the card_override_history table and merged in client-side by
// the CardInsights panel.

import { BALANCE_WAVE_2026_07_22 } from "./balanceWave1";
import { isBoon, type Buff } from "@/engine/buff";
import type { Nerf } from "@/engine/nerf";
import { buffCollection } from "@/lib/cardCollections";
import { EXPANDED_NERFS } from "@/engine/nerfs/expanded";
import { WILD_NERFS } from "@/engine/nerfs/wild";

export interface CardHistoryEvent {
  /** ISO date, ET calendar day (matching docs/CHANGELOG.md). */
  date: string;
  kind: "added" | "retier" | "rework" | "reword" | "disabled" | "enabled";
  /** One human sentence, rendered verbatim on the card page. */
  note: string;
  pr?: number;
}

// --- Waves --------------------------------------------------------------------

type WaveId =
  | "nerf-core"
  | "nerf-expanded"
  | "nerf-wild"
  | "buff-core"
  | "hex"
  | "boon"
  | "fantasy"
  | "funny"
  | "wild"
  | "mystic"
  | "apex";

const WAVES: Record<WaveId, CardHistoryEvent> = {
  "nerf-core": {
    date: "2026-05-14",
    kind: "added",
    note: "Part of the original nerf library Nerf Chess launched with.",
  },
  "nerf-expanded": {
    date: "2026-07-05",
    kind: "added",
    note: "Added in the expanded-nerfs wave: 82 new handicaps across all eight tiers.",
    pr: 144,
  },
  "nerf-wild": {
    date: "2026-07-07",
    kind: "added",
    note: "Added with the Wild expansion nerfs.",
  },
  "buff-core": {
    date: "2026-07-04",
    kind: "added",
    note: "Part of the original buff library that shipped with Buff mode and the draft system.",
  },
  hex: {
    date: "2026-07-05",
    kind: "added",
    note: "Added in the opponent-hex wave: the first curses you cast on the other player.",
    pr: 140,
  },
  boon: {
    date: "2026-07-05",
    kind: "added",
    note: "Added in the nerf-relief boon wave, growing the relief pool from 25 to 52 cards.",
    pr: 142,
  },
  fantasy: {
    date: "2026-07-06",
    kind: "added",
    note: "Added with the Fantasy collection.",
  },
  funny: {
    date: "2026-07-06",
    kind: "added",
    note: "Added with the Funny / meta collection.",
  },
  wild: {
    date: "2026-07-07",
    kind: "added",
    note: "Added with the Wild collection: elemental, warfare, arcane, and chaos cards.",
  },
  mystic: {
    date: "2026-07-10",
    kind: "added",
    note: "Added with the Mystic collection: prophecy, star signs, tarot, and spirit cards.",
  },
  apex: {
    date: "2026-07-07",
    kind: "added",
    note: "Added with the apex and mythic bands: cards never drafted normally, won only through a gamble or a top-tier bank.",
  },
};

const EXPANDED_NERF_IDS = new Set(EXPANDED_NERFS.map((n) => n.id));
const WILD_NERF_IDS = new Set(WILD_NERFS.map((n) => n.id));

function buffWave(b: Buff): WaveId {
  // Tier 9-10 cards shipped as their own band regardless of theme.
  if (b.tier >= 9) return "apex";
  const collection = buffCollection(b);
  if (collection === "Fantasy") return "fantasy";
  if (collection === "Mystic") return "mystic";
  if (collection === "Wild") return "wild";
  if (collection === "Funny") return "funny";
  if (b.category === "hex") return "hex";
  if (isBoon(b)) return "boon";
  return "buff-core";
}

function nerfWave(n: Nerf): WaveId {
  if (WILD_NERF_IDS.has(n.id)) return "nerf-wild";
  if (EXPANDED_NERF_IDS.has(n.id)) return "nerf-expanded";
  return "nerf-core";
}

// --- Curated per-card events ---------------------------------------------------

/** Hand-written balance notes, key "buff:<id>" | "nerf:<id>". Append here when
 * a card is retiered, reworked, or reworded in code, with the changelog date
 * and PR. Keep each note one sentence; the page renders them as a timeline. */
export const CARD_HISTORY: Record<string, CardHistoryEvent[]> = {
  // --- 2026-09-05 full balance pass, structural batch: dominance ladders,
  // twins priced apart, permanent upgrades under the temporary anchors, and
  // one-shot defensive cards with no rider. Win-rate sizing follows.
  "buff:bishop_archbishop": [
    { date: "2026-09-05", kind: "retier", note: "Moved from Tier 2 to Tier 4: a permanent, unconditional extra piece-class was priced under a one-step add (Wazir Bishop, Tier 3); its retired twin Rook to Chancellor was hand-priced at 4." },
  ],
  "buff:knight_nightrook": [
    { date: "2026-09-05", kind: "retier", note: "Moved from Tier 2 to Tier 3: a permanent rook slide on one knight; Twin Knights (both knights) sits at 4." },
  ],
  "buff:camel_knight": [
    { date: "2026-09-05", kind: "retier", note: "Moved from Tier 2 to Tier 3: a permanent extra leap is priced like the other permanent one-step adds." },
  ],
  "buff:dragon_pawn": [
    { date: "2026-09-05", kind: "retier", note: "Moved from Tier 2 to Tier 3: a knight that can still promote outclasses the conditional Vanguard promotion at 2." },
  ],
  "buff:cannon": [
    { date: "2026-09-05", kind: "retier", note: "Moved from Tier 2 to Tier 3: permanent capture-by-screen on a rook is a permanent upgrade, priced with the others." },
  ],
  "buff:phase_rook": [
    { date: "2026-09-05", kind: "retier", note: "Moved from Tier 2 to Tier 3: permanent phasing is a permanent upgrade, priced with the others." },
  ],
  "buff:god_knight": [
    { date: "2026-09-05", kind: "retier", note: "Moved from Tier 4 to Tier 7: a permanent amazon sat below the two-turn amazons (Amazon Knight, Tier 6)." },
  ],
  "buff:dragon_mount": [
    { date: "2026-09-05", kind: "retier", note: "Moved from Tier 6 to Tier 4: a knight with a permanent diagonal slide is an archbishop built from the other side, so it matches Bishop to Archbishop." },
  ],
  "buff:wc_black_hole": [
    { date: "2026-09-05", kind: "retier", note: "Moved from Tier 2 to Tier 3, level with Void Rift, the same permanent trap square." },
  ],
  "buff:bn4_shepherds_watch": [
    { date: "2026-09-05", kind: "retier", note: "Moved from Tier 6 to Tier 5: Oathstone (Tier 4) is the same pawn immunity for one turn less." },
  ],
  "buff:hx4_lantern_out": [
    { date: "2026-09-05", kind: "retier", note: "Moved from Tier 6 to Tier 5: a two-turn capture ban in their own half, next to Withered Hands (three turns, whole board) at 7." },
  ],
  "buff:hx4_prowlers_bell": [
    { date: "2026-09-05", kind: "retier", note: "Moved from Tier 4 to Tier 6: three turns of no landing anywhere in your half strictly contains King's Moat (Tier 7)." },
  ],
  "buff:second_army": [
    { date: "2026-09-05", kind: "retier", note: "Moved from Tier 5 to Tier 4: two pocket pawns beside Bodyguard (a pocket knight) at 4 and Spare Button (one pawn) at 2." },
  ],
  "buff:ov_pet_rock": [
    { date: "2026-09-05", kind: "retier", note: "Moved from Tier 2 to Tier 1: one pawn safe for one turn, where Pawn Shield gives four turns at 2." },
  ],
  "buff:bn4_night_watch": [
    { date: "2026-09-05", kind: "retier", note: "Moved from Tier 2 to Tier 1: one turn of king cover, where Decoy gives three turns plus a piece at 2." },
  ],
  "buff:ov_sandbags": [
    { date: "2026-09-05", kind: "retier", note: "Moved from Tier 3 to Tier 2: two pawns for one turn, level with Pawn Shield." },
  ],
  "buff:warp_home": [
    { date: "2026-09-05", kind: "rework", note: "The warp no longer spends your turn. Recall at the same tier already reaches any back-two-ranks square, so the precise return-to-post needed the timing to be worth a pick. The example sentence is gone." },
  ],
  "buff:hard_reset": [
    { date: "2026-09-05", kind: "rework", note: "When the pawn's home square is taken the card used to do nothing; it now freezes that pawn for a turn instead." },
  ],
  "buff:fm_boon_lifebloom": [
    { date: "2026-09-05", kind: "rework", note: "The pawn returns to your fourth rank and cannot be captured for the opponent's next two turns. It read identically to Field Stitches (Tier 2) and weaker than Florist's Trick (Tier 4)." },
  ],
  // --- 2026-08-04 weak-card buff pass: ~30 underpowered buffs, boons and
  // items lifted to their tier, one card at a time. No retiers, no nerfs.
  "buff:extra_glance": [
    { date: "2026-08-04", kind: "rework", note: "The glance now also grants a draft reroll; the reveal alone was the weakest card in tier 1." },
  ],
  "buff:ferz_king": [
    { date: "2026-08-04", kind: "rework", note: "The diagonal king hop can now be used twice per game instead of once." },
  ],
  "buff:half_step": [
    { date: "2026-08-04", kind: "rework", note: "Two uses instead of one, matching the rest of the tier-1 movement pairs." },
  ],
  "buff:vault": [
    { date: "2026-08-04", kind: "rework", note: "The rook now vaults its pawn twice instead of once." },
  ],
  "buff:nudge": [
    { date: "2026-08-04", kind: "rework", note: "The reroll surcharge is gone; a one-square pawn push is small enough to be free." },
  ],
  "buff:quick_glance": [
    { date: "2026-08-04", kind: "rework", note: "When the opponent has no reroll to lose you now gain one instead, so the card can no longer do nothing." },
  ],
  "buff:cornerstone": [
    { date: "2026-08-04", kind: "rework", note: "The ward now covers rooks anywhere on your back rank, not just the two starting corners." },
  ],
  "buff:castle_early": [
    { date: "2026-08-04", kind: "rework", note: "The text now admits the card always restored rook rights too, and the castle it re-opens lands with one turn of king cover." },
  ],
  "buff:spring_pawn": [
    { date: "2026-08-04", kind: "rework", note: "Two sideways springs instead of one; a single hop was worse than Tempo Shuffle a tier below." },
  ],
  "buff:vanguard": [
    { date: "2026-08-04", kind: "rework", note: "Knighting now works from the 5th rank, where a pawn can actually stand when a tier-2 draft lands." },
  ],
  "buff:sidestep_king": [
    { date: "2026-08-04", kind: "rework", note: "King safety extended from one turn to three; one turn at tier 3 lost to Decoy at tier 2." },
  ],
  "buff:screen": [
    { date: "2026-08-04", kind: "rework", note: "The adjacency ward now lasts six of your turns instead of three, paying for its condition." },
  ],
  "buff:shielded_advance": [
    { date: "2026-08-04", kind: "rework", note: "The enemy-half escort now lasts six of your turns instead of three." },
  ],
  "buff:trade_up": [
    { date: "2026-08-04", kind: "rework", note: "The consolation pawn now arrives for each of your next two lost minor pieces, not just the first." },
  ],
  "buff:pin_breaker": [
    { date: "2026-08-04", kind: "rework", note: "The escaping piece now lands warded for two turns; breaking free into a capture was no escape." },
  ],
  "buff:iron_bishop": [
    { date: "2026-08-04", kind: "rework", note: "The iron now turns knights as well as pawns; pawn-proofing alone was tier-1 sized at tier 4." },
  ],
  "buff:walnut_shell": [
    { date: "2026-08-04", kind: "rework", note: "With nothing frozen the shell can now be eaten for a draft reroll, so it is never a dead card." },
  ],
  "buff:firecracker": [
    { date: "2026-08-04", kind: "rework", note: "The startled piece now also loses its next move; a plain one-square shove was Nudge at four times the price." },
  ],
  "buff:bn4_hairline_crack": [
    { date: "2026-08-04", kind: "rework", note: "No longer strips your own shields; the survey now braces the lit piece nearest your king for a turn instead." },
  ],
  "buff:bn4_field_glasses": [
    { date: "2026-08-04", kind: "rework", note: "Spotted pieces now hold their fire for one turn; the flash alone told a decent player nothing new." },
  ],
  "buff:bn4_scouts_report": [
    { date: "2026-08-04", kind: "rework", note: "Your threatened pieces now dig in for one turn on top of the reveal." },
  ],
  "buff:bn4_war_room_map": [
    { date: "2026-08-04", kind: "rework", note: "The map now comes with 2 draft rerolls; a bare flash was priced against Punch Card in the same band." },
  ],
  "buff:bn4_danger_sense": [
    { date: "2026-08-04", kind: "rework", note: "The warning now covers the king and queen for one turn instead of only pointing at the danger." },
  ],
  "buff:bn4_listening_post": [
    { date: "2026-08-04", kind: "rework", note: "A dead wire now pays 1 draft reroll; against a blocked draft the card used to resolve to nothing." },
  ],
  "buff:bn4_lucky_coin": [
    { date: "2026-08-04", kind: "rework", note: "The coin no longer repossesses an unspent reroll; instead, spending one within two drafts flips it back into your hand." },
  ],
  "buff:bn4_augurs_flight": [
    { date: "2026-08-04", kind: "rework", note: "The birds now shelter every piece they circle for one turn instead of only naming them." },
  ],
  "buff:bn4_border_survey": [
    { date: "2026-08-04", kind: "rework", note: "The surveyed squares are now staked against enemy entry for one turn on top of the reveal." },
  ],
  "buff:bn4_lighthouse_beam": [
    { date: "2026-08-04", kind: "rework", note: "The glare now freezes the enemy piece deepest into your half for one turn; a tier-5 card should touch the board." },
  ],
  "buff:bn4_auditors_ledger": [
    { date: "2026-08-04", kind: "rework", note: "The audit now shields your undefended pieces for a turn and pays a reroll, pricing it beside Raven's Court." },
  ],
};

// --- Lookup ---------------------------------------------------------------------

/** The full editorial timeline for a card: its wave-introduction event plus
 * any generated balance-wave events and curated events, oldest first. Never
 * empty. */
export function historyFor(kind: "buff" | "nerf", card: Buff | Nerf): CardHistoryEvent[] {
  const wave = kind === "buff" ? buffWave(card as Buff) : nerfWave(card as Nerf);
  const key = `${kind}:${card.id}`;
  const balance = BALANCE_WAVE_2026_07_22[key] ?? [];
  const curated = CARD_HISTORY[key] ?? [];
  return [WAVES[wave], ...balance, ...curated].sort((a, b) => a.date.localeCompare(b.date));
}
