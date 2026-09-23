# Slice TC-fantasy (Tier C, fantasyPlays mythic ladder, F223)

Owner: TC-fantasy agent. Ledger updates for the integrator to fold into `LEDGER.md`.
Owns `src/components/effects/fantasyPlays.tsx` and `src/components/effects/fantasyPlays.css`.
Evidence: `docs/polish-pass/evidence/TC-fantasy/` (`before/`, `after/` with `.off.png` checks, `vs/` before-above-after pairs).

## What changed

The 24 live fantasyPlays cards are the whole fm_* mythic ladder (the hero and theme-family cards in the module are retired, so `card-strip --module fantasyPlays` selects only these 24). Before, they played three shared templates (Runeforge for buffs, Hexweave for hexes, Blessing for boons) bent by a one-node variant, so a T8 card played its T1 sibling's scene. Now every fm_* card has its own scene that draws its rule: the squares it names, the pieces it touches, and the rule it bends, with scale growing by tier (T7-8 scenes carry 6 to 9 layers with a strike and a quake where the rule lands hard; T1-2 scenes stay small and quiet).

Staging helpers added: `Mine` (a BoardFrame flipped by `--fx-side` so "your half", "your back rank", "your 4th rank" and "your pawn rank" land on the caster's real ranks for either seat), `Forward` (flips about the cast square so leaps and waves point toward the enemy), `.ftp-near` / `.ftp-gg-seat` / `.ftp-gg-far` (board-anchored subjects seated on the caster's or the enemy's side), `.ftp-sf-sky` (Sunforge's sun hangs on the board-centre side of the pawn so it never leaves the board on a 6th or 7th rank pawn), `.ftp-rr-carpet` / `.ftp-lb-vine` unroll from the cast column (`--fx-ox`). Contract: transform and opacity only, no box-shadow, glow, filter or blur in the new code, every duration times `--fx-dur`, every track ends at opacity 0, the module's `html[data-anim="off"]` guard hides every ftp-* layer (off end state checked per card: all `.off.png` pass).

## Rows

| Card | Tier | Verdict | New motif (what the rule does, shown) | Before | After | Commit |
|---|---|---|---|---|---|---|
| fm_boon_worldheart | 8 | REVAMPED | The world's heart beats twice and each beat throws one gold move arrow (two extra moves); lifeblood veins run to your army and a crimson bulwark rises over your half (nothing of yours can be captured). ECG trace under the heart. | `before/fm_boon_worldheart.png` | `after/fm_boon_worldheart.png` (`vs/`) | 3247107 |
| fm_eclipse_crown | 8 | REVAMPED | Night falls on the enemy half and two watching eyes there close (the board looks away: their turn is skipped); over a crown the moon slides across the sun, the corona flares, the diamond-ring bead pops, and a silver horizon seals your half. | `before/fm_eclipse_crown.png` | `after/fm_eclipse_crown.png` (`vs/`) | 3247107 |
| fm_hex_winter_court | 8 | REVAMPED | Frost creeps up YOUR half only, from your back rank to the midline; icicles fringe the midline the invaders crossed, snow falls on them, the Court's ice crown rises. The enemy half stays untouched. | `before/fm_hex_winter_court.png` | `after/fm_hex_winter_court.png` (`vs/`) | 3247107 |
| fm_sunforge | 7 | REVAMPED | The sun focuses its rays onto an anvil under the chosen pawn, a hammer swings down, the pawn squashes under the blow and a knight rises from the same square; quench steam. | `before/fm_sunforge.png` | `after/fm_sunforge.png` (`vs/`) | 3247107 |
| fm_hex_kings_moat | 7 | REVAMPED | The rule's own shape: black water fills the eight squares round the king's crown, the drawbridge hauls up, four enemy advances run at the water from every side and recoil at its edge. Board-anchored (the scene has no king square), so it is drawn at board centre as a diagram. | none: the before capture failed twice on the shared server (stage timeout, then `__cardStage` undefined) and the old code was replaced before a retry succeeded | `after/fm_hex_kings_moat.png` | 3247107 |
| fm_boon_royal_road | 7 | REVAMPED | A gold carpet unrolls along YOUR back rank outward from the chosen square, footprints lead in, a crown descends onto the square and two pennants rise either side. | `before/fm_boon_royal_road.png` | `after/fm_boon_royal_road.png` (`vs/`) | 3247107 |
| fm_boon_lifebloom | 6 | REVAMPED | A vine runs along your 4th rank; a seed drops on the square, sprouts, flowers, and the pawn rises out of the bloom inside a ring of petals (protected two turns). | `before/fm_boon_lifebloom.png` | `after/fm_boon_lifebloom.png` (`vs/`) | 12525b9 |
| fm_dragonblood | 6 | REVAMPED | A drop of dragon's blood falls on the queen, dragon wings unfurl from her crown, her four forward knight leaps arc out to marked landing squares, four scales tick in (four turns). | `before/fm_dragonblood.png` | `after/fm_dragonblood.png` (`vs/`) | 12525b9 |
| fm_hex_iron_maiden | 6 | REVAMPED | The cabinet's shadow falls on the chosen piece, two spiked iron doors slam shut on it (quake), a padlock drops on the seam, four tally scratches (four turns). | `before/fm_hex_iron_maiden.png` | `after/fm_hex_iron_maiden.png` (`vs/`) | 12525b9 |
| fm_boon_windrider | 5 | REVAMPED | Gusts, feathered wings open on the bishop and it hops one forward knight leap through the air and back, with the two forward leap arcs drawn. | `before/fm_boon_windrider.png` | `after/fm_boon_windrider.png` (`vs/`) | 12525b9 |
| fm_hex_gorgon_gaze | 5 | REVAMPED | The gorgon's head rises on your side with writhing serpents; its stone-grey gaze cone sweeps the enemy half, the half cracks to stone, and a knight and a bishop (the two piece types the rule names) shudder grey. | `before/fm_hex_gorgon_gaze.png` | `after/fm_hex_gorgon_gaze.png` (`vs/`) | 12525b9 |
| fm_phoenix_feather | 5 | REVAMPED | Ashes glow on the return square, flames lick up, the phoenix climbs out and away dropping one spiralling feather, a cinder egg on the square cracks open (quake). | `before/fm_phoenix_feather.png` | `after/fm_phoenix_feather.png` (`vs/`) | 12525b9 |
| fm_boon_oathstone | 4 | REVAMPED | A standing stone lands on your side with an oath rune and two notches (two turns); a gold chain links along your pawn rank. | `before/fm_boon_oathstone.png` | `after/fm_boon_oathstone.png` (`vs/`) | 39926de |
| fm_hex_sirens_call | 4 | REVAMPED | Song notes swim in on a sea-wave from your side to the chosen piece, a slow spiral turns over it and it sways in place. | `before/fm_hex_sirens_call.png` | `after/fm_hex_sirens_call.png` (`vs/`) | 39926de |
| fm_stormcaller | 4 | REVAMPED | A storm cloud, a bolt strikes the rook, then the rook's straight cross twists a quarter turn into a diagonal cross while a dashed diagonal cross twists back straight: the rook and bishop rules trade. | `before/fm_stormcaller.png` | `after/fm_stormcaller.png` (`vs/`) | 39926de |
| fm_boon_dewdrop | 3 | REVAMPED | A dewdrop falls from a leaf tip, splashes a water crown and sets as a clear dome over the pawn, with a glint. | `before/fm_boon_dewdrop.png` | `after/fm_boon_dewdrop.png` (`vs/`) | 39926de |
| fm_hex_brambleroot | 3 | REVAMPED | Bramble hedges shoot up on both flanks of a rook; its sideways runs hit the thorns and recoil while its forward file stays lit. | `before/fm_hex_brambleroot.png` | `after/fm_hex_brambleroot.png` (`vs/`) | 39926de |
| fm_wyrmscale_mail | 3 | REVAMPED | A wyrm's coil circles the chosen piece, four rows of scales lock on from the ground up (four turns), a sheen runs over the mail. | `before/fm_wyrmscale_mail.png` | `after/fm_wyrmscale_mail.png` (`vs/`) | 39926de |
| fm_boon_hearthbread | 2 | REVAMPED | An ember bed glows on the chosen square, a loaf proves and rises, steam curls, the loaf splits into a fresh pawn. | `before/fm_boon_hearthbread.png` | `after/fm_boon_hearthbread.png` (`vs/`) | e8e07c9 |
| fm_hex_fogbank | 2 | REVAMPED | Fog rolls over the enemy half; a bishop's four diagonals light up for exactly two squares and run into fog banks that swallow the rest. | `before/fm_hex_fogbank.png` | `after/fm_hex_fogbank.png` (`vs/`) | e8e07c9 |
| fm_moonlit_stride | 2 | REVAMPED | A crescent moon lays a beam on the knight and four moonlit steps light one square up, down, left and right of it. | `before/fm_moonlit_stride.png` | `after/fm_moonlit_stride.png` (`vs/`) | e8e07c9 |
| fm_boon_lanternlight | 1 | REVAMPED | A lantern swings over the king and throws eight straight two-square paths, each ending in a lit square. | `before/fm_boon_lanternlight.png` | `after/fm_boon_lanternlight.png` (`vs/`) | e8e07c9 |
| fm_glowmoss_ward | 1 | REVAMPED | Glowing moss covers the 3x3 patch centred on the king (the nine protected squares), tufts sprout on its edge, fireflies rise. | `before/fm_glowmoss_ward.png` | `after/fm_glowmoss_ward.png` (`vs/`) | e8e07c9 |
| fm_hex_thistledown | 1 | REVAMPED | Thistledown drifts in, burrs catch on an enemy knight, and its capture mark (crossed blades) is struck through: it may move but not take. | `before/fm_hex_thistledown.png` | `after/fm_hex_thistledown.png` (`vs/`) | e8e07c9 |

| Row | Status | Evidence | Commit | Note |
|---|---|---|---|---|
| F223 | DONE | `evidence/TC-fantasy/` (23 before strips, 24 after strips with off checks, 23 before/after pairs in `vs/`, a post-cleanup spot check in `final-check/`) | 3247107, 12525b9, 39926de, e8e07c9 | All 24 fm_* cards on their own scenes. The three shared templates (Runeforge, Hexweave, Blessing) and their variant flourishes are removed. |
| Tier C family table row 3 (fantasyPlays mythic ladder) | DONE | same | same | 24 of 24 REVAMPED. |

## Guards (last run, after the final batch)

test:animations PASS, test:scene-complexity PASS (0 below the floor), test:anim-props clean, test:reduced-motion clean, test:rounded OK, test:emdash OK, test:sound OK, check-vfx-coverage OK, check-sig-plugins OK (1841 keys), audit-bespoke-coverage MISSING 0, test:passive-registry PASS. tsc: no errors in fantasyPlays.tsx. eslint fantasyPlays.tsx clean.

## Notes for the integrator

- The shared stage wrapper draws its own chrome over every play (the title and rule banner at the top, "TWO EXTRA TURNS" over the centre for Worldheart, a large cyan or palette ring on some drives); scenes were placed to read around it (Worldheart's heart sits above the banner, Eclipse Crown's eyes flank the sun instead of sitting behind it). Those layers are not in this module.
- `fm_hex_kings_moat` has no before strip (see its row). Its King's Moat scene is a board-centred diagram because a board-anchored passive gets no king square; if Board ever passes the caster's king square as `sq` for passives, the scene can switch to `anchor: "cast"` with no art change.
- Where I stopped: all 24 cards in the module are done; nothing left in this slice's family.
