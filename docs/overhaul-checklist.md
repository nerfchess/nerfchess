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
| 1 | Persistent checklist + roster docs in repo | DONE |
| 2 | Audit matrix of all existing cards (docs/card-audit.md + scripts/audit-cards.ts) | DONE: 2443/2443 rows reviewed. Unflagged harness-executed rows auto-keep; all 578 flagged rows carry curated decisions in card-actions.json (656 entries) |
| 3 | Draft RNG fairness + seeded distribution tests | DONE (draft.ts weighting removed; scripts/test-draft-fairness.ts, npm run test:draft-fairness, 23 checks green; sims updated to fair expectations) |
| 4 | Buff-mode Nerf-reference purge | DONE (genesis reworked to pure reset; chess_diff + glossary text neutralized; 6 dual-effect nerf-text boons excluded from buff pool via NERF_REVEAL; gate: npm run test:buff-purity) |
| 5 | Broken/silent card fixes + dev diagnostics | DONE: 3 "broken cards" were stale sims (walnut, opening band, diff prize; all updated); bank-drop unmount bug fixed; anim-off feedback restored (CastTextFallback); lab run-all harness (test:lab) = the standing no-silent-failure gate, 2083/2083 PASS |
| 6 | Animation primitives expansion + gambling primitives | DONE: generated-finisher layer (8 endings), opener entrance generator, 28 outcome-honest gambling scenes (gamblingPlays.tsx) with the gamblingOutcome stash channel and 9 synthesized voices |
| 7 | Card laboratory (dev-only) | DONE: /dev/lab + scripts/lab-run-all.ts (npm run test:lab) |
| 8 | Balance pass | DONE: three targeted waves plus the full flagged-row sweep; 32 real dominations/duplicates fixed in the engine (opener two-use trades, coin riders, free-action timing for legacy suspensions, ten wave-4 hex redesigns/retunes); every keep names its differentiating axis |
| 9 | Implement 224 Buffs (tiers 1-8, incl. gambling) | DONE: 228 cards (224 + 2 gambling hexes + 2 gambling boons), library green in lab harness |
| 10 | Implement 300 Hexes + 300 Boons | DONE: hexes/wave4.ts + wave4b.ts (300 hx4_, split 38x4/37x4), boons4.ts + boons4b.ts (300 bn4_, same split); static hex validation + lab green |
| 11 | Animation/feedback improvement for every existing card | DONE: every card now has (a) a flagship play (core, plugin, or generated with per-card finisher; audit-animations F1 total, registry 2427 entries), (b) a per-card audio fingerprint, (c) an anim-off text fallback (CastTextFallback); passive registry covers all 1237 passives with unique sentences |
| 12 | Unique sound expansion | DONE: per-card audio fingerprints (cueVariation) on all 9 passive cue families + playCardUse; 9 gambling voices wired through playSignature; check-sound-coverage green over 1237 compositions |
| 13 | Performance / reduced motion / accessibility pass | DONE: heavy visuals (sigVisuals + plugin plays + gambling scenes) confirmed in one lazy prefetched chunk; icon registry is build-time generated with per-icon imports and dynamically imported on the homepage; compositions emitted in chunks; global html[data-anim=off] kill switch (auto-set from OS prefers-reduced-motion) covers every new animation; CastTextFallback keeps anim-off games readable |
| 14 | Verification (30-point acceptance list) + final report | DONE: full battery green (typecheck, lint, production build, rules/icons/hexes/sig-plugins, nerfs, fairness, purity, balance, lab 2083/2083, desync, apex, snapshot, spectator-sync, tv-spectator, archive-replay, replay-spectate, tv-snapshots, glicko, passive-registry 1237, sound, emdash, card-registry, card-audit, animations) |

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

## Late owner additions (2026-07-22 night, full autonomy continues)

- Leaderboard UI improvement; Codex UI intuitiveness overhaul.
- Square edges app-wide (rounded corners removed except semantic circles).
- Remove sort feature from TV live games list.
- 2 gambling hexes + 2 gambling boons (nerf-mode pools).
- OPENING BUFF DRAFT: buff-mode games start with an opener pick mirroring the
  opening nerf pair; ~250 unique tiny "opener" buffs, each with a unique
  entrance animation. Owner reviews the set after implementation.

## Decisions log

- 2026-07-22: Overhaul started. Roster approved with 29 replacements + 24 gambling cards; hexes/boons raised to 300 + 300; opening buff draft added (249 openers, offer index 0, rollOpenerOffers).\n- Icon capacity: face identity is now the (icon, variant) pair (cardFaceVariant); the library outgrew the lucide catalog.
- New buff modules live in `src/engine/buffs/overhaul/` (t1.ts .. t8.ts, gambling.ts); new hexes in `hexes/wave4.ts`; new boons in `boons4.ts`.
- Gambling RNG: all rolls via `api.rng` (deterministic, replay-safe); outcome stored in `inst.state` for animation honesty; odds stated in descriptions match code constants.
- Sound: new per-card cues synthesized in sounds.ts (`playCardCue(id)` layered voices); gambling gets bespoke voices (slots, wheel, dice, chips, crash).

## 2026-09 flagship: Lichess-exact UI, mod panel, retirement, 3D effects

Branch `claude/lichess-button-redesign-9nt1it`, PR #479. Every phase pushed separately.

### Sweep results
- Playwright walk of 43 routes at 360/768/1024/1280/1920, dark and light (430 loads): 0 horizontal overflows, exactly one h1 per page, no console errors except the Google sign-in script blocked by the sandbox proxy on /login (external).
- Mod panel click-through of every rail section, /mod/cards, /mod/house, /mod/stats/all and /mod/stats/humans with all non-destructive buttons pressed: no page errors, no 4xx/5xx from the mod APIs.
- Chest gallery (/dev/chest) and the isolated coin/die props verified frame by frame.

### Bugs found and fixed on the way
- Mod win-rate tables counted the Buff-mode `none` sentinel as the most common nerf (`api/stats`, `api/mod/overview`).
- Pages without their own `alternates` inherited the root canonical "/" (profiles, suggest, tutorial pages, every private surface). Each now carries a self-canonical; private ones are noindex.
- CSS-3D coin and die rendered flat: Chrome flattens `preserve-3d` while an opacity animation runs on the same element. Fade moved to the wrapper.
- Chest side faces stayed standing after the body settled away on open; they now settle with it.
- The retirement pass had retired 151 hand-animated plug-in cards (Heads or Tails among them) under the description-length rule, plus `chess_diff`, which the house bots name by id. Both classes are protected now.
- `ilovewhimperingaudios` (tier 9) had no USAGE_FLAGSHIPS entry; the usage guard was red on master.
- Tutorial page carried an eyebrow label over an oversized h2; both normalised.

### Guards
All `npm run test:*` suites green at the head (house-sim included). `test:e2e` requires the worker backend and was not run in the sandbox.

### Hand audit (2026-09-05)
Every active card was read category by category and judged by hand, not by the script's rules alone. Decisions live in `scripts/hand-audit.json`; `npm run gen:retirements` applies the cuts (reason `hand`) and `npm run gen:retiers` rewrites tiers in the definitions (`npm run test:hand-audit` guards them).
- 317 cards cut (170 of them pointing at the card that covers their ground). The main groups: file-specific opener twins (one pawn on one file may do X), cosmetic no-ops (22 down to 6), "mark plus reroll" variants, coin-flip twins, "escape clause" hexes whose first-move exemption doubled their length, two-phase and every-second-turn curses, random-square nerfs, and straight duplicates at a higher tier.
- 42 cards retiered where the tier contradicted the effect: Mass Freeze and Roulette up to 7, Overtime Pay (105 seconds at tier 2) up to 5, Amazon Knight up to 6, Twin Queens up to 7, Time Skip up to 6; weak tier 7 and 8 hexes (Donkey Ears, Glacier Gate, Choke Point, Falling Rubble, Pawn Embargo, Traitor's Gala, Lovestruck Majesty) down to 2 to 4.
- Pool after the pass: 743 retired, 1,437 active, 235 opening nerfs. Similarity baseline down from 50 pairs to 14.

### Balance (2026-09-05)
- Paired-game win-rate sweep (`scripts/sim-card-winrate.ts --games 16 --only gm_`) run on the gambling set: every card fired, none resolved at that sample (standard error around 12 points), so no tier moved on that evidence. A full-library sweep needs hours of a quiet machine and was not run in the sandbox.
- Tier corrections came from the hand read instead (42 retiers above), and the retirement rules keep dominated and duplicate cards out of the pools. Gambling payout text is asserted against the odds constants by the existing guards (`test:balance-fixes`, `test:card-audit`).

### Animation soak (2026-09-05)
- `/dev/plays` driven by Playwright: every scene on every tier page fired (988 plays, tiers 1 to 10), no page or console errors. Frame timing under headless software GL is not representative; the lab harness (`npm run test:lab`) covers every card's engine path with zero failures.
- Bug found on the way: the Buff-mode opening pack (`openerPool`) ignored retirements and could still deal a retired opener. Fixed, and `npm run test:retired` now asserts the opener pool too.

### Balance, full pass (2026-09-05, PR #482)
- Every active buff, boon and hex was checked against its own family with five structural lenses: dominance ladders (a broader effect never below a narrower one, one tier per doubling of pieces or duration, one for dropping a condition, one for free-action timing), twins priced apart (including retired twins whose surviving card was the underpriced one), permanent unconditional piece upgrades priced under the temporary anchors (floors: one-step add 3, extra piece-class 4, two pieces +1, amazon-class 7), riderless one-shot defence at tiers 1 to 3, and text that did not say what the code did.
- 334 tier moves (306 down, 28 up), all in `scripts/hand-audit.json` and pinned by `test:hand-audit`; every move has a `CARD_HISTORY` event. Anchors named in `scripts/test-balance-pass-2026-09.ts` as ladder invariants so a later blanket wave cannot silently undo them.
- Reworks: Warp Home is a free action, Hard Reset freezes the pawn when its home square is taken, Lifebloom returns the pawn to the fourth rank under a two-turn shield. 14 descriptions rewritten to plain statements of the effect. Retired: Nerf This (condition never fires), Midas Charter (boost window could never hold a draft), Checkmate Immunity (ward spent by the checking move), Clone Army and Rook to Chancellor (kept twins now price them honestly).
- Win-rate sizing: the full sweep (`--games 20`, four shards) ran at about 3.5 minutes per card under load, roughly 20 hours for the library, and was stopped; `sim-card-winrate.ts` gained `--ids` for a targeted re-measure of the moved cards, which runs after this PR and sizes any move by one step where the data disagrees.

