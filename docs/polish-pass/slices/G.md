# Slice G: moderator panel and user counting (wave 1)

Scope: brief sections 15 and 16. Files: `src/app/mod/*`, `src/components/mod/*`, `src/app/api/mod/*`, `src/app/api/stats`, `src/app/api/analytics/*`, `src/lib/server/{mod,modGames,metrics}.ts`, `src/lib/godPanel.ts`, `migrations/0041_mod_audit.sql`, `migrations/0042_metrics_indexes.sql` plus their `schema.ts` mirror block.

Regression checks (both run against the shared dev server and local D1, seeded accounts):

- `./node_modules/.bin/tsx scripts/polish/mod-test.ts --out FILE`: 20 checks on the mod API. Before the fix 6 of 20 passed (`evidence/G/mod-test-before.json`), after 20 of 20 (`evidence/G/mod-test-after.json`).
- `./node_modules/.bin/tsx scripts/polish/metrics-sql-test.ts --out FILE`: the F117 before/after count on fixture games (old analytics query counts 4 seats, the shared human predicate counts 1) and EXPLAIN QUERY PLAN for every metrics and queue-health query (`evidence/G/metrics-sql-and-plans.json`).

Commits: 1b36ae8 (audit log, player context, safety, UI), 9061981 (metrics.ts, analytics, stats, dashboard queue health).

## Row updates

| Row | Status | Evidence | Commit | Note |
|---|---|---|---|---|
| F115 | DONE | `mod-test-before.json` (context by id: empty history, no reports, roster instead of the player), `mod-test-after.json`, `players-context-1280.png`, `players-context-390.png` | 1b36ae8 | Root cause: the detail read `history`/`reports` from the search response, which only filled them for an exact-name match of the query, so a player picked from the roster or a prefix search showed "Clean record". Class: detail state derived from list state. `GET /api/mod/users?id=` now returns the selected account's context (mod history, reports against, reports filed, 10 recent archived games with result and opponent, account age, email on file, last seen, name flag) and the panel loads it on selection and after each action. The search answers only the list. Linked-account signals stay a proposal (Q16, nothing new collected). |
| F116 | DONE | `mod-test-*.json` checks `[F116]`; audit rows visible in `players-context-1280.png` (report_resolved with its note) | 1b36ae8 | Migration 0041 adds `target_kind`, `target_ref`, `before_json`, `after_json` to `mod_actions` (non-player rows store `''` in the NOT NULL `target_user_id`; SQLite cannot relax it in place) and `reports.handled_note`. One writer, `logModEvent` / `modEventStatement` in `mod.ts`, called by every mutating mod route: sanctions, report close, chat-flag review, card override save, clear and delete, house toggle, games pin, strength overrides, persona edits (batched with the edit), rating edits (batched, before values of every rating row kept), god-panel switch, webhook test. The webhook still mirrors, after the row. Audit log gained "Reports & flags" and "Cards, bots & settings" chips, a `?kind=` filter on the API, and a "Change" disclosure with before/after. Q13 no longer blocks a record. |
| F117 | DONE | `metrics-sql-and-plans.json` checks `F117` (old query 4 seats including 2 house and 1 test account, new 1) | 9061981 | Analytics DAU/WAU/MAU, per-day actives, new users, user and game totals use the shared human predicate (`humanSeatSql`, `HUMAN_USER_SQL`, `HUMAN_GAME_SQL`); the wrong comment about guests having NULL ids is fixed. Response keys unchanged; figures will drop (Q15), which is internal only. |
| F118 | DONE | `metrics-after.json`, `stats-metrics-390.png`, `stats-metrics-1280.png` | 9061981 | `src/lib/server/metrics.ts` owns every definition and ships them in the payload; `/mod/stats` prints the exclusion rule and one definition per block. All per-day figures are UTC calendar days; DAU/WAU/MAU are rolling 24h/7d/30d, written next to them. `/mod/stats/all` "Players" is relabelled "Accounts, bots and guests included" and both "Games today" tiles (rolling 24h in /api/stats) say "Games, last 24 hours". The public /api/stats numbers are unchanged (owner directive 2). |
| F120 | DONE | `mod-test-*.json` `[F120]` (before: `[]` for "polish_u") | 1b36ae8 | LIKE metacharacters are escaped with `ESCAPE '\'` instead of stripped. |
| F121 | DONE | `mod-test-*.json` `[F121]` (mute without reason: 200 before, 400 after) | 1b36ae8 | `ConfirmButton` and `useArmedPress` in `mod/ui.tsx`: first press arms (label becomes "Confirm: ...", nothing moves), second press within 5 s runs, blur or Escape disarms. Used for ban, permanent mute, flag username, promote, demote, "Mark all shown reviewed", strength "Reset all" and "Very weak", persona Reset, card "Reset to code". A reason is required server-side (`applyModAction`) and in the UI for every player action, reversals included. |
| F122 | DONE | `mod-test-*.json` `[F122]` | 1b36ae8 | POST takes `{ ids }` (the flags on screen, max 200) or `{ id }`; `{ all: true }` is refused. One audit row with the count and ids. |
| F123 | DONE (audit part) | `mod-test-after.json` (log shape); code in `api/mod/ratings/route.ts` | 1b36ae8 | Every rating edit writes an audit row in the same batch with the legacy column and every `user_ratings` row it overwrote, so it can be reverted. Self and admin edits are still allowed: Q14 default keeps the role model, and the editor is the owner. Same-origin check added. |
| F124 | DONE | `mod-test-*.json` `[F124]` (unknown id: 200 before, 400 after) | 1b36ae8 | DELETE validates the id (and optional `kind`) against the card libraries, loads the row, audits the removed override (restorable), and the editor sends `kind`. |
| F125 | PARTIAL | `metrics-sql-and-plans.json` (plans), `metrics-after.json` | 9061981 | Indexed and cached `/api/mod/metrics` built (migration 0042: `idx_users_guest_created`, `idx_reports_reporter`). DAU is defined as "finished a game", which the archive already records, so no `user_activity_days` table is needed. Online now and peak today need slice H (REQUESTS): until then the panel shows the public figure when the DO answers and says why the human figure is missing (locally the DO is not bound, so all three read n/a with that note). |
| F126 | DONE | `curl /api/mod/overview` queue block in this file's session: `oldestUnreviewedFlagAt` and 7 `handledPerDay` rows; plans in `metrics-sql-and-plans.json` | 9061981 | Oldest open report and oldest unreviewed flag (index heads) as tile subtitles, handled per day for 7 UTC days (reports closed / flag reviews / player actions) under the queue tiles. |
| F127 | DONE | `mod-test-*.json` `[F127]` (second close: 200 before, 409 after) | 1b36ae8 | Close is conditional on `status = 'open'`; 409 names who closed it. Note stored in `reports.handled_note` and the audit row. A moderator cannot close a report filed against themselves (403). The Reports card surfaces errors and has a note field and an "Inspect <player>" handoff to the Players section. |
| F128 | DONE | code: `fullMovesFromPlies` in `modGames.ts` | 9061981 | Game archive rows and the archive stats average both show chess moves (plies / 2), matching /mod/stats. |
| F129 | DONE | `nav.ts` | 1b36ae8 | The House personas entry shows for every moderator, matching the page and `/api/mod/house/personas`. |
| F200 (mod part) | DONE | `mod/page.tsx` | 1b36ae8 | Section switch scroll uses `detectReduced()` (html[data-anim] aware): auto when motion is off. |
| F046 (api/mod) | DONE, SECURITY | `mod-test-*.json` `[F046]` (cross-site warn: 200 before, 403 after) | 1b36ae8 | `requireMod` runs `assertSameOrigin` on every non-GET; the rating and persona routes (own gates) do too. Mod JSON bodies go through `readJsonObject` (size cap, plain object, JSON content type), except the persona route, which accepts avatar data URLs above the 16 KB cap. |
| F045 | PARTIAL, SECURITY | `godPanel.ts` | 1b36ae8 | `POWER_USERNAMES` / `isPowerUsername` list every name that unlocks an owner tool; `applyModAction` refuses `flag_name` on them (a flag forces a rename, which would free the name). Reserving the names at register and rename is in auth routes: REQUEST below. Gating by user id needs Q14. |
| F102 | DONE | code: `api/stats/route.ts` | 9061981 | One computation per minute per instance, `s-maxage=60`; payload and numbers unchanged. Mod pages now read counts from `/api/mod/metrics`. |
| F101 | NO-CHANGE (for G) | `ls migrations` | | G numbered its migrations 0041 and 0042 with no duplicate; the old duplicates are history. |
| F109 | PARTIAL | `metrics-sql-and-plans.json` "reports filed by a player": SEARCH using idx_reports_reporter | 9061981 | `idx_reports_reporter` added in 0042 (needed by the player context). The other four P-idx indexes are left to the decider. |
| /mod, /mod/stats routes | PARTIAL | `players-context-*.png`, `stats-metrics-*.png` (390 and 1280: no horizontal overflow, no console errors) | | Full route checklist (CLS, flash, axe) not run for the mod routes in this wave. |
| F081, F093 | TODO | | | F081 needs H's internal DO route (P-mod-push). F093 needs a counter in a route slice F owns. |

## ADDITIONS

- A-G-metrics: `src/lib/server/metrics.ts` and `GET /api/mod/metrics` (mod only, `private, no-store`, database part cached 60 s per instance). Justification: brief 16, one source of truth. Exports for other slices: `HUMAN_USER_SQL` (users WHERE fragment), `humanSeatSql(col, testIds)`, `isBotUserId(id)`, `EXCLUSION_RULE`, `DEFINITIONS`.
- A-G-audit: `logModEvent` / `modEventStatement` in `src/lib/server/mod.ts` (every mod write), audit-log kind filter.
- A-G-context: player context by id in `GET /api/mod/users?id=`.
- A-G-confirm: `ConfirmButton`, `useArmedPress` in `src/components/mod/ui.tsx`.
- Stats page "People" block under the two scope cards on `/mod/stats`: online, accounts, active users, sign-ups (90-day bar chart, one series, week and month tables as the table view), games per day by mode and seat kind.

## REQUESTS

- Slice H (worker.ts): add an internal DO route `GET /mod/online` (reachable only through the DO stub, like `/live-game`) returning `{ humans, peakHumansToday, peakAt, publicFigure }`: `humans` = distinct signed-in human user ids with an open socket (the `seen` map before house presence is merged, house ids excluded) plus real anonymous sockets (the `anonymous` count before padding); `peakHumansToday`/`peakAt` = the highest `humans` since 00:00 UTC, kept in DO storage keyed by UTC day and updated whenever the lobby payload is built; `publicFigure` = `players.length + anonymous` exactly as the public payload computes it (unchanged, owner directive 2). `getOnlineNow()` in `metrics.ts` already calls it and falls back to `/lobby`.
- Slice F / A (auth routes): refuse registration, guest upgrade and rename into any name in `POWER_USERNAMES` (`src/lib/godPanel.ts`, `isPowerUsername`) unless the account already holds it, alongside the ADMIN_USERNAMES reservation (Q14 default).
- Slice F (F119): switch `users/search` and `community/active` to `HUMAN_USER_SQL` (users rows) or `isBotUserId` (ids) from `src/lib/server/metrics.ts`.
- Integrator (package.json, slice L): add `"test:mod": "tsx scripts/polish/mod-test.ts"` and `"test:metrics-sql": "tsx scripts/polish/metrics-sql-test.ts"` (both need the dev server and `npm run polish:seed`).
- Integrator: migrations 0041 and 0042 must be applied in production before the new mod routes deploy (`wrangler d1 migrations apply nerfchess --remote`); `ensureSchema`'s additive pass also covers them on the first cold start (it re-runs the whole additive list once, as every schema append does).

## PROPOSALS

- P-registered-at: `users.registered_at` stamped at register and guest upgrade, so sign-ups count the day an account registered rather than the day its guest was created (today's definition says so on the page). Needs a column and auth-route writes (slice F/A).
- P-mod-triage (unchanged, Q37): keyboard shortcuts (j/k/r/d) and bulk resolve on Reports. Not built. What exists without a layout change: note, error and "Inspect player" on each report card, bulk review of shown chat flags.

## OWNER QUESTIONS

- Q-G1: the rating editor can still set its own and admins' ratings (now audited and revertible). Keep, or block self edits? (extends Q14)
- Q-G2: every player action now needs a written reason, reversals (unmute, unban, clear name flag) included. Keep for reversals, or make it optional there?
