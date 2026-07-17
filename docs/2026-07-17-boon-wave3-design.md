# Boon Wave 3 - design notes (2026-07-17)

Batch scope: `src/engine/buffs/boons3.ts` (44 new boons, all ids `bw3_*`) plus
the two-line registration in `src/engine/buffs/library.ts` (import + spread of
`BOON_WAVE3`, mirroring `BOON_WAVE2`). No other files touched. Animation
flagships (`boonPlays.tsx` / registry) are the Animation Mapper's job; a
per-card `anim:` suggestion is listed for each card below. Draft-weight,
`COMBO_TAGS` and `APPEARANCE_MULT` edits are the Balance Reviewer's job and are
only *suggested* here (draft.ts untouched).

Authoritative brief: `docs/2026-07-17-wave3-content-map.md`. Prior idiom:
`docs/2026-07-17-boon-wave2-design.md`, `src/engine/buffs/boons2.ts`.

## Why these cards

The boon pool was starved versus pure buffs (88 : 609) and thinnest at the top
(T6-T8). Wave 3 fills exactly that band and leans into the boon identity brief:
transformations, one-time miracles, comeback engines, conditional relational
wards, self-favoring clocks, friendly terrain, castling/promotion miracles,
self-cost surgical removal, and summoning with a real price. Before writing,
every design was checked against the whole `boon: true` pool (boons2 + library
+ fantasy/mystic/funny/wild/pt), the `category: "nerf"` relief family, the hex
helper library and the wave-2 duplicate-avoidance survey. None is a numeric or
defensive re-skin, and each carries a code comment naming its closest
neighbours.

Determinism note for the whole batch: **no `api.rng` draw appears anywhere in
wave 3.** Every card is either a pure read of synced state or a deterministic
mutation (best-first revive orders, file-order tie-breaks, relRank sorts), so
there is nothing that could desync across replicas even in principle.

## Tier mix (verified live from `ALL_BUFFS`)

`T1:3 T2:4 T3:5 T4:6 T5:6 T6:7 T7:7 T8:6 = 44`, exactly the prescription.
Smoke script (`scratchpad/smoke.ts`) confirmed: 44 `bw3_` cards merged, zero id
collisions across all 966 cards, every card `boon:true` + `implemented:true`,
no display-name collisions, no em/en dash characters.

## The cards, by tier

Format: id | name | mechanic (one line) | counterplay / cost.

### Tier 1 (3)
- `bw3_bishops_blessing` | Bishop's Blessing | perm oppFilter: enemy knights can
  never capture your bishops | narrow single-threat ward; other attackers still
  take bishops.
- `bw3_first_blood` | First Blood | passive one-shot: your FIRST capture steals
  10s (untimed no-op) | one-time, untimed games nullify it.
- `bw3_postern_gate` | Postern Gate | instant: `restoreCastling()` | does
  nothing if you never lost the rights; pure timing play.

### Tier 2 (4)
- `bw3_heir_apparent` | Heir Apparent | passive one-shot: first lost knight/
  bishop -> your home-most pawn becomes that type (`setPieceType`) | costs a
  pawn's structure; only fires on a minor loss.
- `bw3_shield_wall` | Shield Wall | perm oppFilter: pawns beside a friendly pawn
  (adjacent file, same rank) are uncapturable | break the phalanx / attack lone
  pawns.
- `bw3_home_guard` | Home Guard | instant: permanent `barred` sealing your first
  rank to the enemy | terrain lock only (pieces already there still capturable);
  king captures exempt engine-side (no soft-lock).
- `bw3_kings_shield` | King's Shield | perm oppFilter: the piece on the square
  directly in front of your king is uncapturable | floating single-square ward;
  attack around it or push the king.

### Tier 3 (5)
- `bw3_forced_march` | Forced March | timedAugment(2): pawns may double-step from
  any rank, non-capturing, never onto the last rank | two turns only; blocked
  squares negate it.
- `bw3_double_down` | Double Down | instant: next offer `prepThree` + `takeBoth`,
  then `blockedDrafts+1` | you skip the following draft.
- `bw3_underdogs_gambit` | Underdog's Gambit | permanentAugment gated on material
  deficit: pawns gain a sideways capture | switches off the moment you draw
  level.
- `bw3_field_knighting` | Field Knighting | activated: a pawn on relRank >=5 ->
  knight in place | spends the turn; only the one minor type.
- `bw3_praetorian` | Praetorian | perm oppFilter: queen uncapturable while a
  friendly n/b is adjacent | trade the escort and she is exposed.

### Tier 4 (6)
- `bw3_battlefield_commission` | Battlefield Commission | activated, gated on
  behind: most-advanced pawn -> knight | inert while not behind; costs the pawn.
- `bw3_royal_caper` | Royal Caper | augment(2) gated on `isInCheck`: king may leap
  as a knight to escape | only under check, twice.
- `bw3_plunderers_ledger` | Plunderer's Ledger | passive: your next 3 captures
  each grant a reroll | requires you to keep capturing.
- `bw3_coronation_bonus` | Coronation Bonus | passive one-shot: first pawn
  promotion grants +30s | untimed no-op; one promotion.
- `bw3_eleventh_hour` | Eleventh Hour | passive: when your army first hits <=3
  non-king pieces, revive your best fallen piece | needs a revivable pool + a
  home-rank square; one-shot.
- `bw3_kings_road` | King's Road | activated: permanent `barred` on one file
  within your half | one file, your half only.

### Tier 5 (6)
- `bw3_ironwrights_bargain` | Ironwright's Bargain | activated: a minor (n/b) ->
  rook, pay by removing one of your pawns | real pawn loss; needs a pawn.
- `bw3_tunnelers` | Tunnelers | pieceBound rook: permanently phases through
  friendly pieces (`phasingSlideMoves`) | one rook; still blocked by enemies.
- `bw3_deep_position` | Deep Position | passive one-shot: first piece to reach
  the enemy's back two ranks grants +45s | untimed no-op; requires infiltration.
- `bw3_martyrs_gift` | Martyr's Gift | passive: next 3 of YOUR losses each grant a
  reroll + 5s | pays out only when you are being captured.
- `bw3_watchword` | Watchword | perm oppFilter: any of your pieces (king aside)
  defended by a pawn is uncapturable | remove the defending pawn; king excluded
  so check detection is never disturbed.
- `bw3_hallowed_ground` | Hallowed Ground | activated: consecrate one empty
  square (`barred` to enemy) that your king may flee to while in check | one
  fixed square; opponent can cover it from range.

### Tier 6 (7)
- `bw3_second_face` | Second Face | pieceBound bishop: permanently also leaps like
  a knight (archbishop) | one bishop; capturable normally.
- `bw3_rally_royal` | Rally to the King | activated: teleport any non-king piece
  to an empty square adjacent to your king | spends the turn; needs a free
  king-adjacent square.
- `bw3_futures_market` | Futures Market | instant: `bankBonus` + `prepThree` +
  `bankedTier8` + `blockedDrafts+2` (fat banked offer that can deal apex) | you
  skip two drafts; the apex is a chance, not a guarantee.
- `bw3_castle_in_the_storm` | Castle in the Storm | activated: perform an
  out-of-turn castle ignoring moved-status/check, path must be empty | can
  castle into danger (your risk); spends the turn.
- `bw3_last_muster` | Last Muster | activated: place up to 3 pawns in your half
  that expire (`timed_loss`, uncounted) after 4 of your turns | temporary only;
  they vanish.
- `bw3_funeral_pyre` | Funeral Pyre | activated: sacrifice a chosen piece and
  `explodeAt` its square, clearing adjacent enemies | you lose the piece; shielded
  enemies and kings survive.
- `bw3_vantage_point` | Vantage Point | perm oppFilter: your pieces (king aside)
  on the enemy's back two ranks are uncapturable | step off the heights and it
  lapses.

### Tier 7 (7)
- `bw3_mummers_dance` | Mummers' Dance | activated: global n<->b type swap of your
  whole minor corps (`setPieceType`) | zero material change; re-tasks color
  complexes (can hurt you if mis-timed).
- `bw3_last_stand` | Last Stand | instant: whole-army shield + `king_safe` for 3
  turns, cost `blockedDrafts+3` | one-sided but you skip three drafts.
- `bw3_high_stakes` | High Stakes | instant: `takeBoth+2` (keep every card in your
  next 2 offers), cost `rerollsLeft=0` | forfeit all rerolls forever.
- `bw3_from_the_ashes` | From the Ashes | instant: revive best-first only until
  your army equals the opponent's | never overtakes; nothing from ahead/level.
- `bw3_kingsguard_duel` | Kingsguard Duel | activated: remove one enemy piece
  adjacent to their king AND one of yours adjacent to your king | bares your own
  king too; needs guards on both.
- `bw3_kings_sanctuary` | King's Sanctuary | instant: king relocates to the empty
  home-rank square furthest from any enemy + `king_safe` 1 | one-shot; a covered
  home rank limits it.
- `bw3_martyrdom` | Martyrdom | activated: destroy one of your minors to remove
  TWO enemy minors | real self-loss; needs two enemy minors to exist.

### Tier 8 (6)
- `bw3_the_reckoning` | The Reckoning | instant: remove EVERY knight and bishop of
  both sides | symmetric; favors whoever is stronger in majors/pawns.
- `bw3_covenant_of_return` | Covenant of Return | passive charges 3: your next 3
  captured pieces each auto-return to home rank | needs home-rank space; each
  return marks the revive pool (no double-dip).
- `bw3_the_homecoming` | The Homecoming | instant: revive your best fallen major +
  best fallen minor to home rank, cost `blockedDrafts+2` | needs a fallen pool;
  skips two drafts.
- `bw3_turn_the_tide` | Turn the Tide | instant: every pawn that can advances one
  rank at once (never onto the last rank) | one-shot; blocked pawns hold.
- `bw3_pretender` | Pretender to the Throne | activated: summon a brand-new queen
  on your home rank, cost `blockedDrafts+3` + `rerollsLeft=0` | steep economic
  price for pure new material.
- `bw3_drive_them_out` | Drive Them Out | instant: remove every enemy piece in
  your half AND every one of yours in the enemy half (kings exempt) | symmetric,
  territory-keyed; punishes your own overextension too.

## Family coverage vs quotas

| Family (brief quota) | Delivered | Cards |
| --- | --- | --- |
| Transformations (5) | 5 | heir_apparent, battlefield_commission, ironwrights_bargain, second_face, mummers_dance |
| One-time miracles (5) | 5 | kings_sanctuary, last_stand, the_reckoning, turn_the_tide, covenant_of_return |
| Movement grants (4) | 4 | forced_march, royal_caper, tunnelers, rally_royal |
| Draft / economy bets (4) | 4 | double_down, plunderers_ledger, futures_market, high_stakes |
| Clocks (3) | 3 | first_blood, coronation_bonus, deep_position |
| Comeback / behind-gated (4) | 4 | underdogs_gambit, eleventh_hour, martyrs_gift, from_the_ashes |
| Conditional protection (4) | 6 (+2) | bishops_blessing, shield_wall, kings_shield, praetorian, watchword, vantage_point |
| Friendly terrain (3) | 3 | home_guard, kings_road, hallowed_ground |
| Promotion / castling (3) | 3 | postern_gate, field_knighting, castle_in_the_storm |
| High-risk removal / duels (3) | 3 | funeral_pyre, martyrdom, kingsguard_duel |
| Summoning miracles (2) | 3 (+1) | last_muster, the_homecoming, pretender |

**Deviations (deliberate, within the brief's "designer owns the creativity"):**
- **Conditional protection +2 (6 vs 4).** The protection family is THIN and the
  brief explicitly wants relational/positional wards rather than blanket
  shields. All six are relational (knight-vs-bishop, phalanx, king's-front,
  guarded-queen, pawn-defended, deep-rank) and each is a distinct MECHANIC, so
  the extra two are content, not filler. None is a plain shield.
- **Summoning +1 (3 vs 2).** `pretender` (a conjured new queen) is a genuinely
  different summon shape from the pool grants (Shadow Reserve) and from
  `the_homecoming`/`last_muster`, so it earns a slot at the thin top tier.
- The hard constraint (tier mix, biased to T6-T8) is hit exactly; the family
  quotas are seed directions and the two overages both land in THIN families.

## House-rule compliance (self-audit)

- **Determinism.** No `api.rng` anywhere in the batch. All ordering is
  deterministic (VALUE_ORDER best-first, file-order tie-breaks in
  kings_sanctuary, relRank-descending sort in turn_the_tide).
- **Non-empty move-filter fallback.** Every `oppFilter` in the batch wraps its
  result in the local `nonEmpty(kept, all)` guard (bishops_blessing, shield_wall,
  kings_shield, praetorian, watchword, vantage_point). No `filterOpponentMoves`
  can strand the opponent.
- **Kings are sacred.** No king is ever frozen/walnutted/removed/transformed/
  bound. King protection uses only the sanctioned `king_safe` effect
  (last_stand, kings_sanctuary) or added king MOVES (royal_caper, hallowed_ground
  escape) - never a capture filter. `watchword` and every deep/relational ward
  explicitly `p.type === "k" -> keep`, so check detection is never broken and the
  game can never soft-lock.
- **Pawns never on rank 1/8.** `pawnRankOk` guards every placement/relocation
  touching a pawn (last_muster, rally_royal, forced_march skips last rank,
  turn_the_tide skips last rank, autoPlaceSquare, heir_apparent/field_knighting
  transform pawns into non-pawns in place so the rank is irrelevant).
- **No em/en dash** in any name/description/flavor (script-verified).
- **`implemented: true`** on every card via the `boon()` factory.
- **Clock touches** go through `api.adjustClock` intent only (first_blood,
  coronation_bonus, deep_position, martyrs_gift).
- **Revive pools deducted.** Every card consuming a captured pool calls
  `markRevived` (eleventh_hour, from_the_ashes, the_homecoming, covenant_of_return)
  so double revival is impossible.
- **`timed_loss` expiry is uncounted** (verified in `game.ts fireExpiredTradeOffs`),
  so `last_muster`'s disbanding pawns never credit the opponent phantom captures.

## COMBO_TAGS duties (for the Balance Reviewer / integrator)

Reviewed against section 3 of the content map. **No wave-3 boon needs a
`COMBO_TAGS` entry:**
- None skips or freezes the opponent's turn (no `skipOpponent`, no whole-army
  freeze/petrify), so neither **turn-theft** nor **mass-freeze** applies.
- The draft cards (`double_down`, `futures_market`, `high_stakes`,
  `plunderers_ledger`, `martyrs_gift`) all manipulate the HOLDER's own draft
  cadence/economy; none nullifies or skips the OPPONENT's drafts, so
  **draft-denial** does not apply. `blockedDrafts` here is always self-inflicted
  as a cost (Ascetic's Bargain / Shadow Reserve precedent), which the content
  map calls out as safe (conditional on the caster's own actions).
- Optional: if the reviewer wants the three self-`blockedDrafts` cost cards
  (`futures_market`, `last_stand`, `pretender`) mutually exclusive with each
  other so a player cannot stack three skipped-draft debts, that would be a NEW
  self-cost family, not one of the existing three. Not required for correctness;
  flagged only as a balance option.

## Draft-weight / appearance suggestions (draft.ts untouched)

- `bw3_pretender` and `bw3_the_reckoning`: consider `APPEARANCE_MULT` ~0.7 - the
  biggest single swings (a conjured queen; a full minor-corps wipe).
- `bw3_futures_market`: ~0.8 - it is the only apex-fishing boon (`bankedTier8`),
  so it should be a rare marquee even within its tier pool.
- Everything else rides normal tier-pool weights; the T6-T8 slots are already
  rare by tier.
- `requires` fields are set on every card whose whole effect targets the
  caster's own specific piece type (so the draft roll drops dead draws): b, p,
  q, r, and the n/b pairs on ironwrights_bargain / mummers_dance / martyrdom.

## Mobile / spectator

Per section 9 of the content map: there is no per-card mobile handling in the
engine or effects tree, and none is needed. These cards require only (a)
determinism (satisfied - no rng at all) and (b) animations that degrade to
nothing under `html[data-anim="off"]` (the Animation Mapper's constraint).

## Per-card animation suggestions (for the Animation Mapper)

Cadence matches wave 2: a reusable G-form template + fresh flourish for T1-T6,
a bespoke S-scene for the T7-T8 marquee cards. Templates named are the wave-2
boon set (`DawnHalo`, `Reliquary`, `AstralAnvil`, `PactScroll`, `FalconDash`)
plus greatPlays/godPlays where a motif matches; passives (see below) take a
passive composition instead of a play.

**T1-T6 (reuse a template + new flourish):**
- bishops_blessing -> `DawnHalo` (ward halo over a bishop), flourish: a knight
  silhouette bounces off the halo.
- first_blood -> passive (clock/tempo family) OR `PactScroll`; flourish: a single
  red drop drips onto a ticking dial.
- postern_gate -> `Reliquary`; flourish: a small side door swings open in a wall.
- heir_apparent -> passive (bind/blessing) or `AstralAnvil`; flourish: a pawn
  silhouette crossfades up into a knight's.
- shield_wall -> `DawnHalo`; flourish: two pawn shields lock edge to edge.
- home_guard -> `WarBanner` (greatPlays) or passive `territory`; flourish: a
  fence-line seals the back rank.
- kings_shield -> `DawnHalo`; flourish: a half-shield slides in front of a crown.
- forced_march -> `FalconDash`; flourish: a pawn double-tick footprint dash.
- double_down -> `PactScroll` / `CardRite`; flourish: three cards fan out, chips
  slide in.
- underdogs_gambit -> `FalconDash`; flourish: a pawn jabs sideways.
- field_knighting -> `AstralAnvil`; flourish: a sword taps a kneeling pawn that
  rises as a knight.
- praetorian -> `DawnHalo`; flourish: a ring of guards closes around a queen.
- battlefield_commission -> `AstralAnvil`; flourish: a field medal pins onto an
  advancing pawn.
- royal_caper -> `FalconDash`; flourish: a crown vaults in a knight's L.
- plunderers_ledger -> passive (decree/economy) or `PactScroll`; flourish: coins
  drop into a ledger that flips a reroll die.
- coronation_bonus -> `Reliquary`; flourish: a crown lands, a dial jumps forward.
- eleventh_hour -> `Reliquary`; flourish: a lantern lifts a fallen piece at the
  last tick.
- kings_road -> passive `territory` or `WarBanner`; flourish: a milestone line
  paints down one file.
- ironwrights_bargain -> `AstralAnvil`; flourish: a pawn thrown into the forge,
  a minor hammered up into a rook.
- tunnelers -> `RiftGate`/`FalconDash`; flourish: a rook drills through a
  friendly line.
- deep_position -> passive (tempo) or `PactScroll`; flourish: a flag plants deep,
  a dial jumps.
- martyrs_gift -> passive (blessing) or `Reliquary`; flourish: a falling piece
  scatters reroll motes upward.
- watchword -> `DawnHalo`; flourish: a small pawn sentry lights up whatever it
  guards.
- hallowed_ground -> `DawnHalo` (self-ward) or `RiftGate`; flourish: a
  consecration circle burns onto one square, a king blinks into it.
- second_face -> `AstralAnvil`; flourish: a bishop mask flips to reveal a knight
  crest.
- rally_royal -> `FalconDash`; flourish: a piece snaps to the king's side.
- futures_market -> `CardRite` (greatPlays); flourish: three cards deal, one
  glows apex-gold, two burn away.
- castle_in_the_storm -> `WarBanner`/`RiftGate`; flourish: king and rook slam
  into castle position amid arrows.
- last_muster -> `BannerMuster`/`WarBanner`; flourish: three pawns rise from the
  ground, faintly translucent (they will fade).
- funeral_pyre -> `SiegeRoll`/`AbyssMaw`; flourish: a chosen piece ignites, a
  ring blast clears neighbors (reuse an atomic sound like `atomic`).
- vantage_point -> `DawnHalo`; flourish: pieces on the far ranks gain a
  mountaintop ward glint.

**T7-T8 (bespoke S-scene, larger presentation, double shock ring):**
- mummers_dance -> bespoke: masks whirl across the whole minor corps, every n/b
  crossfading to the other.
- last_stand -> bespoke: a full-board shield wall snaps up, banners raise (reuse
  `aegis`/`cathedral`).
- high_stakes -> bespoke: the whole offer table is swept toward the holder, dice
  shatter (reuse `blitz`).
- from_the_ashes -> bespoke: fallen pieces re-form up to a level line, embers
  rising (reuse `crownrain`/`shades`).
- kingsguard_duel -> bespoke: two guards clash before their kings, both fall.
- kings_sanctuary -> bespoke: the king streaks to a far corner haloed in safety
  light (reuse `coronation`).
- martyrdom -> bespoke: one friendly minor shatters, two enemy minors shatter in
  answer.
- the_reckoning -> bespoke godPlays-scale: every knight and bishop dissolves in a
  single sweep (reuse `extinction`/`cataclysm`).
- covenant_of_return -> bespoke: an eternal loop sigil, a ferryman rowing back.
- the_homecoming -> bespoke: veterans marching back to the home rank under a
  tent banner (reuse `rally`/`crownrain`).
- turn_the_tide -> bespoke: the whole pawn front surges forward as one wave
  (reuse `siege`).
- pretender -> bespoke godPlays-scale: a new queen crowned from nothing in a
  pillar of light (reuse `coronation`/`colossus`).
- drive_them_out -> bespoke: a river-line sweep clears both sides of invaders
  (reuse `rampage`/`wall`).

**Passive-visual candidates** (data-driven, not plays): the passive-kind cards
need a `passive/compositions.ts` tuple from the integrator's regen, with a
distinct family/target so each "sentence" stays unique. They are: first_blood
(tempo), heir_apparent (summon/bind), shield_wall (decree/ward), home_guard
(territory), kings_shield (decree/ward), plunderers_ledger (decree),
coronation_bonus (tempo), eleventh_hour (blessing/summon), deep_position
(tempo), martyrs_gift (blessing), watchword (decree/ward), bishops_blessing
(decree/ward), praetorian (decree/ward), vantage_point (territory/ward),
underdogs_gambit (strike/empower), forced_march (tempo), royal_caper (empower),
covenant_of_return (blessing/summon). The remaining cards are instant/activated
plays.

---

## Balance review (2026-07-17, Balance and Interaction Reviewer)

Adversarial pass over all 44 `bw3_*` boons against the full pool. Two code
changes applied to `boons3.ts`; no `draft.ts` change. Validation re-run clean
(`tsc`, `server:build`, `test-hexes`, `test:desync`, eslint on edited files,
pool smoke: 44 boons, 0 new id/name collisions, 0 em/en dashes).

### Changes made

1. **`bw3_futures_market` - fixed a broken card + retier T6 -> T7.** As
   authored it set BOTH `prepThree` and `bankedTier8`. `rollOffer`'s apex
   promotion is `bankedToTop = !prepping && ...`: a prepThree (three-card)
   offer is deliberately never collapsed into an apex offer (explicit engine
   comment). So the advertised apex could NEVER fire - the card silently
   degraded to a fat three-card offer at +1 tier with a dead `bankedTier8`
   flag and a description that lied about apex. Fix: dropped `prepThree`,
   kept `bankBonus` + `bankedTier8` + `blockedDrafts += 2`. It now arms exactly
   the "banked past a tier-8" state and delivers a real two-card apex pull. The
   two skipped drafts are consumed first (blockedDrafts is checked before
   rollOffer each cadence tick); `bankBonus`/`bankedTier8` persist unconsumed
   across the skips, so the apex offer rolls on the next non-skipped draft.
   Description rewritten to match. Retiered to T7 because a guaranteed apex
   pull is a top-end effect, not a T6 draft trick (it remains the only
   apex-fisher in the boon pool, so it keeps a unique identity rather than
   collapsing into a Double Down variant).

2. **`bw3_battlefield_commission` - differentiated from `bw3_field_knighting`.**
   Both were "activate -> a pawn becomes a knight," adjacent tiers (T4 vs T3),
   which read as a near-duplicate with an inverted tier feel. Rather than cut
   either, the T4 comeback card now SCALES with the deficit: the most advanced
   pawn is promoted to a knight, or to a rook when outnumbered by four pieces
   or more. This distinguishes it on all three axes (behind-gated,
   auto-targets the tip pawn with no choice, scaling payoff) from Field
   Knighting (choose any advanced pawn, unconditional, always a knight) and
   justifies the tier gap. Kept activated (not converted to an auto-passive:
   an auto-transform of your most advanced pawn could destroy a near-promotion
   pawn against the holder's will).

### draft.ts: COMBO_TAGS and APPEARANCE_MULT (no changes, with reasoning)

- **COMBO_TAGS: no boon needs an entry (verified, not trusted).** No wave-3
  boon skips/blocks the opponent's turn (no `skipOpponent`, no `bs.skips`
  writes), nullifies/skips the OPPONENT's drafts (every draft flag set is on
  `api.mine`: self-cadence and self-cost `blockedDrafts`, the Ascetic's Bargain
  / Shadow Reserve precedent the content map calls safe), or freezes/petrifies
  the opponent's whole army. So none touches the turn-theft, draft-denial, or
  mass-freeze families.
- **APPEARANCE_MULT: the designer's ~0.7-0.8 suggestions for `bw3_pretender`,
  `bw3_the_reckoning`, `bw3_futures_market` were REJECTED on technical
  grounds.** `APPEARANCE_MULT` is implemented as integer draw-multiplicity
  (`reps *= mult; for (r < reps) weighted.push`). A value below 1 cannot make a
  card rarer: in buff mode a base-2 card at 0.7 becomes 1 rep (0.5x, not 0.7x),
  and in nerf mode a base-1 boon at 0.7 becomes `floor(0.7) = 0` reps - the
  card would NEVER be offered in nerf mode. Sub-1.0 weights are simply not
  expressible without rewriting the (desync-critical) weighting mechanism,
  which is out of scope. All three cards are already T7/T8, made rare by the
  tier curve and top-tier slip gate, so they ride normal tier-pool weights.

### Considered and rejected / accepted-as-is

- **Uncapturable-ward stacking (the flagged oppression case).** A queen could
  be simultaneously uncapturable via Praetorian (adjacent minor), Watchword
  (pawn-defended) and Vantage Point (deep rank). This is a strong defensive
  stack but NOT a lockout: it never removes the opponent's turn or their whole
  move list (each ward self-guards with `nonEmpty`), and crucially none of the
  six wards can protect a KING (every one keeps king-capturing moves - Watchword
  and the relational wards explicitly `p.type === "k" -> keep`), so the game is
  always winnable by king capture. Requires drafting three specific boons; no
  COMBO_TAGS warranted (there is no protection family and the effects are
  conditional). Left as-is.
- **Wards vs capture-mandate nerfs (e.g. `nw2_killing_spree`).** A ward held by
  A that makes A's pieces uncapturable can deny B (under killing_spree) the
  capture B must make, which loses B the game. This is NOT a new unavoidable
  loss: denying the spree-player their next capture is the fundamental,
  intended counterplay to killing_spree (an opponent simply retreating pieces
  already does it), and the spree only begins after B's own capture (B controls
  whether to start one it cannot sustain, with the ward visible). Same class as
  the existing "keep pieces defended" counter. Accepted.
- **Barred boons (`home_guard`, `kings_road`, `hallowed_ground`) soft-lock.**
  `home_guard` is a full-rank wall; the engine's wall-crossing guard and the
  king-capture exemption (`m.captured === "k"`) keep it winnable and unable to
  strand. Even if a barred zone emptied a side's move list, `resolveNoMoves`
  converts zero-legal-moves-with-pieces into a forced pass (effects tick, turn
  passes), never a loss - so no barred boon can manufacture an unavoidable
  loss. Accepted.
- **`bw3_field_knighting` vs `bw3_battlefield_commission`** - resolved by the
  scaling change above.
- **`bw3_castle_in_the_storm`** relocates rook-then-king; verified the king's
  destination is always the emptied path or the just-cleared rook square, so no
  overwrite. Castling into check is the holder's stated risk (king capture, not
  checkmate, decides). Accepted.
- **`bw3_from_the_ashes` non-termination** - the revive loop has a `safety < 32`
  cap and breaks when nothing can be placed; provably terminates. Accepted.
- **Determinism** - grep confirms ZERO `api.rng` / `Math.random` / `Date` in
  boons3.ts; all ordering is deterministic (VALUE_ORDER, file-order tie-breaks,
  relRank sorts). Matches the batch's zero-rng claim.

### Verdict by review dimension (boons)

1. Duplicates: one near-duplicate fixed (battlefield_commission); no others
   found within wave 3 or against the pool (0 new name collisions).
2. Tier placement: one retier (futures_market T6 -> T7, tied to its bug fix).
3. Oppressive combos: none reach a lockout; no COMBO_TAGS needed.
4. Infinite loops: none (from_the_ashes capped; all others single-pass).
5. Randomness: zero rng in the batch (verified).
6. Counterplay/wording: boon descriptions are clear; no em/en dashes.
7. Broken stacking: same-id double-hold is impossible (unspent-held cards are
   never re-offered; the passive wards never spend); no stacking break.
8. Impossible states/soft-lock: none (engine forced-pass + king-capture
   exemptions hold).
9. Cross-family: ward-vs-mandate and barred-vs-nerf interactions reviewed and
   found safe (no unavoidable loss introduced).

## Animation map (Animation Mapper, keyed on frozen ids)

All 44 flagships live in `src/components/effects/boonPlays.tsx` (+ `.css`).
Cadence matches wave 2: T1-T6 reuse one of the five boon G-templates with a
fresh per-card flourish dressing block (own SVG, not a recolor); T7-T8 are
fully bespoke S-scenes. Every keyframe animates transform/opacity only, is a
one-shot `both`, scaled by `--fx-dur`, ends at opacity 0, and is parked under
`html[data-anim="off"]`. Sounds are existing `SigSoundKey`s only.

Split: 31 dressed-template (DawnHalo 7, Reliquary 7, PactScroll 7, FalconDash 5,
AstralAnvil 5) + 13 bespoke scenes. New keyframes added: `bwp-surge`,
`bwp-shatter`, `bwp-whirl`.

### T1-T6 dressed templates

| id | template | flourish | sound | reuse rationale |
| --- | --- | --- | --- | --- |
| bw3_bishops_blessing | DawnHalo | b3ward | aegis | ward halo; knight lunges and is bounced off the blessed bishop |
| bw3_first_blood | Reliquary | firstblood | blitz | a red drop falls onto the ticking dial and speeds it (clock payout) |
| bw3_postern_gate | Reliquary | postern | aegis | a small side door swings open in the keep wall (restored castling) |
| bw3_heir_apparent | AstralAnvil | heir | coronation | forge crossfade: a pawn re-forged into the fallen minor's crest |
| bw3_shield_wall | DawnHalo | phalanx3 | aegis | two flanking pawns lock edge to edge under one warding bar |
| bw3_home_guard | PactScroll | homeward | wall | a decree seals the home rank behind a fence-line (override: designer said WarBanner/greatPlays, not editable -> PactScroll edict fits terrain-sealing) |
| bw3_kings_shield | DawnHalo | kingfront | aegis | a half-shield drops in front of the crown |
| bw3_forced_march | FalconDash | march2 | blitz | two pawns spring two ranks forward on the dash template |
| bw3_double_down | PactScroll | doubledown | shades | three cards fan and chips slide in (chose PactScroll over greatPlays CardRite; boon-native) |
| bw3_underdogs_gambit | FalconDash | sidejab | siege | the scrappy pawn jabs to both sides |
| bw3_field_knighting | AstralAnvil | knighting | coronation | a sword taps a kneeling pawn that rises a knight |
| bw3_praetorian | DawnHalo | praetor | aegis | a ring of knight-guards closes around the queen |
| bw3_battlefield_commission | AstralAnvil | commission | coronation | a field medal pins onto an advancing pawn |
| bw3_royal_caper | FalconDash | caper | blitz | a check-ray rakes in; the king vaults away in an L |
| bw3_plunderers_ledger | Reliquary | ledger | shades | captured coins drop into a ledger that flips a reroll die |
| bw3_coronation_bonus | Reliquary | coronclock | coronation | a crown lands and the clock dial jumps forward |
| bw3_eleventh_hour | Reliquary | eleventh | cathedral | a grave-lantern lifts a fallen piece at the last tick |
| bw3_kings_road | PactScroll | kingsroad | wall | a milestone line paints down one file (override: designer said territory/WarBanner -> PactScroll decree) |
| bw3_ironwrights_bargain | AstralAnvil | ironwright | coronation | a pawn thrown into the forge, a minor hammered up to a rook |
| bw3_tunnelers | FalconDash | tunnel | blitz | the rook drills through a screen of its own pawns (chose FalconDash over RiftGate) |
| bw3_deep_position | Reliquary | deeptime | blitz | a flag plants deep in enemy ground, the dial jumps |
| bw3_martyrs_gift | Reliquary | martyrgift | shades | a falling piece scatters reroll motes upward |
| bw3_watchword | DawnHalo | sentry | aegis | a pawn sentry lights up whatever it guards |
| bw3_hallowed_ground | DawnHalo | hallow | cathedral | a consecration circle burns onto one square; the king blinks into it (king_safe) |
| bw3_second_face | AstralAnvil | archbishop | coronation | a bishop mask flips to reveal a knight crest (archbishop) |
| bw3_rally_royal | FalconDash | rally | blitz | a piece snaps clear across to the king's side |
| bw3_futures_market | PactScroll | futures | crownrain | three cards deal, one glows apex-gold, two burn away (override: designer said CardRite -> PactScroll, apex-fish read) |
| bw3_castle_in_the_storm | PactScroll | stormcastle | wall | king and rook slam into castled rank amid arrows (override: WarBanner/RiftGate -> PactScroll) |
| bw3_last_muster | PactScroll | muster | wall | three faint pawns rise from the ground (they will fade; source: summon) |
| bw3_funeral_pyre | PactScroll | pyre | atomic | a chosen piece ignites; a ring blast clears its neighbors (atomic reused per designer) |
| bw3_vantage_point | DawnHalo | vantage | aegis | pieces on the far ranks gain a mountaintop ward glint |

### T7-T8 bespoke scenes

| id | scene | sound | notes |
| --- | --- | --- | --- |
| bw3_mummers_dance | MummersDanceScene | shades | carousel of masks whirls the minor corps, every n<->b crossfading (bwp-whirl) |
| bw3_last_stand | LastStandScene | cathedral | a shield wall snaps up along the front, a king-safety dome settles (source: shield) |
| bw3_high_stakes | HighStakesScene | blitz | the whole offer table sweeps to the holder, forfeited dice shatter (bwp-shatter) |
| bw3_from_the_ashes | FromTheAshesScene | crownrain | the fallen re-form up to a level line, embers rising (source: summon) |
| bw3_kingsguard_duel | KingsguardDuelScene | siege | two guards charge from before their kings, meet, and both fall |
| bw3_kings_sanctuary | KingsSanctuaryScene | coronation | the king streaks to the safe corner haloed in sanctuary light (source: kingSafe) |
| bw3_martyrdom | MartyrdomScene | siege | one friendly minor shatters, its light strikes two enemy minors down (bwp-shatter) |
| bw3_the_reckoning | ReckoningScene | extinction | one sweep, every knight and bishop of both sides dissolves (godPlays-scale) |
| bw3_covenant_of_return | CovenantScene | cathedral | an eternal loop sigil turns, the fallen arc back home (source: summon) |
| bw3_the_homecoming | HomecomingScene | crownrain | veterans march back to the home rank under a mustering tent-banner (source: summon) |
| bw3_turn_the_tide | TurnTheTideScene | siege | the whole pawn front surges forward one rank as one wave (bwp-surge) |
| bw3_pretender | PretenderScene | coronation | a new queen crowned out of a pillar of light, gold raining (source: summon) |
| bw3_drive_them_out | DriveThemOutScene | rampage | a river-line splits the board; two sweeps clear invaders from either half |

### Notes / designer suggestions overridden

- Designer `anim:` hints that named greatPlays/godPlays templates (WarBanner,
  CardRite, RiftGate, SiegeRoll/AbyssMaw, BannerMuster) were remapped to the
  nearest boon-native G-template, because file ownership is limited to
  `boonPlays.*` / `cursePlays.*` and those templates live in modules I may not
  edit. Each remap keeps the intended motif (edict/terrain -> PactScroll,
  card-deal -> PactScroll, forge -> AstralAnvil, dash/drill -> FalconDash).
- The "passive-visual candidate" cards (first_blood, heir_apparent, shield_wall,
  home_guard, kings_shield, plunderers_ledger, coronation_bonus, eleventh_hour,
  deep_position, martyrs_gift, watchword, bishops_blessing, praetorian,
  vantage_point, underdogs_gambit, forced_march, royal_caper, covenant_of_return)
  still receive a full play here: the animation audit (`F1`) requires a play for
  EVERY implemented tier 1-8 card regardless of `kind`, exactly as wave-2 passive
  boons/hexes do. Their standing passive aura remains the integrator's separate
  data-driven `passive/compositions.ts` regen.
- Audit (`scripts/audit-animations.ts`, read-only): 84/84 wave-3 entries parse,
  zero bw3_/hw3_ problems, shared-flagship baseline held at 381 total / 45 at
  tier>=5 (NOT increased) - every wave-3 card counts as bespoke-or-dressed.
