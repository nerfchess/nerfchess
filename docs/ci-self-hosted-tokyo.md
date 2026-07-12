# Implementation spec: move CI (lint.yml, test.yml) to a self-hosted runner on the Tokyo box

Status: spec (not yet implemented)
Owner: boda
Target: Tokyo OCI box (same host as `nerfchess-engine.service`, arena, updater, cloudflared)

## 1. Summary

Move both GitHub Actions workflows (`.github/workflows/lint.yml`, `.github/workflows/test.yml`)
from `ubuntu-latest` to a single self-hosted runner on the Tokyo box.

- Repo is **private**, so the untrusted-fork-PR risk that normally rules out
  self-hosted runners does not apply (only collaborators can open PRs that run CI).
- Disk is not a constraint (see §2), so Chicago is not needed.
- The one real risk on Tokyo is **CPU contention with the engine**: house-bot move
  budgets run up to ~1845 ms measured on the public path against the worker's hard
  3000 ms `HOUSE_ENGINE_TIMEOUT_MS`. A CI job (tsc + eslint + test suites) pegging
  all 4 cores could push engine responses past that timeout, which triggers the
  DO local-fallback search — the exact CPU-blowup failure mode of the 07-08/07-09/07-10
  incidents. §5 mitigates this with cgroup limits; §8 verifies it empirically.

## 2. Disk budget (measured 2026-07-11 on the local checkout)

CI runs `npm ci`, `next lint`, `tsc --noEmit`, and `server:build` (tsc → `dist-server/`)
plus the `scripts/test-*.cjs` suites. It never runs `next build`, so no `.next/` (980 MB) is produced.

| Item | Size |
|---|---|
| checkout (working tree, no node_modules/.next) | ~250 MB |
| `node_modules` after `npm ci` | ~890 MB |
| `dist-server/` (tsc output) | ~10 MB |
| runner software + Node tool cache | ~300 MB |
| npm cache (`~ghrunner/.npm`) | ~500 MB–1 GB |
| **Steady-state total (one runner)** | **~2.5 GB** |

The runner reuses one `_work/<repo>` directory across jobs (it does not accumulate
per-run copies). Decision rule from the pre-flight (§3): if the box has **< 8 GB free**
after accounting for this, put the runner on Chicago (`nerfchess-svc`) instead —
same spec, different host label.

## 3. Pre-flight checks (on the Tokyo box)

SSH via `nerfchess-tokyo-svc` (cloudflared ProxyCommand; export the tunnel service
token pair for non-interactive use).

```sh
df -h /                    # need ≥ 8 GB free headroom; else use Chicago
uname -m                   # expect aarch64 (OCI Ampere A1) → use the arm64 runner tarball
nproc; free -h             # confirm 4 cores / ~23 GB as expected
curl -sI https://github.com | head -1   # outbound HTTPS reachable (runner long-polls github.com)
```

Also confirm in GitHub org settings (`nerfchess` org → Actions → Runners policy)
that repo-level self-hosted runners are allowed for private repos.

Note: the tests are pure Node/tsc — nothing in CI is architecture-sensitive, so
arm64 vs the x64 `ubuntu-latest` image is not a behavioral change. If a suite ever
adds native deps, re-verify they publish arm64 prebuilds.

## 4. Runner installation

Dedicated non-privileged user, no sudo, no group memberships that can read engine
secrets. Even though the repo is private, CI executes whatever `package.json` scripts
land on a branch — the runner user must not be able to read
`/etc/nerfchess-engine.env` (bearer token), `/etc/nerfchess-arena.env`,
`~ubuntu/.secrets/` (GitHub App PEM), or `~ubuntu/.ssh/`.

```sh
sudo useradd -m -s /bin/bash ghrunner
sudo -iu ghrunner
mkdir actions-runner && cd actions-runner
# Get the latest arm64 tarball URL from https://github.com/actions/runner/releases
curl -o runner.tar.gz -L https://github.com/actions/runner/releases/download/v<VER>/actions-runner-linux-arm64-<VER>.tar.gz
tar xzf runner.tar.gz
./config.sh \
  --url https://github.com/nerfchess/nerfchess \
  --token <REGISTRATION_TOKEN> \        # repo Settings → Actions → Runners → New self-hosted runner (expires in 1 h)
  --name tokyo-1 \
  --labels tokyo \                      # default labels self-hosted,Linux,ARM64 are added automatically
  --disableupdate false                 # let it self-update; it's a leaf service
exit
sudo ./svc.sh install ghrunner && sudo ./svc.sh start   # installs actions.runner.*.service
```

Registration token via `gh` from the workstation if preferred:
`gh api -X POST repos/nerfchess/nerfchess/actions/runners/registration-token -q .token`

**One runner, deliberately.** Lint and test workflows will serialize instead of
running in parallel. That roughly doubles wall-clock CI latency versus hosted
(~acceptable for this repo's cadence) and — more importantly — caps CI's worst-case
CPU draw, protecting the engine. Add a `tokyo-2` runner later only if §8's contention
measurements pass with margin.

## 5. Engine-protection resource limits (the important part)

Systemd drop-in for the runner service so CI always loses the CPU race against
`nerfchess-engine.service`:

```sh
sudo systemctl edit actions.runner.nerfchess-nerfchess.tokyo-1.service
```

```ini
[Service]
# Engine/arena/updater keep default CPUWeight=100; CI gets starved under contention.
CPUWeight=20
# Hard cap: at most 3 of 4 cores even when the box is otherwise idle,
# so one core is always free for engine/arena/cloudflared.
CPUQuota=300%
Nice=10
IOWeight=20
MemoryMax=6G
TasksMax=512
```

`sudo systemctl daemon-reload && sudo systemctl restart actions.runner.nerfchess-nerfchess.tokyo-1.service`

Optionally add an explicit `CPUWeight=1000` drop-in to `nerfchess-engine.service`
for extra margin. Do NOT touch cloudflared (restarting it drops SSH — validate
ingress first if it ever needs changes).

## 6. Workflow changes

One-line change per file, plus dropping `actions/setup-node`'s hosted-cache step is
NOT needed — `setup-node` works on self-hosted (downloads Node into the runner's
tool cache once; `cache: npm` stores tarballs under the runner user). Keep the
steps identical to preserve trivial rollback.

`.github/workflows/lint.yml` and `.github/workflows/test.yml`:

```yaml
    runs-on: [self-hosted, linux, tokyo]   # was: ubuntu-latest
```

Keep the existing `concurrency:` blocks — with a single runner they also prevent
queue pileup from rapid pushes.

## 7. Security posture (private repo, but still)

- Runner user `ghrunner`: no sudo, not in `ubuntu`'s groups, cannot read
  `/etc/nerfchess-*.env` or any key material. Verify: `sudo -iu ghrunner cat /etc/nerfchess-engine.env` → permission denied.
- No repo/organization secrets are needed by these workflows — don't add any to
  the jobs while they run on this box.
- The runner only makes **outbound** HTTPS long-polls to GitHub; no inbound port,
  no tunnel ingress rule, no cloudflared change.
- Branch protection on `master` unchanged; anyone who can push a branch can run
  code as `ghrunner` — acceptable for the current collaborator set, revisit if
  external collaborators are ever added (then: ephemeral/containerized runners).

## 8. Verification plan

1. Push a trivial branch; confirm both workflows pick up on `tokyo-1` and pass.
2. **Contention test (must pass before merging the `runs-on` change):** while a
   test.yml run is mid-`npm ci`/tsc, measure the engine on the public path:
   ```sh
   for i in 1 2 3 4 5; do curl -s -o /dev/null -w "%{time_total}\n" \
     -X POST https://engine.nerfchess.com/move -H "authorization: Bearer $TOK" \
     -H "content-type: application/json" \
     -d '{"match":{"setup":{"whiteNerfId":"x","blackNerfId":"x","seed":1},"mode":"buff","moves":[]},"skill":1750,"replayVersion":<current>}'; done
   ```
   Every response must stay comfortably under 3.0 s (target: no worse than ~2.0 s,
   the known worst case on an idle box). If it degrades, lower `CPUQuota` to 200%
   and retest; if still failing, move the runner to Chicago.
3. Confirm disk after two full runs: `df -h /` and `du -sh ~ghrunner/actions-runner/_work`.
4. Watch one bot game end-to-end during a CI run (the 07-10 incident showed the
   failure mode is invisible in logs until sockets drop).

## 9. Rollback

- Immediate: revert the two `runs-on:` lines to `ubuntu-latest` and push — hosted
  runners resume on the next event. Nothing server-side blocks this.
- Full teardown: `sudo ./svc.sh stop && sudo ./svc.sh uninstall`, then
  `./config.sh remove --token <removal token>`, `sudo userdel -r ghrunner`.

## 10. Non-goals / explicitly out of scope

- No CI on Chicago (fallback only, per §2's disk rule).
- No ephemeral/containerized runners for now (single-tenant private repo).
- No caching infrastructure beyond `setup-node`'s npm cache.
- Unrelated: GitHub's announced $0.002/min self-hosted platform fee for private
  repos was walked back (2025-12 → postponed indefinitely). If it ever ships,
  it applies to self-hosted private-repo minutes, so it is not a reason to do —
  or undo — this migration.
