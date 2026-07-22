# Card System Overhaul: Persistent Checklist

Working branch: `claude/nerfchess-card-overhaul-rau24l`.
Authoritative roster for all new cards: `docs/overhaul-roster.md`.
This file is the cross-session source of truth for overhaul progress. Update statuses as work lands.

## Scope (owner-approved)

- Audit every existing card (registry currently: 1366 cards; 1006 buffs, 360 nerfs) into an audit matrix with per-card status and action.
- Fix every card that silently does nothing; add dev diagnostics.
- Every card (existing + new) gets a working, distinct animation including passives.
- Full balance audit: duplicates, dominated cards, retiering; automated checks.
- Buff mode must not reference Nerfs anywhere user-visible.
- Fair draft RNG: uniform pick within the eligible pool once tier is rolled; seeded statistical tests.
- Add 224 new Buffs (25 roster + 3 gambling per tier, tiers 1-8).
- Add 300 new Hexes + 300 new Boons (38/38/38/38/37/37/37/37 per tier each); many may derive from buff mechanics and reuse their animations (owner-approved).
- Gambling cards: server-seeded RNG, honest displayed odds, animations enact the actual roll/outcome (lootbox is an actual lootbox). Redesign v2: board-based payouts, minimal clock-time prizes.
- New cards overall must be time-light: clock effects only as garnish, never the core prize (owner request).
- Draft-skip clarity UX: popup animation for banked/blocked/dry skips + reveal of the opponent's pick that round + "opponent drafting" indicator.
- Final "lighter" pass: bundle/perf trim AFTER all content lands (owner request).
- Card laboratory (dev-only) for verifying every card.
- Way more unique sound effects; per-card audio identity.
- Performance, reduced motion, intensity setting, mobile.
- No em dashes in user-visible text. "Hexes", never "Hexs".
- Meta cards must never fake real account/payment/security warnings, steal input, hide the clock unfairly, permanently cover the board, or mislead about the game result.

## Phase status

| # | Phase | Status |
|---|-------|--------|
| 1 | Persistent checklist + roster docs in repo | IN PROGRESS |
| 2 | Audit matrix of all existing cards (docs/card-audit.md + scripts/audit-cards.ts) | TOOLING DONE (1366 rows; 126 dup-sig, 49 near-dup, 48 dominated-candidates, 2 misleading flagged). Per-card actions land via scripts/card-actions.json in Phase 8. |
| 3 | Draft RNG fairness + seeded distribution tests | DONE (draft.ts weighting removed; scripts/test-draft-fairness.ts, npm run test:draft-fairness, 23 checks green; sims updated to fair expectations) |
| 4 | Buff-mode Nerf-reference purge | DONE (genesis reworked to pure reset; chess_diff + glossary text neutralized; 6 dual-effect nerf-text boons excluded from buff pool via NERF_REVEAL; gate: npm run test:buff-purity) |
| 5 | Broken/silent card fixes + dev diagnostics | TODO |
| 6 | Animation primitives expansion + gambling primitives | TODO |
| 7 | Card laboratory (dev-only) | TODO |
| 8 | Balance pass (duplicates, dominated, retier) + automated checks | TODO |
| 9 | Implement 224 Buffs (tiers 1-8, incl. gambling) | TODO |
| 10 | Implement 100 Hexes + 100 Boons | TODO |
| 11 | Animation/feedback improvement for every existing card | TODO |
| 12 | Unique sound expansion | TODO |
| 13 | Performance / reduced motion / accessibility pass | TODO |
| 14 | Verification (30-point acceptance list) + final report | TODO |

## Architecture map (do not re-derive)

- Engine: `src/engine/buff.ts` (types: Buff, BuffApi, ActiveEffect, ClockRequest, DraftFlags), `src/engine/draft.ts` (tier curve, rollCards, banking, rerolls, combo tags), `src/engine/game.ts`, `src/engine/rng.ts` (seeded RNG; `api.rng` is the deterministic effect RNG - ALL card randomness must draw from it, only inside init/effect/onMovePlayed).
- Card definitions: `src/engine/buffs/library.ts` (`def(meta, mech)` pattern, TIER1..TIER8 + ITEMS), themed barrels: `hexes/` (tier1-8, wave2, wave3), `boons2.ts`, `boons3.ts`, `funny/`, `fantasy/`, `mystic/`, `wild/`, `crossref.ts`, `pt/`, `brainrot.ts`, `personal.ts`, `tier9.ts` (apex). All merged in `ALL_BUFFS`; pools per tier in `BUFF_POOL_BY_TIER` (implemented only).
- Helpers: `src/engine/buffs/helpers.ts` (activated/instant wrappers, freezes, shields, summons, revives, sweeps, teleports, timers).
- Hex = category "hex" (nerf-mode only). Boon = category "nerf" cards (relief) OR `boon: true` flagged light cards. Buff mode excludes hex + nerf categories (see draft.ts inMode).
- Animations: bespoke `SIGNATURES` in `src/components/effects/BoardEffects.tsx`; plugin plays in themed modules (`godPlays`, `greatPlays`, `funnyPlays`, `casinoPlays`, `boonPlays`, `cursePlays`, `memePlays`, `prankPlays`, `personalPlays`, `basicPlays`, `stubPlays`) registered through `sigPlugins.tsx` (eager facade) + `sigPluginsMerged.tsx` (lazy chunk); deterministic generated signatures for everything else in `genSignature.tsx` (37 families); canvas VFX layer `vfxSpecs.ts` + `vfx/`; passive lifecycle system in `effects/passive/` (9 families, 22 primitives, spec/derive/registry/compositions, doc: docs/passive-effect-language.md).
- Sounds: `src/lib/sounds.ts` (WebAudio synthesis; signature voices; passive family cues via playPassiveCue).
- Tests/scripts: `scripts/test-hexes.cjs`, `test-nerfs.cjs`, `test-passive-registry.ts`, `audit-animations.ts`, `check-sound-coverage.cjs`, `check-sig-plugins.cjs`, `gen-card-registry.ts` (--check), `check-emdash.ts`, `test-desync.cjs`, `test-apex.cjs`, `test-snapshot.cjs`. Run via npm scripts (see package.json). `npm run test:rules` is the core gate.
- Dev pages: `src/app/dev/plays` (PlaysGallery), `src/app/dev/effects`, `src/app/dev/chest`.
- Card registry snapshot: `docs/card-registry.json` (generated).

## RNG fairness findings (Phase 3 targets)

In `src/engine/draft.ts`:
1. `DRAFT_BASE_MULT`/`DRAFT_BOOST_MULT` (2 vs 3): Funny+PT+Fantasy collections 1.5x boosted in buff mode. REMOVE (equalize).
2. `APPEARANCE_MULT` (chess_diff x2 in all modes). REMOVE.
3. `HEX_SHARE = 0.6` bucket roll in nerf mode (category weighting). REMOVE: uniform across eligible pool.
4. `NERF_DECLINE_LIMIT` streak-based category suppression per player. REMOVE (streak-based weighting).
Keep: tier curve + jitter + top-tier slip gate (tier progression), banking (+1, apex gate), combo-tag exclusivity (visible pool rule), requires/dead-draft guard (technical invalidity), held-card exclusion, reroll exclusion, mod overrides (explicit admin tool), NERF_REVEAL buff-mode filter (dead card).

## Broken-behavior findings (Phase 5 queue; found during Phase 3, PRE-EXISTING on master)

1. `scripts/sim-hexes-items.ts`: Walnut Queen never lands its 3-turn walnut on d8 (4 checks fail). Root-cause the walnut effect path.
2. `scripts/sim-hexes-items.ts`: openingNerfPool holds tiers above 2 / pickNerfPair exceeds the tier-2 cap (2 checks fail).
3. `scripts/sim-chess-diff.ts`: the diff's winner is NOT handed the guaranteed tier-10 mythic (2 checks fail).

## Balance issues named by owner (must resolve)

- Weak Tier 8 temporary queen (6 moves) vs stronger lower-tier queen with atomic explosions after captures. Identify exact card ids in audit; strengthen/redesign/move.
- A Tier 3 card and a Tier 6 card both spawn a knight and pawn (or nearly the same action). Identify ids; differentiate or merge.
- One Tier 7 card takes both cards from the next draft; another similar-tier card takes both from the next TWO drafts (strict domination). Identify ids; fix progression.
(Statuses here must be filled in with real card ids and outcomes during Phase 2/8. Do not mark resolved without a diff.)

## Decisions log

- 2026-07-22: Overhaul started. Roster approved with 29 replacements + 24 gambling cards; hexes/boons = 100 + 100 total.
- New buff modules live in `src/engine/buffs/overhaul/` (t1.ts .. t8.ts, gambling.ts); new hexes in `hexes/wave4.ts`; new boons in `boons4.ts`.
- Gambling RNG: all rolls via `api.rng` (deterministic, replay-safe); outcome stored in `inst.state` for animation honesty; odds stated in descriptions match code constants.
- Sound: new per-card cues synthesized in sounds.ts (`playCardCue(id)` layered voices); gambling gets bespoke voices (slots, wheel, dice, chips, crash).
