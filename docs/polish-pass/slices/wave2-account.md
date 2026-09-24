# Wave 2, area account

Findings from the wave 2 audit for `/login`, `/profile/edit`, `/u/[username]`, `/settings` and `/achievements`. Every probe ran against the shared dev server on :3000 through `scripts/polish/heavy.sh`, with Playwright on the bundled Chromium. The dev server restarted once during the runs, and the probe was run again after it came back. Throwaway accounts for the logout and friend probes use the `polish_` prefix, which the counts already leave out (Q5). The seeded `polish_user` session was never logged out.

## Results

| # | Finding | Status | Before | After | Commit |
|---|---|---|---|---|---|
| 1 | /achievements signed-out CLS, Journey block pushed down | DONE | 0.0988 at 360, 0.0378 at 1280 (offender `div.mt-8.space-y-9`, dy 137 / 88) | 0.0013 at 360, 0.003 at 1280; user state 0.0025 / 0.0014 | 253f4b4 |
| 2 | Log out on /settings leaves a raw JSON page | DONE | ended at `/api/auth/logout` showing `{"ok":true}` | ends at `/`, `/api/auth/me` says `user: null`; a form post gets 303 `Location: /`, a JSON post still gets 200 JSON | 1c07590 |
| 3 | "Edit profile" in Settings goes to the read-only profile | DONE | `href="/profile"` | `href="/profile/edit"` | 1c07590 |
| 4 | Placeholder rows on /settings fail colour contrast | DONE | axe color-contrast, 7 nodes (390 and 1280, signed-out) | 0 nodes at 390 and 1280, dark and light, signed-out, guest and user | 1c07590 |
| 5 | A guest can Log out with no warning and lose the account | DONE | same Log out button for every state | guest and no-session: a "Guest account" row with Create account (`/login?upgrade=1`), no Log out button; registered: Log out | 1c07590 |
| 6 | Leaderboard link on /profile/edit marked by colour alone | DONE | axe link-in-text-block, 1 node | 0 nodes (signed-out and user, 390 and 1280) | 7a8bfc2 |
| 7 | /login skeleton a different shape from the form | DONE | skeleton tabs 40.5px vs 53px, plate 229.5px vs 338px (360 and 1280) | tabs 53 vs 53, plate 338 vs 338, heading 27 vs 26.9 | 7a8bfc2 |
| 8 | Remove friend acts on one click | DONE | one press removed the friend | first press turns the item into "Remove NAME? Press again" (menu stays open, still friends); the second press removes | cddf2ab |
| 9 | Friend request failures are silent | DONE | button rolled back, no message | a `role="status"` line under the action bar shows the route's error text (checked with a forced 429) | cddf2ab |
| 10 | "Add a bio" link 58x20 at 360 | DONE | 58x20 | 57.6x44 on a coarse pointer, 57.6x24 on a fine one; the layout height does not change | cddf2ab |
| 11 | Signed-in user on /login gets no sign of the session | DONE | h1 "Welcome back" and an empty form | the server HTML carries "You are signed in as polish_user. Signing in below switches accounts." with a "Continue as polish_user" link to `next` | 7a8bfc2 |
| 12 | Register password rule only in the placeholder | DONE | placeholder "at least 8 characters", no minLength, no describedby | help line "At least 8 characters." (`#password-help`, `aria-describedby`), `minlength="8"`, no placeholder; the username rule is now tied to its field too | 7a8bfc2 |

Evidence: `docs/polish-pass/evidence/wave2/account-probe-{login,settings,profile}.json`, `account-login-skeleton-{before,after}.json`, `account-axe-after.json`. The CLS numbers are from `scripts/polish/cls.ts` runs (2 runs for /achievements).

## Notes per finding

**1. /achievements CLS.** Root cause: a visitor with no session starts in the loading state, `fetchMe()` answers null before the header's guest mint, and the sign-in banner (about 117px on a phone plus `mt-5`) is inserted above the wall. Class: a signed-out state known at request time but only drawn after a round trip. Fix: the page reads `useSession().display` once. `null` there means no session cookie on the request, so the content starts in the `signin` state with the banner and the locked wall on the first frame and skips the /me call. A brand new guest has nothing unlocked, so the locked wall is also correct once the header mints one. `?u=NAME` is unchanged. Siblings: `/profile/edit` already renders its signed-out plate from the same seed (F012). The remaining 0.0013 is the header chip.

**2 and 5. Log out.** Root cause: a plain `<form method="post">` to a JSON route. Class: a form posting to an API that only answers fetch callers. The button now calls `authClient.logout()` (which also clears the session store) and then `window.location.assign("/")`, the same as the header's Sign out. A network failure shows a status line and re-enables the button. The route also answers a urlencoded or multipart post with `303 Location: /`, so a script-less or future form lands on a page. The route was also checked with `scripts/check-auth-safety.ts`'s JSON post, which is unchanged. For guests the header menu already hid Sign out. Settings now does the same and offers the upgrade path. `display === null` (no cookie yet) gets the guest row because the header mints a guest for that visitor. No other `action="/api/...` forms exist in `src` (grep).

**3. Edit profile.** One-line href fix. `/u` already used `/profile/edit` for its own button.

**4. Contrast.** The rows were not controls, so `opacity-70` had no exemption. It is removed. The badge's `--badge-rgb` `152 145 127` still measured 4.26:1 at 12px without the opacity, so it now uses `var(--text-primary-rgb)`, the theme's own text triple (an existing token that follows the light theme). In `Slider`, `opacity-40` moved from the wrapper to the `<input>`, so the disabled track still dims but the readout text keeps its contrast. Sibling left: `PieceColorPicker` dims its enabled buttons with `opacity-60` when a Lichess set is chosen (rows.tsx:760). It sits inside a closed disclosure, so axe did not reach it. Those buttons are still live controls, so it is the same class and should get the same treatment in a later pass.

**6. Link in text.** Both `hover:underline` links in /profile/edit sentences now use the repo's standard in-text link `text-gold-leaf underline underline-offset-2`. The other `hover:underline` hits in this area are stand-alone controls (item 10), not links inside text.

**7. /login skeleton.** Measured by rendering `loading.tsx` into the live /login page in place of the form (`renderToStaticMarkup`, same stylesheet) at 360 and 1280. Before and after are both in the evidence. Root rem is 14px, so `h-9` was 31.5px, not 36. The skeleton now uses px heights taken from the real form, draws the real "or" rule and adds the Google link block. The signed-in notice (item 11) is not in the skeleton. It only shows for a registered session, and the header does not link a signed-in user to /login.

**8. Remove friend.** A two-step confirm inside the menu, not a dialog: the first press changes the item's label and colour and keeps focus on it; the second press acts. Opening the menu again resets it. Undo was not added because the API has no restore for an accepted friendship.

**9. Friend errors.** `friendFailure()` uses the route's `error` text when there is one (the 429 from `rateLimit` says how long to wait), then a line per status. The status `<p>` is always in the DOM and has no height when it is empty, so it is announced and moves nothing when idle.

**10. Hit areas.** One class constant, `BARE_TEXT_TARGET`: 44px min height on coarse pointers with `-my-3` giving the space back, and 24px with `-my-0.5` on fine pointers. It is used on "Add a bio" in the header, the in-panel "Add a bio"/"Edit" button and the bio "More"/"Less" button (the same bare-text pattern).

**11. Signed in on /login.** The notice reads the nc_who hint once at first render, so it is in the server HTML (checked with curl). The first cut followed `display` live. With a session that has no nc_who cookie yet (the seeded harness user), the notice arrived when /me answered, and CLS on /login went to 0.1044 at 360. The notice now only shows when the hint is present at paint. A hint-less session gets the hint from that /me and sees the notice on the next load. /login CLS after: 0.0025 / 0.0014 user, 0.0013 / 0.0025 signed out, 0 / 0.0005 guest.

**12. Password rule.** Native `minLength` stops a 7-character password before the round trip. The server rule (register route, 8 characters) is unchanged.

## Regression checks

- `e2e/polish/account-routes.spec.ts`: 19 passed.
- CLS on /settings, /login, /u/polish_user and /profile/edit at 360 and 1280, signed-out and user: all under 0.01 after the item 11 change. No ceilings in `cls-thresholds.json` cover these routes, so there was nothing to lower.
- axe on /settings and /login at 390 and 1280, dark and light, signed-out, guest and user: 0 violations.
- eslint on every touched file; `tsc --noEmit` shows no errors in touched files.
- Removed three existing em dashes in `rows.tsx` and `controls.tsx` comments.

## REQUESTS

- Design system owner: `.btn-leaf` measures 3.26:1 (white on `#3692e7`, axe with a 1.5s settle on the first cut of the new settings button). That passes only as large text, so a 13px or 14px `.btn-leaf` label fails AA. axe.ts reports it on some runs and not others (the "Find a match" button on the /achievements signed-out banner, and the Challenge button on /u/NAME), which suggests the audit sometimes catches the button mid-transition. The colour pair itself is below 4.5:1. The new buttons in this area use `tone="ghost"` for that reason. Changing the pair is a palette decision, so it is left to the owner.
- Area owning `src/components/SiteHeader.tsx`: the header account chip widens after /me on /login and /achievements when the session has no nc_who hint (0.0013 to 0.0035 residual CLS on these routes, and most of the harness `user` cells).
- Out of the finding list, fixed while measuring: on /achievements, the "Locked" badge on each locked card was a plain `span` with `aria-label`, which axe flags as `aria-prohibited-attr` (102 nodes). It now has `role="img"`. axe on /achievements at 390 and 1280, signed-out and user: 0 violations.
