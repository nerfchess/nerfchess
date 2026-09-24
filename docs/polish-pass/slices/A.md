# Slice A (session, pre-paint, auth), wave 1

Owner: slice A agent. Ledger updates for the integrator to fold into `LEDGER.md`.
Evidence: `docs/polish-pass/evidence/A/`.

Commits: `8b1c3ec` (auth routes and /login), `b1f33ae` (session store, pre-paint, header consumers), `c3fd1da` (cross-site refusal on auth writes), `6ffadfe` (section 4 spec and evidence), `a7cbfdb` (auth routes switch to slice F's shared request guard), plus the evidence commit that carries this file.

## How the section 4 root cause was fixed (F001, F002, F010)

Decision Q1 as taken by the integrator:

- `nc_who` display cookie (`src/lib/session/who.ts`): `v1.<g|u>.<role>.<username>.<avatar>`, closed charsets, 90 day life like the session, not HttpOnly, SameSite=Lax, Secure when the session is. Trusted for layout only; role-gated menu rows still wait for the real `/me` answer.
- Stamped by every auth route that changes who the session is: login, register (new and guest upgrade), guest mint (and the "already signed in" branch), Google callback, rename, avatar; cleared by logout. `/api/auth/me` re-stamps whenever the hint the browser sent disagrees with the account (renamed, promoted, banned, signed out elsewhere, or a session from before the cookie) and clears it when there is no session.
- `src/app/layout.tsx` is now `async`, reads `dc_session` presence, `nc_who` and `nc_mode` with `cookies()` (no database read) and passes them to `SessionProvider` (`src/lib/session/SessionProvider.tsx`).
- One client store (`src/lib/session/store.ts`, `useSyncExternalStore`); `authClient.fetchMe` shares one in-flight request and publishes every answer; login and register load the new account (the old one stays on screen until it lands) and logout resets to signed out. `useSession({ ensure })` returns `user` (the /me answer) and `display` (user, else the server hint). `SiteHeader`, `MobileNavMenu`, `AchievementToast` and `SettingsBootstrap` read it; none of them calls `/me` on its own any more.
- Pre-paint script (`src/lib/session/prePaint.ts`), first script in `<head>`, `suppressHydrationWarning` on `<html>`: stamps `data-theme`, `data-light`, `color-scheme`, the seven accent properties, `data-anim`, `--piece-anim-ms`, `data-zen`, `--board-cap`, `--piece-fit`, `--fx-dur`, board square colours, piece fills and images, `data-piece-source`, custom background, and `--match-rail-w` from `dc:settings-v1` and `dc:rail-width`. `scripts/check-prepaint.ts` runs the script and the TypeScript `applyUiPrefs` path against 437 stored blobs x 2 media states plus rail and blocked-storage cases and fails on any difference (875 cases, 0 failures; a one-character drift makes 168 fail).

Cost to know about: reading cookies in the root layout makes every page render per request (the codex card pages lose their prerender). There is no database read on that path. The integrator should run `next build` at integration to confirm the route table (not run here: a build in the shared tree would fight the supervised dev server). See PROPOSALS P-A-static.

## ROW UPDATES

| Row | Status | Evidence | Commit | Note |
|---|---|---|---|---|
| F001 | DONE | `evidence/A/signin-bump-after.txt` (10 of 10 cells, header one shape), `evidence/A/signin-bump-control-without-hint.txt` (same spec with `nc_who` removed: chip 175 to 309px, left 1088 to 953, the original bump), `evidence/section4-before/` | b1f33ae, 8b1c3ec, 6ffadfe | Display cookie + SessionProvider + one in-flight /me, per decision Q1. Header, mobile menu, toast and settings bootstrap moved to `useSession`. The 175 to 310px chip swap measured in wave 0 no longer happens on any section 4 route at 1280x800 or 390x844 under Fast 3G + 4x CPU. Pages that still call fetchMe themselves share the one request but keep their own late state (list below, wave 2). Two cases keep a placeholder by design: a brand-new visitor (no session cookie; the header mints a guest, decision Q2 keeps that behaviour) and a session from before this deploy (no `nc_who` yet; the first `/me` stamps it, so it happens once per browser). |
| F002 | DONE | `evidence/A/browser-checks-after.json` (`F002_F008.atDOMContentLoaded`: theme light, data-light on, anim fast before hydration), `scripts/check-prepaint.ts` output 875/0 | b1f33ae | Pre-paint stamp shares its data tables with settings.ts and is held to it by the parity check. `test:flash` at 390x844 signed in (`evidence/flash/A-after/flash.json`, against the wave 0 baseline in `evidence/flash/baseline-2026-09-23/`): light theme, share of the viewport that changes between DOMContentLoaded and settled, `/` 99.3% to 7.9%, `/lobby` about 100% to 11.4%, `/play` about 100% to 6.4%; dark `/` 43.6% to 1.2%, `/play` 22 to 24% to 6.5%. What is left is page content arriving (route slices). `/profile` and the bot game cells were lost to dev server restarts in that run. |
| F008 | PARTIAL | `evidence/A/browser-checks-after.json` (`--match-rail-w: 400px` on `<html>` at DOMContentLoaded) | b1f33ae | Width: stamped pre-paint, `useRailWidth` no longer sets an inline width after mount (drag writes the same `<html>` property). Rail-collapsed (`OnlineMatch.tsx:396`) is slice J's file: see REQUESTS. |
| F010 | DONE | `evidence/A/browser-checks-after.json` (`F140.firstFocus` shows the signed-in name in the mobile menu), `F256_and_me_count` | b1f33ae | Same fix as F001: the mobile menu and toast follow the shared store, so a guest minted by the header shows everywhere. QuickMatch is slice B's (list below). |
| F006 | PARTIAL | `evidence/A/browser-checks-after.json` (`F006`: server HTML of /play preselects Nerf with `nc_mode=nerf`, Buff without) | b1f33ae | Mode half: `savePreferredMode` writes `nc_mode`, the layout reads it, `useSharedMode` starts from query > cookie > Buff on the server and the client, and migrates an old localStorage choice once. The tour nudge half is slice B's (`play/page.tsx`). |
| F016 | PARTIAL | code only | 8b1c3ec | The Turnstile slot reserves `min-h-[65px]` (the documented height of the standard widget). Not browser-verified: no sitekey locally. |
| F019 (/login) | DONE | `curl /login` SSR carries the header and the form (was an empty body); `e2e/polish/signin-bump.spec.ts` drives the server-rendered form | 8b1c3ec | `/login` is a server page that reads `searchParams` and renders `LoginForm` with props; no Suspense bailout. |
| F041 | DONE (SECURITY) | `evidence/A/F041-F042-old-next-check.json`, `evidence/A/auth-safety-after.txt` | 8b1c3ec | `src/lib/safeNext.ts` (`safeNextPath`) resolves like a browser and compares origins; used by the /login server page and again inside LoginForm before `router.push`. |
| F042 | DONE (SECURITY) | same | 8b1c3ec | Both Google routes use `safeNextPath`; a malformed percent sequence in the state cookie no longer throws a 500. |
| F043 | DONE (SECURITY) | `auth-safety-after.txt` (`F043 register ilovenewjeans`, `RuyLopezSolos` refused as reserved) | 8b1c3ec | Decision Q14: ADMIN_USERNAMES names are reserved in register, guest upgrade, rename, Google username picking and guest minting (`src/app/api/auth/_lib/reserved.ts`). Accounts that already hold them keep them. |
| F046 (auth routes) | DONE (SECURITY) | `auth-safety-after.txt` (`F046` lines: cross-site Origin and Sec-Fetch-Site are 403 on login, register, guest, logout) | c3fd1da, a7cbfdb | Body routes use `guardJsonWrite`, guest and logout `assertSameOrigin` (slice F's `src/lib/server/request.ts`). The settings screen's same-origin logout form still works (no body is read). |
| F047 (auth routes) | DONE | `auth-safety-after.txt` (`F047` 18 checks) | 8b1c3ec, a7cbfdb | null, [] and 7 are 400 on login, register, rename, avatar, bio, flair. |
| F062 | DONE | `auth-safety-after.txt` | 8b1c3ec | Register counts creations per IP (10 per 15 min, not for a guest upgrading in place); only UNIQUE errors map to 409, anything else is logged and 500. |
| F063 | DONE (SECURITY) | `auth-safety-after.txt` (`F063` two checks) | 8b1c3ec | Sign-in failures are keyed on (username, IP) with the old limit, plus a 50-failure ceiling per username across IPs; ten wrong passwords from one IP no longer lock the owner out. One flaky run seen while the dev server restarted mid-test; 3 clean runs since. Check-then-record race remains (noted in the row, not fixed). |
| F076 | DONE | `auth-safety-after.txt` (`F076 old guest name redirects`) | 8b1c3ec | Guest upgrade writes the rename and `username_history` in one batch. |
| F140 | DONE | `browser-checks-after.json` (`F140`: first link focused, 40 Tabs stay inside, Shift+Tab stays inside, Escape closes, focus back on "Open menu") | b1f33ae | Panel is `role="dialog"` with a label. |
| F141 | DONE | `browser-checks-after.json` (`F141`: Escape closes, focus back on the trigger, aria-expanded on challenges and bell, count in the challenges label, no false `aria-haspopup="menu"`) | b1f33ae | |
| F144 (A, login parts) | DONE | code + `browser-checks.ts.txt` | b1f33ae, 8b1c3ec | AchievementToast has a persistent `role="status"` slot; the login form has a persistent `role="alert"` slot. Profile edit and DraftRevealBanner are C and J. |
| F145 (login) | DONE | code | 8b1c3ec | Login tabs are a real tablist (roving tabindex, arrows, Home/End, tabpanel labelled by the active tab). |
| F161 (A files) | DONE | `test:rounded`, grep: no `shadow` left in SiteHeader.tsx/.css, MobileNavMenu, AchievementToast, SettingsBootstrap | b1f33ae | Popover elevation is the raised fill plus the hairline. |
| F188 (SiteHeader.css) | DONE | code | b1f33ae | Nav link transition uses `--dur-1` and `--ease-out`. |
| F256 | DONE | `browser-checks-after.json` (`F256_and_me_count`: signed-out first visit makes no settings call before the guest exists, no 401, 2 `/me` calls) | b1f33ae | The settings pull waits for a known account. |
| F064 | NO-CHANGE | decision Q2/Q3 (guest behaviour unchanged) | | Minting moved from SiteHeader into `useSession({ ensure: true })`, still triggered only by the site header. |
| F148 | TODO | | | Needs every page to move `SiteHeader` out of `<main>` (route slices). Wrapping the nav in `<header>` inside `<main>` gives no banner landmark and would trap the nav's z-index. Wave 2 with the route slices; skip link then too. |
| F153 | TODO | | | 360px screenshots per auth state not captured yet (dev server churn). |
| F187 | TODO | | | Globals.css (slice I). Nothing in settings.ts needs to change for it. |
| Route `/login` layout, loading, states, a11y | PARTIAL | as above | 8b1c3ec | layout (F019, F016), a11y (F144, F145) done; interaction, responsive, perf, copy not audited this wave. |
| BACKEND auth: me | PARTIAL | `auth-safety-after.txt` | 8b1c3ec, b1f33ae | /me now also keeps the display cookie honest; per-page /me count falls to one shared request for every component that uses `useSession` (2 on a signed-out first visit, was 5 on `/`). Page-level fetchMe callers still add their own (list below). Presence UPDATE and rating subquery unchanged (F125 is G + H). |

## CLS, section 4 routes, signed in, Fast 3G + 4x CPU

Before (`evidence/A/cls-section4-throttled-before.json`, same harness): `/` 0.0038 / 0.0124 (1280 / 390), `/lobby` 0.0168 / 0.005, `/play` 0.0173 / 0.0538, `/profile` 0.031 / 0.0769, bot game 0 / 0. These CLS numbers are page content (the Layout Instability API scores the header chip swap at about 0.0014), which is why the spec asserts the header box itself.

After (`evidence/A/cls-section4-throttled-after.json`, same command, `.polish-auth` sessions carrying `nc_who`): `/` 0.0001 / 0.0007, `/lobby` 0.0089 / 0.0044, `/play` 0 / 0, `/profile` 0.031 / 0.0834 (slice C, F021/F027, unchanged), bot game 0 / 0.0001. Eight of ten cells under 0.01 (before: four). Some of the `/play` gain is slice B's own work landing in the same window.

Header box watch (`evidence/A/section4-after/section4.json`, `polish:section4`, compare `evidence/section4-before/section4.json` in 9a460cb): no account-chip change after `/api/auth/me` on any route. Two header swaps remain and are not the session: on `/play` (2.2s, before hydration) and `/profile` (12.8s, the profile page's own skeleton) the route skeleton's `SkeletonHeader` (logo plus a 98x28 block) is replaced by the real header, so the right cluster moves 212px. Because the root layout now renders per request, a `loading.tsx` fallback can reach a hard load (seen under `next dev`). The class fix is in REQUESTS (slice B, `Skeleton.tsx`): let `SkeletonHeader` render the real `SiteHeader`, which now has its final shape from the first render. The spec (`signin-bump-after.txt`) passed every cell against its PAGE_DEBT ceilings.

## Page files still calling authClient directly (swap to useSession in wave 2)

`useSession()` from `@/lib/session/SessionProvider` gives `user` (full AccountUser, undefined until known, null signed out) and `display`. Pages that only need "who am I" should drop their own `fetchMe`/`ensureAccount` effect.

- Slice B: `src/app/page.tsx` (fetchMe x2), `src/app/lobby/page.tsx` (ensureAccount, fetchMe), `src/app/lobby/QuickMatch.tsx` (ensureAccount, fetchMe; F010 "caches null"), `src/app/game/page.tsx` (ensureAccount), `src/components/QueueButton.tsx` (dead, delete per F165)
- Slice C: `src/app/profile/page.tsx` (ensureAccount, fetchMe), `src/app/profile/edit/page.tsx`, `src/app/u/[username]/page.tsx`, `src/app/settings/_components/SettingsScreen.tsx`
- Slice D: `src/app/clubs/page.tsx`, `src/app/clubs/[slug]/page.tsx`, `src/app/community/page.tsx`, `src/app/inbox/page.tsx`, `src/app/inbox/[username]/page.tsx`, `src/app/leaderboard/page.tsx`, `src/app/tournaments/page.tsx`, `src/app/tournaments/[id]/page.tsx`, `src/components/PlayerSearch.tsx`
- Slice E: `src/app/achievements/page.tsx`, `src/app/stats/page.tsx`
- Slice G: `src/app/mod/page.tsx`, `src/app/mod/cards/page.tsx`, `src/app/mod/house/page.tsx`, `src/components/mod/stats/StatsShell.tsx`
- Slice J: `src/components/GameOver.tsx`

## ADDITIONS

- `src/lib/session/{who,store,SessionProvider,prePaint,railWidth}.ts(x)`, `src/lib/safeNext.ts`, `src/lib/modeCookie.ts`, `src/app/api/auth/_lib/{who,reserved}.ts`, `src/app/login/{LoginForm.tsx,oauthErrors.ts}`.
- `scripts/check-prepaint.ts` (offline parity guard), `scripts/check-auth-safety.ts` (`--unit` offline; full run needs the dev server; every HTTP case uses throwaway accounts and random IPs), `e2e/polish/signin-bump.spec.ts` (section 4 guard; header box watch plus CLS with a shrink-only PAGE_DEBT map).
- /login shows only known Google error messages (`oauthErrors.ts`): a crafted `?oauthError=` link can no longer put arbitrary text in the sign-in form (content spoofing, low).

## PROPOSALS

- P-A-static: if per-request rendering of every page costs too much on Workers (measure TTFB on a production build), the alternative is a static shell plus a client-only header chip read from `document.cookie` through `useSyncExternalStore`. That swaps before paint on the client but cannot be in the server HTML, so the no-JS and first-byte paint would show a placeholder. Needs owner input on Q1 again with numbers.
- P-A-guest-flag: store the tutorial-done / tour flag the same way as `nc_mode` (cookie plus SessionProvider seed) so `/play` renders its tour note in the final state server side (F006 second half). Slice A can add the seed field in wave 2 if slice B wants it.

## OWNER QUESTIONS

- A-Q1: Existing ADMIN_USERNAMES holders: if either listed name is not yet registered in production, reserving it (Q14) also means nobody can create it any more; the admin would have to be granted by SQL or by another admin. Confirm both names exist in production (Q14 already asks).

## REQUESTS

- Integrator / harness owner (`scripts/polish/seed.ts`, `save()`): keep the `nc_who` cookie the auth routes now return, so seeded storageStates model a returning signed-in visitor. Without it every harness cell is a session from before the cookie and the header starts unknown. Patch: in `seedAccount` and `seedGuest`, after `me(token)`, call `/api/auth/me` with the session and store the `nc_who` value from its `set-cookie` next to `dc_session` (`httpOnly: false`). The local `.polish-auth/{guest,user,mod,admin}.json` files were updated that way by hand for this wave's measurements.
- Integrator (`scripts/check-buttons.ts` BASELINE): replace `"src/app/login/page.tsx"` with `"src/app/login/LoginForm.tsx"`. Same single tab button, moved with the form; `test:buttons --strict` flags the rename until then.
- Slice L (`package.json`): `"test:prepaint": "tsx scripts/check-prepaint.ts"` (offline, CI-safe), `"test:auth-safety": "tsx scripts/check-auth-safety.ts"` (needs the dev server) and `"test:auth-safety:unit": "tsx scripts/check-auth-safety.ts --unit"`.
- Integrator (`src/lib/server/auth.ts:197-199`, unowned this wave), F095 as slice F wrote it: delete only the presented expired token (`DELETE FROM sessions WHERE token_hash = ?` with `await sha256Hex(token)`) instead of the table-wide sweep.
- Slice J (`src/components/OnlineMatch.tsx:396`), F008 second half: rail-collapsed is still read from localStorage after mount. Option that needs no new cookie: have OnlineMatch render both states from CSS keyed on `html[data-rail-collapsed]`, which slice A will stamp pre-paint on request (one line in `prePaint.ts`).
- Slice B: `/` at 390x844 throttled showed an intermittent 0.15 to 0.17 shift on `div.order-3.mt-6.lg:order-1` ("Latest games") in 2 of 4 spec runs (dx, dy, dh all 0, so a replaced node rather than a moved one). Not from the session change (header box stable in the same runs).
- Slice B (`src/components/ui/Skeleton.tsx`): make `SkeletonHeader` render `<SiteHeader />` (and a compact variant render `<CompactSiteHeader />`). The header no longer has an unknown state for a signed-in visitor, so rendering the real one in every route skeleton removes the skeleton-to-header swap measured on `/play` and `/profile` (right cluster 98 to 309px, moved 212px) for all 25 routes that use it. Slice C: the `/profile` page's own skeleton header, same change.
- Slices B, C, D, E, G, J: swap the fetchMe/ensureAccount calls listed above to `useSession()`.
- Every route slice, F148: move `<SiteHeader />` / `<CompactSiteHeader />` out of `<main>` so slice A can wrap it in a `<header>` banner and add a skip link to `#main` (put `id="main"` on each page's `<main>`).
- Slice E: `src/app/layout.tsx` is async now and reads cookies; wave 2 SEO edits there must keep the `SessionProvider` wrapper, the pre-paint `<script>` as the first child of `<head>`, and `suppressHydrationWarning` on `<html>`.
- Environment note for the integrator: `scripts/dev-supervisor.sh` restarts `next dev` when `/` does not answer within 8s twice; under the fleet's load (load average 20 to 49 on 4 cores) that fired every few minutes, and `next.config.mjs` edits restart it too, which broke long Playwright runs mid-cell. Also, the repo `playwright.config.ts` `webServer` starts its own `npm run dev` when :3000 is briefly down; slice A ran specs with a config copy that has `webServer: undefined` to avoid a second server.
