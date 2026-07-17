# Archive per-ply state records (game-review prerequisite #2)

## Goal

Make every archived draft game's positions readable **without replaying it
through the engine**. Today the archive stores only events (`moves` +
`draft_record`), so reconstructing ply N means running `boardAtPlyFromRecord`
(src/engine/replay.ts) through the CURRENT engine — which is O(game length),
breaks silently on any engine-behavior change (only detected via
`replay_version`), and bifurcates every consumer on `historyDiverged`. This
milestone stores the observed board state per committed event alongside the
event log, so review, profiles, and analytics UIs read positions as plain data,
independent of engine version, forever.

**Direct answer to "store state instead":** state-only is rejected; see
"Why not state-only" below. State becomes the *read path*; the event log stays
the *system of record*.

## Why not state-only (keep the event log)

1. **Auditability / trust.** A state stream is display-grade data: it cannot be
   re-validated. The event log + deterministic engine is the only way to prove
   a game was legal (dispute audit, desync forensics via
   src/engine/desync.ts, the engine service's fail-safe replay).
2. **Rating idempotency** (`recorded_games` ledger, migration 0021) and the
   live DO/replica/spectator protocol are built on the shared event record;
   removing it is a rewrite of the whole sync layer for zero benefit.
3. **Card-value analytics** needs *actions* (what was offered, picked, banked),
   which no board state carries. That was the reason `draft_record` is JSONB.
4. **Cost is negligible.** The event log is a few KB per game; keeping both
   costs nothing next to the state stream itself.

So: `moves` + `draft_record` stay exactly as they are. This spec is additive.

## What exists today (verified 2026-07-17)

- **Secret full snapshot:** `serializeGame`/`deserializeGame` +
  `GAME_SNAPSHOT_VERSION` (src/engine/game.ts ~121) — plain-JSON freeze of a
  live game including slot RNG state and nerf ids. Secret; server-only.
- **Public projection:** `PublicSpectatorSnapshot` (src/engine/game.ts ~329,
  produced for spectate/TV): board dims, sideToMove, castling, enPassant,
  `PublicPiece[]`, `PublicSquareEffect[]`, walls, capture counts, revealed
  cards only. Explicitly designed to be shippable to anyone.
- **Producers hold live state at every event:** the game-server DO applies
  each move/draft action to a live `NerfGame` (`gameFromMatch` path), and the
  arena service runs its games in-process (arena-service/game.ts).
- **Review today:** `boardAtPly`/`replayBoardSpan` (src/lib/gameReview.ts) do
  tolerant plain-move replay and are wrong past any board-mutating card;
  `boardAtPlyFromRecord` is exact but engine-version-locked and O(n).

## Design

### Payload: `StateRecord`

New module `src/lib/server/stateRecord.ts` (persistence shape, not an engine
shape — same reasoning as `DraftRecord`):

```ts
export const STATE_RECORD_VERSION = 1;

/** Board state observed after one committed event. Everything here is PUBLIC
 *  by construction: it is derived from the same projection the spectator wire
 *  ships (PublicSpectatorSnapshot), so it carries no nerf id, RNG state,
 *  hidden card, or draft seed. */
export interface PlyState {
  /** Accepted-move count when this state was captured. */
  ply: number;
  /** draftActions cursor folded in (same meaning as capturedAtCursor). Lets
   *  the review slider show intra-ply board mutations (a `use` that summons
   *  or detonates between moves) as their own steps. */
  cursor: number;
  /** 64-char piece placement, a1..h8: "." empty, pnbrqk black, PNBRQK white.
   *  Compact and diffs beautifully under gzip. */
  board: string;
  sideToMove: "w" | "b";
  castling: string;          // e.g. "KQkq" / "-"
  enPassant: number | null;
  /** Public square effects at this state (kind/squares/owner/against/turns —
   *  the PublicSquareEffect shape). Omitted when empty. */
  effects?: PublicSquareEffectLike[];
  walls?: PublicWallLike[];
  /** frozen/shielded piece squares (render hints), omitted when empty. */
  frozen?: number[];
  shielded?: number[];
  captured?: { w: PublicCaptureCounts; b: PublicCaptureCounts };
}

export interface StateRecord {
  v: number;                  // STATE_RECORD_VERSION
  /** Engine REPLAY_VERSION that PRODUCED the states (provenance only —
   *  a reader never needs the engine to display them). */
  producedBy: number;
  /** True when capture stopped early (cap hit, see Limits). */
  truncated?: boolean;
  states: PlyState[];
}
```

The projection function `plyStateFromGame(game, ply, cursor): PlyState` lives
next to the existing public projector in src/engine/game.ts and MUST reuse its
piece/effect masking logic (single source of truth for what is public).

### Scope: draft games only

`ruleset = 'classic'` games are plain chess — `boardAtPly` over `moves` is
already exact, cheap, and version-independent. They get **no** state record.
Only `draft` games (the ones with `historyDiverged` risk) are captured. This
cuts volume to the arena stream + human draft games.

### Storage: one compressed TEXT column

```
state_record TEXT   -- base64(gzip(JSON.stringify(StateRecord)))
```

- Same encoding on Postgres and D1 (uniform, no JSONB/TEXT split to keep in
  sync). Nothing queries *into* states — analytics uses `draft_record`; this
  column is read-whole-or-not-at-all, so queryability buys nothing.
- Size: a PlyState is ~120–200 B raw; a 100-event game ≈ 20 KB JSON, and the
  board strings are near-identical between events so gzip lands at **~2–4 KB
  per game**. At the arena's ~5 games/min that is ≈ 15–30 MB/day — fine.
- Compression via `CompressionStream("gzip")` (available in Workers and Node
  ≥18, so the same helper serves worker.ts and arena-service).

**Postgres — `migrations-pg/0003_games_state_record.sql`** (style of 0002:
`SET ROLE nerfchess_app`, idempotent):

```sql
SET ROLE nerfchess_app;
ALTER TABLE games ADD COLUMN IF NOT EXISTS state_record TEXT;
```

**D1 — `migrations/0035_games_state_record.sql`** plus the matching entry in
`ADDITIVE_COLUMNS` (src/lib/server/schema.ts, keep in sync per the pattern):

```sql
ALTER TABLE games ADD COLUMN state_record TEXT;
```

No separate version column: `v` and `producedBy` live inside the payload, and
unlike `replay_version` there is no useful SQL predicate over them ("which
rows can the current engine replay" doesn't apply — states are engine-free).

### Capture — game-server DO (worker.ts)

Capture is **incremental at commit time**, not a replay at game end (end-of-
game replay would burn DO CPU and re-introduce the very engine-version
dependency this removes).

- After **every** committed event on a draft match — an accepted move and
  every applied draft action, `pick` included — append
  `plyStateFromGame(game, match.moves.length, cursor)` to the match's state
  buffer, capturing AFTER the event fully settles (post
  `settleAfterBuff`/`resolveNoMoves`). No opcode is classified as "safe to
  skip": instants fire at pick time (`acquireBuff` runs `def.effect`
  immediately for `kind === "instant"`, game.ts ~1678 — Mass Freeze, World
  End, Wheel of Fortune all mutate on a `pick`), and an instant that locks
  the mover triggers a force-pass (`resolveNoMoves` game.ts ~1626) that flips
  `sideToMove`, ticks timers, and fires expiry effects with no move in sight.
  Classifying opcodes is exactly the "detection logic to get wrong" this
  design rejects. Instead, suppress consecutive duplicates — same board
  string, sideToMove, castling/ep, and effect overlay — so genuinely inert
  events (`bank`, `reroll`, no-op picks) cost zero bytes.
- **DO storage:** StoredMatch values must stay well under the 128 KB per-key
  limit, so the buffer is NOT stored on the match record. Chunk it:
  `stateRec:<matchId>:<n>` keys of 200 entries each, flushed with the same
  transactional batch that commits the event. `endMatch` assembles chunks →
  gzip → hands `stateRecord` to `recordFinishedGame` → deletes the chunks
  (also delete on match abort/expiry, wherever match keys are GC'd today).
- **Limits:** hard cap 1200 entries (~2× the longest observed games). Past the
  cap, stop appending and set `truncated: true`; review falls back to the
  replay path past the truncation point.

### Capture — arena service

The arena runs its games in memory, so it just accumulates `PlyState[]` on its
game object (same hook points, same `plyStateFromGame` — the engine is shared
code) and sends the finished record on `/arena/end`:

- `ArenaEndRecord` (worker.ts ~600) gains `stateRecord?: string` (already
  gzip+base64, produced arena-side to keep the DO handler cheap).
- The `/arena/end` handler passes it through to `recordFinishedGame`,
  **guarded** exactly like the draft fields: an older arena bundle that
  doesn't send it archives exactly as today (same reasoning as the existing
  "Optional so an older arena still archives" comment).

### Persistence (src/lib/server/games.ts)

- `FinishedGameRecord` gains `stateRecord?: string` (the encoded blob).
- Both inserts (Postgres ~382, D1 fallback) bind
  `state_record: game.stateRecord ?? null`.
- `scripts/backfill-games.mjs`: add `state_record` to `COLUMNS`.

### Consumers (read path)

New helper `boardAtStep(record: StateRecord, step: number)` decodes lazily and
returns the PlyState — no engine import at all. Review resolution order:

1. `state_record` present → use it. Works for every engine version, every
   `historyDiverged` game, O(1) per step after one decode.
2. Else `draft_record` present and `replay_version` == current
   `REPLAY_VERSION` → `boardAtPlyFromRecord` (today's exact path).
3. Else classic game → `boardAtPly` over moves.
4. Else → review locked (unchanged degradation).

The live-game review path (per-ply snapshot map in src/app/game/page.tsx /
OnlineMatch.tsx) is untouched by this milestone; it can adopt PlyState later.

## Privacy

- Every PlyState is derived from the public projection: no nerf ids, no
  `draftSeed`, no RNG state, no unrevealed card identities. A `grant` shows
  its board *consequence* (a piece appears) but never the card — identical to
  what live spectators already see. Exposing `state_record` through a future
  review endpoint is therefore safe **by construction**, unlike
  `draft_record`, which must stay filtered (grant/draftSeed rules in
  docs/archive-draft-record.md still apply, unchanged).
- Until that endpoint exists, no public API selects the column (all reads use
  explicit column lists — grep them at acceptance).

## Clock record (per-event clocks + think time, ALL games)

Today the archive keeps no timing beyond `started_at`/`completed_at`: no
per-move clock, and draft think time is unknowable. Store it — for **every**
game, classic included (which is why it is its own column, not a `PlyState`
field: classic games get no state record).

```ts
export const CLOCK_RECORD_VERSION = 1;

export interface ClockEntry {
  ply: number;
  /** Draft-action cursor, present for action events (same key space as
   *  PlyState — entries join 1:1 with state-record steps on draft games). */
  cursor?: number;
  /** Wall-clock ms since startedAt when the event committed. This — not the
   *  game clocks — is what carries draft think time: clocks can be paused
   *  during a draft (SpectatorPhase "draftPaused") or swapped entirely
   *  (Chess Diff's 1+0 sprint), so remaining-time deltas alone cannot
   *  measure thinking. */
  ms: number;
  /** Both clocks, ms remaining, AFTER the event settled (post-increment,
   *  post clock-card adjustments — so Time Thief-style adjustClock effects
   *  are visible as anomalous deltas). */
  w: number;
  b: number;
}

export interface ClockRecord { v: number; entries: ClockEntry[]; }
```

- **Column**: `clock_record TEXT` (base64+gzip JSON, same encoder), all
  games. Postgres migration file and D1 + `ADDITIVE_COLUMNS` alongside
  `state_record`; add to backfill `COLUMNS`. Old rows stay NULL forever —
  clock data was never persisted, nothing to backfill.
- **Capture**: one entry per committed event, same trigger as state capture
  (every move; every draft action on draft games). The DO already holds
  `match.clocks`/`runningSince` at commit; the arena likewise. ~30 B raw per
  entry, ≈1 KB gzipped per game — small enough to keep the live buffer as a
  plain array on StoredMatch (no chunking needed, unlike `stateRec:*`).
- **Derived values** (computed by readers, never stored): move think time =
  `ms[i] − ms[i−1]`; draft think time = a pick/bank/reroll entry's `ms`
  minus the previous event's `ms` (the offer appears when the prior move
  commits, so the delta IS the decision time). Disconnect stalls and lag
  show up honestly as wall-clock gaps with unchanged remaining time.
- **Privacy**: clock values are already public on every live surface
  (spectator frames carry them); nothing here needs masking. Public
  exposure via the history API is safe.
- **Acceptance** (adds to the list below): a sampled draft row's clock
  entries join 1:1 with its state-record steps; a classic row has exactly
  one entry per move; a game with a known draft pause shows the pick's
  wall-clock delta without remaining-time loss.

## Alternative considered: checkpoint-only capture (rejected)

Store states only at "non-vanilla" events (draft actions) and bridge the
plies between checkpoints with plain move replay (`replayBoardSpan` already
does this bridging for live games). Rejected because the trigger cannot be
"draft actions": board mutations also happen at plain move plies —
move-triggered card hooks (landed-on traps, lingering riders; see
`lastHookMutations`), effect-expiry despawns at turn boundaries, and tempo
cards that break side-to-move alternation (archived UCI strings carry no
color, so a vanilla bridger cannot even pick the mover). Overlay data
(freeze/shield timers) also changes between draft actions, so bridged plies
would render stale effects unless the viewer re-implements timer semantics —
re-coupling it to the engine.

A correct version exists — checkpoint whenever the true state diverges from a
vanilla shadow board, or the public effect set changes — but it is a pure
size optimization (~1–2 KB/game vs ~2–4 KB: gzip already collapses the
near-identical vanilla plies) that adds a silent-corruption surface: one
mutation channel the divergence detector misses (including channels future
cards add) and review shows a wrong board with no error, the exact failure
mode this design exists to remove. Per-ply capture has no detection logic to
get wrong. If volume ever becomes a real cost, revisit as a compaction pass
over existing records, not as a producer change.

## Versioning

`STATE_RECORD_VERSION` is independent of `GAME_SNAPSHOT_VERSION`,
`PUBLIC_SNAPSHOT_VERSION`, and `REPLAY_VERSION`. Because states are plain
data, **card changes never break viewing**: a renamed, rebalanced, or deleted
card leaves old records fully renderable (only the event-log replay path is
REPLAY_VERSION-locked). Readers reject an unrecognized `v` and fall down the
resolution order. Unknown `effects[].kind`
values (cards added later) render as a generic marker — the reader must never
throw on an unknown kind. **No REPLAY_VERSION bump**: replay semantics are
untouched; this is archival only.

## Backfill (optional, best-effort)

A script (`scripts/backfill-state-records.mjs`) selects
`ruleset='draft' AND draft_record IS NOT NULL AND state_record IS NULL AND
replay_version = <current>` and synthesizes records via
`boardAtPlyFromRecord` + `plyStateFromGame`. Rows on older replay versions and
pre-0020 rows stay NULL (permanently unreconstructable, as documented). Run
once after deploy; new games never need it.

## Rollout

Columns must exist before the worker writes them (same shape as the
draft-record rollout):

1. Postgres migration on Chicago: `ssh nerfchess-svc`, then
   `docker exec -i postgres16 psql -U postgres -d nerfchess < 0003_games_state_record.sql`
   (mind `SET ROLE`; strip CRLF if written on Windows).
2. Deploy the worker (D1 column self-applies via `ensureSchema`; capture
   starts for DO games).
3. Deploy the arena service (capture starts for arena games; until then its
   games archive with NULL `state_record`, which is valid).
4. Standing runbook: no engine-service action needed (no REPLAY_VERSION
   change), but the usual post-deploy Tokyo check still applies.
5. Optionally run the backfill script.

## Acceptance criteria

1. Within ~an hour of the arena deploy, fresh rows satisfy
   `ruleset='draft' AND state_record IS NOT NULL`; a sampled row decodes to a
   `StateRecord` whose last state's `ply` equals the row's move count and
   whose `states.length` ≥ move count.
2. A human draft game featuring a board-mutating card (e.g. a summon) archives
   a record containing an intra-ply entry (two states with the same `ply`,
   different `cursor`), and its final `board` string matches the final
   position from `boardAtPlyFromRecord` on the same row (round-trip check —
   run for one arena row and one human row).
2b. A game where an INSTANT is picked (e.g. a freeze instant) archives a
   state entry at that `pick`'s cursor whose board/effects differ from the
   previous entry — proving pick-time capture works; and a pick that
   force-passes the mover records the `sideToMove` flip.
3. A game archived by an old arena bundle, and every classic game, archive
   with `state_record` NULL, byte-identical rows otherwise.
4. DO storage for a finished match leaves no `stateRec:*` chunks behind
   (checked for a completed and an aborted match).
5. No public API response contains `state_record` (grep the explicit column
   lists), and a decoded record contains no nerf id, seed, or unrevealed card
   id (assert in the round-trip script).
6. Gzip size sanity: sampled arena record ≤ 10 KB.

## Touched files

| File | Change |
| --- | --- |
| `migrations-pg/0003_games_state_record.sql` | new: `state_record TEXT`, `clock_record TEXT` |
| `migrations/0035_games_state_record.sql` | new: same columns for D1 |
| `src/lib/server/schema.ts` | mirror the `ALTER TABLE` in `ADDITIVE_COLUMNS` |
| `src/lib/server/stateRecord.ts` | new: `StateRecord`/`PlyState` types, gzip encode/decode, `boardAtStep` |
| `src/engine/game.ts` | `plyStateFromGame` next to the public projector (shares its masking) |
| `src/lib/server/games.ts` | `FinishedGameRecord.stateRecord`; both inserts |
| `worker.ts` | commit-time capture + chunked DO buffer; `endMatch` assembles/cleans; `ArenaEndRecord.stateRecord`; `/arena/end` pass-through |
| `arena-service/game.ts` (+ end-record sender) | in-memory capture, encode, send |
| `scripts/backfill-games.mjs` | add `state_record` to `COLUMNS` |
| `scripts/backfill-state-records.mjs` | new: optional best-effort backfill |
