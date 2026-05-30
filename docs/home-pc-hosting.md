# Home PC Hosting

This runs Drawback Chess from your own computer for local testing or play with
people who can reach your machine.

## Same Computer

In one terminal, build and start the authoritative game server:

```powershell
npm.cmd run server:build
$env:HOST="127.0.0.1"
$env:PORT="8080"
npm.cmd run server:start
```

In a second terminal, start the web app:

```powershell
npm.cmd run dev
```

Open `http://127.0.0.1:3000/friend`. In development, the browser defaults to
`ws://127.0.0.1:8080/socket/v1` for friend games.

## Other Devices On Your Wi-Fi

Find your PC's LAN IP address:

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"} | Select-Object IPAddress,InterfaceAlias
```

Start the game server on all network interfaces:

```powershell
npm.cmd run server:build
$env:HOST="0.0.0.0"
$env:PORT="8080"
npm.cmd run server:start
```

Start the web app on all network interfaces:

```powershell
npm.cmd run dev:host
```

Open `http://YOUR_LAN_IP:3000/friend` from another device. The page will connect
to `ws://YOUR_LAN_IP:8080/socket/v1`.

If Windows Firewall asks, allow Node.js on private networks. If it does not ask
and other devices cannot connect, add inbound rules for TCP ports `3000` and
`8080` on private networks.

## Internet Access From Home

For someone outside your Wi-Fi, you need either port forwarding or a tunnel.
The safer first test is a tunnel such as Cloudflare Tunnel, Tailscale Funnel, or
ngrok. Expose both the web app and websocket server, or put a reverse proxy in
front of them and proxy websocket upgrades to `/socket/v1`.

For a real public deployment, use HTTPS/WSS. Browsers will block insecure
websockets from an HTTPS page.

## Cloudflare Tunnel

Cloudflare Tunnel is the easiest public test because you do not need router port
forwarding. You need a domain in Cloudflare DNS.

Start the local services first:

```powershell
npm.cmd run server:build
$env:HOST="127.0.0.1"
$env:PORT="8080"
npm.cmd run server:start
```

In a second terminal:

```powershell
npm.cmd run dev
```

In the Cloudflare dashboard:

1. Go to **Zero Trust** -> **Networks** -> **Tunnels**.
2. Create a tunnel and choose **cloudflared**.
3. Pick **Windows** and run the generated install command in an Administrator
   PowerShell window.
4. Add these public hostnames to the same tunnel:

| Public hostname | Path | Service |
| --- | --- | --- |
| `play.example.com` | `/socket/v1` | `http://127.0.0.1:8080` |
| `play.example.com` | blank | `http://127.0.0.1:3000` |

Replace `play.example.com` with your real hostname. The `/socket/v1` route sends
websocket traffic to the judging server; the blank route sends the website to
Next.js. With this same-host setup, no `NEXT_PUBLIC_GAME_SERVER_URL` is needed.

Then open:

```text
https://play.example.com/friend
```

For a production Next build instead of `npm run dev`, build with:

```powershell
npm.cmd run build
npm.cmd run start
```

If you use two different hostnames, such as `play.example.com` for the website
and `ws.example.com` for the game server, build the frontend with:

```powershell
$env:NEXT_PUBLIC_GAME_SERVER_URL="wss://ws.example.com/socket/v1"
npm.cmd run build
```

For a dedicated judging-server hostname, route the blank path to the game
server:

| Public hostname | Path | Service |
| --- | --- | --- |
| `ws.example.com` | blank | `http://127.0.0.1:8080` |

The websocket will still use `wss://ws.example.com/socket/v1`, and the public
health check will be available at `https://ws.example.com/healthz`.

Keep both `node` processes and the Cloudflare Tunnel connector running while
people are playing. Active games are stored in memory, so restarting the judging
server ends games in progress.

## Cloudflare Tunnel Troubleshooting

Work from the local machine outward: first prove the judging server is alive,
then prove `cloudflared` is connected, then prove DNS and the frontend bundle
point at the right websocket URL.

### Local Judging Server

Check that the Node server is listening:

```powershell
Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
```

Check the local health endpoint:

```powershell
Invoke-WebRequest http://127.0.0.1:8080/healthz -UseBasicParsing
```

Expected body:

```json
{"ok":true,"games":0}
```

If this fails, start the judging server:

```powershell
npm.cmd run server:build
$env:HOST="127.0.0.1"
$env:PORT="8080"
npm.cmd run server:start
```

### Cloudflare Connector

Check that the Windows service exists and is running:

```powershell
Get-Service cloudflared
```

Restart it after changing tunnel routes:

```powershell
Restart-Service cloudflared
```

In the Cloudflare dashboard, the tunnel should show a healthy connector. If the
tunnel is unhealthy, the public hostname will not reach your PC.

### Public Health Check

If you use a dedicated `ws.example.com` hostname with a blank-path route to
`http://127.0.0.1:8080`, test:

```powershell
Invoke-WebRequest https://ws.example.com/healthz -UseBasicParsing
```

If the tunnel only routes `/socket/v1`, `/healthz` will not be public. Add a
temporary blank-path route to `http://127.0.0.1:8080` while debugging, or use a
dedicated `ws.` hostname for the judging server.

### Websocket Check

In browser DevTools, open **Network** and filter by **WS**. The friend page
should connect to:

```text
wss://ws.example.com/socket/v1
```

or, for same-host routing:

```text
wss://play.example.com/socket/v1
```

If you see `drawbackchess-v1-XXXXX`, `PeerJS`, or `0.peerjs.com`, Cloudflare is
still serving an old frontend build. Redeploy the frontend and clear browser
site data.

### Common Errors

`DNS op failed: HTTP 400. You may need to manually create CNAME`

The tunnel route was saved, but Cloudflare could not create DNS automatically.
Create a proxied CNAME manually:

| Type | Name | Target |
| --- | --- | --- |
| `CNAME` | `ws` | `<tunnel-id>.cfargotunnel.com` |

`A DNS record managed by Workers already exists on that host`

That hostname is already claimed by Cloudflare Pages, Workers, or a Worker
route. Use a separate judging-server hostname such as `ws.example.com`, then set
the frontend variable:

```powershell
$env:NEXT_PUBLIC_GAME_SERVER_URL="wss://ws.example.com/socket/v1"
npm.cmd run build
```

For Cloudflare Pages, set the same value in **Workers & Pages** -> your project
-> **Settings** -> **Variables and Secrets**, then redeploy.

`502 Bad Gateway`

Cloudflare reached `cloudflared`, but `cloudflared` could not reach the local
service. Check that the judging server is running and that the tunnel service is
`http://127.0.0.1:8080`, not `https://127.0.0.1:8080`.

`1033` or tunnel not found

The tunnel is not connected to Cloudflare. Restart the `cloudflared` service and
check the tunnel connector status in Zero Trust.

`403 Forbidden` on websocket connect

The server rejected the websocket upgrade. Check that the public hostname route
points to `/socket/v1` and that `GAME_SERVER_ORIGINS` is either unset for local
testing or includes the exact frontend origin, such as:

```powershell
$env:GAME_SERVER_ORIGINS="https://play.example.com"
```

`Negotiation of connection to drawbackchess-v1-XXXXX failed`

This is the old PeerJS frontend, not the judging server. Redeploy the frontend
from the current code and clear cached site data.

### Known-Good Setup

For Cloudflare-hosted static frontend plus home-PC judging server:

| Part | Value |
| --- | --- |
| Frontend | Cloudflare Pages / Workers static site |
| Tunnel hostname | `ws.example.com` |
| Tunnel path | blank |
| Tunnel service | `http://127.0.0.1:8080` |
| Frontend env var | `NEXT_PUBLIC_GAME_SERVER_URL=wss://ws.example.com/socket/v1` |
| Local health | `http://127.0.0.1:8080/healthz` |
| Public health | `https://ws.example.com/healthz` |
