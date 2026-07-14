# DO idle-traffic reduction: cached HTTP lobby + free keepalives

> Follow-up to Tier 3 (`bot-offload-tier3-direct-arena.md`). After the offload,
> residual DO traffic (~500–600 req/15min observed 2026-07-13 with 3–5 humans
> connected) is dominated by **idle viewers, not games**: every homepage/lobby
> visitor holds a WebSocket and costs the DO two billed wakes per 10s — a
> `{t:"p"}` keepalive (`multiplayer.ts:623`) and a lobby snapshot poll
> (`lobbyClient.ts:18` → WS `lobby` frame). Each inbound WS message bills as a
> DO request and blocks hibernation. ≈180 req/15min per idle visitor.
>
> Two changes: **(1)** lobby snapshots move to an edge-cached HTTP route, so N
> viewers cost the DO ~1 request per cache window and lurkers need no socket at
> all; **(2)** sockets that remain (players, watchers) answer idle keepalives
> with the hibernation API's auto-response, which is unbilled and does not wake
> the DO.

**Goal:** DO requests proportional to *games played*, not viewers present; DO
fully idle (hibernated, no alarms) when nobody is playing, even with people
reading the homepage.

**Non-goal:** in-game traffic. The in-game `p` frame is load-bearing (flag
check, alarm self-heal, clock resync — `worker.ts#sendClocks`) and stays.

## Component 1 — cached HTTP lobby snapshot

### 1a. DO: `GET /lobby`

`worker.ts#handleFetch` gains a `GET /lobby` branch beside `/healthz`.
Refactor `lobbySnapshot(ws)` (worker.ts:6008) into a `buildLobbyPayload()`
that returns the payload; the WS `lobby` case sends it, the new route returns
`Response.json(payload)`. The existing in-DO `lobbyCache`
(`LOBBY_CACHE_TTL_MS = 2000`, worker.ts:815) is inside the refactored builder,
so both paths share it. No auth (payload is public and identical for every
viewer — same reasoning as the existing WS snapshot cache comment).

Add a presence stamp: the route sets `this.lastLobbyHttpAt = Date.now()`
(in-memory is fine — see 1d for why persistence doesn't matter).

### 1b. Worker: edge cache in the default export

In the default export fetch handler (worker.ts:6596), route
`GET /api/lobby` before the OpenNext handler:

- Cache key: a **fixed** canonical URL (`https://<host>/api/lobby`, query
  stripped) so cache-busting query strings can't stampede the DO.
- On miss: forward to the DO's `/lobby`, attach
  `Cache-Control: public, s-maxage=3, stale-while-revalidate=6`, store via
  `ctx.waitUntil(cache.put(...))`, return it. `s-maxage=3` caps DO lobby load
  at ~1 hit / 3s **total** (shared across all viewers, independent of count) —
  chosen over the naive 10s so a freshly-posted or just-answered challenge is
  no more than ~3s + the client poll interval stale, without carving the 5s
  lobby page out onto its own (per-viewer) WebSocket poll.
- On DO error: return the cached copy if present (even stale), else 503 —
  fail-soft like `withArenaLobby`.

Worker requests are ~10× cheaper than DO requests and don't wake the DO. One
DO hit per ~10s **per colo** while anyone at all is browsing; effectively one
colo at current traffic.

### 1c. Client: lobby polling drops the WebSocket

- `useLobbySnapshot` (`src/lib/lobbyClient.ts`): replace the
  `MPSession`/`fetchLobby` plumbing with `fetch("/api/lobby")` +
  `withArenaLobby(...)` merge, same 10s interval, same last-good-snapshot
  module cache. The homepage live strip then opens **no socket**.
- Lobby page (`src/app/lobby/page.tsx`): its own poll loop switches to the
  same HTTP fetch. The page keeps creating its `MPSession` **only when the
  user acts** (queues, answers a seek, creates a challenge) — those flows
  already need the socket and already reconnect on demand.
- `MPSession.fetchLobby` stays for any remaining caller but becomes
  legacy; remove once nothing references it.

### 1d. DO: browsing presence replaces socket presence

`humanSocketCount() > 0` currently gates three things that really mean
"someone is looking at the site": house-seek freshness/clearing
(worker.ts:3644), the 20s house heartbeat re-arm (worker.ts:1306, :6466), and
lobby-viewer optics. With lurkers off WS, replace those gates with:

```ts
private sitePresence(): boolean {
  return this.humanSocketCount() > 0 || Date.now() - this.lastLobbyHttpAt < PRESENCE_TTL_MS; // 60s
}
```

Same pattern as the arena's presence-driven spawning (Tier 3 §B). The cache
window (10s) is well inside the 60s TTL, so one browsing viewer keeps presence
alive. `lastLobbyHttpAt` is in-memory: if the DO was evicted, the next lobby
fetch (cache miss) wakes it and restamps — worst case house seeks go stale for
one eviction gap, invisible.

**Deliberate semantic change:** signed-in lurkers (connected, not playing or
queued) leave the online-players list, and the `anonymous` viewer count goes
to zero (worker.ts:6177–6197). Only seated/queued/playing users remain. If the
"N online" optics matter, the Worker route can count distinct client IPs per
minute into the cached payload later — do not build that speculatively.

## Component 2 — auto-response keepalives for idle sockets

### 2a. DO

In the `GameServer` constructor:

```ts
this.ctx.setWebSocketAutoResponse(
  new WebSocketRequestResponsePair('{"t":"hb"}', '{"t":"n"}'),
);
```

The runtime answers a byte-exact `{"t":"hb"}` with `{"t":"n"}` **without
waking the DO and without billing a request**. The pair is DO-wide (can't
vary per socket), which is why the client must choose the frame (2b). The
reply `{"t":"n"}` is the bare no-match clock frame the server already sends
idle pingers (worker.ts:6378), so old and new clients both handle it.

Prereqs verified: the DO already uses the hibernation API
(`ctx.acceptWebSocket`, worker.ts:1134) and already rebuilds `this.sessions`
from `ctx.getWebSockets()` + `deserializeAttachment` in the constructor
(worker.ts:864–867), so a DO woken later by an alarm or HTTP request still
counts hibernated sockets in `humanSocketCount`.

### 2b. Client

`multiplayer.ts:623` heartbeat becomes state-dependent:

```ts
this.heartbeat = window.setInterval(
  () => this.sendFrame(this.seat || this.watchingId ? "p" : "hb"),
  10000,
);
```

- `seat` set (playing) or `watchingId` set (spectating): keep `p` — flag
  check, per-game alarm self-heal, clock resync all still fire.
- Neither (connected but idle, including `searching` in the queue): send
  `hb`. Today's `p` from those sockets is already a no-op reply
  (`sendClocks` with no match → bare `n`), so no behavior is lost. Queue
  liveness is unaffected: entries are validated against socket `readyState`
  (worker.ts:6133), and hibernated sockets stay OPEN.
- The zombie-socket wake poke (`requestClocks`, multiplayer.ts:502) only
  matters for seated/watching sessions and keeps using `p`.

### 2c. Server keeps accepting `p` from anyone

No server-side removal: stale cached bundles will send `p` from idle sockets
for days. They bill as today until clients refresh — harmless, self-draining.

## Rollout (each step shippable + reversible)

| Step | Ships | Reversal |
|---|---|---|
| **R1** | 2a + 2b (auto-response + client frame switch) — no route, no semantics change | revert client; pair is inert |
| **R2** | 1a + 1b (`/lobby` on DO, cached `/api/lobby` on Worker) — dark, nothing calls it | delete route |
| **R3** | 1c (clients poll HTTP) + 1d (presence gate) in one deploy — 1d must not trail 1c, or house seeks clear while lurkers browse | revert client to WS `fetchLobby`; DO keeps both paths |

Verify after R3 via `/healthz` + dashboard DO analytics: requests/15min with
N idle viewers should be flat in N; with zero sockets and zero games,
requests ≈ 0 and duration ≈ 0 between lobby cache misses.

## Savings

Per idle visitor today: ~90 lobby polls + ~90 pings = **~180 req/15min**.
After: **0** — pings are auto-answered free, lobby costs the DO ≤ 1 req/10s
total regardless of viewer count (~90/15min ceiling, shared, and only while
someone is actually browsing). At the observed 3–5 viewers: 500–600/15min →
**~100–150/15min**, now genuinely proportional to games.

Dollar honesty: requests were never the money (600/15min ≈ 1.7M/mo ≈
$0.26/mo). The real wins:

- **Duration (GB-s):** today any single lurker keeps the DO awake (10s pings
  + 20s heartbeat alarms → it never hibernates). After: no sockets from
  lurkers, no heartbeat alarm without `sitePresence()`-relevant players, so
  the DO hibernates whenever no game is live — during dead hours duration
  goes to ~0 instead of 24/7 residency.
- **Blast-radius/headroom:** every removed wake is one fewer chance for an
  unrelated request to be blamed for a CPU-limit reset on the single-threaded
  DO (see the 2026-07-08/10 incidents), and the requests graph becomes a
  real signal — a filler regression would now be visible instead of buried
  under viewer noise.

## Drawbacks / risks

- **Staleness:** with `s-maxage=3`, a challenge (which invalidates the DO's own
  lobby cache on create/accept via `saveMatch`, so the 2s DO cache does NOT
  stack here) lags at most edge + client poll: **~8s worst case on the lobby
  page** (3s edge + 5s poll), ~13s on the 10s-poll home strip, vs ~5s/~10s
  today. Move counts / watcher counts on the live strip drift; a freshly-posted
  challenge appears up to one window late; a just-answered challenge lingers
  (clicking it costs one wasted round-trip → `seek_gone` → self-corrects, a
  failure that already existed inside the poll window). Tunable: raise
  `s-maxage` toward 10 to cut DO hits ~3× at the cost of proportionally more
  staleness.
- **Presence semantics** (deliberate, see 1d): lurkers vanish from the online
  list and the anonymous count; "N online" shrinks to participants. House
  seeks now persist for `PRESENCE_TTL_MS` after the last viewer leaves.
- **Two lobby transports** exist during migration (WS frame + HTTP route);
  the WS `lobby` case only dies when old bundles age out.
- **Exact-match fragility of auto-response:** any serializer change that
  reorders/whitespace-shifts `{"t":"hb"}` silently turns free pings back into
  billed wakes — no error, just a metrics regression. Pin the frame as a
  string constant on the client, not `JSON.stringify` of an object literal,
  and add a comment on both sides pointing at each other.
- **Hibernated-socket assumptions:** anything iterating `this.sessions` for
  side effects now runs against sockets the DO hasn't heard from in minutes.
  Already handled for session restore (constructor rebuild), but new code
  must not assume a recent inbound frame implies liveness.
- **Public `/api/lobby` route:** cheap by construction (edge cache absorbs
  bursts; fixed cache key defeats query-string busting). A deliberate
  cache-bypass flood hits the Worker, not the DO, same posture as any other
  route.
- **What this does NOT reduce:** in-game traffic (moves, in-game `p`, per-move
  alarms) and bot-vs-human alarm load are untouched — that's the remaining
  ~100–150/15min, and it's the part that's supposed to exist.
