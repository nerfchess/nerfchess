# Wave 3, group "fonts"

Scope: font-swap layout shift as one class (after 0345df7), the font-display
strategy, the "preloaded but not used" woff2 warnings, the JetBrains Mono
fallback, and the header account chip for a session with no `nc_who` hint.
Files: `src/app/fontFallback.css`, `src/app/layout.tsx`,
`src/components/SiteHeader.tsx`, `src/lib/session/SessionProvider.tsx`.
Measured on the shared dev server (:3000), Chromium 1194, dark, full motion,
this box has Liberation Sans and Liberation Mono and no Arial.

This slice resumes a run that a container restart killed. Its uncommitted
edits were in the tree. They were checked, one decision was re-measured from
scratch (display swap vs optional, below), the layout comment was corrected,
and the work was committed here.

## Results

| # | Finding | Before | After | Status |
|---|---|---|---|---|
| 1 | Fallback width per weight (Noto Sans) | one 106.33% face for all weights: 400 +0.34%, 500 -1.54%, 600 +4.05%, 700 +1.68% vs Noto Sans over the terms page copy (evidence/wave3-fonts/fallback-width-before.json) | one face per weight band: 400 -0.12%, 500 -0.09%, 600 -0.16%, 700 -0.19%; line box 22px both (fallback-width-after.json) | DONE |
| 2 | JetBrains Mono fallback | scaled Liberation Sans (proportional) at 134.59%: +8.75% (400, 500), +9.66% (600) | Courier New / Liberation Mono / Cousine, 0.6 em like JetBrains Mono: -0.08% at every weight, line box 21px both | DONE |
| 3 | Font-swap CLS on content pages and home | /faq 0.0396 (1280), /tutorial 0.0352, /guide/chess-roguelike 0.0934, /guide/chess-with-power-ups 0.1081, /guide/buff-mode 0.0685 (390), /terms-of-service 0.0154 (360), /guide/nerf-mode 0.0158 (360), /guide/capture-the-king 0.0166 (360), home 0.0196 (evidence/wave3-fonts/cls-content-before.txt) | 16 routes x 360/390/1280 x signed-out/user: 96 cells, 0 above 0.01, worst 0.0036 (cls-content-optional.txt); rerun of the six worst routes plus /terms-of-service: 36 cells, worst 0.0031 (baseline/wave3-fonts-content-rerun.json) | DONE |
| 4 | "preloaded but not used" woff2 warnings | 2 per page load (1 Noto Sans, 1 JetBrains Mono) | Unchanged in dev by design: a `next dev` (webpack) artifact, not an app bug (see note 4) | EXPLAINED |
| 5 | Header chip grows after /me for a session with no `nc_who` hint | the unknown placeholder (`h-9 w-24`, 96px) grows to the signed-in cluster (challenges, bell, name chip): about 206px at 1280 (0.0013 to 0.0035 in the harness `user` cells, wave2-account.md) | the server passes `hasSession`, the header reserves two 44px icon slots and the chip box (44px phone, 128px from sm). At 1280 the cluster goes 302 to 310px when /me lands (the name's own length), CLS 0.0001; at 390 no change at all (header-legacy-session-probe.json) | DONE |

## Notes

1. next/font writes one "Noto Sans Fallback" face with a size-adjust taken
   from the 400 master. Noto Sans is variable and widens with weight, and
   Arial only has a regular and a bold, so weight 500 (the wordmark, nav,
   buttons) drew regular Arial at the 400 scale and came out narrow (the
   home brand 164 to 157px, nav 430 to 417px in wave2-core), and 600 drew
   bold Arial and came out wide. `layout.tsx` now sets
   `adjustFontFallback: false` and `fontFallback.css` declares four bands
   (1-449, 450-549, 550-649, 650-1000), each with its own size-adjust and
   ascent/descent overrides computed from Noto Sans's 1069/293 units divided
   by that size-adjust. Each face names Arial first and then the
   Arial-compatible Liberation Sans and Arimo, so one set of numbers serves
   systems with and without Arial.
2. JetBrains Mono advances 0.6 em per glyph. Courier New, Liberation Mono and
   Cousine do too, so the fallback is exact in width at 99.98%; clocks and
   ratings keep their columns across the swap.
3. The display strategy was measured both ways with the per-weight faces in
   place. With `display: "swap"`, 16 routes x 3 viewports x 2 auths still had
   0.0415 to 0.0871 on /guide/chess-with-power-ups, /guide/capture-the-king
   (390), /guide/buff-mode (390), /tutorial (390), /faq (1280)
   (cls-content-swap-perweight.txt): matching a whole page's width to 0.2%
   still moves individual words across a line end somewhere, and one rewrap
   in a long paragraph is a few hundredths. No metric override can match
   glyph for glyph. So Noto Sans uses `display: "optional"` (JetBrains Mono
   keeps `swap`, where the fallback is exact). With optional the face is
   either there at first paint or not used for that page, so there is no
   swap to shift.
   Cost, measured: in `next dev` the first page in a fresh browser profile
   paints in the metric fallback (Liberation Sans here), and the next page
   paints in Noto Sans from cache (optional-first-vs-second-page.txt: first
   /faq "Liberation Sans", second "Noto Sans", font served from cache at
   185ms). The dev miss is the preload mismatch in note 4. In production the
   preload and the @font-face url are the same, the file is immutable and
   36 KB, and a preloaded optional font that arrives within its block period
   paints on the first frame. A very slow first visit keeps that one page in
   the fallback, which now takes the same room as Noto Sans.
4. The warnings: webpack `next dev` appends `?v=<request timestamp>` to the
   preload href (`getAssetQueryString`, `isDev && !isTurbopack`) but the
   @font-face url in the CSS has no query, so the browser fetches the font a
   second time and reports the preload unused. Production has one URL for
   both (a `?dpl=` token would be added only with a client asset token,
   which this deployment does not set). Two preloads per page, one per face,
   the latin subset only; the "16" in the brief was the count across a
   multi-page run. Nothing to change in app code.
5. Header: `useSeededHasSession()` exposes the request's `hasSession`.
   `display === undefined && hasSession` is a session from before the
   `nc_who` cookie: someone is signed in but the server cannot say who. The
   header reserves the signed-in shape instead of the guest placeholder, and
   the /me answer stamps the hint for the next load (already in place). A
   brand new visitor (no session) keeps the `h-9 w-24` placeholder while
   the guest is minted, as before.

## Regression checks

- Default core routes (`npm run test:cls -- --runs 2`, 390 and 1280,
  signed-out and user): every cell measured is at or under 0.01, worst
  /lobby 1280 user 0.0093 (baseline/wave3-fonts-core.json; the dev server
  restarted during run 2, so /codex and /lobby were run again with
  `--runs 2`: baseline/wave3-fonts-codex-lobby.json, all 8 cells under
  target in both runs).
- `cls-thresholds.json` tightened with `--runs 2 --update`: the three
  recorded ceilings (/codex 1280 signed-out and user 0.019, /lobby 1280
  user 0.013) are now at target and dropped out. No ceilings remain.
- tsc: no errors in the changed files (the one error in the tree is a stale
  `.next/types` entry for another area's page). eslint on the changed files:
  clean.
- Guest path: a visitor with no session keeps the `h-9 w-24` placeholder
  (`reserveSignedIn` needs `hasSession`).
- The killed run's own 30-cell reports agree: baseline/wave3-fonts-before.json
  (worst 0.1081), wave3-fonts-after.json (per-weight faces with swap, worst
  0.087), wave3-fonts-after-optional.json (worst 0.0032).
- Commit b4607b8 (code), this file and the evidence in the next commit.

## Requests

- Owner / harness: the polish harnesses open a fresh browser context per
  cell, so in `next dev` their first-page screenshots now show the metric
  fallback face (same room, different glyphs), not Noto Sans. A harness that
  needs Noto in the pixels can load any page once in the context first. A
  production build check of first-visit rendering is still owed (it needs a
  separate build directory so the shared dev server's `.next` is untouched).
