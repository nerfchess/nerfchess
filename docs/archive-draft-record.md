# Archive the full draft record (game-review prerequisite #1)

## Goal

Make every archived draft-ruleset game **fully replayable from the `games` archive
alone**. Today the archive row stores `moves`, `seed`, and the nerf ids — but a
draft game's board state also depends on the draft-action stream (picks, banks,
uses), the draft RNG seed, the cadence, and any moderator card overrides frozen
at match creation. None of those are persisted, so no buff/draft game archived
to date can be reconstructed. This blocks game review (replay-to-ply → search →
grade), and also blocks any future re-analysis, dispute audit, or card-value
analytics that needs positions rather than results.

**Non-goals for this milestone:** the analysis service itself, extending
`replayToPosition` with `reroll`/`grant` opcodes, any API/UI exposure of the new
data, and backfilling old rows (impossible — the data was never persisted).

## What exists today (verified 2026-07-09)

- `recordFinishedGame` (`src/lib/server/games.ts`) writes the archive row to the
  OCI Postgres (`INSERT INTO games ${sql({...})}` around line 263) with a D1
  fallback insert (~line 173) when no Hyperdrive connection string is supplied.
  Neither insert carries any draft field.
- The live `games` table on the Chicago box (checked via
  `information_schema.columns`) matches `migrations-pg/0001_games.sql`: no draft
  columns.
- Both producers already hold the data at the call site:
  - **Human/DO games** — `endMatch` (worker.ts ~2013) has the full `StoredMatch`:
    `mode`, `draftSeed`, `cadence`, `stacked`, `picksVisible`, `cardOverrides`,
    `draftActions`, `replayVersion`.
  - **Arena games** — the `/arena/end` handler (worker.ts ~3754) receives
    `ArenaEndRecord`, which already carries optional `draftSeed`, `cadence`,
    `draftActions` (worker.ts ~612; the arena has sent them since M3 for the
    spectator end-frame). It currently discards them after the held-buff reveal.
    Arena games have no `cardOverrides` (the arena rolls its own pools —
    verified no overrides usage in `arena-service/`).
- All `games` reads in `src/app/api/**` use explicit column lists, so a new
  column leaks nowhere by default.

## Design

One nullable JSON column holding the complete draft record, plus the replay
version as its own queryable column.

### Payload: `DraftRecord`

Defined in `src/lib/server/games.ts` (it is a persistence shape, not an engine
shape):

```ts
/** Everything beyond setup+moves needed to deterministically replay a draft
 *  game. Field names/shapes are the StoredMatch originals so a replayer can
 *  feed them straight into the gameFromMatch/replayToPosition logic. */
export interface DraftRecord {
  /** "nerf" | "buff"; absent = legacy merged rules (matches StoredMatch.mode). */
  mode?: string;
  draftSeed: number;
  cadence?: number;
  stacked?: boolean;
  /** Wire-visibility only (no board effect); kept so a review UI can render
   *  the game as the players saw it. */
  picksVisible?: boolean;
  /** Moderator pool overrides frozen at match creation (StoredMatch.cardOverrides).
   *  Offers re-roll against these, so pick indexes are meaningless without them. */
  cardOverrides?: unknown;
  /** FULL stored stream, including `reroll` and `grant` — unlike
   *  serializeMatchForEngine, which drops them. A reroll changes which cards
   *  later pick indexes resolve against, and a grant seats a held card; a
   *  full-fidelity replay needs both. */
  draftActions: StoredDraftAction-shaped[];
}
```

Store the **unfiltered** action stream. `serializeMatchForEngine` filters
`reroll`/`grant` because the *engine service* only needs a
best-effort position and fails safe on drift; the archive is the system of
record and must not be lossy. (`replayToPosition` in `src/engine/replay.ts`
does not understand those two opcodes yet — that extension belongs to the
review milestone. Until then, a review replayer can use the same filter for
games that contain neither, and flag the rest.)

### Schema

**Postgres — `migrations-pg/0002_games_draft_record.sql`** (style of 0001: `SET
ROLE nerfchess_app`, idempotent):

```sql
SET ROLE nerfchess_app;
ALTER TABLE games ADD COLUMN IF NOT EXISTS draft_record JSONB;
-- Engine REPLAY_VERSION the record was written under (StoredMatch.replayVersion;
-- absent pre-dates stamping = version 1). Own column so "which rows can the
-- current engine replay" is an index-friendly predicate, not a JSON probe.
ALTER TABLE games ADD COLUMN IF NOT EXISTS replay_version INTEGER;
```

`JSONB` (not `TEXT`) so the card-value analytics this feeds can query into the
action stream (`draft_record->'draftActions'`) without a rewrite later.

**D1 — `migrations/0020_games_draft_record.sql`** plus matching entries in
`ADDITIVE_COLUMNS` (`src/lib/server/schema.ts`, keep the two in sync per the
existing pattern):

```sql
ALTER TABLE games ADD COLUMN draft_record TEXT;   -- JSON string
ALTER TABLE games ADD COLUMN replay_version INTEGER;
```

D1 is the dev/no-Hyperdrive fallback archive; it gets the same data as a JSON
string so dev behaves like prod.

### Code changes

**1. `src/lib/server/games.ts`**

- `FinishedGameRecord` gains `draftRecord?: DraftRecord` and
  `replayVersion?: number`.
- Postgres insert (~line 263): add to the `sql({...})` object:
  `draft_record: game.draftRecord ? JSON.stringify(game.draftRecord) : null`,
  `replay_version: game.replayVersion ?? null`.
  Passing the JSON as a string is deliberate: `pg.ts`/this module create clients
  with `fetch_types: false`, so rely on Postgres coercing the untyped parameter
  to `jsonb` rather than on postgres.js object serialization. **Verify this
  insert path once against the real Hyperdrive route in staging/dev before
  shipping** (acceptance item 3).
- D1 fallback insert (~line 173): same two columns, same
  `JSON.stringify`/null binds.

**2. `worker.ts` — `endMatch` (~2013)**

In the `recordFinishedGame` call, alongside the existing
`...(match.draft ? { ruleset: "draft" } : {})` spread:

```ts
...(match.draft ? { draftRecord: draftRecordFromMatch(match) } : {}),
replayVersion: match.replayVersion ?? 1,
```

where `draftRecordFromMatch` copies `mode`, `draftSeed`, `cadence`, `stacked`,
`picksVisible`, `cardOverrides`, and the full `match.draftActions ?? []`.
Omit undefined optionals (keep the row compact, match `StoredMatch` sparseness).
`replayVersion` is stamped for classic games too — it is engine-version
provenance, not draft-specific.

**3. `worker.ts` — `/arena/end` (~3754) and `ArenaEndRecord` (~600)**

- Add `replayVersion?: number` to `ArenaEndRecord` (the arena's own
  `ArenaFinishedRecord` already carries it; today the DO type just doesn't
  declare it).
- In the `recordFinishedGame` call add:

```ts
...(rec.draftSeed !== undefined && rec.draftActions
  ? { draftRecord: { mode: rec.mode, draftSeed: rec.draftSeed,
      cadence: rec.cadence, draftActions: rec.draftActions } }
  : {}),
replayVersion: rec.replayVersion,
```

Guarded so an older arena bundle (no draft fields) still archives exactly as
today — same reasoning as the existing "Optional so an older arena still
archives" comment. No arena-service code change is required.

**4. `scripts/backfill-games.mjs`**

Add `draft_record`, `replay_version` to `COLUMNS` so a future D1→PG backfill
carries them (D1 rows will have the columns after the migration; old rows carry
NULL).

## Privacy notes (enforced by review, not code, in this milestone)

- `draftSeed` is secret **during** a game (offer prediction); post-game it is
  inert. Storing it server-side is fine. It must still never be selected by any
  public API — the explicit column lists already guarantee that; keep it that
  way when the review API lands.
- `grant` actions (owner god-panel) are never surfaced publicly anywhere in the
  live protocol (`publicDraftActions` excludes them). Any future endpoint that
  exposes `draft_record` must apply the same filter. Add this as a comment on
  `DraftRecord.draftActions`.

## Rollout

Order matters only in that the columns must exist before the worker writes them:

1. **Postgres migration on Chicago** (column adds are instant, nullable, and
   invisible to the running worker):
   `ssh nerfchess-svc`, then
   `docker exec -i postgres16 psql -U postgres -d nerfchess < 0002_games_draft_record.sql`
   (mind the `SET ROLE`; strip CRLF if the file was written on Windows).
2. **Deploy the worker** (D1 additive columns self-apply via `ensureSchema`).
3. Per the standing runbook: after the worker deploy, ping
   `engine.nerfchess.com/update` / verify the Tokyo box's applied commit. No
   `REPLAY_VERSION` bump — replay semantics are untouched; this change is
   archival only.

No backfill: `draft_record IS NULL AND ruleset = 'draft'` cleanly identifies
pre-migration rows (unreplayable, permanently).

## Acceptance criteria

1. Within ~an hour of deploy (arena writes ~5/min), fresh arena rows satisfy
   `SELECT count(*) FROM games WHERE ruleset='draft' AND draft_record IS NOT NULL
   AND completed_at > <deploy-ms>` > 0, and a sampled row's `draft_record`
   contains `mode`, `draftSeed`, `cadence`, and a non-empty `draftActions` whose
   last `ply` ≤ the game's move count.
2. A human friend-game draft match (play one against a house bot or a second
   browser) archives with `stacked`/`picksVisible`/`cardOverrides` present when
   set.
3. Round-trip check (the real point): a script pulls one fresh row, builds an
   `EngineMatch` from `setup` + `moves` + the draft record (filtering
   `reroll`/`grant`, as `serializeMatchForEngine` does), and
   `replayToPosition()` returns non-null with `game.moves.length` equal to the
   row's move count. Run it for one arena row and one human row.
4. Classic games and rows written by an old arena bundle archive exactly as
   before (`draft_record` NULL), and D1 dev fallback writes the same JSON as
   TEXT.
5. No public API response contains `draft_record`, `replay_version`, or
   `draftSeed` (grep the explicit column lists).

## Touched files

| File | Change |
| --- | --- |
| `migrations-pg/0002_games_draft_record.sql` | new: `draft_record JSONB`, `replay_version INTEGER` |
| `migrations/0020_games_draft_record.sql` | new: same columns for D1 |
| `src/lib/server/schema.ts` | mirror the two `ALTER TABLE`s in `ADDITIVE_COLUMNS` |
| `src/lib/server/games.ts` | `DraftRecord` type; `FinishedGameRecord.draftRecord`/`.replayVersion`; both inserts |
| `worker.ts` | `endMatch` passes the match's draft record; `ArenaEndRecord.replayVersion`; `/arena/end` passes the arena's draft fields through |
| `scripts/backfill-games.mjs` | add the two columns to `COLUMNS` |
