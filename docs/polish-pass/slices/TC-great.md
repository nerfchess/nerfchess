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
| Tier C family 4 (greatPlays) | PARTIAL | this file | see per-card rows | T7-8 cards moved off shared templates into per-card scenes; see "Where I stopped". |

## Per-card rows

Before and after strips: `evidence/TC-great/before/<id>.png`, `evidence/TC-great/after/<id>.png`; off check `after/<id>.off.png` (pass unless noted).

| Card | Tier | Verdict | New motif (what the rule touches) | Off check | Commit |
|---|---|---|---|---|---|
| atomic_captures | 8 | REVAMPED (was SiegeRoll siege cart) | A crosshair settles on the capture square, the take lands, the 3x3 round it is ruled off and each of the eight neighbours cracks and kicks outward in turn (nothing beyond them); a mushroom cloud stands on the captured square (clamped so it stays on the board near the back rank) with a trefoil stamp; a king and a pawn sit untouched at the rim (the two it spares); fallout sifts inside the 3x3. Target cut: that neighbour's square cracks and blows out along its own leg. | pass | TC-great batch 1 |
| twin_queens | 7 | REVAMPED (was CrownForge anvil) | The 5th-rank threshold (the halfway line) is drawn, a thread ties the two named pawns (cast square and the aimed one, from --fx-aim and --fx-len), two crowns fall on the same beat and each pawn stands up a queen; then the price: the next reroll die at the caster's edge splits in two. Target cut: pawn, crown, queen on that square. | pass | TC-great batch 1 |
| threads_of_fate | 7 | REVAMPED (was WitchCircle loom flourish) | A spindle turns at the caster's edge and spins three threads across the board (one per capture repaid), shears close on the first at the halfway line, the snipped end falls and the cut is knotted into a double step that runs back down to the caster (the extra move); three pips on the spindle, the first lit. | pass | TC-great batch 1 |
| court_in_exile | 7 | REVAMPED (was WitchCircle exile flourish) | The opponent's back rank lights; the queen leaves first, the rest of the court steps down off the rank and walks out to both edges; the king alone keeps the rank under a ring with two pips (two king-only turns); last, the queen walks back in slowly with two pips of her own (her two further turns). Side-aware king and queen files. | pass | TC-great batch 1 |
| wild_hunt | 7 | REVAMPED (was BeastRush beast) | A horn sounds on the picked square, both of its diagonals are struck edge to edge through it, an antlered rider gallops the length of each, and hoofprints are left along both. Target cut: a rider sweeps across each taken piece's square along its own leg and lifts the piece away. | pass | TC-great batch 1 |
| ww_iron_bulwark | 7 | REVAMPED (was WarBanner bulwark flourish) | The caster's half is laid out (the bulwark holds only there), an iron tower shield slams onto the chosen square, the ring of eight neighbours is framed and each is struck with a barred blade (nothing next to it can capture), rivets are hammered into the ring's corners. Target cut: the shield on the square. | pass | TC-great batch 1 |

## Where I stopped

(updated per batch)

## REQUESTS

- Integrator: move `docs/polish-pass/evidence/TC-great/check-great-weight.ts` to `scripts/check-great-weight.ts` and add `"test:great-weight": "tsx scripts/check-great-weight.ts"` to package.json (slice L owns package.json). Change its relative imports from `../../../../src/...` to `../src/...`.
- Slice J (cast banner): the shared cast banner sits over ranks 7 and 8 for the whole play, which is exactly where every "opponent's back rank" motif lands when the caster is at the bottom (court_in_exile's court, atomic_captures' cloud near the top). The scenes route around it (the court steps down off the rank before it walks out, the cloud clamps), but a banner that yields the board after its first beat would help every card of this kind.

## FINDINGS (new, for the integrator)

- TC-great-a (low, owner of `core.ExSmashBurst`): `test:scene-complexity` currently fails on `[t8] core.ExSmashBurst (ihatemyex): no layer driven by the directional geometry vars`. Not greatPlays; it appeared while this slice was working (another slice's uncommitted change or a recent commit).
