# nerfchess engine service (Tier 1)

Off-DO house-bot engine. Runs on the OCI box; the game-server Durable Object
POSTs a stored-match subset and gets back a house move, moving the CPU-heavy
engine search off Cloudflare's single thread.

Full design: [`../docs/bot-offload-tier1-engine-service.md`](../docs/bot-offload-tier1-engine-service.md).

## API

```
GET  /healthz -> 200 "ok"
POST /move    -> 200 { "move": <Move|null> }
  Authorization: Bearer <HOUSE_ENGINE_TOKEN>
  { "match": <EngineMatch>, "skill": 1200|1400|1600|1750,
    "remainingClockMs"?: number, "replayVersion": number }
```

- `401` — missing/wrong bearer token.
- `409 {error:"replay_version"}` — this box's engine is out of lockstep with the
  Worker's `REPLAY_VERSION`; the DO falls back to local compute.
- `move: null` — the position has no legal move, or the record could not replay.

## Build

Bundles `server.ts` + `src/engine` + the `pickHouseMove` path into one
self-contained ESM file (`src/engine` has zero external deps).

```sh
cd engine-service
npm install          # esbuild only
npm run build        # -> dist/server.mjs
```

## Deploy (OCI box)

```sh
# 1. copy the bundle
sudo mkdir -p /opt/nerfchess-engine
sudo cp dist/server.mjs /opt/nerfchess-engine/

# 2. env file (chmod 600) — set the shared token + REPLAY_VERSION
sudo cp deploy/nerfchess-engine.env.example /etc/nerfchess-engine.env
sudo chmod 600 /etc/nerfchess-engine.env
sudo editor /etc/nerfchess-engine.env   # HOUSE_ENGINE_TOKEN, ENGINE_REPLAY_VERSION

# 3. systemd unit
sudo cp deploy/nerfchess-engine.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now nerfchess-engine
curl -s localhost:8787/healthz    # -> ok
```

### Tunnel ingress

Add to the box's `/etc/cloudflared/config.yml`, **above** the catch-all
(same tunnel already serving `ssh.` and `pgdb.`):

```yaml
- hostname: engine.nerfchess.com
  service: http://localhost:8787
```

Then:

```sh
cloudflared tunnel route dns nerfchess-pg engine.nerfchess.com
sudo systemctl restart cloudflared
```

## Enable on the Worker

```sh
openssl rand -hex 32                 # generate the shared token
wrangler secret put HOUSE_ENGINE_TOKEN     # paste the same value that's in the env file
# HOUSE_ENGINE_URL is already in wrangler.jsonc vars.
# Flip HOUSE_ENGINE_REMOTE "false" -> "true" in wrangler.jsonc, then deploy.
```

Rollback is instant: set `HOUSE_ENGINE_REMOTE` back to `"false"` and deploy.
Bots keep playing at full strength via the local engine whenever the remote
path is off or unreachable.

## Version lockstep

`ENGINE_REPLAY_VERSION` (env) must equal the Worker's `REPLAY_VERSION` constant
(`worker.ts`). On mismatch the service 409s and the DO computes locally, so a
stale box degrades safely rather than desyncing — but rebuild + redeploy this
service whenever `REPLAY_VERSION` bumps.

## Self-update webhook (drift heals itself)

Deployed on the box alongside the engine (files in `deploy/`):

- `updater.mjs` — HTTP service on `127.0.0.1:8789` (systemd:
  `nerfchess-engine-updater.service`, runs as `ubuntu`, token in
  `/etc/nerfchess-engine-updater.env` = the same `HOUSE_ENGINE_TOKEN`).
  `POST /update {replayVersion}` starts a rebuild; `GET /update` reports the
  last run. Per-version cooldown (5 min) so a lagging master isn't hammered.
- `update.sh` — unprivileged: `git fetch origin master` in
  `/opt/nerfchess-engine/repo` (read-only GitHub deploy key,
  `~ubuntu/.ssh/github-deploy`), refuses unless master's `REPLAY_VERSION`
  equals the requested one, builds, then hands off to…
- `nerfchess-engine-apply` (root, `/usr/local/sbin`, the only sudoers grant):
  swaps `/opt/nerfchess-engine/server.mjs`, stamps `ENGINE_REPLAY_VERSION`,
  restarts, health-checks. Keeps the last five bundle backups.

The tunnel routes `engine.nerfchess.com` path `^/update$` to `:8789` (rule
above the engine catch-all in `/etc/cloudflared/config.yml`); everything else
still hits the engine on `:8787`.

The Worker side (`pingEngineUpdate` in `worker.ts`) fires this webhook —
throttled, fire-and-forget — whenever `/move` answers 409. Net effect: deploy
the worker from origin/master and the box catches up on its own within
seconds of the first bot move; a worker deployed from unpushed code just keeps
falling back to local compute (and, until the frozen-clock search abort lands,
that fallback can still blow the DO CPU limit — push master first).

## Note on the repo typecheck

`server.ts` uses `node:http` and imports from `../src`. It builds standalone via
`build.mjs` (esbuild, types erased) and is not part of the Worker bundle. If the
repo's `tsc` project picks it up and lacks `@types/node` in scope, add
`engine-service` to `tsconfig` `exclude` — it has its own build.
