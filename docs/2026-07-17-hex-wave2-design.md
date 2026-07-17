# Hex Wave 2 — design notes (2026-07-17)

Batch: 27 new hexes across tiers 1–8 in `src/engine/buffs/hexes/wave2.ts`
(pre-wired into `hexes/index.ts` → `NEW_HEXES` → `ALL_BUFFS`), with play
animations in `src/components/effects/cursePlays.tsx` / `cursePlays.css`.

Design brief (owner spec): hexes must feel like CURSES — marks, conditions,
delayed punishments, triggered rules, magical contracts — never plain
restrictions with purple visuals. Every requested curse structure from the
spec is covered at least once (see the Structure column). Every card states
in its description what is affected, for how long, what triggers it, and how
the victim plays around it.

## Structure coverage

| Requested structure                | Card(s) |
|-----------------------------------|---------|
| triggers after a certain move      | Bad Omen (T1), The Witching Hour (T4), Beacon of Woe (T8) |
| activates after a capture          | Blood Price (T2), Gravebloom (T6), Curse of Recoil (T3) |
| punishes repeated movement         | Weight of Toil (T4), Cold Footprints (T1, retracing steps) |
| marks a specific piece             | The Long Road Home (T2), Death Knell (T7), Twinned Torment (T4) |
| transfers between pieces           | Cursed Coin (T5) |
| spreads across tiles               | Creeping Blight (T5), Tide of Ash (T7, advancing wall) |
| grows stronger over time           | Gathering Storm (T6) |
| activates when a condition is broken | Crown of Thorns (T8, checking the king), The Hollow Crown (T7, moving the king), Queen's Ransom (T5, moving the queen) |
| cleansable through a difficult action | Chains of the Court (T5, king to center), Death Knell (T7, doomed piece must capture), Pauper's Crown (T8, humbled queen must capture) |
| temporary rule distortion          | No Reins (T3), Tolling Bell (T3, alternating cadence), Pauper's Crown (T8, piece transformation) |
| attaches to the player, not a piece | Tolling Bell (T3), War Rations (T3), Gilded Rot (T6), The Hollow Crown (T7) |
| changes behavior when stacked      | Compounding Misery (T4, scales with active curse-effects) |

## Card list

### Tier 1
- **hw2_witchs_veto — Witch's Veto** (passive, 4 of their turns). They cannot
  capture the piece you moved on your previous turn; a rolling, caster-steered
  revenge ban. *Counterplay:* attack anything else, or wait a turn for the
  veto to move on. *Vs pool:* every existing capture ban is piece-type-wide
  and static; funny/meta "Main Character" is a fixed 4-turn single shield.
- **hw2_bad_omen — Bad Omen** (passive countdown). On their 3rd turn from now,
  that one turn is pawn-or-king only. *Counterplay:* fully visible fuse; they
  prepare around the known turn. *Vs pool:* Wasted Hour is the same seizure
  but immediate; nothing else runs a visible short fuse.
- **hw2_cold_footprints — Cold Footprints** (passive, 5 turns). Each square a
  piece of theirs leaves is barred to them for their following turn.
  *Counterplay:* keep moving forward; only backtracking is punished.
  *Vs pool:* Landlord/Flypaper are static trap zones; this trail is created
  by their own movement.

### Tier 2
- **hw2_long_road_home — The Long Road Home** (activated mark, ≤6 turns,
  cleansable). One enemy N/B/R may only move closer to its back rank; the
  curse lifts the moment it stands there. *Counterplay:* obey (fastest),
  stand still, or play other pieces. *Vs pool:* funny/curses "Homesick" is an
  army-wide timed retreat filter with no mark and no cleanse.
- **hw2_blood_price — Blood Price** (passive, one-shot within 6 turns). Their
  next capture costs them their following turn (skip). *Counterplay:* hold
  captures for 6 turns or pay the tempo knowingly. *Vs pool:* Twist the
  Knife / Walnut Curse bind the capturing piece; Union Rules is a capture
  cooldown; nobody taxes a capture with a skip.
- **hw2_tarnished_crown — Tarnished Crown** (passive, 6 turns). Any piece they
  promote is frozen 2 turns on arrival. *Counterplay:* delay promotion or pay
  knowingly. *Vs pool:* Stage Fright bans promotion outright; this taxes it.

### Tier 3
- **hw2_tolling_bell — Tolling Bell** (passive, 6 turns). On their 1st/3rd/5th
  turns under the curse their B/R/Q cannot move; quiet turns in between are
  free. *Counterplay:* schedule slider play for the quiet turns. *Vs pool:*
  no existing card restricts on an alternating cadence.
- **hw2_curse_of_recoil — Curse of Recoil** (passive, 3 turns). Any piece of
  theirs that captures is flung back to its origin square (capture stands;
  promotions exempt). *Counterplay:* captures still win material, just not
  ground; pick captures whose square doesn't matter. *Vs pool:* Trapdoor /
  Riptide / Lava Floor knock back from PLACES; this triggers on the act of
  capturing, anywhere.
- **hw2_no_reins — No Reins** (timed filter, 4 turns). B/R/Q slides must run
  to the end of the line (edge, capture, or their own blocker); stopping
  short is illegal. *Counterplay:* knights/pawns/king unaffected; lines can
  be shaped with their own blockers. *Vs pool:* all other slider hexes clamp
  reach; none remove the option to stop.
- **hw2_war_rations — War Rations** (passive, 5 turns). A budget of 2 captures
  across the window; after both are spent, no captures until it ends.
  *Counterplay:* choose which fights are worth a ration. *Vs pool:* Palsied
  Hands is no-consecutive-captures; Cream Pie is a flat ban; a spendable
  budget is new.

### Tier 4
- **hw2_witching_hour — The Witching Hour** (passive countdown, 4 turns).
  Every piece they move during the countdown is "touched"; at midnight all
  touched pieces freeze 2 turns. *Counterplay:* move few pieces, or only
  expendable ones. *Vs pool:* Doom March punishes POSITION immediately;
  Frozen Moment freezes only the next mover; nothing else freezes by
  activity-history at a deadline.
- **hw2_weight_of_toil — Weight of Toil** (passive, 6 turns). Any single piece
  making its third move in the window collapses (walnut 2 turns).
  *Counterplay:* spread the work; two moves per piece are always safe.
  *Vs pool:* Ball and Chain FORBIDS repeat moves; Rust punishes idleness;
  Groundhog Day FORCES repetition. Punishing overuse at a threshold is new.
- **hw2_compounding_misery — Compounding Misery** (activated). Freeze one
  targeted piece 1 turn + 1 per active curse-effect already afflicting them
  (max 4). The wave's "changes when stacked" card; the count reads only the
  synced `bs.effects` list (deterministic). *Counterplay:* strongest only
  when already buried in other hexes.
- **hw2_twinned_torment — Twinned Torment** (activated, two picks, 6 turns).
  Whenever one of the bound pair moves, the twin is frozen 1 turn.
  *Counterplay:* use one twin freely at the cost of benching the other;
  captured twins slip the bond. *Vs pool:* Chains of Binding tethers rooks by
  DISTANCE; this transmits motion into stun (sympathetic magic).

### Tier 5
- **hw2_cursed_coin — Cursed Coin** (activated mark, 8 turns, transfers). The
  holder can't capture and moves ≤2; the coin jumps to any of their pieces
  that ends adjacent to the holder (or that the holder sidles up to; rng pick
  among adjacent, drawn in onMovePlayed only). *Counterplay:* quarantine the
  holder; you destroy the coin by capturing the holder. *Vs pool:* Hot Potato
  is a move-compulsion on a fixed piece; nothing else transfers.
- **hw2_creeping_blight — Creeping Blight** (activated zone, 5 turns). One
  square in their half barred; spreads to one adjacent square in their half
  per turn (rng among frontier). *Counterplay:* visible growth, pieces inside
  may leave; route around it or fight in your half. *Vs pool:* Sinkhole /
  Black Hole / Haunted House are static traps; no zone GROWS.
- **hw2_queens_ransom — Queen's Ransom** (passive contract, 5 turns). Each
  queen move freezes two of their other pieces 1 turn (rng picks in hook).
  *Counterplay:* the queen is never restrained; benching her is free.
  *Vs pool:* all other queen hexes ban or leash her; a use-tax is new.
- **hw2_bound_court — Chains of the Court** (passive, 4 turns, cleansable).
  All their minors walnutted; if their KING steps onto d4/e4/d5/e5 the whole
  curse shatters at once. *Counterplay:* wait it out safely or march the king
  into the open. *Vs pool:* Statue Garden / Hex of Stone are fixed-length
  minor petrifies with no cure. (Cleanse removes walnuts standing on their
  minors; a concurrent minor-walnut from another card would be freed too —
  accepted, flavor-coherent.)

### Tier 6
- **hw2_gathering_storm — Gathering Storm** (passive, 6 turns, escalating).
  Stage 1 (turns 1–2): pawns can't advance; stage 2 (3–4): + minors can't
  cross the middle; stage 3 (5–6): + B/R/Q capped at 2 squares.
  *Counterplay:* stated schedule; strike before it peaks. *Vs pool:* Termites
  decays rook reach only; no other filter escalates in stages.
- **hw2_gravebloom — Gravebloom** (passive, 6 turns). Every square they
  capture on is barred to them for 3 turns after the kill. *Counterplay:*
  capture less, or on squares they don't need to reoccupy. *Vs pool:*
  dynamic terrain from THEIR captures; all barred zones in the pool are
  placed by the caster.
- **hw2_gilded_rot — Gilded Rot** (passive, 5 turns, accumulating marks).
  Each piece they move is gilded; gilded pieces cannot capture for the rest
  of the curse. *Counterplay:* ride a narrow set of pieces, or capture with a
  piece before touching it. The deliberate inverse of Weight of Toil
  (breadth punished vs depth punished).

### Tier 7 (bespoke animation scenes)
- **hw2_death_knell — Death Knell** (activated mark, 4-turn doom). The first
  hex on the engine's `timed_loss` timer: the target crumbles in 4 of their
  turns unless it captures anything first (the bribe annuls the sentence; the
  effect is spliced and the piece lives). *Counterplay:* stated on the card:
  feed the bell a pawn, trade the piece, or gamble. *Vs pool:* the exact
  mirror of occult Hex Doll (which kills IF the piece captures).
- **hw2_hollow_crown — The Hollow Crown** (passive, permanent contract).
  Whenever their king moves (castling included), their FOLLOWING turn is
  pawns-or-king only. *Counterplay:* keep the king still; the curse sleeps.
  *Vs pool:* Royal Summons forces king moves; the standing king-move tax is
  new, and it is the only permanent card in the wave (T8 Sealed Ramparts
  precedent for permanence at the top tiers).
- **hw2_tide_of_ash — Tide of Ash** (passive, 6 turns, advancing wall). Their
  1st rank barred immediately; the tide swallows one more home rank per turn
  up to their 4th; pieces in the ash may leave but nothing re-enters.
  *Counterplay:* advance ahead of the visible schedule; it all clears after
  their 6th turn. *Vs pool:* Fissure Field (static back rank) and Scorched
  Earth (static mid band) never MOVE.

### Tier 8 (bespoke animation scenes; always counterable)
- **hw2_crown_of_thorns — Crown of Thorns** (passive, 6 turns). Any enemy
  piece whose move leaves your king in check is frozen 2 turns where it
  stands; the check itself still counts. *Counterplay:* attack anything but
  the king for free; checks still land, only the attacker roots. Check-
  triggered punishment exists nowhere in the pool (`isInCheck` is already
  exported through hexes/shared).
- **hw2_pauper_crown — Pauper's Crown** (activated, 4 turns). Their queen
  becomes a ROOK (via `setPieceType` + a `timed_loss demote-into-q` timer the
  engine restores automatically); capturing anything while humbled recrowns
  her instantly. *Counterplay:* she still fights as a full rook, and the cure
  is in their hands. First transformation hex; no engine additions needed.
- **hw2_beacon_of_woe — Beacon of Woe** (activated on YOUR OWN piece, 6-turn
  fuse). When their 6th turn ends, all their N/B/R/Q freeze 2 turns; if they
  capture the bearer first the curse dies entirely. *Counterplay:* a stated
  hunt: the whole cure is killing one visible piece, and the caster pays by
  exposing/protecting the bearer. No other hex rides on a caster-owned piece.

## Engine notes / invariants observed

- Randomness only in `init` / `effect` / `onMovePlayed` (Cursed Coin jump,
  Creeping Blight spread, Queen's Ransom picks); never in `targets`/`status`.
- Every `filterOpponentMoves` keeps the non-empty fallback (no soft-locks);
  kings are never frozen/walnutted/removed/coin-marked/tolled.
- Effects added during the victim's own move are written `turns = N + 1`
  because the shared post-move tick fires after hooks (same convention as
  tier6/tier8 files); effects added at pick time use exact N.
- Piece tracking uses a local `followSq` (same semantics as helpers'
  `trackBoundPiece`, which hexes/shared does not re-export).
- Death Knell / Pauper's Crown splice their own `timed_loss` effect on the
  cleanse; hooks run before the engine's timer-follow, so the effect is
  matched on either `move.from` or `move.to`.
- Instance state is JSON-serializable throughout (arrays of squares, plain
  numeric-keyed records) so snapshots/replays persist it.
- No new engine fields, no edits outside the three assigned files.

## Animations (cursePlays.tsx / cursePlays.css)

Five original curse templates, each with a template-unique signature beat and
a per-card flourish that has a dedicated dressing block:

- **HexBrand** (seal slams down, scorch ring sears) — veto, longroad,
  bloodprice, tarnish, rations, stacked.
- **OmenBell** (bell descends and rocks, toll ripples) — omen, halfmeasure,
  midnight, toil.
- **BlightGarden** (rot spreads tile by tile, weeds sprout) — footprints,
  creep, gravebloom, stormwall.
- **ChainWeb** (chains whip across and cinch a shackle) — twin, noreins,
  recoil, ransom, courtlock.
- **MidasVeil** (gold veil crosses, figures gild in sequence) — coin, gilded.

Six fully bespoke scenes for T7–T8: DeathKnellScene (four counted toll rings
+ numeral countdown), HollowCrownScene (crown hollows over the throne, court
bows), TideOfAshScene (rolling ash wall, fleeing pawn), CrownOfThornsScene
(briar closes, checking bishop caught mid-lunge), PauperCrownScene (crown
lifts, shatters, battlements stamp down), BeaconOfWoeScene (tower, guttering
flame, six count-runes).

All art is self-contained SVG + `cwp-*` CSS keyframes (transform/opacity
only, `--fx-dur` scaled, one-shot `both` fill, ends at opacity 0, parked
under `html[data-anim="off"]`). Non-lead renders use a compact per-square
`CurseHit`. Sounds reuse existing `SigSoundKey`s only (shades, cathedral,
clockice, clockcage, petrify, petrifiedforest, coronation, crownrain, blitz,
siege, aegis, cataclysm, nova). `source` zones are declared only where the
card paints them at play time (Compounding Misery → frozen, Chains of the
Court → walnut).

## Validation

- `npx tsc --noEmit` — clean (app + server tsconfig builds).
- `npx eslint src/engine/buffs/hexes/wave2.ts
  src/components/effects/cursePlays.tsx` — clean.
- `node scripts/test-hexes.cjs` — "OK: static hex validation passed"
  (207 hexes; the house rule banning em/en dashes in descriptions is
  respected).
- `npm run test:animations` — PASS; all 27 entries parse (template + palette
  array + GLYPH + trailing flourish string / `S(Scene, {...})` bespoke form),
  every animId unique, shared-flagship baseline untouched.
- `node scripts/test-desync.cjs` — PASS (replay determinism unaffected).

## Left for the integrator (generated files, per instructions)

- `node scripts/check-sig-plugins.cjs --write` — regenerate `PLUGIN_IDS` in
  sigPlugins.tsx (it will drift-fail until then, by design).
- `node scripts/gen-card-icons.mjs` — generate card icons for the 27 new ids.
- `npm run test:animations -- --write` only if a deliberate re-baseline of
  docs/animation-registry.json is wanted (not required; the audit passes
  without it).
