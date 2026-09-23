# Slice C (account routes), wave 1

Owner: slice C agent. Ledger updates for the integrator to fold into `LEDGER.md`.
Routes: `/profile`, `/profile/edit`, `/u/[username]`, `/settings` (not `/login`, slice A this wave).
Evidence: `docs/polish-pass/evidence/C/`.

Commits: `f1b69f6` (account routes), `53529ea` (modal, drawer and notice chrome), plus the evidence commit that carries this file.

Regression spec: `e2e/polish/account-routes.spec.ts` (17 tests). Every test was run against the tree before its fix and failed there (`evidence/C/spec-before.txt`: 12 of 14 failed on the first run, then the focus ring, history summary and drawer tests were each run against the old file and failed), and passes after (`evidence/C/spec-after.txt`; three cells in the full run were hit by a dev server restart and pass on the rerun at the end of the same file). Run it with `scripts/polish/heavy.sh ./node_modules/.bin/playwright test e2e/polish/account-routes.spec.ts` while the shared server is up (see REQUESTS, Playwright webServer).

CLS, `scripts/polish/cls.ts` on `/profile`, `/u/polish_user`, `/u/polish_mod`, `/profile/edit`, `/settings` x signed-out, user x 360x780, 1280x800 (`evidence/C/cls-before.txt`, `cls-after.txt`, JSON beside them):

| Cell | Before | After (best of 2) |
|---|---|---|
| `/settings` 360 signed-out | 0.0841 (the signed-out line pushed the rows 99px) | 0.0013 |
| `/settings` 1280 signed-out | 0.0212 | 0.0024 |
| `/u/polish_user` 1280 user | 0.031 (activity strip dy -117) | 0.0014 |
| `/profile` 360 user | 0.0807 (activity skeleton swap) | 0.0025 |
| `/u/polish_mod` 360 user, spec probe | 0.0807 (profile plate dy +90 when Statistics landed above it) | under 0.01 (spec passes) |
| all 20 cells | 4 above 0.01 | 0 above 0.01 |

## ROW UPDATES

| Row | Status | Evidence | Commit | Note |
|---|---|---|---|---|
| F136 | DONE | spec "the picture upload is a keyboard stop that opens the file picker" (before: no such control; after: Tab reaches it, Enter opens the file chooser) | f1b69f6 | The tile is a `<button>` that calls the hidden input's `click()`; the input is `tabIndex=-1`, `aria-hidden`. |
| F137 | DONE (C part) | spec "the bio field shows a focus ring" (before: outline colour `rgba(0, 0, 0, 0)`, Tailwind's transparent outline-none) | f1b69f6 | Bio textarea and the report textarea drop their outline overrides; the site ring shows. `codex/suggest` is slice E's half. |
| F164 | DONE | spec "the privacy switch moves its knob with transform only" (before: `box-shadow` set, `transition-property: all`) | f1b69f6 | The two switches are `.settings-toggle` (SettingsPanel.css): translateX thumb, token easing, `data-anim="off"` gate, 44px hit area, On/Off word beside. The shared Switch component is still slice I's F198. |
| F192 (`profile/edit/page.tsx:595`) | DONE | same spec | f1b69f6 | |
| F191 (`MobileBuffDrawer.tsx:111`, `profile/edit/page.tsx:595`) | DONE (C files) | spec "buff drawer, landscape tablet" (container `transition-property` is `transform`, never height) | 53529ea | The bar and its 46dvh panel are one block translated down by the panel's height when closed. Other files in the row are I and E. |
| F142 | DONE | spec "buff drawer, landscape tablet" at 900x600 in the bot game (closed panel carries `inert`, the bar has `aria-controls`, Escape closes and focus returns to the bar; before: no `aria-controls`, locator not found) | 53529ea | Scrim button is `tabIndex=-1`, `aria-hidden`. |
| F012 | DONE | spec "the title does not move when the account arrives" (/api/auth/me held; before: the h1 moved when the back button mounted) | f1b69f6 | Back control always drawn (username from the session display cookie, `/profile` when unknown). `EditProfileSections` is the one skeleton for loading.tsx and the page's in-flight state. |
| F144 (C part) | DONE | spec "save feedback lands in a live region" (5 persistent `role=status` slots) | f1b69f6 | Avatar, flair, bio, and each privacy row. Login and AchievementToast are slice A, DraftRevealBanner slice J. |
| F011 | DONE | spec "the profile header does not move after the page settles in" at 360 and 1280 (before: 0.0477 phone, the activity skeleton; 0.0149 desktop, FriendsModule) and `cls-after.txt` | f1b69f6 | The profile, `ensureAccount()` (shares the header's one /me and guest mint), `/stats` and the first `/games?limit=50` page start together and commit in one render. Cost: the first paint of a profile waits for the slowest of the four requests instead of the profile alone (the skeleton holds the shape meanwhile). |
| F021 | DONE | spec "the skeleton is the shape of the page" (plate and rail x/y/w equal to the skeleton's on desktop, x/w on a phone, where the Statistics block above the plate has a record-dependent height) | f1b69f6 | `src/components/profile/ProfileSkeleton.tsx`, built from the real shell's grid, rail and plate; used by `/u` loading.tsx, the Suspense fallback, the in-flight state, `/profile` loading.tsx and the `/profile` hand-off. `/profile` also forwards at once when the display cookie names the account. |
| F027 | DONE | code (stray `<div>Record</div>` removed; the offline shell's skeleton is the shared one) | f1b69f6 | |
| F013 | DONE | CLS `/settings` 360 signed-out 0.0841 to 0.0013, 1280 0.0212 to 0.0024; spec "the sign-in link returns to settings" (href `/login?next=%2Fsettings`) and "no late notice pushes the rows" | f1b69f6 | The notice comes from `useSession({ ensure: true })`: signed in or a guest draws nothing, a first visit is unknown until the guest lands (nothing drawn), signed out draws the line on the first paint. The probe now only decides offline and recovered. |
| F030 | PARTIAL | spec "an unknown name shows the shared not-found panel" (before: "Player not found", bespoke) | f1b69f6 | In-page missing and load-error states use `NOT_FOUND_COPY.player` and the NotFoundPanel / RouteError layout (one `<main>`). Still HTTP 200: the server existence check is P-u-server (owner Q37). See REQUESTS to E for the `as` prop that would let /u render the shared components directly. |
| F035 | DONE | `evidence/C/F035-decode.txt`, spec "a malformed percent name does not throw" | f1b69f6 | Slice E2's `safeDecode` already covered the layout metadata and JSON-LD. Verified live: `/u/%25zz` still errored, in `opengraph-image.tsx`'s `generateImageMetadata` (`URIError: URI malformed` in the RSC payload); fixed with the same fallback. `/u/%E0%A4%A` is a 400 from Next before any page code. |
| F138 | DONE | spec "report modal traps focus and restores it" and "history summary traps focus and restores it" (before: the history dialog was the scrim itself, parent background transparent, and the report modal had no dialog role) | f1b69f6, 53529ea | ReportModal, History GameSummary and ClipModal attach `attachDialog` to the PANEL with `role=dialog`, `aria-modal`, a name (report: `aria-labelledby`, reasons in a `radiogroup`, textarea labelled). Scrims are `bg-black/60` (the site's usual scrim; there is no scrim token). History close is an `iconOnly` Button (44px touch, 36px fine pointer). ClipModal is code only: it opens after a finished bot game, not reached by the spec. |
| F163 (`history/page.tsx:228`) | DONE | history spec asserts the scrim is `rgba(0, 0, 0, 0.6)` | 53529ea | ClipModal's `#0f0d0a` scrim too. The tournaments and tv entries are slice D. |
| F146 | DONE | spec "stat strip and heading semantics" (no link and no role-less `aria-label` span inside the h1) | f1b69f6 | Dot is `aria-hidden`, "Online"/"Offline" is sr-only text beside the heading, "playing now" link follows the h1 in the same row (same look). |
| F147 | DONE | same spec (dt, dd pairs in order) | f1b69f6 | `flex-col-reverse` keeps value over label. |
| F145 (C part) | PARTIAL | code; the report test drives the menu by pointer | f1b69f6 | `/u` tabs: roving tabindex plus ArrowLeft/Right, Home, End. OverflowMenu: focus moves to the first item on open, arrows, Home, End, Tab closes, Escape returns focus. Not done: FriendsModule menus (shared with slice D, next wave), /login tabs (slice A). P-tabs (visual) stays with the owner. |
| F158 | DONE | `test:case --list` no longer lists the file; minimize uses `Button size="sm" iconOnly` (44px touch, 36px fine pointer) | 53529ea | Sentence-case label; the identical ternary is one string (the `liftForDrawer` prop stays in the type for OnlineMatch). Not browser-verified: the notice only renders in an online simultaneous draft, which `next dev` cannot run (no DO). |
| F162 (C files) | DONE | `test:case` lists `u/[username]/page.tsx`, `RatingRail.tsx`, `ActivityFeed.tsx`, `WaitingCornerNotice.tsx`, `ClipModal.tsx` as stale baseline entries, now clean | f1b69f6, 53529ea | leaderboard and tv are slice D. |
| F178 | DONE | code | 53529ea | mobileChrome.ts docblock describes the tablet-only drawer. |
| F165 (C part) | NO-CHANGE | the C entry is `login/page.tsx:3`, owned by slice A this wave | | |
| F034 | TODO | | | Needs owner Q9 (suspended state wording and whether to 404) and a `suspended` field from slice F's `/api/users/[username]`. No default was taken. |
| F254 | TODO | | | Integrator wires slice L's email preference component; this slice was told not to add the row. |

ROUTES rows (columns this wave; the rest stay TODO):

| Route | layout | loading | states | interaction | a11y | responsive | Note |
|---|---|---|---|---|---|---|---|
| `/profile` | DONE | DONE | DONE | | | DONE (360) | Forwards to /u; shared skeleton; CLS under 0.01 at 360 and 1280. |
| `/profile/edit` | DONE | DONE | | DONE | DONE (F136, F137, F144) | DONE (360) | |
| `/u/[username]` | DONE | DONE | PARTIAL (F030 HTTP 200, F034 owner) | DONE (F138, F145 part) | PARTIAL (FriendsModule menus) | DONE (360) | |
| `/settings/(all)`, `/settings/[section]` | DONE | NO-CHANGE (SettingsSkeleton already in final geometry) | DONE (F013) | | | DONE (360) | |

Guards run after the change: `test:emdash` OK, `test:rounded` OK, `test:anim-props` clean, `test:reduced-motion` OK, `tsc` clean on every touched file, `eslint` clean on every touched file, `test:cls` 20 of 20 cells under 0.01 on these routes. `test:case --strict` and `test:buttons --strict` now report stale baseline entries for files this slice cleaned (REQUESTS).

## ADDITIONS

- `/u` OverflowMenu and the clip studio carried `shadow-2xl` (a real drop shadow, against the no-shadow rule); both removed.
- ClipModal had an unstyled `<p>Clip the finish</p>` (same class as F027); it is now the 12px caption the history summary uses.
- The `/profile/edit` avatar and flair errors were conditional spans inside a paragraph; they are persistent status slots now (part of F144).
- Em dashes removed from comments in the touched files (mobileChrome.ts, MobileBuffDrawer.tsx, `/u` page, SettingsScreen.tsx).
- Known and left: a top-10 player's laurel (header) and rail "Rank" lines come from the leaderboard fetch after paint and can still move the header row for those few players; the house editor and rating editor folds mount after `/me` at the bottom of the page (role gated, below the fold).

## PROPOSALS

None new. F030's remaining half is P-u-server (owner, Q37).

## OWNER QUESTIONS

None new. F034 waits on Q9.

## REQUESTS

1. Integrator (or whoever owns `scripts/check-case.ts`): remove these now-clean files from its baseline so `--strict` stops reporting them as stale: `src/app/u/[username]/page.tsx`, `src/components/clip/ClipModal.tsx`, `src/components/draft/WaitingCornerNotice.tsx`, `src/components/profile/ActivityFeed.tsx`, `src/components/profile/RatingRail.tsx`.
2. Integrator (owner of `scripts/check-buttons.ts`): remove `src/app/profile/edit/page.tsx` from BASELINE (clean now).
3. Slice E (`src/app/_components/NotFoundPanel.tsx`, `src/components/ui/RouteError.tsx` is shared UI): add an optional `as?: "main" | "div"` prop (default `"main"`) so a client page that already renders inside `<main>` under the site header can use the shared panels. `/u/[username]/page.tsx` would then replace its two local copies of that markup with `<NotFoundPanel as="div" ... />` and `<RouteError as="div" ... />`. Patch for NotFoundPanel: add `as: Tag = "main"` to the props and render `<Tag className="flex min-h-screen ...">` (for `as="div"`, drop `min-h-screen` so it sits under the header).
4. Slice L / integrator (`playwright.config.ts`): its `webServer` block starts `npm run dev` on :3000 whenever the shared server is momentarily down (it happened once during this slice's run, while the supervisor was restarting; the supervisor recovered). Suggest `webServer: process.env.POLISH_SHARED_SERVER ? undefined : {...}` and exporting `POLISH_SHARED_SERVER=1` in `scripts/polish/heavy.sh`, so fleet runs never start a second server on the shared port.
5. Slice J (`OnlineMatch.tsx:3659`): `liftForDrawer` on WaitingCornerNotice is now a no-op (its two branches were identical); drop the prop at the call site when convenient, then this slice removes it from the type.
6. Slice I: `/profile/edit` now uses `.settings-toggle` for its switches, so F198's shared Switch has one fewer implementation to fold in (HeaderSettingsMenu remains). WaitingCornerNotice's framer-motion entrance is still ungated (no MotionConfig); it follows whatever gate slice I lands for framer.
7. Slice F (after owner Q9): `/api/users/[username]` to expose `suspended: boolean` for banned accounts so `/u` can hide Challenge, Add friend and Message (F034).
