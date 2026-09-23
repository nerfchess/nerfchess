# Slice D (social routes), wave 1

Owner: slice D agent. Routes: `/tv`, `/tournaments`, `/tournaments/[id]`, `/clubs`, `/clubs/[slug]`, `/inbox`, `/inbox/[username]`, `/community`, `/leaderboard`, `/friend`.
Evidence: `docs/polish-pass/evidence/D/`. Regression spec: `e2e/polish/social-routes.spec.ts` (42 tests; run with `scripts/polish/heavy.sh ./node_modules/.bin/playwright test e2e/polish/social-routes.spec.ts`). Each `spec-before-*.txt` is the same spec run against the pre-fix page (the HEAD file swapped in for the run), each `spec-after-*.txt` the fixed page.

Commits: `028acb0` (tv), `59c03f5` (tournament page), `c8719c9` (club page, scoped error boundaries), `0513d98` (inbox), `701d256` (tournament directory), `79ab84d` (club directory), `1c4c47c` (community, leaderboard), `c9ec7e4` (/friend), `b63ddc6` (copy invite link), `4dbf8b2` (friends skeletons, PlayerSearch listbox), `96526b3` (leaderboard control row, CLS regression caught and fixed).

New shared files in this slice's area: `src/components/social/DetailLoadFailed.tsx` (in-page load failure with h1, Retry and a way out, header kept), `src/components/social/fieldText.ts` (`FIELD_TEXT`, 16px below sm and 13px from sm), `src/components/social/CopyInviteLink.tsx`, `src/app/tournaments/[id]/DetailSkeleton.tsx`, `src/app/clubs/[slug]/DetailSkeleton.tsx`, `src/app/clubs/[slug]/error.tsx`, `src/app/inbox/[username]/error.tsx`, `src/app/tv/TvView.tsx` (the old client page; `page.tsx` is now a server page).

## ROW UPDATES

| Row | Status | Evidence | Commit | Note |
|---|---|---|---|---|
| F130 | DONE | `spec-before-tv.txt` / `spec-after-tv.txt` ("keeps exactly one h1") | 028acb0 | The h1 always renders; `sr-only` once the seat rows carry the players. |
| F133 | DONE | same spec ("do not nest links") | 028acb0 | The row is a stretched `<button>` under its content (`absolute inset-0`, aria-label "Watch A vs B"); the player links are raised above it (`pointer-events-auto relative`). No link inside a button; a click elsewhere on the row still picks the game. |
| F134 | DONE | `spec-before/after-tournament-detail.txt` ("countdown is not a live region") | 59c03f5 | The countdown lost `aria-live`; a separate sr-only `role="status"` line changes only with the phase (in progress, finished). |
| F019 (/tv) | DONE | spec ("server HTML carries the header and the page heading"), `curl /tv?mode=nerf` has the h1 | 028acb0 | `/tv/page.tsx` is a server page reading `searchParams` and passing `modeFilter` to `TvView`; no `useSearchParams`, no Suspense. Note: since slice A made the root layout dynamic the old page also rendered on the server under `next dev`, so the before run passed that one test; the fix removes the bailout for good (it returns if the layout goes static again, P-A-static). |
| F023 | DONE | `cls-tv-leaderboard-after.txt` (/tv 0 to 0.002 in all four cells) | 028acb0 | Skeleton rebuilt from the page grid: 1200px section, `minmax(0,592px)_320px` columns, the plate with header row and seat rows, the channel switcher and live list; no inline radius; sr-only h1. |
| F139 | DONE | spec ("fullscreen is a modal dialog that takes and returns focus") | 028acb0 | `role="dialog"`, `aria-modal`, label; `useModalChrome` for Escape, trap, scroll lock and focus return to "Watch fullscreen". |
| F159 | DONE | spec ("board controls are 44px on a coarse pointer"; before: 39px) | 028acb0 | 44px, 36px behind `pointer:fine`. Note the 14px root: `h-11` is 38.5px, so explicit `h-[44px]` is used. |
| F162 | DONE (D files) | spec ("status chips are sentence case", leaderboard "chips are sentence case"); `test:case` now lists `src/app/tv/page.tsx` and `src/app/leaderboard/page.tsx` as stale baseline | 028acb0, 1c4c47c | TV Final and Replay, leaderboard You and Guest chips. C owns the rest of the row. |
| F022 | DONE | tournament, club and thread "in-flight state is the route skeleton" tests | 59c03f5, c8719c9, 0513d98 | Tournament and club skeleton bodies extracted to `DetailSkeleton.tsx`, used by `loading.tsx` and by the page's own in-flight branch; the thread pane draws the loading.tsx bubbles. |
| F031 | DONE | tournament and club "missing event/club shows the shared 404 copy" and "failed load has an h1 and a Retry" tests | 59c03f5, c8719c9 | 404 renders `NotFoundPanel` with `NOT_FOUND_COPY.tournament` / `.club` (club copy already existed); other failures render `DetailLoadFailed` (h1, Retry that reruns the page's `load`, a way back). `tournaments/[id]/not-found.tsx` is still only reachable from a server `notFound()`; the page renders the same copy inline because `notFound()` is documented for server code only in this Next version. |
| F032 | DONE (code) | files `src/app/clubs/[slug]/error.tsx`, `src/app/inbox/[username]/error.tsx` | c8719c9 | Scoped RouteError copy naming the club / conversation, way out to the directory / inbox. Not browser-triggered: a render throw has to be injected to reach a boundary. |
| F014 | PARTIAL | tournament "join control does not wait for /api/auth/me", inbox "body does not wait", community "Friends card does not wait" tests (each blocks `/me` for 8s); `cls-tv-leaderboard-after.txt` | 59c03f5, c8719c9, 0513d98, 701d256, 79ab84d, 1c4c47c, 96526b3 | Every D page that called `fetchMe` now reads `useSession()` (`display` for layout, `user` for ids and roles; moderation stays on the full user). Left: the community "Recent opponents" card still appears after the full user lands (it needs the account id to pick the opponent out of each game); it sits below Friends and Recent games. Found and fixed on the way: a hidden reserved Jump button shifted the leaderboard 40px (CLS 0.048) for a signed-in unranked viewer; the search box and the button now share one row. |
| F036 | DONE | club "signed-out visitor gets a sign-in link back to the club" test | c8719c9 | "Sign in to join" LinkButton with `next=/clubs/<slug>` in the action group, and the board note links Sign in. |
| F179 | DONE | club "a double submit posts once" (before: 2 POSTs) | c8719c9 | Ref guard plus `posting` state and `Button loading`; clears the box only if it still holds what was sent. |
| F180 | DONE | club "delete is visible on touch, 44px, asks first and reports a failure" | c8719c9 | Visible on hover, focus-within and coarse pointers; 44px target (28px behind pointer:fine); inline Delete / Keep confirm; failures shown in a `role="alert"` line; 16px icon. |
| F155 | DONE | club "board field is 16px", inbox "composer is 16px", directory "fields are 16px" (before: 13px) | c8719c9, 0513d98, 701d256, 79ab84d | One constant `FIELD_TEXT` in `src/components/social/fieldText.ts`, used by the tournament create form, club create form, club board and thread composer. |
| F170 | DONE | club "events are links with sentence-case phases" | c8719c9 | Rows link to `/tournaments/<id>`; phase mapped to Upcoming / In progress / Finished. |
| F018 | DONE | inbox "pins its pane without scrollIntoView" (before: scrollIntoView called, pane not pinned) | 0513d98 | Sets `scrollTop` on the pane instead. |
| F182 | DONE | inbox "typing during a send is kept" (before: box emptied) | 0513d98 | Clears only if the draft still equals the sent text. |
| F026 | PARTIAL (D sites DONE) | grep: no `animate-pulse` left in inbox, clubs, tournaments, FriendsPanel, FriendsModule | 0513d98, 701d256, 79ab84d, 4dbf8b2 | D sites use the shared `.skeleton` sweep. The show-delay and minimum duration belong in `ui/Skeleton` (slice B, proposal P-skel). |
| F110 | DONE | directory "does not commit every second" (React commit hook: before 8 commits in 4s, after 0 to 1) | 701d256 | Sections re-bucket on a timeout to the next start or end; only rows showing a live countdown tick (`useRowNow`). |
| F150 | DONE | directory "time control group" test (`getByRole("group", { name: "Time control" })`); PlayerSearch code | 701d256, 4dbf8b2 | Time control is a fieldset with a legend. PlayerSearch: the "Recent" caption moved out of the listbox and names it. See ADDITIONS for the remove buttons. |
| F156 | DONE | directory "rows keep start time and seats" at 390px | 701d256 | Folded into a meta line below sm. |
| F181 | DONE | directory "joined clubs only" (`?club=other1` prefill of an unjoined club submits nothing) | 701d256 | Filters on the `joined` flag the clubs API already returns; select value and submission share `effectiveClubId`. |
| F176 | DONE (within Q10) | code | 701d256, 79ab84d, 59c03f5 | Subtitle says "events", not "arenas"; ASCII "..." busy labels replaced by `Button loading` or "…". Brand spelling left as is per INTEGRATOR DECISIONS Q10. |
| F038 | DONE (client half) | club directory "search also finds clubs outside the loaded list" | 79ab84d | The page asks `/api/clubs?q=` (slice F added it) 250ms after typing pauses and merges the matches with the local filter. |
| F192 | DONE (D files) | code, `test:anim-props` clean | 79ab84d, 1c4c47c | Club directory and community chevrons: `transition-transform`. |
| F135 | DONE (community half) | community "no live online count" test | 1c4c47c | The count pill is no longer a status live region. Figure unchanged (OWNER DIRECTIVE 2). LockInCountdown half is slice C's. |
| F151 | DONE (tv, community) / NO-CHANGE (leaderboard) | `F151-leaderboard-hover-contrast.json` (hovered rows: parchment-400 4.57:1 dark, 10.2 light); arithmetic for midnight 4.86 | 028acb0, 1c4c47c | The failing cells were parchment-500 on the hover fill (3.97:1): TV "vs" and community "Soon" lifted to parchment-400. Leaderboard muted cells are parchment-400 and pass. |
| F160 | DONE (community) | community "replay links are 44px on touch" | 1c4c47c | min 44x44 on coarse pointers, stepped down behind pointer:fine. HeroTv and HomeFeed are slice B's. |
| F169 | DONE | community "opponents read View profile" | 1c4c47c | The row opens the profile, so it says View profile. |
| F200 | DONE (leaderboard) | leaderboard "jump obeys data-anim" (scrollIntoView behavior "auto" under `data-anim="off"`) | 1c4c47c | Uses `motionOff()` from settings.ts. Lobby and mod are B and G. |
| F025 | DONE | leaderboard "skeleton has the table's geometry" (top, header and row height within 1px) | 1c4c47c | mt-6, the header's padding and line height, rows at min 44px, no inline style. |
| F167 | DONE | tournament "arena footnote" test | 59c03f5 | Keyed on `t.format`; the engine pairs every format by score then rating, so only Swiss events are told "Swiss". |
| F168 | DONE | tournament "club chip" test (href `/clubs/polish-club`) | 59c03f5 | The API already selects `club_slug` (slice F). |
| F171 | DONE | tournament "pairing links" test | 59c03f5 | Pairing names are PlayerLinks; draws read ½-½ like community and home. |
| F149 | DONE (D files) | code | 59c03f5, c8719c9, 701d256, 79ab84d | lucide-react 0.460 does not hide icons by default; `aria-hidden` added to decorative icons in text runs on tournament, club and directory pages. |
| F037 | DONE | `spec-before-friend.txt` (200) / `spec-after-friend.txt` (307 to `/lobby?tab=friends&code=…&mode=…`, unknown params dropped) | c9ec7e4 | Server `redirect()`. FriendsPanel and FriendsModule Challenge links go straight to the lobby. The bell hrefs in `src/lib/server/social.ts` still say `/friend` (see REQUESTS). |
| F239 | DONE (D half) | code; `/c/ABCDE` returns 200 | b63ddc6 | Copy invite link button (copies `${origin}/c/${code}`) under the code in the friend game share view, with a status line. Not browser-tested: the share view needs a created friend game, which needs the Durable Object. |
| F072 | not D | | | Slice F's API row; nothing to change in the thread page for it. |

## ROUTES (dimensions this wave)

| Route | Done this wave | Still TODO |
|---|---|---|
| `/tv` | layout (F023, CLS 0 to 0.002), loading (F019, F023), a11y (F130, F133, F139), responsive (F159), copy (F162) | perf, 360px screenshot pass, interaction feel |
| `/tournaments` | perf (F110), responsive (F155, F156), a11y (F150, F149), states (F181), copy (F176), loading (F026) | 360px pass, empty-state copy review |
| `/tournaments/[id]` | loading (F022), states (F031), a11y (F134, F149), layout (F014), copy (F167, F171) | responsive 360px pass |
| `/clubs` | states (F038 search), loading (F026), responsive (F155), copy (F176), motion (F192) | 360px pass |
| `/clubs/[slug]` | loading (F022), states (F031, F032), interaction (F179, F180), layout (F014, F036), responsive (F155), copy (F170) | 360px pass, icon picker a11y review |
| `/inbox` | layout (F014), loading (F026) | 360px pass |
| `/inbox/[username]` | layout (F014, F018), loading (F022), states (F032), interaction (F182), responsive (F155) | F072 lands in F's API |
| `/community` | layout (F014 partial), a11y (F135), contrast (F151), touch (F160), copy (F169), motion (F192) | Recent opponents late card (F014 residual) |
| `/leaderboard` | layout (F014, F025; CLS 0.0001 to 0.0025), copy (F162), motion (F200), contrast (F151 measured) | 360px pass |
| `/friend` | states (F037 server redirect) | none |

Guards after the last commit (`guards-after.txt`, `cls-tv-leaderboard-after.txt`, `console-tv-leaderboard-after.txt`): `test:emdash` OK, `test:rounded` OK, `test:anim-props` clean, `test:reduced-motion` clean, `test:case` has only stale baseline entries for D files, `test:buttons` flags `src/app/tv/TvView.tsx` only because the baseline names the old path (REQUESTS 1), `test:cls` /tv and /leaderboard 8 cells all under 0.01, `test:console` /tv and /leaderboard 0 new.

## ADDITIONS

- A-D1: PlayerSearch "Recent searches" rows put a Remove button beside each option inside the listbox; a listbox should hold only options. Fix is to move the remove control out of the listbox (a Delete key on the active option plus a visible control outside the list). Not done this wave (behaviour change, needs a keyboard spec).
- A-D2: `useModalChrome` restores focus correctly for the TV overlay; the TV Escape handler it replaced is gone, so the page has one Escape path.

## PROPOSALS

None.

## OWNER QUESTIONS

None new.

## REQUESTS

1. Integrator (scripts/check-buttons.ts BASELINE): replace `"src/app/tv/page.tsx"` with `"src/app/tv/TvView.tsx"`. The page moved to a server wrapper plus `TvView.tsx`; the bespoke buttons are the ones the old path already had.
2. Integrator (scripts/check-case.ts baseline): remove `src/app/tv/page.tsx` and `src/app/leaderboard/page.tsx` (both now clean).
3. Slice F (`src/lib/server/social.ts`): `challengeHref(code)` can return `/c/${encodeURIComponent(code)}` (slice E2's invite route) or `/lobby?tab=friends&code=${…}` to save the 307 hop through `/friend`. Keep `FRIEND_HREF = "/friend"` unless stored notification links are migrated, since it is used to tell friend notifications apart.
4. Slice B (`src/components/ui/Skeleton.tsx`): the show-delay and minimum duration from F026 / P-skel; D's sites already use `.skeleton`, so they pick it up once the class or component carries it.
5. Slice L (`playwright.config.ts`): when the shared :3000 server is mid-restart, `webServer` (`reuseExistingServer: !CI`) starts its own `npm run dev` on :3000. Seen twice in this wave. Suggest skipping `webServer` when `POLISH_BASE` or a new `PW_NO_WEBSERVER=1` is set, and setting it in `scripts/polish/heavy.sh` runs.
6. Slice C (FYI): `src/components/profile/FriendsModule.tsx` (shared with C) got two small edits in 4dbf8b2 and c9ec7e4: `.skeleton` rows and the Challenge link pointing at `/lobby?tab=friends&challenge=`.
