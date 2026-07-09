# Tokyo box self-update

How the OCI Tokyo box (engine + arena) stays in sync with the deployed Worker,
and what to do when it doesn't. Written after the 2026-07-08 and 2026-07-09
outages, both caused by the same class of bug: **a stale bundle on the box
silently degrading every house-bot move to the DO's unbounded local search**,
which blows the Durable Object's CPU limit and drops every live game socket.

## Why staleness is an outage, not a nuisance

The GameServer DO offloads house-bot move searches to the engine service
(`worker.ts` `remoteHouseMove`). On **any** remote failure it falls back to the
local search (`pickHouseMove` → `src/engine/ai.ts`), whose time budget uses
`Date.now()` — frozen during synchronous CPU on Workers — so the fallback
search never times out. One fallback move can evict the single global DO
isolate; the blamed request in the logs is whatever innocent fetch (usually a
websocket upgrade) was in flight.

A stale box fails in two ways:

1. **Version drift** (`REPLAY_VERSION` differs): the engine answers **409**,
   the worker pings the self-updater, the box rebuilds. Self-healing.
2. **Silent drift** (same `REPLAY_VERSION`, different replay semantics — e.g.
   a card moved tiers, changing the draft-offer rolls): the engine replays the
   record differently and returns **200 with `move: null`**. No 409, no ping,
   no self-heal — every bot move on affected games runs the local fallback.
   This is what happened on 2026-07-09 (croc card tier 6→8, merged 01:00 UTC,
   worker deployed 01:03, DO CPU-evicted 01:11).

The arena rots identically: it bundles the same replay code, and a mismatched
`ARENA_REPLAY_VERSION` means the worker rejects every finished-game report
(`arena_end_report_failed` in its journal — no arena games were ingested for
~2 days before 2026-07-09).

## What runs on the box

| Unit | Port | Bundle | Env | Version key |
| --- | --- | --- | --- | --- |
| `nerfchess-engine` | 8787 | `/opt/nerfchess-engine/server.mjs` | `/etc/nerfchess-engine.env` | `ENGINE_REPLAY_VERSION` |
| `nerfchess-arena` | 8788 | `/opt/nerfchess-arena/server.mjs` | `/etc/nerfchess-arena.env` | `ARENA_REPLAY_VERSION` |
| `nerfchess-engine-updater` | 8789 (local + tunnel `/update`) | `/opt/nerfchess-engine/updater.mjs` | `/etc/nerfchess-engine-updater.env` | — |
| `nerfchess-autoupdate.timer` | — | `/opt/nerfchess-engine/autoupdate.sh` | reads both env files | — |

Source of truth for all of these lives in `engine-service/deploy/` (plus
`arena-service/deploy/` for the arena unit/env examples). The box's git clone
is `/opt/nerfchess-engine/repo`, fetched over HTTPS with a short-lived GitHub
App installation token (`github-app-token.mjs`).

## The three update paths

All three converge on the same two scripts — `update.sh` (fetch master, guard
the version, build engine + arena, idempotent via the
`/opt/nerfchess-engine/applied-commit` stamp) and the sudoers-gated
`nerfchess-engine-apply` (swap bundles, stamp env versions, restart, health
check; skips any service whose bundle is byte-identical, so the arena's in-RAM
games only die when the arena actually changed).

1. **Worker 409 ping** — after a deploy with a `REPLAY_VERSION` bump, the
   engine 409s, the worker POSTs `engine.nerfchess.com/update
   {replayVersion}`, the box rebuilds. Handles *version* drift.
2. **Periodic timer** — `nerfchess-autoupdate.timer` fires every 15 min and
   POSTs the local updater with the *currently applied* version. If master
   moved without a version bump, the box rebuilds within ~15 min of the merge;
   if master bumped the version, `update.sh` refuses (that update must wait
   for the worker deploy, path 1). Handles *silent* drift — the outage class.
3. **Manual** — same endpoint from anywhere with the bearer token
   (`UPDATER_TOKEN` in `/etc/nerfchess-engine-updater.env`, same value as
   `HOUSE_ENGINE_TOKEN`):

   ```sh
   curl -X POST https://engine.nerfchess.com/update \
     -H "authorization: Bearer $TOKEN" -H "content-type: application/json" \
     -d '{"replayVersion":4}'
   # status of the last run:
   curl https://engine.nerfchess.com/update -H "authorization: Bearer $TOKEN"
   ```

## Health signatures to watch

- **Silent engine drift**: Cloudflare log shows GameServer `exceededCpu`
  blamed on random requests; the engine's `/move` still returns 200. Check
  `GET /update` for the applied commit vs `origin/master`.
- **Arena drift**: `journalctl -u nerfchess-arena` shows
  `arena_end_report_failed` after every `game_end`.
- **After any worker deploy**: the timer bounds silent-drift exposure to
  ~15 min, but if the deploy bumped `REPLAY_VERSION` the box only heals after
  a bot move triggers the 409 ping — verify with `GET /update` that a run
  happened, and that each tier returns 200 on
  `POST https://engine.nerfchess.com/move`.

## Installing / updating the box-side files

The updater always builds from `origin/master`, but the deploy files
themselves (scripts, units) are **not** self-updating — after changing
anything in `engine-service/deploy/`, push it to the box:

```sh
scp engine-service/deploy/update.sh engine-service/deploy/autoupdate.sh nerfchess-tokyo-svc:/tmp/
ssh nerfchess-tokyo-svc 'sudo install -o root -g root -m 755 /tmp/update.sh /tmp/autoupdate.sh /opt/nerfchess-engine/'
scp engine-service/deploy/nerfchess-engine-apply nerfchess-tokyo-svc:/tmp/
ssh nerfchess-tokyo-svc 'sudo install -o root -g root -m 755 /tmp/nerfchess-engine-apply /usr/local/sbin/'
scp engine-service/deploy/nerfchess-autoupdate.{service,timer} nerfchess-tokyo-svc:/tmp/
ssh nerfchess-tokyo-svc 'sudo install -o root -g root -m 644 /tmp/nerfchess-autoupdate.* /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now nerfchess-autoupdate.timer'
```

(SSH goes through the Cloudflare tunnel; restarting `cloudflared` drops the
session — `cloudflared tunnel ingress validate` before touching it.)

## Known gaps

- The timer polls; it does not close the window entirely. The durable fix is
  worker-side: ping the updater when the remote returns 200 with a null move
  (silent-drift signal), and a node-count abort in `src/engine/ai.ts` so the
  local fallback is physically incapable of blowing the DO's CPU budget.
- `REPLAY_VERSION` must be bumped for any change that alters replay semantics
  (card tiers/pools, move rules, RNG draws). The version guard is only as good
  as that discipline; the timer is the backstop for when it slips.
