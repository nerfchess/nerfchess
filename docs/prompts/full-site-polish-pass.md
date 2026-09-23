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
empty state, every API edge case. On top of that you will run a full bug
hunt, upgrade the moderator panel, build real user counting, add a daily
email, push SEO far past where it is, and make every shared link preview
excellent (sections 14 to 19). You are going to touch the whole product
with a fleet of agents, and you are going to prove every change with
evidence.

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
6. **Go wide on agents, stay narrow on CPU.** This pass is meant to be huge
   and to run many agents at once (section 13 is the orchestration plan).
   Agent thinking, reading and editing is not the bottleneck; the box is.
   Run `nproc` first (the cloud box has been 4 cores). Read the parallelism
   section of `docs/ralph-backlog.md`: heavy commands (`tsc --noEmit`,
   `eslint .`, `next build`, Playwright, simulations) must never run more
   than two at a time across all agents, or load spikes and every command
   times out. Agents lint and typecheck only the files they touched; one
   full-repo pass happens at integration. Use `./node_modules/.bin/tsx`,
   never `npx -y tsx`. Run `scripts/dev-supervisor.sh` for the whole session
   so `next dev` stays up, and have agents share that one dev server rather
   than starting their own.
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

Section 13 replaces "do it yourself, one row at a time" with a fleet. The
loop above is still what every individual agent runs on its own slice.
Review every agent's diff (or have a dedicated reviewer agent do it, and
spot-check the reviewer) before it lands. You own the result.

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
  reviewed and revamped per tier, backend findings fixed, bugs found and
  fixed by the bug hunt), the top ten before and after frame strips, security
  fixes called out separately, every new env var or secret the owner has to
  set (section 17), and a link to the ledger.
- `docs/polish-pass/LEDGER.md` complete and resumable.
- New guards wired into `package.json` and documented.
- `docs/ralph-backlog.md` updated with anything you found but did not do,
  in its own format, so the standing loop picks it up.
- A final `SESSION LOG` entry that says plainly what is done, what is
  partial, what you would do next, and anything you are unsure about.

## 13. Orchestration: run it as a fleet

This pass is deliberately enormous. You are expected to use multi-agent
orchestration (the Workflow tool if it is available and the owner opted in,
otherwise the Agent tool with background agents) and to land a very large
volume of verified change. Volume is the goal only because every unit of it
still meets sections 0 and 11. A thousand unverified edits is worse than
none.

Structure:

1. **Scout phase (read-only, wide).** Fan out one Explore agent per area:
   each route group in section 5, Tier A chrome, Tier B game moments, each
   Tier C family, each API route group, the worker, arena-service,
   engine-service, the mod panel, SEO, email. Each returns a structured
   inventory (files, current behaviour, suspected issues with file:line) that
   you merge into the ledger. Read-only agents can run many at once.
2. **Harness phase (one agent, serial).** Section 3 and section 4 are built
   by a single agent first, because every other agent depends on them.
3. **Work phase (wide, isolated).** One agent per ledger slice, each in its
   own git worktree (`isolation: "worktree"`) so they never trample each
   other. Each agent gets: its slice of ledger rows, the contract excerpts
   that apply, the harness commands, the section 10 loop, the CPU rule from
   section 0.6, and an instruction to return a diff summary plus evidence
   paths. Slices must not overlap on files; if two slices need the same file
   (for example `globals.css` or `SiteHeader.tsx`), one agent owns it and the
   other files a request to that owner through the ledger.
4. **Review phase.** For every work agent, a separate reviewer agent reads
   the diff adversarially against sections 0 and 11 and against the
   evidence, and either approves or sends it back with specific findings.
   A slice lands only when approved.
5. **Integration phase (serial).** Merge approved worktrees one at a time
   into the working branch, run the full guards (section 0.7), fix
   conflicts, push. This is the only place full-repo typecheck, lint, build
   and the whole e2e suite run.
6. **Second wave.** Re-run the full harness matrix on the integrated
   branch, turn every new finding into ledger rows, and send out another
   work wave. Keep going until a full wave finds nothing worth fixing.

Keep heavy commands to two at a time across the whole fleet (section 0.6).
If load average climbs above twice the core count, pause work agents until
it settles.

## 14. Bug hunt

A dedicated, adversarial wave whose only job is to break the site. Split it
across agents by surface and give each one a mandate to find real,
reproducible bugs, not style opinions:

- **Game engine and rules.** Every card's interaction with check, mate,
  stalemate, castling, en passant, promotion and capture-the-king. Use the
  existing sim and test scripts (`test:nerfs`, `test:companions`,
  `test:expansion`, `test:hexes`, `sim-card-winrate`, `test-desync`) as a
  starting point, then fuzz: random legal games with random card plays,
  asserting the client and server agree on every position.
- **Online play.** Two browser contexts playing each other: resign during
  an animation, flag on the same tick as a move, reconnect mid-draft,
  close the tab mid-premove, open the same game in two tabs, spectate then
  sign in, time-control edge cases.
- **Accounts.** Register, log in, log out, guest to account, Google sign-in,
  rename after a flag, expired session mid-action, two tabs with different
  accounts.
- **Social.** Friend requests to self, blocked users, messaging a deleted
  user, club with zero members, tournament with one entrant, notification
  floods.
- **Input.** Unicode, RTL text, emoji, 10,000-character inputs, HTML and
  script in every text field, zero-width characters in usernames.
- **Mobile.** Every flow on a 360px touch viewport.

Every bug gets a `FINDINGS` row with exact reproduction steps, root cause,
fix commit, and a regression test (e2e spec or script) that fails before
the fix and passes after. A bug with no regression test is not fixed.

## 15. Moderator panel

The mod panel lives in `src/app/mod/` (dashboard, players, reports, games,
chat flags, feedback, ideas, controls, audit log, cards, house bots, stats)
with components in `src/components/mod/`. Make it the tool a small
volunteer mod team would actually want to open every day:

- Audit every section with the same route checklist as section 5.
- **Speed of action.** A report can be triaged (view context, view the
  game or chat in question, act, note) without leaving the page. Keyboard
  shortcuts for the common actions. Bulk actions where mods handle many
  items at once.
- **Context.** From any user row, one click to their recent games, reports
  against and by them, prior mod actions, account age, linked accounts
  signals (shared IP or device, if the backend already records them;
  do not start collecting new personal data without flagging it as a
  proposal).
- **Safety.** Every mod action is authorised on the server, logged in the
  audit log with who, what, when and why, and reversible where it can be.
  Confirm destructive actions. Mods cannot act on admins or on themselves.
- **Queue health.** Counts of open reports, oldest unhandled item, and
  handled-per-day, on the dashboard.

## 16. User counting

The owner wants real, trustworthy numbers. Build (or fix, if parts exist in
`mod/stats`) a single source of truth for:

- Total registered accounts, guests, and accounts with an email.
- New sign-ups per day, week and month, with a chart on the mod stats page.
- Daily, weekly and monthly active users (define "active" as played a game
  or made an authenticated request, pick one, write the definition next to
  the number).
- Online right now, and peak concurrent today.
- Games played per day, split by mode and human versus bot.

Rules: numbers come from the database or the existing telemetry, never
estimates. House bots and test accounts are excluded from human counts and
the exclusion rule is written down. Queries are indexed and cached so the
stats page loads fast. If a public "players online" figure appears anywhere
on the site, it must be the same live number the mod panel shows. Never
inflate, round up, or seed a public count.

## 17. Daily email

There is no email provider in the codebase yet (users have an optional
`email` column; there are no cron triggers in `wrangler.jsonc`). Build:

1. **A provider layer.** One small module with a `sendEmail` interface and
   one implementation (Resend is the simplest fit for a Cloudflare Worker;
   Cloudflare's own email sending is acceptable if it fits better). The API
   key comes from an env secret. If the secret is missing, the module logs
   and no-ops, so nothing breaks before the owner sets it up.
2. **A daily scheduled job** (a Cloudflare cron trigger on the worker,
   configured in `wrangler.jsonc`) that does two things:
   - Sends each account that signed up in the last 24 hours and has an
     email a welcome email: short, in the site's voice, with how to play
     their first game, a link to the tutorial, and one link each to Nerf
     and Buff mode. Each account gets it exactly once (record the send in
     the database so a retry or a double-fired cron cannot resend).
   - Sends the founders a daily report: new sign-ups yesterday (count and
     usernames), totals, DAU, games played, open mod reports, and anything
     that broke (error counts from logs if available). The recipient list
     comes from an env var, not the code.
3. **Compliance.** The site's owners are in Ontario, so Canada's
   anti-spam law (CASL) applies. The welcome email is tied to the account
   the user just made, but it still carries the sender's identity, a
   physical or mailing contact placeholder the owner must fill, and a
   working one-click unsubscribe that the job respects. Add an email
   preference toggle in `/settings`. Update `/privacy-policy` to say what
   emails are sent and why.
4. **Templates** that render in dark and light email clients, degrade to
   plain text, and match the site's look without images being required.
5. **Tests** for: exactly-once sending, unsubscribe respected, missing key
   no-ops, template rendering.

List every secret and env var you introduced (names only, never values) in
the PR body and the ledger, with one line each on where the owner sets it.

## 18. SEO maxxing

Go well past the existing wave in `docs/seo-implementation.md`. Read it
first so you build on it rather than redo it.

### The team, on the record

Add the founding team to the site as a real, official organisation:

- **Joseph Leung**, Co-founder and Chief Executive Officer
- **Timmy Chen**, Co-founder and Chief Technology Officer
- **Robert Wang**, Head of Game Design

Keep these three names and titles in one config file (for example
`src/lib/team.ts`) so the owner can change a title in one place.

Where they appear:
- A team section on `/about` (names, titles, one or two sentences each on
  what they own at Nerf Chess). Write the sentences about their role at the
  company only.
- `Organization` JSON-LD in the root layout: name, url, logo, `founder`
  (Joseph Leung and Timmy Chen as `Person` entries with `jobTitle`),
  `employee` or `member` for Robert Wang, `sameAs` for the socials already
  in `SocialsRow`, `contactPoint` using the existing `/contact` route.
- `Person` JSON-LD on `/about` for each of the three.
- The footer: "Made by the Nerf Chess team" linking to the about section.

Hard limits, because official means true: names and titles only. Do not
publish ages, schools, cities, photos, or any other personal detail (they
are students). Do not invent awards, press coverage, investors, a company
registration, a founding story with made-up specifics, user counts,
testimonials, or ratings. Do not add `AggregateRating` or `Review` markup
unless it is backed by real on-site reviews, because fake review markup is
against Google's spam policies and gets sites penalised. If something would
make the site look more official but is not true, it goes in `PROPOSALS`
as a question for the owner.

### Everything else SEO

- Structured data everywhere it fits and is true: `WebSite` with
  `SearchAction` (if site search exists), `BreadcrumbList` on every nested
  page (there is already a `Breadcrumbs` component), `FAQPage` on `/faq`,
  `HowTo` on the how-to-play guide and tutorial, `Game` or
  `VideoGame` for the site itself, `ProfilePage` on `/u/[username]`,
  `Article` on guide pages with the team as author. Validate every block
  with a schema validator in the harness, and add a guard that parses every
  route's JSON-LD so it can never ship broken.
- Unique, specific titles and descriptions on every indexable route,
  including every codex card page, every public profile, every guide.
  No duplicates (add a guard that crawls the built sitemap and fails on
  duplicate titles or descriptions).
- Internal linking: codex cards link to related cards and to the guide
  pages that explain their mechanics; guides link to the codex; profile
  pages link to the cards a player uses most.
- Content gaps: look at the search terms the guide pages already target
  (`chess-variants`, `chess-with-power-ups`, `chess-roguelike`,
  `capture-the-king`) and propose, then write, the missing pages that
  genuinely answer a search a chess player would make. Real content,
  written well, in the site's voice. No thin or spun pages.
- Core Web Vitals as ranking signal: tie in the numbers from section 5.7.
- `sitemap.ts` covers every indexable route including dynamic ones, with
  real `lastModified` values. `robots.ts` blocks `mod/`, `dev/`, `api/`,
  `inbox/`, `settings/`.
- `hreflang` only if there is actually more than one language. Do not
  add it otherwise.

## 19. Link previews (the card that shows when you paste the link)

When someone pastes a Nerf Chess link into Instagram DMs, iMessage,
WhatsApp, Discord, Slack, X or LinkedIn, the little preview card is the
first impression. Make every one of them excellent. Today there is a
site-wide `src/app/opengraph-image.tsx` and one per codex card type.

- **Design a family of OG images** (1200x630, generated with `next/og`)
  that look like the site: flat dark surfaces from the design system,
  the logo, a crisp chess board or piece motif, and big readable text that
  survives being shown at thumbnail size on a phone. Test legibility at
  400px wide, since that is roughly how big the card renders in a chat.
- **One per route type, with live data:**
  - Home: the brand card.
  - Game `/game/[id]` and `/history/[id]`: the actual board position,
    both players' names and ratings, mode, and the result if finished.
  - Profile `/u/[username]`: avatar, username, rating per mode, games
    played, top cards.
  - Codex card pages: improve the existing ones so the card art and tier
    colour carry.
  - Clubs, tournaments, puzzles, guides, leaderboard: title plus the one
    number or image that makes someone want to tap.
  - Challenge and friend-game invite links: "Joseph challenged you to Nerf
    Chess, 5+3" style, so an invite pasted into a DM is irresistible. This
    is the highest-value card on the site; spend the most time on it.
- **Metadata:** `og:title`, `og:description`, `og:image` with width,
  height and alt, `og:site_name`, `og:type`, `twitter:card`
  `summary_large_image`, `theme-color` matching the page background, and
  `apple-touch-icon`. Descriptions short enough not to truncate in
  iMessage.
- **Performance and caching:** images render in under a second, are cached
  at the edge, and fall back to the brand card on any error, never a blank.
- **Verify** by fetching each route's HTML the way a crawler does (no JS),
  checking every tag, and rendering every OG image into the evidence
  folder as a grid so the whole family can be reviewed in one image.

## 20. Order of work

1. Sections 1 to 4 (orientation, ledger, harness, sign-in bump).
2. Scout phase, then launch work waves covering sections 5 to 9 and 14 to
   19 in parallel, prioritised: sign-in bump and core-loop routes, bug hunt,
   link previews and SEO, user counting and mod panel, daily email, Tier A
   and Tier B animations, backend and side end, Tier C, additions.
3. Second and later waves until a full wave finds nothing.

Start with section 1. Do not write code until the orientation notes and the
inventory counts are in the ledger.
