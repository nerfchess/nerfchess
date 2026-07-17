# Nerf Wave 2 + High-Tier Rebalance (2026-07-17)

Two jobs in one pass on the nerf side of the library:

1. **Wave 2 fill batch** — 16 new nerfs in `src/engine/nerfs/wave2.ts` (ids
   prefixed `nw2_`), targeted at the thin rungs of the ladder: 4 each at
   tiers 1, 2, 7 and 8. Tier spread moves from
   T1:22 T2:31 T7:27 T8:17 to T1:26 T2:35 T7:31 T8:22 (death_wish also moved
   6 to 8, see below; T6 drops 58 to 57).
2. **Tier 6-8 rebalance audit** — every tier 6-8 card reviewed against power vs
   tier, duration, trigger frequency, counterplay, randomness, king/clock
   impact, forced-loss potential, and drafted-while-behind impact. 12 cards
   received surgical changes; each is documented below with problem, change,
   and before/after behavior.

Every nerf (new and rebalanced) has a passive-visual entry; the registry data
was regenerated with `npx tsx scripts/gen-passive-compositions.ts` and
`npm run test:passive-registry` passes (609 entries, all sentences unique).

---

## Part 1 — Wave 2 nerfs (`src/engine/nerfs/wave2.ts`)

Design rules applied to every card: the rule is stated fully in the
description (what is affected, when/how long, what triggers it, and the
escape hatch); mechanics are deterministic (no RNG in any wave-2 card);
conditional filters carry the `filtered.length ? filtered : moves` fallback
and were probed for soft-locks (2 colors x 5 seeds x 30 plies, ad-hoc probe on
top of `test:nerfs`).

### Tier 1 (trivial)

| id | name | rule | how to play around it |
|---|---|---|---|
| `nw2_late_riser` | Late Riser | Queen frozen for your first four moves. | Develop minors and pawns first; the queen rarely moves that early anyway. |
| `nw2_opening_ceremony` | Opening Ceremony | Your first move of the game must be a pawn move. | Open 1.e4/1.d4-style; delay the knight-first repertoire by one move. |
| `nw2_gentle_shepherds` | Gentle Shepherds | Bishops can't capture pawns. | Take pawns with anything else; aim bishops at pieces. (Bishop-only sibling of `soft_paws`; `elephants_fear_mice` is the tier-3 superset.) |
| `nw2_silent_infantry` | Silent Infantry | Pawn moves that would give check are forbidden (a pawn may still capture the king). | Deliver checks with pieces; keep a piece ready near their king in pawn-storm endgames. |

### Tier 2 (small tactical friction)

| id | name | rule | how to play around it |
|---|---|---|---|
| `nw2_clean_hands` | Clean Hands | Your king can't capture. Completes the "X can't capture" family (queen/rook/bishop/knight/pawn versions all exist). | Keep an escort piece near the king to do the taking, especially in pawn endgames. |
| `nw2_cold_trail` | Cold Trail | You can't move onto the square the opponent's last move just left. | Wait one move before re-occupying; keep a second route to key squares. (Mirror of tier-1 `no_takebacks`, which bans your own last origin.) |
| `nw2_rusty_hinges` | Rusty Hinges | Castling is only legal during your first ten moves (progress bar shown). | Commit to a king plan early; castle by move 10 or plan an uncastled game. |
| `nw2_minor_nobility` | Minor Nobility | Pawns promote only to knight or bishop. | Steer endgames toward positions a minor piece wins; use promotion races carefully. |

### Tier 7 (unhinged but survivable)

| id | name | rule | how to play around it |
|---|---|---|---|
| `nw2_chameleon` | Chameleon | Every move must end on its starting square color (knights never move; pawns double-step or capture; king/rooks diagonal or even distances; castling stays legal). | Build the game around bishops and the queen; bank double pawn pushes; castle for king safety. |
| `nw2_royal_entourage` | Royal Entourage | Only pieces starting within two king-steps of your king may move (fallback if the entourage is boxed). | March the king with the army; keep your active pieces inside the bubble; the whole force crawls forward together. |
| `nw2_metronome` | Metronome | Each move must travel exactly as far (king-steps) as your previous move, when possible; knight moves count as two (hint shows the beat). | Settle into a sustainable beat: distance-1 shuffles or the knight's steady two; break tempo only when no on-beat move exists. |
| `nw2_grandstanding` | Grandstanding | Each move must be one of the longest available this turn (hint shows the required distance). | Keep the position closed so the longest available move stays short; open lines only when the long move is the one you want. |

### Tier 8 (brutal, never an unavoidable loss)

| id | name | rule | how to play around it / why it is never unavoidable |
|---|---|---|---|
| `nw2_killing_spree` | Killing Spree | Your first capture starts a spree: every following turn must capture, or you lose. Capturing the king ends it in victory. | Play pacifist (tier-8 `total_pacifism` proves that line is survivable) until you can count a capture chain that ends on the king. Hint warns during the spree. |
| `nw2_pyrrhic_victories` | Pyrrhic Victories | Any piece that captures is petrified forever. The king is immune (no king immobilization; game always winnable). | Spend only pieces you can afford as statues; do your late capturing with the king. Petrified pieces are highlighted; progress counts them. |
| `nw2_doomsday_clock` | Doomsday Clock | Capture the enemy king by your 45th move or lose (progress bar; warning inside the last 10). | Play for the win from move one; 45 own moves is a full game's worth of attacking chances. Escalation of siege (20) / deadline_queen (25) at tier 6. |
| `nw2_shield_wall` | Shield Wall | You lose if you end your own turn with no pawn adjacent to your king (after-my-move grace: a shield broken on their turn gives you one move to restore it; hint fires when bare). | Keep the king inside his pawn shelter and never spend the last nearby pawn. Pawn-specific, graced escalation of tier-5 `bodyguard`. |

Duplicate scan: all mechanics were checked against `implemented.ts`,
`extras.ts`, `more.ts`, `wild.ts`, `expanded/*` and the `library.ts` STUBS
list; each card's closest neighbors are named in an in-source comment.

---

## Part 2 — Tier 6-8 rebalance changes

A recurring theme found in the audit: several loss-condition cards were judged
**the instant the opponent's move created the losing condition**
(`checkLossConditions` runs after every ply), so an ordinary, unknowing
opponent move ended the game with zero response. The fix used throughout is
the **after-my-move grace pattern** already proven by `cowardly` and
`eye_for_an_eye`: the loss is only judged when the last move in history is the
owner's, so an opponent-created violation gives the owner exactly one turn to
repair it. Each such card also gained a warning `hint` while in violation.

### Changes (card -> problem -> change -> before/after)

1. **`hold_them_back` (T8, implemented.ts)** — trigger zone too large / no
   counterplay. An enemy pawn crossing the midline (rank 4/5) happens in
   nearly every opening within a few moves and cannot be prevented (pawns push
   into attacked squares freely): a near-instant lottery loss.
   **Change:** trigger zone shrunk from your half (4 ranks) to your first
   three ranks. *Before:* 1...e5-e4 style pushes ended the game by move ~5.
   *After:* a pawn must advance one rank deeper, so it can be captured or
   blockaded while it stands on your 4th rank. Distinct from
   `homeland_security` (any piece, two home ranks, T6).

2. **`abstinence` (T7, more.ts)** — opponent-controlled lottery. "Two
   same-type non-pawns adjacent" fires on completely ordinary opponent play in
   their own camp (connected rooks after castling, doubled rooks), with zero
   owner agency. **Change:** the pair only counts when both pieces stand in
   the owner's half. *Before:* opponent castles and connects rooks -> you
   lose. *After:* only paired invaders kill you, and you can contest them.

3. **`boastful` (T7, more.ts)** — instant judgment. Any trade sequence where
   the opponent captured first was an immediate loss (no recapture window).
   **Change:** after-my-move grace + warning hint. *Before:* opponent takes a
   pawn -> instant loss. *After:* you get one move to restore parity
   (recapture); ending your own turn outnumbered still loses.

4. **`glorious_battle` (T7, more.ts)** — random + frequently unavoidable. A
   hidden window starting on move 4-11 demanded an *available* capture on 4
   consecutive turns; that early there is often no contact at all, so the RNG
   alone decided the game. **Changes (3 surgical):** window start 4-11 ->
   9-16 (midgame, contact exists); length 4 -> 3 turns; the start is announced
   two turns ahead via hint, with progress tracking. *Before:* hidden early
   execution. *After:* a telegraphed midgame gauntlet the owner can prepare
   for (keep tension, refuse early trades).

5. **`death_wish` (more.ts)** — under-tiered: **tier 6 -> 8** (mechanics
   unchanged). Whenever a suicidal king step exists the filter forces it and
   the opponent simply takes the king: strictly more lethal than
   `bottled_lightning` (T8), with the same boxed-king counterplay. It now sits
   on the same rung.

6. **`helicopter_parent` (T6, more.ts)** — stricter than cards two tiers up.
   "Any undefended pawn = loss" (even with no attacker on the board) made
   every pawn advance a standing death sentence; harder than
   `house_of_cards` (T8), which at least requires an attacker.
   **Changes:** pawn must be **attacked and** undefended; after-my-move grace;
   warning hint marking exposed pawns. *Before:* undefended-but-unattacked
   pawn = loss on the spot. *After:* only a genuinely hanging pawn loses, and
   you get one move to defend or move it.

7. **`closed_book` (T6, more.ts)** — glass pawns in disguise. Any single open
   file lost: losing one lone-file pawn, or making almost any pawn capture of
   your own (it empties the source file), was an instant loss.
   **Change:** one open file tolerated; the loss fires at two, with a
   progress readout (`n/2 open files`). *Before:* one pawn break = loss.
   *After:* you can absorb one break or make one capture toward a file; the
   keep-your-structure identity survives.

8. **`inching_forward` (T6, more.ts)** — guaranteed loss bug. The required
   king rank advanced every 6 moves without a cap, demanding a rank beyond the
   board from your 48th move on: an unavoidable loss in any long game.
   **Change:** required advance capped at your 7th rank
   (`Math.min(6, moveNumber / 6)`). *Before:* move 48 = automatic loss.
   *After:* the endgame demand plateaus at "reach and hold the enemy's second
   rank": brutal, but a target a king can actually satisfy.

9. **`wn_glass_queen` (T7, wild.ts)** — instant judgment. Any ordinary
   opponent developing move that happened to attack the queen ended the game
   unanswerably. **Change:** after-my-move grace + warning hint on the menaced
   queen. *Before:* Bg4 -> instant loss. *After:* the attack gives you one
   turn to move her, block, or take the attacker; ending your own turn with
   her attacked still shatters her.

10. **`wn_pin_cushion` (T7, wild.ts)** — instant judgment, high trigger
    frequency. Two of your pieces being attacked at once occurs from routine
    opponent moves, not just forks. **Change:** after-my-move grace + warning
    hint marking the attacked pieces. *Before:* opponent's move attacks two
    pieces -> immediate loss. *After:* you must end each of your turns with at
    most one non-king piece attacked; the fork threat is now a puzzle, not an
    execution.

11. **`wn_house_of_cards` (T8, wild.ts)** — instant judgment. Same pattern at
    tier 8: an opponent move creating an attacked-and-undefended piece toppled
    the house before you could respond. **Change:** after-my-move grace +
    warning hint on loose pieces. *Before/after:* as above; failing to end
    your own turn clean is still the promised tier-8 loss.

12. **`war_footing` (T7, expanded/tier7.ts)** — hidden hard deadline. With at
    most 15 enemy units to capture, a 10-quiet-move budget capped the whole
    game near 25 of your moves, converting most normal wins into clock-out
    losses. **Change:** quiet budget 10 -> 14 (description, loss check, and
    progress updated). *Before:* ~25-move game cap. *After:* ~29 moves; still
    demands a fast, violent game, but a direct attacking plan can finish
    inside it.

### Audited and deliberately left alone (with reasons)

- **`hoarder`, `wn_glass_army`, `always_check_it_might_be_mate`** — the
  "glass" identity cards: extreme by design, fully readable, and their
  counterplay (total material discipline / king safety above all) is the
  card's whole point. Precedented ladder: three_check (T3) -> always_check
  (T7); my_kingdom_for_a_horse (T7) -> glass_army (T8).
- **`own_half_only`, `serf_labor`, `total_pacifism`, `bottled_lightning`,
  `march_or_die`** — brutal filters/counters with known managed lines; no
  randomness, no instant opponent-triggered loss.
- **`unlucky`, `wn_floor_is_lava`** — very random but filter-only (never a
  loss), both backed by the engine's empty-filter net.
- **`wn_regicide_clock`, `feast_or_famine`, `wn_deadline_queen`, `siege`** —
  deadline/treadmill cards with visible progress and filter assists; within
  tier expectations.
- **`my_kingdom_for_a_horse` (T7)** — a two-piece glass card one rung below
  glass_army; consistent as-is.

Cards changed: 12 (11 mechanical + 1 pure tier move), within the ~15-card
budget. No card was rewritten wholesale; every change is one of the approved
tools (smaller target area, grace window, visible warning via hint/progress,
delayed/later activation, budget increase, tier move, cap on escalation).

---

## Infrastructure note (out-of-scope file, flagged)

`npm run server:build` (a prerequisite of `test:nerfs`) was **already broken
at HEAD**: the wave-2 scaffolding commit introduced `@/…` alias imports in
both `src/engine/nerfs/wave2.ts` and `src/engine/buffs/boons2.ts`, and
`tsconfig.server.json` has no alias mapping (nor would tsc rewrite the alias
in emitted CommonJS). `wave2.ts` was fixed as part of this work; the
**one-line import path fix** in `boons2.ts` (`"@/engine/buff"` ->
`"../buff"`) was required to make any engine test runnable. It is a pure path
change with zero behavior change, but the file is in the buffs tree, so it is
flagged here for the integrator.

## Validation

- `npx tsc --noEmit` — clean.
- `npm run test:nerfs` — PASS (358 nerfs total, all implemented; expanded
  probe green).
- Ad-hoc wave-2 soft-lock probe (2 colors x 5 seeds x 30 plies per card) —
  no soft-locks, no throws.
- `npx tsx scripts/gen-passive-compositions.ts` — regenerated (609 entries).
- `npm run test:passive-registry` — PASS (609 entries, 358 nerfs + 251 buffs,
  all sentences unique, budgets valid).
- `npx eslint` on every touched file — clean.
- Not run (integrator's job per instructions): `gen:icons`,
  `check-sig-plugins`, `test:animations`.
