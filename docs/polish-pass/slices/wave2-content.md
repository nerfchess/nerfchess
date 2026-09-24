# Wave 2, area "content"

Scope: the nine wave 2 findings for the content routes (slice E files, plus
`src/app/layout.tsx`, which E holds in wave 2). Measured on the shared dev
server (:3000), Chromium 1194, dark, full motion.

## Results

| # | Finding | Before | After | Commit | Status |
|---|---|---|---|---|---|
| 1 | Content and legal pages: load CLS from the font swap | `/guide/how-to-play` 0.1099 / 0.3139 (360 / 1280), `/faq` 0.0684 / 0.1657, `/guide/chess-roguelike` 0.1841 / 0.2417 (user), `/guide/chess-with-power-ups` 0.0734 / 0.2349 (user), `/terms-of-service` 0.0341 / 0.1183 (wave2/cls-recheck-content-*.json) | 360: every cell 0.0000 to 0.0166. 1280: how-to-play 0.0121, terms 0.0027, privacy 0.0024, updates 0.0028, glossary 0.0027, nerf-mode 0.0029, capture-the-king 0.0049; still over target: faq 0.0396, tutorial 0.0352, chess-roguelike 0.0934, chess-with-power-ups 0.1081 (wave2/cls-content-after.json) | 0345df7 | DONE (root cause); residual below |
| 2 | `/codex/buff/pawn_push` 1280 user CLS 0.2578 | 0.2578 both runs | 0.0014 (user), 0.0023 (signed out); `/codex/boon/extra_glance` 1280 0.019 to 0.0023 | 0345df7 | DONE |
| 3 | axe: puzzles grid, analysis label, suggest contrast, legal link-in-text-block | see axe-all.json | axe (wcag2a, wcag2aa, best-practice) on `/puzzles/kh-1z0zrku` 360, `/analysis`, `/privacy-policy`, `/terms-of-service`, `/guidelines`, `/codex/suggest` 1280: 0 violations each | c6847b7, 6b584a5 | DONE for E routes; see hand-offs |
| 4 | Puzzle board: 64 tab stops, no arrows, no rows | 64 focusable cells, 0 rows, ArrowRight did nothing | 8 `role=row` (display:contents), 1 cell with tabindex 0, a1 focused first; ArrowRight to b1, ArrowUp to b2, End to h2, Ctrl+Home to a8, ArrowDown to a7, Tab leaves the board in one step | c6847b7 | DONE |
| 5 | `/analysis` FEN fields | no label, silent error, 12px, 40px tall | `<label for>` on the read-only field, `aria-label` on the paste field, always-mounted `role=alert` error with `aria-invalid` and `aria-describedby` (live: invalid=true, describedby=analysis-fen-error, text announced), 14px phone / 13px sm+, `min-h-[44px]` on coarse pointers | c6847b7 | DONE |
| 6 | Legal inline links colour only | 3 + 4 + 1 nodes | underlined at rest (`underline underline-offset-2`); sibling grep found the same pattern on the codex detail "See ..." link, fixed too | 6b584a5 | DONE |
| 7 | `/codex` chunk bundles both libraries | CodexBrowser initial JS 1842.5 KB minified, card library inside | 334.5 KB, no card library in the initial graph | 7e771c0 | DONE |
| 8 | `/codex/suggest` "(optional)" contrast | 2 nodes, both viewports | opacity dropped, text-parchment-400 like its label; 0 violations | 6b584a5 | DONE |
| 9 | Sub-floor text and a retired caption | history summary nerf text 12px; updates date uppercase tracked | 13px; plain 12px caption, `src/app/updates/page.tsx` leaves the check-case baseline (test:case OK, no stale entries) | 6b584a5 | DONE |

## Notes per finding

1. Root cause: next/font writes a size-adjusted `Noto Sans Fallback` whose
   only source is `local(Arial)`. On a box with no font named Arial (this
   Linux box, ChromeOS, many Android builds) that face errors
   (`document.fonts`: `Noto Sans Fallback:normal:error`), text falls to
   `system-ui` (DejaVu Sans here, much wider), and the swap to Noto Sans
   rewraps every paragraph (the dy -25 signature) and narrows the header nav
   (w 461 to 418). Fix: `src/app/fontFallback.css` declares the same
   override metrics on Liberation Sans and Arimo (both metric-compatible with
   Arial, regular and bold faces), and `layout.tsx` lists them after the
   next/font fallback through the `fallback` option, so a system with Arial is
   unchanged. Class: every face next/font self-hosts; JetBrains Mono gets the
   same treatment.
   Residual: with the fallback now metric-matched, what is left is a single
   paragraph line breaking one word differently at swap time (faq, tutorial,
   two guides at 1280). On the dev server the woff2 lands 8 to 45 s after
   first paint, far later than a production CDN serves a preloaded font, so
   these numbers overstate it. The finding's "confirm on a production build"
   is still owed: a `next build` would overwrite the `.next` the shared dev
   server runs from, so it waits for integration. PROPOSAL (not built):
   `display: "optional"` for Noto Sans removes swap shifts entirely, at the
   price of the system face on a slow first visit; that is a typography call
   for the owner.
   The 16 "preloaded but not used" warnings were not reproduced on `/faq`
   (0 preload console messages in the probe); left for the integration
   console run.
2. Same font-swap signature (the header nav and the h1 rewrapping moved the
   "In play" row), fixed by 1.
3. and 4. `PuzzleBoard.tsx` now follows the Board.tsx grid: row wrappers with
   `display: contents` so the CSS grid is unchanged, roving tabindex, visual
   direction keys, Home / End per row, Ctrl+Home / Ctrl+End for the board.
   Enter and Space stay the native button activation.
7. Measured with esbuild on the CodexBrowser entry, bare packages external,
   splitting on, counting the entry chunk plus its static imports, before
   (HEAD worktree) and after. The library reached the chunk through four
   paths, not one: `cardCodex` (paths), `nerfCategories` (ALL_NERFS for the
   category map), `cardCollections` (the buff barrels) and `affected.ts`. The
   library-free halves moved to `src/lib/cardPaths.ts`,
   `src/lib/cardCollectionDefs.ts` and `src/lib/nerfCategoryDefs.ts`; the old
   modules re-export them, so server pages, OG and SEO code are untouched.
   `filterAndSortNerfs` and `affectedLine` take the lookups as arguments, and
   CodexBrowser loads `nerfCategories` and `cardCollections` in the same
   `Promise.all` as the libraries. Live check: `/codex`, `?tab=rules`,
   `?tab=rules&category=Queen`, `?tab=rules&collection=Wild`,
   `?collection=Fantasy`, `?tab=rules&search=queen` all render rows with no
   page errors. `scripts/test-nerf-categories.ts` passes (updated for the new
   `affectedLine` signature). PuzzleRunner still carries the libraries through
   its own engine imports (the puzzle needs the rule), which is expected.

## Hand-offs (files this area does not own)

- `/settings` color-contrast, 7 nodes in the `.opacity-40` / `.opacity-70`
  disabled rows: slice C (`src/app/settings/*`).
- `/tv` at 390 aria-prohibited-attr, `src/app/tv/TvView.tsx:552`
  `aria-label` on a plain div: slice D.
- link-in-text-block on `/community`, `/friend`, `/profile/edit`, `/mod`,
  `/mod/cards`, `/mod/stats`: slices D, C and G. The fix is the one used here:
  `underline underline-offset-2` at rest on links inside running text.
- `scripts/check-codex-routes.ts` fails every detail page because the codex
  `loading.tsx` skeleton streams an `<h1>Codex</h1>` ahead of the page's own
  h1 and the script reads the first h1 in the raw HTML. The pages themselves
  are correct (the live DOM has one h1). Not changed here; the checker should
  read the last h1 or wait for the rendered DOM.

## Checks run

- `tsc --noEmit`: no errors in touched files (one unrelated error in
  `src/components/FriendGame.tsx`, another slice's work in progress).
- `eslint` on every touched file: clean.
- `scripts/check-case.ts`: OK, no stale baseline entries.
- `scripts/test-nerf-categories.ts`: OK.
- CLS: `scripts/polish/cls.ts --routes <14 content routes> --viewports
  360x780,1280x800 --runs 2`, both auth states, saved as
  `docs/polish-pass/evidence/wave2/cls-content-after.json` (the dev server
  restarted once during run 1, so 16 cells have one run, not two).
