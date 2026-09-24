# Slice TC-g (g01..g44 bespoke batches, per-card scenes)

Owner: TC-g agent. Ledger updates for the integrator to fold into `LEDGER.md`.
Owns `src/components/effects/g01HourglassPlays.*` through `g44*` and only their registration lines in `sigPlugins.tsx` (none needed so far: every revamp keeps its card id and PLAYS key).
Evidence: `docs/polish-pass/evidence/TC-g/before/<id>.png` and `after/<id>.png`, off check `after/<id>.off.png`, one sheet per batch (`<batch>.sheet.png`, `<batch>.similar.json`).
Strips: `scripts/polish/card-strip.ts` against the shared dev server, data-anim full, fx 1, 160px tiles; every `after/` run used `--off`.

## Worklist members named for this slice

None of the worklist cards named in the TC-g prompt live in g01..g44. They are in: `godPlays` (walnut_court, obsidian_bastions, sealed_ramparts, sacked_capital, blighted_furrows, draft_tyranny, checkmate_denial), `greatPlays` (court_in_exile, stone_prelates, ww_iron_bulwark, buff_siphon; all four already REVAMPED by TC-great), `boonPlays` (bw3_vantage_point, bw3_home_guard) and `cursePlays` (hw3_doomed_vow). Verdict here: NOT IN SLICE (owned by TC-god, TC-great and TC-boon-curse).

## Family finding (g01)

g01 was authored as "time being interfered with": every lead was a clock mechanism (pendulum, fuse, sundial, metronome, water clock) with the shared impact rig (a laser column, a split clock-dial glyph, a ground ring) on top. The cards it carries are almost all "suspend your nerf" cards whose rules name turn counts, ranks, pieces and drafts, so the leads could belong to any sibling (the before sheet `before/g01-t8.sheet.png` shows 11 clock dials and rings). Nine of the module's registry tier 8 entries are retired (src/engine/retired.ts: bn4_council_of_peace, bn4_great_armistice, bn4_royal_we, hx4_royal_lockdown, bn4_midas_charter, bn4_crown_jubilee, bn4_masked_ball, hx4_debt_of_crowns, hx4_last_toll) and are not worked here; the live tier 8 set is 11 cards and tier 7 is 8.

The rule scenes share a small, honest vocabulary for the one thing every nerf card does (an iron nerf cuff on the caster's side that springs open, and one tally tick per turn the rule counts, so 30 ticks read differently from 3) and put each card's own motif on top. The impact rig is removed from every revamped card.

## Per-card rows

| Card | Tier | Verdict | New motif (what the rule touches) | Before | After (off) | Commit |
|---|---|---|---|---|---|---|
| bn4_flag_on_their_wall | 8 | REVAMPED (was sundial) | The opponent's back rank is drawn as a battlement, a rook climbs the file to it, a flag is planted and flutters; the nerf cuff on the caster's own rank springs open, tied to the flag by a dotted cord (suspended only while the flag stands). | before/bn4_flag_on_their_wall.png | after/bn4_flag_on_their_wall.png (off pass) | batch 1 |
| bn4_queens_aegis | 8 | REVAMPED (was water clock) | The queen rises on her own square (d-file, side-aware) and raises a crowned round shield; the nerf cuff under it springs open, chained to her (it holds while she does). | before/bn4_queens_aegis.png | after/bn4_queens_aegis.png (off pass) | batch 1 |
| bn4_meek_inherit | 8 | REVAMPED (was escapement) | A balance over the halfway line: three meek pawns in the caster's pan, four of the opponent's men in the other; the beam tips to the heavier side and the cuff under the meek pan opens; one open pip first (it starts after their next move). | before/bn4_meek_inherit.png | after/bn4_meek_inherit.png (off pass) | batch 1 |
| bn4_unequal_treaty | 8 | REVAMPED (was two candles) | A treaty unrolled on the halfway line and sealed; both cuffs open, one at each edge; ten ticks on the caster's rank, three on the opponent's, and theirs dim out first. | before/bn4_unequal_treaty.png | after/bn4_unequal_treaty.png (off pass) | batch 1 |
| hx4_tithe_of_silence | 8 | REVAMPED (was muffled bell) | A tithe box beside the caster's king; one open pip (the free move) and six turn pips at the opponent's edge; two checks are loosed down the board at the king, each drops a coin in the box and strikes a turn token through on their side. | before/hx4_tithe_of_silence.png | after/hx4_tithe_of_silence.png (off pass) | batch 1 |
| bn4_hundred_year_lease | 8 | REVAMPED (was ice dial) | A lease deed is laid by the caster's rank and sealed; one open pip on the opponent's side is the move it waits for; a key turns in the nerf cuff and thirty ticks are ruled along the caster's second rank. | before/bn4_hundred_year_lease.png | after/bn4_hundred_year_lease.png (off pass) | batch 1 |
| bn4_liberators_march | 8 | REVAMPED (was free-running escapement) | The cuff opens and its chain links fall away; a pawn with a banner marches up the e-file and takes the bishop in its way; that capture drops a die into the first of three empty reroll slots; eighteen ticks. | before/bn4_liberators_march.png | after/bn4_liberators_march.png (off pass) | batch 1 |
| bn4_pact_of_the_dawn | 8 | REVAMPED (was forced dawn over a dial) | The sun rises over the caster's edge and three fallen pawns rise out of it onto the squares nearest home; the most advanced one gets a padlock (cannot move until the reply); cuff opens, twelve ticks. | before/bn4_pact_of_the_dawn.png | after/bn4_pact_of_the_dawn.png (off pass) | batch 1 |
| bn4_royal_privilege | 8 | REVAMPED (was alarm hammers) | The queen strides up her file over a royal carpet; as she lands the cuff opens and two turn ticks are struck; at the caster's edge the next two draft cards are crossed out (the price). | before/bn4_royal_privilege.png | after/bn4_royal_privilege.png (off pass) | batch 1 |
| bn4_siege_mentality | 8 | REVAMPED (was war drum) | A crenellated wall goes up round the caster's king; a check is loosed at him from the opponent's side and sticks in the wall; on the hit the cuff opens and three ticks are struck. | before/bn4_siege_mentality.png | after/bn4_siege_mentality.png (off pass) | batch 1 |
| bn4_year_of_jubilee | 8 | REVAMPED (was tear-off calendar) | A ram's horn is sounded from the caster's edge, the cuff opens, twenty-five ticks run along the rank like a calendar, and a die waits at the far end (the reroll that comes when the nerf returns). | before/bn4_year_of_jubilee.png | after/bn4_year_of_jubilee.png (off pass) | batch 1 |

## REQUESTS

1. Board.tsx (slice J): the lead cell's geometry is `neutralGeo(leadSq, orientation)` or `centreGeo()` (Board.tsx:5324), and both hard-code `side: 1`, so `--fx-side` on a LEAD is always +1 even when the caster sits at the top of the screen (the target geometry at Board.tsx:1184 already sets `side = casterSide(caster, orientation)`). Every side-aware lead (the TC-great per-card scenes, the TC-g rule scenes) therefore draws the caster's ranks at the bottom for the player who is not the caster. Fix: spread `{ ...geo, side: caster ? casterSide(caster, orientation) : 1 }` into the lead's `geoVars` the same way. Reproduce: `card-strip.ts --ids bn4_royal_privilege --side b --view w` (the queen walks up from the bottom rank while Black is at the top).

## Where I stopped

See the end of this file (updated per batch).
