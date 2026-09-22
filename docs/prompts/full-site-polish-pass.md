# The Full-Site Polish Pass

A standing prompt for a long, autonomous session. Paste everything below the line
into a fresh session on this repo. It is written to be run over many hours or
several nights, and to be resumable from its own ledger by a session that has
never seen this one.

---

You are taking over NerfChess (this repo) for a full-site polish pass. Not a
redesign. The visual identity, the layout of every page, the colour system and
the information architecture all stay. What changes is craft: every animation,
every transition, every loading state, every layout shift, every hover, every
empty state, every API edge case. You are going to touch the whole product,
one piece at a time, and you are going to prove every change with evidence.

Think of it as a master craftsman walking through a finished house with a
level, a torch and a notebook. Nothing gets knocked down. Every door gets
rehung until it closes without a sound.

## 0. The ground rules (read twice, violate never)

1. **No redesign.** Do not change a page's layout, its information hierarchy,
   its colour roles, its typography scale, or its navigation. If you believe a
   page genuinely needs structural change, write it in the ledger under
   `PROPOSALS` with a screenshot and a paragraph, and move on. Do not build it.
2. **The contracts win.** `docs/design-system.md`, `docs/DESIGN.md`,
   `docs/animation-design-brief.md` and the working rules at the top of
   `docs/ralph-backlog.md` are binding. Read all four in full before you write a
   line. Summary of what they enforce: no new colours, no shadows, no glow, no
   backdrop blur, 7px radius on boxes and 3px on buttons, 13px text floor,
   transform and opacity only, `--ease-*` and `--dur-1..3` tokens, every motion
   gated by `html[data-anim]` and multiplied by `--fx-dur`, and it respects
   `prefers-reduced-motion`. If a fix you want breaks a contract, the fix is
   wrong.
3. **No em dashes in any user-visible text.** `npm run test:emdash` enforces it.
   Do not add them in comments or commit messages either.
4. **Evidence or it did not happen.** Every item you mark `DONE` has a before
   and after artefact (screenshot, frame strip, video, CLS number, test output,
   timing, or query plan) linked from the ledger. "Looks better" is not
   evidence. "CLS on /lobby after sign-in went from 0.184 to 0.000, trace
   attached" is.
5. **Root causes, not patches.** A layout shift fixed with a hard-coded
   `min-height: 37px` on one page is a patch. The same shift fixed by rendering
   the session server-side so the header never has an unknown state is a root
   cause. When you find a bug, ask what class of bug it is, and grep for every
   other instance of that class before you fix the first one.
6. **Machine limits are real.** Read the parallelism section of
   `docs/ralph-backlog.md`. Three or four concurrent workers is the ceiling.
   Workers lint and typecheck only the files they touched; one full-repo pass
   happens at integration. Use `./node_modules/.bin/tsx`, never `npx -y tsx`.
   Run `scripts/dev-supervisor.sh` for the whole session so `next dev` stays up.
7. **Nothing is pushed on a red guard.** Before every push: `npm run typecheck`,
   `npm run lint`, every `test:*` script relevant to what changed (the full
   list is in `package.json`, and `test:reduced-motion`, `test:animations`,
   `test:rounded`, `test:buttons`, `test:case`, `test:emdash`, `test:sound`
   are relevant to almost everything in this pass), the Playwright specs in
   `e2e/`, and `npm run build`. If a guard's baseline legitimately moves, update
   the baseline in the same commit and say why in the message.
8. **Small commits, honest messages.** One logical change per commit. Match the
   house commit style (see `git log`: a plain sentence saying what changed and
   why, no prefixes). Push at least every couple of hours so nothing lives only
   in the container.

## 1. Orientation (first hour, do not skip)

Read, in this order, and take notes in the ledger's `CONTEXT` section:

- `README.md`, `EXAMPLES.md`, `docs/DESIGN.md`, `docs/design-system.md`
- `docs/animation-design-brief.md`, `docs/animation-audit-2026-07-17.md`,
  `docs/animation-backlog.md`, `docs/animation-registry.json` (skim the shape,
  it is large), `docs/animation-inspiration-links.md`
- `docs/ralph-backlog.md` (the whole thing: it is the previous loop's memory,
  and many things you will "discover" are already known, measured, or
  deliberately dropped with a reason. Respect a `DROPPED` reason unless you
  have new evidence.)
- `docs/improvement-roadmap.md`, `docs/overhaul-checklist.md`,
  `docs/ui-research.md`, `docs/lichess-parity-2026-09.md`,
  `docs/2026-07-10-homepage-performance-spec.md`
- `docs/accounts-and-matchmaking.md`, `docs/game-server-protocol.md`,
  `docs/google-sign-in.md`
- `vault/README.md` and a skim of `vault/notes/`
- `src/app/layout.tsx`, `src/components/SiteHeader.tsx`,
  `src/components/SiteHeader.css`, `src/lib/authClient.ts`,
  `src/components/SettingsBootstrap.tsx`, `src/app/globals.css` (3,200 lines,
  read the token section and the motion section properly)
- `package.json` scripts, `playwright.config.ts`, `e2e/sweep.spec.ts`,
  `e2e/feel.spec.ts`, `e2e/sweep-baseline.json`
- `worker.ts` top-level structure (it is ~440 KB, do not read it linearly:
  map its exports and route table), `server/index.ts`, `arena-service/`,
  `engine-service/`, `migrations/` and `migrations-pg/`

Then start the dev server under the supervisor, open the site in Playwright's
Chromium (`/opt/pw-browsers/chromium` if the pinned Playwright version wants a
download, never run `playwright install`), and click through it as a brand new
visitor, then as a guest, then as a signed-in account, then as a mod. Write
down every single thing that feels off, however small, before you measure
anything. First impressions are data you only get once.

## 2. The ledger

Create `docs/polish-pass/LEDGER.md` and keep it current in every commit. It is
the single source of truth for this pass and must let a cold session resume.
Structure:

```
# Polish pass ledger
## CONTEXT        (what you learned in orientation, key file map)
## HARNESS        (how to run the measurement tools you built)
## INVENTORY      (counts: routes, components, animations, API routes)
## ROUTES         (one row per route, status per audit dimension)
## ANIMATIONS     (one row per animation or animation family)
## BACKEND        (one row per API route / service concern)
## FINDINGS       (every bug, numbered F001.., with class, root cause, fix commit)
## PROPOSALS      (structural ideas you are NOT building, with evidence)
## ADDITIONS      (new things you built, each with its justification)
## SESSION LOG    (dated entries: what was done, what is next)
```

Statuses: `TODO`, `WIP`, `DONE` (with evidence link), `NO-CHANGE` (audited,
already right, evidence of the audit), `DROPPED` (with reason). Evidence goes
under `docs/polish-pass/evidence/` (small PNG frame strips and JSON metrics;
keep videos out of git, describe them instead, and keep the evidence folder
under 25 MB total).

## 3. Build the measurement harness first

You cannot verify "every single UI change" by eye. Before fixing anything,
build tooling under `scripts/polish/` and `e2e/polish/` that makes regressions
visible and numbers comparable. Minimum:

1. **Layout shift probe.** A Playwright helper that installs a
   `PerformanceObserver({ type: "layout-shift", buffered: true })` before
   navigation, records every shift with its `sources` (node, previous rect,
   current rect) and timestamp, and reports cumulative CLS plus the top
   offending nodes by selector. Run it across the matrix below. Any shift above
   0.01 that is not caused by direct user input is a finding.
2. **State matrix runner.** For every route, capture at:
   - viewports 360x780, 390x844, 768x1024, 1280x800, 1920x1080
   - theme dark and light
   - `data-anim` full, fast and off, plus emulated `prefers-reduced-motion`
   - auth states: signed-out, guest, signed-in user, mod (seed accounts
     locally; never touch production data)
   - network: normal and throttled (Fast 3G, 4x CPU slowdown) because most
     shifts and flashes only show under latency
3. **Frame strip capture for animations.** For a given trigger, record at
   60fps (Playwright video or CDP screencast), then export a strip of frames at
   fixed intervals (0, 50, 100, 150 ... ms) into one PNG so a before/after
   comparison is a single image. Also log per-frame long tasks and dropped
   frames via `PerformanceObserver({ type: "long-animation-frame" })`.
4. **Hydration and flash detector.** Screenshot at first paint, at
   `DOMContentLoaded`, after hydration, and after the auth/settings fetches
   settle. Pixel-diff them. Any visible difference that is not intentional
   content arrival (skeleton to content in the exact same box) is a finding.
   This catches theme flashes, font swaps, header state swaps, and settings
   applied late.
5. **Visual regression baseline.** Once a route is `DONE`, snapshot it and
   add it to a baseline so later work cannot silently undo it. Extend
   `e2e/sweep.spec.ts` and `e2e/sweep-baseline.json` rather than inventing a
   parallel system, if the existing one can carry it.
6. **Console and network hygiene.** Every route in the matrix must produce
   zero console errors, zero React warnings (keys, hydration mismatch, act),
   zero 4xx/5xx that are not expected, and no request waterfalls longer than
   they need to be. Log them all.

Document how to run all of it in the ledger's `HARNESS` section. Add npm
scripts for the ones worth keeping (`test:cls`, `test:flash`, etc.) and make
the cheap ones guards.

## 4. Known bug to fix first: the post-sign-in bump

When you load a page while signed in, the page renders, then the account
resolves, and everything shifts. Reproduce it with the CLS probe on `/`,
`/lobby`, `/play`, `/profile` and a game page, signed in, throttled. Record
the exact nodes that move and by how much.

Then find the root cause. Likely suspects, verify rather than assume:

- `SiteHeader` (and `MobileNavMenu`, `QueueButton`, `AchievementToast`,
  `HeaderSettingsMenu`) render a signed-out shape on the server and first
  client paint, then fetch `/api/auth/me` (or equivalent in `authClient.ts`)
  and swap to a signed-in shape with different widths or heights.
- Settings (theme, board, piece set, `data-anim`, rail widths via
  `RailResizeHandle`) applied in `SettingsBootstrap` after hydration rather
  than before first paint.
- Pages that branch on the user (`src/app/page.tsx`, `lobby/page.tsx`,
  `profile/page.tsx`, and the ~25 files that import `authClient`) rendering
  nothing, then something.
- Web fonts without matched fallback metrics (`size-adjust`,
  `ascent-override`), images and avatars without intrinsic dimensions,
  banners (`ConnectionBanner`, `DraftNotice`, `GodPanelNotice`) inserted
  above content instead of overlaid or reserved.

The correct fix is almost certainly that the server knows who you are before
it renders: read the session cookie in the root layout (or a server component
near it), resolve the user once, and pass it down through a context so no
component ever renders an "unknown" state that differs in size from the known
one. Where a fetch is truly unavoidable, the placeholder must occupy the exact
final box. Apply the same fix to every instance of the class, not just the
header. Add an e2e spec that signs in, reloads under throttle, and asserts CLS
below 0.01 on those five routes, so this never comes back.

## 5. The route-by-route audit

Walk every route. There are about 65 `page.tsx` files under `src/app`
(generate the list yourself with `find src/app -name page.tsx`, including the
dynamic ones with real IDs, the `dev/` pages, the `mod/` pages, `error.tsx`,
`global-error.tsx`, `not-found.tsx` and the OG image). For each route, in the
ledger, audit and fix these dimensions:

1. **Layout stability.** CLS across the whole matrix. No shift on load, on
   auth resolve, on data arrival, on font load, on tab switch, on opening a
   menu, on a toast, on a scrollbar appearing (use `scrollbar-gutter: stable`
   where it applies).
2. **Loading states.** Every async region has a skeleton that matches the
   final geometry. No spinners where a skeleton fits. No blank flashes. No
   skeleton that shows for 40ms and then pops (delay skeletons ~150ms, keep
   them a minimum duration once shown, so fast loads look instant and slow
   loads look calm).
3. **Empty, error and edge states.** Zero items, one item, 500 items, a
   15-character username, a 30-character one with no spaces, missing avatar,
   a deleted user, a banned user, a network failure mid-action, a 404 ID, an
   expired session. Every one must look intentional. Use `EmptyState`,
   `RouteError` and `NotFoundPanel` consistently.
4. **Interaction feel.** Every button, link, tab, toggle, card and row has
   hover, active (pressed), focus-visible and disabled states that follow the
   design system. Press feedback is instant (under 100ms). Optimistic UI where
   the server is slow and the action is safe. Double-submit is impossible.
5. **Keyboard and accessibility.** Tab order is logical, focus is always
   visible, focus is trapped in modals and returned on close, Escape closes
   what it should, every icon button has an accessible name, contrast meets
   AA using the numbers in `design-system.md`, and every page has one `h1`
   and a sane landmark structure. Run axe in the harness and fix everything
   it flags that is real.
6. **Responsive.** Nothing overflows horizontally at 360px. Touch targets at
   least 44px on mobile. The mobile game layout (`MobileMatchStack`,
   `MobileBuffDrawer`, `mobileChrome.ts`) behaves with the on-screen keyboard
   open and in landscape.
7. **Performance.** LCP, INP and TBT per route, before and after. Look for
   oversized client bundles (`next build` output), components that should be
   server components, unnecessary re-renders (React Profiler on the game
   page especially), images without `next/image` sizing, and effects that
   run on every render.
8. **Copy.** Sentence case per `test:case`, no em dashes, no dead words, no
   placeholder text, consistent terminology with `guide/glossary`.

Priority order for the walk: `/` and `/lobby` and `/play` and `/game/[id]`
(the core loop), then draft and match surfaces, then `/profile`, `/u/[username]`,
`/settings`, `/login`, then social (`/community`, `/clubs`, `/inbox`,
`/friend`, `/tournaments`, `/tv`, `/leaderboard`), then content (`/codex/*`,
`/guide/*`, `/tutorial/*`, `/puzzles`, `/analysis`, `/history`, `/updates`),
then legal and static pages, then `mod/` and `dev/`.

## 6. The animation pass, one at a time

There are over 5,500 `@keyframes` blocks in `src` plus framer-motion usage in
about 15 files and the 3D board under `src/components/effects/board3d`. "Every
animation by hand" at that scale needs structure or it turns into skimming.
Work it in three tiers.

### Tier A: product chrome, every single one by hand

Everything that is not a card's play effect. Enumerate them by grepping
`@keyframes`, `transition`, `animation:`, `motion.`, `AnimatePresence`,
`useAnimate`, `requestAnimationFrame`, and `useMotionTempo` across `src`
outside the card-play files, and list each in the ledger. This includes at
least: page and route transitions, header and nav menus, `MobileNavMenu`,
dropdowns and popovers (`EffectPopover`, `HeaderSettingsMenu`), modals and
drawers, toasts (`AchievementToast`), skeleton shimmer, button and card
hover and press, tab indicators, the queue button and matchmaking search
state, the draft overlay and vault (`DraftOverlay`, `DraftVault`, `draft/`),
card dealing, hover and selection in the dock (`BuffDock`, `dock/`, `Pocket`),
board piece movement, captures, check, promotion, premoves, arrows and
highlights, `BoardSplash`, clocks and low-time warnings (`ClockPill`), the
eval bar (`EvalBar`), move list scrolling and `MoveReview`, game over
choreography (`GameOver`), rating change reveals (`RatingChart`, ratings/),
presence and spectator pills, chat message arrival, the hero board and hero
TV on the homepage, tutorial and guide steps, puzzle success and failure, and
the settings panel.

For each one, in order:

1. **Record before.** Frame strip at full, fast and off, plus reduced motion.
   Note duration, easing, what properties animate, and dropped frames.
2. **Critique against the brief.** Does it have purpose (does it explain a
   state change, direct attention, or confirm an action)? Does it follow tell,
   strike, settle where it is a moment and not just a transition? Is it the
   right length (chrome transitions mostly `--dur-1`/`--dur-2`, never longer
   than it needs)? Does it animate only transform and opacity? Does it
   interrupt cleanly if triggered again mid-flight? Does it block input it
   should not? Does the exit mirror the entry sensibly? Is it consistent with
   its siblings (every popover opens the same way, every modal closes the
   same way)?
3. **Revamp.** Improve timing, easing, choreography, staggering, origin
   (menus grow from their trigger), and interruption behaviour. Remove
   animations that add nothing. Add animation only where a state change is
   currently confusing without it. Keep it inside the contract.
4. **Record after**, same conditions, and put before and after strips side
   by side in the evidence folder.
5. **Verify off and reduced motion.** With `data-anim=off`, the end state is
   reached instantly and nothing is broken, invisible, or stuck at opacity 0.
6. Mark `DONE` with the evidence link.

Create shared primitives where you find five copies of the same idea (one
popover motion, one modal motion, one list-enter stagger) and migrate the
copies to them, so the site ends up with fewer, better animations rather than
more.

### Tier B: game moments, by hand, with extra care

Moves, captures, check, checkmate, draw, resign, timeout, flag, promotion,
the draft's opening and each pick, the moment a card is played (the shared
wrapper in `cardEntrance`, `UseSpectacle`, `BoardEffects`, `stage.tsx`,
`geometry.ts`, `fxZones.ts`), and the game-over sequence. These are the
product's signature. For each: does the board stay legible the whole time?
Does the sound (`test:sound`) land on the strike frame? Does it hold up at
bullet time controls, where a 900ms celebration costs the player real time?
Does it survive a reconnect or a spectator joining mid-animation? Tune the
feel until it is the best thing on the site.

### Tier C: card play effects, by family

The per-card plays (`basicPlays`, `boonPlays`, `casinoPlays`, `cursePlays`,
`fantasyPlays`, `funnyPlays`, the `g01`..`gNN` families, `fruition/`,
`vfx/`, `impact/`, `passive/`, `clockraid/`, `board3d/`) number in the
hundreds and have their own registry, audit and guards (`test:animations`,
`test:scene-complexity`, `check-vfx-coverage`, `audit-bespoke-coverage`,
`check-anim-props`). Do not hand-review every keyframe. Instead:

1. Build or reuse a gallery (the `dev/effects`, `dev/fruition` and `dev/lab`
   pages exist for this) that can play any card's effect on any anchor
   square, at each speed, and export a frame strip.
2. Rank families by how often they are seen in real games
   (`docs/card-winrate.*.json`, `report:winrate`) and by how weak the current
   effect is (`docs/animation-audit-2026-07-17.md`, `animation-backlog.md`).
3. Go through the families in that order. Within a family, review every card
   at the frame strip level, and hand-revamp the ones that are weak, generic
   (rings and sparks as the meal), clipped at the board edge, too long, or
   unreadable. Cards that are already good get `NO-CHANGE` with their strip
   as evidence.
4. Keep all guards green and baselines honest. If a guard is wrong, fix the
   guard in its own commit with the reason.

Tier C is the one most likely to run out of time. That is fine. Tiers A and B
must be complete, Tier C must be honestly partial with the ledger showing
exactly where you stopped.

## 7. Backend

Audit every API route under `src/app/api/` (auth, lobby, users, stats, mod,
friends, clubs, messages, notifications, tournaments, challenges, arena,
cards, community, history, report, desync, suggest, the feedback routes),
the worker in `worker.ts`, `server/index.ts`, `arena-service/`,
`engine-service/`, and the schema in `src/lib/server/schema.ts` with
`migrations/` and `migrations-pg/`. One ledger row per route or concern.

For each route check and fix:

- **Correctness.** Input validation on every field (type, length, range,
  enum), consistent error shape, correct status codes, no 500 on bad input.
- **Auth and authorisation.** Session checked where it must be, role checks
  for mod and admin routes, no IDOR (can user A read or change user B's
  thing by changing an ID?), guests restricted correctly, CSRF posture for
  cookie-authenticated POSTs.
- **Abuse.** Rate limits on sign-up, login, messaging, reporting, challenges,
  and anything that sends notifications. Turnstile where it is meant to be.
- **Performance.** N+1 queries, missing indexes (check query plans on the
  hot paths: lobby, leaderboard, profile, history, notifications), payloads
  bigger than the UI needs, cacheable responses with no cache headers.
- **Realtime.** The game server protocol (`docs/game-server-protocol.md`):
  reconnection, resync after a dropped socket, clock correctness across a
  reconnect (`test:clock-pause`), spectator sync (`test:spectator-sync`,
  `test:tv-spectator`), desync reporting, idle traffic
  (`docs/do-idle-traffic-reduction.md`). Kill the network mid-game in the
  harness and make sure the UI recovers without a reload and without a shift.
- **Observability.** Errors logged with enough context to debug and without
  leaking secrets or personal data.

Fix what is small and clearly right. Anything that changes a public API
shape, a schema, or a protocol goes to `PROPOSALS` with a migration plan
unless it is a security issue, in which case fix it with the safest change
and flag it clearly in the PR.

## 8. The side end (everything between the two)

The glue nobody owns. Audit and improve:

- **Build and bundle.** `next build` output per route, shared chunk size,
  duplicated dependencies, client components that pull server-only code,
  unused dependencies in `package.json`.
- **Config.** `next.config.mjs`, `wrangler.jsonc`, `open-next.config.ts`,
  headers (CSP, HSTS, referrer policy, permissions policy), caching of static
  assets in `public/`, image formats.
- **SEO and sharing.** Titles, descriptions, canonical URLs, OG images per
  route type, `sitemap.ts`, `robots.ts`, structured data, against
  `docs/seo-implementation.md`.
- **Guards and CI.** Are the `test:*` scripts all wired into CI? Are any
  flaky? Is there a fast "pre-push" aggregate script that runs the guards
  relevant to a change? Add the new CLS, flash and axe checks as guards.
- **Developer experience.** Can a new session get the app running with one
  command? If not, fix that and document it. Consider a SessionStart hook for
  cloud sessions if one does not exist.
- **Error boundaries.** Every route segment that can fail has an error
  boundary that looks like the site, logs, and offers a way back.

## 9. Additions (what the site is missing)

After the audit, you will have opinions about what the product lacks. You
may build additions, under these conditions:

- Each one gets an `ADDITIONS` entry answering: what problem, what evidence
  it is a problem (a finding, a gap against `lichess-parity-2026-09.md`, a
  measured drop-off, a confusing flow you hit in orientation), why this is
  the smallest thing that solves it, and how you verified it.
- It follows the design system exactly and looks like it was always there.
- It does not restructure an existing page (that is a proposal, not an
  addition).
- Frontend, backend and side-end additions all count. Examples of the kind
  of thing that qualifies, only if evidence supports them: a proper
  reconnect overlay, a "your opponent is thinking" affordance, keyboard
  shortcuts help, better offline handling, a real 500 page, query caching on
  a slow endpoint, a missing index, a missing rate limit, prefetching the
  next likely route, a health endpoint for the arena service.

Build no more than you can finish and verify. Three finished additions beat
ten half-built ones.

## 10. Working loop

Repeat until the ledger is complete or time runs out:

1. Pick the next `TODO` rows (core loop routes first, then Tier A, Tier B,
   backend, side end, Tier C, additions).
2. Measure before. Save evidence.
3. Find the root cause and the class. Grep for siblings.
4. Fix, minimally and within contract.
5. Measure after under the same conditions. Save evidence.
6. Run the guards for what you touched.
7. Update the ledger row and the session log. Commit.
8. Every few commits: full typecheck, lint, relevant guards, e2e, build.
   Push.

Use subagents for independent, well-scoped pieces (one per route group or
per animation family), never more than three or four at once, each with a
precise brief, the relevant contract excerpts, and an instruction to return
evidence paths and a diff summary. Review every subagent's diff yourself
before it lands. You own the result.

## 11. Anti-shortcuts

These are the ways a pass like this quietly fails. Do not do any of them.

- Marking a row `DONE` or `NO-CHANGE` without having opened it in the
  browser and captured evidence.
- Sampling ("checked five popovers, the rest are the same") without
  actually confirming the rest share the code path.
- Fixing a shift with a magic number when the cause is a late state.
- Adding `transition: all` or animating layout properties.
- Adding an animation because it is pretty when it does not explain a
  change.
- Weakening, skipping or re-baselining a guard to get green without a
  written reason.
- Claiming a performance improvement without before and after numbers
  taken the same way.
- Stopping at the first pass. When the ledger is fully `DONE`, run the whole
  matrix again from scratch. The second pass always finds things.

## 12. Deliverables

- All work committed and pushed on your working branch, in small commits.
- One PR (or a stack, if the reviewer would prefer smaller reviews) with a
  body that summarises: headline numbers (CLS per core route before and after,
  LCP and INP deltas, console errors before and after, number of animations
  reviewed and revamped per tier, backend findings fixed), the top ten before
  and after frame strips, security fixes called out separately, and a link
  to the ledger.
- `docs/polish-pass/LEDGER.md` complete and resumable.
- New guards wired into `package.json` and documented.
- `docs/ralph-backlog.md` updated with anything you found but did not do,
  in its own format, so the standing loop picks it up.
- A final `SESSION LOG` entry that says plainly what is done, what is
  partial, what you would do next, and anything you are unsure about.

Start with section 1. Do not write code until the orientation notes and the
inventory counts are in the ledger.
