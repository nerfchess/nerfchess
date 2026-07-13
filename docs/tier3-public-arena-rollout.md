# Runbook: expose the arena publicly to move spectating off the DO (Tier 3 M2/M3)

Turns on the last stage of DO load reduction: browsers spectate bot-vs-bot
games by connecting **directly to the arena** (`/lobby` + `/socket/v1`) instead
of the Durable Object relaying frames. Until this is done the client is gated
off by an empty `NEXT_PUBLIC_ARENA_URL` and stays on DO-only games.

**Already live (do not repeat):** Tier 2 filler offload, and Tier 3
archive-off-DO (`ARENA_END_URL` on the box). This runbook is only the public
spectating path.

## Facts this runbook relies on (Tokyo box, verified 2026-07-13)
- Arena listens on `localhost:8788`, serves `GET /lobby` and `GET /socket/v1`
  (WebSocket upgrade). Origin allowlist `ARENA_PUBLIC_ORIGINS` defaults to
  `https://nerfchess.com,https://www.nerfchess.com`, so no arena-side change is
  needed for prod browsers.
- cloudflared 2026.6.1, systemd unit `cloudflared`, run as
  `cloudflared --no-autoupdate --config /etc/cloudflared/config.yml tunnel run`.
  Tunnel id `bf99bc53-9c39-4ad0-b74c-f22ff794f955`.
- **cloudflared shares the same tunnel as your SSH (`ssh-tokyo.nerfchess.com`).
  Never `systemctl restart cloudflared` — it drops your session. Use config
  hot-reload (below) instead.**
- There is **no `cert.pem`** on the box, so `cloudflared tunnel route dns …`
  will not work; create the DNS record via the Cloudflare dashboard or API.

Prerequisite: merge the branch that adds `NEXT_PUBLIC_ARENA_URL` to the
`next.config.mjs` `env` block (PR `arena-url-build-var`). Steps 2–3 can be done
first; step 4 needs that merged.

---

## Step 2 — add the cloudflared ingress route (on the Tokyo box)

SSH in: `ssh nerfchess-tokyo-svc`

Edit `/etc/cloudflared/config.yml`. Ingress is **first-match-wins and the
`http_status:404` catch-all must stay last**, so insert the arena rule
immediately **above** it:

```yaml
ingress:
  - hostname: ssh-tokyo.nerfchess.com
    service: ssh://localhost:22
  - hostname: engine.nerfchess.com
    path: ^/update$
    service: http://localhost:8789
  - hostname: engine.nerfchess.com
    service: http://localhost:8787
  - hostname: arena.nerfchess.com          # <-- ADD THIS RULE
    service: http://localhost:8788          #     (WebSockets proxy fine over http)
  - service: http_status:404
```

Suggested edit (backup first):

```bash
sudo cp /etc/cloudflared/config.yml /etc/cloudflared/config.yml.bak
sudoedit /etc/cloudflared/config.yml   # add the arena.nerfchess.com rule above the 404
```

**Validate before doing anything else:**

```bash
cloudflared tunnel ingress validate                         # must print "OK"
cloudflared tunnel ingress rule https://arena.nerfchess.com # must match the :8788 rule
```

**Apply without restarting** (cloudflared hot-reloads the config file on change;
force it with SIGHUP, which does NOT drop the tunnel/SSH):

```bash
sudo systemctl kill -s HUP cloudflared
journalctl -u cloudflared --since "1 min ago" | grep -i "config\|ingress\|reload"
```

If for any reason you must fully restart cloudflared, do it from an
out-of-band console (Oracle Cloud serial/VNC console), **not** over this SSH
session.

Rollback: restore `config.yml.bak` and `systemctl kill -s HUP cloudflared`.

---

## Step 3 — create the DNS record (Cloudflare dashboard or API)

The hostname must resolve to the tunnel. No `cert.pem` on the box, so use one of:

**Dashboard:** Cloudflare → `nerfchess.com` zone → DNS → Add record:
- Type: `CNAME`
- Name: `arena`
- Target: `bf99bc53-9c39-4ad0-b74c-f22ff794f955.cfargotunnel.com`
- Proxy status: **Proxied** (orange cloud) — required for tunnel routing
- TTL: Auto

**API** (from your workstation; needs a token with `Zone.DNS:Edit` on the zone):

```bash
ZONE_ID=<nerfchess.com zone id>
CF_API_TOKEN=<token with Zone.DNS:Edit>
curl -sS -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" \
  --data '{"type":"CNAME","name":"arena","content":"bf99bc53-9c39-4ad0-b74c-f22ff794f955.cfargotunnel.com","proxied":true}'
```

**Verify the route is live** (after DNS propagates, ~seconds behind Cloudflare):

```bash
# Public /lobby must return JSON games and echo the CORS origin:
curl -sS -m 10 -H "origin: https://www.nerfchess.com" \
  -D - -o /dev/null https://arena.nerfchess.com/lobby
# Expect: HTTP/2 200 and access-control-allow-origin: https://www.nerfchess.com
```

A `530`/`1033` means the tunnel isn't routing that hostname yet (recheck the
ingress rule + SIGHUP reload). A `403` on `/lobby` means the origin gate
rejected you — check `ARENA_PUBLIC_ORIGINS`.

Rollback: delete the CNAME record.

---

## Step 4 — redeploy the frontend with `NEXT_PUBLIC_ARENA_URL`

`NEXT_PUBLIC_*` is inlined at **build** time, and the frontend ships via a
manual deploy (there is no CI deploy):

```bash
# from the repo root, on origin/master with the arena-url-build-var PR merged:
git checkout master && git pull
NEXT_PUBLIC_ARENA_URL=https://arena.nerfchess.com npm run deploy
#   npm run deploy == opennextjs-cloudflare build && opennextjs-cloudflare deploy
```

`src/lib/arenaLobby.ts` reads the var; non-empty flips the client onto the
arena for lobby/TV listing and spectator sockets.

**Verify the deployed client picked it up:**
- Load `https://www.nerfchess.com/tv`, open DevTools → Network, and confirm a
  request to `https://arena.nerfchess.com/lobby` and, when opening a bot game,
  a WebSocket to `wss://arena.nerfchess.com/socket/v1`.
- Server-side, watch `journalctl -u nerfchess-arena -f` on the box for the
  spectator `watch`/frame activity from real viewers.

Rollback (fastest, reverses the whole feature for users): redeploy with the var
empty — `NEXT_PUBLIC_ARENA_URL= npm run deploy` — and the client falls straight
back to DO-only spectating. Do this **before** tearing down steps 2–3, or live
spectators will hit a dead hostname.

---

## Order & rollback summary
1. (prereq) merge `arena-url-build-var`.
2. Box ingress rule + `SIGHUP` reload — verified with `ingress rule`.
3. DNS CNAME (proxied) — verified with a public `curl /lobby`.
4. Frontend redeploy with the env var — verified in the browser network tab.

Reverse order to roll back: step 4 first (empty var redeploy), then 3, then 2.

## Security note
This publishes `GET /lobby` (read-only game metadata) and `/socket/v1` (WS,
origin-gated to the prod domains). Consider a Cloudflare rate-limit / WAF rule
on `arena.nerfchess.com`, since it's now internet-reachable rather than
DO-fronted. The arena remains stateless and holds no user data.
