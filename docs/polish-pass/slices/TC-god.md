# Slice TC-god (godPlays: F221, F227, per-card scenes)

Owner: TC-god agent. Ledger updates for the integrator to fold into `LEDGER.md`.
Owns `src/components/effects/godPlays.tsx` and `godPlays.css`.
Evidence: `docs/polish-pass/evidence/TC-god/` (`before/`, `after/`, `vs/` = before strip above after strip, `f227-tempo.txt`, `check-god-weight.ts`).
Strips: `scripts/polish/card-strip.ts` against :3100, data-anim full, fx 1, 160px tiles; `after/` runs used `--off`.

## ROW UPDATES

| Row | Status | Evidence | Commit | Note |
|---|---|---|---|---|
| F221 | DONE | `evidence/TC-god/check-god-weight.ts` (run: `./node_modules/.bin/tsx docs/polish-pass/evidence/TC-god/check-god-weight.ts`, add `--list` for the table) | see commit log (TC-god batch 1) | The stale `T8` flourish set is deleted. `G` now binds each entry's live tier from `BUFF_BY_ID` (`bindTiers` after PLAYS, since the registry audits parse the `G(Template, palette, glyph, config, flourish?)` shape and `G` cannot see the id), templates receive `tier`, and `heavy(tier)` is `tier >= 8`. Fixed: absolute_aegis (T7), sundering (T6), queen_storm (T7), genesis (T7), total_warp (T7, keyless-heavy), endless_turn (T6, keyless-heavy) and total_atomic (T7, unconditional vignette) no longer play tier-8 weight; abdication_edict, scorched_earth, blighted_furrows, poisoned_counsel, sacked_capital, celestial_alignment, world_lock, sealed_archive, sealed_ramparts, walnut_court, obsidian_bastions, peace_of_the_grave (T9) and reality_warp (T9, was already heavy) now do. The check renders every lead to static markup and fails if a bound tier differs from the library, a card below 8 carries the vignette, or a card at 8+ lacks it. 68/68 pass. |
| F227 | DONE | `evidence/TC-god/f227-tempo.txt`, strips `after/{fortress_realm,warp_sovereign,crown_and_castle,salted_earth,mind_empire}.png` | same | Cards at tier 5 and below play their scene through `Tempo`, which sets `playbackRate` on every CSS animation in the scene's subtree (Web Animations scales delays as well as durations, so the beats keep their order): tier 4 and below 1.8x, tier 5 1.35x, tier 6+ unchanged. Measured in the browser: T4 gp layers end at about 1.9s (was about 3.5s), T5 at 2.4s, the T7 control at 3.5s. The check above also asserts the wrapper is on exactly the tier 5 and below cards. The strip `visualMs` for these cards stays near 2.4s because the shared cast banner and frame pulse (slice J) hold the board that long for every card; see REQUESTS. |
| Tier C family 2 (godPlays) | PARTIAL | this file | same | 8 T8 cards split off shared templates into per-card scenes (table below). Remaining shared-template T8/T9 cards listed under "Where I stopped". |

## Per-card rows

Before and after strips are `evidence/TC-god/before/<id>.png` and `evidence/TC-god/after/<id>.png`; `evidence/TC-god/vs/<id>.vs.png` stacks them. Off check (`after/<id>.off.png`): pass unless noted.

| Card | Tier | Verdict | New motif (what the rule touches) | Off check | Commit |
|---|---|---|---|---|---|
| world_lock | 8 | REVAMPED (was ForgeColossus padlock slam) | The border between the halves is scored in gold, two chain runs haul in from both board edges and meet under a padlock that drops and clicks shut; four enemy advances run at the chain and are thrown back to their own side (side-aware); three pips are the three turns. | pass | TC-god batch 1 |
| celestial_alignment | 8 | REVAMPED (was CelestialRing rune ring) | Night over the board, a moon crosses the opponent's sky, a star lands on every LIGHT square and nowhere else (view-proof: the top-left square is light from both sides), chart lines join them along both diagonals, the stars harden into frost marks; two moon pips are the two turns. Frozen pieces get a star, a frost cross and two pips (target cut). | pass | TC-god batch 1 |
| walnut_court | 8 | REVAMPED (was GorgonIdol idol head) | A carved bench rail runs the opponent's back rank, a gavel strikes twice at its end, the bark hardening steps down that rank a square at a time; three tally nuts are the three turns. Each walnutted piece gets two round shell halves clamped shut with a gold seam and three pips (target cut, `ShellClampHit`). | pass | TC-god batch 1 |
| scorched_earth | 8 | REVAMPED (was SkyWrath storm god) | Heat lines mark exactly the opponent's own 4th to 6th ranks (side-aware), the band chars, six flames stand along it, three brand strokes burn in (three turns), and one footprint crosses the band once: the first piece's one step before the ban. | pass (re-run with `--off-only`; the first off run hit a dev-server error page) | TC-god batch 1 |
| blighted_furrows | 8 | REVAMPED (was ReaperSweep reaper) | Four furrows are ploughed across the caster's half, rot creeps along them and the wheat wilts; a bramble with four knots grows along the border (the other pawns cannot advance for four turns) and one sprout pushes through it once (the first pawn's one advance). Each rotted pawn sags into the furrow (target cut). | pass | TC-god batch 1 |
| sealed_ramparts | 8 | REVAMPED (was ForgeColossus portcullis flourish) | A winch turns and a portcullis slams at the cast square; two bolt pips are the two frozen turns; then the leash: a capped cross three squares long each way. On every rook the bars drop, two bolts, and the same three-square leash is drawn from that rook (target cut). | pass | TC-god batch 1 |
| transcendence | 8 | REVAMPED (was GodDescent deity) | The nerf's brand sits on the caster's edge, a stair of light rises from it, the brand is lifted off and carried away across the board (suspended, not destroyed), a ring of twenty ticks closes round the centre (twenty turns), and three cards fan open inside it (the next draft shows three). | pass | TC-god batch 1 |
| mass_mind_control | 8 | REVAMPED (was GodDescent deity) | Two eyes open over the cast square with turning spiral irises, two mind-threads run down the real aim vector as long as it is, a marionette control bar settles above. On each marked piece a control bar is lowered on a string, a spiral turns on the piece, and an hourglass pip says the defection waits for the opponent's next move (target cut, `MindMarkHit`). | CHECK: board identical; the 8.7% is the static cast banner the shared wrapper leaves up in off mode (not godPlays) | TC-god batch 1 |
| absolute_aegis, sundering, queen_storm, genesis, total_warp, endless_turn, total_atomic | 6-7 | F221 weight fix only | lose the tier-8 vignette and extra shockwave | not run | TC-god batch 1 |
| fortress_realm, warp_sovereign, crown_and_castle, salted_earth, mind_empire | 4-5 | F227 short cut only | same scene, 1.8x (T4) or 1.35x (T5) | not run | TC-god batch 1 |

## Where I stopped

Batch 2 (scenes written, not yet landed at the time of this note; see the next update of this file): buff_plunder, absolute_nullify, draft_supremacy, sealed_archive, poisoned_counsel, sacked_capital, obsidian_bastions, reality_warp. Before strips for all of them are already in `before/`.

Still on shared templates after that: GodDescent draft_tyranny, sovereign_draft, divine_legion, absolute_aegis, checkmate_denial, full_pardon, mind_empire, throne_and_silence, abdication_edict (T8), wa_dominate_major; GorgonIdol statue_garden, cockatrice_gaze, chisel_curse, crown_and_castle; CelestialRing genesis, total_warp, warp_cataclysm, warp_sovereign, nerf_reversal; TitanRise great_divide, sundering, fortress_realm, molten_heart, unshackled_wrath; ReaperSweep peace_of_the_grave (T9), withered_hands, grand_malediction; AbyssMaw grand_nullify; HostMarch age_of_heroes, grand_retreat; ForgeColossus dragonslayer; FrostTitan glacial_tomb, frozen_solid, everfrost_shard; SkyWrath rift_storm, queen_storm; ChronoLord full_rewind, endless_turn.

## REQUESTS

- Integrator: move `docs/polish-pass/evidence/TC-god/check-god-weight.ts` to `scripts/check-god-weight.ts` and add `"test:god-weight": "tsx scripts/check-god-weight.ts"` to package.json (slice L owns package.json). It needs the relative imports changed from `../../../../src/...` to `../src/...`.
- Slice J (UseSpectacle / cast banner): the shared cast banner and frame pulse hold the board for about 2.4s whatever the card's tier, so a tier 4 play still reads as long even though its own scene now ends at about 1.9s (F227). Consider scaling the banner hold with tier.
- Slice J / B (TC0-a): `mass_mind_control`'s marks and `sealed_ramparts`' per-rook leash land on the target squares only when Board mounts target renders for them; in the strips the lead carries the rule on its own, which is the fallback.

## FINDINGS (new, for the integrator)

- TC-god-a (low, K): `scripts/polish/card-strip.ts` reports `cssEndMs` from computed durations, so it does not see a `playbackRate` change; the F227 timing had to be measured with a small in-page probe (`f227-tempo.txt`).
