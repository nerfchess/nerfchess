# Mega Rules, Hexes, Draggable Items, and Leaderboard Seeding

Design doc. Author: Claude. Date: 2026-07-05. Status: approved to build (owner said go).

## Goal

Grow NerfChess to at least 300 fully playable nerfs and at least 300 fully
playable buffs (more is better), with special emphasis on two families the
owner asked for:

1. Hexes: cards that nerf your OPPONENT (nerf mode's curse pool). Target 10 to
   15 per tier across all 8 tiers.
2. Nerf-relief boons: buffs that make YOUR OWN nerf less bad.

Every card must be: wired into the engine (no permanent stubs), balanced in the
correct tier, explained clearly, and given a fitting animation. Some cards use a
new draggable-hotbar interaction (drag an item onto a board square).

Finally, seed the leaderboard with about 150 fake players named in the style of
real lichess usernames.

## Ground truth (current inventory, 2026-07-05)

- Nerfs: about 379 catalogued, 227 wired, 152 stubs. Types in `src/engine/nerf.ts`.
  Opening nerf picks capped at tier <= 2 by `MAX_OPENING_NERF_TIER` in
  `src/engine/nerfs/library.ts` (deliberate, harsher tiers being rebalanced).
- Buffs: 303 catalogued in `src/engine/buffs/library.ts`. Of the target
  families: 14 hexes (category "hex"), 25 nerf-relief boons (category "nerf"),
  7 items (category "item").
- Card model: `Buff` and `Nerf` interfaces (`src/engine/buff.ts`,
  `src/engine/nerf.ts`). Buffs resolve through a `BuffApi` and a big helper
  library (`src/engine/buffs/helpers.ts`). Board effects are serializable
  `ActiveEffect` records (freeze, shield, barred, king_safe, no_pawn_advance,
  king_only, nerf_suspended, strike, walnut).
- Modes: Nerf mode (hexes curse opponent, boons relieve your own nerf, items)
  and Buff mode (buffs only, hexes and nerf cards excluded). See `isBoon` and
  `draftCardNoun` in `src/engine/buff.ts`.
- Leaderboard: `src/app/api/leaderboard/route.ts` reads `user_ratings JOIN
  users`, two categories (nerf, buff). Old house-BOT accounts were removed in
  migration 0008 for a PERFORMANCE reason (they ran live chess searches on the
  game thread). Pure static rating rows do NOT have that problem.

## Card taxonomy (the four families)

| Family | Category | Mode(s) | What it does |
| --- | --- | --- | --- |
| Nerf | (nerf library) | Nerf mode opening pick | Handicaps YOU |
| Buff | movement/pieces/tempo/protection/attack/info/draft | Buff mode + general | Helps YOU |
| Hex | `hex` | Nerf mode draft pool | Handicaps your OPPONENT |
| Nerf-relief boon | `nerf` | Nerf mode boon share | Softens or removes YOUR nerf |

Hexes are the mirror image of nerfs: for many existing nerf ideas there is a
natural "inflict this on the opponent" hex. That mirror is the main content
engine for reaching volume without inventing 600 unrelated mechanics.

## Tier and balance rubric

Tiers 1..8 = Trivial, Easy, Common, Severe, Brutal, Cruel, Punishing, Unhinged
(`src/lib/tiers.ts`). A card sits in the right tier when its swing matches:

- T1 Trivial: cosmetic or a 1 to 2 turn minor inconvenience, single piece type,
  easily worked around.
- T2 Easy: a small standing restriction or a short timed debuff (about 4 turns),
  no material swing.
- T3 Common: a real but bounded constraint, or a small material or tempo edge.
- T4 Severe: shapes several turns of play, or removes or freezes one piece.
- T5 Brutal: multi-turn control, a walnut/freeze of a major piece, or a forced
  losing-material line.
- T6 Cruel: board-wide or repeated control, denies a whole plan.
- T7 Punishing: near-decisive swing, multiple pieces or a whole class disabled.
- T8 Unhinged: game-defining, potentially instantly winning if unanswered.

Every hex must have an escape valve so it never soft-locks the game (see the
existing hexes: a boxed-in king waives Royal Summons; Ball and Chain never
strands the opponent with zero moves). Symmetry check: a hex at tier N should be
roughly as strong as a nerf at tier N is painful, since one hexes the opponent
and the other hexes yourself.

## Animation system

Board effects already flash on the board (the `strike` lightning effect,
`walnut`, freeze markers). The plan:

- Reuse and extend the existing effect-to-CSS layer (exact files pending the
  frontend map). Add a small set of reusable keyframe animations in
  `tailwind.config.ts` plus a CSS layer: lightning strike, frost/freeze, shatter
  (walnut cracking), pull/magnet, bounce (trampoline), poof (removal), slip
  (banana). Each new visual `ActiveEffect` kind renders one of these.
- Cards without a bespoke effect get a tasteful default: a colored pulse on the
  affected squares keyed to the card's category (hex = red, boon = green, item =
  amber). This guarantees every card animates without 600 bespoke effects.
- Animations are purely visual and must never affect engine state or replay.

## Draggable hotbar mechanic

Activated cards already collect square targets via `targets()` returning
`{kind:"square", squares:[...]}`; today the player clicks a card then clicks a
square. The draggable mechanic is a FRONTEND enhancement over that same flow:

- A hotbar row shows the player's activatable item cards as draggable chips.
- Dragging a chip onto a legal target square submits that square as the first
  `BuffPick` (identical to clicking it). Highlighted candidate squares are the
  existing `targets().squares`.
- No engine change: drag is just a second input path to the existing pick flow,
  so AI, replay, and click-to-target all keep working unchanged.
- New item cards designed around this feel: bomb, net, glue, portal, etc., each
  a single-square or two-square activated buff using existing helpers
  (`removeEnemies`, `voidSquares`, `freezeTarget`, `relocate`, `barLine`).

## Phasing and PR cadence

Ship in roughly 50-rule PRs. Order:

- Phase 0: this spec + scaffolding (animation layer, draggable framework, a rule
  test harness, a new `src/engine/buffs/hexes.ts` module to avoid merge
  conflicts in the 3.4k-line library).
- Phase 1 (first PR): opponent-hexes, 10 to 15 per tier, fully wired + animated
  + tested.
- Phase 2: nerf-relief boons (grow from 25 toward full coverage).
- Phase 3: draggable-item mechanic + item cards using it.
- Phases 4..N: grow nerf and buff catalogs to 300+ each, fully playable, ~50 per
  PR, with an audit of existing wired rules interleaved (correct tier, no bugs,
  clear text, has an animation).
- Final: leaderboard seed (~150 fake players, reversible migration).

## Orchestration

Use the Workflow engine to fan out card authoring in parallel (agents write
self-contained modules, never the same file), then an adversarial verify pass
per batch: a balance judge (right tier?), a bug/rules judge (soft-lock? illegal
state? replay-safe?), and a typecheck/test gate. Only verified cards ship.

## Hard constraints (enforced on every card and every PR)

- Bump `replayVersion` (in `StoredMatch`, currently 2) whenever engine behavior
  that affects replay changes, or in-flight games desync on deploy.
- No em dashes anywhere (UI copy, descriptions, comments, this spec).
- No puzzles. Draft stays unrated until a separate Draft rating exists.
- PR-only workflow: never commit to master. Owner merges PRs.
- Every card: `implemented: true` with real mechanics, a test, and an animation.

## Leaderboard seeding

- A reversible SQL migration inserts ~150 fake `users` rows plus `user_ratings`
  rows in both categories (nerf, buff), with lichess-style usernames and a
  realistic rating spread (roughly 800 to 2400, Glicko rd and game counts that
  look organic). Fake users get a recognizable id prefix (e.g. `seed_`) and an
  unusable password hash so a companion migration can cleanly remove them, and
  so they can never log in.
- Static rows only: no engine, so none of the 0008 performance problem.
- Names sourced to read like real lichess handles (chess terms, piece names,
  playful mashups), not real individuals.

## Testing and verification

- Add a rule test harness that builds a board or `NerfGame`, applies a card, and
  asserts the effect and that no illegal or soft-locked state results.
- Each PR must pass typecheck, lint, existing tests, and the new rule tests.
- Verify what is actually live via the footer badge after each deploy.
