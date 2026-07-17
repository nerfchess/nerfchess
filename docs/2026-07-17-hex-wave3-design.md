# Hex Wave 3 - design notes (2026-07-17)

Batch: 40 new hexes across tiers 1-8 in `src/engine/buffs/hexes/wave3.ts`
(ids all prefixed `hw3_`), wired into `hexes/index.ts` -> `NEW_HEXES` ->
`ALL_BUFFS` on one line beside `HEX_WAVE2`. Built on the wave2 idiom
(`tierHexes(t)`, shared helpers, `turns = N + 1` for effects added during the
victim's own move). No files touched outside the three assigned.

Design bar (owner spec): hexes are CURSES, not recolored restrictions - marks,
delayed punishments, triggered rules, contracts, spreading effects, possession,
board-reshaping fuses. Every card states what it affects, when it fires, how
long it lasts, whether it spreads/stacks, how it is cleansed, and how to avoid
it. The wave is biased HARD toward the families the 207-card pool lacked and
AWAY from the five saturated piles (petrify/stone 25, freeze/ice-as-identity
17, static barred 23, queen leash 19, draft denial 9). Freeze and walnut appear
ONLY as punishment COMPONENTS inside novel structures (exactly as wave2's
Witching Hour / Queen's Ransom / Twinned Torment / Crown of Thorns do), never
as a new "freeze the army" identity card. No new stone/ice/leash/draft-denial
identities were added; nothing brushes those piles.

## Family coverage vs the section-11 quota

| Family (quota) | Cards | Count |
| --- | --- | --- |
| Piece possession / turncoat (4) | Fifth Column, Mutiny, Sleeper Cell, The Enemy Within | 4 |
| Summoned hazards (4) | Wandering Sentry, Sinking Mire, Roaming Maw, Effigy of Dread | 4 |
| Mirrored / sympathetic (3) | Binding Oath, Blood Bond, Shared Fate | 3 |
| Delayed board changes / countdowns (5) | Slow Poison, Powder Keg, Collapsing Floor, Avalanche, The Long Eclipse | 5 |
| Marked-piece contracts (5) | Exile's Mark, Debtor's Mark, Forced Pilgrimage, Bounty Mark, Doomed Vow | 5 |
| Capture-conditioned (4) | Bloodlust, Aging Blade, Pyrrhic Toll, Blood Tithe | 4 |
| Check-triggered / king-movement (3) | Jammed Portcullis, Standing Guard, Martyr's Crown | 3 |
| Stacking / chained (3) | Feeding Frenzy, Hydra Hex, The Curse Engine | 3 |
| Transferable / contagion (3) | Handed Down, Miasma, Wildfire Rot | 3 |
| Temporary rule distortion (3) | Wrong Foot, No Retreat, The Inverted Crown | 3 |
| Promotion / tempo taxes (3) | Toll Road, Overexertion, Coronation Tax | 3 |

Total 40. Tier spread (verified live from `ALL_BUFFS`): **T1:4 T2:5 T3:6 T4:6
T5:6 T6:5 T7:4 T8:4** - the requested mix exactly. No T9 (apex is grant-only,
out of scope).

## Deviations from the brief

- **None to the quotas, tiers, or family bias.** All 11 families hit their
  seeded counts; the tier mix matches to the card.
- **Freeze/walnut as components.** Several cards use a short freeze as the
  bite (Blood Bond, Coronation Tax, Standing Guard, Pyrrhic Toll, Collapsing
  Floor, Martyr's Crown, The Curse Engine, Forced Pilgrimage, Miasma, Debtor's
  Mark, Overexertion, Hydra Hex, Jammed Portcullis). This is the established
  wave2 idiom (12 of wave2's 27 do the same); NONE is a "freeze N pieces"
  identity card - each freeze is the payload of a mark, contract, sympathetic
  link, capture trigger, or escalating chain. The five saturated piles gained
  zero new identity cards.
- **Turncoat overlap with wild/arcane.** The `wa_dominate_*` "Dominate" /
  "Grand Dominion" cards already flip a piece to the caster, but they are
  instant, cure-less GIFTS in the `pieces` (boon) category. The four turncoat
  hexes are all curse-shaped and each has a distinct TRIGGER and a stated
  cure: instant-pawn+auto-revert (Fifth Column), enemy-capture-triggered
  (Mutiny), fuse-telegraphed with a trade window (Sleeper Cell),
  overuse-triggered (The Enemy Within). Named as neighbors in-file.
- **Effigy of Dread places a caster-owned piece.** To give the "capture the
  hazard's anchor" counterplay axis, it summons a knight in the victim's half
  whose neighbor-ring is barred; the placement filter excludes any square from
  which the knight would check the enemy king (so it can never manufacture a
  probe soft-lock or a surprise mate), and the effigy is auto-removed
  (`uncounted`) on expiry so it can't become a permanent free knight.

## COMBO_TAGS - nothing to wire

Checked against the section-3 duties. **No wave-3 card needs a COMBO_TAGS
entry:**
- No card skips/blocks a whole opponent turn via `bs.skips` (Toll Road / the
  king-move and crossing taxes only restrict the piece CLASS of a single
  following turn, an effect-stack conditional on the victim's own action, the
  same safe shape wave2's Hollow Crown / Queen's Ransom use - not turn theft).
- No card touches drafts (no draft-denial members).
- No card freezes or petrifies the WHOLE army. The largest freezes hit one
  piece (The Curse Engine - strongest piece; Standing Guard - one guard), a
  single rank's occupants (Collapsing Floor), or the ring around one king
  (Martyr's Crown). None is army-wide, so no `mass-freeze` membership.

Balance-reviewer weight/tier notes (for your pass; I did not touch draft.ts):
the generous-tier calls to sanity-check are **Mutiny (T4)** - an
enemy-capture-triggered 3-turn defection is swingy, could sit T5; **Blood
Tithe (T8)** and **The Inverted Crown (T8)** are strong recurring denials
placed at T8 for their game-warping ceiling; **Pyrrhic Toll (T7)** and
**Hydra Hex (T7)** are on the milder side for T7 and could drop to T6 if the
band feels thin. All are playable at their current tier; these are only
"consider re-tiering" flags.

## Card list (mechanic + counterplay + anim)

### Tier 1 (small, fully readable rule distortions and taxes)
- **hw3_wrong_foot - Wrong Foot** (passive, 4 turns). Each of their moves must
  land on the opposite square-color from their last landing; king exempt, free
  turn if nothing fits. *Counterplay:* plan the light/dark sequence. *anim:*
  HexBrand, flourish "wrongfoot".
- **hw3_no_retreat - No Retreat** (passive, 5 turns). No piece may move toward
  its own back rank; king exempt, freed if it has no forward move.
  *Counterplay:* advance or move laterally; wait it out. *anim:* ChainWeb
  "noretreat".
- **hw3_overexertion - Overexertion** (passive, 5 turns). Moving the same
  piece two turns running freezes it 1 turn. *Counterplay:* alternate which
  piece you develop. *anim:* HexBrand "overexert".
- **hw3_toll_road - Toll Road** (passive, 6 turns). Any turn a piece crosses
  from their half into yours, their next turn is pawn-or-king only.
  *Counterplay:* invade sparingly; develop at home. *anim:* HexBrand
  "tollroad".

### Tier 2
- **hw3_fifth_column - Fifth Column** (activated, turncoat). One enemy pawn
  serves you for your next 3 turns, then reverts. *Counterplay:* capture/trade
  it; it returns on its own. *anim:* MidasVeil "fifthcolumn".
- **hw3_binding_oath - Binding Oath** (activated, sympathetic, 6 turns). Two
  bound enemy pieces may not capture while both live; trading one frees the
  other. *Counterplay:* sacrifice/trade one, or fight with other pieces.
  *anim:* ChainWeb "bindingoath".
- **hw3_slow_poison - Slow Poison** (activated countdown). A poisoned Q/R/B
  withers one rank down in 4 turns unless it captures (blood cure) or is
  traded. *Counterplay:* feed it a capture, trade it, or accept the demote.
  *anim:* OmenBell "slowpoison".
- **hw3_bloodlust - Bloodlust** (passive, 4 turns). A piece that captures must
  capture again next turn if it can. *Counterplay:* capture with a piece that
  has no follow-up, or don't capture. *anim:* HexBrand "bloodlust".
- **hw3_curse_hop - Handed Down** (activated, contagion, 6 turns). The bearer
  is hobbled to 2-square moves; capturing it makes the curse HOP to the nearest
  comrade instead of dying. *Counterplay:* strand it alone, then trade it.
  *anim:* MidasVeil "handeddown".

### Tier 3
- **hw3_wandering_sentry - Wandering Sentry** (instant hazard, 5 turns). A
  single barred tile patrols one rank, one file per turn, bouncing at edges.
  *Counterplay:* move through the gap behind its fixed beat. *anim:*
  BlightGarden "sentry".
- **hw3_bloodbond - Blood Bond** (activated, sympathetic, 6 turns). When one of
  a bound pair captures, the other freezes 2 turns; trading either cuts the
  bond. *Counterplay:* don't fight with them, or trade one. *anim:* ChainWeb
  "bloodbond".
- **hw3_exiles_mark - Exile's Mark** (activated contract, 6 turns). A marked
  N/B/R must move toward your half and reach it within 6 turns or crumble;
  reaching your half cures it. *Counterplay:* march it forward, trade it, or
  spend other pieces. *anim:* HexBrand "exile".
- **hw3_debtors_mark - Debtor's Mark** (activated contract, 6 turns). A marked
  piece runs up 1 turn of freeze-debt (cap 4) per idle turn, collected when it
  finally moves. *Counterplay:* move it often (debt stays 0) or bench it
  forever. *anim:* HexBrand "debtor".
- **hw3_jammed_castle - Jammed Portcullis** (passive, 10 turns). If they
  castle, the castled rook freezes 3 turns two turns later. *Counterplay:*
  don't castle, or accept a stranded rook. *anim:* OmenBell "jammedgate".
- **hw3_coronation_tax - Coronation Tax** (passive, 6 turns). Each promotion
  freezes a DIFFERENT one of their pieces 2 turns. *Counterplay:* delay the
  promotion or pay knowingly. *anim:* HexBrand "coronationtax".

### Tier 4
- **hw3_mutiny - Mutiny** (passive turncoat, 6 turns). The first enemy KNIGHT
  to capture defects to you for 3 turns, then returns. *Counterplay:* capture
  with anything but a knight; keep knights home. *anim:* MidasVeil "mutiny".
- **hw3_sinking_mire - Sinking Mire** (instant hazard, 5 turns). A plus-shaped
  barred mire that SHRINKS one square per turn until gone. *Counterplay:* route
  around and wait it out. *anim:* BlightGarden "mire".
- **hw3_time_bomb - Powder Keg** (activated countdown). A keg on an empty
  square detonates in 4 turns, removing enemy non-kings on/next to it.
  *Counterplay:* clear the blast radius before the fuse ends. *anim:* OmenBell
  "powderkeg".
- **hw3_pilgrimage - Forced Pilgrimage** (activated contract, 6 turns). A
  marked piece must reach a named shrine square within 6 turns or freeze 3;
  reaching it cures. *Counterplay:* walk it there, trade it, or let it fall.
  *anim:* HexBrand "pilgrimage".
- **hw3_aging_blade - Aging Blade** (passive capture-trigger, 6 turns). A Q/R/B
  that captures ages one rank down on the spot (floor: knight). *Counterplay:*
  trade with knights/pawns; refuse heavy trades. *anim:* MidasVeil "agingblade".
- **hw3_miasma - Miasma** (passive contagion, 6 turns). A piece that ends its
  move beside another of their pieces grows sick; the third dose freezes it 2.
  *Counterplay:* keep pieces spread apart. *anim:* BlightGarden "miasma".

### Tier 5
- **hw3_defectors_mark - Sleeper Cell** (activated turncoat). A marked minor
  defects to you on its 4th-turn fuse for 3 turns; capturing/trading it before
  then foils the plot. *Counterplay:* root it out before the fuse. *anim:*
  MidasVeil "sleeper".
- **hw3_roaming_void - Roaming Maw** (instant hazard, 6 turns). A single void
  drifts one step toward their nearest piece each turn and devours whatever it
  reaches (never the king). *Counterplay:* flee its visible next step. *anim:*
  BlightGarden "maw".
- **hw3_shared_fate - Shared Fate** (activated sympathetic, 8 turns). Capturing
  one of a bound pair kills the other outright. *Counterplay:* trade/bench one
  before it can be struck; guard both. *anim:* ChainWeb "sharedfate".
- **hw3_collapsing_floor - Collapsing Floor** (activated countdown). A chosen
  rank in their half caves in after 3 turns, freezing everything still on it 2
  turns. *Counterplay:* evacuate the rank. *anim:* OmenBell "collapse".
- **hw3_bounty_mark - Bounty Mark** (activated contract, 6 turns). A marked
  piece freezes itself 2 turns each time it captures. *Counterplay:* keep it
  out of combat; trade it. *anim:* HexBrand "bounty".
- **hw3_wildfire - Wildfire Rot** (activated contagion, 6 turns). Rotten pieces
  can't capture and the rot spreads to one adjacent comrade per turn; capturing
  a rotten piece burns that infection out. *Counterplay:* quarantine (isolate),
  trade the sick. *anim:* BlightGarden "wildfire".

### Tier 6
- **hw3_effigy_of_dread - Effigy of Dread** (instant summoned hazard, 6 turns).
  A caster-owned effigy in their half bars the ring around it; capturing the
  effigy ends it. *Counterplay:* smash the anchor, or route around. *anim:*
  BlightGarden "effigy" (or greatPlays PhantomParade).
- **hw3_avalanche - Avalanche** (passive countdown). Dormant 3 turns, then for
  3 turns they may not move onto any EMPTY square in their own half (captures
  and advances into your half stay legal; non-empty fallback). *Counterplay:*
  hold ground / spread out before it drops. *anim:* BlightGarden "avalanche".
- **hw3_kings_guard - Standing Guard** (passive king-movement, 6 turns). Each
  king move freezes the piece nearest the king 1 turn. *Counterplay:* keep the
  king still. *anim:* ChainWeb "kingsguard".
- **hw3_feeding_frenzy - Feeding Frenzy** (passive stacking, 6 turns). Their
  slider reach is capped, and the cap tightens per other active curse-effect on
  them. *Counterplay:* cleanse the other curses to loosen it. *anim:* HexBrand
  "feedingfrenzy" (or greatPlays WitchCircle).
- **hw3_doomed_vow - Doomed Vow** (activated contract, 5 turns). A condemned
  piece is removed in 5 turns unless their KING stands adjacent to it first.
  *Counterplay:* march the king to rescue it (risky), or write it off. *anim:*
  OmenBell "doomedvow".

### Tier 7 (bespoke scenes)
- **hw3_enemy_within - The Enemy Within** (activated turncoat). A marked R/Q
  defects on its 3rd move (overuse) for 4 turns, then returns. *Counterplay:*
  bench it (never move it thrice) or trade it. *anim:* bespoke
  EnemyWithinScene (a piece's shadow peels off and turns its coat).
- **hw3_eclipse - The Long Eclipse** (passive countdown). Dormant 3 turns, then
  their bishops and queen cannot move for 3 turns. *Counterplay:* use the
  diagonals early; rely on knights/rooks during the dark. *anim:* bespoke
  EclipseScene (sun blackens, diagonal pieces blinded).
- **hw3_hydra_hex - Hydra Hex** (activated chained, 8 turns). Capturing the
  branded head freezes the two nearest enemy pieces 2 turns each. *Counterplay:*
  leave it alone, or isolate it so the spawn has nothing to seize. *anim:*
  bespoke HydraScene (severed head, two rise).
- **hw3_pyrrhic_toll - Pyrrhic Toll** (passive capture-trigger, 6 turns). Every
  capture freezes a random bystander piece 1 turn. *Counterplay:* refuse
  trades. *anim:* bespoke PyrrhicScene (a laurel wilts as a bell tolls; OmenBell
  is an acceptable fallback).

### Tier 8 (bespoke scenes)
- **hw3_martyrs_crown - Martyr's Crown** (passive check-trigger, 6 turns). A
  single check is free; the SECOND check freezes every enemy piece next to your
  king 2 turns and resets. *Counterplay:* don't stack checks; threaten
  elsewhere. *anim:* bespoke MartyrScene (briar crown, second thorn lashes; or
  godPlays CelestialRing).
- **hw3_curse_engine - The Curse Engine** (passive escalating, 9 turns). Winds
  each turn; every third turn it freezes their strongest piece 2 turns.
  *Counterplay:* outlast it; keep the best piece expendable when the discharge
  looms. *anim:* bespoke CurseEngineScene (grinding gears, discharge; or
  godPlays ChronoLord).
- **hw3_blood_tithe - Blood Tithe** (passive capture-trigger, 6 turns). Each
  capture of a non-pawn claims one of their own pawns as tribute.
  *Counterplay:* refuse heavy trades; once pawnless it goes unpaid. *anim:*
  bespoke BloodTitheScene (a ledger, a pawn dragged off; or godPlays
  ReaperSweep).
- **hw3_inverted_crown - The Inverted Crown** (passive rule distortion, 6
  turns). Every pawn they promote is forced to a KNIGHT, whatever they chose.
  *Counterplay:* hold the pawn back until the window passes. *anim:* bespoke
  InvertedCrownScene (a crown flips to tin; or greatPlays CrownForge).

## Engine notes / invariants observed

- **Determinism.** `api.rng` is drawn only inside `init`/`effect`/
  `onMovePlayed` (Coronation Tax, Pyrrhic Toll, Blood Tithe bystander/pawn
  picks), never in `targets`/`status`. All hazard movement, contagion spread,
  nearest-piece and strongest-piece picks are deterministic (min-Chebyshev /
  value with lowest-index tie-breaks; no rng).
- **Non-empty fallback.** Every `filterOpponentMoves` returns the original list
  when its filtered set is empty (Wrong Foot, No Retreat, Toll Road, Binding
  Oath, Bloodlust, Handed Down, Exile's Mark, Wildfire Rot, Avalanche, Feeding
  Frenzy, The Long Eclipse); the pure-filter cards use the `curse()` wrapper
  which enforces the guard.
- **Kings are sacred.** Never frozen, walnutted, removed, possessed, demoted,
  or transformed. Every target list and every effect loop excludes `type === "k"`;
  the roaming maw refuses to devour a king; Effigy of Dread refuses a placement
  that would check the enemy king.
- **Turn accounting.** Effects added during the victim's own move use
  `turns = N + 1` (Overexertion, Coronation Tax, Blood Bond, Bounty Mark,
  Standing Guard, Pyrrhic Toll, Collapsing Floor, Forced Pilgrimage, Miasma,
  Debtor's Mark, Martyr's Crown, The Curse Engine, Jammed Portcullis, and the
  refreshed hazard barred tiles). Effects added on the caster's own turn or move
  use exact `N` (Slow Poison / Exile's Mark / Doomed Vow `timed_loss` timers;
  Hydra Hex spawn freezes, which fire on the caster's capturing move whose
  post-tick does not touch an opp-owned freeze).
- **Possession** (Fifth Column, Mutiny, Sleeper Cell, The Enemy Within) reuses
  a single local `tickDefect` runner modeled on `wa_dominate_minor`: it follows
  the loaned piece, ends the moment it is captured, and reverts it to the victim
  only while it is still the caster's and not a king.
- **Cleanse splices** (Slow Poison, Exile's Mark, Doomed Vow) match the pending
  `timed_loss` on either `move.from` or `move.to` (hooks run before the engine's
  timer-follow), exactly as wave2's Death Knell / Pauper's Crown do.
- Instance state is JSON-serializable throughout (square numbers, plain
  numeric-keyed records, square arrays) so snapshots/replays persist it.
- No new engine fields, `ActiveEffect` kinds, API mutators, or dependencies;
  relative imports only.

## Mobile / spectator

Per section 9: there is no per-card mobile handling anywhere in the engine or
effects tree, and none is needed here. Every card is deterministic and its
future animation degrades to nothing under `html[data-anim="off"]`; spectator/
replay parity is generic.

## Validation

- `npx tsc --noEmit` - clean (app + `tsconfig.server.json`).
- `npx eslint src/engine/buffs/hexes/wave3.ts src/engine/buffs/hexes/index.ts`
  - clean.
- `npm run server:build` - clean.
- `node scripts/test-hexes.cjs` - "OK: static hex validation passed" (247
  hexes; soft-lock probe, count-target termination, walnut-lifetime, king-freeze
  and em/en-dash checks all pass over the registered pool). Tier spread
  `{"1":22,"2":26,"3":36,"4":41,"5":42,"6":32,"7":24,"8":21,"9":3}` (wave-3
  adds 4/5/6/6/6/5/4/4).
- `node scripts/test-desync.cjs` - "OK: desync harness passed".
- Scratchpad smoke: 1006 pool cards, **0 duplicate ids pool-wide**, 40 `hw3_`
  cards all `implemented:true` / category `hex`, 0 em/en dashes, **0 display-name
  collisions** with any existing card.

## Left for the integrator / downstream agents (per instructions)

- Animation Mapper: build the 40 flagships in `cursePlays.tsx` per the `anim:`
  suggestions above (unique flourish per T1-T6 card on the five curse
  templates; bespoke S-scenes for the eight T7-T8 marquees).
- Balance Reviewer: no COMBO_TAGS additions needed (see above); optional
  re-tier flags listed. draft.ts weights untouched.
- Integrator: `gen:icons`, `check-sig-plugins --write`, passive-composition
  regen, `test:animations` (not run here per instructions).

---

## Balance review (2026-07-17, Balance and Interaction Reviewer)

Adversarial pass over all 40 `hw3_*` hexes against the full pool. One code
change applied to `wave3.ts`; no `draft.ts` change. Validation re-run clean
(`tsc`, `server:build`, `test-hexes` OK, `test:desync` OK, eslint clean, pool
smoke: 40 hexes, 0 new id/name collisions, 0 em/en dashes). Post-change tier
spread reported by `test-hexes`: `{1:22,2:26,3:36,4:41,5:42,6:33,7:23,8:21,9:3}`
(wave-3 now 4/5/6/6/6/6/3/4 after the Hydra move).

### Change made

1. **`hw3_hydra_hex` - retier T7 -> T6 (H7 -> H6).** Its payload (freeze the
   two nearest enemy pieces) fires ONLY when the caster chooses to capture the
   branded head - a caster-optional, upside-only trigger the victim can largely
   ignore (don't cluster near the head; the caster captures it anyway when it
   suits them). Its value as a CURSE is well under the T7 band (The Enemy
   Within's 4-turn major defection, The Long Eclipse's 3-turn queen+bishop
   lockout), matching the designer's own "could drop to T6" flag. Stamped H6 in
   place; only its `.tier` (what the draft pool reads) changes, the source block
   stays in order.

### Designer re-tier flags: decisions

- **Mutiny (T4) - kept T4.** An enemy-capture-triggered 3-turn knight defection
  is swingy but doubly conditional: the victim must choose to capture WITH a
  knight, and the caster cannot pick when/where it fires. That unreliability
  keeps it below the chooseable T5 defection (Sleeper Cell); the stated
  counterplay ("capture with anything but a knight; keep knights home") is
  clean. Kept.
- **Blood Tithe (T8) - kept T8.** A recurring per-heavy-capture material drain
  over 6 turns has a genuinely game-warping ceiling in a grind; T8 is right.
- **The Inverted Crown (T8) - kept T8.** Situational (only bites during an
  active promotion window) but the ceiling is decisive - denying a queen
  promotion in a pawn endgame. The ceiling, not the floor, sets the tier.
- **Pyrrhic Toll (T7) - kept T7.** Unlike Hydra, its bystander-freeze fires on
  the VICTIM's captures (not caster-optional) and RECURS for the whole 6-turn
  window, so it bleeds a capture-heavy game meaningfully more than Hydra's
  one-shot payload. Left at T7.

### COMBO_TAGS - verified, no entry needed (not trusted)

Re-derived from the section-3 duties rather than accepting the designer's note.
No wave-3 hex qualifies:
- **Turn theft:** no card writes `bs.skips` or skips a whole opponent turn.
  Toll Road / the king-move and crossing taxes only restrict the piece CLASS of
  a single following turn, conditional on the victim's own action - the safe
  Hollow Crown / Queen's Ransom shape, not turn theft.
- **Draft denial:** no wave-3 hex touches any draft flag.
- **Mass freeze:** no card freezes/petrifies the WHOLE army. The largest
  freezes hit one rank's occupants (Collapsing Floor), the ring around one king
  (Martyr's Crown), the strongest single piece (The Curse Engine), or one
  bystander per trigger (Pyrrhic Toll / Coronation Tax). None is army-wide.

### Considered and rejected / accepted-as-is

- **Soft-lock via stacked barred hazards.** Wandering Sentry / Sinking Mire /
  Roaming Maw / Effigy of Dread / Powder Keg all place small barred footprints
  in the victim's half. Even layered, they bar only a handful of squares. More
  importantly the engine's `resolveNoMoves` turns a zero-legal-moves state
  (with pieces on the board) into a FORCED PASS - effects tick, the turn passes
  back, and only a genuinely empty pseudo-legal `generateMoves` (bare stalemate)
  is a loss. So no barred/filter stack in this batch can manufacture an
  unavoidable loss; worst case is a single ticked-away pass. Accepted. (Every
  `filterOpponentMoves` in the batch also self-guards: `curse()`/`timedOppFilter`
  wrap the non-empty fallback, and the raw filters - Toll Road, Binding Oath,
  Bloodlust, Handed Down, Exile's Mark, Wildfire Rot, Avalanche, Feeding Frenzy,
  The Long Eclipse - each return the original list when filtering to empty.)
- **`hw3_effigy_of_dread` places a caster-owned knight.** Verified it refuses
  any placement that would check the enemy king (no probe soft-lock, no surprise
  mate) and auto-removes itself `uncounted` on expiry. The victim can capture
  it (a slider slides over the empty barred ring to land on the centre; the ring
  bars landing, not passing), which ends the curse - the stated counter. The
  caster can also manoeuvre the knight offensively, making this a strong T6, but
  it is capturable and cannot deliver an unavoidable finish. Accepted.
- **Possession via `setPieceColor` (Fifth Column, Mutiny, Sleeper Cell, The
  Enemy Within).** A flipped piece can, after reverting, appear as a new attack;
  all four never touch a king, end the moment the loaned piece is captured, and
  revert only while it is still the caster's and not a king (`tickDefect`). A
  defection that then checks the victim's king is avoidable (the trigger is the
  victim's own capture/over-use, and the curse is announced) - the established
  `wa_dominate_*` shape. A possessed pawn pushed to promotion by the caster
  reverts as the VICTIM's piece (a self-punishing edge for the caster), not an
  exploit. Accepted.
- **Contagion / hazard termination.** Wildfire Rot spreads at most one piece per
  turn and is bounded by the 6-turn window and the victim's piece count; Roaming
  Maw / Wandering Sentry / Sinking Mire move one deterministic step per turn and
  expire on their fuse. Miasma's sick-count map is remapped across every move and
  never grows unbounded. No ping-pong or non-terminating loop. Accepted.
- **`timed_loss` cleanse splices** (Slow Poison, Exile's Mark, Doomed Vow,
  Forced Pilgrimage) match by square on `move.from`/`move.to`; two marks on the
  same piece is a caster-chosen edge only. Accepted.
- **Determinism.** `api.rng` appears ONLY in `onMovePlayed` (Coronation Tax,
  Pyrrhic Toll, Blood Tithe - single uniform "chosen by the curse" picks),
  never in `targets()`/`status()`; no `Math.random`/`Date`; the `Math.floor(len/2)`
  hazard-centre picks are pure functions of the candidate array. Replay-safe.
  (Note: the hex batch, unlike the boon batch, does use rng - correctly, in
  replayed hooks only - so "zero rng" applies to boons, not hexes; the three
  uses are single non-repeated picks, not excessive randomness.)

### Verdict by review dimension (hexes)

1. Duplicates: none within wave 3 or against the pool (turncoat/possession
   overlap with `wa_dominate_*` is differentiated by trigger + stated cure; 0
   new name collisions).
2. Tier placement: one retier (Hydra Hex T7 -> T6); other flagged cards kept
   with reasoning.
3. Oppressive combos: none reach a lockout; no COMBO_TAGS needed.
4. Infinite loops: none (all hazards/contagion are fused and bounded).
5. Randomness: three deterministic single-pick rng draws, all in replayed
   hooks; no hidden nondeterminism.
6. Counterplay/wording: every hex states trigger/target/duration/cleanse; no
   em/en dashes.
7. Broken stacking: same-id double-hold impossible; per-piece marks are guarded;
   overlapping barred footprints are harmless (redundant).
8. Impossible states/soft-lock: none - non-empty fallbacks present in every
   opponent-move filter AND the engine forced-pass backstop holds; kings never
   frozen/possessed/removed; Effigy refuses check-giving placement.
9. Cross-family: turn-taxes are the safe conditional-on-own-action shape (not
   turn theft); no wave-3 hex makes an existing nerf's loss unavoidable.
