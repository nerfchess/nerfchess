# Nerf Chess

Chess where every player secretly draws a "nerf" - a hidden rule that handicaps
them all game. Figure out your opponent's rule before they figure out yours.
Live at [nerfchess.com](https://nerfchess.com).

## Stack

- **Frontend:** Next.js 16 (App Router) + Tailwind, deployed to Cloudflare
  Workers via [OpenNext](https://opennext.js.org/cloudflare).
- **Multiplayer:** a Cloudflare Durable Object (`worker.ts`, class `GameServer`)
  speaking the websocket protocol in [`docs/game-server-protocol.md`](docs/game-server-protocol.md).
  It runs the same rules engine as the browser and is authoritative for moves,
  clocks, and results.
- **Persistence:** Cloudflare D1 (`migrations/`) for accounts, ratings, and
  finished games.
- **Engine:** `src/engine/` - board, move generation, nerf rules, and the AI.
  Shared by the UI, the worker, and the optional self-hosted server
  (`server/index.ts`).

## Develop

```sh
npm install
npm run dev        # http://localhost:3000, with local D1/DO bindings proxied
```

## Build & validate

```sh
npm run lint                   # eslint
npx tsc --noEmit               # typecheck (app + worker + server)
npx opennextjs-cloudflare build  # production build + worker bundle
npx wrangler deploy --dry-run --outdir=.wrangler-dry-run  # validate worker config
```

## Deploy

Deploy from a machine that is logged in to wrangler:

```sh
npm run deploy
```

### Troubleshooting: `Could not resolve "./server-functions/default/handler.mjs"`

Wrangler was pointed at a stale or partially built `.open-next/` directory -
its `worker.js` exists but the `server-functions/` bundle next to it doesn't.
This happens when `wrangler deploy` (or `wrangler dev`) is run on its own
after an earlier OpenNext build was interrupted. The bundle must be rebuilt
first; `npm run deploy` and `npm run preview` always do this. To recover:

```sh
rm -rf .open-next
npm run deploy   # or: npx opennextjs-cloudflare build && npx wrangler deploy
```

---

Made with love <3
