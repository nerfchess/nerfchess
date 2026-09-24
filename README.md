# Nerf Chess

Chess with power-ups and secret handicaps, at [nerfchess.com](https://nerfchess.com). Next.js 16 on Cloudflare Workers (OpenNext), D1 for accounts and social data, one Durable Object (`worker.ts`) for live games, Postgres through Hyperdrive for the finished-game archive.

made with love <3

## Run it locally

Node 22 and npm. One command after cloning:

```sh
npm ci && npm run dev
```

Then open http://localhost:3000. There is nothing else to set up:

- The local D1 database is created by wrangler's platform proxy under `.wrangler/state` on the first request, and the schema is applied at runtime (`src/lib/server/schema.ts`).
- The Hyperdrive binding has a placeholder local connection string, so archive reads fall back to the D1 `games` table.
- No secrets are needed. Google sign-in, Turnstile, email and the house engine service are off or fail open without their secrets.
- `next dev` does not run the game-server Durable Object, so online games and the live lobby need `npm run preview` (a full OpenNext build served by wrangler) or production.

Claude Code on the web installs dependencies on its own: `.claude/settings.json` runs `.claude/hooks/session-start.sh`, which runs `npm ci` when `node_modules` is missing or older than the lockfile.

## Checks

| Command | What it runs | Needs |
|---|---|---|
| `npm run guard` | Every cheap offline guard (em dashes, sentence case, buttons, radius, motion gates, sound, SEO static, API units, email, and more), about 20 seconds. Run it before you push. | nothing |
| `npm run typecheck`, `npm run lint` | tsc and eslint over the repo | nothing |
| `npm run test:cls`, `npm run test:console` | Layout shift and console ratchets in Chromium | dev server on :3000 |
| `npm run test:headers` | Security and cache headers, and the custom background against the CSP | dev server on :3000 |
| `npm run test:e2e` | Playwright specs in `e2e/` | dev server, `npx playwright install chromium` |

CI (`.github/workflows/guards.yml`) runs typecheck, lint and `npm run guard` on every push and pull request. Seeded local accounts for browser checks: `npm run polish:seed` (see `docs/polish-pass/LEDGER.md`, HARNESS).

## Deploy

`npm run deploy` builds with OpenNext and deploys with wrangler. Plain-text vars live in `wrangler.jsonc` (a deploy rewrites them from that file); secrets are set with `wrangler secret put NAME`. The daily email job runs on the `0 13 * * *` cron and stays dormant until its vars and secrets are set (see the comments next to them in `wrangler.jsonc`).

## Docs

Design contracts: `docs/design-system.md`, `docs/DESIGN.md`, `docs/animation-design-brief.md`. Game server protocol: `docs/game-server-protocol.md`. Moderation: `docs/moderation.md`.
