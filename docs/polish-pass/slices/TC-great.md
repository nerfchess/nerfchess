# Slice TC-great (greatPlays: F222, per-card scenes)

Owner: TC-great agent. Ledger updates for the integrator to fold into `LEDGER.md`.
Owns `src/components/effects/greatPlays.tsx` and `greatPlays.css`.
Evidence: `docs/polish-pass/evidence/TC-great/` (`before/`, `after/`, `check-great-weight.ts`, `f222-weight-diff.txt`).
Strips: `scripts/polish/card-strip.ts` against the shared dev server, data-anim full, fx 1, 160px tiles; every `after/` run used `--off` (`after/<id>.off.png`).

## ROW UPDATES

| Row | Status | Evidence | Commit | Note |
|---|---|---|---|---|
| F222 | DONE | `evidence/TC-great/check-great-weight.ts` (run: `./node_modules/.bin/tsx docs/polish-pass/evidence/TC-great/check-great-weight.ts`, `--list` prints the table), `evidence/TC-great/f222-weight-diff.txt` | 3afd066 | The stale `TIER6` flourish set is deleted. `G` binds each entry's live tier from `BUFF_BY_ID` (`bindTiers` after PLAYS, same shape as godPlays so the registry audits still parse `G(Template, palette, glyph, config, flourish?)`), templates receive `tier`, and `GrandAccent` (edge glow plus second shock ring) renders for tier >= 6. 24 entries change accent (the diff file lists them): atomic_captures (T8), twin_queens and threads_of_fate (T7) and ten T6 cards gain it; mind_dominion, we_firestorm, gossamer_veil, riddle_game, mirror_of_souls (T5), queen_of_stone, glacial_flanks, chess_diff, empty_handed, dragon_mount (T4) and time_rewind (T3) lose it. The lead of every tier 4 and below card (18 cards, T2 to T4) now plays through `Tempo` (tier 4 at 1.3x, tier 3 and below at 1.6x; target and entrance cuts untouched). The check renders all 115 leads and fails if a bound tier differs from the library, a card below 6 carries the accent, a card at 6+ lacks it, or the short cut is on the wrong cards. 115/115 pass. |
| F227 (greatPlays part) | DONE | same check | 3afd066 | The short cut above is the greatPlays half of F227 (godPlays half landed in TC-god). |
| Tier C family 4 (greatPlays) | PARTIAL | this file | see per-card rows | All 12 T7-8 cards moved off shared templates into per-card scenes (worklist items 4, 17, 18, 22, 23, 24, 25, 26, 27, 28 done here, plus wc_sticky_floor and wa_greed); the T2-6 cards remain on templates, see "Where I stopped". |

## Per-card rows

Before and after strips: `evidence/TC-great/before/<id>.png`, `evidence/TC-great/after/<id>.png`; off check `after/<id>.off.png` (pass unless noted).

| Card | Tier | Verdict | New motif (what the rule touches) | Off check | Commit |
|---|---|---|---|---|---|
| atomic_captures | 8 | REVAMPED (was SiegeRoll siege cart) | A crosshair settles on the capture square, the take lands, the 3x3 round it is ruled off and each of the eight neighbours cracks and kicks outward in turn (nothing beyond them); a mushroom cloud stands on the captured square (clamped so it stays on the board near the back rank) with a trefoil stamp; a king and a pawn sit untouched at the rim (the two it spares); fallout sifts inside the 3x3. Target cut: that neighbour's square cracks and blows out along its own leg. | pass | 1ea4a33 (batch 1) |
| twin_queens | 7 | REVAMPED (was CrownForge anvil) | The 5th-rank threshold (the halfway line) is drawn, a thread ties the two named pawns (cast square and the aimed one, from --fx-aim and --fx-len), two crowns fall on the same beat and each pawn stands up a queen; then the price: the next reroll die at the caster's edge splits in two. Target cut: pawn, crown, queen on that square. | pass | 1ea4a33 (batch 1) |
| threads_of_fate | 7 | REVAMPED (was WitchCircle loom flourish) | A spindle turns at the caster's edge and spins three threads across the board (one per capture repaid), shears close on the first at the halfway line, the snipped end falls and the cut is knotted into a double step that runs back down to the caster (the extra move); three pips on the spindle, the first lit. | pass | 1ea4a33 (batch 1) |
| court_in_exile | 7 | REVAMPED (was WitchCircle exile flourish) | The opponent's back rank lights; the queen leaves first, the rest of the court steps down off the rank and walks out to both edges; the king alone keeps the rank under a ring with two pips (two king-only turns); last, the queen walks back in slowly with two pips of her own (her two further turns). Side-aware king and queen files. | pass | 1ea4a33 (batch 1) |
| wild_hunt | 7 | REVAMPED (was BeastRush beast) | A horn sounds on the picked square, both of its diagonals are struck edge to edge through it, an antlered rider gallops the length of each, and hoofprints are left along both. Target cut: a rider sweeps across each taken piece's square along its own leg and lifts the piece away. | pass | 1ea4a33 (batch 1) |
| ww_iron_bulwark | 7 | REVAMPED (was WarBanner bulwark flourish) | The caster's half is laid out (the bulwark holds only there), an iron tower shield slams onto the chosen square, the ring of eight neighbours is framed and each is struck with a barred blade (nothing next to it can capture), rivets are hammered into the ring's corners. Target cut: the shield on the square. | pass | 1ea4a33 (batch 1) |
| stone_prelates | 7 | REVAMPED (was StoneGaze gorgon bust) | The opponent's half is marked (the only place the curse holds) and pews are set across it; two bishops there turn to stone and each one's long diagonal is drawn toward the caster and then cut back to a single step; a transept door rises on the halfway line and a third bishop walks out through it into the caster's half, its diagonal running full length again; six pips on the line are the six turns. | pass | 8b95088 (batch 2) |
| total_whiteout | 7 | REVAMPED (was ColdFront ice front) | A blizzard front crosses the board; three of the opponent's long sightlines (a file and both diagonals, from their 2nd rank toward the caster) are drawn long and cut back to one square, a snow drift piling up on each just past the square that is left; three snowflakes are the three turns. | pass | 8b95088 (batch 2) |
| buff_siphon | 7 | REVAMPED (was ThiefHand gauntlet) | Four of the opponent's cards are laid out at their edge, a siphon is run from them to the caster's edge with a pump wheel turning at its middle; two cards are drawn off down the pipe and land on the caster's side, the other two are padlocked where they lie (locked-in upgrades stay put). | pass | 8b95088 (batch 2) |
| resurrect_queen | 7 | REVAMPED (was CrownForge anvil) | A grave slab cracks at the caster's corner, the queen's shade rises from it and glides the real path (corner to cast square, from --fx-ox/--fx-oy) to the chosen square, stands there whole, and one ward ring with ONE pip holds round her (uncapturable for the opponent's next turn only). | pass | 8b95088 (batch 2) |
| wc_sticky_floor | 7 | REVAMPED (was WitchCircle sticky flourish) | Flypaper unrolls over the opponent's half; three of their pieces try long moves (a rook's file, a bishop's diagonal, a knight's jump), each arrow is cut back to one square while the piece tugs and cannot leave, glue strands holding its foot; two pips, two turns. | pass | 8b95088 (batch 2) |
| wa_greed | 7 | REVAMPED (was CardRite colossal card) | Two cards are dealt side by side with the choice bar standing between them; the bar snaps, a sack opens under both and both cards drop in; two gold pips (both cards, not one). | pass | 8b95088 (batch 2) |

## Where I stopped

All 12 tier 7-8 cards in greatPlays now have per-card scenes (the T8 atomic_captures and all eleven T7s): the whole T7-8 band of this module is done. The shared templates now carry only tier 2-6 cards.

Next in line (not started), by tier: the 39 tier 6 cards still on the thirteen shared templates, highest-frequency first. The weakest by strip reading are the ones that share a template AND a generic flourish: WitchCircle (ball_and_chain, royal_summons, grounded_command, lunar_eclipse, leaden_fields), StoneGaze (stone_riders, stone_bastions, eternal_statue, nerf_hammer), ColdFront (the_big_chill, creeping_frost), SiegeRoll (atomic_reaction, detonation_field, giants_maul), CardRite (draft_domination, total_nullify, favorable_stars, death_arcana, parole, long_leash, unseelie_bargain), ThiefHand (draft_seize, collapse, void), CrownForge (promotion_storm, royal_ascension, second_king, wa_leaden_crown, ascendant_knight, nerf_breaker). The motion verbs in greatPlays.css (grp-c-*) and the helpers (`cell`, `ROW`, `RING8`, `Flecks`, `dm`) are there for them.

## REQUESTS

- Integrator: move `docs/polish-pass/evidence/TC-great/check-great-weight.ts` to `scripts/check-great-weight.ts` and add `"test:great-weight": "tsx scripts/check-great-weight.ts"` to package.json (slice L owns package.json). Change its relative imports from `../../../../src/...` to `../src/...`.
- Slice J (cast banner): the shared cast banner sits over ranks 7 and 8 for the whole play, which is exactly where every "opponent's back rank" motif lands when the caster is at the bottom (court_in_exile's court, atomic_captures' cloud near the top). The scenes route around it (the court steps down off the rank before it walks out, the cloud clamps), but a banner that yields the board after its first beat would help every card of this kind.

## FINDINGS (new, for the integrator)

- TC-great-a (low, dev server): three strip runs in this slice hit ERR_CONNECTION_REFUSED or a dev error page from another slice's uncommitted import mid-run; card-strip's retry covered two, the third was re-run. Not a code finding, noted so the integrator reads a missing off check in a batch log as infrastructure.
- Note: `test:scene-complexity` briefly failed on `core.ExSmashBurst (ihatemyex)` (another slice) during this work; it passes again at the time of the batch 2 commit.
