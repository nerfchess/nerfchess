# Oracle Cloud Game Server

The friend-game service is a standalone Node.js websocket process. It does not
require Next.js, PeerJS, a database, or a third-party signalling server while
it is running. Active games are held in memory, so restarting the service ends
games in progress.

For a local home-PC dry run before deploying to a VM, see
[`home-pc-hosting.md`](./home-pc-hosting.md).

## Build And Run

On an Oracle Cloud Ubuntu VM with Node.js installed:

```bash
npm ci
npm run server:build
HOST=0.0.0.0 PORT=8080 GAME_SERVER_ORIGINS=https://play.example.com npm run server:start
```

Health check:

```bash
curl http://127.0.0.1:8080/healthz
```

For production browser clients, use TLS. The server can terminate TLS itself:

```bash
HOST=0.0.0.0 PORT=8443 \
TLS_KEY_PATH=/etc/letsencrypt/live/ws.example.com/privkey.pem \
TLS_CERT_PATH=/etc/letsencrypt/live/ws.example.com/fullchain.pem \
GAME_SERVER_ORIGINS=https://play.example.com \
npm run server:start
```

Alternatively put it behind Caddy or nginx and proxy websocket upgrades to
`127.0.0.1:8080/socket/v1`.

When the websocket is proxied from the same public host as the web app at
`/socket/v1`, no frontend variable is required. When the websocket has its own
hostname, build the web application with its public endpoint:

```bash
NEXT_PUBLIC_GAME_SERVER_URL=wss://ws.example.com/socket/v1 npm run build
```

## Systemd Service

Create `/etc/systemd/system/drawbackchess-game.service`:

```ini
[Unit]
Description=Drawback Chess game websocket service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/drawbackchess
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=8080
Environment=GAME_SERVER_ORIGINS=https://play.example.com
ExecStart=/usr/bin/npm run server:start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Then enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now drawbackchess-game
sudo systemctl status drawbackchess-game
```

If TLS terminates on the Node process rather than a reverse proxy, bind the
public TLS port and configure `TLS_KEY_PATH` and `TLS_CERT_PATH` in the unit.
Allow only the selected public port in the Oracle VCN ingress rules and the VM
firewall.
