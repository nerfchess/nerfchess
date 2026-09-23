# Slice TC-boon-curse (boonPlays and cursePlays: F226, per-card rule scenes)

Owner: TC-boon-curse agent. Ledger updates for the integrator to fold into `LEDGER.md`.
Owns `src/components/effects/boonPlays.tsx`, `boonPlays.css`, `cursePlays.tsx`, `cursePlays.css`.
Evidence: `docs/polish-pass/evidence/TC-boon-curse/` (`before/<id>.png`, `after/<id>.png`, `after/<id>.off.png`, each with its stage JSON). Strips: `scripts/polish/card-strip.ts` against :3000, data-anim full, fx 1, 8 tiles at 160px; after runs used `--off`. Before strips for pretender, death_knell, covenant_of_return, the_homecoming, hollow_crown and crown_of_thorns were taken with the two modules temporarily set back to HEAD (then restored).

## ROW UPDATES

| Row | Status | Evidence | Commit | Note |
|---|---|---|---|---|
| F226 | DONE | `before/` and `after/` strips for bw3_vantage_point, bw3_home_guard, hw3_doomed_vow | 033574b | The three tier 7 cards leave their templates (DawnHalo "vantage", PactScroll "homeward", OmenBell "doomedvow") for their own scenes registered with `S`; the dead flourish blocks and impact cues are removed. Both module headers now say what is true: every tier 7 and above card is a bespoke scene. |
| Tier C family 6 (boonPlays / cursePlays) | PARTIAL | this file | 033574b | 10 cards reworked (9 new scenes and one count fix, table below); every tier 8 and 9 card in both modules reviewed from strips. Where I stopped is below. |

## Per-card rows

Strips: `evidence/TC-boon-curse/before/<id>.png` and `evidence/TC-boon-curse/after/<id>.png`; off check `after/<id>.off.png` (pass: off reaches its end state at once and the resting board matches the full run).

| Card | Tier | Verdict | New motif (what the rule touches) | Off check | Commit |
|---|---|---|---|---|---|
| bw3_vantage_point | 7 | REVAMPED (was DawnHalo "vantage" flourish) | The opponent's back two ranks are staked out as the heights with a ridge along their foot and a flag planted on it; a rook and a knight climb onto them and are warded; an enemy blade drives at the rook from their back rank and glances off; a king on the heights stays struck out (your king aside); a bishop steps back down off the heights and its ward breaks. | pass | 033574b |
| bw3_home_guard | 7 | REVAMPED (was PactScroll "homeward" flourish) | The caster's first rank is marked out and a palisade stands up along its edge with a rail across all eight files; an enemy pawn walking in to promote is turned back at the fence and the crown it came for is struck out; a knight's leap onto the rank is thrown back; a lock seals the end of the rank and an infinity mark says it is permanent. | pass | 033574b |
| hw3_doomed_vow | 7 | REVAMPED (was OmenBell "doomedvow" flourish; the bell belongs to Death Knell) | On the cast square: the eight surrounding squares are dashed out (the only way the vow breaks), the vow's cord cinches round the piece, four candles light on the board-centre side (four of their turns), their king walks in and bows on a square beside it, and the cord snaps. | pass | 033574b |
| bw3_drive_them_out | 8 | REVAMPED (was a vertical river line, a laser on a knight, rings and an edge glow, which misdrew the rule) | The caster's half is marked and the border between the halves drawn across the board; two invaders in the caster's half are thrown back over it and gone; the caster's own rook and pawn over the border are struck off with them; both kings stay where they are, each in a ward. | pass | 033574b |
| bw3_the_reckoning | 8 | REVAMPED (was a centred beam, six floating minors and rings) | Both back ranks are called to account; a ledger line runs through each rank's minor squares; every knight and bishop on both ranks breaks apart at once; the rooks, queens and kings rise untouched; a paid seal closes the account at the centre. | pass | 033574b |
| hw3_curse_engine | 9 | REVAMPED (was two floating gears, a laser column and a gilded queen) | Their half shudders; the engine's gears turn at the board edge on the border; a track of a zero mark and nine notches (their nine turns, 3, 6 and 9 heavy) runs along the border; the pawl clicks one, two, three notches; on the third the frost clamp shuts on their strongest piece with two pips (two turns) while their king beside it stays clear; the pawl snaps back to zero (the count resets). The marks sit on their third rank, clear of the cast banner. | pass | 033574b |
| bw3_pretender | 7 | REVAMPED (was a pillar of light crowning a queen on the board, which is not what the card does) | Two curtains part (the wings), a queen steps out and the crown comes down on her, then she goes into the pocket, not onto the board; a dotted drop line to an empty square with an hourglass (dropped on a later turn); two draft cards struck out (the two skipped drafts). | pass | 033574b |
| bw3_covenant_of_return | 7 | REVAMPED (was a loop sigil with three pieces arcing across the centre) | The covenant's loop is sworn on the caster's side with three charges (the next three pieces to fall); a caster's rook out on the field is taken and is at once carried back four ranks to its home rank, where the empty square is marked; the first charge is spent. | pass | 033574b |
| hw2_death_knell | 8 | FIXED (bell kept: it is this card's own motif) | The scene counted four tolls and an IV numeral, and the card's glyph read IV; the card is three turns. Now three toll rings, a III numeral, a III glyph, and the strike on the third toll. | pass | 033574b |
| bw2_great_return | 8 | NO-CHANGE (reviewed from `before/`) | Its own scene: light pillars on the home ranks and pieces of both sides returning to them. Close enough to the rule; the rooted piece is not shown. | - | - |
| bw2_long_truce | 8 | NO-CHANGE (reviewed) | Its own scene: truce heralds with flags crossing the field and dashed domes over both sides (no captures on either side). | - | - |
| bw2_shadow_reserve | 8 | NO-CHANGE (reviewed) | Its own scene: a coat opens on a knight, bishop and rook going into the pocket, and struck draft cards (the skipped drafts). | - | - |
| hw3_blood_tithe | 8 | NO-CHANGE (reviewed) | Its own scene: the tithe ledger opens and one of their pawns is claimed. | - | - |
| hw3_martyrs_crown | 8 | NO-CHANGE (reviewed) | Its own scene: the king in a briar, two check marks (the first passes, the second triggers) and two attackers frozen. Uses a wash and a ring as accents only. | - | - |
| hw2_crown_of_thorns | 7 | NO-CHANGE (reviewed) | Its own scene: thorns grow round the king and an attacker that gives check is rooted where it stands. | - | - |
| hw2_hollow_crown | 7 | TODO | A throne rises and a crown hollows; the rule (after any king move, only pawns or the king may move next turn) is not drawn. Next in line. | - | - |
| bw3_the_homecoming | 7 | TODO | A tent banner and two pieces marching; the rule's price (the two skipped drafts) is not shown and the return is not to the home rank. | - | - |

## How the new scenes work

Rule scenes sit in a "Rule scenes" block above the card devices in each module. Board-anchored ones draw inside `<BoardFrame>` with module-local `rankTop` / `bandTop` / `manBox` / `cellBox` / `onRankLine` (ranks counted from the caster through `--fx-side`, so either player sees the right ranks), and art that points away from the caster is mirrored by a static `scale: 1 var(--fx-side)` wrapper, never on an animated node. Cast-anchored ones (Doomed Vow, Pretender) place cells on the 14-cell stage. Every beat offset goes through `dm(delayMs, off)`, which scales the offset by `--fx-dur` like the tracks themselves. New keyframes: `bwp-rebuff` (a piece or blade pushed toward the caster's edge and thrown back), `bwp-stepoff` (a piece comes back `--steps` ranks toward the caster), `bwp-expel` (an invader thrown back over the border), `cwp-kneel` (their king walks in and bows), `cwp-notch` (the ratchet pawl clicks three notches and snaps back). All transform and opacity only, one-shot, `--ease-out` / `--ease-io`, ending at opacity 0, and parked by the existing `html[data-anim="off"]` rule of each module. No shadow, glow, filter or blur in any new layer; each card keeps its own three-colour palette. Whole-board washes, shock rings, edge glows and the impact composite are gone from the reworked scenes.

## Guards (after the last commit)

tsc: no errors in boonPlays.tsx or cursePlays.tsx. eslint on both modules clean. test:scene-complexity PASS (0 below the floor), test:anim-props clean, test:animations PASS (0 shared flagships), test:emdash OK, test:rounded OK, test:reduced-motion OK, test:sound OK, check-vfx-coverage OK, check-sig-plugins OK (the PLAYS order is kept, so PLUGIN_IDS needs no rewrite), audit-bespoke-coverage MISSING 0, test:passive-registry PASS. No guard was changed. Evidence folder 1.1 MB.

## Where I stopped

Stopped at a clean commit (033574b). Done: F226 and every tier 9 and 8 card in both modules (four reworked, one count fix, five reviewed NO-CHANGE). Tier 7 so far: vantage_point, home_guard, doomed_vow, pretender, covenant_of_return reworked; crown_of_thorns NO-CHANGE; hollow_crown and the_homecoming TODO. Not yet reviewed at tier 7: bw2_carnival_of_masks, bw2_kingmakers_pact, bw2_restitution, bw3_high_stakes. After that, tier 6 (bw2_early_coronation, bw2_spoils_of_war, bw3_from_the_ashes, bw3_funeral_pyre, bw3_kings_sanctuary, hw2_pauper_crown, hw3_effigy_of_dread, hw3_inverted_crown, hw3_time_bomb). A second look is also owed to the untouched tier 7 and 8 scenes' inset box-shadow edge glow (see REQUESTS).

## REQUESTS

- Slice J (cast banner and CastEscalation): the name banner still sits across the opponent's rank 7 for most of the play, and the tier 7+ centre shock ring still plays over every scene here (visible at 480ms in every after strip). The Curse Engine marks were moved to the opponent's third rank to stay clear of it; Vantage Point's heights (their back two ranks) are partly under it by the rule's nature.
- Integrator: `EdgeGlow` in `boonPlays.tsx` uses an inset `box-shadow` (a glow) in the untouched tier 7 and 8 scenes (Kingmaker, Bolt Hole, Carnival, Restitution, Long Truce, Great Return, Shadow Reserve, Eternal Keep and the wave 3 set). None of the reworked scenes uses it; removing it from the rest belongs with their revamp.
