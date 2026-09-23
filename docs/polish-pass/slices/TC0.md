# Slice TC0 (Tier C step 1: gallery and strips, F228)

Owner: TC0 agent. Ledger updates for the integrator to fold into `LEDGER.md`.
Owns `src/app/dev/plays/*`, `src/app/dev/lab/*`, `scripts/polish/card-strip.ts`.
Evidence: `docs/polish-pass/evidence/TC0/`.

## HOW TO USE (for the family lanes)

Capture before strips, revamp, capture after strips with the same flags:

```sh
scripts/polish/heavy.sh ./node_modules/.bin/tsx scripts/polish/card-strip.ts \
  --ids fm_eclipse_crown,world_lock --out docs/polish-pass/evidence/<SLICE>/before
# ... revamp ...
scripts/polish/heavy.sh ./node_modules/.bin/tsx scripts/polish/card-strip.ts \
  --ids fm_eclipse_crown,world_lock --out docs/polish-pass/evidence/<SLICE>/after --off
```

Pick cards by module in frequency order (tier 10 first) instead of typing ids:

```sh
./node_modules/.bin/tsx scripts/polish/card-strip.ts --module godPlays --tier 8,7 --list   # ids only, no browser
scripts/polish/heavy.sh ./node_modules/.bin/tsx scripts/polish/card-strip.ts \
  --module godPlays --tier 8 --limit 6 --out docs/polish-pass/evidence/TC-god/before
```

`--module` takes play module names as in `CARD_TO_MODULE` (`godPlays`, `fantasyPlays`, `greatPlays`, `boonPlays`, `cursePlays`, `basicPlays`, `g01HourglassPlays` ...) or `core` for the SIGNATURES table. Retired and unimplemented cards are never selected.

What you get per card, in `--out`:

- `<id>.png`: 8 tiles at 160px, the board only, spanning the measured play (tiles are spaced denser at the start, so the tell gets its own tile). The title line says tier, drive, cast square, targets, side, speed. About 25 to 40 KB each.
- `<id>.json`: the stage report (`info.drive`, `info.driveNote`, `art` core/plugin/gen, `visual`, `anchor`, `source`, `castSq`, `targets`, `picks`), `durationMs` (`visualMs` until the board stops changing against its end state, `cssEndMs` the last finite CSS animation end, `settled`), rAF intervals and dropped frames, and every long animation frame in the window with its scripts. `url` replays the same play by hand.
- With `--off`: `<id>.off.png` (full end, off +400ms, off +3000ms, off end, changed regions outlined) and an `off` block in the JSON with `pass`. Pass means nothing arrives late with animations off (+400ms vs +3000ms under 1% changed) and the resting board matches the full run (under 2%).

Spotting generic look-alikes (the owner directive): `--sheet NAME` adds `NAME.sheet.png`, one tile per card at its strike (the tile whose shapes differ most from the board before the play, so a board-wide dim does not win), and `NAME.similar.json`, every pair of cards in the run ranked by how alike their strips look. On the godPlays template sample the three top pairs are all GodDescent cards (transcendence, mass_mind_control, full_pardon, checkmate_denial; `sheet/godplays-templates.*`). It is triage, not a verdict. `--compare before,after --out DIR` writes `<id>.vs.png` with the before strip above the after strip for every card in both folders (no browser needed), which is the pair to link from a REVAMPED row.

Useful flags (all documented at the top of the script): `--sq e4` cast square, `--target e7,d7` preferred picks in order, `--side b`, `--view w`, `--anim full,fast` and `--fx 0.5,1,2` (every combination, file names get a suffix), `--event grant` (the card is acquired instead of used: the entrance beat a draft pick shows), `--drive stage` (force the synthetic diff), `--pos promotion-race` and `--place wQd4,-e2` (set up a position), `--spec FILE` (per-card options as JSON), `--live` (send the board what live surfaces send today), `--inplace` (the local bot game's update path).

The page itself: `/dev/plays?id=<card>&sq=e4&target=e7&side=b&anim=fast&fx=2` shows the stage with an info panel and Play and Reset buttons; `bare=1` hides the panel, `autoplay=1` plays on load. `window.__cardStage.play()` returns the commit time. Every parameter is listed at the top of `src/app/dev/plays/stageParams.ts`. The lab (`/dev/lab`) has a "Play stage" link on the selected card.

How a play is staged (read `info.drive` before judging a strip):

- engine: the card is granted to the caster in a sandbox game and used for real (`activateBuff` with target picks, or `acquireBuff` for an instant), so the board diff, zones and outcome are the engine's. Picks prefer the URL's squares, else the candidate nearest the previous pick, else the one nearest the board centre. When the opening gives an activated card no valid use and no `pos` was named, the other lab presets are tried (the note says which).
- stage: a synthetic diff for passives and cards with no valid use anywhere: the victims join the zone the card's signature config names as its `source` (frozen, walnut, shield, kingSafe, stun, empower, rally, slow, blindfold, summon) or are removed. A removal-sourced card that is not an attack card plays diff-less (spectacle and lead only) unless `--target` names victims, so the stage never invents a capture the rule does not make.
- The game is cloned before each play (serialize, deserialize), as an online update is, so Board diffs fresh arrays. The sq and caster are sent to Board (`SigPlaySlot.sq`, `caster`), which is the anchoring contract; see TC0-a for what live surfaces send.

## ROW UPDATES

| Row | Status | Evidence | Commit | Note |
|---|---|---|---|---|
| F228 | DONE | `evidence/TC0/verify/` (strips, JSON, off checks), `evidence/TC0/speed/` (anim full/fast x fx 0.5/2), `evidence/TC0/sheet/` | a402b59 (stage and strips), then the sheet, compare and speed-evidence commit after it | `/dev/plays?id=...` plays any live card on the real Board, any cast square and targets, either side and view, data-anim full/fast/off, --fx-dur 0.5 to 2, all from URL params, scriptable via `window.__cardStage`. `scripts/polish/card-strip.ts` captures a small strip plus JSON per card and verifies data-anim off. Grid view: retired cards removed (they were listed), black-at-bottom toggle, a "stage" link per card. |
| `/dev/plays` | K to TC0 | same | a402b59 | states: an unknown or unimplemented id, a play module that fails to load, and a play that throws all render the error in place of the board and reject `play()` (checked with `no_such_card`); a card with no use in any preset falls back to the synthetic drive and says so. The URL is read after mount, so the grid view (no `id`) is unchanged. |
| `/dev/lab` | K to TC0 | code diff | a402b59 | Only a "Play stage" link on the selected card. The lab still updates its sandbox in place (see TC0-b), which is why removal cards look quieter in the lab than on the stage. |

Verification cards (not judged by TC0; the strips double as "before" evidence for their family lanes):

| Card | Art (module) | Mechanic | Drive (what the stage did) | Strip | Off check (instant / end changed) |
|---|---|---|---|---|---|
| nova | core `nova` | T6 activated attack | engine, 1 pick d2; the d-file clears | `verify/nova.png` | pass (0 / 0) |
| nova, black caster | core | same | engine, 1 pick d7, board from black's side | `verify/nova.b.png` | pass (0 / 0) |
| fm_eclipse_crown | plugin (fantasyPlays) | T8 instant tempo | engine, resolves when acquired | `verify/fm_eclipse_crown.png` | pass (0 / 0.29%) |
| world_lock | plugin (godPlays) | T8 instant protection | engine, resolves when acquired | `verify/world_lock.png` | pass (0 / 0.42%) |
| twin_queens | plugin (greatPlays) | T7 activated pieces | engine, no use in the opening, so the preset search used promotion-race: g7 and h6 promote | `verify/twin_queens.png` | pass (0 / 0.22%) |
| hw2_death_knell | plugin (cursePlays) | T8 activated hex | engine, 1 pick d7 (the doomed pawn gets its countdown badge) | `verify/hw2_death_knell.png` | pass (0 / 0.01%) |
| duelist | plugin (basicPlays) | T5 activated protection | engine, 1 pick d2 | `verify/duelist.png` | pass (0 / 0.02%) |
| mass_freeze | core `snapfrost` | T7 passive tempo | stage, frozen diff on c7 d7 e7 | `verify/mass_freeze.png` | pass (0 / 0.11%) |
| hx4_tithe_of_silence | plugin (g01HourglassPlays) | T8 passive hex | stage, diff-less (removal source, not an attack card) | `verify/hx4_tithe_of_silence.png` | pass (0 / 0); `settled: false` because an ambient loop keeps drawing |
| dragons_breath | core `dragonfire` (shadows fantasyPlays, TC0-d) | T7 activated attack | engine, the opening had no use, sparse-midgame: rook d1 breathes up the d-file | `verify/dragons_breath.png` | not run |

Comparison strips for the findings below: `verify/nova.inplace.png` (TC0-b) and `verify/hw2_death_knell.live.png` (TC0-a).

## FINDINGS (new, for the integrator)

- TC0-a (medium, Tier B, slices B and J): no live surface sends `caster` or `sq` with a play. `src/app/game/page.tsx:642` and `src/components/OnlineMatch.tsx:529` call `fireSigQueued(id)` with no meta, so every diff-less lead is staged on the board centre (`Board.tsx:5317`) and an anchored ("cast" / "aim") scene only anchors when a removal or zone diff hands Board its squares. The anchoring contract (animation brief section 0) assumes the cast square is known. Evidence: `verify/hw2_death_knell.png` (contract: the knell's crown and bell sit on the doomed d7 pawn) against `verify/hw2_death_knell.live.png` (what a game shows: the same scene in the lower middle of the board, nowhere near d7). The fix is to pass `{ caster, sq }` from the activation handlers (they hold the picks).
- TC0-b (medium, Tier B, slice B): the local bot game passes `fxBoard={game.board}` (`src/app/game/page.tsx:2166`) after an activation that mutates `game.board.pieces` in place (`makeBuffApi.removePiece`, `src/engine/game.ts:938`), then re-renders `{...game}`. Board's removal diff compares piece-array identity (`Board.tsx:3040`), so at activation time it sees no removal: the card's target cuts and canvas legs do not play, and the still-pending signature key is claimed by the NEXT diff (the bot's reply), where the reply's capture can be dressed as part of the card. Online games deserialize fresh arrays and are not affected. Evidence: `nova.png` (cloned, as online) against `nova.inplace.png` (the local path). The lab has the same pattern.
- TC0-c (low, Tier B, slices I and J): the play name chip (`PlayAnnouncement`, `Board.tsx:366`, class `extra-turns-banner`, `globals.css:2348`) runs a fixed 2.8s that ignores --fx-dur, so a play at fx 0.5 still holds the board about 2.6s (`world_lock` visualMs 2555 at fx 0.5, 2610 at fx 1, 4296 at fx 2; `speed/world_lock.full-fx0.5.json`, `verify/world_lock.json`, `speed/world_lock.full-fx2.json`). The scene layers themselves do scale (compare the tiles of the two speed strips). Family lanes: judge fx 0.5 by the scene tiles, not by visualMs.

- TC0-d (high for the Tier C lane, slices TC-fantasy and TC-core): 48 cards have art in BOTH the core `SIGNATURES` table and `fantasyPlays`, and Board resolves core first (`sigOf = SIGNATURES[id] ?? PLUGIN_SIGNATURES[id]`, `Board.tsx:85`), so their fantasyPlays scenes never render. 43 are live, including all eight fantasyPlays "hero scenes": philosophers_stone (T9), summoning_circle, heavens_wrath, orb_of_dominion (T8), dragons_breath, summon_dragon, judgment_day, roost_of_rocs, soul_harvest, aegis_of_ages, celestial_ascension (T7), divine_intervention, serpent_brood, divine_mandate, lich_phylactery, sinkhole, chain_lightning, wall_of_thorns (T6), army_of_the_dead, starfall, stone_golem, withering_touch, divine_reckoning, frost_wall, fissure_field, horn_of_summoning, staff_of_stasis, doom_march, apotheosis (T5), excalibur, phantom_guardian, wyverns_dive, direwolf_pack, hallowed_return, shackle_the_queen, metamorphosis, dragon_form (T4), basilisk_stare, raise_dead, chains_of_binding (T3), imp_familiar, undying_thrall, evil_eye (T2). A revamp of these in `fantasyPlays.tsx` changes nothing a player sees; the art that plays is the core visual in `sigVisuals.tsx` (for example `dragonfire`, `meteor`, `bladegift`, `chalkcircle`). The stage reports this as `info.art: "core"`. The card-strip `--module fantasyPlays` selection lists them under `core`, not `fantasyPlays`. Decision for the integrator: either TC-core owns these 43 or the core entries are dropped so the plugin scenes play (then check anchor, source and sound parity, since the core configs carry the zone `source` Board uses).

- TC0-e (low, effects owners): `loadPluginModulesForCards` (`src/components/effects/sigPluginsMerged.tsx:143`) resolves at once for a module that is already loading, so a caller that awaits it can read `PLUGIN_SIGNATURES` before the card's config has published and fall to the generated config. Board does not await it for correctness (the first-cast gate waits on `whenSignatureVisualsReady`), so no player-facing effect was found; the stage hit it (a plugin card reported `art: gen`) and now awaits `loadPluginModule` instead, which returns the in-flight promise. Returning `loads.get(mod)` for in-flight modules would fix the helper itself.

- TC0-f (high for the owner directive, slice J with TC-core): every bespoke card of tier 6 and up gets the same board-centred wrapper on top of its own scene: `CastSpectacle`'s bespoke branch (`BoardEffects.tsx:2992`) draws a category wash, a frame ring with an inset box-shadow glow, and `CastEscalation` (`BoardEffects.tsx:2761`) adds an edge pulse (inset box-shadow glow), a shock ring from the board centre, a vignette and a beam sweep at tier 7+, and a second, larger shock ring at tier 8. On the contact sheet of twelve cards at their strike (`sheet/verify.sheet.png`), the same thin centre ring, beam and dim dominate the frame of world_lock, walnut_court, obsidian_bastions, mass_freeze, twin_queens and fm_eclipse_crown, whatever the card does or where it was cast. This is exactly the "generic rings, board-wide washes" the owner directive says may be at most a small accent, and it is shared by every T6+ bespoke card, so no per-card revamp can remove it. Suggested: for bespoke cards keep only the banner (and at most a faint frame tick), drop the centre shock rings and the beam, and let the card's own tell carry the dim. The two inset box-shadows also break the no-glow contract.

## REQUESTS

- Slice L (`package.json`): add `"polish:card-strip": "tsx scripts/polish/card-strip.ts"`.

## STOPPED AT

F228 is done: the stage, the strip script (strips, off check, speed matrix, module and tier selection, contact sheet with look-alike ranking, before/after stacking) and this guide. Verified on ten cards across seven art sources (core, godPlays, fantasyPlays, greatPlays, cursePlays, basicPlays, g01). TC0 owns no play module, so it revamped no card; its card-specific contribution is the triage above (TC0-d, TC0-f, the godPlays template sheet) for the family lanes. Not done: a full-library look-alike sweep (174 live T7-8 cards, about 35s each on this box) was left to the family lanes' own before runs so the heavy slots stay free for revamps.
