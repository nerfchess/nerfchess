# Cloudflare Agent Troubleshooting Runbook

Use this runbook when diagnosing Drawback Chess friend-game connectivity through
Cloudflare Tunnel. Execute steps in order. Stop when the failing layer is found
and apply only the remediation for that layer.

## Variables

Set these placeholders before starting:

```text
FRONTEND_ORIGIN=https://play.example.com
WS_ORIGIN=https://ws.example.com
WS_URL=wss://ws.example.com/socket/v1
LOCAL_JUDGE=http://127.0.0.1:8080
LOCAL_SOCKET=ws://127.0.0.1:8080/socket/v1
REPO=C:\Users\boda\Documents\GitHub\drawbackchess
```

If the frontend and websocket use the same hostname, set:

```text
FRONTEND_ORIGIN=https://play.example.com
WS_ORIGIN=https://play.example.com
WS_URL=wss://play.example.com/socket/v1
```

## Safety Rules

- Do not delete DNS records, Worker routes, Pages custom domains, or tunnels
  unless explicitly instructed by the user.
- Prefer creating or testing a separate `ws.` hostname over modifying the
  frontend hostname.
- Do not restart the judging server during an active real game unless the user
  approves. Restarting the judging server ends in-memory games.
- Do not expose port `3000` through Tunnel if the frontend is already hosted by
  Cloudflare Pages or Workers. Only expose the judging server.

## Target Architecture

Known-good setup for a Cloudflare-hosted frontend plus home-PC judging server:

| Part | Expected value |
| --- | --- |
| Frontend | Cloudflare Pages / Workers static site |
| Tunnel hostname | `ws.example.com` |
| Tunnel public hostname path | blank |
| Tunnel service | `http://127.0.0.1:8080` |
| Frontend env var | `NEXT_PUBLIC_GAME_SERVER_URL=wss://ws.example.com/socket/v1` |
| Local health | `http://127.0.0.1:8080/healthz` |
| Public health | `https://ws.example.com/healthz` |

Same-host setup is also valid:

| Public hostname | Path | Service |
| --- | --- | --- |
| `play.example.com` | `/socket/v1` | `http://127.0.0.1:8080` |
| `play.example.com` | blank | Cloudflare-hosted frontend or local frontend |

## Step 1: Confirm Current Code Is New Websocket Code

Run:

```powershell
Set-Location "C:\Users\boda\Documents\GitHub\drawbackchess"
rg -n "drawbackchess-v1|PeerJS|peerjs|new Peer|0.peerjs.com" src package.json next.config.mjs
```

Expected:

```text
no matches
```

If matches appear in `src` or `package.json`, the frontend still contains the
old PeerJS implementation. Stop and report that the current code must be updated
before Cloudflare debugging can continue.

## Step 2: Confirm Local Judging Server

Run:

```powershell
Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
```

Expected:

```text
State: Listen
LocalAddress: 127.0.0.1 or 0.0.0.0
```

Then run:

```powershell
Invoke-WebRequest http://127.0.0.1:8080/healthz -UseBasicParsing
```

Expected body:

```json
{"ok":true,"games":0}
```

If port `8080` is not listening or `/healthz` fails, start the judging server:

```powershell
Set-Location "C:\Users\boda\Documents\GitHub\drawbackchess"
npm.cmd run server:build
$env:HOST="127.0.0.1"
$env:PORT="8080"
npm.cmd run server:start
```

If using a persistent background server, start it with hidden window and logs:

```powershell
Set-Location "C:\Users\boda\Documents\GitHub\drawbackchess"
$env:HOST="127.0.0.1"
$env:PORT="8080"
Start-Process -FilePath node -ArgumentList "dist-server/server/index.js" -WorkingDirectory (Get-Location) -WindowStyle Hidden -RedirectStandardOutput ".game-server.stdout.log" -RedirectStandardError ".game-server.stderr.log"
```

Re-test `/healthz`.

## Step 3: Confirm Local Websocket Protocol

Run this smoke test:

```powershell
@'
const WebSocket = require('ws');
const url = 'ws://127.0.0.1:8080/socket/v1';
const white = new WebSocket(url);
let black;
let code;
let done = false;
const finish = (msg, exitCode = 0) => {
  if (done) return;
  done = true;
  console.log(msg);
  try { white.close(); } catch {}
  try { black && black.close(); } catch {}
  setTimeout(() => process.exit(exitCode), 100);
};
const send = (ws, t, d) => ws.send(JSON.stringify(d === undefined ? { t } : { t, d }));
white.on('open', () => send(white, 'create', { timeSec: 60, incrementSec: 0 }));
white.on('message', (buf) => {
  const frame = JSON.parse(buf.toString());
  if (frame.t === 'created') {
    code = frame.d.id;
    black = new WebSocket(url);
    black.on('open', () => send(black, 'join', { id: code }));
    black.on('message', (blackBuf) => {
      const blackFrame = JSON.parse(blackBuf.toString());
      if (blackFrame.t === 'start') setTimeout(() => send(white, 'move', { u: 'e2e4', ply: 0 }), 20);
      if (blackFrame.t === 'error') finish(`BLACK ERROR ${blackFrame.d.message}`, 1);
    });
  }
  if (frame.t === 'move') finish(`OK ${code} ${frame.d.u} ply=${frame.d.ply}`);
  if (frame.t === 'error') finish(`WHITE ERROR ${frame.d.message}`, 1);
});
setTimeout(() => finish(`TIMEOUT code=${code || ''}`, 1), 8000);
'@ | node
```

Expected:

```text
OK <CODE> e2e4 ply=1
```

If this fails, the issue is the judging server, not Cloudflare.

## Step 4: Confirm Cloudflare Tunnel Connector

Run:

```powershell
Get-Service cloudflared
```

Expected:

```text
Status: Running
```

If not running:

```powershell
Start-Service cloudflared
```

If routes were changed in the Cloudflare dashboard:

```powershell
Restart-Service cloudflared
```

Then inspect the tunnel in Cloudflare Zero Trust:

```text
Zero Trust -> Networks -> Tunnels -> selected tunnel
```

Expected:

```text
Connector status: Healthy
```

If the connector is unhealthy, fix the connector before changing app code.

If `cloudflared.exe` is not recognized in PowerShell, use the installed full
path:

```powershell
$cf="C:\Program Files (x86)\cloudflared\cloudflared.exe"
& $cf --version
```

If the service is `Running` but Cloudflare returns `1033` or `530`, stop the
service and run the connector in the foreground to inspect live logs:

```powershell
$cf="C:\Program Files (x86)\cloudflared\cloudflared.exe"
$token="<paste tunnel token from Cloudflare Zero Trust>"
Stop-Service cloudflared -Force
& $cf tunnel run --token $token
```

Expected logs mention registered connections to Cloudflare edge locations. If
the foreground process cannot register connections, fix that error before
reinstalling the service. Common causes are an expired/wrong token, blocked
outbound network access, or using a token from a different tunnel than the DNS
record points to.

After a successful foreground test, stop it with `Ctrl+C`, then reinstall the
Windows service with the same token:

```powershell
$cf="C:\Program Files (x86)\cloudflared\cloudflared.exe"
$token="<paste tunnel token from Cloudflare Zero Trust>"
& $cf service uninstall
& $cf service install $token
Start-Service cloudflared
```

## Step 5: Confirm Tunnel Public Hostname

For a dedicated websocket hostname, preferred route:

```text
Hostname: ws.example.com
Path: blank
Service: http://127.0.0.1:8080
```

Run:

```powershell
Invoke-WebRequest https://ws.example.com/healthz -UseBasicParsing
```

Expected body:

```json
{"ok":true,"games":0}
```

If this fails:

- If response is `502`, Cloudflare reached `cloudflared` but `cloudflared`
  cannot reach `http://127.0.0.1:8080`. Re-check Step 2 and the tunnel service
  URL.
- If response is `1033`, the tunnel is not connected. Re-check Step 4.
- If DNS does not resolve, re-check Step 6.
- If `/healthz` returns `404`, the tunnel may only route `/socket/v1`. Use a
  blank-path route on the dedicated `ws.` hostname while debugging.

## Step 6: Confirm DNS

For a dedicated websocket hostname, Cloudflare DNS should contain:

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| `CNAME` | `ws` | `<tunnel-id>.cfargotunnel.com` | Proxied |

If Cloudflare reports:

```text
DNS op failed: HTTP 400. You may need to manually create CNAME
```

Create the CNAME manually.

If Cloudflare reports:

```text
A DNS record managed by Workers already exists on that host
```

Do not fight that hostname. Use a separate hostname such as `ws.example.com`.
Then update the frontend env var:

```text
NEXT_PUBLIC_GAME_SERVER_URL=wss://ws.example.com/socket/v1
```

## Step 7: Confirm Frontend Build Configuration

If using a dedicated `ws.` hostname, the frontend must be built with:

```text
NEXT_PUBLIC_GAME_SERVER_URL=wss://ws.example.com/socket/v1
```

For Cloudflare Pages:

```text
Workers & Pages -> project -> Settings -> Variables and Secrets
```

Expected variable:

```text
NEXT_PUBLIC_GAME_SERVER_URL = wss://ws.example.com/socket/v1
```

After changing this variable, redeploy the frontend.

If deploying from local:

```powershell
$env:NEXT_PUBLIC_GAME_SERVER_URL="wss://ws.example.com/socket/v1"
npm.cmd run build
npm.cmd run deploy
```

If using same-host `/socket/v1` routing, this env var may be omitted.

## Step 8: Confirm Browser Websocket Target

Open the deployed friend page:

```text
https://play.example.com/friend
```

Open browser DevTools:

```text
Network -> WS
```

Expected websocket request:

```text
wss://ws.example.com/socket/v1
```

or:

```text
wss://play.example.com/socket/v1
```

If the browser tries:

```text
drawbackchess-v1-XXXXX
0.peerjs.com
```

Then the deployed frontend is stale. Redeploy the frontend from the current code
and clear browser site data.

Clear browser cache:

```text
DevTools -> Application -> Storage -> Clear site data
```

Then hard refresh.

## Step 9: Interpret Common Errors

### `Negotiation of connection to drawbackchess-v1-XXXXX failed`

Cause:

```text
Old PeerJS frontend is still deployed or cached.
```

Action:

```text
Redeploy frontend and clear site data.
```

### `WebSocket connection failed`

Cause candidates:

```text
Wrong NEXT_PUBLIC_GAME_SERVER_URL
Tunnel route missing
cloudflared unhealthy
Judging server not running
```

Action:

```text
Run Steps 2, 4, 5, 7, and 8.
```

### `403 Forbidden`

Cause candidates:

```text
Tunnel path not routed to /socket/v1
GAME_SERVER_ORIGINS excludes frontend origin
```

Action:

```powershell
$env:GAME_SERVER_ORIGINS="https://play.example.com"
```

Then restart the judging server. For local testing, leaving
`GAME_SERVER_ORIGINS` unset is acceptable.

### `502 Bad Gateway`

Cause:

```text
cloudflared cannot reach the local judging server.
```

Action:

```text
Confirm tunnel service is http://127.0.0.1:8080 and Step 2 passes.
```

### `1033`

Cause:

```text
Tunnel is not connected to Cloudflare.
```

Action:

```powershell
Restart-Service cloudflared
```

Then check connector health in Zero Trust.

## Step 10: Final Success Criteria

All of these must be true:

```text
Local health succeeds: http://127.0.0.1:8080/healthz
Public health succeeds: https://ws.example.com/healthz
Browser WS connects to: wss://ws.example.com/socket/v1
No browser request references PeerJS or drawbackchess-v1
Friend game can create a code
Second browser can join the code
Server accepts first move and broadcasts it to both clients
```

When reporting back, include:

```text
Local health result
Public health result
Tunnel connector status
DNS record used
Frontend NEXT_PUBLIC_GAME_SERVER_URL value
Browser websocket URL observed
Any failing status code or console error
```
