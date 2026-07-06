# Tier 2 · M3 — Spectating arena games (live TV for bot-vs-bot)

**Goal:** let a human watch an OCI arena (bot-vs-bot) game on the normal
spectate/TV view, with live moves, clocks, draft effects, and a proper game-end
reveal — while keeping the DO's per-move cost **zero for the unwatched majority**.
The arena streams a game to the DO *only while a human is watching it*.

Builds on M2 (the arena registers its games with the DO and reports finished
games for archive + rating). M3 adds the third row of the doc's table: *relay
live moves to spectators, per-move only while watched*. All of it ships behind
the existing `ARENA_LOBBY_ENABLED` flag — dark until flipped.

---

## Why the DO can't just replay a repeat `wstart`

The spectate client (`src/app/game/[id]/page.tsx`) is **incremental**: it keeps
its own engine replica and advances it via discrete frames — `move`,
`dtResolved`, `dtUsed`, `dtState`, `end`. A repeated `wstart` does **not** re-sync
its board (it only clears the "reconnecting" flag). So the arena must produce the
same per-event frames the DO emits for its own games — it can't ship coarse
snapshots and hope the client catches up.

To avoid duplicating the DO's careful spectator masking (hidden nerfs, never-leak
offers, reveal-on-`via`) out on the OCI box — a real info-leak risk — the DO
keeps a **replica** and does the framing with its own tested helpers. This is the
one place M3 pays the replay cost the rest of Tier 2 avoids; per the plan, that
cost is bounded to **watched games only**.

## Shape

```
human clicks a bot game in the lobby
        │  watch{id}
        ▼
   DO: id ∈ externalGames → register the watch, add id to the watch set
        │  (next /arena/games response carries watch:[id])
        ▼
   arena: id newly watched & started → POST /arena/frame {snapshot}, then stream
        │
        ├─ /arena/frame {snapshot}  → DO builds an ephemeral StoredMatch replica,
        │                              flushes `wstart` to everyone waiting on id
        ├─ /arena/frame {move}      → DO advances the replica, relays `move` + dtState
        ├─ /arena/frame {draft}     → DO advances the replica, relays dtResolved/dtUsed/dtState
        └─ /arena/end               → DO relays `end` (nerfs + held buffs), drops the replica
```

## Transport (extends the M2 HTTP channel — no new socket)

**`POST /arena/games`** response gains `watch: string[]` — the ids a human is
currently spectating (empty unless ingest **and** lobby are on). The arena reads
it every sync.

**`POST /arena/frame`** (new) — one spectator event for a watched game:
- `{kind:"snapshot", …}` — full bootstrap state (setup, moves, draftActions,
  clocks, seats). Only sent for a **started** game.
- `{kind:"move", id, ply, u, clocks}`.
- `{kind:"draft", id, action, card?}` — `card` rides a `use` so the effect
  renders on spectator replicas (a fired buff is public).

**`POST /arena/end`** (M2) now also relays an `end` frame to any watchers and
drops the replica; the extra `draftSeed`/`cadence`/`draftActions` fields on the
record let the DO rebuild the game for the held-buff reveal.

## Ordering & robustness

- **Snapshot-first.** The arena opens a game's per-move stream *only after* it has
  posted that game's snapshot (`beginStreaming` gates the sink). A move can never
  reach the DO before the replica it needs — a pre-replica frame would just be
  dropped.
- **Pre-start games wait.** A game watched during its opening nerf draft has hidden
  nerfs the DO can't reconstruct, so the arena withholds the snapshot until the
  game starts. The spectator waits a beat rather than see an unbuildable board.
- **Idempotent moves.** The DO applies a move only when `ply === replica.moves + 1`
  (the same check the client makes), so a stale/duplicate frame that raced the
  bootstrap is dropped, never double-applied.
- **One snapshot per watch episode.** Re-sent if the game leaves and re-enters the
  watch set (a fresh spectator after a gap). Cleared when the game ends.
- **Self-healing lobby.** Replicas are dropped when the last spectator leaves or
  the game ends; external lobby entries already expire on their own TTL if the
  arena stops syncing.

## DO internals

- `externalMatches: Map<id, StoredMatch>` — the ephemeral replica, shaped exactly
  like a house-vs-house match so every existing spectator helper (`gameFromMatch`,
  `draftStateFor`, `publicDraftActions`, `playersPayload`, `currentClocks`) works
  on it unchanged. Never persisted.
- `sendWstart(ws, match)` — factored out of `watchMatch` so a snapshot can flush
  the same opening frame to sockets that were waiting for the arena to start
  streaming.
- `applyExternalMove` / `applyExternalDraft` — advance the replica and relay the
  spectator-filtered frame, reusing the native masking (`publicDraftActions` for a
  pick, the fired card for a use, `draftStateFor(_, _, "spectator")` for reveals).
- `endExternalForWatchers` — reveals nerfs + held buffs with the result, then
  drops the replica. Rebuilds from the authoritative end record so held buffs are
  exact even if a mid-game frame was lost.

## Arena internals

- `IngestClient` tracks `watched` (from each sync) and `streaming` (games whose
  snapshot has been posted); `beginStreaming(id)` opens the per-move stream.
- `Arena.reconcileWatch(watch)` posts a one-shot started-snapshot for each newly
  watched game, then opens its stream.
- `ArenaGame.spectatorSnapshot()` is the bootstrap cut; the `use` path captures the
  fired card **before** activation mutates it.
- Game ids are now uppercase hex (`newId`) to match the DO's `watchMatch`
  upper-casing — a spectator's id round-trips to the same key.

## Trust boundary (unchanged from M2)

`/arena/frame` is bearer-gated (`ARENA_INGEST_TOKEN`) and only relays display
frames for house-account games. It moves no ratings and touches no human game;
the worst a forged frame can do is show spectators a bogus bot move.

## Flags

- `ARENA_INGEST_ENABLED` — the arena channel at all (M2).
- `ARENA_LOBBY_ENABLED` — arena games in the lobby **and** spectating (M3). Watch
  ids and `/arena/frame` are inert unless this is on.

Both ship `"false"`. M3 needs no new Worker flag — spectating rides
`ARENA_LOBBY_ENABLED` (you can only watch what the lobby shows).

## Validation

`arena-service/test/m3-spectate.mjs` runs the real arena bundle against a mock DO
that watches one live game, and asserts: a snapshot bootstraps before any move,
frames stream for the watched id only (unwatched games stay silent), finished
records round-trip, and an end is reported. The DO-side frame handlers are covered
by typecheck + the client frame contract (`move`/`dtResolved`/`dtUsed`/`dtState`/
`end` in `src/lib/multiplayer.ts` + `page.tsx`).

> Not covered here: a full browser spectate against a live Worker+DO. The DO
> handlers are written against the exact frames the client already consumes for
> native games, so parity is by construction, but a staged prod check (below)
> should confirm a real spectate before wide rollout.

## Staged activation (after M2 is live)

1. Deploy the Worker with M3 code (flags still off) — inert.
2. Point the Tokyo arena at the DO with the shared token (M2 step).
3. Flip `ARENA_INGEST_ENABLED` → arena games archive + rate.
4. Flip `ARENA_LOBBY_ENABLED` → arena games appear in the lobby and become
   spectatable. Watch one; confirm live moves, clocks, and the end reveal.
5. M4 (`ARENA_OWNS_FILLER`) hands filler ownership to the arena once spectating is
   proven — see `bot-offload-tier2-m4-cutover.md`.
