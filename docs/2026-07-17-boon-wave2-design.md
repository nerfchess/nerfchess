# Boon Wave 2 — design notes (2026-07-17)

Batch scope: `src/engine/buffs/boons2.ts` (28 new boons) +
`src/components/effects/boonPlays.tsx` / `boonPlays.css` (flagship plays).
Both files were pre-wired into the registries (library.ts spreads
`BOON_WAVE2`; sigPluginsMerged.tsx spreads `BOON_PLAYS`), so this batch adds
no registry edits. The integrator runs `gen:icons`,
`check-sig-plugins --write`, and `test:animations --write` after all batches
land.

## Why these cards

The boon pool (~60 cards pre-wave against 609 pure buffs) was thin exactly
where the owner's identity brief wants boons to live: transformative states,
strategic exceptions, one-time miracles, comeback engines, meaningful costs.
The batch targets the starved tiers — **T1:2 T2:2 T3:3 T4:4 T5:4 T6:5 T7:4
T8:4** — and every card is a *mechanic*, not a number: before writing, I
surveyed every existing `boon: true` card, the whole `category: "nerf"`
relief family, the hex helper library, and the marquee cards in
library/fantasy/mystic/funny/wild/pt, and rejected any design that reduced to
a numeric tweak of one of them (list of rejects at the bottom).

## The cards

| id | name | T | cat | mechanic (one line) |
|---|---|---|---|---|
| bw2_ancient_custom | Ancient Custom | 1 | movement | one-shot augment: a pawn may take en passant "out of time" against any adjacent enemy pawn (promotes if it lands on the last rank) |
| bw2_divine_right | Divine Right | 1 | protection | permanent oppFilter: enemy *pawns* can never capture your king |
| bw2_scarecrow | Scarecrow | 2 | protection | place a pawn in your half under a permanent (999-turn) `freeze` (skin "roots"): an inert, capturable blocker |
| bw2_pioneers_banner | Pioneer's Banner | 2 | protection | passive, 3 charges: each piece that crosses into the enemy half gets a 1-turn single-square shield |
| bw2_ascetics_bargain | Ascetic's Bargain | 3 | draft | self `blockedDrafts+1`, then `prepThree` + `bankBonus` land on the following offer (blocked drafts skip rollOffer, so the flags survive — verified) |
| bw2_jesters_rule | Jester's Rule | 3 | protection | timedOppFilter(6): opponent can't capture the same piece *type* their previous move captured (reads board.history) |
| bw2_hit_and_run | Hit and Run | 3 | attack | passive one-shot: after your next capture the capturer relocates back to its origin square |
| bw2_cornered_king | Cornered King | 4 | movement | permanent augment gated on material deficit: while you have fewer non-king pieces, your king also moves as a knight |
| bw2_masquerade | Masquerade | 4 | pieces | activated: two of your n/b/r/q of different kinds swap *types* in place (material conserved) |
| bw2_queens_testament | Queen's Testament | 4 | pieces | passive trigger: when your queen is captured, up to two captured minors auto-revive near your home rank |
| bw2_spoils_of_war | Spoils of War | 4 | pieces | activated: your best captured *enemy* piece is placed on your home rank as yours, deducted from THEIR revive pool (`theirs.revived`) |
| bw2_blood_price | Blood Price | 5 | draft | activated: destroy one of your own pieces (counted loss) → `forceTier = 6` |
| bw2_diplomatic_immunity | Diplomatic Immunity | 5 | protection | bind one piece: filterOpponentMoves blocks its capture only while it stands in the *opponent's half* (permanent, conditional) |
| bw2_deathless_oath | Deathless Oath | 5 | pieces | bind one piece: the first time it is captured it auto-replaces at the nearest home-rank empty square, once (no revive pool spent) |
| bw2_blood_duel | Blood Duel | 5 | attack | activated: remove one enemy n/b/r AND your own piece of the same kind (both real losses) |
| bw2_highwaymans_toll | Highwayman's Toll | 6 | tempo | passive, 3 charges: each of your captures issues a ClockRequest stealing 8s (server-clamped, no-op untimed) |
| bw2_prisoner_exchange | Prisoner Exchange | 6 | pieces | instant symmetric revive: the best revivable piece of EACH side auto-returns near its own home rank |
| bw2_early_coronation | Early Coronation | 6 | pieces | timedAugment(3): pawn moves reaching relative ranks 6-7 gain a `promotion:"q"` variant (rides makeMove's promotion field) |
| bw2_alchemists_trade | Alchemist's Trade | 6 | pieces | activated pair: one n/b/r → queen, another n/b/r/q → pawn (cost-paired transformation, pawn-rank guarded) |
| bw2_standard_bearer | Standard Bearer | 6 | movement | pieceBound pawn: permanent queen-slides but *non-capturing* and never onto ranks 1/8 (pawn captures remain) |
| bw2_kingmakers_pact | Kingmaker's Pact | 7 | draft | instant: `stackBoost+1` (the persistent every-offer tier lift — first card ever to grant it), cost `rerollsLeft = 0` |
| bw2_bolt_hole | Bolt Hole | 7 | movement | augment, 2 charges, gated on `isInCheck`: king teleports to any empty square within Chebyshev 2 |
| bw2_carnival_of_masks | Carnival of Masks | 7 | pieces | activated: Fisher-Yates (api.rng) permutation of your non-king piece *types* across their squares, with deterministic pawn-rank repair |
| bw2_restitution | Restitution | 7 | pieces | instant comeback: for each type the opponent outnumbers you on-board, one captured piece of that type auto-revives |
| bw2_long_truce | The Long Truce | 8 | tempo | instant symmetric stasis: `shield`(null) + `king_safe` for BOTH colors, 2 turns each, + own `nerf_suspended` 4 |
| bw2_great_return | The Great Return | 8 | pieces | instant: ALL revivable captured pieces of BOTH sides auto-return (deficit side gains more; pools fully marked) |
| bw2_shadow_reserve | Shadow Reserve | 8 | pieces | instant: pocket grant n+b+r (crazyhouse inventory), cost self `blockedDrafts+2` |
| bw2_eternal_keep | The Eternal Keep | 8 | protection | permanent oppFilter: your non-king pieces standing on your first rank can never be captured (with non-empty fallback guard) |

### Tier-ladder reasoning

- **T1-T2** are single readable exceptions (one pawn rule, one specific-threat
  ward, one blocker, one small trigger).
- **T3-T4** shape several moves (a draft cadence bet, a 6-turn capture
  taboo, comeback king moves, one-shot board rewrites).
- **T5-T6** are identity pieces with visible costs (sacrifice, symmetry,
  mutual destruction, self-restriction).
- **T7-T8** are legendary but never auto-win: Kingmaker mortgages agency,
  Carnival is symmetric chaos on your own army, Long Truce protects the
  opponent too, Great Return is strictly better the further behind you are,
  Eternal Keep excludes the king so it can never lock the game, Shadow
  Reserve costs two whole drafts, Bolt Hole only works while in check.

### Safety rails observed

- Every `filterOpponentMoves` keeps a non-empty fallback (or is a partial
  filter under `timedOppFilter`'s built-in guard).
- Kings are never frozen, walnutted, removed, transformed, or bound.
- Pawns never land on ranks 1/8 (`pawnRankOk` guards on scarecrow, spoils,
  carnival repair, alchemist demotion, standard-bearer slides,
  auto-placement scans; Ancient Custom promotes instead).
- Randomness only in `effect` via `api.rng` (Carnival of Masks); everything
  else is a pure read of synced state — no rng in `targets`/`status`.
- Clock touches go through `api.adjustClock` intent only (Highwayman's Toll).
- Board mutations inside `onMovePlayed` (Hit and Run, Queen's Testament,
  Deathless Oath) use the BuffApi mutators, so `mutations`/
  `lastHookMutations` bookkeeping and the hook-reveal path work as designed.
- `spoils_of_war` / `prisoner_exchange` / `great_return` deduct
  `theirs.revived` when they consume the opponent's captured pool, so double
  revival is impossible.

## Animation work (boonPlays.tsx / boonPlays.css)

- **5 new boon-flavored templates** (module-local Stage/palette/glyph
  machinery, no imports from BoardEffects.tsx, transform/opacity only,
  ~1.4-1.9s): `DawnHalo`, `Reliquary`, `AstralAnvil`, `PactScroll`,
  `FalconDash`.
- **20 unique flourishes**, one per T1-T6 card, each with its own real
  dressing block (a distinct visual beat: the tumbling reroll die, the
  crossfading defector's coat, the levelling scale, the snapping-back
  raider…), so no card shares a flagship.
- **8 fully bespoke scenes** for the T7-T8 flagships (own Render, larger
  presentation, double shock ring + board-edge glow): `KingmakerScene`,
  `BoltHoleScene`, `CarnivalScene`, `RestitutionScene`, `LongTruceScene`,
  `GreatReturnScene`, `ShadowReserveScene`, `EternalKeepScene`.
- All 28 registry entries parse under `scripts/audit-animations.ts` (G-form
  with trailing flourish string / S-form bespoke) and the shared-flagship
  baseline is untouched (verified read-only run: 381 total / 45 high, exactly
  the committed baseline; zero problems mention `bw2_`). Sounds reuse
  existing `SigSoundKey`s only (blitz, cathedral, aegis, coronation, shades,
  wall, siege, crownrain, nova, colossus).

## Draft-appearance notes (for the integrator — APPEARANCE_MULT untouched)

Suggested multipliers if the owner wants the marquee cards rarer within
their tier pools (I did NOT edit draft.ts):

- `bw2_great_return`: 0.75 — the biggest single swing in the batch.
- `bw2_kingmakers_pact`: 0.75 — compounding value in long games.
- Everything else rides normal tier-pool weights; the T7/T8 slots are
  already rare by tier.

## Wanted but not implementable with existing primitives (left on the floor)

- **Clock-conditional effects** ("when under 30 seconds…"): engine hooks
  cannot *read* clocks — `ClockRequest` is write-only intent and the
  authoritative clocks live in the game server. Any "if low on time" gate
  would desync.
- **Clock swap / give-opponent-time**: `ClockRequest` has `addSelfSec` /
  `subOppSec` / steal fields but no `addOppSec`, so a "gift them time for a
  benefit" or full swap card can't be expressed.
- **Capture interception** ("the next time X would be captured, prevent
  it"): there is no pre-move veto hook; protection must be expressed as
  move filtering (used) or shields. Deathless Oath is the closest honest
  version (die, then return).
- **Multi-use activated cards** ("pass your turn, 3 charges"):
  `usedActivation` hard-limits every activated card to one activation, so
  repeatable actives must be passives with charges (used for Bolt Hole).
- **A true "pass your turn" card**: any non-freeAction activated card
  already consumes the turn, so a pure pass is just a do-nothing active —
  cut as not a real mechanic.
- **Temporary borrowed promotion** (knight→queen for N turns via
  `timed_loss` demote) — implementable but CUT as a duplicate:
  `we_overgrowth` already owns pawn→queen-then-revert.

## Duplicate-avoidance survey (what each new card was checked against)

reroll/peek/prep/bank/forceTier/takeBoth combos (peek, scout, recast,
draft_insight, north_star, favorable_stars, wa_high_roll, wa_greed,
heros_journey, wa_disrupt_ritual, riddle_game, transcendence, omniscience,
oracles_eye, third_eye, stream_sniper, pr_phishing); shields and wards
(pawn_shield, reinforce, seelie_blessing, watermelon_rind, fortress_realm,
aegis, absolute_aegis, iron_reign, checkmate_denial, decoy, bubble_wrap,
apple, spirit_guide); relief family (all `category: "nerf"`); revives
(second_wind, ctrl_z, mass_resurrect, phoenix_line, seance, trade_up,
valkyrie); transforms (we_overgrowth, reality_warp, second_king, changeling,
promote_now, mass_promote_minor, royal_ascension, overclock_major,
sliding_king, royal_decree, kingslide); tempo (extra_move family, momentum,
counterstep, threads_of_fate, chill_guy, endless_turn, time_rewind, coffee);
clock cards (lag_spike, pr_donation_alert, wasted_hour, wa_borrowed_minute);
teleports/swaps (escape_hatch, guard_rotation, piece_swap, warp_home,
ley_line, mirror_of_souls, fey_step, rift_walker); barriers (wall, bunker,
barLine users, flypaper_file, board_lock); en-passant cards (holy_hell,
toll_gate); pocket grants (walnut_shell-line, battle_pass, casino grants,
wa_conjure_* — Shadow Reserve is distinguished by its 3-piece scale *plus*
the two-draft cost, and is the only pocket card with a draft-track price);
steal/nullify family (buff_thief, stealBuffs users, chain_nullify,
wa_mind_read). `grantRandomTier9` (jackpot / Chess Diff) deliberately
untouched — apex grants stay exclusive to their current sources.
