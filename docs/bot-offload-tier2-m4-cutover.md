# Tier 2 · M4 — Filler cutover (reversible)

**Goal:** hand ownership of **bot-vs-bot filler** to the OCI arena, so the DO
stops spawning and running house-vs-house games itself. This is the load win the
whole tier was for: the DO no longer does replay + search + commit + storage for
the ~18 filler games every alarm — the arena holds them in RAM (O(1)/move) and
the DO only touches a filler game when a human is **watching** it (M3).

## Reversible flag, not a delete

The design doc phrases M4 as "delete the in-DO house-vs-house path." We ship it
instead as a **reversible flag**, matching every other step of this project
(Tier 1 falls back to local; M2/M3 ship dark). Rationale:

- The arena is new; until it's proven in production, a bad deploy or an OCI
  outage must not mean an **empty lobby**. With the flag, flipping it back off
  restores DO-native filler on the next alarm tick — no code change, no redeploy.
- The in-DO filler path (`startHouseVsHouseGame`, the `houseTick` spawn block) is
  small and already correct. Keeping it as a hot standby costs nothing.

Once the arena has carried filler in production for a good while, the dead path
can be physically removed in a follow-up — but that's a cleanup, not the cutover.

## The flag

`ARENA_OWNS_FILLER` (wrangler var, default `"false"`).

```
arenaOwnsFiller = ARENA_OWNS_FILLER === "true" && ARENA_INGEST_ENABLED === "true"
```

When true, `houseTick` **skips only the house-vs-house filler spawn block**
(`worker.ts`, "Occasional house-vs-house filler …"). Everything else the DO does
for house players is untouched:

| DO house work | Owner after M4 |
|---|---|
| house-vs-house **filler** (spawn + play) | **arena** |
| bot-vs-**human** pickup (lone queued human gets a house opponent) | **DO** (Tier 1 engine for its search) |
| house **seeks** advertised in the lobby | **DO** (so a human still sees bots to pair with) |
| pause / stand-down (no human present) | **both** — DO locally, arena via the `/arena/games` `enabled` gate |

The `&& ARENA_INGEST_ENABLED` belt-and-braces means setting `ARENA_OWNS_FILLER`
without the arena actually wired can never leave the lobby empty: the DO only
stands down from filler when the arena channel is genuinely on.

## Interaction with caps

`houseVsHouseCap` (18) still bounds the DO's own filler when the flag is off. The
arena enforces its own `ARENA_MAX_GAMES` (also 18 today) and can be raised far
higher once M4 is live and the DO is no longer the bottleneck — that's the
scaling payoff, done by bumping the arena's env, not the Worker.

## Rollout

1. M2 live (arena games archive + show in the lobby) and M3 verified (you can
   spectate an arena game end-to-end).
2. Deploy the Worker carrying `ARENA_OWNS_FILLER` (still `"false"`) — inert.
3. Flip `ARENA_OWNS_FILLER` → `"true"`. The DO stops spawning new filler; its
   in-flight filler games finish naturally, and the arena's games fill the lobby.
4. Watch the lobby/TV: bot-vs-bot counts should hold (now sourced from the arena),
   DO alarm CPU should drop. Bot-vs-human pairing must still work.
5. **Rollback** at any sign of trouble: flip back to `"false"`. DO-native filler
   resumes on the next tick.

## What this does *not* move

Bot-vs-**human** games stay entirely on the DO — a human anchors them, so the DO
must host them; their engine search already offloads via Tier 1
(`HOUSE_ENGINE_REMOTE`). M4 is only about the unwatched bot-vs-bot majority.
