# Tier 1-8 Upgrade Visual Audit & Redesign — 2026-07-17

Scope: every tier 1-8 buff, nerf, passive, usable ability, and hex (1193
implemented upgrades: 674 buffs, 177 hexes, 342 nerfs). The machine-readable
registry lives in `docs/animation-registry.json` (regenerate with
`npm run test:animations -- --write`); the CI gate is `npm run test:animations`.

## 1. Classification (full tier 1-8 audit)

Every upgrade was classified by its flagship-animation identity, derived from
the real tables (core SIGNATURES, plugin PLAYS modules, passive compositions):

| Tier | Upgrades | Keep unchanged | Minor polish | Partial redesign | Full redesign |
|---|---|---|---|---|---|
| 1 | 72  | 23  | 49  | 0 | 0 |
| 2 | 115 | 45  | 70  | 0 | 0 |
| 3 | 195 | 90  | 105 | 0 | 0 |
| 4 | 243 | 126 | 117 | 0 | 0 |
| 5 | 227 | 177 | 0   | 50 | 0 |
| 6 | 168 | 142 | 0   | 26 | 0 |
| 7 | 100 | 100 | 0   | 0 | 0 |
| 8 | 73  | 73  | 0   | 0 | 0 |
| **Total** | **1193** | **776** | **341** | **76** | **0** |

- **Keep unchanged (776)** — owns a unique flagship: a bespoke per-card scene,
  a template + unique structural flourish, a unique core visual key, or (for
  every nerf) a unique passive composition sentence. Untouched except for the
  system-wide technical fixes in §7-§9.
- **Minor polish (341)** — tier 1-4 cards on shared per-square machinery
  (basicPlays templates) that already carry per-card identity through a
  hand-drawn emblem + palette. Sanctioned as shared utility at piece-level
  tiers ("fast, small, clear"); the ratchet keeps this band from growing.
- **Partial redesign (76)** — tier 5-6 cards still sharing a core visual with
  one or two siblings after this pass (full list in §10). The debt is frozen
  by the baseline ratchet: it can only shrink.
- **Full redesign (0 remaining)** — all 70 upgrades that entered the audit in
  this bucket (tier 7-8 sharing a flagship) were redesigned this pass.

## 2. What the audit found (before this pass)

- **Reused flagship animations:** 599 upgrades across 97 groups shared a
  flagship (255 at tier ≥5) — e.g. 20 hexes all played the same WitchCircle
  scene with only palette/glyph changes; 13 tier 7-8 cards shared GodDescent;
  `colossus`/`titan`, `queens_rampage`/`queens_wrath` shared core visuals.
- **Missing animations:** 0. Every implemented tier 1-8 upgrade resolves to a
  flagship (enforced as failure condition F1).
- **Broken/degraded behaviors:** simultaneous plays coalesced to one visible
  animation (single signature state slot, audit R9/R10); the OS
  prefers-reduced-motion flag was deliberately ignored; the nerf reveal's
  main visual was a full-width text stamp.

## 3. Redesigns implemented (151 upgrades given their own flagship)

- **greatPlays (tier 5-6): 87 structural flourishes** — every card sharing
  WitchCircle / StoneGaze / ColdFront / SiegeRoll / WarBanner / Grove /
  PhantomParade / ClockSpire / CardRite / ThiefHand / CrownForge / RiftGate
  now plays a scene matched to its own mechanic (puppet strings descend and
  yank for `mind_control`, railroad spikes hammer the rank for `iron_furrow`,
  a shadow disc occludes the moon for `lunar_eclipse`, weapons slip and
  clatter for `palsied_hands`, ...). One vanilla baseline card kept per
  template.
- **godPlays (tier 7-10): 43 structural flourishes** — every shared
  GodDescent / TitanRise / SkyWrath / AbyssMaw / ReaperSweep / HostMarch /
  CelestialRing / FrostTitan / ForgeColossus / GorgonIdol / ChronoLord card
  now has its own scene (marionette control-bar for `wa_dominate_major`, ice
  sarcophagi for `glacial_tomb`, portcullis drops for `sealed_ramparts`, a
  mirrored backward time-sweep for `full_rewind`, ...). Power forms vary:
  sealing, gravity, corruption, transformation, summoning, freezing, time
  distortion — no generic full-screen explosions added.
- **Core signatures: 21 visual splits** — all 15 tier 7-8 cards that shared a
  core visual got their own key (`fourstrike` for `blitzkrieg`, `permafrost`
  for `eternal_freeze`, `titanforge` for `titan`, `tribolt` for
  `heavens_wrath`, `clockseal` for `time_lock`, `queensweep` for
  `queens_rampage`, ...) plus 6 tier 5-6 splits from the biggest groups.

## 4. Nerfs (342) — generic text popup removed

- The mechanic-matched entrance system is the passive effect language
  (`src/components/effects/passive/`): every nerf has a unique
  (family, primitives, target, sigil) composition — bind locks movement,
  tempo effects mark the clock, piece debuffs attach to pieces, zone hazards
  sweep the affected tiles, veils roll occlusion, king effects mark the king.
  Coverage + uniqueness are CI-enforced (`npm run test:passive-registry`).
- **This pass removed the last text-first element:** the reveal splash's
  full-width "YOUR RULE TAKES THE BOARD" name stamp is now a small caption at
  the board's foot that fades in only after the reveal composition has landed
  (~30% in). Text is a supporting label, never the effect.
- Persistent harmful state: target-taxonomy auras (per-piece rings, file/rank
  washes, zone tints, clock accent) + the "Against you" dock rows; trigger
  pulses on rejection; exit treatments per family (chains fall away, glass
  shatters); per-card tinted NerfAura on affected squares.

## 5. Hexes (177) — no more interchangeable purple smoke

- Hexes are drafted cards and play cast spectacles (a different pipeline from
  nerf reveals), so a hex never uses a nerf entrance.
- The 20-card WitchCircle hex pool — previously one purple scene with
  different icons — now has a unique structural curse per card (§3).
  GorgonIdol and ReaperSweep hex-family cards were likewise split.
- Persistent curse marks: motif badges (jail/muzzle/anchor/blindfold/slow)
  stamped with the card's own icon, walnut/freeze skins (20 distinct skins),
  per-card tinted auras, countdown chips for timed curses, cleanse handled by
  the effect-expiry visuals and passive exits.

## 6. Passives & usable abilities

- **Passives (251 buff passives + all nerf rules):** spawn intro on
  activation, persistent aura at the target, trigger pulse, exit animation,
  status entries in the dock, tooltips via EffectPopover, spectator parity.
  Registry-enforced; a passive without an entry fails the build.
- **Usable abilities (activated cards):** dedicated Use button with
  available/"Your turn only" disabled states, usable-count badge, charge and
  turns counters, on-board targeting mode with legal-target highlights,
  invalid-target flash naming what is targetable, Done for finishable steps,
  Cancel button + **Escape** + (new) **Enter** for Done, desktop
  drag-to-board, mobile drawer with 44px touch targets that auto-collapses
  during targeting. (No cooldown mechanic exists in the game — cards are
  one-shot or charge/turn-limited, and those states are all surfaced.)

## 7. System fixes (this pass)

- **Simultaneous plays fixed (R9/R10):** `useSignatureQueue` serializes the
  signature slot on all three surfaces (local, online, spectator) — several
  cards triggering on one move each play their spectacle 2.6s apart instead
  of batching to the last. Keeps the draft-overlay hold-and-replay behavior;
  timers cleaned up on unmount.
- **OS reduced-motion honored automatically:** new `followSystemMotion`
  setting (default on) folds `prefers-reduced-motion` into the `data-anim`
  gate with a live media-query listener; in-app toggles still win when the
  user opts out.
- **Draft previews:** every draft card (buff offers + both opening-nerf pick
  surfaces) shows a small looping motif medallion — 14 motif loops mapped
  from the 37 generated families and 9 passive families, tinted with the
  card's own effect palette, stamped with its face icon. Never the full
  flagship. Pauses offscreen (shared IntersectionObserver) and on hidden tabs
  (visibilitychange); static under reduced motion; ≤4 animated nodes,
  transform/opacity only.
- **Dev galleries:** `/dev/plays` (new — flagship art per card, per-tier
  filter, click-to-replay) beside `/dev/effects` (passive layer).

## 8. Animation registry & duplicate detection

`scripts/audit-animations.ts` (`npm run test:animations`) builds one entry per
upgrade — name, tier, keep/redesign status, animation id, main object,
entrance style, motion path, particle type, board reaction, piece reaction,
persistent effect, sound family, ending effect — and fails CI on:

- **F1** an upgrade with no flagship animation,
- **F2** two upgrades with byte-identical flagship dressing,
- **F3** growth of the shared-flagship debt past `scripts/anim-baseline.json`
  (a ratchet: currently 76 at tier ≥5 / 417 total, shrink-only),
- **F4** parser drift against the real PLAYS/SIGNATURES tables.

Shared utility effects (small sparks, target highlights, common washes,
status transitions, button feedback) remain shared by design; the gate only
polices flagship identity.

## 9. Performance, mobile, reduced effects

- All flourishes/splits are transform/opacity only, bounded particle counts
  (≤16 nodes), no new blur/filter animation, and ride the existing
  `html[data-anim]` + `--fx-dur` gates, so animation-off and duration scaling
  carry over automatically.
- Effects intensity ladder (pre-existing, verified): FX dial Off / Calm /
  Normal / Epic / Max — functional reads (freeze tint, shield ring, check)
  are never scaled; Off keeps full gameplay information. Passive intros
  collapse to a 160ms fade + static sigil under reduced motion; auras remain
  (they are information).
- Board crop is `overflow: hidden`, board-wide scenes center on the board
  (leadShift/cellStage), z-bands keep effects under the drag layer and HUD —
  effects cannot cover controls or leave the viewport.
- Lazy-loading: the ~9k-line plugin art rides the code-split
  signature-visuals chunk, prefetched on board mount; LagWatch offers
  performance mode on sustained jank instead of silently degrading.

## 10. Remaining issues (honest debt, frozen by the ratchet)

- 76 tier 5-6 cards still share a core visual in 46 small groups (max 3
  members), e.g. `disintegrate` (annihilate/purge/shatter), `wardpulse`,
  `arclight`, `wings`, `portal`, `inferno`, `reinforce`, and 23 two-card
  pairs. Each shares only with 1-2 siblings and differs in palette, victims
  and ordering; they are classified **partial redesign** in the registry.
- 341 tier 1-4 cards ride shared basicPlays machinery with per-card emblems
  (**minor polish** classification; per the tier ladder low tiers are meant
  to be small and fast, but per-family tell beats per the design brief remain
  desirable).
- The lazy-chunk race window (a card played in the first moments after mount
  can render its generated fallback once) is unchanged — pre-existing,
  mitigated by prefetch.
- Browser matrix: verified in Chromium (desktop + 390px mobile viewport);
  Firefox/Safari/device testing not run in this environment. All new motion
  uses the same transform/opacity primitives as existing shipped effects.
- Sound: no new audio keys were added; every redesigned card reuses its
  existing signature voice.

## 11. Verification run

- `npm run test:animations` — PASS (1193 covered, 0 missing, 0 exact dupes,
  ratchet baselined at 76/417)
- `npm run test:passive-registry` — PASS (593 entries, unique sentences)
- `npm run test:rules` — PASS (icons check, hex validation, sig-plugins drift)
- `npx tsc --noEmit` — clean; `npm run lint` — clean
- Screenshots: per-tier grids from `/dev/plays` (tiers 1-8, desktop + mobile)
  and the `/dev/effects` passive gallery, captured via Playwright/Chromium.
