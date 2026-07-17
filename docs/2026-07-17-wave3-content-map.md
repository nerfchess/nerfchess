# Wave 3 content map - 2026-07-17

Read-only audit + wave-3 brief for the four downstream agents:
**Boon Designer** (builds `bw3_*`), **Hex Designer** (builds `hw3_*`),
**Balance Reviewer**, and **Animation Mapper**. This document tells you what
already exists, what the engine can and cannot express, and exactly what to
build. It creates no cards itself.

Prior art you must also read before designing:
`docs/2026-07-17-card-library-audit.md` (wave-2 counts),
`docs/2026-07-17-boon-wave2-design.md`,
`docs/2026-07-17-hex-wave2-design.md`,
`docs/2026-07-17-nerf-wave2-and-rebalance.md`. Wave-2 code lives in
`src/engine/buffs/boons2.ts` (`bw2_*`), `src/engine/buffs/hexes/wave2.ts`
(`hw2_*`), `src/engine/nerfs/wave2.ts` (`nw2_*`).

---

## 1. Verified post-wave-2 counts

Counts below were re-derived live from `ALL_BUFFS`
(`src/engine/buffs/library.ts`) with `tsx`, not copied from docs. They match
the wave-2 audit.

| Family | Total | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Boons (isBoon, non-hex) | 88 | 10 | 14 | 15 | 13 | 12 | 8 | 10 | 6 | 0 |
| Hexes (category hex) | 207 | 18 | 21 | 30 | 35 | 36 | 27 | 20 | 17 | 3 |
| Pure buffs | 609 | 26 | 46 | 91 | 134 | 126 | 83 | 50 | 40 | 9(+4 T10) |
| Items | 18 | 1 | 8 | 6 | 3 | 0 | 0 | 0 | 0 | 0 |
| Nerfs | 358 | 26 | 35 | 60 | 66 | 61 | 57 | 31 | 22 | 0 |

Boon shape: still starved vs pure buffs (88 : 609) and thin at the top
(T6 = 8, T8 = 6). The three apex hexes (`blackout`, `mass_petrify`,
`culling`) are the only tier-9 curses; boons have no apex tier at all.
Info category is 6 cards total (`extra_glance`, `stream_sniper`,
`pr_phishing`, `third_eye`, `wa_foresight`, `wa_omniscience`) - deliberately
out of scope this wave (needs the hidden-information design pass).

---

## 2. Primitives inventory (the buildable surface)

This is the contract. Design ONLY on top of what is listed here. Every field
is defined in `src/engine/buff.ts`; the reusable factories are in
`src/engine/buffs/helpers.ts`; hex-specific wrappers are in
`src/engine/buffs/hexes/shared.ts`.

### 2.1 Card kinds and turn cost
- `kind: "passive"` - hooks run automatically while held (no activation).
- `kind: "instant"` - `effect` fires the moment the card is picked.
- `kind: "activated"` - holder clicks Use; may collect targets first.
  Consumes the turn unless `freeAction: true` (the extra-move family).
- `spendOnUse` (default true for activated): false keeps the instance alive
  to run a lingering rider (despawn timer, landed-on trigger, per-turn hook).
- **Every activated card can activate exactly once** (`usedActivation` hard
  cap). Repeatable actions MUST be modeled as a passive with charges.

### 2.2 Hooks a card may implement
- `init(inst, api)` - on acquire. Seed `inst.state` here.
- `effect(inst, api, picks)` - instant on pick / activated on use.
- `targets(inst, api, picks)` - sequential target requests; return null when
  done. Two target kinds only: `square` (a list of squares, optional
  `finishable` to let the player stop early) and `enemy-buff` (pick from the
  opponent's held cards, used by `stealBuffs`).
- `augmentMoves(moves, inst, api)` - add extra legal moves for the owner.
- `filterOpponentMoves(moves, inst, api)` - remove opponent moves. MUST fall
  back to non-empty (never strand the opponent with zero moves).
- `onMovePlayed(inst, move, api)` - after EVERY move by either side. This is
  where marks, charges, countdowns, contagion, and delayed triggers live.
- `status(inst)` - short live status string.

### 2.3 Board-level effects (`ActiveEffect`, pushed via `addEffect`)
`turns` counts the affected player's own turns (decremented after each of
their moves per `effectTickColor`); `null` = permanent.
- `freeze` - piece on `sq` cannot move at all. 20 `FreezeSkin` themes (ice,
  glue, stun, sleep, tar, web, honey, vines, chains, cement, slime,
  quicksand, shock, charm, roots, bubble, petal, rust, gum, stone, beartrap).
  **Kings are never frozen.**
- `walnut` - piece on `sq` may shuffle ONE king-step per turn (distinct from
  freeze). **Kings are never walnutted.**
- `shield` - `squares` (list, follow the pieces) or `null` (whole army)
  uncapturable.
- `barred` - listed squares impassable to `against` color.
- `king_safe` - owner's king cannot be captured (temporary immunity).
- `no_pawn_advance` - `against` cannot push pawns.
- `king_only` - `against` may only move king/pawn that turn (used for the
  "seizure" family).
- `nerf_suspended` - owner's nerf inert for the duration.
- `timed_loss` - "do X now, pay after N of your turns": at zero, piece on
  `sq` is `remove`d or `demote`d to `into`. Follows the piece; pruned if it
  is captured first. **Only mechanism for a delayed sacrifice/transformation
  timer.** Kings never touched.
- `short_leash` - owner may only make king-step moves for `turns`.
- `strike` / `bonk` - purely visual flashes (no gameplay).

### 2.4 BuffApi board mutators (use inside init/effect/onMovePlayed only)
`place`, `removePiece` (counts as a real loss unless `{uncounted:true}`),
`relocate`, `setPieceType`, `setPieceColor`, `restoreCastling`,
`removeMyNerf`, `adjustClock`. Also readable: `board`, `me`, `opp`,
`capturedFromMe` / `capturedByMe` (revive pools), `mine` / `theirs`
(PlayerBuffState), `bs.effects`, `bs.skips`, `bs.extraMoves`, `board.history`.

### 2.5 Clock intent (`adjustClock`, write-only)
Fields: `addSelfSec`, `subOppSec`, `stealFractionOfOpp`, `stealFlatSec`,
`stealCapSec`. Server clamps to a floor; no-op untimed.
**There is no `addOppSec` and no way to READ a clock.** (See section 4.)

### 2.6 Draft-state levers (`DraftFlags`, on `mine`/`theirs.flags`)
`prepThree`, `bankBonus`, `bankedTier8`, `stackBoost` (persistent per-offer
tier lift, cap +3), `forceTier`, `takeBoth`, `nullifyIncoming`,
`blockedDrafts`, `noDraftCards`, `seeOppCards`, `seeOppTier`. Plus
`rerollsLeft`, `inventory` (crazyhouse pocket via `grantInventory`), and
`revived` (revive-pool bookkeeping via `markRevived`).

### 2.7 Ready-made factories (helpers.ts) - prefer these
Movement: `slideMoves`, `leapMoves`, `teleportMoves`, `phasingSlideMoves`,
`augment` (charge-limited), `timedAugment`, `permanentAugment`, `pieceBound`,
`bindPiece`. Capture/removal: `removeEnemies`, `lineSweep`, `explodeAt`,
`captureExplosion`, `voidSquares`. Pieces: `placePieces`, `reviveOne`,
`grantInventory`, `grantRandomTier9` / `grantGuaranteedTier9` (apex grant -
do NOT reuse casually; apex grants stay exclusive to Jackpot / Chess Diff /
bank-at-top). Tempo: `skipOpponent`, `extraMovesNow`. Defense: `shieldArmy`,
`shieldZone`, `barLine`, `oppFilter`, `timedOppFilter`. Freeze:
`freezeAllEnemies`, `freezeTarget`. Draft: `stealBuffs`. Hex wrappers
(shared.ts): `walnutAll`, `walnutTarget`, `permaOppFilter`, `curse`
(timed filter with non-empty guard), `blockDrafts`, `nullifyDrafts`,
`suppressDraftCards`.

### 2.8 Proven idioms from wave 2 (copy these patterns)
- Material-deficit gate: `armySize(me) < armySize(opp)` inside
  `permanentAugment` (Cornered King).
- Reading history: `board.history` for "what type they last captured"
  (Jester's Rule) or move-count fuses.
- Countdown fuse: `onMovePlayed` decrements `inst.state.turns`, fires at zero
  (Witching Hour, Beacon of Woe). Effects added during the victim's own move
  use `turns = N + 1` (post-move tick fires after hooks).
- Marking pieces: track a followed square in `inst.state` (Death Knell,
  Cursed Coin) using `trackBoundPiece` semantics.
- Determinism: RNG only via `api.rng` inside init/effect/onMovePlayed, NEVER
  in `targets`/`status` (Carnival, Creeping Blight, Cursed Coin).
- Splicing a `timed_loss` cleanse in `onMovePlayed` matched on
  `move.from`/`move.to` (Death Knell, Pauper's Crown).

### 2.9 Wiring a new batch (for the designers and the integrator)
- **Boons:** new file `src/engine/buffs/boons3.ts` exporting `BOON_WAVE3`
  built with a local `boon()` factory (sets `boon:true, implemented:true`);
  spread into `ALL_BUFFS` in `library.ts` next to `BOON_WAVE2`. Boon flagship
  plays go in `boonPlays.tsx` (registered via `BOON_PLAYS`).
- **Hexes:** new file `src/engine/buffs/hexes/wave3.ts` exporting `HEX_WAVE3`
  built with `tierHexes(t)` / `hex()`; add to `NEW_HEXES` in
  `hexes/index.ts`. Curse flagship plays go in `cursePlays.tsx`
  (`CURSE_PLAYS`).
- Integrator (not the designers) runs `gen:icons`,
  `check-sig-plugins --write`, `test:animations`.

---

## 3. COMBO_TAGS and combination-risk map

`COMBO_TAGS` in `src/engine/draft.ts` is the ONLY incompatibility mechanism
(a pool filter: while you hold an unspent card of a family, the draft never
offers another of that family; the exclusivity line is printed on the card).
There is no `conflictsWith`/`stackLimit` schema field. Current families:
- **turn-theft** (8): time_skip, time_lock, time_freeze, unshackled_wrath,
  grand_malediction, lost_weekend, throne_and_silence, wc_red_tape.
- **draft-denial** (14): patch_notes, absolute_nullify, dead_letter,
  draft_seize, draft_supremacy, suppress, riddle_game, burned_dispatches,
  empty_handed, lost_fortnight, sealed_archive, sacked_capital, time_out
  (plus time_lock, grand_malediction, throne_and_silence shared).
- **mass-freeze** (2): mass_freeze, time_freeze.

**Wave-3 combination duties:** any new card that (a) skips/blocks the
opponent's turn, (b) skips/nullifies the opponent's drafts, or (c) freezes or
petrifies the opponent's WHOLE army must be added to the matching
`COMBO_TAGS` family by the designer (name the tag in your design notes so the
integrator wires it). Wave 2 introduced no new combo families but did add
turn-tax / draft-tax curses that stack in EFFECT rather than possession
(Hollow Crown king-move tax, Queen's Ransom use-tax) - these are safe because
each is conditional on the victim's own actions. New "whole army loses a turn
class" or "every draft is worse" designs are the risk to watch.

---

## 4. Do-not-build: unimplementable with current primitives

These were wanted in wave 2 and left on the floor. Do NOT re-attempt without
an engine change (out of scope for content waves):
1. **Clock-conditional effects** ("when under 30s", "if ahead on time").
   Hooks cannot READ clocks; `ClockRequest` is write-only intent and the
   authoritative clocks live on the server. Any clock gate desyncs.
2. **Give-opponent-time / clock swap.** No `addOppSec` field.
3. **Capture interception / pre-move veto** ("prevent the next capture of X").
   No pre-move veto hook. Express protection as a move filter, a `shield`, or
   a die-then-return (`Deathless Oath`).
4. **Multi-use activated cards** ("pass your turn, 3 charges"). One
   activation per activated card, always. Use a passive-with-charges.
5. **A pure "pass your turn" card.** A non-freeAction active already consumes
   the turn, so this is a do-nothing.
6. **Cross-player card theft outside `stealBuffs`.** No other transfer path;
   piece-bound upgrades cannot be cleanly transferred.
7. **Reading exact clock values, opponent's hidden nerf mid-game beyond the
   existing reveal cards, or opponent's future offers beyond Peek/Glance.**

Also avoid as **duplicates** (mechanic already owned):
- pawn->queen-then-revert (owned by `we_overgrowth`).
- apex random grant (owned by Jackpot / Chess Diff).
- "freeze one enemy piece" and "revive one piece" as standalone cards - the
  pool is saturated (see section 5).

---

## 5. Overrepresented mechanics and filler (do not add to these piles)

Live cluster counts across the 207-hex pool (thematic + mechanical overlap):
- **Petrify / stone / gaze: 25 hexes** (Stone *, Statue *, Granite *,
  Medusa/Gorgon/Basilisk/Cockatrice, Petrified Forest, Hex of Stone,
  Mass Petrify...). Massively saturated. Do not add more "turn pieces to
  stone" curses.
- **Freeze / ice: 17 hexes** (Cold Snap, Frostbite, Cryostasis, Hard Frost,
  Frozen Moment, Total Whiteout, The Big Chill, Absolute Zero, Everfrost...).
  Saturated. New freezes only if the TRIGGER is genuinely novel.
- **Barred / sealed zones: 23 hexes** (Sealed *, Scorched *, Salted *,
  Blighted *, Lava Floor, Fissure Field, walls, furrows). Saturated as static
  terrain; only dynamic/growing variants (Creeping Blight, Tide of Ash) still
  have room, and even those are now covered.
- **Queen / king / crown leash: 19 hexes** (Leaden Queen, Shackle the Queen,
  Throne Bound, Royal Duty, Hollow Crown, Pauper's Crown, Queen's Ransom...).
  Well covered; only truly new royal MECHANICS, not more leashes.
- **Draft-denial: 9 hexes** already, all in the combo family. Do not expand.

Boon-side saturation (from the wave-2 audit's template clustering): plain
shields/wards (SigilRing 20+), "revive one piece" (LanternLift 13),
board-wide freeze relief, draft-denial. New boons must not be numeric or
defensive re-skins of these.

**Filler / revision candidates (do NOT edit this wave, just flagged):**
small-numeric or renamed-sibling cards - the "X can't capture Y" nerf-style
family that leaked into hexes (`gentle_shepherds`-shaped), and thematically
identical stone/freeze pairs like `Basilisk's Stare` (T8 `medusa_stare`) vs
`Basilisk's Gaze` (T3 `basilisk_stare`) and `Medusa's Stare` vs
`Medusa's Verdict`. Near-duplicate NAMES to be aware of, listed in section 12.

---

## 6. Mechanic-family inventory - BOONS (88 cards)

Legend: HAVE = well covered, THIN = 1-3 cards, MISSING = none/near-none.
Bias wave 3 hard toward THIN/MISSING.

| Family | State | Notes / existing anchors |
| --- | --- | --- |
| Defense / shields / wards | HAVE (saturated) | pawn_shield, reinforce, aegis, absolute_aegis, iron_reign, fortress_realm, bubble_wrap, watermelon_rind, Eternal Keep, Diplomatic Immunity. Do not add plain shields. |
| Revival | HAVE | mass_resurrect, Great Return, Prisoner Exchange, Queen's Testament, Restitution, Deathless Oath. |
| Nerf-relief | HAVE (nerf mode only) | 29 category-"nerf" cards. Not for buff mode. |
| Movement grants | THIN | Cornered King, Bolt Hole, Standard Bearer, Ancient Custom. Room for conditional/king-safety and terrain-crossing movement. |
| Transformations | THIN | Masquerade, Carnival of Masks, Alchemist's Trade. Room for identity/army transforms with cost. |
| Promotion boons | THIN | Early Coronation. Almost open. |
| Clocks (self-favoring) | THIN | Highwayman's Toll only. Room (write-only clock, no reads). |
| Draft control (self) | THIN | Ascetic's Bargain, Kingmaker's Pact, Blood Price. Room for cadence/bank/reroll bets. |
| Banking / economy | THIN | Shadow Reserve (pocket), Kingmaker (stackBoost). Room. |
| Comeback / behind-gated | THIN | Restitution, Great Return, Cornered King. Strong identity, room to grow. |
| Attack / removal boons | THIN | Blood Duel, Hit and Run. Room for surgical/self-cost removal. |
| Visibility / information | MISSING (deferred) | Only peek/scout-family. Out of scope this wave. |
| Summoning (own pieces) | MISSING for boons | placePieces exists but few boons use it. Room for miracle summons with cost. |
| Piece protection (conditional) | THIN | Divine Right, Jester's Rule, Diplomatic Immunity, Scarecrow. Room for conditional/positional wards (not blanket shields). |
| Tile / rank / file / diagonal control (own) | MISSING for boons | barLine is hex-flavored; no boon claims friendly-terrain control. Open. |
| One-time miracles | THIN | Long Truce, Great Return, Bolt Hole. The signature boon shape - room at T6-T8. |
| Temporary rule changes (self) | THIN | Ancient Custom, Long Truce. Open. |
| High-risk / high-reward | THIN | Blood Price, Blood Duel, Shadow Reserve. Open. |
| Castling boons | MISSING | restoreCastling primitive exists; no boon uses it beyond relief. Open. |
| Meta / off-board | THIN | Draft-track only. Open (deterministic, no clock reads). |

---

## 7. Mechanic-family inventory - HEXES (207 cards)

| Family | State | Notes |
| --- | --- | --- |
| Freeze / walnut / petrify | HAVE (over-saturated) | See section 5. Do not expand. |
| Static barred zones | HAVE (saturated) | Do not expand. |
| Movement restriction (slider clamps etc.) | HAVE | anchored/blinkered/no_reins family. Saturated. |
| Capture bans / taxes | HAVE | Palsied Hands, War Rations, Blood Price, Cream Pie, Union-style. |
| Marked pieces | THIN | Long Road Home, Death Knell, Twinned Torment, Cursed Coin. Room. |
| Delayed triggers / countdowns | THIN | Bad Omen, Witching Hour, Beacon of Woe, Gathering Storm. Room. |
| Capture-conditioned triggers | THIN | Blood Price, Gravebloom, Curse of Recoil. Room. |
| Movement-through / trail effects | THIN | Cold Footprints, Gravebloom. Room. |
| Check-triggered | THIN | Crown of Thorns only. Room (isInCheck exported). |
| King-movement consequences | THIN | Hollow Crown. Room. |
| Promotion curses | THIN | Tarnished Crown, Stage Fright. Room. |
| Clock-threshold curses | MISSING (unbuildable) | No clock reads. Do NOT attempt. |
| Stacking / stack-morphing curses | THIN | Compounding Misery only. Room. |
| Spreading / contagion curses | THIN | Creeping Blight, Tide of Ash, Contagion. Room. |
| Transferable curses | THIN | Cursed Coin, Hot Potato. Room. |
| Player-choice / contract curses | THIN | Long Road Home, Chains of the Court, Pauper's Crown (cleansable-by-action). Room. |
| Cleanse-condition curses | THIN | Death Knell, Beacon of Woe, Chains of the Court. Room. |
| Delayed board changes | THIN | Tide of Ash, Creeping Blight. Room. |
| Rank / file / diagonal corruption | THIN | Iron Furrow, Sealed Avenues. Room (dynamic, not static). |
| Mirrored / sympathetic effects | THIN | Twinned Torment. Room. |
| Draft / reroll / bank consequences | HAVE | draft-denial family, do not expand. |
| Piece possession / turncoat | MISSING | setPieceColor exists; no hex flips a piece's owner temporarily. Open, high-novelty. |
| Summoned hazards (caster-placed on their board) | THIN | Kraken, Serpent Brood. Room for hazard-summon curses. |
| Hidden information curses | MISSING (deferred) | Out of scope (info wave). |
| Visible countdown curses | THIN | Bad Omen, Beacon of Woe show fuses. Room. |
| Chained / trigger-into-trigger | THIN | Compounding Misery, Contagion. Room. |
| Temporary rule distortion | THIN | No Reins, Tolling Bell, Opposite Day, Pauper's Crown. Room. |

---

## 8. Animation reuse map (for the Animation Mapper)

**Resolution + registry mechanism.** Board resolves a card's visual as
`SIGNATURES[id]` (bespoke core, `BoardEffects.tsx`) `??`
`PLUGIN_SIGNATURES[id]` (plugins) `?? generated`. Plugins live in two files:
`sigPlugins.tsx` (eager facade + machine-generated `PLUGIN_IDS` id list,
regenerated by `check-sig-plugins.cjs`, CI-guarded) and
`sigPluginsMerged.tsx` (lazy, merges all `PLAYS`). A `SigPlugin` =
`{ config, Render }`; `config` carries `ordering`, `staggerMs`, `victims`,
`sound` (a `SigSoundKey`), and optional `source` (a `SigZone`).

**Three binding forms:**
- **G-form** `G(Template, palette, glyph, config, flourish?)` - shared
  parameterized template + per-card palette array + `GLYPH[id]` node + a
  per-card `flourish` string that arms a card-specific dressing block. The
  primary reuse target.
- **B-form** `B(Template, palette, id, config, bold?)` (basicPlays) - same
  idea but the glyph auto-derives from the card's own face icon; family "tell"
  comes from an `FxKind` tag, not a flourish string.
- **S-form** `S(Scene, config)` - a fully bespoke one-off scene. Reserve for
  T7-T8 marquee cards.

Play modules merged in `sigPluginsMerged.tsx` (each exports `PLAYS`):
`basicPlays`, `godPlays`, `greatPlays`, `funnyPlays`, `personalPlays`,
`memePlays`, `stubPlays`, `prankPlays`, `casinoPlays`, `boonPlays`,
`cursePlays`. A card id maps to a play via the merged registry; entries are
either **G-form** (reusable template + palette array + GLYPH + trailing
flourish string) or **S-form** (a fully bespoke `S(Scene, {...})` scene). New
wave-3 cards should reuse a G-form template with a fresh flourish where the
motif fits, and reserve bespoke S-form scenes for T7-T8 marquee cards
(matching the wave-2 cadence: unique flourish per T1-T6 card, bespoke scene
per T7-T8 card).

**Wave-2 boon templates (`boonPlays.tsx`), reusable with new flourishes:**
- `DawnHalo` - dawn/blessing halo (miracles, wards, revivals).
- `Reliquary` - relic/reliquary reveal (grants, contracts).
- `AstralAnvil` - levelling scale / forge (transformations, trades).
- `PactScroll` - unfurling pact/contract scroll (draft bets, oaths).
- `FalconDash` - snapping dash/relocate (movement, hit-and-run).
Bespoke boon scenes (T7-T8): `KingmakerScene`, `BoltHoleScene`,
`CarnivalScene`, `RestitutionScene`, `LongTruceScene`, `GreatReturnScene`,
`ShadowReserveScene`, `EternalKeepScene`.

**Wave-2 curse templates (`cursePlays.tsx`), reusable with new flourishes:**
- `HexBrand` - seal slams down, scorch ring sears (marks, taxes, bans).
- `OmenBell` - bell descends and rocks, toll ripples (countdowns, fuses).
- `BlightGarden` - rot spreads tile by tile (contagion, trails, terrain).
- `ChainWeb` - chains whip and cinch a shackle (binds, leashes, recoil).
- `MidasVeil` - gold veil crosses, figures gild in sequence (transfers,
  accumulating marks).
Bespoke curse scenes (T7-T8): `DeathKnellScene`, `HollowCrownScene`,
`TideOfAshScene`, `CrownOfThornsScene`, `PauperCrownScene`, `BeaconOfWoeScene`.

**Constraints (all plays):** self-contained SVG + CSS keyframes,
transform/opacity only, `--fx-dur` scaled, one-shot `both` fill, end at
opacity 0, parked under `html[data-anim="off"]`. Sounds must reuse existing
`SigSoundKey`s only - no new sound assets. Do not touch the shared-flagship
baseline (`test:animations`); every new card ships its own flagship.

### 8b. Full parameterized-template catalog (primary reuse targets)

**`basicPlays.tsx`** (T1-4 band, ~296 cards, B-form, glyph = card face icon):
`SigilRing` (warding ring, protections), `RuneStamp` (curse rune stamps and
drips, muzzle hexes), `ChainLash` (chain whips taut, jails/anchors/caps),
`ColdSnap` (frost spokes, freezes), `StoneShell` (granite shells slam,
walnut/petrify), `GlintArc` (glint arcs, slider/step grants), `HoofSpring`
(spring launches, leaps), `PennantRaise` (pennant snaps, musters/marches),
`ScrollSnap` (edict unrolls and snaps, draft denial), `CardFlick` (card flips
up, own draft tricks), `EyeBlink` (eye opens/blinks, info reveals), `KeyTurn`
(key turns in lock, castling bans/sealed gates), `LanternLift` (grave-lantern
lifts, revives/returns), `SatchelDrop` (satchel plops, pocket grants/items),
`CogTick` (gear ticks, clock/undo/skips), `BellToll` (bell swings, nerf-relief),
`LeafSpin` (leaves orbit sprout, nature/fae/fruit), `PrismFlash` (prism fans
light, teleports/swaps/warps), `BannerMuster` (standard unfurls, summons),
`InkSplash` (ink blooms, conversions/steals).

**`greatPlays.tsx`** (T5-6 band, ~115 cards, G-form): `WitchCircle` (hex sigil
ignites, curses), `StoneGaze` (gorgon petrifying beam), `ColdFront` (ice front
sweeps crop, freeze), `SiegeRoll` (siege engine strikes, bombs/barrages),
`WarBanner` (command banner + shield ranks, protection/musters), `Grove` (great
tree bursts, nature/roots/blooms), `PhantomParade` (spectral procession,
spirits/veils/phasings), `ClockSpire` (clock tower pendulum, tempo/stolen
hours), `CardRite` (colossal card dealt, drafts/fates/contracts), `ThiefHand`
(shadow gauntlet drags prize off, steals/seizures/nullifies), `CrownForge`
(anvil + hammer, promotions/reforgings), `RiftGate` (obelisks + aurora pane,
teleports/conjurings/mirrors), `BeastRush` (horned beast charges,
hunts/mounts/charges).

**`godPlays.tsx`** (T7+ spectacle, ~68 cards, G-form): `GodDescent`,
`TitanRise`, `SkyWrath`, `AbyssMaw`, `ReaperSweep`, `HostMarch`,
`CelestialRing`, `FrostTitan`, `ForgeColossus`, `GorgonIdol`, `ChronoLord`
(+ apex-only single-card `SkullStrike`, `PlanetAlign`). Use these for wave-3
T7-T8 boons/hexes when a bespoke S-scene is not warranted.

**Mapping guidance for wave 3:** boon/curse waves have their own G-templates
(above) which are the natural first choice; fall back to greatPlays/godPlays
templates for T5-T8 cards whose motif matches, and only author a new S-scene
for a genuinely singular marquee card. Fully bespoke modules (funnyPlays,
personalPlays, memePlays, stubPlays, prankPlays, casinoPlays) are NOT reuse
targets - they are one-scene-per-card sets.

**Sounds - reuse only, no new assets.** The 24 `SigSoundKey`s
(`BoardEffects.tsx`): `nova`, `cataclysm`, `extinction`, `lightning`,
`atomic`, `rampage`, `siege`, `coronation`, `crownrain`, `colossus`, `snooze`,
`clockcage`, `clockice`, `blitz`, `massfreeze`, `petrify`, `petrifiedforest`,
`aegis`, `cathedral`, `shades`, `wall` (plus a few batch-1 voices). `SigZone`
target-source tags: `removal`, `frozen`, `walnut`, `shield`, `kingSafe`,
`stun`, `empower`, `slow`, `blindfold`, `rally`, `summon`.

### 8c. Passive visuals (data-driven, separate system)

`kind:"passive"` boons/hexes and every nerf rule get a **passive** visual, not
a play. Vocabulary (`passive/spec.ts`): 9 families (`strike`, `bind`,
`fracture`, `territory`, `veil`, `decree`, `tempo`, `summon`, `blessing`); 22
reusable primitives (`bolt`, `shockRing`, `crackLines`, `crystallize`,
`chainLink`, `sigilStamp`, `zoneSweep`, `edgeBurn`, `fogRoll`, `beamVertical`,
`beamHorizontal`, `dropImpact`, `riseGlow`, `moonCircle`, `gateSlam`,
`cardLift`, `weightDrop`, `tickPips`, `orbitSpark`, `shatterExit`, `drainFlow`,
`pulseRing`); 12 targets; 8 palette roles; aura/pulse/exit keys. Lifecycle
components: `PassiveSpawn` (intro), `PassiveAura` (standing motif), `PassivePulse`
(trigger flash), `PassiveExit` (fade). Compositions live in the AUTO-GENERATED
`passive/compositions.ts` (639 entries: 358 nerf + 281 buff), regenerated by
`gen-passive-compositions.ts`; each card's family+primitives+target+sigil
"sentence" must be UNIQUE (`test:passive-registry`). A wave-3 passive card
needs a composition tuple, produced by the integrator's regen - designers just
supply a card whose semantics derive cleanly (distinct family/target).

---

## 9. Mobile / spectator behavior

Searched the engine and effects tree: **there is no per-card mobile-specific
handling.** Animation reduction is a single global switch
(`html[data-anim="off"]`) that parks all keyframes; there is no per-card
mobile branch, no mobile-only card text, and no card that behaves differently
on mobile. Spectator/replay parity is handled generically by
`useSignatureQueue.ts` (plays queue identically in local, online, and
spectator contexts) and by the deterministic-replay rules (RNG only in
replayed hooks). Wave-3 designers therefore do NOT need mobile-specific logic;
they need only (a) determinism and (b) an animation that degrades to nothing
under `data-anim="off"`. State this plainly to the owner: no per-card mobile
work exists or is required.

---

## 10. WAVE 3 PRESCRIPTION - BOONS (target 44 cards)

Owner identity brief: boons must feel **special / transformative / miraculous
/ contract-like**, never numeric upgrades or plain shields. Tier mix
(fills the thin top and mid): **T1:3 T2:4 T3:5 T4:6 T5:6 T6:7 T7:7 T8:6.**
Per-family quota with seed directions (directions only - the designer owns
the creativity; every card must be a distinct MECHANIC checked against
sections 4-6):

- **Transformations (5):** army/identity transforms with a real cost - e.g.
  swap a piece's move-set with a captured enemy's; a temporary "amazon" grant
  via timed_loss demote; a positional metamorphosis gated on being behind.
- **One-time miracles (5, T6-T8 heavy):** board-state rescues - e.g. a single
  reset of your king to safety; a symmetric ceasefire variant that is
  strictly better when behind; an all-or-nothing swing that spends future
  drafts.
- **Movement grants (4):** conditional/terrain movement - e.g. a piece that
  phases through your own pawns for N turns; king-safety footwork gated on
  check; a one-shot long relocation.
- **Draft / economy bets (4):** self-draft cadence and banking plays - e.g.
  trade a reroll for a forced high tier; convert held cards into pocket
  material; a bank-track gamble distinct from Ascetic's Bargain.
- **Clocks (3):** write-only, self-favoring - e.g. capture-triggered self
  time gain with charges; a one-shot steal on promotion; a time cushion on
  reaching a rank. (No reads, no addOppSec.)
- **Comeback / behind-gated (4):** scale with material or on-board deficit -
  e.g. auto-revive when outnumbered on a type; a movement or protection buff
  that switches on only while behind.
- **Conditional piece protection (4):** positional/relational wards, not
  blanket shields - e.g. a piece uncapturable while defended by a pawn; a ward
  that moves to whichever piece is most attacked; immunity only on a specific
  rank.
- **Friendly terrain control (3):** the boon mirror of barred zones - e.g.
  claim a file your pieces cross safely; a safe-square your king may always
  flee to; a diagonal your bishops phase along.
- **Promotion / castling miracles (3):** e.g. an out-of-turn castle;
  promotion to a chosen minor as a one-shot; a pawn that promotes one rank
  early once.
- **High-risk removal / duels (3):** self-cost surgical removal - e.g.
  sacrifice a piece to remove two enemy minors; a duel that trades kings'
  guards; a detonation you aim at your own captured square.
- **Summoning miracles (2):** placePieces with a cost - e.g. summon a wall of
  pawns that expire; call back a captured major to your home rank at the cost
  of a draft.

---

## 11. WAVE 3 PRESCRIPTION - HEXES (target 40 cards)

Owner brief: hexes are CURSES (marks, contracts, delayed punishments,
triggered rules), never plain purple restrictions. Tier mix (biased to the
families the pool lacks, NOT more freeze/stone/zone):
**T1:4 T2:5 T3:6 T4:6 T5:6 T6:5 T7:4 T8:4.** Every seed names its
**counterplay axis** (the concrete thing the victim does to play around it).

- **Piece possession / turncoat (4) [HIGH NOVELTY - open family]:** temporary
  owner-flips via setPieceColor. Seeds: a minor defects for N turns then
  returns; a piece obeys the caster on alternating turns; a captured-then-
  possessed piece. *Counterplay axis:* the flipped piece can be captured/traded
  to end it; king never flippable; effect is timed and reverts.
- **Summoned hazards (4):** caster places a hazard on the victim's board.
  Seeds: a roaming void that drifts one square/turn; a spawned "creature"
  square that bars an area; a growing bramble. *Counterplay axis:* visible,
  route around it, or capture the hazard's anchor.
- **Mirrored / sympathetic (3):** actions on one piece rebound to another.
  Seeds: paired pieces share damage; moving a major stuns a linked minor;
  capturing feeds a linked curse. *Counterplay axis:* bench one of the pair,
  or break the link by trading.
- **Delayed board changes / countdowns (5):** visible fuses that reshape the
  board. Seeds: a rank that collapses on turn N; a piece that transforms at a
  deadline unless it acts; a spreading blackout of squares. *Counterplay axis:*
  stated schedule, strike or evacuate before it lands.
- **Marked-piece contracts (5):** a marked piece with a stated escape.
  Seeds: a piece that must reach a square or crumble; a mark that jumps on
  contact; a doomed piece cured by capturing. *Counterplay axis:* the cure is
  always an action in the victim's hands.
- **Capture-conditioned (4):** triggers keyed on the victim capturing. Seeds:
  each capture bars the landing square; each capture ages a piece; a capture
  budget that morphs when spent. *Counterplay axis:* capture selectively, or
  refuse trades.
- **Check-triggered / king-movement (3):** Seeds: checking the king roots the
  checker; a king move taxes the next turn's piece class; castling triggers a
  delayed freeze. *Counterplay axis:* attack elsewhere, or keep the king still.
- **Stacking / chained curses (3):** scale with other active curses or chain
  into each other. Seeds: a curse that strengthens per active hex; a curse
  that spawns a lesser curse on trigger. *Counterplay axis:* strongest only
  when already buried; cleansing one weakens the chain.
- **Transferable / contagion (3):** Seeds: a rot that spreads to adjacent
  friendly pieces; a curse that hops on capture; a debt passed by proximity.
  *Counterplay axis:* quarantine the carrier, capture it to end it.
- **Temporary rule distortion (3):** Seeds: their pieces must alternate
  color-of-square; promotion inverts to a minor for N turns; a cadence flip.
  *Counterplay axis:* schedule play around the distortion window; kings exempt.
- **Promotion / tempo taxes (3):** Seeds: promotion costs a frozen turn on a
  second piece; a use-tax on their most-moved piece; a delayed skip banked
  against a future capture. *Counterplay axis:* delay the taxed action or pay
  knowingly.

Note: hexes have 3 apex (T9) curses; do NOT design T9 hexes this wave (apex is
grant-only and out of the normal pool).

---

## 12. Naming guardrails

**Reserved prefixes:** boons `bw3_`, hexes `hw3_`, nerfs `nw3_`. No `bw3_` /
`hw3_` / `nw3_` ids exist yet (verified). Keep every card `implemented: true`
and built on section-2 primitives only.

**Do not collide with these existing evocative names.** Boons (all 88 named
above in section 1's source list) include: Ancient Custom, Divine Right,
Scarecrow, Pioneer's Banner, Ascetic's Bargain, Jester's Rule, Hit and Run,
Cornered King, Masquerade, Queen's Testament, Spoils of War, Blood Price
(boon), Diplomatic Immunity, Deathless Oath, Blood Duel, Highwayman's Toll,
Prisoner Exchange, Early Coronation, Alchemist's Trade, Standard Bearer,
Kingmaker's Pact, Bolt Hole, Carnival of Masks, Restitution, The Long Truce,
The Great Return, Shadow Reserve, The Eternal Keep, plus Aegis / Absolute
Aegis / Iron Reign / Fortress Realm / Checkmate Denial / Transcendence /
Chess Diff / Nerf Breaker and the relief family.

Hex names already used (avoid): the full stone/frost/sealed/queen clusters in
section 5, plus every `hw2_` name (Witch's Veto, Bad Omen, Cold Footprints,
The Long Road Home, Blood Price, Tarnished Crown, Tolling Bell, Curse of
Recoil, No Reins, War Rations, The Witching Hour, Weight of Toil, Compounding
Misery, Twinned Torment, Cursed Coin, Creeping Blight, Queen's Ransom, Chains
of the Court, Gathering Storm, Gravebloom, Gilded Rot, Death Knell, The Hollow
Crown, Tide of Ash, Crown of Thorns, Pauper's Crown, Beacon of Woe) and the
apex trio (Blackout, Mass Petrify, The Culling).

**Near-duplicate NAME hazards already in the pool** (do not add a third):
Basilisk's Stare (`medusa_stare`, T8) vs Basilisk's Gaze (`basilisk_stare`,
T3); Medusa's Stare vs Medusa's Verdict; Stone Curse vs Stone Menagerie vs
Stone Riders/Prelates/Bastions; Sealed Orders/Gate/Avenues/Archive/Ramparts;
Scorched Middle vs Scorched Earth; Leaden Queen/Crown/Fields/Limbs; Royal /
Queen's Handicap.

### 12b. Themed-collection reservoirs and existing cross-collection collisions

The largest evocative-name reservoirs (skim these before naming): the
`hexes/` NEW_HEXES set (tier1-8 + wave2, listed in full in the survey), and
`wild/` (`wa_`, `wc_`, `we_`, `ww_` prefixes) which already consumes most
stone/frost/crown/war names. Other themed sets: `fantasy/` (Excalibur, Horn
of Summoning, Divine Reckoning, Withering Touch, Wall of Thorns, Metamorphosis,
Apotheosis...), `funny/` (Time Thief, Computer Virus, Ban Hammer, Cream Pie,
Rubber Chicken, Gremlins, Vertigo, Opposite Day...), `mystic/` (North Star,
Oracle's Eye, Third Eye, Hex Doll, Ley Line, Lunar Eclipse...), `pt/` (Jackpot,
All In, Groundhog Day, Contagion, Termites, Rust, Hot Potato...),
`brainrot.ts` / `personal.ts` (owner's personal + meme sets - do not touch).

**Names ALREADY duplicated inside the codebase (do NOT add a third):**
Frozen Moment (wild + hex), Frostbite (wild + hex), Leaden Crown (wild + hex),
Stage Fright (wild + hex), Butterfingers (wild + hex), Blood Price (boon +
hex), Basilisk's Stare vs Basilisk's Gaze, Medusa's Stare vs Medusa's Verdict,
Roulette vs Roulette Wheel, Clone vs Clone Army, the "Double ..." trio.

**Confirmed still-free example name:** "Phoenix Line" appears nowhere - safe to
use. But "Cold Snap" and "The Witching Hour" are TAKEN (do not reuse). Always
grep the id AND display name across `src/engine/buffs/**` before committing to
a name.

---

## 13. House rules to restate for the designers

1. **Determinism.** RNG only via `api.rng`, and only inside init / effect /
   onMovePlayed (the replayed hooks). Never in `targets()` or `status()`.
2. **Non-empty move-filter fallback.** Every `filterOpponentMoves` /
   `augmentMoves` path must leave the affected side with at least one legal
   move. Use `curse` / `permaOppFilter` / `timedOppFilter` which enforce this.
3. **Kings are sacred.** Never freeze, walnut, petrify, remove, transform,
   flip the color of, or bind a king.
4. **Pawns never on rank 1/8.** Use `pawnRankOk` on every placement / revive /
   relocation / transform touching a pawn.
5. **No em-dash or en-dash characters in any card `name`, `description`, or
   `flavor` string.** `scripts/test-hexes.cjs` enforces this. Use hyphens or
   restructure the sentence.
6. **Every card `implemented: true`** and built only on section-2 primitives.
   No new engine fields, no new `ActiveEffect` kinds, no new API mutators.
7. **Clock touches** go through `api.adjustClock` intent only (write-only,
   clamped, no-op untimed).
8. **Board mutations** go through the BuffApi mutators (so mutation
   bookkeeping and the hook-reveal path work); deduct revive pools
   (`markRevived` / `theirs.revived`) whenever you consume a captured pool.
9. **Combo tags:** if your card chains turn-skips, stacks draft denial, or
   freezes/petrifies a whole army, name the `COMBO_TAGS` family in your notes.
10. **Validation before hand-off:** `tsc --noEmit`, `eslint` on touched files,
    `test:rules` (hex static validation), `test:nerfs` if nerf-adjacent,
    `test:desync`, `test:animations`. Do not run generators
    (`gen:icons`, `check-sig-plugins`, passive regen) - that is the
    integrator's step.
