# Polish pass ledger

Single source of truth for the full-site polish pass (brief: `docs/prompts/full-site-polish-pass.md`, sections 0 to 20).
Branch: `iluvnjz/admiring-archimedes-n69s43` (off master at a6911a9). A cold session should be able to resume from this file alone.

Statuses: `TODO`, `WIP`, `DONE` (with evidence link), `NO-CHANGE` (audited, evidence of the audit), `DROPPED` (with reason).
Evidence lives under `docs/polish-pass/evidence/` (keep it under 25 MB, no videos).
Slice codes (column "Slice") refer to the SLICES section: they say which work stream owns the fix.

## CONTEXT

Stack: Next.js 16.3.4 App Router on OpenNext Cloudflare. D1 (`DB`) for accounts and social data, Postgres via Hyperdrive for the finished-game archive (`pgAll`/`pgFirst` in `src/lib/server/pg.ts`, D1 fallback), one global Durable Object `GameServer` in `worker.ts` (about 9,000 lines) for live games, lobby, chat and presence. React 18.3.1, framer-motion 11, Tailwind. Box has 4 cores.

Binding contracts: `docs/design-system.md`, `docs/DESIGN.md`, `docs/animation-design-brief.md`, working rules at the top of `docs/ralph-backlog.md`. Summary: no redesign, no new colours, no shadows or glow, 7px box radius and 3px button radius, 13px text floor (12px allowed for captions and chips, 14px interactive on mobile), transform and opacity only, `--ease-*` and `--dur-1..3` tokens, motion gated by `html[data-anim]` and multiplied by `--fx-dur`, no em dashes.

Orientation notes (merged from the wave 0 scouts):

- Session. The session is the httpOnly cookie `dc_session` (`src/lib/server/auth.ts:7`, set at :258, SameSite=Lax, 90 day TTL, sha256-hashed tokens in D1 `sessions`). Nothing in `src` imports `next/headers`, so every page is static and every client component resolves the user after paint with its own `fetchMe()`/`ensureAccount()` (`src/lib/authClient.ts:70-106`). 29 files import authClient. `/api/auth/me` is force-dynamic, does a session lookup, a presence UPDATE and a rating subquery, and is called 3 to 14 times per page load in dev (5 on `/`, 6 on `/lobby` in production counting). Signed-out visitors get a guest account minted by `SiteHeader.ensureAccount` on any page (`POST /api/auth/guest`), so "signed out" behaves like "guest".
- Settings. No pre-paint script. `layout.tsx:203` hard-codes `data-theme="dark"`. `SettingsBootstrap.tsx:18-45` applies `applyUiPrefs` (`src/lib/settings.ts:601-664`) in an effect: theme, light scheme, accent, `data-anim`, `data-zen`, `--board-cap`, `--piece-fit`, `--fx-dur`, custom background. `pullSettingsFromServer` (settings.ts:575) can re-apply after a round trip. `data-anim="fast"` only clamps CSS transitions. `followSystemMotion` defaults off, so the OS reduced-motion flag is ignored unless the user opts in. A 20s low-time hold (`src/lib/lowTimeMotion.ts`) forces `data-anim=off` while either clock is under 20s.
- Fonts are fine (next/font Noto Sans + JetBrains Mono, size-adjusted fallbacks). Banners (ConnectionBanner, DraftNotice, GodPanelNotice, RenameBanner) are overlays and do not shift layout. Root font-size is 14px (globals.css:458), so rem utilities render at 87.5%.
- Suspense bailouts. Pages that call `useSearchParams` under a Suspense with a null or empty fallback prerender an empty body on hard load (login, lobby, play, tv, puzzles, tutorial/first-game, game). `loading.tsx` skeletons only show on client navigation.
- Metadata. Root metadata (`src/app/layout.tsx:42-95`) sets title template `%s · Nerf Chess`, `alternates.canonical: "/"`, a root openGraph with title and url, and a twitter block with title. Next 16 replaces openGraph and twitter wholesale per segment and attaches file-based OG images only at the owning segment, so many routes inherit the homepage canonical and og:url or lose og:image. Nested layouts with plain string titles cut off the template.
- Next 16 removed synchronous `params`. `/codex/hex/[id]` and `/codex/boon/[id]` still read it synchronously and 404 for every id (verified live).
- Mod. Console `src/app/mod/page.tsx` (hash sections), nav `src/components/mod/nav.ts`, sections `src/components/mod/*Section.tsx`. `requireMod` in `src/lib/server/mod.ts:43`. Only `applyModAction` writes `mod_actions`; everything else only calls `notifyModEvent` (a webhook that is a no-op unless `MOD_WEBHOOK_URL` is set). Some powers are keyed on literal usernames in `src/lib/godPanel.ts`.
- Counting. Four independent sources disagree (`/api/mod/overview`, `/api/mod/games/stats`, public `/api/stats`, `/api/analytics/summary`). The public "N players online" is `players.length + anonymous` from the DO lobby payload, padded with idle house personas and a synthetic 350-800 curve (`worker.ts:8554-8567, 8663-8667`, `bots.ts:1994-2021`). No online-now or peak figure exists for mods.
- Realtime. Default worker export (`worker.ts:9008-9034`) only has `fetch`: `/api/lobby` edge cache, `/socket/v1`, `/healthz`, `/arena/*` to the DO, rest to OpenNext. No `scheduled()` and no crons in `wrangler.jsonc`. `getCloudflareContext()` (db.ts, pg.ts, modWebhook.ts) only works inside a Next request, so a cron handler cannot reuse `getDb`/`pgAll` as written. WS frames have no size cap and only chat/schat/adjustOppClock are throttled.
- Engine. One rules engine in `src/engine` shared by client and server. Drift only comes from hidden information and the DO's private masking helpers. `.cjs` engine tests need `npm run server:build` first (creates `dist-server`).
- Animation. Tokens at `globals.css:226-231`. Gates at `globals.css:260-271` and `:2051`. framer-motion is not reached by the CSS gate and there is no `MotionConfig`. 5,578 `@keyframes` in `src` CSS (5,435 of them under `src/components/effects`). Tier C registry: `src/components/effects/sigPlugins.tsx` (1,841 plugin ids across 52 modules) plus 319 core `SIGNATURES` in `BoardEffects.tsx`. Draft odds are uniform within a tier, so a T8 buff card is offered about 15 to 20 times as often as a T3-T5 card.
- Email. Resend is already used by `src/app/api/suggest/route.ts:101-130` with the sandbox sender `onboarding@resend.dev` (only mails the account owner). `users.email` is optional and unverified (migration 0012). Guest-to-registered upgrades keep the guest `created_at`.
- Tooling. 55 `test:*` scripts in package.json still use `npx -y tsx`; run `./node_modules/.bin/tsx scripts/X.ts` directly. No CI (no `.github/`). `.gitignore:26-27` ignores `.claude/` and `CLAUDE.md`.

Key file map:

| Concern | Files |
|---|---|
| Root layout, metadata, JSON-LD | `src/app/layout.tsx` |
| Header and nav | `src/components/SiteHeader.tsx`, `SiteHeader.css`, `MobileNavMenu.tsx`, `HeaderSettingsMenu.tsx`, `src/app/zen.css` |
| Auth client and server | `src/lib/authClient.ts`, `src/lib/server/auth.ts`, `src/app/api/auth/*` |
| Settings | `src/components/SettingsBootstrap.tsx`, `src/lib/settings.ts`, `src/app/settings/_components/SettingsScreen.tsx`, `src/components/settings/*` |
| Core loop | `src/app/page.tsx`, `src/components/HeroTv.tsx`, `src/app/lobby/*`, `src/app/play/*`, `src/app/game/page.tsx`, `src/app/game/[id]/page.tsx`, `src/components/OnlineMatch.tsx`, `src/components/Board.tsx` |
| Draft | `src/components/DraftOverlay.tsx` + `.css`, `DraftVault.tsx` + `.css`, `src/components/draft/*`, `src/lib/draftOnline.ts` |
| Game end | `src/components/GameOver.tsx`, `ClockPill.tsx`, `src/lib/lowTimeMotion.ts` |
| Effects | `src/components/effects/*` (BoardEffects, sigVisuals, sigPlugins, vfx/, passive/, fruition/, clockraid/, board3d/) |
| Shared UI | `src/components/ui/*` (Button, Skeleton, RouteError, Breadcrumbs), `src/app/_components/NotFoundPanel.tsx`, `notFoundCopy.ts`, `src/lib/useModalChrome.ts`, `src/lib/useReducedMotion.ts` |
| Mod | `src/app/mod/*`, `src/components/mod/*`, `src/app/api/mod/*`, `src/lib/server/mod.ts`, `src/lib/godPanel.ts`, `src/lib/server/modWebhook.ts` |
| Stats | `src/app/api/stats/route.ts`, `src/app/api/analytics/summary/route.ts`, `src/lib/server/modGames.ts` |
| Realtime | `worker.ts`, `src/lib/multiplayer.ts`, `src/lib/server/gameServer.ts`, `arena-service/*`, `engine-service/*`, `server/index.ts` (legacy), `docs/game-server-protocol.md` |
| Engine | `src/engine/board.ts`, `game.ts`, `replay.ts`, `desync.ts`, `draft.ts` |
| SEO / OG | `src/lib/ogCard.tsx`, `src/app/opengraph-image.tsx`, `src/app/codex/*/[id]/opengraph-image.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/guide/shared.tsx`, `src/components/SocialsRow.tsx`, `src/components/SiteFooter.tsx` |
| Config | `wrangler.jsonc`, `next.config.mjs` (CSP and security headers), `public/_headers`, `open-next.config.ts`, `package.json` |
| Schema | `src/lib/server/schema.ts`, `migrations/`, `migrations-pg/` |

## HARNESS

Built in wave 0 (commits dc97ad0, 9a460cb, 8607337, e776041). All of it lives in `scripts/polish/` (run with `./node_modules/.bin/tsx`), plus the spec helper `e2e/polish/clsProbe.ts`. Everything talks to the shared dev server on http://localhost:3000 (override with `POLISH_BASE`; it waits up to 5 minutes and never starts a server). Chromium comes from `PLAYWRIGHT_BROWSERS_PATH` or `/opt/pw-browsers`. Every tool is a Playwright run: run one at a time.

Seeding: `npm run polish:seed` creates or reuses a guest, `polish_user`, `polish_mod` and `polish_admin` (password `POLISH_SEED_PASSWORD`, default `polish-local-only-7`, local only) and writes `.polish-auth/{guest,user,mod,admin}.json` (gitignored). Roles are set with `wrangler d1 execute nerfchess --local`. It refuses non-localhost and never uses `--remote`. Other tools seed on their own if a session file is missing. Specs: `test.use({ storageState: polishAuthState("user") })`.

Shared flags (matrix, cls, console, flash, axe): `--routes core|all|section4|<comma list>` ("game" is the local bot game), `--viewports 360x780,390x844,768x1024,1280x800,1920x1080|all`, `--themes dark,light|all`, `--anim full,fast,off,reduced|all`, `--auth signed-out,guest,user,mod,admin|all`, `--net normal,throttled,fast3g,cpu4|all` (throttled = Fast 3G + 4x CPU), `--no-warm`.

| Command | Kind | What it does |
|---|---|---|
| `npm run test:cls` | GUARD (ratchet) | Core routes x 390x844, 1280x800 x signed-out, user. Web-vitals CLS per cell against `scripts/polish/cls-thresholds.json` (ceilings only go down; target 0.01, tolerance 0.005). `--update` after a fix (use `--runs 2`). `--evidence NAME` saves to `docs/polish-pass/evidence/baseline/`. Always writes `e2e/__screens__/polish/cls-latest.json`. About 2 minutes. |
| `npm run test:console` | GUARD (ratchet) | Console errors, React warnings, page errors, failed requests, 4xx/5xx, against `scripts/polish/console-baseline.json`. Also records per-cell `/api` call counts. |
| `npm run test:flash` | report | CDP screencast pixel-diff of the frames at FCP, DCL, hydration and auth-settled against the settled page. `--png` writes strips. |
| `npm run polish:matrix` | report | Full state matrix (`--probes cls,console,flash`, `--screens`, `--flash-png`, `--label`). JSON to `docs/polish-pass/evidence/matrix/<label>.json`. |
| `npm run polish:strip` | report | Frame strip for one animation (`--click/--hover/--press/--trigger FILE`, `--duration`, `--interval`, `--clip`, one value per dimension). PNG strip plus JSON of rAF intervals, dropped frames, long frames and shifts. |
| `npm run polish:section4` | report | Throttled loads of the section 4 routes with every shift (selector, rects, time since hydration, last `/api` response) and per-frame header and main box watch. 6 to 20 minutes. |
| `npm run polish:axe` | report | axe-core WCAG A/AA scan per cell. |

Notes: in-page code is plain JS strings in `scripts/polish/lib/inpage.ts` (tsx keepNames would inject `__name`). The Layout Instability API barely scores the header chip swap (0.0014), so the section 4 guard must assert header box stability (`watchBoxes` in `scripts/polish/lib/probe.ts`), not only CLS. Measurements are against `next dev` (unminified, strict mode doubles effects and `/me` counts). Online `/game/[id]` cannot be measured locally because `next dev` does not run the DO. Adding `@axe-core/playwright` bumped transitive axe-core 4.12.1 to 4.13.0.

Baselines captured 2026-09-23:

- CLS, normal network (390x844 / 1280x800): `/` 0.0135-0.0144 / 0.0052-0.0067; `/lobby` 0.0174 signed-out, 0.005 user / 0.018-0.021; `/play` 0.053 / 0.017-0.019; `/profile` 0.085-0.087 / 0.032-0.036; `/codex` 0.045-0.046 / 0.021-0.022; bot game 0 / 0; `/leaderboard` 0.001-0.002 / 0.0014-0.0026; `/tv` 0.001-0.002 / 0.0014-0.0029. 17 of 32 cells above 0.01, recorded as ceilings. Evidence: `evidence/baseline/cls-core-2026-09-23.json`.
- Console: 36 known signatures (`evidence/baseline/console-core-2026-09-23.json`): (a) dev calls production `https://arena.nerfchess.com/lobby` (blocked in sandbox); (b) every signed-out route logs `GET /api/users/settings` 401 as a console error; (c) AudioContext autoplay warnings. No React warnings or page errors.
- Flash (390x844): light theme changes 99.3 to 100% of the viewport after hydration on all section 4 routes (server paints dark). Dark: 43.6% on `/`, 45% on `/lobby`, 22-24% on `/play`, about 8% on `/profile` and game. Evidence: `evidence/flash/baseline-2026-09-23/`.
- Section 4 sign-in bump (throttled, `evidence/section4-before/`): header account chip grows 175 to 310px and moves left 135px at 1280x800 (171 to 226px, 55px at 390x844, brand block shrinks 195 to 143px), 4 to 6s after hydration and 50-80ms after a later `/api/auth/me`. `/profile` swaps the site header for a profile skeleton header, then Achievements moves dy -117 (0.031) and the mobile profile plate dy +90 (0.0769). `/play` tour note shrinks 67 to 44px and moves the doors dy +58 (0.0518 mobile). `/lobby` live counter widens 191px and "Games to watch" shrinks 210 to 106px. `/` inserts a "0 players / 0 games" line (dy +60). Bot game: "Dealing the cards" 152x42 placeholder becomes a 588x434 draft panel (not scored by CLS). Throttled hydration lands at 8.2 to 15.2s.

Dev server (from 2026-09-23 03:10 UTC): the shared server on :3000 now runs `next dev --webpack` with `NEXT_DIST_DIR=.next-wp` under a supervisor (`DEV_WEBPACK=1 scripts/dev-supervisor.sh`). Turbopack was OOM-killed every few minutes (11-12.5 GB) compiling `/dev/plays` and the bot game; webpack holds about 5 GB. First compiles are slower (a heavy route can take 50 s once), so a browser tool should wait for the page rather than time out at a few seconds. A watchdog kills the server above 9.5 GB and the supervisor restarts it.

## INVENTORY

| Item | Count | How counted |
|---|---|---|
| Page routes (`page.tsx`) | 66 | `find src/app -name page.tsx \| wc -l` |
| API route files (`route.ts`) | 66 | `find src/app/api -name route.ts \| wc -l` |
| API route handlers in audited scope | about 73 | scouts api-a (41 handlers in 33 files) plus api-b (32 files) |
| `loading.tsx` / `error.tsx` / `not-found.tsx` | 32 / 23 / 5 | `find src/app -name ...` |
| Component files (`src/components/**/*.tsx`) | 211 | find |
| `@keyframes` in `src` CSS | 5,578 | grep; 5,435 under `src/components/effects`, 143 elsewhere (72 globals.css, 53 DraftOverlay.css, 17 DraftVault.css, 1 other) |
| Files with motion outside card effects | 105 | tier-a scout |
| framer-motion elements outside effects | 21 in 8 files (8 ungated) | tier-a scout |
| Card play registry | 1,841 plugin ids in 52 modules + 319 core SIGNATURES | tier-c scout |
| Retired card ids | 811 | `src/engine/retired.ts` |
| Live cards (non-retired buffs + nerfs) | 1,665 (1,423 + 242) | content scout |
| authClient importers | 29 | core-loop scout |
| WS client message types | 37 | realtime scout |
| `test:*` scripts / using `npx -y tsx` | 65 / 55 | package.json |
| D1 migrations | 43 (duplicate prefixes 0015, 0023, 0024) | ls migrations |
| Mod API route files / that mutate / that write the audit log | 16 / 9 / 1 | mod scout |
| JSON-LD emitting files | 6 | seo scout |
| OG image files / twitter-image files | 5 / 0 | seo scout |
| CI workflows / cron triggers / scheduled handlers | 0 / 0 / 0 | side-end scout |

## SLICES

File ownership for work waves. One slice owns a file for the whole wave. A slice that needs a change in a file it does not own writes a note in the owner's rows (or asks the integrator) instead of editing it. Heavy commands (tsc, eslint ., next build, Playwright, sims): at most two across the fleet at once; each agent lints and typechecks only files it touched.

| Slice | Scope | Owns (files) | Must not touch |
|---|---|---|---|
| A session + pre-paint | Section 4 root cause, pre-paint stamp, shared session store | `src/app/layout.tsx` (whole file in wave 1; SEO metadata edits wait for wave 2), `src/lib/authClient.ts`, new `src/lib/session/*` (SessionProvider, useSession), `src/components/SiteHeader.tsx` + `.css`, `MobileNavMenu.tsx`, `AchievementToast.tsx`, `SettingsBootstrap.tsx`, `src/lib/settings.ts`, `src/lib/modeState.ts`, `RailResizeHandle.tsx`, `HeaderSettingsMenu.tsx`, `src/app/zen.css`, `src/app/api/auth/me/route.ts`, new e2e section 4 spec | page files (tell route slices which `fetchMe` calls to swap for `useSession`) |
| B core routes | `/`, `/lobby`, `/play`, `/game`, `/game/[id]` | `src/app/page.tsx`, `src/components/HeroTv.tsx`, `src/app/lobby/*`, `src/app/play/*`, `src/app/game/page.tsx`, `src/app/game/[id]/*`, `src/app/game/loading.tsx`, `src/components/ui/Skeleton.tsx`, `src/components/QueueButton.tsx` (delete), `src/lib/lobbyClient.ts` | `OnlineMatch.tsx`, `Board.tsx` (slice J) |
| C account routes | `/login`, `/profile`, `/profile/edit`, `/u/[username]`, `/settings` | `src/app/login/*`, `src/app/profile/*`, `src/app/u/*`, `src/app/settings/*`, `src/components/profile/*`, `src/lib/useModalChrome.ts` callers `src/app/history/page.tsx` modal block and `src/components/clip/ClipModal.tsx`, `src/components/MobileBuffDrawer.tsx`, `src/components/mobileChrome.ts`, `src/components/draft/WaitingCornerNotice.tsx`, `src/components/draft/LockInCountdown.tsx` | `DraftOverlay.*` (slice J) |
| D social routes | community, clubs, inbox, friend, tournaments, tv, leaderboard pages | `src/app/{community,clubs,inbox,friend,tournaments,tv,leaderboard}/*` (pages, loading, error), `src/components/PlayerSearch.tsx`, `FriendsPanel.tsx`, `src/components/profile/FriendsModule.tsx` (coordinate with C), `ClubIcon`, `EmptyState` | API routes (slice F) |
| E content + SEO + OG | content routes, error boundaries, metadata helper, sitemap, robots, OG images, JSON-LD | `src/app/{codex,guide,tutorial,puzzles,analysis,history,updates,about,faq,contact,guidelines,privacy-policy,terms-of-service,achievements,stats}/*` (except the history modal block owned by C), `src/app/error.tsx`, `global-error.tsx`, `not-found.tsx`, `src/app/_components/*`, `src/app/sitemap.ts`, `robots.ts`, `src/app/opengraph-image.tsx`, `src/lib/ogCard.tsx`, new `src/lib/seo.ts`, new `src/lib/team.ts`, `src/components/SiteFooter.tsx`, `SocialsRow.tsx`, `src/components/codex/*`, `src/components/InfoPageLayout.tsx`, `src/lib/cardCodex.ts` | `layout.tsx` in wave 1 |
| F API + security | API routes outside mod, shared request guards, text sanitizer | `src/app/api/**` except `api/mod`, `api/stats`, `api/analytics`; `src/lib/server/{auth,social,db,turnstile}.ts`, new `src/lib/server/request.ts` (readJsonObject, assertSameOrigin, rateLimit), new `src/lib/safeNext.ts`, new `src/lib/textInput.ts`, `src/lib/profanity.ts`, `src/lib/avatars.ts`, `src/lib/server/tournamentEngine.ts` | `worker.ts` |
| G mod + counting | Sections 15 and 16 | `src/app/mod/*`, `src/components/mod/*`, `src/app/api/mod/*`, `src/app/api/stats/route.ts`, `src/app/api/analytics/*`, `src/lib/server/{mod,modGames,modWebhook}.ts`, `src/lib/godPanel.ts`, new `src/lib/server/metrics.ts`, new migrations (number from 0041) plus `schema.ts` mirror blocks it adds | `worker.ts` (ask H for the real online count) |
| H realtime + engine | DO, services, protocol doc, engine rules, client socket | `worker.ts`, `src/lib/multiplayer.ts`, `src/lib/server/gameServer.ts`, `src/lib/server/bots.ts`, `src/lib/server/clockPause.ts`, `src/lib/server/games.ts`, `arena-service/*`, `engine-service/*`, `server/*`, `docs/game-server-protocol.md`, `src/engine/*`, new parity fuzz script | UI components |
| I motion Tier A | Chrome motion primitives and guards | motion sections of `src/app/globals.css` (whole file in wave 1), `tailwind.config.ts`, new `src/lib/motion.ts`, `DraftNotice.tsx`, `GodPanelNotice.tsx`, `src/components/dock/*`, `src/components/tutorial/*`, `EvalBar.tsx`, `PresenceBadge.tsx`, `SpectatorPill.tsx`, `src/components/settings/rows.tsx` chevron only, `scripts/check-anim-props.ts`, `scripts/check-reduced-motion.cjs` | components owned by other slices (send the class name to use) |
| J game moments Tier B | Board, match, draft, game over | `src/components/Board.tsx`, `OnlineMatch.tsx`, `GameOver.tsx`, `ClockPill.tsx`, `BoardSplash.tsx`, `src/lib/lowTimeMotion.ts`, `src/lib/useReducedMotion.ts`, `src/components/useMotionTempo.ts`, `DraftOverlay.tsx` + `.css`, `DraftVault.tsx` + `.css`, `src/components/effects/useSignatureQueue.ts`, `fxZones.ts`, `cardEntrance.*`, `UseSpectacle.*`, `src/lib/sounds.ts` | Tier C play modules |
| K card effects Tier C | Play modules, registry guards, review galleries | `src/components/effects/**` except files owned by J, `scripts/audit-animations.ts`, `scripts/audit-scene-complexity.ts`, `scripts/check-vfx-coverage.cjs`, `scripts/audit-bespoke-coverage.cjs`, `docs/animation-registry.json`, `src/app/dev/plays/*`, `src/app/dev/lab/*` | Board.tsx |
| L side end + email | Config, CI, DX, email plumbing, daily cron | `next.config.mjs`, `public/_headers`, `wrangler.jsonc`, `package.json` scripts, `.gitignore`, `README.md`, `.github/*`, `.claude/*`, new `src/lib/server/email.ts`, the daily cron route | `worker.ts` default export (ask H to add `scheduled()`); `api/suggest` (slice F switches it to email.ts) |
| HB house bots | Bot quality (owner request) | `src/lib/server/bots.ts`, `src/engine/ai.ts`, `engine-service/*`, `arena-service/*`, `docs/house-bots.md`, house-bot and search scripts | `worker.ts` (REQUESTS to H) |
| TC0 gallery + strips | Tier C step 1 (F228) | `src/app/dev/plays/*`, `src/app/dev/lab/*`, new `scripts/polish/card-strip.ts` | play modules |
| TC-god | godPlays, F221, F227 | `src/components/effects/godPlays.tsx` + `.css` | other play modules |
| TC-fantasy | fantasyPlays mythic ladder, F223 | `src/components/effects/fantasyPlays.tsx` + `.css` | other play modules |
| TC-great | greatPlays, F222 | `src/components/effects/greatPlays.tsx` + `.css` | other play modules |
| TC-core | core SIGNATURES and sigVisuals (live T7-8 first) | `src/components/effects/BoardEffects.tsx` (signature scenes only), `sigVisuals.tsx`, `effects.css` | useSignatureQueue, fxZones, cardEntrance, UseSpectacle (slice J) |
| TC-boon-curse | boonPlays and cursePlays, F226 | `boonPlays.*`, `cursePlays.*` | other play modules |
| TC-basic | basicPlays T1-T6 live cards, F225 | `basicPlays.*` | other play modules |
| TC-g | high-frequency members of g01..g44 (g01, g09, g24, g28 first, then by tier) | `g01*`..`g44*` play modules, `sigPlugins.tsx` registration only | other play modules |

## ROUTES

One row per `page.tsx` (66). Dimensions per brief section 5: layout (5.1 stability), loading (5.2), states (5.3 empty, error, edge), interaction (5.4), a11y (5.5), responsive (5.6), perf (5.7), copy (5.8). Every cell starts TODO; a cell becomes DONE or NO-CHANGE only with evidence captured in the browser. Root boundaries (`error.tsx`, `global-error.tsx`, `not-found.tsx`) are tracked in F033 and F040. Dev routes are gated in production and only get a states and a11y smoke check.

| Route | Slice | layout | loading | states | interaction | a11y | responsive | perf | copy | Findings |
|---|---|---|---|---|---|---|---|---|---|---|
| `/` | B | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F001 F003 F004 F009 F114 F160 F161 F166 |
| `/lobby` | B | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F001 F005 F019 F145 F151 |
| `/play` | B | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F006 F019 F154 |
| `/game (vs bot)` | B | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F008 F020 F112 F185 |
| `/game/[id]` | B | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F007 F008 F029 F131 F161 F241 |
| `/login` | C | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F016 F019 F041 F144 F145 |
| `/profile` | C | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F021 F027 |
| `/profile/edit` | C | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F012 F136 F137 F144 F164 |
| `/u/[username]` | C | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F011 F021 F030 F034 F035 F138 F145 F146 F147 F162 |
| `/settings/(all)` | C | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F013 |
| `/settings/[section]` | C | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F013 |
| `/community` | D | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F014 F135 F151 F160 F169 F192 |
| `/clubs` | D | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F026 F038 F155 F192 |
| `/clubs/[slug]` | D | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F014 F022 F031 F032 F036 F170 F179 F180 |
| `/inbox` | D | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F014 F026 |
| `/inbox/[username]` | D | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F018 F022 F032 F072 F155 F182 |
| `/friend` | D | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F037 F239 |
| `/tournaments` | D | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F110 F155 F156 F176 F181 |
| `/tournaments/[id]` | D | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F014 F022 F031 F134 F167 F168 F171 |
| `/tv` | D | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F019 F023 F130 F133 F139 F159 |
| `/leaderboard` | D | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F014 F025 F151 F162 F200 |
| `/codex` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F183 F145 F173 F231 F233 F236 |
| `/codex/buff/[id]` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F174 F236 F249 |
| `/codex/nerf/[id]` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F174 F236 F249 |
| `/codex/hex/[id]` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F028 |
| `/codex/boon/[id]` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F028 |
| `/codex/build` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F231 |
| `/codex/suggest` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F137 F184 F236 |
| `/guide` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F232 F244 |
| `/guide/how-to-play` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F172 F232 F244 |
| `/guide/nerf-mode` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F232 F244 |
| `/guide/buff-mode` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F232 F244 |
| `/guide/chess-with-power-ups` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F232 F244 |
| `/guide/capture-the-king` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F232 F244 |
| `/guide/chess-roguelike` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F232 F244 |
| `/guide/chess-variants` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F232 F244 |
| `/guide/glossary` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F232 F244 |
| `/tutorial` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F172 F245 |
| `/tutorial/walkthrough` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F039 |
| `/tutorial/first-game` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F019 |
| `/puzzles` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F015 F019 |
| `/puzzles/[id]` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F015 F040 F237 |
| `/analysis` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F017 F191 |
| `/history` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F024 F138 F177 |
| `/history/[id]` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F024 F040 F132 |
| `/updates` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F246 |
| `/about` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F165 F244 |
| `/faq` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | - (FAQPage JSON-LD matches the visible Q and A) |
| `/contact` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F165 F166 F231 F235 |
| `/guidelines` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F231 F235 F247 |
| `/privacy-policy` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F175 F231 F235 |
| `/terms-of-service` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F231 F235 F247 |
| `/achievements` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F152 F191 |
| `/stats` | E | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F033 |
| `/mod` | G | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F115 F121 F122 F126 F127 F200 |
| `/mod/cards` | G | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F121 F124 |
| `/mod/house` | G | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F121 F129 |
| `/mod/stats` | G | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F118 |
| `/mod/stats/all` | G | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F118 |
| `/mod/stats/humans` | G | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F118 |
| `/dev/plays` | K | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F228 |
| `/dev/lab` | K | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | F228 |
| `/dev/effects` | K | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | - |
| `/dev/fruition` | K | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | - |
| `/dev/chest` | J | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | - |
| `/dev/draft` | J | TODO | TODO | TODO | TODO | TODO | TODO | TODO | TODO | - |

## ANIMATIONS

Every row is reviewed by hand with a frame strip (`npm run polish:strip`) at `--anim full,fast,off` and, for effects, at `--fx-dur` 0.5, 1 and 2, before it can be DONE. Slice I owns Tier A, J owns Tier B, K owns Tier C.

### Tier A: product chrome

| Family | Files | Current state (wave 0 audit) | Findings | Status |
|---|---|---|---|---|
| Route and page transitions | `src/app` (no template.tsx, no view transitions) | None; pages swap instantly behind loading.tsx | - | TODO |
| Header nav links and dropdown | `SiteHeader.tsx:327`, `SiteHeader.css:28`, `globals.css:1368` | Raw 0.15s/160ms ease; dropdown pops by design; shadow-xl | F161, F188, F196 | TODO |
| Header search panel | `globals.css:1336-1359` | Animates in (search-fade, clip-path search-grow), no exit, raw durations | F191, F196 | TODO |
| Mobile nav menu | `MobileNavMenu.tsx:185-209` | No motion, instant backdrop, shadow-xl | F140, F161, F196 | TODO |
| Popovers (HeaderSettingsMenu, EffectPopover, GlossaryTerm, PlayerSearch) | listed files | All instant; inconsistent with search panel | F196 | TODO |
| Toggle switches (3 implementations) | `HeaderSettingsMenu.tsx:111`, `SettingsPanel.css:31-65`, `profile/edit/page.tsx:595` | Different timings; one animates `left` with a shadow | F164, F198 | TODO |
| Modals and dialogs | SettingsPanel, ShortcutsDialog, targeting, FilterSheet, ModShell, OpponentDraftViewer, GameOver, ClipModal | Mostly static mounts; OpponentDraftViewer and GameOver framer; scrim alphas vary 40 to 80 | F138, F186 | TODO |
| Drawers | `MobileBuffDrawer.tsx:111` | Height transition (layout property), ungated | F142, F191 | TODO |
| Toasts and notices (6 patterns) | AchievementToast, OnlineMatch toasts, DraftNotice, GodPanelNotice, WaitingCornerNotice, DraftRevealBanner, ConnectionBanner | No shared primitive, missing exits, ungated framer | F144, F186, F195 | TODO |
| Skeleton shimmer and loaders | `globals.css:1976-2025`, `ui/Skeleton.tsx`, animate-pulse sites | Two idioms, mixed gating, no show-delay | F026 | TODO |
| Button and card hover/press | `globals.css:904-971,:561,:2114,:1155`, `QueueButton.tsx`, BuffCard, NerfCard | Filter and box-shadow transitions; transition-all on glyphs and arrows | F192, F193 | TODO |
| Tab indicators | CategoryTabs, BuffDock, lobby, u/[username], CodexBrowser, SettingsPanel.css | Colour and border swaps only; consistent | F145 | TODO |
| Disclosure chevrons (about 12) | see F199 | Hand-rolled, varied durations | F199 | TODO |
| Queue and matchmaking search | `QueueButton.tsx` (dead), `lobby/QuickMatch.tsx`, `globals.css:1214` | rune-loader spinner; cta-shine infinite sweep | F165, F201 | TODO |
| Draft overlay chrome (panel, minimized panel, timer, prep chip, bank, pull) | `DraftOverlay.tsx`, `DraftOverlay.css` | Deal and flip gated and tempo-scaled; panels ungated; box-shadow keyframes; infinite loops | F186, F188, F193, F201 | TODO |
| Draft vault | `DraftVault.tsx`, `DraftVault.css` | 17 keyframes, idle loops gated under off, 920ms opening not tempo-scaled by design | F188, F201 | TODO |
| Dock rows and pocket | `dock/DockRow.tsx`, `Pocket.tsx`, `dock/bits.tsx`, DraftOverlay.css dock rules | Stacked entrances, cascade drops pocket flash, off-token curve | F189, F193, F194 | TODO |
| Settings panel | `SettingsPanel.tsx`, `SettingsPanel.css`, `settings/rows.tsx` | Partly on tokens, gated | F198, F199 | TODO |
| Homepage hero board and TV | `HeroTv.tsx`, `HeroBoard.tsx` (static by design), `.dot-live` | Hover colours only plus live ping | F003, F197 | TODO |
| Tutorial and guide steps | `tutorial/TourCoachOverlay.tsx:217,:294` | Spotlight animates top/left/width/height with transition-all, OS gate, glow | F190, F191, F192 | TODO |
| Puzzle success and fail | `puzzles/PuzzleRunner.tsx:76,:438,:471`, `globals.css:2647-2665` | Model implementation (tokens, gated) | - | TODO (candidate NO-CHANGE) |
| Chat message arrival | `ChatPanel.tsx:213`, `inbox/[username]/page.tsx:115` | No arrival animation, non-smooth scroll | F018 | TODO |
| Presence, spectator and live pills | PresenceBadge, SpectatorPill, lobby, tournaments, tv, community, FriendGame, AdminGodPanel, CurrentGameCard | Three live-dot idioms | F197 | TODO |
| Smooth scroll jumps | leaderboard:111, lobby:542, mod:86 | Ignore data-anim | F200 | TODO |
| Progress and eval bars | `EvalBar.tsx`, achievements, analysis | Width/height transitions | F191 | TODO |
| Dead motion CSS | `globals.css` blocks, tailwind rise/seal | Unused | F202 | TODO |

### Tier B: game moments

| Moment | Files | Current state (wave 0 audit) | Findings | Status |
|---|---|---|---|---|
| Piece move slide | `Board.tsx:918-995,:3156-3204`, `settings.ts:277` | FLIP transform, 100ms default, hard-coded curve; teleports under the 20s hold | F213 | TODO |
| Capture | `Board.tsx:948-995`, `sounds.ts:417` | Victim vanishes on commit, capturer glides | F213 | TODO |
| Check | `globals.css:1416-1443`, `Board.tsx:1744` | Static burst plus king glow; dead pulse CSS; chime +80ms fixed | F213, F215 | TODO |
| Checkmate / game-end hand-off | `OnlineMatch.tsx:1231-1255,:3818`, `game/page.tsx:2567` | No settle hold, chimes overlap | F205 | TODO |
| Draw, resign, abort | `GameOver.tsx:822-863`, `sounds.ts:611` | GameOver tone only | F085 | TODO |
| Timeout / flag | `ClockPill.tsx`, `worker.ts:8718` | No client flag visual; low-time hold active at end | F204 | TODO |
| Promotion picker | `Board.tsx:5460-5520` | Framer fade not gated | F186 | TODO |
| Premoves | `Board.tsx:2366`, `OnlineMatch.tsx:926` | Instant tint, no false explosions | - | TODO |
| Arrows and highlights | `Board.tsx:844-900,:4404` | Static; knight L-arrow TODO (known, Board.tsx:881) | - | TODO |
| BoardSplash | `BoardSplash.tsx`, `globals.css:1290-1330` | 2s pop, glow, not fx-dur scaled, key collision | F207, F214 | TODO |
| ClockPill low time | `ClockPill.tsx`, `lowTimeMotion.ts`, `clockFormat.ts:55` | Colour ramp scaled to time control; separator blink killed by the hold | F210, F212, F220 | TODO |
| EvalBar / EvalStrip | `EvalBar.tsx:411-481` | Height/width transitions | F191 | TODO |
| MoveReview / MoveList | `MoveReview.tsx`, `MoveList.tsx:88` | Nothing Tier B specific | - | TODO (candidate NO-CHANGE) |
| GameOver choreography | `GameOver.tsx:352,:794-821,:1020-1105`, `globals.css:1092-1143,:2524-2580` | Three acts by --beat; skipped after low-time endings | F204, F203, F218 | TODO |
| Rating reveal / RatingChart | `GameOver.tsx:655-675`, `RatingChart.tsx:532` | Count-up re-renders the panel; chart tooltip uses OS query | F111, F190 | TODO |
| Draft opening (vault) | `DraftOverlay.tsx:499-537,:1018`, `DraftVault.tsx:41`, `worker.ts:856` | Hold 640ms, tear 760ms, deal; chime on the tell | F208, F217 | TODO |
| Draft pick (select, confirm, flight) | `DraftOverlay.tsx:1101-1190,:1649-1690` | Two-step, 550ms flight, commit at 78% | F157, F217 | TODO |
| Card play wrapper (CastSpectacle) | `BoardEffects.tsx:2637-3155`, `Board.tsx:2898-3009,:5187` | Tiers grand to apex, sleek dead, raw-ms delays, board dim | F209, F211, F216 | TODO |
| UseSpectacle | `effects/UseSpectacle.tsx`, `useSpectacle.css` | fx-dur scaled, keyed | - | TODO |
| CardEntrance / CategoryArrival | `effects/cardEntrance.tsx:53`, `cardEntrance.css` | Durations scaled, delays raw ms (88 sites) | F209 | TODO |
| Scene staging | `effects/stage.tsx`, `geometry.ts` | Pure geometry, no defects found | - | TODO (candidate NO-CHANGE) |
| fxZones persistent marks | `effects/fxZones.ts`, `game/page.tsx:1658`, `game/[id]/page.tsx:887` | Unmemoized on two surfaces; stun replay risk | F112, F219 | TODO |
| Signature queue | `effects/useSignatureQueue.ts:48` | Fixed 2600ms, not scaled or collapsed when off | F208 | TODO |
| Sound sync guard | `scripts/check-sound-coverage.cjs`, `sounds.ts` | Checks coverage only, not timing | F209 (proposal P-soundsync) | TODO |
| Board shake | `Board.tsx:2591-2611,:2945` | Transform-only, tier 8+ gated | - | TODO |
| Takeback / resync diff | `Board.tsx:1288,:1378` | Misclassified as conversion | F206 | TODO |

### Tier C: card play effects (families, ranked)

Ranking is frequency first (T8 buff card offered about 0.36 times per game, T7 about 0.16, T1 about 0.066, T3-T5 about 0.02; uniform within tier), then weakness from code reading. Every weakness claim needs a strip (F228 must land first). Registry: 1,841 plugin ids in 52 modules plus 319 core SIGNATURES.

| Rank | Family | Files | Cards | Why ranked here | Findings | Status |
|---|---|---|---|---|---|---|
| 1 | Tier weight tables (cross-cutting) | `godPlays.tsx:568`, `greatPlays.tsx:703` | about 50 mis-weighted | Fixes weight on the most-seen cards at once; must precede per-card work | F221, F222 | TODO |
| 2 | godPlays (tier 7-10 band) | `godPlays.tsx`, `.css` | 68 (GodDescent shared by 9, GorgonIdol 6, CelestialRing 6) | Highest-frequency cards on shared templates | F221, F227 | TODO |
| 3 | fantasyPlays mythic ladder | `fantasyPlays.tsx:1125,:1216,:1309` | 24 fm_* on 3 templates (T1 to T8) | T8 cards play their T1 siblings' scene | F223 | TODO |
| 4 | greatPlays (tier 5-6 band) | `greatPlays.tsx`, `.css` | 115 | 38 wrong weights; T7-8 cards need god-scale scenes | F222, F227 | TODO |
| 5 | Core SIGNATURES + sigVisuals | `BoardEffects.tsx`, `sigVisuals.tsx` | 319 (46 live T7-8) | Largest high-frequency group; unjudged without strips | - | TODO |
| 6 | boonPlays / cursePlays | `boonPlays.tsx`, `cursePlays.tsx` | 72 / 67 | Three T7 cards on templates against the module contract | F226 | TODO |
| 7 | basicPlays (tier 1-4 band) | `basicPlays.tsx`, `.css` | 296 (22 live T5-6) | T1 cards seen every game round 1; no tier scaling | F225 | TODO |
| 8 | g01..g44 bespoke batches | `g01HourglassPlays.tsx` ... `g44SpacePlays.tsx` | 1,049 in 38 modules | Richest per-card art; high-frequency members g01 (21 T7-8), g09 (16), g28 (8), g24 (8) | - | TODO |
| 9 | passive/ nerf compositions | `effects/passive/*` | 368 nerf entries | Guarded by test:passive-registry | - | TODO |
| 10 | fruition/ and clockraid/ | `effects/fruition/*`, `effects/clockraid/*` | fx-event one-shots | Box-shadow frames grandfathered | F193 | TODO |
| 11 | small plugin modules (casino, funny, gambling, meme, prank, stub, creator, personal) | listed files | 102 | Few at T7-8 | - | TODO |
| 12 | vfx/ canvas engine and impact/ vocabulary | `effects/vfx/*`, `effects/impact/*` | shared | Scales stagger by fxDurationScale (DOM layers do not, F209) | F209 | TODO |
| 13 | board3d/ | `effects/board3d/*` | gated WebGL layer | Frame governor present | - | TODO |

Tier C per-card worklist (30 weakest high-frequency cards, from the tier-c scout; each needs a strip before and after):
T8: 1 fm_boon_worldheart, 2 fm_eclipse_crown, 3 fm_hex_winter_court, 4 atomic_captures, 5 world_lock, 6 celestial_alignment, 7 walnut_court, 8 obsidian_bastions, 9 sealed_ramparts, 10 sacked_capital, 11 blighted_furrows, 12 mass_mind_control, 13 transcendence.
T7: 14 fm_sunforge, 15 fm_hex_kings_moat, 16 fm_boon_royal_road, 17 twin_queens, 18 threads_of_fate, 19 bw3_vantage_point, 20 bw3_home_guard, 21 hw3_doomed_vow, 22 court_in_exile, 23 stone_prelates, 24 total_whiteout, 25 wild_hunt, 26 ww_iron_bulwark, 27 buff_siphon, 28 resurrect_queen, 29 draft_tyranny, 30 checkmate_denial.
Next in line: other GodDescent T7 cards (full_pardon, throne_and_silence, wa_dominate_major), cockatrice_gaze and chisel_curse (GorgonIdol), molten_heart and unshackled_wrath (TitanRise), withered_hands (ReaperSweep), then the 46 core T7-8 cards, then basicPlays T1 cards (22 buff, 13 hex).

## BACKEND

One row per API route group or service concern. "Findings" lists the ledger ids; "Status" is the audit status of the group.

| Group / concern | Files | Auth and limits today | Findings | Slice | Status |
|---|---|---|---|---|---|
| auth: login, register, guest, logout | `api/auth/{login,register,guest,logout}` | Login throttle per user (10) and IP (100); guest 30/15min/IP; register Turnstile fail-open | F043, F046, F047, F062, F063, F064, F076, F099 | F | TODO |
| auth: me | `api/auth/me` | Session lookup, presence UPDATE every 5 min, rating subquery; 5-14 calls per load | F001, F125 | A | TODO |
| auth: profile writes (avatar, bio, flair, rename) | `api/auth/{avatar,bio,flair,rename}` | requireUser; bio censored | F047, F048 | F | TODO |
| auth: Google OAuth | `api/auth/google`, `api/auth/google/callback` | State cookie | F042, F099 | F | TODO |
| users: profile, friends, games, stats, achievements, search, settings | `api/users/*` | Public GETs, uncached; settings 8KB LWW | F034, F077, F094, F103, F105, F119 | F | TODO |
| friends, messages, notifications | `api/friends`, `api/messages/*`, `api/notifications` | Messages mute check and 20/min; friends none | F058, F072, F075, F108 | F | TODO |
| community | `api/community/{active,recent}` | Public, uncached | F105, F119 | F | TODO |
| clubs | `api/clubs/*` (list, slug, membership, posts) | requireUser; posts mute check | F038, F061, F104 | F | TODO |
| report, suggest, feedback | `api/report`, `api/suggest`, `api/buff-feedback`, `api/nerf-feedback` | Report 5/day; suggest 12/day for users only | F057, F100, F109 | F | TODO |
| games, history | `api/games/{bot,[id],recent}`, `api/history` | Archive reads public; bot counter open | F070, F073, F105 | F | TODO |
| stats and analytics | `api/stats`, `api/analytics/summary` | stats public uncached; analytics bearer key | F102, F117, F118 | G | TODO |
| leaderboard | `api/leaderboard` | Public, 250 rows | F106 | F | TODO |
| tournaments | `api/tournaments/*`, `src/lib/server/tournamentEngine.ts` | Any session creates; engine advances on GET | F060, F074, F078, F107 | F | TODO |
| challenges | `api/challenges/*` | No limit | F059, F096 | F | TODO |
| arena ingest | `api/arena/end` | Bearer, timing-safe | F097 | F | TODO |
| cards | `api/cards`, `api/cards/insights` | Cached (max-age 60, s-maxage 3600) | F048 | F | TODO |
| desync, tv-telemetry | `api/desync`, `api/tv-telemetry` | Unauthenticated log sinks | F066, F093 | F | TODO |
| lobby (dev shim) | `api/lobby` | Dev only; prod served by worker edge cache | - | H | TODO |
| mod API (16 files) | `api/mod/*` | requireMod except ratings (username) and house/personas (mod or username) | F045, F115, F116, F120-F124, F126-F129 | G | TODO |
| CSRF and request hygiene (cross-cutting) | all cookie POSTs | SameSite=Lax only | F046, F047 | F | TODO |
| Caching headers (cross-cutting) | all public GETs | Only cards set cache headers | F105, F113 | F + L | TODO |
| Sessions and schema indexes | `schema.ts`, `migrations/` | No sessions(expires_at), reports(reporter), users(created_at) indexes | F095, F101, F109, F125 | F + G | TODO |
| GameServer DO: socket router | `worker.ts:1726-1810` | Origin check at upgrade; no frame cap or rate limit | F067, F068, F090 | H | TODO |
| GameServer DO: reconnect, tabs, reclaim | `worker.ts:2138,:3593`, `multiplayer.ts:881` | Seat token only | F082, F084 | H | TODO |
| GameServer DO: clocks and time controls | `worker.ts:3123-3180,:3697` | Human clocks run while disconnected; house pause bounded | F078, F079, F088 | H | TODO |
| GameServer DO: chat and spectator chat | `worker.ts:7091,:7137` | 500ms per socket, profanity, shadow mute | F052, F053, F069, F081, F083 | H | TODO |
| GameServer DO: rated custom games, takeback | `worker.ts:3477,:3748` | - | F080, F086 | H | TODO |
| GameServer DO: presence and online count | `worker.ts:8450-8667`, `bots.ts:1994` | Padded public count | F114, F125 | H + G | TODO |
| GameServer DO: /healthz, headers | `worker.ts:1515-1633,:9008-9034` | Public diagnostics with stack | F050, F056 | H | TODO |
| Engine rules parity | `src/engine/*`, `src/lib/draftOnline.ts` | Shared engine; masking private to DO | F087, F089 (proposals P-fuzz, P-replica) | H | TODO |
| engine-service, arena-service | `engine-service/server.ts`, `arena-service/*` | Bearer, plain compare | F051, F071, F255 | H | TODO |
| Cron and daily email | `wrangler.jsonc`, `worker.ts` default export | No crons, no scheduled() | F098, F099, F100 (addition A-email) | L + H | TODO |
| Security headers and CSP | `next.config.mjs:47-69` | CSP, HSTS preload, nosniff | F044, F055 | L | TODO |

## FINDINGS

Every scout finding, deduplicated: 256 findings (critical 1, high 28, medium 111, low 116). Siblings of one class are grouped under a class heading, and a finding that several scouts reported is listed once with every location. "unverified" means the scout reasoned from code and the fixer must reproduce it first. Severity counts are in the SESSION LOG. All rows start `TODO`.

Columns: ID, severity, title, where (file:line, siblings), suggested fix, slice, status, fix commit.

### Layout stability and late state (brief 4, 5.1)

| ID | Sev | Title | Where | Suggested fix | Slice | Status | Commit |
|---|---|---|---|---|---|---|---|
| F001 | high | Post-sign-in bump root cause: nothing on the server knows the session, and every consumer resolves it separately after paint (header chip grows 175 to 310px and moves 135px, measured) | `src/components/SiteHeader.tsx:145` (placeholder :520, ensureAccount :180); other consumers `MobileNavMenu.tsx:96`, `page.tsx:153,:513`, `lobby/page.tsx:144,:158`, `lobby/QuickMatch.tsx:145`, `AchievementToast.tsx:88` | One session source: SessionProvider + useSession, one in-flight promise, remove per-component fetchMe. Server-resolved session or a non-httpOnly display cookie stamped pre-paint (owner question Q1). Add the section 4 e2e spec asserting header box stability, not only CLS | A | TODO | |
| F002 | high | Theme, zen, data-anim, board cap and other prefs are applied after hydration with no pre-paint script (light theme: 99-100% of viewport repaints, measured) | `src/components/SettingsBootstrap.tsx:18`, `src/lib/settings.ts:601-664`, `layout.tsx:203`; server pull `settings.ts:575` | Synchronous inline head script sharing one pure computeHtmlStamp() with applyUiPrefs; stamps data-theme, data-light, color-scheme, data-anim, data-zen, --board-cap, --piece-fit, --fx-dur, --match-rail-w, rail-collapsed, last mode, tour flag. suppressHydrationWarning on html | A | TODO | |
| F003 | high | HeroTv swaps three layouts with the board at different heights, moving the phone CTAs | `src/components/HeroTv.tsx:76` (replay :137, live :173) | Same frame in all three modes: identical fixed rows above and below the board; only content changes | B | TODO | |
| F004 | medium | Home right column inserts LiveNowStrip, ReturnToGameBanner and HeroRatings after mount (measured dy +60); CardOfTheDay skeleton mismatches; two separate 10s lobby polls | `src/app/page.tsx:119` (LiveNow :121, Return :197, HeroRatings :147, CardOfTheDay :413, BuildVersion :509), `src/lib/lobbyClient.ts:20,59` | Reserve LiveNowStrip at final height, place ReturnToGame where it cannot move content, source ratings from the session, match the CardOfTheDay skeleton, share one lobby poll | B | TODO | |
| F005 | medium | Lobby inserts error alert, sign-in nudge, HallStats and QuickMatch guest nudge after data resolves; ?tab applied in a microtask (measured: Games to watch 210 to 106px) | `src/app/lobby/page.tsx:363` (:712, :353, :114), `lobby/QuickMatch.tsx:304` | Error as overlay or reserved slot; user state from session; init tab from searchParams in useState | B | TODO | |
| F006 | medium | /play tour nudge and saved mode flip after mount (measured 0.0518 on mobile) | `src/app/play/page.tsx:134` (:76-92), `src/lib/modeState.ts:47` | Pre-paint flags for tutorial-done and last mode (F002 script), or reserve the slot | B | TODO | |
| F007 | medium | Game loading skeleton does not match OnlineMatch geometry; slow-connect banner in flow; SkeletonHeader padding differs from SiteHeader | `src/app/game/[id]/page.tsx:490` (:463, :496), `src/components/ui/Skeleton.tsx:17` | Player-path skeleton built from matchLayout class strings; slow note as overlay; SkeletonHeader reuses header padding and slots | B | TODO | |
| F008 | medium | Rail width and rail-collapsed read from localStorage after mount, resizing board and rail | `src/components/RailResizeHandle.tsx:20`, `OnlineMatch.tsx:396` | Stamp --match-rail-w and data-rail-collapsed pre-paint; init state from stamp | A | TODO | |
| F009 | medium | No scrollbar-gutter: centred layouts shift 5px when async content makes the page scroll (unverified) | `src/app/globals.css:8` | `html { scrollbar-gutter: stable; }` and check fixed full-width bars | I | TODO | |
| F010 | medium | No shared auth store: header shows the new guest while mobile menu says Sign in, toast never polls, QuickMatch caches null | `src/lib/authClient.ts:91`, `MobileNavMenu.tsx:48,:212` | Same fix as F001 | A | TODO | |
| F011 | medium | Profile header actions mount after a sequential fetchMe and wrap onto a new row on phones | `src/app/u/[username]/page.tsx:737` (:198, :430) | Read session from the shared store; fetch in parallel; do not render profile until both resolve | C | TODO | |
| F012 | medium | /profile/edit back button mounts late (h1 jumps 56px); a text "Loading..." plate is a third geometry | `src/app/profile/edit/page.tsx:289` (:300) | Always render back control; shared EditProfileSkeleton from loading.tsx | C | TODO | |
| F013 | medium | Settings SyncNotice inserts about 44px after fetchMe; Sign in link lacks ?next=/settings | `src/app/settings/_components/SettingsScreen.tsx:227` (:381) | Auth state from session at first paint or stable slot; add next | C | TODO | |
| F014 | medium | Late auth shifts across social routes (Friends card, guest nudge, join column, inbox body, Jump to my rank) | `src/app/community/page.tsx:284` (:298, :346); `tournaments/[id]/page.tsx:215`; `clubs/[slug]/page.tsx:360,:498`; `inbox/page.tsx:72`; `leaderboard/page.tsx:136` | useSession from F001; reserve slots only as a stopgap | D | TODO | |
| F015 | medium | Puzzle date/streak row and puzzle tag row mount after hydration and push the board down; h1 swaps text | `src/app/puzzles/page.tsx:135` (:68, :156), `puzzles/[id]/page.tsx:56` (:54) | Always render the rows with same-height placeholder chips | E | TODO | |
| F016 | low | Turnstile widget mounts late and grows the register form about 65px (unverified height) | `src/app/login/page.tsx:216` | Reserve the widget height while it loads | C | TODO | |
| F017 | low | /analysis ?fen and ?moves applied in a post-mount microtask, start position paints first (unverified) | `src/app/analysis/page.tsx` | Init from searchParams synchronously | E | TODO | |
| F018 | low | Thread autoscroll uses scrollIntoView and can scroll the window on poll updates (unverified) | `src/app/inbox/[username]/page.tsx:115` | Set scrollTop on the container | D | TODO | |

### Blank flash, skeletons and loading states (brief 5.2)

| ID | Sev | Title | Where | Suggested fix | Slice | Status | Commit |
|---|---|---|---|---|---|---|---|
| F019 | high | Hard loads paint an empty page, header included, because a Suspense fallback is null or empty around the whole view | `src/app/login/page.tsx:26`; `tv/page.tsx:128`; `puzzles/page.tsx:75`; `tutorial/first-game/page.tsx:19,:48`; `lobby/page.tsx:69`; `play/page.tsx:52` | Render SiteHeader and the static shell outside the boundary and use the route skeleton as fallback; better, read searchParams in a server page and pass props (no bailout). Class fix across all six | B (lobby, play), C (login), D (tv), E (puzzles, first-game) | TODO | |
| F020 | low | /game bot page Suspense fallback is a bouncing-dots spinner with no header where a board skeleton exists | `src/app/game/page.tsx:207` | Use the shared board skeleton and render CompactSiteHeader outside the boundary | B | TODO | |
| F021 | medium | /u/[username] has three skeletons and none match the final layout (profile CLS 0.085 mobile, measured; header replaced by skeleton header) | `src/app/u/[username]/page.tsx:1540`, `u/[username]/loading.tsx`, `profile/page.tsx:238` | One ProfileSkeleton from the real shell, used by loading.tsx, fallback, !profile branch and /profile shim | C | TODO | |
| F022 | medium | Club and tournament detail pages show a "Loading..." line on client navigation instead of a skeleton | `src/app/tournaments/[id]/page.tsx:170`, `clubs/[slug]/page.tsx:326`, `inbox/[username]/page.tsx:228` | Extract loading.tsx body into a shared component used by the !data branch | D | TODO | |
| F023 | medium | TV loading skeleton geometry differs from the page (max-w-6xl vs 1200px, rail 300 vs 320), inline radius, no sr-only h1 | `src/app/tv/loading.tsx:10` | Rebuild from the page grid | D | TODO | |
| F024 | medium | History list shows "Loading..." and flashes 0 counts; /history/[id] loading uses different nav padding | `src/app/history/page.tsx:106` (:83), `history/[id]/page.tsx:59` (:52, :158) | Row skeleton while null, hide counts, share nav wrapper | E | TODO | |
| F025 | low | Leaderboard skeleton offset and row heights differ from the table | `src/app/leaderboard/page.tsx:387` | Match mt-6, header height, min-h-[44px] rows | D | TODO | |
| F026 | low | Skeleton dialects: .skeleton sweep vs hand-rolled animate-pulse rows vs text lines; no 150ms show-delay or minimum duration anywhere; .skeleton radius 0 | `src/app/globals.css:1978`; animate-pulse at `inbox/page.tsx:102`, `clubs/page.tsx:233`, `tournaments/page.tsx:426`, `achievements/page.tsx:390`, `FriendsPanel.tsx:214`, `profile/FriendsModule.tsx:601`, `u/[username]/page.tsx:1181`; "Loading achievements..." `u/[username]/page.tsx:1480` | Shared Skeleton / SkeletonRow with delay and min-duration in ui/Skeleton; migrate all sites (see proposal P-skel) | B owns Skeleton.tsx; sites by route slice | TODO | |
| F027 | low | /profile offline guest shell has a stray unstyled `<div>Record</div>`; its skeleton differs from loading.tsx | `src/app/profile/page.tsx:205` | Remove the div; share one skeleton (F021) | C | TODO | |

### Edge, empty and error states (brief 5.3)

| ID | Sev | Title | Where | Suggested fix | Slice | Status | Commit |
|---|---|---|---|---|---|---|---|
| F028 | critical | Every /codex/hex/[id] and /codex/boon/[id] page 404s: params read synchronously, removed in Next 16 (verified live). Sitemap and buff pages canonicalize to these URLs, so every hex and boon is de-indexed | `src/app/codex/hex/[id]/page.tsx:38` (:22), `codex/boon/[id]/page.tsx:38` (:22) | Await `props.params` in page and generateMetadata as buff/[id] does; grep `src/app` for other non-Promise params; add a guard that fetches one id per codex family and asserts 200 with an h1 | E | TODO | |
| F029 | medium | Unknown /game/[id] says "That game has wrapped up" then auto-redirects; NotFoundPanel is unreachable; error branch mixes copy; raw link classes | `src/app/game/[id]/page.tsx:513` (:175, :405, :540, :481, :528) | NotFoundPanel with NOT_FOUND_COPY.game when replay fetch 404s and watch said not_found; LinkButton for actions | B | TODO | |
| F030 | medium | Player-not-found and load-error on /u are bespoke, return HTTP 200, and metadata makes crawlable soft 404s | `src/app/u/[username]/page.tsx:250` (:262), `u/[username]/layout.tsx:5` | NotFoundPanel + RouteError styling now; server existence check with notFound() (proposal P-u-server) | C | TODO | |
| F031 | medium | Club and tournament detail load errors have no Retry, no h1, and bypass NotFoundPanel; tournaments/[id]/not-found.tsx unreachable | `src/app/clubs/[slug]/page.tsx:293`, `tournaments/[id]/page.tsx:140` | Split 404 (NotFoundPanel, add club copy) from other failures (Retry that reruns load) | D | TODO | |
| F032 | low | clubs/[slug] and inbox/[username] fall back to the parent directory error boundary copy | `src/app/clubs/error.tsx:15` | Add scoped error.tsx files | D | TODO | |
| F033 | medium | Root error.tsx bypasses RouteError (no log, no digest, dead hover, no focus-visible, game copy on content pages); global-error.tsx uses a box-shadow, no radius, 12px buttons, no title, no log | `src/app/error.tsx:8` (:16, :25), `src/app/global-error.tsx:42` (:6, :15, :93) | Root error uses RouteError with generic copy; global-error drops shadow, adds radius, 13px, title, console.error; add error.tsx for /friend and /stats | E | TODO | |
| F034 | low | Banned users' profiles look normal and offer Challenge, Add friend and Message | `src/app/api/users/[username]/route.ts:24` | Expose suspended, hide actions, quiet line (wording per owner question Q9) | C + F | TODO | |
| F035 | low | /u metadata decodeURIComponent can throw on malformed percent sequences (unverified) | `src/app/u/[username]/layout.tsx:7` | try/catch, generic title when name fails the charset | C | TODO | |
| F036 | medium | Signed-out visitors on a club page get no way to join (plain text, no link) | `src/app/clubs/[slug]/page.tsx:498` (:360) | "Sign in to join" LinkButton with next, as tournaments/[id]:218 does | D | TODO | |
| F037 | medium | /friend is a client-side redirect shim that paints a headerless 12px page first; notifications link to it | `src/app/friend/page.tsx:27`, `api/friends/route.ts:177` | Server redirect (next.config or redirect()) keeping params; point notification hrefs at /lobby?tab=friends | D | TODO | |
| F038 | medium | Club directory search only covers the 50 biggest clubs; "Your clubs" misses the rest | `src/app/clubs/page.tsx:104`, `api/clubs/route.ts:42` | Server ?q= search and paging; always return caller's joined clubs | D + F | TODO | |
| F039 | low | Walkthrough error copy promises resume at the same step, but step state is useState only | `src/app/tutorial/error.tsx:28`, `tutorial/walkthrough/page.tsx:89` | Persist step (?step= or sessionStorage) or change the copy | E | TODO | |
| F040 | low | /puzzles/[id] missing id uses EmptyState with 200 and copy that differs from NOT_FOUND_COPY.puzzle; /history/[id] missing and no-moves states hand-rolled | `src/app/puzzles/[id]/page.tsx`, `src/app/history/[id]/page.tsx` | NotFoundPanel with shared copy | E | TODO | |

### Security and input validation (brief 7, 8, 14)

| ID | Sev | Title | Where | Suggested fix | Slice | Status | Commit |
|---|---|---|---|---|---|---|---|
| F041 | high | Open redirect after password sign-in via unvalidated ?next | `src/app/login/page.tsx:35` (push at :95) | Shared `safeNextPath()` (same-origin after `new URL(next, origin)`), used on login page and both Google routes | F (helper), C (page) | TODO | |
| F042 | high | Google OAuth next check is bypassed by a backslash (`/\evil.com` resolves to https://evil.com/, verified with node) | `src/app/api/auth/google/callback/route.ts:81` (:170), `api/auth/google/route.ts:22` | Same helper as F041: parse and compare origin; redirect to pathname+search+hash | F | TODO | |
| F043 | high | ADMIN_USERNAMES promotes whoever holds a listed username at password login; those names are not reserved in register, guest upgrade or rename | `src/app/api/auth/login/route.ts:69` (:69-75), `register/route.ts:43,:85`, `rename/route.ts:42`, `wrangler.jsonc:25` | Reserve the listed names unless already owned, or switch to ids / creation-time bound. Flag in PR as security | F | TODO | |
| F044 | high | CSP img-src blocks the custom background URL setting, so it silently does nothing (standard CSP semantics, not browser-verified) | `next.config.mjs:52`, `src/lib/settings.ts:654`, `settings/rows.tsx:500` | Add https: to img-src or remove the URL field; Playwright check for securitypolicyviolation | L | TODO | |
| F045 | medium | Username-keyed powers (rating editor, house editor, god panel) and the names are not reserved; a freed name inherits them (unverified path via flag_name) | `src/lib/godPanel.ts:47` (:11, :35), `api/mod/ratings/route.ts:38`, `auth.ts:51` | Gate on stable user ids or a flag column; at least reserve the names and refuse flag_name on them (owner question Q14) | G | TODO | |
| F046 | medium | No Origin or Sec-Fetch-Site check on cookie POSTs: login CSRF on login/guest/register (text/plain JSON form), cross-site logout | `src/lib/server/auth.ts:258`; all cookie-auth POSTs | Shared assertSameOrigin + JSON content-type requirement in a request guard (proposal P-req-guard) | F | TODO | |
| F047 | medium | A JSON body of `null` crashes about 32 POST/PUT handlers with 500 | `src/app/api/auth/login/route.ts:25`; also register:28, avatar:22, bio:25, flair:27, rename:35, friends:91, messages/[username]:173, notifications:79, report:113, suggest:28, buff-feedback:23, nerf-feedback:23, clubs:71, clubs/[slug]:244, membership:19, posts:84, users/settings :224 :261, plus mod, challenges, tournaments, arena, desync, tv-telemetry | readJsonObject(request) helper returning a plain object or 400; use everywhere | F (mod routes: G) | TODO | |
| F048 | low | Plain-object lookups accept prototype keys: avatar id `toString` is stored; cards/insights returns 200 for `constructor` and caches it | `src/lib/avatars.ts:56` (:211), `api/cards/insights/route.ts:27`, `src/lib/cardCodex.ts:31` | Object.hasOwn or Map in every id lookup | F | TODO | |
| F049 | low | JSON-LD script blocks do not escape `<` (latent XSS once user text reaches JSON-LD) | `src/components/codex/CardDetail.tsx:50`; `tutorial/page.tsx:96`, `guide/shared.tsx:41,:73`, `guide/glossary/page.tsx:124`, `layout.tsx:207`, `faq/page.tsx:103` | jsonLdScript() helper escaping `<`, U+2028, U+2029; route all sites through it before SEO work | E | TODO | |
| F050 | low | /healthz returns error stack and internal error text to anonymous callers | `worker.ts:9027` (DO /healthz :1584-1632) | Keep counts public, gate detail behind a token (owner question Q20) | H | TODO | |
| F051 | low | Service bearer compares are not timing-safe; engine-service echoes internal error text | `engine-service/server.ts:94` (:127), `arena-service/server.ts:54` | timingSafeEqual; fixed error message | H | TODO | |
| F052 | low | Zero-width, format and bidi characters pass trim: invisible chat, DMs, posts, a 3-char invisible club name; RTL override in names | `worker.ts:7095` (:7141); `api/messages/[username]/route.ts:88`; `api/clubs/[slug]/posts/route.ts:37`; `api/clubs/route.ts:71` | Shared sanitizeUserText (NFC, strip \p{Cf} except emoji ZWJ, code-point cap) everywhere (proposal P-text) | F + H | TODO | |
| F053 | low | `.slice(0, n)` caps can split a surrogate pair | `worker.ts:7102` (:7148) and API caps | Code-point truncation in the shared sanitizer | F + H | TODO | |
| F054 | low | Profanity normaliser drops non-ASCII letters, so fullwidth and homoglyph spellings pass | `src/lib/profanity.ts:62` | NFKC first plus a small confusables map | F | TODO | |
| F055 | low | Permissions-Policy lists retired interest-cohort (console noise); CSP still allows Google Fonts origins although fonts are self-hosted; poweredByHeader on | `next.config.mjs:67`, `:36,:51,:53` | Drop both; verify no font request fails | L | TODO | |
| F056 | low | Worker-level routes (/api/lobby, /healthz, /arena) bypass next.config security headers | `worker.ts:9010-9031` | Add nosniff to worker JSON responses | H | TODO | |

### Rate limits and abuse (brief 7, 14)

| ID | Sev | Title | Where | Suggested fix | Slice | Status | Commit |
|---|---|---|---|---|---|---|---|
| F057 | medium | Anonymous /api/suggest is completely unthrottled (daily cap only applies to users); guests multiply the cap and trigger email | `src/app/api/suggest/route.ts:56` | Per-IP counter for all submitters (shared rateLimit helper); skip email for guests | F | TODO | |
| F058 | medium | Friend request/cancel loop sends unlimited notifications; muted users and guests can send requests; concurrent INSERT race gives 500 | `src/app/api/friends/route.ts:126` (:133) | Per-sender limit, mute check, ON CONFLICT handling | F | TODO | |
| F059 | medium | Challenge POST can spam another player's bell; code never checked as a real game; timeSec/incrementSec unbounded; guests and muted users allowed | `src/app/api/challenges/route.ts:37` (:77-93) | Rate limit per user and target pair, clamp clock values (shared bounds, F078), refuse muted senders | F | TODO | |
| F060 | medium | Tournament creation: no rate limit, no profanity filter, open to guests, muted and name-flagged users; startsAt unbounded; no mod delete | `src/app/api/tournaments/route.ts:68` (:70, :93) | Throttle, profanity on name/description, block muted and flagged, clamp startsAt; mod hide is proposal P-mod-tourney | F | TODO | |
| F061 | medium | Club creation and club posts: no rate limit, no profanity on name/description, no mute or guest check | `src/app/api/clubs/route.ts:71` (:71-86), `api/clubs/[slug]/posts/route.ts:37,:89` | Profanity on name, censor description, block muted, cap clubs per owner, posts per minute | F | TODO | |
| F062 | low | Register has no IP rate limit when Turnstile is unset (fail-open), and every DB error maps to 409 with no log | `src/app/api/auth/register/route.ts:111` (:93), `src/lib/server/turnstile.ts:23` | register:<ip> counter; only UNIQUE errors to 409; console.error the rest | F | TODO | |
| F063 | low | Per-username login throttle lets anyone lock a known player out; check-then-record is racy | `src/app/api/auth/login/route.ts:38`, `auth.ts:212` | Key on (username, ip) plus a higher global ceiling, or Turnstile after N failures | F | TODO | |
| F064 | low | The header mints a guest account for every JS-executing signed-out visitor, crawlers included (only 30/15min/IP throttle) | `src/components/SiteHeader.tsx:180`, `api/auth/guest/route.ts:34` | Owner question Q2 (mint on engagement or skip bots) | A + F | TODO | |
| F065 | medium | No guest restrictions on any social write (DMs, friends, clubs, posts, reports, suggestions, feedback, tournaments, challenges) | `src/lib/server/social.ts:13` | Opt-in requireUser(request, { allowGuest: false }) applied per owner question Q3 | F | TODO | |
| F066 | low | desync and tv-telemetry sinks read unbounded bodies and have no rate limit (log flooding) | `src/app/api/desync/route.ts:27`, `api/tv-telemetry/route.ts:35` | 413 over about 4KB, per-IP sampling | F | TODO | |
| F067 | medium | Anonymous sockets can create unlimited durable matches; every lobby/alarm pass on the global DO is O(N) | `worker.ts:3499` (:3460-3547, :2066) | Cap unstarted challenges per userId and per IP captured at upgrade | H | TODO | |
| F068 | medium | No frame size cap or per-socket rate limit on the game socket (only chat, schat, adjustOppClock debounced) | `worker.ts:1729` | Reject frames over about 8KB before JSON.parse; token bucket per session; close 1008 on abuse | H | TODO | |
| F069 | medium | Spectator chat is open to anonymous sockets (banned users arrive as anonymous), throttled per socket only, one durable write per message, unmuteable | `worker.ts:7147` (:7137-7175, :7144, :7174) | Require session.userId (owner question Q19); throttle per userId; batch persistence | H | TODO | |
| F070 | low | bot_games counter can be inflated by any session with repeated POSTs | `src/app/api/games/bot/route.ts:15` | Dedupe by client game id or rate limit per user | F | TODO | |
| F071 | low | Arena public /lobby marks presence on every unauthenticated hit, keeping bot spawning alive | `arena-service/server.ts:104` | Count presence only from allowed origins or the DO sync | H | TODO | |

### Backend correctness (brief 7, 14)

| ID | Sev | Title | Where | Suggested fix | Slice | Status | Commit |
|---|---|---|---|---|---|---|---|
| F072 | high | Message thread returns the OLDEST 200 messages, so in long threads new messages never appear, yet the GET marks them read | `src/app/api/messages/[username]/route.ts:19` (:124-139), `inbox/[username]/page.tsx:65` | ORDER BY DESC LIMIT 200 and reverse; cursor params are proposal P-msg-page | F | TODO | |
| F073 | medium | Arena game replays 400 when the hex id contains 0 or 1 (about 66% of arena ids) | `src/app/api/games/[id]/route.ts:10`, `arena-service/pools.ts:29` | Widen to /^[A-Z0-9]{4,12}$/; unit test with newId() and randomCode() | F | TODO | |
| F074 | medium | Withdrawing from a finished tournament deletes the entrant from final standings; mid-event withdraw and rejoin resets score | `src/app/api/tournaments/[id]/entry/route.ts:86` (:83) | Reject withdraw when finished; running is reject or soft flag (proposal); fix stale comment | F | TODO | |
| F075 | low | Friend notifications use type 'message' and suppress DM notifications from the same actor; opening a DM marks the friend request read | `src/lib/server/social.ts:57`, `api/friends/route.ts:171` | Filter dedupe on href LIKE '/inbox/%' now; 'friend' type is proposal P-notif | F | TODO | |
| F076 | low | Guest-to-registered upgrade does not record username history, so old /u/GuestName links 404 | `src/app/api/auth/register/route.ts:87` | Batch usernameChangeStatements | F | TODO | |
| F077 | low | Games archive default limit is 1 when the param is missing (Number(null) is 0); latent | `src/app/api/users/[username]/games/route.ts:42` | Treat null or empty as DEFAULT_LIMIT | F | TODO | |
| F078 | medium | Tournaments with base time over 7200s create only voided boards (API allows 10800, DO rejects over 7200) | `src/app/api/tournaments/route.ts:98`, `worker.ts:4459`, `tournamentEngine.ts:293` | One shared clock bounds module in src/lib/speed.ts; 400 on out-of-range | F + H | TODO | |
| F079 | medium | A 0+N time control silently becomes an untimed game (clock logic gated on truthy timeSec) | `worker.ts:3180` (:3125, :3796), `api/tournaments/route.ts:112` | Reject 0+N or give it a bank (owner question Q24) | H + F | TODO | |
| F080 | medium | Rated custom games can be self-joined by the same account; recordFinishedGame has no same-user guard; stale "only queue games are rated" comment | `worker.ts:3477` (:3549), `src/lib/server/games.ts:208,:211` | Reject self-join or force unrated; early return in recordFinishedGame (owner question Q18) | H | TODO | |
| F081 | medium | Mute, ban and rename state is snapshotted at socket connect and never re-checked | `worker.ts:1693` (:7105, :7150) | Internal DO route the mod API calls after mute/ban/rename (proposal P-mod-push) | H + G | TODO | |
| F082 | high | Two tabs on the same seat steal it back and forth forever (server closes the old socket, client auto-reconnects on any close with the shared localStorage token) | `worker.ts:2138`, `src/lib/multiplayer.ts:881` (:722, :679, :948) | Distinct close code (4001 superseded); client stops auto-reconnect and shows "open in another tab" with Reclaim; e2e with two pages | H | TODO | |
| F083 | medium | A seated player can read spectator chat by watching their own game in a second window | `worker.ts:8185` (:2354, :6779) | Treat sockets whose userId matches a seat as players for wstart and schat fan-out | H | TODO | |
| F084 | medium | Signing in never reclaims your own seat from another device; you stay a spectator | `worker.ts:3602` | Account-based reclaim frame (owner question Q25) | H | TODO | |
| F085 | low | Resigning while disconnected fails silently; the confirm closes as if it worked | `src/components/OnlineMatch.tsx:2222` (:2737), `multiplayer.ts:786` | Mirror onAbort: show "Disconnected from the game server." | J | TODO | |
| F086 | low | A takeback offer survives the offerer's own move and the rewind is recomputed at accept time | `worker.ts:3748` (:4100, :4141) | Clear the offer on any move, or store the target ply | H | TODO | |
| F087 | low | Client plays a random nerf when the server's nerf id is unknown (deploy skew) | `src/components/OnlineMatch.tsx:196` (:183) | Hard reload or UNRESTRICTED with an untrusted flag | J | TODO | |
| F088 | low | Flag and move in the same instant: two Date.now() reads, no lag allowance (unverified window) | `worker.ts:3697` (:3741, :3139, :3796) | Capture now once; unit test with injected now | H | TODO | |
| F089 | low | Repetition key includes the en passant square even when no capture is possible | `src/engine/board.ts:394` (:361) | Separate repetitionKey, or bump REPLAY_VERSION | H | TODO | |
| F090 | low | lastChatAt map is never pruned | `worker.ts:7089` | Delete on detach or store on the attachment | H | TODO | |
| F091 | low | God-panel toggles and debounce stamps are not serialized, so they reset on hibernation wake (unverified) | `worker.ts:7842` (:7813, :7668) | serializeAttachment after mutation or document as ephemeral | H | TODO | |
| F092 | low | Protocol doc out of date (missing about 11 client frames, envelope, rated custom games) | `docs/game-server-protocol.md:20` | Regenerate from the switch at worker.ts:1734-1809 | H | TODO | |
| F093 | low | Desync reports are log-only; nothing counts them | `src/app/api/desync/route.ts:54` | Bounded daily counter surfaced on mod stats (proposal P-err-count) | F + G | TODO | |
| F094 | low | Private friends list still returns mutual friends via the friends route, unlike the profile route | `src/app/api/users/[username]/friends/route.ts:35` | Align after owner question Q17 | F | TODO | |
| F095 | low | An expired session token triggers a table-wide DELETE on the request path (no expires_at index) | `src/lib/server/auth.ts:198` | Delete only the presented token; bulk sweep by cron (proposal P-idx) | F | TODO | |
| F096 | low | Challenge accept ignores the TTL; notification cleanup LIKE '%code=ID%' matches longer codes | `src/app/api/challenges/[id]/route.ts:38` (:52) | 410 past TTL; exact href match | F | TODO | |
| F097 | low | arena/end returns 500 on missing seats and trusts rec.mode as a rating category | `src/app/api/arena/end/route.ts:101` | Validate mode, seat names, move strings; 400 bad_record | F | TODO | |
| F098 | medium | scheduled() cannot reuse getDb/pgAll because they need getCloudflareContext | `src/lib/server/pg.ts:31`, `db.ts:12`, `modWebhook.ts:70` | Env-injectable variants, or scheduled() calls an internal Next route via handler.fetch | L + H | TODO | |
| F099 | medium | Guest-upgraded accounts keep their guest created_at, so "signed up in the last 24h" cannot use created_at | `src/app/api/auth/register/route.ts:89`, `google/callback/route.ts:140` | Add registered_at and welcome_sent_at (or an email_sends table) | L + F | TODO | |
| F100 | low | Existing Resend call uses the sandbox sender and has no timeout | `src/app/api/suggest/route.ts:126` (:122) | src/lib/server/email.ts with timeout and no-op when unset; switch suggest to it | L | TODO | |
| F101 | low | Duplicate D1 migration prefixes (0015, 0023, 0024) | `migrations/0023_schema_meta.sql:1` | Number new migrations from 0041 and mirror in schema.ts | G + L | TODO | |

### Performance and caching (brief 5.7, 7, 8)

| ID | Sev | Title | Where | Suggested fix | Slice | Status | Commit |
|---|---|---|---|---|---|---|---|
| F102 | medium | Public /api/stats runs six full-archive aggregates plus a users scan on every unauthenticated request, uncached | `src/app/api/stats/route.ts:36` (:48-58, :69-92) | Move mod numbers to a mod endpoint; cache aggregates (Cache API or daily rollup); s-maxage on the public payload | G | TODO | |
| F103 | medium | Profile endpoints: 8 sequential awaits, up to 4000 rating-history rows; /stats scans the newest 5000 games per view; no caching | `src/app/api/users/[username]/route.ts:202`, `users/[username]/stats/route.ts:87` | Promise.all; server-side downsample; short caching (split viewer-dependent parts). Record before/after timing | F | TODO | |
| F104 | medium | Club list payload can reach tens of MB because uploaded icons (up to 2M chars each) are inlined for 50 clubs | `src/app/api/clubs/route.ts:35`, `src/lib/imageValidate.ts:16,:105` | Cap uploaded icons near the avatar cap; icon endpoint is proposal P-club-icon | F | TODO | |
| F105 | low | Public GETs send no Cache-Control; private GETs (me, notifications, messages, settings) send no explicit no-store | `src/app/api/community/recent/route.ts:78`; community/active, users/[username]/achievements, users/[username]/stats, users/search, clubs GET, games/[id]:37, games/recent, tournaments GET, leaderboard GET | public s-maxage on anonymous aggregates and immutable archive rows; private no-store on per-user data | F | TODO | |
| F106 | low | Leaderboard sends 250 rows with bios to callers needing 5 rows or only `me` | `src/app/api/leaderboard/route.ts:62`, `community/page.tsx:416`, `OnlineMatch.tsx:1622` | Optional ?limit and ?meOnly (default shape unchanged) | F | TODO | |
| F107 | low | Tournament detail GET advances the event with serial writes and up to 128 serial DO calls per request | `src/lib/server/tournamentEngine.ts:178` (:289) | db.batch and bounded parallelism; scheduler is proposal P-tourney-sched | F | TODO | |
| F108 | low | Inbox thread poll writes two UPDATEs to D1 every 5 seconds and resends the full thread | `src/app/api/messages/[username]/route.ts:124` | Mark read only when unread rows exist; since= param is proposal P-msg-page | F | TODO | |
| F109 | low | Report throttle query has no reporter index; sessions no expires_at index; login_attempts never pruned | `src/lib/server/schema.ts:138`, `report/route.ts:132` | Migration (proposal P-idx) | F + G | TODO | |
| F110 | low | Tournament directory re-renders the whole page including the create form every second | `src/app/tournaments/page.tsx:121` | Tick only in rows that show a countdown | D | TODO | |
| F111 | low | Rating count-up re-renders the whole GameOver panel every animation frame | `src/components/GameOver.tsx:875` (:655) | Leaf RatingCountUp component or ref textContent | J | TODO | |
| F112 | low | Bot game and spectator pages recompute fx zones every render (fresh arrays defeat Board memos) | `src/app/game/page.tsx:1658`, `game/[id]/page.tsx:887` | useMemo keyed on game, as OnlineMatch does | B | TODO | |
| F113 | medium | Non-hashed public assets (1069 avatar SVGs, pieces, sounds) have no cache rule, so the lobby revalidates every avatar | `public/_headers:10` | max-age=86400, stale-while-revalidate=604800 for /house-pfp, /piece, /sound, /companions, /brainrot, /newjeans; measure /lobby request count before and after | L | TODO | |

### User counting and moderator panel (brief 15, 16)

| ID | Sev | Title | Where | Suggested fix | Slice | Status | Commit |
|---|---|---|---|---|---|---|---|
| F114 | high | Public "players online" is padded with about 150 idle house personas and a synthetic 350-800 curve; HTTP visitors are never counted; mods see no live figure | `worker.ts:8663` (:8554-8567, :8450-8470), `src/lib/server/bots.ts:1994-2021`; shown at `page.tsx:122`, `lobby/page.tsx:207,:809`, `community/page.tsx:235,:278` | OWNER DECISION: keep the padding and the public figure unchanged (OWNER DIRECTIVE 2). Only an extra internal real-human field for the mod panel is allowed. | H + G | DROPPED (owner) | |
| F115 | high | Player detail shows mod history and reports for the search's exact match, not the selected player ("Clean record" for a banned player from the default roster) | `src/components/mod/PlayersSection.tsx:315` (:93, :313-343), `api/mod/users/route.ts:41,:61-81` | Fetch context by user id on selection (proposal P-mod-drawer) | G | TODO | |
| F116 | high | Most mod mutations never reach the audit log (report triage, flag review, card overrides, house toggles, god panel, personas, rating edits); only a webhook that is off unless MOD_WEBHOOK_URL is set | `src/lib/server/schema.ts:141` (mod_actions.target_user_id NOT NULL), `mod.ts:63`, `modWebhook.ts:5` | Migration generalising mod_actions (target_kind, target_ref, reason, before/after JSON); one logModEvent helper called by every mutating route; filter chip in AuditLogSection (proposal P-audit) | G | TODO | |
| F117 | high | Analytics DAU/WAU/MAU and totals count house bots (hp_, seed_); comment wrongly says guests have NULL ids | `src/app/api/analytics/summary/route.ts:85` (:83, :132-137) | Shared human-seat predicate from metrics.ts; exclude bots from totals; fix comment | G | TODO | |
| F118 | medium | Three incompatible "human game" definitions and two meanings of "today" across stats surfaces; /mod/stats/all "Players" counts bots and guests | `src/app/api/stats/route.ts:16` (:23, :40, :69), `modGames.ts:19-28`, `overview/route.ts:44`, `all/page.tsx:52` | src/lib/server/metrics.ts owns the definitions; print the definition next to each number (proposal P-metrics) | G | TODO | |
| F119 | medium | Most active players (community/active) includes house personas and seed accounts; users/search excludes hp_ but not seed_ | `src/app/api/community/active/route.ts:16`, `users/search` | Same HOUSE_PREDICATE everywhere | F (uses G's predicate) | DROPPED (owner directive 2, integrator) | Not applied: house personas appear in "Most active players" and on the public leaderboard, and the seed_ accounts (where present) rank there too, so taking either out of community/active or search would change how bots are presented publicly and let a visitor find a leaderboard name that search cannot (a bot tell). users/search keeps its existing hp_ rule. |
| F120 | medium | Mod player search strips `_` instead of escaping it, so names with underscores cannot be found or re-selected | `src/app/api/mod/users/route.ts:58`, `PlayersSection.tsx:111` | Escape LIKE metacharacters with ESCAPE | G | TODO | |
| F121 | medium | No confirmation on any destructive mod action, including permanent ban | `src/components/mod/PlayersSection.tsx:251` (:248-282); `ChatFlagsSection.tsx:42`; `ControlsSection.tsx:264`; `mod/house/page.tsx:254`; `mod/cards/page.tsx:191` | Shared two-step confirm in mod/ui.tsx; required reason for ban, mute, flag | G | TODO | |
| F122 | medium | "Mark all reviewed" clears chat flags the moderator never saw (GET is LIMIT 200, POST updates all) | `src/app/api/mod/chat-flags/route.ts:38` (:18), `ChatFlagsSection.tsx:62` | Send the shown ids or a cutoff; one audit row with the count | G | TODO | |
| F123 | medium | Rating editor can edit its own and admins' ratings; not audited, previous values lost | `src/app/api/mod/ratings/route.ts:94` (:32-42, :122-150) | Before/after in the audit log; block self edits unless owner confirms (Q14) | G | TODO | |
| F124 | medium | Card override DELETE is completely untraced (no webhook, no audit, no validation) | `src/app/api/mod/cards/route.ts:131` | Load row, audit old values, validate id, then delete | G | TODO | |
| F125 | medium | No telemetry for online now, peak concurrent or historical DAU; no users(created_at) or last_seen_at index | `src/app/api/auth/me/route.ts:14`, `worker.ts:1586` | user_activity_days table, DO peak, indexes, cached /api/mod/metrics (proposals P-metrics, P-online) | G + H | TODO | |
| F126 | low | Dashboard lacks queue-health numbers (oldest open report, oldest flag, handled per day) | `src/app/api/mod/overview/route.ts:71` | MIN(created_at) queries and a 7-day histogram | G | TODO | |
| F127 | low | Reports can be re-closed by a second mod (overwrites handled_by), carry no reason, UI swallows errors | `src/app/api/mod/reports/route.ts:42`, `ReportsSection.tsx:29` | Guard status='open' (409), store note, surface errors | G | TODO | |
| F128 | low | Game archive "moves" are plies, double the /mod/stats figure | `src/app/api/mod/games/stats/route.ts:49`, `modGames.ts:67`, `GamesSection.tsx:143` | One helper returning full moves | G | TODO | |
| F129 | low | House personas nav entry is admin-only while the page and API allow any mod | `src/components/mod/nav.ts:100`, `mod/house/page.tsx:62` | Pick one rule and align | G | TODO | |

### Keyboard and accessibility (brief 5.5)

| ID | Sev | Title | Where | Suggested fix | Slice | Status | Commit |
|---|---|---|---|---|---|---|---|
| F130 | high | /tv loses its only h1 once a game is on screen | `src/app/tv/page.tsx:435` | Always render the h1 (sr-only when players shown) | D | TODO | |
| F131 | medium | Live play, spectator and replay game views have no h1 | `src/app/game/[id]/page.tsx:1603` (GameShell :1602-1716), `OnlineMatch.tsx` main layout | sr-only h1 ("White vs Black") in GameShell and OnlineMatch | B + J | TODO | |
| F132 | medium | /history/[id] replay has no h1 and a bespoke nav | `src/app/history/[id]/page.tsx:156` | Add h1; nav unification is proposal P-nav | E | TODO | |
| F133 | high | TV live list nests player profile Links inside the row button (invalid, confusing tab order, wrong click target) | `src/app/tv/page.tsx:584` (:76-98, :595-609) | Stretched overlay button with names raised above it, or plain names | D | TODO | |
| F134 | high | Tournament countdown is aria-live and changes every second | `src/app/tournaments/[id]/page.tsx:435` (:78) | Announce only phase changes in a separate sr-only status | D | TODO | |
| F135 | low | Online-count pill announces on every lobby poll; LockInCountdown role=timer nested in a status live region (unverified per-second speech) | `src/app/community/page.tsx:264`, `src/components/draft/LockInCountdown.tsx` | Drop live region or announce transitions only | D + C | TODO | |
| F136 | high | Profile picture upload tile is unreachable by keyboard (input display:none, label not focusable) | `src/app/profile/edit/page.tsx:334` | sr-only input with has-[:focus-visible] ring, or a Button calling inputRef.click() | C | TODO | |
| F137 | medium | Visible focus removed: bio textarea (outline-none beats global rule); suggest form inputs only change border | `src/app/profile/edit/page.tsx:475`; `codex/suggest/page.tsx:217,:229,:239` | Drop outline overrides or add a focus-within ring token | C + E | TODO | |
| F138 | medium | Modals without dialog semantics or focus trap because useModalChrome.attachDialog is never attached (ReportModal, History GameSummary, ClipModal); history scrim uses off-palette #0a111e; 32px close button | `src/app/u/[username]/page.tsx:2245`, `history/page.tsx:221` (:228, :246), `src/components/clip/ClipModal.tsx` | ref={chrome.attachDialog}, role=dialog, aria-modal, aria-labelledby, textarea label, shared scrim token, 44px close | C | TODO | |
| F139 | medium | TV fullscreen overlay is not a dialog and does not manage focus | `src/app/tv/page.tsx:642` | role=dialog, focus exit on open, trap, restore | D | TODO | |
| F140 | medium | Mobile nav panel is portalled to body with no focus move, trap or return | `src/components/MobileNavMenu.tsx:185` | Focus first link, trap, return to trigger (HeaderSettingsMenu pattern) | A | TODO | |
| F141 | low | Header popovers do not close on Escape; challenges and bell triggers lack aria-expanded; count not in label; profile trigger claims aria-haspopup=menu without menu semantics | `src/components/SiteHeader.tsx:194` (:395, :449, :542) | Escape handler with focus return; aria-expanded/haspopup; count in label | A | TODO | |
| F142 | medium | MobileBuffDrawer closed content stays tabbable; no Escape; no aria-controls; focusable backdrop button; height animated | `src/components/MobileBuffDrawer.tsx:109` (:52, :111) | inert when closed, Escape with focus return, aria-controls, backdrop tabIndex=-1; transform animation (see F191) | C | TODO | |
| F143 | medium | Escape with a glossary definition open also hides the whole draft | `src/components/DraftOverlay.tsx:793` (:812), `GlossaryTerm.tsx:116` | Early return when an inner popover is open, or GlossaryTerm stops propagation | J | TODO | |
| F144 | low | Status changes are not announced: AchievementToast, login form error, profile edit errors and "Saved", DraftRevealBanner | `src/components/AchievementToast.tsx:147`; `login/page.tsx:158`; `profile/edit/page.tsx:376,:458,:485,:553`; `DraftOverlay.tsx:2505` | Persistent role=status / role=alert slots whose content changes | A, C, J | TODO | |
| F145 | low | Tabs without roving tabindex or arrow keys, aria-controls pointing at unmounted panels, OverflowMenu role=menu without focus move or arrows, login tabs as aria-pressed | `src/app/lobby/page.tsx:376` (:392-422, :429); `codex/_components/CodexBrowser.tsx:342`; `u/[username]/page.tsx:933,:1003`; `login/page.tsx:146`; FriendsModule and FriendsPanel menus | Implement the tabs and menu patterns or drop the roles (one shared Tabs component) | B, C, D, E | TODO | |
| F146 | low | Presence dot uses aria-label on a role-less span inside the h1; lowercase link inside the h1 | `src/app/u/[username]/page.tsx:636` (:648) | aria-hidden dot plus sr-only text; move link out | C | TODO | |
| F147 | low | Stat strip dl puts dd before dt | `src/app/u/[username]/page.tsx:583` (:431) | dt first, flex-col-reverse | C | TODO | |
| F148 | low | SiteHeader renders a bare nav inside main on about 25 pages; no banner landmark; no skip link | `src/components/SiteHeader.tsx:299` (:691) | header wrapper, move out of main, skip link (mechanical sitewide; coordinate with every route slice) | A | TODO | |
| F149 | low | Decorative lucide icons without aria-hidden in text runs (unverified if the installed lucide auto-hides) | `src/app/tournaments/[id]/page.tsx:286` (:395, :450, :503); `clubs/[slug]/page.tsx:343,:346`; `clubs/page.tsx:315`; `tournaments/page.tsx:551` | aria-hidden on decorative icons | D | TODO | |
| F150 | low | Time control label points at no control; PlayerSearch puts a non-option p inside role=listbox | `src/app/tournaments/page.tsx:286`, `PlayerSearch.tsx:443` | fieldset/legend or radiogroup; move caption out | D | TODO | |
| F151 | medium | Muted parchment-400 text sits on the hover fill (3.94:1) in leaderboard, community rails and TV lists | `src/app/leaderboard/page.tsx:292` (:314, :355); `community/page.tsx:420,:455,:492,:618`; `tv/page.tsx:591,:611` | Hover with --bg-raised, or lift muted cells on group-hover | D | TODO | |
| F152 | low | Achievements ProgressBar role=progressbar has no accessible name | `src/app/achievements/page.tsx` | aria-label or aria-labelledby | E | TODO | |

### Responsive and touch (brief 5.6)

| ID | Sev | Title | Where | Suggested fix | Slice | Status | Commit |
|---|---|---|---|---|---|---|---|
| F153 | medium | Header right cluster likely overlaps the wordmark at 360px, worse once auth resolves (measured: brand block shrinks 195 to 143px at 390px) | `src/components/SiteHeader.tsx:299` (:300) | Screenshot per auth state at 360px; hide wordmark text below a threshold or move challenges and bell into the account menu (structural part to PROPOSALS) | A | TODO | |
| F154 | medium | /play option pill rows likely overflow the card at 360px (bot strength 356px and time presets 333px in a 276px card; unverified) | `src/app/play/page.tsx:354` (:224, :238) | Measure first; allow wrapping or auto-fit minmax below sm only | B | TODO | |
| F155 | medium | Form inputs are 13px on phones (below the 14px floor, triggers iOS zoom) | `src/app/tournaments/page.tsx:41`; `clubs/page.tsx:172,:185`; `inbox/[username]/page.tsx:268`; `clubs/[slug]/page.tsx:480` | One shared input class: 16px below sm, 13px from sm | D | TODO | |
| F156 | medium | Tournament directory hides start time and seats on phones | `src/app/tournaments/page.tsx:548` | Fold into the second meta line below sm | D | TODO | |
| F157 | medium | Draft interactive text below the 13px floor and touch targets under 44px (Confirm text-xs, Skip 12px, "Draft open" chip about 34px, chip aria-label hides countdown) | `src/components/DraftOverlay.tsx:1560` (:1921, :1629) | Button primitive sizes; drop or extend the chip aria-label | J | TODO | |
| F158 | medium | WaitingCornerNotice minimize button is about 24px; retired uppercase eyebrow; identical ternary branches | `src/components/draft/WaitingCornerNotice.tsx:125` (:118, :64) | Button size sm ghost; sentence case; collapse ternary | C | TODO | |
| F159 | medium | TV prev, next and fullscreen buttons are 36px on touch | `src/app/tv/page.tsx:448` (:457, :346) | h-11 w-11 with pointer:fine step-down | D | TODO | |
| F160 | low | Other hit areas under 44px: HeroTv "Watch replay", HomeFeed Retry, community recent-game result link | `src/components/HeroTv.tsx:162`; `page.tsx:290`; `community/page.tsx:664` | min-h-[44px] with pointer:fine step-down, or stretched row link | B, D | TODO | |

### Design contract (brief 0.2)

| ID | Sev | Title | Where | Suggested fix | Slice | Status | Commit |
|---|---|---|---|---|---|---|---|
| F161 | medium | Shadows and glows break the no-shadow contract across chrome | `src/components/SiteHeader.css:44`; `SiteHeader.tsx:328,:386,:406,:461,:580`; `MobileNavMenu.tsx:209`; `AchievementToast.tsx:157`; `SettingsBootstrap.tsx:149,:314`; `game/[id]/page.tsx:1002,:1443`; `QueueButton.tsx:281`; `u/[username]/page.tsx:937,:1463`; `FriendsModule.tsx:408`; `FriendsPanel.tsx:580`; `DraftOverlay.tsx:222,:1341,:1372,:1410,:1629,:2515`; `PlayerSearch.tsx:396,:421,:428,:441`; `global-error.tsx:42`; `TourCoachOverlay.tsx:217`; `.hover-lift` globals.css:566 | Remove shadow utilities (elevation from --bg-raised); consider removing boxShadow.plate from tailwind.config and a check-shadows guard modelled on test:rounded | every slice for its files; guard by I | TODO | |
| F162 | low | Retired uppercase tracked labels and chips (only LIVE may be allcaps) | `src/app/u/[username]/page.tsx:401`; `RatingRail.tsx:52`; `ActivityFeed.tsx:113`; `WaitingCornerNotice.tsx:118`; `leaderboard/page.tsx:334,:379`; `tv/page.tsx:272,:279` | Sentence case, no letterspacing | C, D | TODO | |
| F163 | low | Hard-coded hex colours outside tokens | `src/app/tournaments/[id]/page.tsx:38`; `tv/page.tsx:315,:316`; `history/page.tsx:228` | Swap for tier ink, board square and scrim tokens | D, C | TODO | |
| F164 | medium | Privacy switch knob uses a shadow, transition-all, animates `left`, rounded-full, OS-query gate only | `src/app/profile/edit/page.tsx:595` | translateX thumb, transition-transform on tokens, data-anim gate (shared Switch, F198) | C | TODO | |
| F165 | low | Dead code: QueueButton (424 lines, no importer); unused router and `filtered = ranked` alias; unused Link imports on about and contact | `src/components/QueueButton.tsx:40`; `clubs/[slug]/page.tsx:204`; `leaderboard/page.tsx:91,:77`; `about/page.tsx:2`; `contact/page.tsx:2`; `login/page.tsx:3` | Delete; fix comments in lobby/page.tsx :275 :501 :829 | B, D, E, C | TODO | |
| F166 | low | Two divergent footers (home page local copy) and socials hard-coded on /contact | `src/app/page.tsx:456`, `src/components/SiteFooter.tsx`, `contact/page.tsx:24` | One shared footer with a build-stamp slot; export SOCIALS and FOOTER_LINKS | B + E | TODO | |

### Copy and terminology (brief 5.8)

| ID | Sev | Title | Where | Suggested fix | Slice | Status | Commit |
|---|---|---|---|---|---|---|---|
| F167 | medium | Swiss pairing footnote shows on arena and single-elimination events | `src/app/tournaments/[id]/page.tsx:359` | Footnote keyed on t.format, matching tournamentEngine | D | TODO | |
| F168 | medium | Tournament club chip links to /clubs instead of the club (API lacks slug) | `src/app/tournaments/[id]/page.tsx:204`, `api/tournaments/[id]/route.ts:74` | Select c.slug, link /clubs/{slug} | D + F | TODO | |
| F169 | low | "Challenge" label on recent opponents only opens the profile | `src/app/community/page.tsx:362` | Relabel "View profile" or link to the challenge flow | D | TODO | |
| F170 | low | Club events show raw lowercase phase words and rows are not links | `src/app/clubs/[slug]/page.tsx:456` | Map phase to sentence-case labels; link rows | D | TODO | |
| F171 | low | Round pairing names are not linked; draw notation "1/2-1/2" vs "½-½" on community | `src/app/tournaments/[id]/page.tsx:529` (:559), `community/page.tsx:104` | PlayerLink; one draw notation | D | TODO | |
| F172 | low | Tutorial says five rules and four card types; how-to-play lists six and five | `src/app/tutorial/page.tsx:102` (:8, :130), `guide/how-to-play/page.tsx:11,:25` | Glossary as source of truth; align tutorial and HowTo | E | TODO | |
| F173 | low | Card count differs: brand OG "2,400+", codex meta "1,000+", codex og "400+" (1,665 live) | `src/app/codex/layout.tsx:23` (:10), `src/lib/ogCard.tsx:119` | Derive from the library at build time (owner question Q12) | E | TODO | |
| F174 | low | Card meta description reads "Lucky is a I. Trivial nerf" | `src/app/codex/nerf/[id]/page.tsx:24`, `src/lib/cardCodex.ts:91`, `buff/[id]/page.tsx:30` | Use the label in prose ("a Trivial (tier I) nerf") | E | TODO | |
| F175 | high | Privacy policy says no emails are collected, one cookie, prefs never leave the device, no third parties; register, Google sign-in, settings sync, Turnstile, Resend and Apps Script contradict it | `src/app/privacy-policy/page.tsx:69` (:97-114) | Draft updated sections plus "Emails we send" and a new date; owner signs off (Q7). Do not publish without sign-off | E | TODO | |
| F176 | low | Brand spelled three ways ("Nerfchess", "Nerf Chess TV", "NerfChess"); subtitle says arenas for all formats; ASCII "..." in busy states | `src/app/tournaments/page.tsx:200`; `tv/page.tsx:225`; `clubs/page.tsx:153,:192`; `tournaments/page.tsx:247,:409`; `clubs/[slug]/page.tsx:172`; `tournaments/[id]/page.tsx:170` | Canonical spelling per owner question Q10; ellipsis character or Button loading | D | TODO | |
| F177 | low | Title case CTAs "Play a Friend", "Play vs Bot" | `src/app/history/page.tsx:115` | "Play a friend", "Play the bot" | E | TODO | |
| F178 | low | Stale comments describe a phone move bar that no longer exists | `src/components/mobileChrome.ts:31`, `MobileBuffDrawer.tsx:59,:67` | Update comments to current geometry | C | TODO | |

### Interaction feel (brief 5.4)

| ID | Sev | Title | Where | Suggested fix | Slice | Status | Commit |
|---|---|---|---|---|---|---|---|
| F179 | medium | Club board post has no in-flight guard (double submit creates duplicates) | `src/app/clubs/[slug]/page.tsx:265` (:490) | posting state, disabled button, Button loading | D | TODO | |
| F180 | medium | Delete post control is hover-only, invisible to keyboard and touch, 13px icon, errors swallowed, no confirmation | `src/app/clubs/[slug]/page.tsx:517` (:290) | Reveal on focus-within and coarse pointers, 44px hit area, surface failures, confirm or undo | D | TODO | |
| F181 | medium | Create tournament offers clubs the user has not joined (then 403); prefilled ?club outside the list submits a hidden id (unverified) | `src/app/tournaments/page.tsx:374`, `api/tournaments/route.ts:129` | Filter to joined clubs; keep display and submission in sync | D | TODO | |
| F182 | low | Thread input clears text typed while a send was in flight | `src/app/inbox/[username]/page.tsx:134` | Clear only if the draft still equals the sent text | D | TODO | |
| F183 | low | Codex copy-link shows "copied" even when the clipboard write fails | `src/app/codex/_components/CodexBrowser.tsx:250` | Set copied in .then, error or fallback in .catch | E | TODO | |
| F184 | low | Suggest form shows a raw SyntaxError on non-JSON error responses; error line has no role=alert | `src/app/codex/suggest/page.tsx:130` (:250) | Parse defensively, plain message, role=alert | E | TODO | |
| F185 | low | DraftRevealBanner 7s auto-dismiss timer restarts on every parent render (inline onDismiss) | `src/components/DraftOverlay.tsx:2505`, callers `OnlineMatch.tsx:3542`, `game/page.tsx:2480` | Store onDismiss in a ref; run timer once | J | TODO | |

### Motion, Tier A chrome (brief 6 Tier A, 0.2, 11)

| ID | Sev | Title | Where | Suggested fix | Slice | Status | Commit |
|---|---|---|---|---|---|---|---|
| F186 | medium | framer-motion animations keep playing with data-anim=off (no MotionConfig; 8+ ungated call sites) | `src/components/OnlineMatch.tsx:3614` (:3627, :3791); `draft/WaitingCornerNotice.tsx:71,:108`; `DraftOverlay.tsx:1405,:1794,:2351`; `GameOver.tsx:1035`; `Board.tsx:5463` | Root MotionConfig driven by the data-anim observer plus a shared framer preset; extend check-reduced-motion to flag motion.* without the gate (proposal P-motionconfig) | I (root config), J/C (call sites) | TODO | |
| F187 | medium | data-anim=fast only shortens CSS transitions; keyframes and framer ignore it | `src/app/globals.css:267` (:2536), `useMotionTempo.ts:11` | --tempo stamped by applyUiPrefs and folded into --dur tokens; pass tempo to the framer preset | I + A | TODO | |
| F188 | medium | Chrome motion ignores --ease-*/--dur-* tokens almost everywhere (about 240 Tailwind transitions on 150ms default; raw durations in globals.css; draft CSS has zero --fx-dur across about 100 declarations) | `tailwind.config.ts:133`; `globals.css:904,:939,:971,:1155,:1169,:1370`; `SiteHeader.css:28`; `DraftOverlay.css`, `DraftVault.css`; `DraftOverlay.tsx:399` | Map Tailwind transition defaults onto tokens; export tokens once from src/lib/motion.ts; replace literals | I (J for draft CSS) | TODO | |
| F189 | low | Unregistered fourth easing cubic-bezier(0.16,1,0.3,1) | `src/components/draft/WaitingCornerNotice.tsx:74` (:111); `DraftOverlay.css:1200,:1235,:1245`; `globals.css:3067,:3087,:3137,:3146,:3164` | Replace with --ease-out or register a token | I, C, J | TODO | |
| F190 | medium | OS prefers-reduced-motion queries and Tailwind motion-safe/motion-reduce fire even though Follow system motion defaults off, giving half-animated states (GameOver CSS acts freeze while its spring plays) | `src/app/globals.css:2620` (:3224); about 30 variants in 20 TSX files (TourCoachOverlay.tsx:217, GlossaryTerm.tsx:225, PresenceBadge.tsx:59, FriendsPanel.tsx:214, profile/edit/page.tsx:595, NerfCard.tsx:137, BuffCard.tsx:177) | html[data-anim="off"] selectors; an anim-off Tailwind variant; a guard banning the OS variants outside an allowlist | I | TODO | |
| F191 | medium | Layout properties animated: spotlight top/left/width/height, drawer height, eval bars, progress bars, switch left, search clip-path | `src/components/tutorial/TourCoachOverlay.tsx:217`; `MobileBuffDrawer.tsx:111`; `EvalBar.tsx:418,:478`; `achievements/page.tsx:69,:96`; `analysis/page.tsx:507`; `profile/edit/page.tsx:595`; `globals.css:1357` | translate/scale equivalents; extend check-anim-props to scan transitions and TSX transition-[width/height/top/left] | I (C, E for their files) | TODO | |
| F192 | low | transition-all in chrome | `src/components/QueueButton.tsx:381`; `BuffCard.tsx:177`; `NerfCard.tsx:137`; `community/page.tsx:672`; `clubs/page.tsx:320`; `profile/edit/page.tsx:595`; `TourCoachOverlay.tsx:217` | Narrow to transform/opacity or colors | I, D, C | TODO | |
| F193 | low | Box-shadow, filter and background animated on buttons, cards, inputs, dock, draft timer and fruition frames (5 grandfathered in check-anim-props) | `src/app/globals.css:904` (:911, :939, :971, :568, :2114, :1155); `OpponentDraftPanel.tsx:69`; `DraftOverlay.css:539,:760,:787`; `effects/fruition/fruition.css:237,:262` | Pre-baked pseudo-element faded with opacity; shrink the baseline | I, J, K | TODO | |
| F194 | medium | DockRow stacks three entrance mechanisms; dock-pocket-flash is discarded by the cascade (unverified in browser) | `src/components/dock/DockRow.tsx:110` (:102), `DraftOverlay.css:806,:1200` | One entrance; list both keyframes in one declaration if both beats are wanted | I | TODO | |
| F195 | medium | Six divergent toast implementations, most without a mirrored exit | `src/components/AchievementToast.tsx:147`; `OnlineMatch.tsx:3614,:3627,:3791`; `DraftNotice.tsx:117`; `GodPanelNotice.tsx:36`; `WaitingCornerNotice.tsx:71,:108`; `DraftOverlay.tsx:2508` | One Toast/Notice primitive (dur-2 enter, dur-1 mirrored exit, gated); merge DraftNotice and GodPanelNotice | I (primitive), A/J/C (adoption) | TODO | |
| F196 | low | Popover motion inconsistent: header search animates in with no exit, every other popover pops | `src/app/globals.css:1336`; `SiteHeader.tsx:327`; `MobileNavMenu.tsx:185`; `HeaderSettingsMenu.tsx:264`; `EffectPopover.tsx:112`; PlayerSearch | One popover-enter primitive from the trigger origin, mirrored exit | I | TODO | |
| F197 | low | Three live-dot idioms (ping, pulse, flicker) with mixed gating | `src/components/PresenceBadge.tsx:59`; `HeroTv.tsx:190`; `CurrentGameCard.tsx:201`; `lobby/page.tsx:802`; `tournaments/page.tsx:477`; `tv/page.tsx:115,:267`; `community/page.tsx:272`; `FriendGame.tsx:399`; `AdminGodPanel.tsx:223`; `ConnectionBanner.tsx:109` | One LiveDot primitive gated by data-anim | I | TODO | |
| F198 | low | Three toggle-switch implementations with different motion | `src/components/HeaderSettingsMenu.tsx:111`; `SettingsPanel.css:48`; `profile/edit/page.tsx:595` | One Switch based on .settings-toggle | I | TODO | |
| F199 | low | About 12 hand-rolled disclosure chevrons with varied durations | `src/app/lobby/page.tsx:905`; OppPlaysLog:266; BoardKey:37; GameOver:537; CardInsights:152; CardDetail:242; DockRow:151; dock/bits:82; puzzles/page:219; u/[username]:1750; glossary:97; settings/rows:582 | DisclosureChevron primitive on dur-1 ease-io | I | TODO | |
| F200 | low | Smooth scrolls ignore data-anim | `src/app/leaderboard/page.tsx:111`; `lobby/page.tsx:542`; `mod/page.tsx:86` | behavior: motionOff() ? 'auto' : 'smooth' | D, B, G | TODO | |
| F201 | low | Decorative infinite loops beyond the allowed ambient set (cta-shine, hall-mote, holo-sweep, draft-fx-pulse, dock-live, vault idle loops) | `src/app/globals.css:1225` (:2913); `DraftOverlay.css:349,:852,:1252`; `DraftVault.css:133-399` | Make decorative sweeps one-shot; document status indicators as allowed | I, J | TODO | |
| F202 | low | Dead motion CSS shipped (row-in, hover-lift, aura-breathe, Geometry Dash block, starfield family, draft-in, tv-frame backdrop rule) | `src/app/globals.css:1244` (:580, :566, :1176, :2744-2930, :877, :2163) | Delete blocks and their off-rules (confirm no runtime class names) | I | TODO | |
| F203 | low | GameOver unseal disarm depends on animationend, which never fires with motion off (unverified) | `src/components/GameOver.tsx:408` | Call onUnsealed immediately when motion is off, or timer fallback | J | TODO | |

### Motion, Tier B game moments (brief 6 Tier B)

| ID | Sev | Title | Where | Suggested fix | Slice | Status | Commit |
|---|---|---|---|---|---|---|---|
| F204 | high | GameOver choreography is silently skipped whenever a clock was under 20s at game end (every flag, most bullet endings): useReducedMotion never re-reads after subscribing, and ClockPill releases the hold first | `src/lib/useReducedMotion.ts:30` (:35), `ClockPill.tsx:155`, `GameOver.tsx:802` | Call update() right after subscribing (as useMotionTempo does); optionally release the hold in the end handler; Playwright 1+0 flag case asserting the victory burst | J | TODO | |
| F205 | medium | No settle beat between the final move and the GameOver overlay; check chime and game-over chime overlap | `src/components/OnlineMatch.tsx:3818` (:1226, :1231), `GameOver.tsx:995,:1040`, `game/page.tsx:2567` | Skippable 500-700ms x beat hold (0 when off); skip playCheck on terminal positions (proposal P-settle) | J | TODO | |
| F206 | medium | Takeback of a capture plays a conversion morph flourish and transform sound on the restored piece | `src/components/Board.tsx:1378` (:3239), `OnlineMatch.tsx:1284` | Tell Board the change kind (move, rewind, resync, reset); FX and sounds only for move (proposal P-rewind) | J | TODO | |
| F207 | medium | BoardSplash queue keys can collide and stall every later splash for the game; role=status conflicts with aria-live=assertive | `src/components/BoardSplash.tsx:61` (:83) | Monotonic counter ref for keys | J | TODO | |
| F208 | medium | Signature queue holds the board and draft overlay 2.6s per play even with animations off; eats into the draft decision budget | `src/components/effects/useSignatureQueue.ts:48`, `OnlineMatch.tsx:712`, `worker.ts:868` | Spacing from real spectacle length x fxDurationScale; busy false when off; cap deferral | J | TODO | |
| F209 | medium | Card-play layers desync at non-default effect duration: DOM delays and sound staggers are raw ms while durations and canvas scale | `src/components/Board.tsx:2163` (:2140); `BoardEffects.tsx:2785,:2809,:3132`; `cardEntrance.tsx:53`; `sounds.ts:981` | fxDelay(ms) helper; pass fxDurationScale into playSignature; guard on raw-ms animationDelay in wrapper files (proposal P-fxdelay) | J | TODO | |
| F210 | low | Low-time hold kills the clock separator blink, the sanctioned urgency motion, for the whole scramble | `src/app/globals.css:3222`, `settings.ts:636` | Exempt the separator from the hold (owner question Q27) | J + I | TODO | |
| F211 | low | Dead "sleek" cast tier leaves own tier 1-4 plays double-voiced | `src/components/Board.tsx:2942`, `BoardEffects.tsx:2665,:3027` | Delete sleek; decide the voicing rule (owner question Q28) | J | TODO | |
| F212 | low | Urgent clock tick is swallowed when both thresholds cross in one tick | `src/components/ClockPill.tsx:127` (:12) | Mark fired only when played | J | TODO | |
| F213 | low | Move sound and check tint land before the piece does (slide start, not landing) | `src/components/OnlineMatch.tsx:1225` (:949) | Delay voices by a fraction of --piece-anim-ms | J | TODO | |
| F214 | low | BoardSplash uses a glow text-shadow, hard-coded easings, fixed 2s, not --fx-dur scaled | `src/app/globals.css:1310`, `BoardSplash.tsx:84` | Drop glow; tokens; scale by --fx-dur or tempo | J | TODO | |
| F215 | low | Checked king glow (drop-shadow) and dead sq-check-pulse CSS | `src/app/globals.css:1437` (:1431, :1441) | Remove dead rules; owner decides whether the king glow is a sanctioned exception (Q36) | J | TODO | |
| F216 | low | Tier 8-10 casts dim the board to 50% and letterbox about three quarters of ranks 1 and 8 while clocks run (unverified durations) | `src/components/effects/BoardEffects.tsx:2812` (:2816, :3111) | Bars over the frame, cap dim when the viewer's clock runs | J | TODO | |
| F217 | low | Draft audio lands on the tell (vault mount), not the strike; flips and pick landing are silent | `src/components/DraftOverlay.tsx:942` (:1103) | Cue on tear-to-open and a soft tick on pocket landing | J | TODO | |
| F218 | low | Game-over chime replays after a hard reload of a finished game (module-scope Set) | `src/components/GameOver.tsx:650` | sessionStorage ledger or voice only live end frames | J | TODO | |
| F219 | low | Stun one-shot may replay on reconnect or spectator join (unverified) | `src/components/effects/fxZones.ts:52` | Seed the key on first observation | J | TODO | |
| F220 | low | ClockPill transitions paint properties on the Tailwind default | `src/components/ClockPill.tsx:176` | transition-opacity or none, dur-1 | J | TODO | |

### Motion, Tier C card effects (brief 6 Tier C)

| ID | Sev | Title | Where | Suggested fix | Slice | Status | Commit |
|---|---|---|---|---|---|---|---|
| F221 | high | godPlays tier-8 weight comes from a stale hardcoded flourish set: 7 T8 cards play at T7 weight, 6 lower-tier cards at T8 weight | `src/components/effects/godPlays.tsx:568` (:579, :841, :887, :1214) | Pass live tier (BUFF_BY_ID) into TemplateProps; heavy = tier >= 8; delete the set (same commit as F222) | K | TODO | |
| F222 | high | greatPlays TIER6 set is stale: 38 live cards play the wrong weight, T8 atomic_captures plays as a T5 scene, T2 cards play full great scenes | `src/components/effects/greatPlays.tsx:703` (:734, :5296) | Derive weight from live tier; T7-8 cards join the revamp worklist | K | TODO | |
| F223 | high | Mythic-ladder cards share one scene from T1 to T8; the variant is a single ring, disc or line (T8 fm_boon_worldheart plays like T1 fm_boon_lanternlight; from code, needs strips) | `src/components/effects/fantasyPlays.tsx:1309` (:1125, :1216) | Bespoke scenes for the T7-8 fm_* cards; structural variants for T1-4 | K | TODO | |
| F224 | medium | test:scene-complexity measures per-tier floors against a stale registry (351 tier drifts); registry marks all 2,452 entries keep and never fails when stale | `scripts/audit-scene-complexity.ts:440`, `scripts/audit-animations.ts:476`, `docs/animation-registry.json` | Import tiers from the engine library; freshness check in test:animations; regenerate in its own commit | K | TODO | |
| F225 | medium | basicPlays has no tier scaling; 22 live T5-T6 cards still ride tier 1-4 micro-templates | `src/components/effects/basicPlays.tsx:2127` (:2495) | Move to great-band or bespoke scenes; stopgap tier accent | K | TODO | |
| F226 | medium | boon and curse modules promise bespoke T7-8 scenes but three T7 cards ride templates (bw3_vantage_point, bw3_home_guard, hw3_doomed_vow) | `src/components/effects/boonPlays.tsx:20`, `cursePlays.tsx` | Bespoke scenes; keep header contracts true | K | TODO | |
| F227 | medium | God and great scenes (1.6-2.9s) play for T2-T5 cards, too long for the tier ladder | `src/components/effects/godPlays.tsx:2025` | Short cuts for tier 4 and below after F221/F222; timing strips before and after | K | TODO | |
| F228 | medium | /dev/plays cannot do Tier C step 1: fixed squares, white only, no speed or FX control, no URL params, no strip export, retired cards included | `src/app/dev/plays/PlaysGallery.tsx:87` (:114, :122, :284) | URL params (id, sq, target, side, dur, fx) and a Playwright strip script (proposal P-strips) | K | TODO | |
| F229 | medium | The winrate files named for frequency ranking contain no usage frequency (forced-injection sims, 10-12 pairs each) | `docs/card-winrate.targeted-2026-09-06.json:1`, `src/engine/draft.ts:56`, `src/lib/server/cardInsights.ts:21` | Rank by tier exposure now; production offered/picked counts when available (owner question Q29) | K | TODO | |
| F230 | low | Coverage tooling stale or unwired (comment says 13 modules, bespoke audit has no npm script and includes retired, July audit doc stale) | `scripts/check-vfx-coverage.cjs:23`, `scripts/audit-bespoke-coverage.cjs`, `docs/animation-audit-2026-07-17.md` | Fix comment, add alias with retired filter, mark the doc historical | K | TODO | |

### SEO and link previews (brief 18, 19)

| ID | Sev | Title | Where | Suggested fix | Slice | Status | Commit |
|---|---|---|---|---|---|---|---|
| F231 | high | Routes without their own canonical inherit canonical "/" (verified: /contact, /codex, /clubs/foo); /codex is a 0.9 sitemap entry | `src/app/layout.tsx:63`; `codex/layout.tsx:7`; `clubs/layout.tsx:5`; `tournaments/layout.tsx:5`; `contact/page.tsx:6`; `privacy-policy/page.tsx:5`; `terms-of-service/page.tsx:5`; `guidelines/page.tsx:5`; codex/build; history/[id] | Drop root canonical, set it on page.tsx only; self-canonical per route via a shared pageMeta() helper (proposal P-pagemeta); crawl guard | E (layout.tsx in wave 2) | TODO | |
| F232 | high | Pages without their own openGraph serve the homepage og:title and og:url (verified /guide/how-to-play, /contact, /clubs/foo); all guides, about, faq, tutorial, updates, leaderboard, tournaments, clubs, tv, community, achievements, guidelines | `src/app/layout.tsx:81`, `guide/nerf-mode/page.tsx:8` | Remove title/description/url from root openGraph; pageMeta() everywhere | E | TODO | |
| F233 | high | Child openGraph overrides drop og:image, og:site_name and og:type (verified /lobby, /u/someone, /puzzles/abc) | `src/app/lobby/layout.tsx:18`; `play/layout.tsx:21`; `codex/layout.tsx:20`; `puzzles/layout.tsx:18`; `puzzles/[id]/layout.tsx:19`; `u/[username]/layout.tsx:12` | pageMeta() emits full openGraph with images, or per-segment opengraph-image files; guard fails on missing og:image | E | TODO | |
| F234 | medium | twitter:title and description are the site defaults on pages that set openGraph | `src/app/layout.tsx:89` | Keep only card: summary_large_image in root twitter | E | TODO | |
| F235 | medium | Brand doubled in titles ("Contact \| Nerf Chess · Nerf Chess") and title case; no descriptions on contact, privacy, terms | `src/app/contact/page.tsx:7`; `privacy-policy/page.tsx:6`; `terms-of-service/page.tsx:6`; `guidelines/page.tsx:6` | Bare sentence-case titles, unique descriptions, guard on doubled brand | E | TODO | |
| F236 | medium | Codex card pages, /codex/suggest and /puzzles/[id] lose the brand suffix because nested layouts use string titles (about 2.5k one-word titles) | `src/app/codex/layout.tsx:8`, `puzzles/layout.tsx` | title: { default, template } in nested layouts | E | TODO | |
| F237 | medium | Duplicate titles and descriptions on dynamic routes; /u builds an indexable title for any string | `src/app/puzzles/[id]/layout.tsx:15`; clubs/[slug], tournaments/[id], inbox/[username], game/layout.tsx:6, history/[id]; `u/[username]/layout.tsx:5` | Server generateMetadata reading D1; notFound or noindex on misses | E (+ C for /u, D for clubs and tournaments) | TODO | |
| F238 | high | robots.txt disallows /game and /friend, killing link previews for the two most valuable cards on X (others unverified); /settings missing from DISALLOW | `src/app/robots.ts:11` | Allow unfurl bots on game and invite paths (keep noindex meta); add /settings | E | TODO | |
| F239 | high | No shareable invite URL exists and /friend?code= can never carry per-invite metadata | `src/components/FriendGame.tsx:390`, `src/app/friend/page.tsx:1`, `api/challenges/route.ts:79` | Path-based invite route with generateMetadata and OG plus a Copy invite link button (ADDITION, proposal P-invite) | E + D | TODO | |
| F240 | medium | Game-over Share omits the game URL, so shared results never unfurl a game card | `src/components/GameOver.tsx:926` (:918) | Include /game/{serverGameId} for online games | J | TODO | |
| F241 | medium | A live /game/[id] OG must not leak hidden nerfs; archive rows include nerf ids; no spectator-safe DO snapshot exists | `src/app/api/games/[id]/route.ts:18`, `worker.ts:1635,:1649` | OG from the finished archive with nerfs only when finished; spectator snapshot DO route (proposal P-snapshot) | E + H | TODO | |
| F242 | medium | No theme-color and no manifest | `src/app/layout.tsx:184` | themeColor media pair from --bg-base tokens; optional manifest.ts | E (wave 2) | TODO | |
| F243 | medium | Organization JSON-LD is thin (no sameAs, founder, member, contactPoint) and two nodes share `#game` with conflicting fields; src/lib/team.ts missing | `src/app/layout.tsx:151` (:110-133) | Merge game nodes; team.ts (names and titles only); sameAs from exported SOCIALS | E (wave 2) | TODO | |
| F244 | medium | Structured data gaps: no Article on guides, no HowTo on how-to-play, no ProfilePage, no Person on /about, BreadcrumbList only on guides and cards, no JSON-LD parse guard | `src/app/guide/shared.tsx:60`, `ui/Breadcrumbs.tsx:37`, `about/page.tsx` | Breadcrumbs emits BreadcrumbList; Article in GuideLayout; HowTo; ProfilePage; guard | E | TODO | |
| F245 | medium | Tutorial HowTo step URLs point at #modes, #rules, #cards, #win, none of which exist | `src/app/tutorial/page.tsx:38` (:45, :52, :59) | Add ids to visible sections; guard that fragments resolve | E | TODO | |
| F246 | low | Breadcrumb JSON-LD errors: /updates claims it lives under Guide; card crumbs repeat the /codex URL | `src/app/updates/page.tsx:79`, `guide/shared.tsx:60`, `codex/CardDetail.tsx:45` | BreadcrumbJsonLd takes a crumbs array; distinct section URLs | E | TODO | |
| F247 | medium | Sitemap: lastModified is always now; /terms-of-service, /guidelines, /analysis, /tutorial/first-game missing; hex/boon entries point at 404s | `src/app/sitemap.ts:21` (:31) | Real dates (git, updates.ts, D1 updated_at); add routes (owner questions Q11, Q34) | E | TODO | |
| F248 | medium | OG renderer uses Geist Regular only (no bold, not Noto Sans), no fallback on error, no Cache-Control, no incremental cache | `src/lib/ogCard.tsx:4` (:88, :162), `open-next.config.ts:3` | Bundle Noto Sans 400/700 subsets; try/catch to siteOgImage; s-maxage headers | E | TODO | |
| F249 | low | Codex OG alt text is generic for every card and tier colour is not carried | `src/app/codex/boon/[id]/opengraph-image.tsx:10` (and buff, nerf, hex) | Alt from card name; tier token hex | E | TODO | |

### Side end, guards and developer experience (brief 8)

| ID | Sev | Title | Where | Suggested fix | Slice | Status | Commit |
|---|---|---|---|---|---|---|---|
| F250 | medium | No CI; none of the 65 test:* guards run automatically | `package.json:16`, `playwright.config.ts:40` | .github/workflows/guards.yml (typecheck, lint, fast static guards, build) and an `npm run guards` aggregate; e2e job for test:cls, test:console, test:flash | L | TODO | |
| F251 | low | 55 package scripts use `npx -y tsx`, which the working rules forbid | `package.json:17` | Replace with `tsx` (npm run puts node_modules/.bin on PATH) in one mechanical commit | L | TODO | |
| F252 | low | .gitignore ignores .claude/ and CLAUDE.md, so no SessionStart hook or agent instructions can be committed; README is one line | `.gitignore:26`, `README.md` | Unignore .claude/settings.json and hooks; README quick start | L | TODO | |
| F253 | low | ws runtime dependency is only used by the legacy Node server; eslint-config-next 16.2.10 lags next 16.3.4 | `package.json:110`, `server/index.ts:11` | ws to devDependencies (or retire server/, proposal P-legacy); align eslint-config-next | L | TODO | |
| F254 | low | No UI to see, change or remove the account email | `src/components/settings/config.ts:353` | Account row with masked email and an email preference column (section 17 addition) | C + L | TODO | |
| F255 | low | Local dev fetches the production arena host `https://arena.nerfchess.com/lobby` (blocked in sandbox, console error on 5 routes) | harness console baseline; arena lobby client config | Point dev at a local or disabled arena lobby | H | TODO | |
| F256 | low | Every signed-out route logs `GET /api/users/settings` 401 as a console error (2 settings calls per load) | harness console baseline; `src/lib/settings.ts` pull | Skip the pull when signed out (session store from F001) or return 204 | A | TODO | |


## PROPOSALS

Structural ideas that are NOT being built in this pass (brief 0.1) or that change a public API or schema and need a decision first. Evidence is the finding they come from; screenshots are added when a slice picks one up.

| ID | Proposal | Evidence | Decision needed from |
|---|---|---|---|
| P-session | Server-resolved session vs cookie hint. Reading `dc_session` in the root layout makes every route dynamic on OpenNext (no static HTML, a D1 lookup per navigation). The middle path keeps pages static: a non-httpOnly display cookie `dc_me` (auth state, username, avatar id, role, isGuest; no secrets) set on login, register, guest mint, rename and logout, stamped pre-paint on `html[data-auth]` so CSS reserves the exact header slot, plus one deduped client store. Both kill the class. | F001, F010, section4-before evidence | Owner (Q1) |
| P-prepaint | One synchronous head script for every persisted UI preference (settings, rail width and collapse, last mode, tour flag), sharing a pure computeHtmlStamp() with applyUiPrefs. | F002, F006, F008, flash baseline | Slice A can build it (no layout change); listed for visibility |
| P-me-ratings | Put the mode ratings in the `/api/auth/me` payload (or session context) so HeroRatings and QuickMatch drop a serial fetch and the "?" flicker. | F004, F005 | API shape: slice A + F |
| P-u-server | Server wrapper for `/u/[username]` that loads the user row and viewer session, calls notFound(), and passes initial props. | F011, F021, F030, F237 | Owner (restructures data flow) |
| P-detail-server | Same for `/clubs/[slug]` and `/tournaments/[id]`: server page with notFound(), client island for polling. | F022, F031, F014 | Owner |
| P-tabs | Profile box tabs and login segmented pair vs the design-system underline Tabs. | F145, design-system.md:94 | Owner or design call |
| P-skel | One shared delayed Skeleton primitive (150ms show delay, minimum duration) plus ListRowSkeleton and a row hover class using --bg-raised. | F026, F151 | API decision (slice B owns Skeleton.tsx) |
| P-nav | Unify the hand-rolled top nav on /tutorial/walkthrough, /codex/suggest and /history/[id] with SiteHeader. | F132 | Owner (chrome change on three pages) |
| P-header-360 | At 360px move challenges and bell into the account menu, or hide the wordmark text below a threshold. | F153 | Owner if structural |
| P-settle | End-of-game settle hold before GameOver mounts. | F205 | Owner (ending choreography) |
| P-rewind | Board receives an explicit position-change kind (move, rewind, resync, reset). | F206 | Slice J (internal API) |
| P-fxdelay | fxDelay(ms) helper plus a guard banning raw-ms animationDelay in wrapper files; later ratchet across about 2,828 Tier C sites. | F209 | Slice J then K |
| P-soundsync | Extend test:sound to assert signature voice staggers equal staggerMs and receive fxDurationScale. | F209 | Slice J |
| P-motionconfig | Root MotionConfig driven by data-anim, plus src/lib/motion.ts presets and CSS utilities (.m-pop-in, .m-toast-in/out, .m-modal-in, .m-list-in). | F186, F195, F196 | Slice I |
| P-tailwind-tokens | Map Tailwind transition defaults (DEFAULT, 150, 200, 300, ease) onto --dur and --ease tokens (about 240 call sites in one change). | F188 | Slice I |
| P-tempo | `--tempo` custom property folded into --dur-1..3 so `data-anim=fast` reaches keyframes and framer. | F187 | Slice I + A |
| P-motion-guards | check-anim-props scans transitions and TSX layout-property transitions and transition-all; a new guard bans motion-safe/motion-reduce and OS media queries outside an allowlist; check-reduced-motion flags ungated motion.*; check-shadows guard. | F161, F186, F190, F191, F192 | Slice I |
| P-tier-weight | Animation weight is a function of the live tier, not a flourish table. Whether runtime mod tier overrides should move animation weight is open. | F221, F222 | Owner (Q30) |
| P-registry-gate | test:animations fails on a stale committed registry; scene-complexity reads engine tiers; regenerate with reason (351 drifts). | F224 | Slice K |
| P-strips | /dev/plays URL params and a Playwright strip script at dur 0.5, 1, 2 and both sides, excluding retired cards. | F228 | Slice K |
| P-req-guard | Central request guard: same-origin on non-GET, JSON content type, plain-object body, optional guest ban, body size cap. | F046, F047, F065 | Slice F |
| P-ratelimit | Shared rateLimit(db, key, max, windowMs) on login_attempts for challenges, tournaments, entry, games/bot, desync, tv-telemetry, suggest, friends, clubs, posts, register. | F057-F063, F066, F070 | Slice F |
| P-text | src/lib/textInput.ts (NFC, strip \p{Cf}, code-point cap, profanity policy per field) and shared clock bounds in src/lib/speed.ts; replace every `.trim().slice(`. | F052, F053, F054, F078 | Slice F + H |
| P-msg-page | before= and since= params on GET /api/messages/[username]. | F072, F108 | API shape |
| P-notif | Dedicated 'friend' NotificationType plus migration of href='/friend' rows. | F075 | Schema |
| P-club-icon | Serve uploaded club icons from /api/clubs/[slug]/icon with immutable caching. | F104 | API shape |
| P-idx | Migrations: reports(reporter_user_id, created_at), sessions(expires_at), users(created_at), users(is_guest, created_at); scheduled prune of sessions and login_attempts. | F095, F109, F125 | Schema |
| P-house-predicate | One HOUSE_PREDICATE (hp_, seed_) and real-user predicate across leaderboard, search, community/active, stats, analytics, mod overview. | F117, F118, F119 | Slice G |
| P-metrics | src/lib/server/metrics.ts plus cached /api/mod/metrics: accounts, guests, with email, signups series, DAU/WAU/MAU with written definitions, online now, peak today, games per day by mode and human vs bot. | F117, F118, F125 | Slice G (section 16) |
| P-online | Real online and peak counters in the DO; public number equal to the mod number, or no number. | F114, F125 | Owner (Q4) |
| P-audit | Generalise mod_actions (nullable target, target_kind, target_ref, reason, before/after JSON) so every mutation is audited and settings can be reverted. | F116, F123, F124 | Slice G (schema) |
| P-mod-triage | Reports triage in place: inline transcript and replay, one-click sanctions, j/k/r/d/x shortcuts, bulk resolve, required note. | brief 15 | Owner (Reports layout change) |
| P-mod-drawer | Player context drawer: recent games, reports against and by, prior actions, account age, guest, email present, last seen. Linked-account signals need new data collection. | F115 | Owner for linked accounts (Q16) |
| P-mod-push | Internal DO route the mod API calls after mute, ban or rename. | F081 | Slice H + G |
| P-mod-tourney | Moderator hide/delete for tournaments (needs a column). | F060 | Schema |
| P-tourney-sched | Drive tournament rounds from a DO alarm or cron instead of GET polling. | F107 | Protocol change |
| P-tourney-withdraw | Soft-withdraw flag for running tournaments. | F074 | Schema |
| P-pg-index | Postgres index games(category, completed_at DESC) if EXPLAIN shows a scan. | games/recent?mode | Slice F with plan evidence |
| P-socket-budget | Per-session and per-IP token bucket, frame-size check, open-challenge cap in the DO. | F067, F068 | Slice H (no protocol change) |
| P-cron | `triggers.crons` in wrangler.jsonc plus `scheduled()` in the worker default export for the daily email and rollups. | F098, brief 17 | Owner for time (Q23) |
| P-err-count | Count errors in D1 site_counters (desync, CSP report, RouteError) for the daily report; plus a CSP report endpoint. | F093, F044 | Slice L + G |
| P-legacy | Retire the legacy Node server (server/index.ts) so ws can leave dependencies; confirm arena and engine services do not depend on it. | F253 | Owner |
| P-fuzz | Client/server parity fuzz harness (scripts/fuzz-parity.ts): random moves, drafts, buff activations; assert position hash, legal-move signatures, replay and serialize round trips, spectator hash. Needs the DO masking helpers extracted into a pure module first. | brief 14 | Slice H |
| P-replica | Extract buildGameFromStart out of OnlineMatch.tsx into src/lib so scripts can import it. | brief 14 | Slice J + H |
| P-block | User blocking (DMs, challenges, friend requests). Does not exist. | brief 14 | Owner (Q32) |
| P-pagemeta | One pageMeta({title, description, path, image}) helper for every route, plus a crawl guard for duplicate titles, canonical mismatch, missing og:image and unparseable JSON-LD. | F231-F237 | Slice E |
| P-invite | Path-based invite route (/friend/[code] or /c/[code]) with generateMetadata and OG, plus Copy invite link in FriendGame. | F239 | Slice E + D (addition) |
| P-snapshot | Spectator-safe GET /game-snapshot?id= in the DO for live game OG (no nerfs, no owner-only draft actions). /history/[id] is localStorage only and should share /game/<serverGameId>. | F241 | Slice H + E |
| P-guide-links | Visible breadcrumbs on guides, Article and HowTo JSON-LD, cross-links between codex cards and guides. | F244 | Slice E |

## ADDITIONS

New things built in this pass, each with its justification. Planned rows are listed so no slice builds them twice.

| ID | Addition | Justification | Status |
|---|---|---|---|
| A-harness | Measurement harness in `scripts/polish/` (test:cls, test:console, test:flash, polish:seed, polish:matrix, polish:strip, polish:section4, polish:axe) and `e2e/polish/clsProbe.ts` | Brief 3: evidence for every DONE; ratchet guards so fixes stay fixed | DONE (commits dc97ad0, 9a460cb, 8607337, e776041; evidence `docs/polish-pass/evidence/`) |
| A-session | SessionProvider and useSession with one in-flight /me promise | Root cause of F001, F010 and every late-auth sibling | TODO (after Q1) |
| A-prepaint | Pre-paint head script | F002, F006, F008 | TODO |
| A-sec4-spec | e2e section 4 spec asserting header box stability and CLS under 0.01 per auth state | Brief 4; the CLS API barely scores the chip swap | TODO |
| A-metrics | /api/mod/metrics and the mod stats panel (section 16) | F117, F118, F125 | TODO |
| A-audit | Full mod audit log | F116 | TODO |
| A-email | Daily job: welcome email to new sign-ups with an email, founders' report, email preference, unsubscribe (section 17) | Brief 17 | TODO (owner questions Q21, Q22, Q23, Q26) |
| A-invite | Shareable invite link with an OG card | F239, brief 19 | TODO |
| A-team | src/lib/team.ts and team section on /about with Person JSON-LD, footer credit | Brief 18 | TODO |
| A-guards | check-shadows, motion guards, codex 200 guard, metadata crawl guard, JSON-LD parse guard, CI workflow | F028, F161, F231, F250 | TODO |

## INTEGRATOR DECISIONS

Defaults the integrator took so work is not blocked. Each one is reversible and the owner can overrule it in OWNER QUESTIONS.

| Q | Default taken | Why |
|---|---|---|
| Q1 | Server knows the user before render via a small non-httpOnly display cookie (`nc_who`: username, avatar key, role, guest flag, signed by nothing and trusted for nothing but layout). The root layout reads it with `cookies()` and passes it to a SessionProvider, so the first paint has the final header shape. `/api/auth/me` stays the authority and corrects the hint. No D1 lookup per page. | Brief section 4 wants the server to know who you are; a D1 read per page view costs TTFB on every route, a hint cookie costs nothing and cannot grant access. |
| Q4 | OWNER ANSWERED 2026-09-23: keep the bot padding and the public online figure exactly as they are (see OWNER DIRECTIVE 2). | Owner decision. |
| Q5 | Human counts exclude house bots (is_bot / hp_ prefix), seed_ and polish_ prefixes. Written next to every number. | Brief 16 exclusion rule. |
| Q7 | The privacy policy is rewritten to match what is actually collected and what email is sent; the date is bumped. Owner signs off before merge. | Brief 17.3 requires it and the current text is false (F175). |
| Q2, Q3 | Guest behaviour unchanged. Counts report guests separately and exclude guests with zero games from active-user numbers. | Business decision; counting can be honest without changing it. |
| Q14 | Unchanged role model. Safest fix only: the usernames in ADMIN_USERNAMES become reserved (cannot be registered or renamed into). | Security fix without changing who is admin. |
| Q20 | /healthz keeps `ok` and `version`, drops the stack and error text from the public response (logged instead). | Safest change for an information leak; no new secret needed. |
| Q21-Q23 | Email ships dormant: sends nothing until RESEND_API_KEY, EMAIL_FROM and FOUNDER_REPORT_EMAILS are set. Cron `0 13 * * *` (9am EDT). Mailing address is an env var (EMAIL_MAILING_ADDRESS); without it the welcome email is not sent (CASL). | Nothing breaks before the owner sets it up. |
| Q10, Q12 | Copy spelling and card counts left as they are, except where a number is provably wrong in the same sentence. | Brand decision. |
| Q37 | No proposal is built. | Brief rule 0.1. |

Fleet mechanics (wave 1 on): agents share the main working tree with disjoint file ownership (SLICES), so the one supervised dev server shows everyone's work and evidence is real. Heavy commands go through `scripts/polish/heavy.sh` (two box-wide slots). Commits go through `scripts/polish/commit.sh "msg" paths...` (commits only the named paths, under a lock). Per-slice ledger updates go to `docs/polish-pass/slices/<slice>.md` and the integrator folds them into this file, so no two agents edit the ledger at once.

### OWNER DIRECTIVE 2026-09-23: card effects are card-specific

The owner asked for many card effects to become specific to each card, not generic board effects. This overrides the default "NO-CHANGE if already fine" bar for Tier C: a card play is weak if it could belong to another card. Every revamped play must show what that card actually does (the pieces and squares it touches, the rule it bends) through a motif unique to its name and theme (a walnut court looks like walnuts and a court, a winter court freezes the squares it names). Generic rings, sparks, flashes, pulses and whole-board washes are not a card's effect; they may be a small accent at most. Shared templates (GodDescent on 9 cards, GorgonIdol on 6, CelestialRing on 6, the mythic ladder's 3 scenes for 24 cards) get split into per-card scenes. The contract still holds: transform and opacity, no glow, no shadow, no blur, tokens, data-anim and reduced-motion gates, --fx-dur, the scene-complexity and anim-props guards, board legible throughout.

Tier C is now worked by a dedicated lane (slices TC0 and TC-*, see SLICES). Slice K's ownership is NARROWED to: `scripts/audit-animations.ts`, `scripts/audit-scene-complexity.ts`, `scripts/check-vfx-coverage.cjs`, `scripts/audit-bespoke-coverage.cjs`, `docs/animation-registry.json`, and the families `effects/passive/*`, `effects/fruition/*`, `effects/clockraid/*`, `effects/vfx/*`, `effects/impact/*`, `effects/board3d/*` and the small plugin modules (casino, funny, gambling, meme, prank, stub, creator, personal). This row overrides any wider list in slice K's prompt. Slice K applies the card-specific directive to its families too.

### OWNER DIRECTIVE 2026-09-23 (2): the house bots and the online count stay as they are

The owner answered Q4: the bot personas and the padded public "players online" figure are intentional (they make the site feel alive) and must NOT be removed or reduced. This overrides INTEGRATOR DECISIONS Q4, brief section 16's "never inflate a public count", and any text in a slice prompt that says otherwise:

- Slice H: do NOT change the public online count, the idle bot personas, the synthetic curve, the filler, or how bots appear in the lobby, TV or counts. F114 is DROPPED (owner decision). You may still expose an additional internal field with the real human count for the mod panel, as long as every public number is unchanged.
- Slice G: the mod panel may show the real human numbers (clearly labelled "humans") next to the public figure, which stays as it is. Analytics exclusion of house bots (F117) is internal and still fine to fix, but do not change any public-facing number.
- Slices B, D, E1, E2: do not change how the online figure, bot players or bot games are presented publicly.
- House bots are to be IMPROVED, not reduced: a dedicated slice (HB) will work on bot quality (play, card use, timing, variety, reliability) after slice H finishes with worker.ts. Until then no slice changes bot behaviour.

House-bot ownership (added with OWNER DIRECTIVE 2): slice HB now owns `src/lib/server/bots.ts`, `src/engine/ai.ts`, `engine-service/*`, `arena-service/*`, `docs/house-bots.md` and the house-bot scripts (`scripts/audit-house-bots.ts`, `scripts/sim-house-bots.ts`, `scripts/test-house-snap.ts`, `scripts/gen-house-pfps.mjs`, search-buff and search-bias scripts). Slice H keeps `worker.ts` (including the bot orchestration code in it), `src/lib/multiplayer.ts`, the other `src/lib/server` realtime files and the rules files in `src/engine/*` other than `ai.ts`. HB sends worker.ts changes to H or the integrator as REQUESTS. This overrides slice H's prompt list.

## OWNER QUESTIONS

Decisions only the owner can make (secrets, business decisions, PROPOSALS). Work that does not depend on them continues. Answer inline here.

| ID | Question | Blocks |
|---|---|---|
| Q1 | May every page become dynamically rendered (per-request D1 session lookup, no static HTML cache on Cloudflare) so the server knows the user before render? Or keep static pages and use a non-httpOnly display cookie (username, avatar, role, guest flag) as a pre-paint hint? | F001, P-session |
| Q2 | Should a guest account be minted on every page view by a signed-out visitor (today, crawlers included), or only on engagement (lobby, queue, play)? This changes user counts. | F064 |
| Q3 | Should guests be allowed to send DMs and friend requests, create and post in clubs, file reports, send suggestions, create tournaments and send direct challenges? Today all are allowed and one IP can mint 30 guests per 15 minutes. /community tells guests to sign in for some of these. | F065, F060, F059 |
| Q4 | The public "N players online" is padded by about 150 idle bot personas and a synthetic 350-800 curve. Brief 16 forbids inflating it. Real human count, humans plus seated bots labelled, or no number? | F114, P-online |
| Q5 | Are there test accounts (by username or id) to exclude from human counts? No marker exists beyond the hp_ and seed_ prefixes. | F118 |
| Q6 | Is Turnstile set in production (TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITEKEY at build)? If not, registration has no bot check. Should it also cover guest minting, anonymous suggestions and repeated login failures? | F062, F057 |
| Q7 | The privacy policy says no email is collected, but register, Google sign-in and the suggest form do; Turnstile, Resend and Apps Script are not disclosed; the daily email needs coverage. May we rewrite "Information we collect" and "Cookies and third parties" and bump the date? Who signs off legal text? | F175, A-email |
| Q8 | There is no account-deletion flow. Do you want one? It also decides whether "deleted user" is an edge state profiles and history must handle. | brief 5.3 |
| Q9 | Banned accounts: should /u/<name> show a "suspended" state (and hide Challenge, Add friend, Message), look normal, or 404? | F034 |
| Q10 | Canonical brand spelling in copy: "NerfChess" (DESIGN.md, 21 uses) or "Nerf Chess" (title template, TV)? | F176, SEO copy |
| Q11 | Should the terms of service, privacy policy and guidelines be in the sitemap and indexable? | F247 |
| Q12 | What is the real current card count for public copy (brand OG says 2,400+, codex 1,000+ and 400+; 1,665 live cards counted)? | F173 |
| Q13 | Is MOD_WEBHOOK_URL set in production? If not, every non-sanction mod action leaves no record anywhere until F116 lands. | F116 |
| Q14 | Rating editor, house editor and god-panel powers are tied to the usernames "ilovenewjeans" and "ruylopezsolos", and ADMIN_USERNAMES promotes by username at login. Do both accounts hold role admin in production? May we gate by immutable user id (please supply the ids) and reserve the names? Should the rating editor keep the right to edit its own and admins' ratings? | F043, F045, F123 |
| Q15 | Is NERFCHESS_ANALYTICS_KEY set, and does the nerfchess-tracker dashboard depend on today's bot-inflated active-user numbers? Fixing them will make the figures drop. Should "users" exclude guests and house accounts? | F117 |
| Q16 | May we start recording hashed IP and device signals for linked-account detection? New personal data, needs a privacy-policy change. | P-mod-drawer |
| Q17 | Should mutual friends be shown when a player's friends list is private (friends route does, profile route does not)? | F094 |
| Q18 | Are rated custom challenges intended? The protocol doc and games.ts say only queue games are rated. | F080 |
| Q19 | Should spectator chat require a signed-in account? Anonymous sockets (including banned users) can post today. | F069 |
| Q20 | Should the public /healthz keep exposing error text and stacks, or be token-gated (new HEALTHZ_TOKEN secret)? | F050 |
| Q21 | Email sender: which verified sending domain and From address for Resend (for example hello@nerfchess.com)? SPF and DKIM records must be added in Cloudflare DNS. Are RESEND_API_KEY and SUGGESTIONS_EMAIL already set in production? | A-email, F100 |
| Q22 | CASL requires a mailing address and contact details in every email. Which mailing address (or PO box) and public contact email? The same email would go in the Organization contactPoint. | A-email, F243 |
| Q23 | What time should the daily email go out? Crons run in UTC ("0 13 * * *" is 9am EDT, 8am EST). | P-cron |
| Q24 | Is a 0+N time control (increment only) meant to exist? The APIs accept it but the worker runs it untimed. | F079 |
| Q25 | Should a signed-in player be able to take over their own live seat from another device (account-based reclaim), or is the per-device seat token the intended model? | F084 |
| Q26 | Stored emails are unverified. Is it acceptable to send the welcome email to an unverified self-entered address, or should the welcome email double as a confirmation? | A-email |
| Q27 | The low-time animation hold is a fixed 20 seconds for every time control. Should it scale with the time control (1/8 of starting time, clamped) like the clock colours? Should the clock separator blink be exempt? | F210 |
| Q28 | Your own tier 1-4 card plays get two sounds (card-use chime, then cast voice on confirm). Both, or one? | F211 |
| Q29 | Can the fleet read real per-card offered and picked counts and the buff/nerf game split from production (codex insights blob or a D1 read)? The committed winrate files carry no frequency. | F229 |
| Q30 | When a moderator overrides a card's tier at runtime, should its animation weight follow the runtime tier or the code tier? | P-tier-weight |
| Q31 | The brief says every motion is multiplied by --fx-dur, but Settings labels it "Card effect duration" and no chrome reads it. Should menus, toasts and modals stretch with that slider, or follow only the data-anim tempo? | F187, F188 |
| Q32 | Do you want a user-blocking feature (DMs, challenges, friend requests)? The brief's social bug hunt assumes one; none exists. | P-block |
| Q33 | HSTS carries preload with includeSubDomains. Is nerfchess.com on the preload list, and are all subdomains (arena, engine, pgdb) HTTPS-only? | next.config.mjs:68 |
| Q34 | Should public player profiles be in the sitemap and indexable (guests and possibly minors' usernames), and may their OG image show the avatar? | F247, brief 19 |
| Q35 | Is discord.gg/a5bJYFrTx a permanent invite suitable for Organization sameAs, or should a vanity link be used? | F243 |
| Q36 | Is the checked-king glow (an owner request per the code comment) a sanctioned exception to the no-glow rule? If yes it gets recorded in design-system.md. | F215 |
| Q37 | Several proposals change page structure (P-u-server, P-detail-server, P-tabs, P-nav, P-header-360, P-settle, P-mod-triage). Which may be built? | PROPOSALS |

## ENV AND SECRETS

What must be set outside the repo. "Status" is what the repo can tell; production values are unknown to the fleet.

| Name | Kind | Used by | Needed for | Status |
|---|---|---|---|---|
| TURNSTILE_SECRET_KEY | secret | `src/lib/server/turnstile.ts` (fail-open when unset) | Bot check on register (and more per Q6) | Unknown in prod (Q6) |
| NEXT_PUBLIC_TURNSTILE_SITEKEY | build-time var | `src/app/login/page.tsx` | Turnstile widget | Unknown (Q6) |
| RESEND_API_KEY | secret | `api/suggest/route.ts`, planned `src/lib/server/email.ts` | Suggestion email, welcome email, founders' report | Unknown (Q21) |
| SUGGESTIONS_EMAIL | var | `api/suggest/route.ts` | Suggestion email recipient | Unknown (Q21) |
| EMAIL_FROM (new) | var | planned email module | Verified From address | To set after Q21 |
| FOUNDER_REPORT_EMAILS (new) | var | planned daily job | Founders' report recipients (comma list) | To set |
| Sending-domain DNS (SPF, DKIM, optionally DMARC) | DNS | Resend | Deliverability | To add after Q21 |
| MOD_WEBHOOK_URL, MOD_WEBHOOK_TOKEN | var (empty in wrangler.jsonc) / secret | `src/lib/server/modWebhook.ts` | Mod event Google Sheet | Empty in repo (Q13) |
| NERFCHESS_ANALYTICS_KEY | secret | `api/analytics/summary` | Tracker connector | Unknown (Q15) |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | var / secret | `api/auth/google/*` | Google sign-in | ID in wrangler.jsonc; secret outside repo |
| HOUSE_ENGINE_TOKEN | secret | worker, engine-service | House move search | Outside repo |
| ARENA_INGEST_TOKEN | secret | worker `/arena/*`, `api/arena/end`, arena-service | Arena ingest | Outside repo |
| ADMIN_USERNAMES | var (wrangler.jsonc:25) | `api/auth/login` | Admin bootstrap (see F043, Q14) | Set in repo |
| GAME_SERVER_ORIGINS | optional var | `worker.ts:1931` | Extra socket origins | Not set (same-origin only) |
| HEALTHZ_TOKEN (new, optional) | secret | planned /healthz gate | Hide stack and error detail | Only if Q20 says gate |
| CRON_SECRET (new, optional) | secret | planned internal cron route | Only if scheduled() calls a Next route (F098 option b) | Only if chosen |
| CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID (optional) | secret | planned founders' report | Error counts from Workers Logs | Only if chosen over P-err-count |
| POLISH_SEED_PASSWORD | local env | `scripts/polish/seed.ts` | Local seed accounts (default `polish-local-only-7`) | Local only, never production |

## SESSION LOG

### 2026-09-23, wave 0 (orientation, harness, scouting)

Done:
- Harness built and committed (A-harness): 4 commits on top of a6911a9 (dc97ad0, 9a460cb, 8607337, e776041). Section 4 sign-in bump measured before any fix (`evidence/section4-before/`). CLS and console ratchet baselines locked on the core routes (17 of 32 CLS cells above 0.01 recorded as ceilings; 36 known console signatures). Flash baseline shows the light theme repaints 99-100% of the viewport after hydration.
- Twelve read-only scouts covered: core loop and the sign-in bump, account routes and draft surfaces, social routes, content routes, mod panel and counting, API group A, API group B, realtime backend, Tier A chrome motion, Tier B game moments, Tier C card effects, SEO and link previews, side end and email readiness, engine and online-play bug hunt.
- This ledger written: 66 routes, 26 Tier A families, 26 Tier B moments, 13 ranked Tier C families plus a 30-card worklist, 33 backend rows, 256 deduplicated findings (F001-F256), 49 proposals, 37 owner questions, env and secrets table, and file-ownership slices A to L.
- Finding severity: critical 1, high 28, medium 111, low 116.
- Harness problems noted: signed-out cells behave like guests (guest minted on load) and add guest rows to the local D1; dev calls the production arena host (F255); online /game/[id] cannot be measured under next dev (no DO); dev bundles are unminified and strict mode doubles /me counts.

Next (wave 1, per brief 20 order):
1. Slice E fixes F028 (hex and boon 404s) first: critical and small.
2. Slice A starts the section 4 root cause (F001, F002, F010) with the pre-paint script (no owner answer needed) and the shared session store; the server-vs-cookie choice waits on Q1 but the store and pre-paint work do not.
3. Security fixes that need no decision: F041, F042 (open redirects), F044 (CSP img-src), F047 (null body), F072 (message window), F082 (two-tab loop).
4. Route slices B, C, D, E take their high and medium rows; I builds motion primitives and guards; J takes F204 and F205; K lands F221 and F222 and the strip harness before any per-card revamp; G builds metrics.ts and the audit log migration.
5. After the first integrated wave is green: open the PR, rerun test:cls with `--update`, rerun the matrix, and start wave 2.
