# Cards in the move timeline + card notation (game-review prerequisite #3)

> **Implementation status (2026-07-17): Phase 1 (engine collector) LANDED.**
> Implemented and unit-tested off-server: the `PublicMutation` type +
> `by` attribution (src/engine/buff.ts), the mutation collector and new
> `api.swap` primitive in `makeBuffApi`, per-event reset + `mutationBy`
> scope wired into the three apply paths (onMovePlayed loop, activateBuff,
> acquireBuff), and migration of all 6 direct-write swap sites to
> `api.swap`. Transients dropped by `serializeGame`. Verified: `test:desync`
> (fingerprints unchanged → behavior-preserving), `test:snapshot`,
> `test:replay-spectate`, and a new `scripts/sim-mutation-notation.ts`
> (swap records ONE swap op, Genesis records attributed remove/summon,
> no-op swaps record nothing). Zero new typecheck errors.
> **Not yet built (phase 2+, needs deploy verification):** `fx` on the
> wire/archive, castling-diff + `#reset` event-typing + `timed_loss`
> routing at the capture layer, the history API `cardHistory`, the
> `src/lib/timeline.ts` adapter, and all MoveList UI. See the table below.

## Goal

The move timeline (`src/components/MoveList.tsx` and everywhere it renders:
game pages, spectate, history review, GameOver, mobile drawer, clips) shows
only vanilla SAN today. Card play is invisible: you cannot see *when* a card
was drafted or used, and board mutations that never were moves (summons,
removals, teleports, transforms) appear as silent board jumps between plies.

This milestone:

1. Shows each player's **draft choices beside the vanilla move** they were
   made at (what was picked, banked, rerolled).
2. Gives **card-driven board changes a written notation** — both card
   activations as their own timeline entries and riders on vanilla moves —
   so a game reads as a complete score, and timeline steps map 1:1 onto the
   state-record steps from
   docs/2026-07-17-archived-state-record-spec.md (prerequisite #2).

## Dependencies and constraints (verified 2026-07-17)

- `MoveList` builds rows by ACTUAL move color (extra-move buffs break i%2
  pairing) — the new row model must preserve that invariant.
- Draft actions already reach every surface, masked by `publicDraftActions`
  (worker.ts): players get `dtActions`, spectators `publicCardHistory`.
  Matches play open-handed now (`picksVisible: true`, worker.ts ~2091), so
  pick identities are public in live games. `grant` identities are NOT —
  the notation must respect that mask.
- Draft actions carry `ply` = accepted-move count when they fired, so the
  interleaving is already well-defined: actions at ply N sit between move N
  and move N+1 (multiple same-ply actions ordered by their stream order —
  the `cursor`).
- Board mutations are funneled through the BuffApi primitives (`place`,
  `removePiece`, `teleport`, `setPieceType`, `setPieceColor` in
  src/engine/game.ts ~886), plus `timed_loss` expiry and Chess Diff enter /
  exit. These are the exact events the notation must name.
- The archive review page needs draft actions server-side: `draft_record` is
  archived but deliberately unexposed. This spec adds the masked projection
  of it to the history API (grant filter applied — the standing rule from
  docs/archive-draft-record.md).

## Notation ("card notation", CN)

ASCII, line-per-event, composable with SAN. Grammar:

```
summon        N@e4          piece type @ square (crazyhouse-style; matches
                            the existing UCI drop encoding "n@e4")
removal       xe5           the piece on e5 was destroyed by the card
teleport      b1>e4         the piece on b1 was moved to e4 outside a move
transform     e5=Q          the piece on e5 became a queen
conversion    e5~           the piece on e5 changed color
swap          b1<>e4        the two pieces exchanged squares (NOT two
                            teleports: "b1>e4, e4>b1" would read as
                            sequential overwrites)
castling      -O-O / +O-O   castling rights revoked / restored (side-
                            qualified: "w-O-O-O", "b+O-O")
board reset   #reset        whole-board rewrite (Genesis, Chess Diff
                            enter/exit)
```

Timeline entry forms:

- **Card activation** (a `use` action): `CardName! <effects>` — e.g.
  `Fireball! xe5`, `Rift Storm! b1>e4, g8>c3`, `Genesis! #reset`. A card
  with no immediate board effect (a lingering effect, a reveal, a draft
  manipulation) renders just `CardName!` — the tooltip carries the card
  text. Instants that fired on a pick render the same way, attached to the
  pick chip (see UI).
- **Masked events**: a `grant`'s consequences render with the card hidden:
  `?! N@e4` (the generic "god panel used" identity rule). Never the id.
- **Rider on a vanilla move** (an `onMovePlayed` hook or expiry mutated the
  board during/after a move): the SAN cell gets a dagger — `Nxe4†` — and
  the tooltip lists the rider effects in CN (`xd4 (Mine)`, `xe7 (despawn)`).
- **Force-pass** (resolveNoMoves flipped the turn with no move): its own
  entry `(pass)` in the mover's column, selectable like a move.
- **Chess Diff**: entry rows `Chess Diff! #reset` and `Diff over: <result>
  #reset` bracket the sub-game's ordinary SAN moves.
- **Draft choices** are chips, not notation: picking is not a board event.
  Chip = card name (+ tier pip), one per pick; `bank` renders a bank chip;
  `reroll` a ↻ chip. Ordered by cursor.

Rendering names: card ids resolve via `BUFF_BY_ID` client-side; unknown ids
(older/newer library) render the raw id — never throw. Everything after the
`!` is derived data, so old games stay readable when cards change (same
argument as the state record).

## Data model

### Engine: per-event public mutation summary

The notation must be authoritative, not inferred by diffing boards. The
BuffApi already counts mutations (`mutated()`); extend it to RECORD them:

```ts
/** Transient, per-event. Cleared when the api is created, read after the
 *  event settles. Mirrors the primitive calls mechanically — no
 *  classification, so a new card is covered by construction. */
export type PublicMutation =
  | { op: "summon"; sq: number; type: PieceType; color: Color }
  | { op: "remove"; sq: number }
  | { op: "teleport"; from: number; to: number }
  | { op: "transform"; sq: number; into: PieceType }
  | { op: "convert"; sq: number }
  | { op: "swap"; a: number; b: number }
  | { op: "castling"; side: Color; k?: boolean; q?: boolean } // new rights
  | { op: "reset" };            // Genesis / Chess Diff scale

/** Every variant also carries `by?: string` — the card id whose hook or
 *  effect scope performed the mutation. For `use` events it is redundant
 *  (the event IS one card) and omitted; it exists for MOVE events, where
 *  many held cards' onMovePlayed hooks plus timer expiries share one
 *  collector scope and the rider tooltip must attribute each mutation
 *  ("xd4 (Minefield)", "xe7 (despawn)" when by is absent). The collector
 *  stamps it from the currently-running hook — no card code changes.
 *  MASKING: `by` is included only when that card instance is publicly
 *  revealed (same rule as publicDraftActions); a masked card's mutations
 *  render bare, matching the `?!` convention. */
```

Collected on `BuffMatchState.lastEventMutations` (transient like
`lastHookMutations` — dropped by `serializeGame`). A whole-board rewrite is
collapsed to `reset` past a threshold (>8 primitive ops) so Genesis is one
token, not 64.

**Audit findings (2026-07-17) — mutation channels that bypass the five
primitives and MUST be routed before the collector is trustworthy.**
*(Counts corrected during implementation — see IMPLEMENTED note below.)*

1. **Swaps write `api.board.pieces[..]` directly** at **6** sites (the
   original "12" over-counted — see corrections): `swapOwnPieces`
   (piece_swap, warp_sovereign), escape_hatch, guard_rotation, warp_reign,
   rift_storm phase 2 (all in library.ts), and the arcane swap
   (wild/arcane.ts). Each set `historyDiverged` by hand — proof they knew
   they mutate. Fixed with an `api.swap(a, b)` primitive (records one
   `swap`, sets historyDiverged, bumps the counter) and all 6 migrated. A
   swap is inexpressible in the old grammar — hence the `<>` token.
   - **NOT swap-of-board:** Swap Meet (pt/timefaustian.ts) swaps *cards
     between hands*, never touches `board.pieces`, and is not a board
     mutation at all — correctly excluded.
   - **Already safe:** Musical Chairs (wild/chaos.ts) already builds its
     exchange from `api.removePiece` + `api.place`, so it flows through the
     collector today (recorded as remove/remove/summon/summon — verbose but
     correct; left as-is to avoid behavior risk).
2. **Castling-rights writes are direct field writes** (library.ts ~2907,
   ~4033; pt/timefaustian.ts ~178). No primitive can intercept a plain
   property assignment, so the collector synthesizes `castling` entries at
   capture time by diffing the 4 rights bits against the pre-event value —
   a bounded, exact diff, not a heuristic.
3. **`game.board = ...` replacement** (Chess Diff enter/exit, game.ts
   ~1307) performs ZERO primitive calls, so the >8-ops reset collapse never
   fires for it. `reset` is therefore synthesized from the event type
   (diff enter, diff end, and any future whole-board assignment), never
   from op count alone.
4. **`timed_loss` expiry writes directly in game.ts** (~792: demote
   assignment, removal path beside it) — must be rewritten through the
   collector (or push entries explicitly) or expiry riders go unnotated.
5. `perfect_rewind` exists in docs/turn-cost-table.json and test scripts
   but has NO definition in the live library — stale references, not a
   notation concern; noted so nobody designs for it.

**Safety net**: in dev and in the desync scripts, after every event,
assert that replaying `lastEventMutations` over the pre-event piece array
reproduces the post-event array (castling included). A mismatch means a
new direct-write channel appeared; the assertion names the event so the
site can be routed. In production the same mismatch downgrades the entry
to a generic `CardName! Δ` (changed-squares list) rather than showing
wrong notation.

### Wire + archive: notation attached to events

- `StoredDraftAction` `use`/`grant` entries gain `fx?: PublicMutation[]`
  (captured at commit; grants keep card id private but their `fx` is public
  by the existing rule — board consequences were always visible).
- Move commits gain rider info: the move frame (and archived record) carries
  `fx?: PublicMutation[]` when hooks/expiry mutated beyond the move itself.
  Stored per-move in a sparse sidecar on StoredMatch (`moveFx: Record<ply,
  PublicMutation[]>`) — moves themselves stay bare UCI strings everywhere
  (no format migration).
- **PlyState** (state-record spec) gains `fx?: PublicMutation[]` — the
  mutations the captured event performed. The review timeline then needs no
  second data source: `StateRecord.states` is already the exact
  (ply, cursor)-ordered event list; each entry now knows its notation.
- `publicDraftActions` passes `fx` through unmasked for `use`, and for
  `grant` passes `fx` while continuing to strip `id`/`tier`.

### History API (archived games)

`/api/history/[id]` (or its existing handler) gains `cardHistory`: the
masked projection of `draft_record.draftActions` — same filter as
`publicDraftActions` (rerolls kept, grant ids stripped, `fx` kept) — plus
`stateRecord` once prerequisite #2 ships. Explicit column lists stay the
guardrail: `draft_record` itself is never returned raw.

## UI (MoveList)

Row model change: `MoveList` accepts an optional `events` prop —
`TimelineEvent[]` = moves ∪ card entries ∪ passes, each carrying
`{ ply, cursor, kind, label, tooltip?, color }` — built by a shared adapter
(`src/lib/timeline.ts`) from whichever source the page has (live
`dtActions`+local game, spectator `publicCardHistory`, archived
`cardHistory`/`StateRecord`). Without the prop, MoveList behaves exactly as
today (classic games, old callers).

- **Draft chips** render in a thin full-width strip between move rows, at
  their ply position, colored per player (left/right aligned to the w/b
  columns). Chips are informational; clicking one selects the adjacent step.
- **Card activations / passes / diff brackets** render as full-width mono
  rows in CN, selectable. Selection space becomes **steps** (ply, cursor)
  instead of bare plies: `onPlyChange` gains a step-aware sibling
  `onStepChange`; pages using the state record map a step directly to
  `boardAtStep`, pages without it (live games) fall back to the nearest ply
  (cards between moves select the post-action board they already show).
- **Rider daggers** render inside the existing SAN cell (suffix, no layout
  change); tooltip lists rider CN.
- Keyboard navigation walks steps, not plies. `minPly` semantics unchanged
  (the floor now names the first reachable step).
- Compact mode (mobile drawer, GameOver, clips): chips collapse to a count
  pip on the strip; card rows stay (they're the story of the game).
- **Think times** (needs the `clock_record` from prerequisite #2): each SAN
  cell shows the move's think time in small muted text (lichess-style),
  derived as the wall-clock `ms` delta from the previous event; a draft
  chip's tooltip shows its decision time the same way. Hidden when no clock
  record exists (old rows, live games before the frame carries it) — the
  adapter marks times as absent, never zero.

## What each surface shows

| Surface | Draft chips | Card rows / riders | Step navigation |
| --- | --- | --- | --- |
| Live player | own + opponent (open-handed) via dtActions | yes (fx on frames) | nearest-ply fallback |
| Spectator | publicCardHistory (grant ids masked) | yes | nearest-ply fallback |
| Archived review | cardHistory (masked) | yes | exact via StateRecord |
| Classic games | none (no draft) | none | unchanged |

## Privacy

- Grant ids stay masked end-to-end (`?!` notation); only their board
  consequences appear — identical information to what live spectators
  already receive.
- Pick chips are public because matches are open-handed; if hidden-hand
  modes ever return, the chip source is already the masked per-seat
  projection, so the UI inherits the mask for free.
- No new column or endpoint exposes `draft_record` raw, `draftSeed`, or
  RNG state.

## Rollout

1. Engine: mutation collector + `fx` capture (transient; no REPLAY_VERSION
   bump — recording observations, not changing semantics; verify with the
   desync scripts).
2. Worker + arena: attach `fx` to committed events; extend
   `publicDraftActions`; bump the state-record payload (`STATE_RECORD_VERSION`
   stays 1 if it ships together, else 2 — `fx` is optional either way).
3. History API `cardHistory`.
4. Shared timeline adapter + MoveList changes; adopt per surface (game page,
   OnlineMatch/spectate, history page, mobile drawer, GameOver, clips last).

Old archived rows have no `fx`: their timelines show chips + bare
`CardName!` rows (from `draft_record` actions) with no effect suffixes —
graceful, honest degradation.

## Acceptance criteria

1. In a live draft game, picking a card shows a chip at the current ply on
   both clients and the spectator view; an instant pick additionally shows
   its CN entry (e.g. a freeze instant's effect row) at the same step.
2. Summoning via an activated card renders `CardName! N@e4`-style rows;
   the summon square matches the board. A grant-driven summon renders
   `?! N@e4` with no card name anywhere in the DOM or wire payload.
3. A trap/rider game shows `†` on the triggering SAN cell and the rider CN
   in its tooltip; a force-pass shows a selectable `(pass)` row.
4. Genesis/Chess Diff render `#reset` entries; diff sub-game moves list as
   normal SAN between the brackets.
5. Archived draft-game review shows the same timeline as live spectators
   saw (chips + rows), and stepping through intra-ply entries changes the
   board via the state record.
6. Classic games and existing callers render pixel-identical to today
   without the `events` prop.
6b. On a row with a clock record, every move shows a think time, draft chips
   show decision time in their tooltip, and the times sum (± increments and
   pauses) to the game's wall duration; rows without a clock record show no
   times anywhere.
7. Desync scripts still pass (fx capture changed no replayed state).

## Touched files

| File | Change |
| --- | --- |
| `src/engine/game.ts` | BuffApi mutation collector + `api.swap` primitive; `lastEventMutations`; event-typed reset; route timed_loss writes; castling diff |
| `src/engine/buffs/library.ts`, `wild/arcane.ts`, `wild/chaos.ts`, `pt/timefaustian.ts` | migrate the 12 direct `board.pieces` swap writes to `api.swap` |
| `scripts/test-desync.cjs` | collector-vs-board-diff assertion per event |
| `src/engine/buff.ts` | `PublicMutation` type; transient field on BuffMatchState |
| `worker.ts` | `fx` on StoredDraftAction use/grant + `moveFx` sidecar; `publicDraftActions` passes fx (grant id still stripped); frames carry fx |
| `arena-service/game.ts` | same capture for arena games |
| `src/lib/server/games.ts` / state-record module | `fx` in archived actions + `PlyState.fx` |
| `src/app/api/**` history handler | `cardHistory` masked projection |
| `src/lib/timeline.ts` | new: TimelineEvent adapter (live/spectate/archive sources) |
| `src/components/MoveList.tsx` | events prop, chips strip, CN rows, step navigation, dagger cells |
| `src/app/game/page.tsx`, `src/components/OnlineMatch.tsx`, `src/app/history/[id]/page.tsx`, `MobileMoveDrawer`, `GameOver`, clip components | pass events + step handlers |
