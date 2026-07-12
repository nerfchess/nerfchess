# Tier 3 — Direct arena: filler leaves the DO entirely

> Builds on Tier 2 (`bot-offload-tier2-arena.md`). Tier 2 moved bot-vs-bot *simulation*
> to the OCI arena but kept the DO as the display/relay hub: the arena POSTs
> `/arena/games` every 4s, streams watched-game frames through `/arena/frame`, and
> reports ends to `/arena/end`. Tier 3 removes the hub. Spectators connect their
> WebSocket **directly to the arena**, the client fetches the arena's lobby
> **directly**, and finished games archive through a **plain Worker route** instead
> of the DO. After Tier 3 the DO handles filler in exactly zero requests.

**Goal:** DO request/alarm load becomes proportional to real human activity
(human games + bot-vs-human pickups). All 24/7 background traffic — the 4s arena
sync, the spectator relay, and every filler-driven alarm — disappears.

**Non-goal:** bot-vs-**human** games stay on the DO. The human seat needs the
authoritative host that owns matchmaking, session tokens, human ratings, and
reconnection; that is the DO, using Tier-1 remote search. Only the *filler*
share of alarm traffic leaves.

## Architecture

```
                 ┌───────────────────────────── Cloudflare ─────────────────────────────┐
  human player ──┼── wss nerfchess.com/socket/v1 ──► GameServer DO   (human + bot-vs-human)
  spectator ─────┼── wss arena.nerfchess.com/socket/v1 ─────────────────────┐
  lobby client ──┼── GET https://arena.nerfchess.com/lobby ──────────────┐  │  (Tunnel)
                 │                                                       ▼  ▼
  game end ──────┼── POST nerfchess.com/api/arena/end ──► Worker      OCI arena service
                 │        (recordFinishedGame: PG/D1)      route         (games in RAM,
                 └───────────────────────────────────────────────────────  local engine)
```

The DO and the arena no longer talk to each other at all.

## Components

### A. Arena spectator WebSocket (arena-service)

New WS endpoint on the arena process, `/socket/v1`, **spectator-only** (no seats,
no moves accepted). Served publicly as `arena.nerfchess.com` via the existing
Cloudflare Tunnel on the box (same pattern as `engine.nerfchess.com`; WS-over-
tunnel is already proven by `docs/oracle-game-server.md`).

- **Protocol:** the same client frames the DO speaks to watchers today, so
  `MPSession` works unchanged: inbound `watch {id}` / `p` / `sc` (spectator
  chat); outbound `wstart`, move/draft frames, clock frames (`n`), `watchers`,
  end frame. Reuse the framing already built for the Tier-2 relay
  (`game.ts#spectatorSnapshot` + the per-move frames the `IngestSink` emits) —
  the arena now fans them out to local sockets instead of POSTing them to the DO.
  `server/index.ts` is the reference implementation for the socket plumbing
  (upgrade handling, origin allowlist, ping/liveness, spectator sets).
- **Origin allowlist:** reuse the `GAME_SERVER_ORIGINS` env pattern from
  `server/index.ts` (`https://nerfchess.com,https://www.nerfchess.com`).
- **No auth for watching** — spectating is anonymous today too. Rate-limit
  upgrades per IP (simple token bucket) since this endpoint is public.
- **Spectator chat:** two options, pick at build time:
  1. *(ship first)* anonymous watcher counts only, chat disabled for arena games —
     zero trust surface;
  2. *(later, optional)* named chat via a short-lived HMAC ticket minted by a
     Worker route (`GET /api/arena/ticket`, signs `{username, exp}` with a shared
     secret) so the arena can trust display names without holding sessions.
     Profanity filtering reuses `src/lib/profanity` (already imported by
     `server/index.ts`).
- **Restart semantics:** on arena crash/redeploy, spectator sockets close; the
  client's existing reconnect + watch-reclaim (`multiplayer.ts` resends
  `watch {id}` on reconnect) either resumes the game or surfaces "game over".
  No DO replicas exist anymore, so there is nothing to abort remotely.

### B. Arena lobby endpoint (arena-service)

`GET /lobby` — public (same tunnel hostname), CORS `Access-Control-Allow-Origin`
limited to the site origins, in-process cache of ~2s so N clients cost one
serialization.

Returns:

```jsonc
{
  "games": [ /* ExternalGameMeta[] — id, seats {userId,name,rating}, mode, pool,
                timeSec, startedAt, moveCount, watchers */ ],
  "at": 1783870342183
}
```

- **Presence-driven spawning (replaces DO stand-down):** the arena spawns filler
  only if a `/lobby` request or a live spectator socket was seen in the last
  `ARENA_PRESENCE_TTL_MS` (default 60s). Humans on the site poll the lobby every
  5–10s, so this reproduces today's "stand down when nobody is online" rule with
  no DO involvement. Live games still play out after the last human leaves
  (mirrors current behavior).
- **Ratings shown** are the arena's roster seed ratings; live drift is cosmetic
  for filler. *(Optional polish: arena refreshes live house ratings from a
  Worker endpoint hourly.)*

### C. Worker ingest route — `POST /api/arena/end`

A Next API route (plain Worker request, **never touches the DO**):

- Auth: `Bearer ARENA_INGEST_TOKEN`, compared with `timingSafeEqual` (reuse the
  helper from `worker.ts`).
- Body: the existing `ArenaFinishedRecord`. Guard: both seats must satisfy
  `isHouseUserId` — same trust boundary as today's `/arena/end` (a hostile arena
  can move house ratings, never a human's).
- Action: the exact `recordFinishedGame` call currently in
  `worker.ts#handleArena` (`/arena/end` branch), including the `draftRecord`
  passthrough and `replayVersion` stamp. **Idempotency is already built in**:
  `recorded_games` INSERT-OR-IGNORE dedupes by game id
  (`src/lib/server/games.ts:245`), so retries and arena restarts are safe with
  no DO-side `arenaArchived` set.
- Aborted games: with no DO replicas to end, `reportAbort` becomes a no-op —
  delete it from `IngestClient` rather than porting it.

### D. Client changes

1. **Lobby merge.** `useLobbySnapshot` (`src/lib/lobbyClient.ts`) and the lobby
   page fetch `GET ${NEXT_PUBLIC_ARENA_URL}/lobby` in parallel with the DO
   snapshot and union the results, fail-soft (arena down ⇒ lobby just shows DO
   games). Arena entries are tagged `origin: "arena"`. The "seated personas count
   as online players" rule (today `worker.ts:6131`) moves into the same client
   merge: add each arena seat to the online list as `playing`, using
   `housePersona(userId)?.avatar` — all lookup data is in the shared client
   bundle already.
2. **Watch routing.** `MPSession` gains an optional server-URL override
   (constructor arg or `connect(url)`), defaulting to `gameServerUrl()`. The
   game page/watch flow routes ids tagged `origin: "arena"` (carried via the
   lobby entry / URL query, e.g. `/game/{id}?src=arena`) to
   `NEXT_PUBLIC_ARENA_URL`'s socket. Everything else is unchanged.
3. **CSP / env:** add `wss://arena.nerfchess.com https://arena.nerfchess.com` to
   `connect-src`; new build-time var `NEXT_PUBLIC_ARENA_URL`
   (empty ⇒ Tier-3 fully off, client behaves exactly as today).

### E. DO / Worker deletions (the payoff)

Once D is live and verified:

- Delete `handleArena` and the whole `/arena/*` route from the DO, plus
  `externalGames`, `externalMatches`, `externalFrameAt`,
  `ingestExternalSnapshot` / `applyExternalMove` / `applyExternalDraft` /
  `endExternalForWatchers` / `sweepExternalReplicas`, `arenaArchived`, and the
  external-game unions in the lobby/online builders (`worker.ts:6131`, `:4876`,
  `:5866`).
- Delete the house-vs-house **spawn + play** path from `houseTick`
  (`ARENA_OWNS_FILLER` and its branch go away — Tier 3 always owns filler).
  Keep seeks + bot-vs-human pickup untouched.
- `wrangler.jsonc`: drop `ARENA_INGEST_ENABLED`, `ARENA_LOBBY_ENABLED`,
  `ARENA_OWNS_FILLER`. Keep the `ARENA_INGEST_TOKEN` secret (now read by the
  Worker route).
- arena-service: delete `IngestClient.syncGames`/`postFrame` and the 4s sync in
  `Arena.tick`; `IngestSink` now only calls the Worker end route.

### Version lockstep

Unchanged from Tier 2 and non-negotiable: archived arena games must replay under
the Worker's `REPLAY_VERSION`. Deploy the arena bundle from the same commit as
the Worker; stamp `replayVersion` on every record; keep the CI sample-replay
check.

## Rollout (each step shippable + reversible)

| Step | Ships | Reversal | Status |
|---|---|---|---|
| **M1** | Worker `/api/arena/end` route; arena env gets `ARENA_END_URL` and posts ends there (DO `/arena/end` still accepts as fallback) | point `ARENA_END_URL` back at the DO | **implemented** — `src/app/api/arena/end/route.ts`, `arena-service/ingest.ts` |
| **M2** | Arena `/lobby` + tunnel hostname `arena.nerfchess.com`; client lobby merge behind `NEXT_PUBLIC_ARENA_URL` | unset the var | **implemented** — `arena-service/server.ts`, `src/lib/arenaLobby.ts` |
| **M3** | Arena spectator WS + client watch routing; presence-driven spawning replaces DO stand-down; arena stops calling `/arena/games` and `/arena/frame` when `ARENA_DO_URL` is empty | unset the var; re-set `ARENA_DO_URL` | **implemented** — `arena-service/spectate.ts`, watch routing in `game/[id]/page.tsx`, `HeroTv`, `/tv` |
| **M4** | DO deletions (§E); flags removed | git revert (state-free: replicas were in-memory only) | pending — only after M1–M3 verified in production |

Deploy sequence for the implemented milestones: (1) deploy the Worker (end
route ships dark — same `ARENA_INGEST_TOKEN`/`ARENA_INGEST_ENABLED` gates);
(2) rebuild + restart the arena service with `ARENA_END_URL`,
`ARENA_PUBLIC_ORIGINS` set (see `deploy/nerfchess-arena.env.example`) and add
the `arena.nerfchess.com` tunnel hostname → `http://127.0.0.1:8788`;
(3) set the build-time var `NEXT_PUBLIC_ARENA_URL=https://arena.nerfchess.com`
and redeploy the site; (4) once verified, empty `ARENA_DO_URL` on the box —
the 4s DO sync stops and spawning goes presence-driven; (5) M4 cleanup PR.

Implementation notes (deviations from the sketch above, all deliberate):
- Draft state streams **fully open** (both seats' cards face-up): the DO
  itself moved to full-transparency dtState (worker.ts `draftStateFor`), and a
  bot-vs-bot game has no human secrets — this also spares the client replica
  any hidden-card desync risk.
- Spectator chat shipped in the anonymous flavor (everyone is "spectator",
  shared profanity filter, 2s rate limit); the HMAC-ticket named variant
  remains optional follow-up work.
- While `ARENA_END_URL` is set and the DO sync still runs, a finished watched
  game is reported to the DO as `aborted:true` — display-only: the DO ends
  spectator replicas with the real result but skips its own archive (and even
  a double archive is safe: recordFinishedGame dedupes by game id).

## Estimated DO request savings

Model: `/healthz` observation (3 filler games, next alarm in 349ms) + code pacing
(`houseThinkMs` 1–4s/move, 0.3–0.8s at low clock, per-game alarms clamped to
≥300ms apart, maintenance follow-ups at +300ms) ⇒ **~1–2.5 alarms/sec while
filler is live**, and filler is live whenever ≥1 human socket is connected.

| Source (today) | Rate | ≈ Requests/mo | After Tier 3 |
|---|---|---|---|
| Alarms driven by filler games | 1–2.5/s × humans-online hours (12–18h/day assumed) | **1.9–4.7M** | 0 |
| `/arena/games` sync | every 4s, 24/7 | **0.65M** | 0 |
| `/arena/frame` relay | per move, only while watched | ~0–0.05M | 0 |
| `/arena/end` | 1–2/game | ~0.01M | moves to Worker (≈10× cheaper, no DO wake) |
| Alarms from human + bot-vs-human games | proportional to real play | 0.1–0.5M | unchanged |
| **Total DO requests saved** | | **≈ 2.5–5.4M/mo** (roughly 85–95% of current DO volume) | |

Duration (GB-s) savings are likely the larger dollar item: today the alarm chain
keeps the DO resident essentially whenever anyone is on the site; afterwards it
hibernates between human-game deadlines and 20s heartbeats. Confirm real
before/after numbers via the Cloudflare dashboard DO analytics (or the
observability MCP once authorized).

## Risks / caveats

- **Public arena endpoint** — read-only WS + lobby JSON behind Cloudflare
  (tunnel hides the origin IP; Cloudflare proxying gives DDoS posture). Add the
  per-IP upgrade rate limit anyway.
- **Single-region spectating** — watch latency to the OCI region only; fine for
  bot games.
- **Box down ⇒ no filler** — lobby merge fails soft and shows only DO games;
  identical blast radius to today's arena-down case, minus the ghost-game
  cleanup (no replicas exist to go stale).
- **Two lobby sources can disagree momentarily** (arena game finished but still
  in a cached lobby response) — client watch failure already self-corrects
  (`lobbyClient.ts` note: dead top game self-corrects on watch failure).
- **Ticket-signed chat** (option A.2) adds a shared secret between Worker and
  arena — ship anonymous first.
