# Slice L: side end and daily email (wave 1)

Owner files: `next.config.mjs`, `public/_headers`, `wrangler.jsonc`, `package.json` (scripts), `.gitignore`, `README.md`, `.github/*`, `.claude/*`, `src/lib/server/{email,emailSchema,emailPrefs,dailyJob}.ts`, `src/lib/email/*`, `src/app/api/email/*`, `src/components/settings/EmailPrefsRow.tsx`, `src/app/privacy-policy/*`, `migrations/0046_email.sql`. Evidence: `docs/polish-pass/evidence/L/`.

## Row updates

| Row | Status | Evidence | Commit | Note |
|---|---|---|---|---|
| F044 | DONE | `headers-check-before.json` (Chromium: `img-src https://images.example.com/polish-bg.png` violation with the custom background on), `headers-check-after.json` (no violation, body paints the image) | 097dc3c | Root cause: `img-src 'self' data: blob:` while Settings accepts any http(s) URL. Fix: `https:` added to img-src. http: stays blocked (mixed content anyway). Regression check: `npm run test:headers` (`scripts/polish/headers-check.ts`), fails on the before tree. Class sweep: the only other user-supplied remote URL is none (avatars are data URLs or local). REQUEST to A: `sanitizeCustomBgUrl` should accept https only, so the hint and the CSP agree. |
| F055 | DONE | `headers-before.txt`, `headers-check-before.json` / `-after.json` (x-powered-by, interest-cohort, Google Fonts origins) | 097dc3c | `poweredByHeader: false`; interest-cohort dropped from Permissions-Policy; fonts.googleapis/gstatic removed from style-src and font-src (next/font self-hosts; no font request failed in the after run, `/about` renders). |
| F113 | DONE | `headers-check-before.json` (`public, max-age=0` on /house-pfp, /piece, /sound) and `-after.json` (`max-age=86400, stale-while-revalidate=604800`) | 097dc3c | Rules in `public/_headers` (Cloudflare assets layer, production) and the same list in `next.config.mjs` headers() (dev and worker-served paths). The /lobby repeat-visit request count was not measured: `next dev` serves public files itself, so only production shows the saved revalidations. |
| F098 | DONE | `email-tests.txt` (the job runs from a plain env object with no Next context) | f3e7a06 | `runDailyJob(env)` takes the worker env; archive counts go to Hyperdrive through `postgres` directly, else D1. No `getCloudflareContext` anywhere in the email path. |
| F099 | DONE | `email-tests.txt` ("guest upgrade stamps registered_at now, not the guest created_at") | f3e7a06 | `users.registered_at`, stamped by two SQLite triggers (insert of a non-guest row, and is_guest 1 to 0), so no auth route has to remember it; existing accounts backfilled from created_at. Migration 0046 plus runtime mirror `ensureEmailSchema`. |
| F100 | PARTIAL | `src/lib/server/email.ts` (8 s timeout, logging no-op without key, `SANDBOX_FROM` fallback for the suggestion form) | f3e7a06 | The switch of `api/suggest` is slice F's (REQUESTS). |
| F101 | NO-CHANGE | `ls migrations` | none | Renaming an applied migration makes wrangler apply it again, so the duplicate 0015/0023/0024 prefixes stay. New migrations are numbered past them (G: 0041, 0042; L: 0046). |
| F250 | DONE | `guard-run.txt` (20 guards, 28 s, the two failures are stale ratchet baselines from other slices' fixes) | 06504ca | `npm run guard` (`scripts/polish/guard.mjs`) plus `.github/workflows/guards.yml` (typecheck, lint, guard on push and PR). Browser guards (cls, console, flash, e2e) are not in CI yet: they need a dev server and a seeded D1 (PROPOSALS P-ci-e2e). CI will be red until the integrator prunes the case and buttons baselines (REQUESTS) and a full `npm run lint` is green. |
| F251 | DONE | `grep -c "npx -y" package.json` = 0 | 06504ca | Every script calls `tsx` (npm run puts node_modules/.bin on PATH). |
| F252 | DONE | `.claude/hooks/session-start.sh` run in this container: "node_modules is current", exit 0 | 06504ca | `.gitignore` now ignores `.claude/*` except `settings.json` and `hooks/`; CLAUDE.md stays ignored. SessionStart hook runs `npm ci` only in cloud sessions and only when node_modules is missing or older than the lockfile. README has the one-command start. |
| F253 | TODO | `deps-usage.txt` | none | Every runtime dependency is used (no removals). `ws` is imported only by the legacy `server/index.ts` and `arena-service` (which has its own package.json); moving it to devDependencies would break a production `npm ci --omit=dev` of the legacy server, so it waits for P-legacy. Aligning eslint-config-next to 16.3.4 rewrites the lockfile and node_modules under the shared dev server: integrator, at integration time. |
| F254 | PARTIAL | `email-api-smoke.txt` | f3e7a06 | `EmailPrefsRow` (masked email, on/off toggle, disabled for guests and accounts with no email, fixed height from first paint) and `/api/email/prefs`. Wiring into the settings account block is a REQUEST to C; showing and changing the email address itself is C's. |
| F175 | DONE (owner sign-off pending, Q7) | `git show 2c58046` | 2c58046 | Rewritten to match the code: optional email and Google id, guests, synced settings, last-online time, suggestions, IP-keyed limits, the four cookies by name (dc_session, dc_oauth_state, nc_who, nc_mode), "Emails we send" (welcome email only, unsubscribe, internal suggestion and founders' emails), providers (Cloudflare incl. Turnstile, Oracle Cloud, Resend, Google, the moderators' sheet), linked background images. Date September 23, 2026. The settings wording assumes the EmailPrefsRow wiring lands. |
| Security headers and CSP (BACKEND) | DONE | as F044, F055 | 097dc3c | HSTS preload left as is (Q33). |
| Caching headers (BACKEND, L part) | DONE | as F113 | 097dc3c | API Cache-Control (F105) is slice F's. |
| Cron and daily email (BACKEND) | PARTIAL | `email-tests.txt`, `email-api-smoke.txt` | f3e7a06 | Cron `0 13 * * *` in wrangler.jsonc. The worker's `scheduled()` is a REQUEST to H. |
| A-email (ADDITIONS) | PARTIAL | `email-tests.txt` (42 checks) | f3e7a06 | Everything but the two wiring REQUESTS below. Ships dormant (Q21-Q23). |
| A-guards (CI part) | DONE | `guard-run.txt` | 06504ca | |
| E2 request: /codex/build as a real 308 | DONE | `headers-check-after-redirect.txt` (`308 /codex/suggest`) | 097dc3c | |
| Package scripts asked for by A, E1, E2, F, HB1, TC0 | DONE | `package.json` | 06504ca | Added test:prepaint, test:auth-safety(:unit), test:error-boundaries, test:codex-routes(:static), test:sitemap-dates, test:house-policy, test:house-strength, polish:card-strip, test:email, test:headers, guard (the others were already added by the integrator). |

## How the email works

- `src/lib/server/email.ts`: `EmailProvider.send`, one Resend implementation over fetch (8 s timeout, Idempotency-Key header, 429/5xx marked retryable), `emailProviderFromEnv(env)` returns a logging no-op when RESEND_API_KEY or EMAIL_FROM is missing.
- `src/lib/server/dailyJob.ts`: `runDailyJob(env, opts?)`. Welcome: registered in the last 48 hours (two cron periods, so one missed run is caught up), has an email, not opted out, not banned, human (Q5 rule), never welcomed; the key `welcome:<id>` is claimed in `email_sends` with INSERT OR IGNORE before sending, the opt-out is re-read after the claim, a 429/5xx releases the claim for the next run, any other refusal is kept as `failed` and never retried. At most 300 per run, 600 ms apart (Resend's default 2 requests a second). CASL gate: no welcome at all without EMAIL_MAILING_ADDRESS and EMAIL_UNSUBSCRIBE_SECRET. Founders' report: key `report:<UTC date>`, to FOUNDER_REPORT_EMAILS; new sign-ups (count and names, humans only), players seen, registered players seen, daily active players (finished a game), new guests, games finished and games with a human, totals, open reports and unreviewed chat flags, and anything that broke (archive read failure, failed sends, welcome gate off; log error counts wait for P-err-count).
- Unsubscribe: `u` plus an HMAC-SHA256 token; `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` on every welcome. GET shows a confirm page (link scanners fetch GETs), POST (the page's button or the mail client) sets `users.email_opt_out = 1`. The settings row writes the same column through `/api/email/prefs` (same-origin checked).
- Templates: table layout, inline styles, the site's light tokens with a `prefers-color-scheme: dark` block and the Outlook.com `[data-ogsc]` hook for the dark tokens, no images, 7px box and 3px button radius, nothing below 13px, plain-text part with every link.
- Tests: `npm run test:email` (in `npm run guard`): 42 checks on a real schema in node:sqlite behind a D1 shim.

## ENV AND SECRETS (new, names only)

| Name | Kind | Where the owner sets it |
|---|---|---|
| RESEND_API_KEY | secret (existed for suggestions) | `wrangler secret put RESEND_API_KEY` |
| EMAIL_FROM | var | `wrangler.jsonc` vars (empty = email off); a From on the domain verified in Resend |
| EMAIL_REPLY_TO | optional var | `wrangler.jsonc` vars if replies should go elsewhere |
| FOUNDER_REPORT_EMAILS | var | `wrangler.jsonc` vars, comma separated |
| EMAIL_MAILING_ADDRESS | var | `wrangler.jsonc` vars (CASL; without it no welcome is sent) |
| EMAIL_CONTACT | optional var | `wrangler.jsonc` vars (footer contact; defaults to the From address) |
| EMAIL_UNSUBSCRIBE_SECRET | secret | `wrangler secret put EMAIL_UNSUBSCRIBE_SECRET` (any long random string; rotating it breaks old links) |
| Sending-domain DNS (SPF, DKIM) | DNS | Cloudflare DNS, records from Resend (Q21) |

## REQUESTS

1. Slice H (`worker.ts` default export): add the cron handler. Without it Cloudflare logs a failed scheduled invocation every day once the cron deploys, so land it with this slice's wrangler.jsonc change.

   ```ts
   import { runDailyJob, type DailyJobEnv } from "./src/lib/server/dailyJob";
   // ...
   export default {
     async fetch(request, env, ctx) { /* unchanged */ },
     async scheduled(_controller, env, ctx) {
       // Daily email job (docs/polish-pass/slices/L.md): welcome emails and the
       // founders' report. Sends nothing until the email vars and secrets are set.
       ctx.waitUntil(
         runDailyJob(env as unknown as DailyJobEnv).catch((err) => {
           console.error("daily job failed", err);
         }),
       );
     },
   } satisfies ExportedHandler<Env>;
   ```

2. Slice C (`src/components/settings/rows.tsx`, `AccountSettings`): drop the `{ label: "Email preferences", hint: "Coming soon" },` placeholder and render the real row after the Profile block:

   ```tsx
   import { EmailPrefsRow } from "@/components/settings/EmailPrefsRow";
   // inside AccountSettings, right after the Profile <div>:
   <div className="rounded-none border border-[color:var(--edge)] px-2.5"><EmailPrefsRow /></div>
   ```

3. Slice F (`src/app/api/suggest/route.ts`, F100): replace the inline Resend fetch with the shared module (`sendEmail`, `SANDBOX_FROM` from `@/lib/server/email`, `escapeHtml` from `@/lib/email/templates`):

   ```ts
   const text = lines.join("\n");
   const res = await sendEmail(
     env as EmailEnv,
     { to: [to], subject, text, html: `<pre>${escapeHtml(text)}</pre>` },
     { fromFallback: SANDBOX_FROM },
   );
   emailed = res.ok;
   ```

4. Integrator (`src/lib/server/schema.ts`, after slice G commits its block): append the email schema to ADDITIVE_COLUMNS so fresh databases get it in the main pass (ensureEmailSchema then short-circuits on its marker):

   ```ts
   import { EMAIL_SCHEMA_STATEMENTS } from "./emailSchema";
   // at the end of ADDITIVE_COLUMNS:
   // Daily email: registered_at (stamped by triggers), email_opt_out and the
   // email_sends exactly-once log. Mirrors migrations/0046_email.sql.
   ...EMAIL_SCHEMA_STATEMENTS,
   ```

5. Integrator (`scripts/check-case.ts`, `scripts/check-buttons.ts` baselines): `npm run guard` fails only on stale baseline entries left by other slices' fixes (case: `src/app/page.tsx`, `src/components/QueueButton.tsx`; buttons: `src/app/login/page.tsx`, `src/app/play/page.tsx`, `src/components/QueueButton.tsx`) and three new bespoke buttons in `src/app/login/LoginForm.tsx`, `src/app/play/PlayIntro.tsx`, `src/app/play/setupParts.tsx` (slices B and C). `test:updates` is left out of the guard list because it compares against git commit dates.

6. Slice A (`src/lib/settings.ts:362`): `sanitizeCustomBgUrl` accepts `http://`, which the page can never load (mixed content, and the CSP allows only https:); accept `https://` only and say "https URL" in the hint (`src/components/settings/config.ts` row `customBg`).

## PROPOSALS

- P-ci-e2e: a second CI job that starts `next dev` on a fresh local D1, runs `npm run polish:seed`, then test:cls, test:console, test:headers and the e2e specs. Not built: it needs a decision on CI minutes and on seeding in CI.
- P-err-count (existing, L + G): a daily error counter in D1 (CSP reports, RouteError, desync) so the founders' report can show real error counts. The report already has the slot and says it is missing.

## OWNER QUESTIONS (new)

- Q38: The welcome email goes to unverified addresses (Q26 still open). Resend will bounce typos; repeated bounces hurt the sending domain. Keep sending to unverified addresses, or make the welcome email a confirmation link (a new flow)?

## TODO (not started this wave)

- F253 (see row). Build and bundle audit (brief 8: per-route `next build` output, shared chunk size): needs a full `next build`, left for a quiet box. Image formats in `public/` (PNG icons are small; no change planned).
