# Slice F (API + security), wave 1

Owner: F agent. Ledger updates for the integrator to fold into `LEDGER.md`.
Evidence: `docs/polish-pass/evidence/F/`.

Scope this wave: `src/app/api/**` except `api/auth` (slice A), `api/mod`, `api/stats`, `api/analytics` (slice G), `api/email` (slice L); `src/lib/server/{social,db,turnstile,tournamentEngine}.ts`, new `src/lib/server/request.ts`, `src/lib/textInput.ts`, `src/lib/profanity.ts`, `src/lib/avatars.ts`. Auth findings that live in `api/auth/*` or `auth.ts` are A's files this wave: A fixed F042, F043, F047 (auth), F062, F063 and F076 in 8b1c3ec and F046 (auth) in c3fd1da; F095 (auth.ts) and F064, F099 remain with A and L.

Regression tests (brief 14), all fail on the code before the fix and pass after:

- `scripts/polish/api-fuzz.ts`: 71 checks against the dev server. Regression checks per finding, then a 1,246-request bad-input matrix over every mutating route this slice owns plus hostile GETs (null, arrays, scalars, broken JSON, 200 KB bodies, 5,000-deep nesting, form bodies, type confusion, 10k-character strings, zero-width, RTL override, HTML and script, emoji floods, SQL-looking text, control characters, Zalgo marks, prototype keys, 5,000-character path segments). Uses its own accounts (`polish_fuzz_a`, `polish_fuzz_b`, muted `polish_fuzz_m`) and deletes what it wrote. Before: `evidence/F/api-fuzz-before.txt` (60 of 71 checks fail; 19 of the matrix requests were 500s, 14 of them the null-body crash). After: `evidence/F/api-fuzz-after.txt` and `.json` (71 of 71, 0 server errors).
- `scripts/polish/api-unit-test.ts`: arena record validation (the route needs a secret), avatar ids, clock bounds, arena id shapes. `evidence/F/api-unit-test.txt` (includes the HEAD `isAvatarId("toString") === true` before state).
- `scripts/polish/text-input-test.ts`: the text normaliser, profanity folding, `intParam`, the in-memory limiter. `evidence/F/text-input-test.txt` (HEAD profanity: 6 of 10 fail; after: 54 of 54).

Error shape everywhere: `{ error: string }` (the shape every client already reads), with 400 bad input, 401 no session, 403 refused (cross-site, muted, not yours), 404, 409, 410 expired, 413 too large, 415 not JSON, 429 with `Retry-After`.

## ROW UPDATES

### Findings

| Row | Status | Evidence | Commit | Note |
|---|---|---|---|---|
| F046 | DONE for slice F and A routes, mod pending (SECURITY) | `api-fuzz-before.txt` / `api-fuzz-after.txt` lines `[F046]` | 054e415, 159899b, 7a2c609, 6522acf | Every cookie-authenticated write this slice owns now starts with `assertSameOrigin` (Sec-Fetch-Site cross-site, a foreign Origin, or Origin `null` answer 403; non-browser clients with neither header pass, they carry no ambient cookie) and bodies must be `application/json` (415 otherwise: text/plain and form bodies are what a cross-site form can send without a preflight). Before: a cross-site Origin, a cross-site Sec-Fetch-Site, a text/plain JSON body and Origin null all returned 200 on `/api/friends`, and a cross-site bodiless POST counted a bot game. Auth writes got the same rule from slice A in c3fd1da (its own copy in `api/auth/_lib/sameOrigin.ts`; it could import `assertSameOrigin` instead, see REQUESTS). Remaining: `api/mod/*` (slice G, REQUEST). Flag in the PR as security. Round 1: `Sec-Fetch-Site: same-site` is now refused too (it was allowed, while the comment named same-site subdomains as a reason Lax is not enough; no sibling subdomain, arena, engine or og-cache, writes here from a browser). `api-unit-test.ts` gained seven F046 checks; `same-site-before.txt` (same-site answered 200) and `same-site-after.txt` (47 of 47). |
| F047 | DONE (slice F routes) | `api-fuzz-before.txt` (14 null-body 500s, 19 matrix 500s), `api-fuzz-after.txt` (all 400, matrix 0 of 1,246) | 054e415, 159899b, 7a2c609, 6522acf | `readJsonObject` / `guardJsonWrite` in `src/lib/server/request.ts`: size-capped stream read (16 KB default, 413 over), plain object only. Used by every POST/PUT/PATCH in slice F. `api/auth` fixed by slice A in 8b1c3ec; `api/mod` is G's (REQUEST). |
| F048 | DONE | `api-fuzz-after.txt` `[F048]` (insights `constructor`, `toString`, `__proto__`, `hasOwnProperty` were 200 and cached for an hour, now 404), `api-unit-test.txt` (HEAD `isAvatarId("toString")` true, now false) | 054e415, 6522acf | `avatars.ts` uses own-key lookup in `isAvatarId` and `avatarIdFor`; `/api/cards/insights` checks `hasOwnProperty` before indexing `NERF_BY_ID`/`BUFF_BY_ID` (`cardCodex.ts` is E's and needs no change once callers check). Siblings grepped in owned files: `in SUBS`/`in CONFUSABLES` in profanity.ts index single characters only (no multi-char prototype names reach them); no other `x in OBJ` lookups on user input in slice F files. |
| F052 | PARTIAL | `api-fuzz-after.txt` `[F052]`, `text-input-test.txt` | 054e415, 159899b, 7a2c609 | `src/lib/textInput.ts` `cleanText` (NFC, drops control and every `\p{Cf}` except emoji ZWJ, script ZWJ/ZWNJ and flag tags; blank lookalikes; space collapse; 4 marks per base; orphan marks; grapheme-safe code-point cap) is applied to DMs, club posts, club names and descriptions, tournament names and descriptions, report descriptions, suggestion fields and the search box. A zero-width-only DM was stored (200), now 400; `U+202E` was stored, now stripped. Remaining: game chat and spectator chat in `worker.ts` (slice H, REQUEST). |
| F053 | PARTIAL | `api-fuzz-after.txt` `[F053]` (1,500 emoji DM: before 500 code points by UTF-16 slice, after 1,000 code points, no lone surrogate) | 054e415, 159899b | Same helper; `worker.ts` caps are H's (REQUEST). |
| F054 | DONE | `text-input-test.txt` (HEAD: fullwidth, accented, Cyrillic, Greek, circled all pass the filter; after: caught; clean words and Cyrillic prose still pass); `profanity-cyrillic-before.txt` / `-after.txt` (round 1 fix: Russian "соска" was censored as "cock", 2 fail before, 58 of 58 after) | 054e415, 386dcde | NFKD plus mark stripping plus a small confusables map in `normalize()`. Shared by username checks, chat (worker) and the API routes. Round 1: Cyrillic and Greek lookalikes now apply only when the text also carries ASCII letters, digits or substitution symbols (a disguise mixes scripts); a word written wholly in Cyrillic or Greek is left alone, so Russian text is no longer censored for folding into a listed word. The dead `ё` and `ї` keys are gone (NFKD splits them first). See F-Q4. |
| F057 | DONE | `api-fuzz-after.txt` `[F057]` (12 anonymous posts from one IP: before 12 x 200, after 10 then 429) | 6522acf | Per-IP `rateLimit` (10 per hour) for every submitter before the per-account daily cap; email only for registered, non-guest accounts; the Resend call now has a 5 s timeout. Switching to `email.ts` waits for slice L to create it. |
| F058 | DONE | `api-fuzz-after.txt` `[F058]` (24 request/cancel loops: before 25 bell rows, after 1 bell row and 429 after 20; muted: before 200, after 403) | 159899b | 20 requests per sender per hour; one unread friend entry per actor; muted senders refused; `ON CONFLICT DO NOTHING` removes the concurrent-insert 500; action enum checked first. Guests unchanged (integrator Q2/Q3). |
| F059 | PARTIAL | `api-fuzz-after.txt` `[F059]` (999999 s clock, negative increment, muted sender: 200 before, 400/400/403 after; 14-challenge flood: before 14 x 200 and 20 bell rows, after 429 from the 3rd and 5 bell rows) | 159899b | Clock must pass `CUSTOM_GAME_CLOCK` (the bounds `worker.ts createMatch` enforces), 12 per sender per 10 min and 5 per sender and target pair, muted refused. Not done: checking the code is a real open game (needs a DO lookup in `gameServer.ts`, slice H). |
| F060 | DONE | `api-fuzz-after.txt` `[F060]` | 7a2c609 | Name normalised and refused on profanity, description censored, muted and name-flagged creators refused, `startsAt` must be within the past day and the next 90 days, 5 creations per account per day. Mod hide stays proposal P-mod-tourney. Guests unchanged (Q3). |
| F061 | DONE | `api-fuzz-after.txt` `[F061]` | 7a2c609 | Club name normalised (a four-zero-width-space name was accepted, now 400) and refused on profanity; description censored; muted refused; 3 new clubs per day and 10 owned at most; board posts 8 per minute. |
| F065 | NO-CHANGE | Integrator decision Q2/Q3 ("guest behaviour unchanged") | none | The limits above apply to guests like everyone else; no guest-only ban. `mutedRefusal` in social.ts is the hook if the owner later says guests are out. |
| F066 | DONE | `api-fuzz-after.txt` `[F066]` (9 KB desync and tv bodies were 200, now 413; 140 tv beacons from one IP: before 0 limited, after 20 limited) | 6522acf | 4 KB body cap and an in-memory per-IP window (desync 20 per minute; tv 120 per minute, while one page load sends at most 200 beacons over its whole life) so the sinks still never write D1. |
| F070 | DONE | `api-fuzz-after.txt` `[F070]` (35 pings: before 0 limited, after 5 limited) | 6522acf | 30 counted bot games per account per hour; also same-origin. Client game-id dedupe not done (the client sends no id). |
| F072 | DONE | `api-fuzz-before.txt` (205-message thread ended at "fuzz message 199"), `api-fuzz-after.txt` (ends at 204, 200 rows, ascending) | 159899b | `ORDER BY created_at DESC, id DESC LIMIT 200`, reversed. Paging is proposal P-msg-page. |
| F073 | DONE | `api-fuzz-after.txt` `[F073]` (`0A1B2C3D` was 400, now 404), `api-unit-test.txt` (2,000 `newId()` values all pass; the old pattern refused over half) | 6522acf | `/^[A-Z0-9]{4,12}$/`. |
| F074 | DONE | `api-fuzz-after.txt` `[F074]` (withdraw from a finished event: before 200 and the standings row deleted, after 400 and the row kept) | 7a2c609 | Stale comment replaced. Withdraw while running still deletes the entry: proposal P-tourney-withdraw. |
| F075 | DONE | `api-fuzz-before.txt` (opening the DM marked the friend request read), `api-fuzz-after.txt` | 159899b | DM dedupe and DM mark-read match `href LIKE '/inbox/%'`; friend entries use `/friend`. Dedicated type stays proposal P-notif. |
| F077 | DONE | `api-fuzz-after.txt` `[F077]` (3 archived games, no `?limit`: before 1 row, after 3), `text-input-test.txt` (`intParam`) | 6522acf | `intParam()` in request.ts; also used by games/recent and leaderboard. |
| F078 | PARTIAL | `api-fuzz-after.txt` `[F078]` (10800 s tournament: before 200, after 400), `api-unit-test.txt` | 054e415, 7a2c609 | New `src/lib/clockBounds.ts` (`CUSTOM_GAME_CLOCK` 7200+60, `TOURNAMENT_CLOCK` 7200+180) used by challenges and tournaments. `worker.ts` still has its own literals (REQUEST to H). |
| F093 | TODO | | | Counting desyncs is proposal P-err-count (L + G). |
| F094 | TODO | | | Waits on owner question Q17 (no integrator default). |
| F096 | DONE | `api-fuzz-after.txt` `[F096]` (accept past the 30 min TTL: before 200, after 410; resolving `FZHREF` used to mark `FZHREFX` read, no longer) | 159899b | Exact `href = challengeHref(code)` match; the challenge code in the path is validated. |
| F097 | DONE | `api-unit-test.txt` (16 malformed records refused, valid, aborted and draft records accepted) | 054e415, 6522acf | `validArenaEndRecord` in `src/lib/server/arenaRecord.ts`: mode enum, house seats, seat names, move strings (2,000 max), result, timestamps; 1 MB body cap; errors keep the route's `bad_json`/`bad_record` codes. |
| F103 | PARTIAL | `evidence/F/F103-profile-timing.json` (15 alternating runs against a copy of the HEAD handler, dev server: median 681 ms before, 486 ms after) | 6522acf | The seven reads that depend only on the account row (viewer session, friend count, clubs, ratings, recent games, rating history, live game) run in one `Promise.all`. Not done: server-side downsampling of the 4,000-point rating history, because `RatingChart` only buckets by day above 240 points and `recentRatingDelta` reads the first point of a window, so a naive downsample changes the chart for sparse histories (proposal P-history-points). Local D1 has no archived games, so the timing is round-trip bound; production gains are larger (seven serial D1, PG and DO round trips become one wave). |
| F104 | PARTIAL | `api-fuzz-before.txt` (a 470K-character valid PNG icon was accepted), `api-fuzz-after.txt` (413) | 7a2c609, 386dcde | Round 1: the 400 and 413 texts now both state the real limit from `CLUB_ICON_LIMIT_TEXT` in `limits.ts` ("PNG, JPEG or WebP, up to about 220 KB and 1024px"); the 400 used to say 1 MB. Club icon uploads held to the client's own 300,000-character budget (`src/app/api/clubs/limits.ts`), so 50 clubs cap near 15 MB instead of 100 MB. Existing oversized icons stay until re-uploaded. Full fix is proposal P-club-icon; lower client budget is a REQUEST to D. |
| F105 | DONE (slice F routes) | `api-fuzz-after.txt` `[F105]` | 159899b, 7a2c609, 6522acf | `private, no-store`: messages list and thread, notifications, friends, challenges GET, users/settings GET, history, profile, profile friends, clubs list and detail (viewer `joined`/`myRole`), tournament detail (carries the caller's seat token), leaderboard (`me`). `public, max-age=0, s-maxage=30, stale-while-revalidate=60` (browsers always revalidate): community active and recent, users search, user games, stats, achievements, games/recent. `public, max-age=300, s-maxage=3600` on a found archived game only (misses are not cached). |
| F106 | DONE (API) | `api-fuzz-after.txt` `[F106]` | 6522acf | Optional `?limit=` (1 to 250) and `?meOnly=1`; default response unchanged. Callers switching is a REQUEST to D (community) and J (OnlineMatch). |
| F107 | PARTIAL | code review; `api-fuzz-after.txt` (tournament flows still pass) | 7a2c609 | Unmeasured: no before/after timing of a 16-board round and no test drives parallel board creation or resolution yet (reviewer round 1), so this stays PARTIAL until `startNextRound` is timed against the dev DO. Result collection and game creation run through `mapLimit(…, 8)` (board order kept for the insert batch); junk ids 404 before the engine runs. Scheduler stays proposal P-tourney-sched. |
| F108 | DONE | `api-fuzz-after.txt` `[F072]`/`[F075]` flows | 159899b | One `EXISTS` read decides; the two UPDATEs run (in one batch) only when something is unread. `since=` stays proposal P-msg-page. |
| F109 | TODO (proposal P-idx) | `evidence/F/query-plans-0045.json` (supporting evidence for P-idx: report throttle, session sweep and clubs per owner are full SCANs today; the plans with the proposed indexes are an index search or range) | | The ledger routes F109 to proposal P-idx (decider: Schema) and Q37 says no proposal is built, so the migration and schema mirror built in 8ed3f3e were reverted in e7034c1. The five index statements are under PROPOSALS (P-idx) for slice G or the owner. Pruning `login_attempts` (now also holding `rl:` keys) needs a scheduled sweep: P-rl-prune. |
| F119 | TODO | | | Waits on slice G's shared house/seed predicate; search and community/active will switch to it. |
| F168 | PARTIAL | `api-fuzz-after.txt` `[F168]` | 7a2c609 | `club_slug` added to the tournament detail; the page link is D's (REQUEST). |
| F038 | PARTIAL | code; `api-fuzz` matrix covers `?q=` | 7a2c609 | `/api/clubs` now appends every club the viewer joined beyond the top 50 and accepts an optional `?q=` name search (escaped LIKE, normalised). The page switching to it is D's (REQUEST). |
| F034 | TODO | | | Waits on owner question Q9. |
| F079 | TODO | | | Waits on owner question Q24 (the API still accepts 0+N; 0+0 is refused for tournaments). |
| F042, F043, F062, F063, F076 | fixed by slice A | A's `8b1c3ec` | 8b1c3ec | `api/auth/*` is slice A's in wave 1; recorded here only because the ledger rows name slice F. |
| F064, F099 | not slice F this wave | | | F064 waits on Q2 (A); F099 is a schema change for L and A. |
| F095 | TODO | | | Deleting only the presented token is in `auth.ts` (A, REQUEST below). A sweep index is part of proposal P-idx. |

### Backend rows

| Group | Status | Note |
|---|---|---|
| users: profile, friends, games, stats, achievements, search, settings | DONE except F034, F094, F119 (owner/G) | username params length-checked (404 on 5,000-char names), settings writes guarded, caching per F105, F077, F103 partial. |
| friends, messages, notifications | DONE | F058, F072, F075, F108; mute rule on friend requests. |
| community | PARTIAL | caching done; F119 waits on G. |
| clubs | DONE (API) | F038 and F104 partial on the page side. |
| report, suggest, feedback | DONE | report: reason enum, normalised description, game id pattern, 5/day (an index for it is proposal P-idx); suggest F057; feedback: guarded, game id pattern. |
| games, history | DONE | F070, F073, caching. |
| leaderboard | DONE (API) | F106. |
| tournaments | DONE except F079 (Q24) | F060, F074, F078 (API), F107, F168 (API). |
| challenges | PARTIAL | F059 real-game check needs H. |
| arena ingest | DONE | F097. |
| cards | DONE | F048. |
| desync, tv-telemetry | DONE except F093 | F066. |
| CSRF and request hygiene | PARTIAL | slice F routes done; auth (A) and mod (G) by REQUEST. |
| Caching headers | DONE for slice F routes | F105. |
| Sessions and schema indexes | TODO | Indexes are proposal P-idx (G or owner); auth.ts sweep change is A's. |

## ADDITIONS

| ID | Addition | Justification | Status |
|---|---|---|---|
| A-req-guard | `src/lib/server/request.ts`: `assertSameOrigin`, `readJsonObject`, `guardJsonWrite`, `rateLimit` (atomic upsert with `RETURNING` on `login_attempts`, keys prefixed `rl:`, fails open on D1 errors), `tooManyRequests`, `memoryRateLimit`, `clientIp` (CF-Connecting-IP only), `intParam`, `usernameParam`, `PRIVATE_NO_STORE`, `PUBLIC_SHORT_CACHE` | Proposals P-req-guard and P-ratelimit; one place for F046, F047, F057-F061, F066, F070 | DONE (054e415) |
| A-text | `src/lib/textInput.ts`: `cleanText`, `truncateCodePoints`, `codePointLength`, `TEXT_POLICIES` | Proposal P-text; F052, F053 | DONE (054e415) |
| A-clock | `src/lib/clockBounds.ts` | F078, F059 | DONE (054e415) |
| A-arena-record | `src/lib/server/arenaRecord.ts` | F097, testable without the ingest secret | DONE (054e415) |
| A-api-tests | `scripts/polish/api-fuzz.ts`, `api-unit-test.ts`, `text-input-test.ts` | Brief 14 regression tests | DONE |

## PROPOSALS

| ID | Proposal | Evidence | Decision needed from |
|---|---|---|---|
| P-history-points | Server-side downsampling of profile rating history that the chart and `recentRatingDelta` agree with (keep first and last point per category per day only when a series exceeds the chart's 240-point bucketing threshold, and move the threshold server side), so the 4,000-row payload shrinks without changing any drawn line. | F103 | Slice F + C (chart owner) |
| P-idx | Not built (Q37). Five additive indexes for per-request lookups, as a new migration numbered by slice G plus the `schema.ts` mirror. Note for the decider: appending to `ADDITIVE_COLUMNS` bumps `ADDITIVE_VERSION`, so the first cold start after deploy re-runs the additive pass, including `CREATE INDEX` on `messages`, on the request path; a migration run at deploy time avoids that. Statements: `CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(from_user_id, to_user_id, created_at DESC);` `CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_user_id, created_at DESC);` `CREATE INDEX IF NOT EXISTS idx_rule_suggestions_user ON rule_suggestions(user_id, created_at DESC);` `CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);` `CREATE INDEX IF NOT EXISTS idx_clubs_owner ON clubs(owner_user_id);` | `evidence/F/query-plans-0045.json` (before: SCAN; with the index: SEARCH or range); F095, F108, F109 | Schema (slice G or owner) |
| P-rl-prune | The `rl:` limiter keys live in `login_attempts`, which nothing prunes (F109). Fold them into a scheduled sweep (`DELETE FROM login_attempts WHERE first_at < now - 1 day`). | F109 | L (cron) |
| P-challenge-real | `/api/challenges` should confirm the code is an open friend game owned by the caller (a `GET /friend-game?code=` stub route on the DO). | F059 | H |

## OWNER QUESTIONS

- F-Q1: The new limits are defaults, chosen well above normal use: friend requests 20 per hour; challenges 12 per 10 minutes and 5 per target; clubs 3 created per day and 10 owned; tournaments 5 per day; club posts 8 per minute; suggestions 10 per hour per IP (plus the old 12 per day per account); bot-game pings 30 per hour; tv telemetry 120 and desync 20 per minute per IP. Confirm or give numbers.
- F-Q2: Muted players are now refused friend requests, challenges, club creation and tournament creation (before, the mute only covered DMs, club posts and chat). This matches "a muted player cannot reach another player's bell", but it is a moderation policy change. Keep?
- F-Q3: Club and tournament names containing a listed word are refused (400) rather than censored, like usernames; descriptions are censored in place. Keep?
- F-Q4: Cyrillic and Greek lookalike letters count toward a listed word only when the same text also has ASCII letters, digits or symbols ("fuсk", "sh1т", "сосk" are caught). A word written wholly in lookalike Cyrillic (for example "соск") is not caught; the alternative flags real Russian words such as "соска". Default kept: real words pass. Confirm or ask for the stricter rule.

## REQUESTS

- Slice A (`src/app/api/auth/_lib/sameOrigin.ts`), optional: the rule there is the same as `assertSameOrigin` in `src/lib/server/request.ts` (committed in 054e415); importing it keeps one copy. `guardJsonWrite(request)` also does the plain-object body check the auth routes hand-roll, plus the 16 KB cap and the JSON content-type rule.
- Slice A (`src/lib/server/auth.ts:197-199`), F095: delete only the presented token instead of a table-wide sweep on the request path:
  ```ts
  if (row.expires_at < Date.now()) {
    await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
    return null;
  }
  ```
- Slice G (`src/app/api/mod/*`), F046/F047: first line of every mutating handler `const body = await guardJsonWrite(request); if (body instanceof NextResponse) return body;` (replacing the `request.json()` try blocks; `notify-test` and DELETE handlers with no body: `assertSameOrigin(request)`). F119: when the shared house/seed predicate exists, tell slice F its export name; `users/search` and `community/active` will switch to it.
- Slice H (`worker.ts`), F078: replace the literals at `worker.ts:3468`, `:4459`, `:5846` with `CUSTOM_GAME_CLOCK` / `TOURNAMENT_CLOCK` from `src/lib/clockBounds.ts` (`clockWithin(timeSec, incrementSec, CUSTOM_GAME_CLOCK)`), so the API and the DO can never disagree again. F052/F053: pass chat and spectator chat text through `cleanText(text, { maxChars: <current cap> })` before `censorText` (worker.ts:7095, :7141 area), replacing `.trim().slice(0, n)`. P-challenge-real above.
- Slice D: `src/app/community/page.tsx:160` fetch `/api/leaderboard?category=${DEFAULT_CATEGORY}&limit=5` (F106). `src/app/tournaments/[id]/page.tsx:204` link `href={t.club_slug ? \`/clubs/${t.club_slug}\` : "/clubs"}` (F168; `club_slug` is now on `TournamentDetail`). `src/app/clubs/page.tsx`: the directory search can call `/api/clubs?q=<text>`, and "Your clubs" can rely on every joined club being in the default response (F038). `src/app/clubs/[slug]/page.tsx:91`: consider `maxDim: 128, maxChars: 64_000` for icon uploads so list payloads shrink further (F104; the server accepts up to 300,000).
- Slice J: `src/components/OnlineMatch.tsx:1622` fetch `/api/leaderboard?category=${start.mode}&meOnly=1` (F106: it only reads `me`).
- Slice L (`package.json`): add `"test:api-fuzz": "tsx scripts/polish/api-fuzz.ts"` (live, needs the dev server, about 3 minutes on a quiet box), `"test:api-unit": "tsx scripts/polish/api-unit-test.ts"` and `"test:text-input": "tsx scripts/polish/text-input-test.ts"` (both offline, CI-safe). When `src/lib/server/email.ts` lands, tell slice F; `api/suggest` will switch to it (F100).
- Integrator: flag F046 (same-origin and JSON content type on cookie writes) and the private no-store on the tournament detail (it carries seat tokens) as security in the PR.

## REVIEW ROUND 1

- Blocking (8ed3f3e built proposal P-idx: migration 0045 and the `schema.ts` ADDITIVE_COLUMNS mirror, in files slice F does not own, against Q37): reverted in e7034c1. `migrations/0045_api_request_indexes.sql` is deleted and `schema.ts` is back to its 8ed3f3e^ content (no other commit touched it since). F109 and F095 are TODO, A-idx-0045 is gone from ADDITIONS, 8ed3f3e is off F108, the report route comment and the F095 REQUEST no longer name the indexes, and P-idx under PROPOSALS carries the five statements, the cold-start note and `query-plans-0045.json` as its evidence. Local D1 may still hold the five indexes and a 0045 row in `d1_migrations` from the earlier run; they are harmless (IF NOT EXISTS) and vanish on a fresh `polish:seed`.
- Nits fixed (386dcde): F107 set to PARTIAL (unmeasured); same-site refused in `assertSameOrigin` with a regression check; the club icon error text states the real limit; Cyrillic false positives in the profanity filter fixed with a regression check (F-Q4).
- Nits noted, not changed: the response objects wrapped in `NextResponse.json(..., { headers })` in messages, notifications and users/settings are not re-indented (cosmetic). The per-IP limiters in desync, tv-telemetry and suggest key on `unknown` without `CF-Connecting-IP`, so locally every client shares one bucket and the F066 and F057 numbers are for that shared bucket; production always sets the header.
- Integrator: list these as API additions in the PR: `/api/leaderboard` `limit` and `meOnly`, `/api/clubs` `q`, `club_slug` on `TournamentDetail`. Keep the SECURITY flag on F046 and the tournament-detail no-store.

## GUARDS RUN

- `tsc --noEmit` filtered to slice F files: clean. `eslint` on every touched file: clean.
- `test:emdash`: OK.
- `test:console` (core routes x signed-out and user): 16 cells, 0 new items (`evidence/F/console-after.txt`), so no client started receiving a new 4xx from the tightened routes. Every client POST to a slice F route was also checked statically: all send `Content-Type: application/json` or no body.
- `scripts/polish/api-fuzz.ts`: 71 of 71; `api-unit-test.ts`: 40 of 40; `text-input-test.ts`: 54 of 54.
- Round 1 (reviewer fixes): `api-unit-test.ts` 47 of 47, `text-input-test.ts` 58 of 58, tsc clean on slice F files, eslint clean on the touched files, `test:emdash` OK.
- Small extra in `src/lib/server/turnstile.ts`: siteverify now has a 5 s timeout (a hung verify fails the check instead of holding the sign-up open).
