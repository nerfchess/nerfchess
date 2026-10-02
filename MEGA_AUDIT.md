# NerfChess MEGA AUDIT

Read this file during every audit pass. Every unchecked line is a question to ask of the codebase. If the answer is "no" or "not sure", that's a backlog item. Add new lines whenever you think of something not covered. This file only grows.

Fan out: during an audit, spawn parallel subagents (one per section group below) so the audit covers everything in one iteration. Each subagent returns a list of concrete backlog items with priority, file paths, and a one-line why. Merge, dedupe, and rank them into BACKLOG.md.

---

## 1. CHESS RULES ENGINE

### 1.1 Move generation
- [ ] Perft tests pass for the standard positions (start, Kiwipete, positions 3 to 6) to at least depth 5 with no nerfs active
- [ ] Perft-style tests exist for positions with each nerf and buff type active
- [ ] Pawn single push, double push only from start rank, blocked double push
- [ ] Pawn captures both diagonals, edge files (a and h) don't wrap
- [ ] En passant only legal immediately after the double push
- [ ] En passant that exposes own king along the rank is illegal (the famous horizontal pin case)
- [ ] En passant when the capturing pawn has a nerf restricting captures
- [ ] Promotion to queen, rook, bishop, knight all work and show a picker
- [ ] Underpromotion picker works on mobile and keyboard
- [ ] Promoted piece inherits, loses, or transforms nerfs/buffs exactly as documented in DECISIONS.md
- [ ] Castling kingside and queenside both colours
- [ ] Cannot castle out of, through, or into check
- [ ] Castling rights lost on king move, rook move, rook captured on its home square
- [ ] Castling when a nerf moved, swapped, or teleported the rook or king
- [ ] Castling when a buff gives the king or rook extra movement
- [ ] Chess960-style edge cases if any card shuffles back ranks
- [ ] Pins: absolute pins restrict movement, including pinned pieces with buffs that add movement
- [ ] Discovered check, double check (only king moves legal)
- [ ] Knight, bishop, rook, queen, king generation never goes off-board
- [ ] No piece ever captures its own colour, including via buffs that add capture patterns
- [ ] King can never be captured, it can only be checkmated (unless a card explicitly changes this, documented)
- [ ] Perft is run for BOTH rule sets: the site's king-capture variant (pseudo-legal, king capture terminal) against an independent reference, and the Chess Diff legality branch of legalMoves against the published counts
- [ ] Every card-granted move (augmentMoves) obeys the base-move invariants: on-board, origin holds the mover's piece of m.piece, never targets an own piece, captured/capturedSquare match the board, last-rank pawn arrivals carry a promotion, no pawn lands on its own back rank
- [ ] Every direct board mutation (BuffApi place/removePiece/relocate/setPieceType/setPieceColor and raw api.board.pieces writes) keeps castling rights, the en passant target and the pawn-rank invariant consistent with the board
- [ ] No two legal moves share a UCI string with different semantics (castle vs a card king slide, promotion vs a bare arrival), because moveByUci resolves wire moves to the first match
- [ ] moveFromUCI (the replica, review and OG raw fallback) reproduces the authoritative move's semantics for every move the server can accept: no inferred castle, en passant or double push for card-granted moves
- [ ] The promotion picker only ever lists promotion moves; a non-promoting move to the same square never shows up as a blank tile
- [ ] Checklist lines that assume FIDE legality (check, pins, castling through check, en passant exposing the king) are marked N/A for the king-capture game and re-scoped to the Chess Diff sub-game, with the decision recorded

### 1.2 Game end
- [ ] Checkmate detection correct when nerfs remove a defender's legal moves
- [ ] Checkmate detection correct when buffs add escape squares
- [ ] Stalemate detection, including stalemate caused purely by a nerf
- [ ] Threefold repetition considers castling rights, en passant rights, AND active nerf/buff state
- [ ] Fifty-move rule counter resets correctly on pawn moves and captures, including card-triggered captures
- [ ] Insufficient material: K v K, K+B v K, K+N v K, K+B v K+B same colour, accounting for buffed minor pieces that can mate
- [ ] Timeout vs insufficient material is a draw
- [ ] Resign, draw offer, draw accept, draw decline, abort before move 2
- [ ] Game end is processed exactly once even if two end conditions trigger the same tick
- [ ] Final position, result, and reason stored correctly
- [ ] Repetition detection keys the TRUE side to move after extra moves, skips and turn-consuming card activations
- [ ] Draw rules (threefold, fifty-move) stay active after cards rewrite the board (summons, teleports, pocket drops) instead of being silently suspended
- [ ] Chess Diff sub-game: standard end rules (mate, stalemate, insufficient material, flag vs insufficient material, fifty-move, threefold) decide the diff, and its apex prize is never awarded from a dead position
- [ ] An immobile side (zero pseudo-legal moves) is resolved exactly as the player-facing rules text says (forced pass, draw or loss) in both nerf and buff modes
- [ ] Every game-end reason is a structured code stored with the game; stats, moderation and achievements classify by code, never by substring of display text
- [ ] End-condition precedence is defined and tested: king capture, nerf loss, fifty-move, threefold, no-moves, plus flag vs move arriving the same tick
- [ ] Local (client-only) AI games derive their result only from the engine; a client exception never awards a result

### 1.3 Notation and state
- [ ] SAN and FEN (or extended FEN with nerf state) round-trip perfectly
- [ ] PGN export includes card/nerf info as tags or comments
- [ ] Game replay from stored moves reproduces the exact final state every time
- [ ] Deterministic RNG: any randomness is seeded server-side and reproducible for replays and tests
- [ ] Random card outcomes and future draft offers cannot be computed by a client from data it is sent (no client-visible seed, no public-state-only RNG decides them)
- [ ] Archived games carry replay_version plus a final-position hash, and the archive viewer verifies its replay against them
- [ ] The replays used by the Durable Object (gameFromMatch), the engine service (replay.ts) and clients (draftOnline/OnlineMatch) are one implementation or are parity-tested in CI
- [ ] Client replicas never show a game result the server has not sent; a locally computed result is provisional until the end frame
- [ ] Any change to a draftable pool (new card, retirement, retier, category change) bumps REPLAY_VERSION or is replay-safe, and replays verify each stored pick's card ids instead of trusting the offer index

---

## 2. NERFS, BUFFS, AND CARDS (all ~1000)

### 2.1 Per card
- [ ] Every card has a unique stable ID that never changes
- [ ] Every card has a table-driven test asserting its exact effect
- [ ] Card text matches implementation word for word in effect
- [ ] Card text uses consistent templating, tense, and keywords
- [ ] Keywords are defined once in a glossary and tooltipped everywhere they appear
- [ ] Every card has art or a consistent placeholder, correct rarity frame, correct icon
- [ ] No typos, consistent capitalization of piece names
- [ ] Card numbers (durations, ranges, counts) are displayed the same way across all cards
- [ ] No card id is reused across the nerf and buff libraries, and every id-keyed table (retired.ts, card_overrides, icon/glyph maps, card audit, stats) is keyed by kind+id
- [ ] No two live cards share a display name
- [ ] Moderator text/tier overrides render identically on every surface (draft, dock, codex, game over, history), not just the codex browser
- [ ] Glossary and guide prose that quotes numbers (draft rates, cadences, durations) is generated from or tested against engine constants
- [ ] Every 'never strands you' relax/fallback a card relies on is either printed on the card or covered by one glossary rule linked from it

### 2.2 Interactions
- [ ] Two nerfs on the same piece stack, override, or conflict exactly as the rules say
- [ ] Nerf plus buff on the same piece resolves predictably
- [ ] Effects on a piece that gets captured are cleaned up
- [ ] Effects on a piece that promotes behave as documented
- [ ] Effects with durations tick down correctly (per move, per turn, per player turn, documented which)
- [ ] Effects that trigger "on capture", "on move", "on check" fire once, in a defined order
- [ ] Trigger ordering when both players' effects fire at once is defined and tested
- [ ] Effects never create an illegal board (two kings same colour, piece off board, pawn on back rank unpromoted)
- [ ] Effects never leave a player with zero legal moves without stalemate/checkmate being declared
- [ ] Interaction matrix test: sample every pair of the top 100 most-picked cards and assert no crash, no illegal state
- [ ] Every acquisition path (draft pick, take-both, grant, Jackpot/apex grant, rebuild replay) runs the same settle pipeline as moves and activations: loss check, orphan prune, no-legal-move forced pass
- [ ] Pocket drops and card-driven placements, relocations and swaps obey the holder's nerf and the pawn-rank rule exactly like ordinary moves
- [ ] Card-internal timers and board-effect timers count the same unit, and extra moves, turn-consuming activations and forced passes tick both identically
- [ ] Card removal effects versus 'cannot be captured' protections follow one documented rule across all cards
- [ ] A relocated or swapped piece keeps (or explicitly loses) its square-bound effects; no effect ever transfers to a different piece
- [ ] Read-only probes (gameInCheck, buffAugmentedAttacks, premove and move-risk checks, bot king-safety checks) never mutate BuffInstance state; a test diffs serializeGame before and after each probe for every card with augmentMoves

### 2.3 Hidden information
- [ ] Opponent client never receives the identity of hidden nerfs (check the actual websocket payloads)
- [ ] Hidden info isn't leaked via timing, animation differences, legal move highlights, sound, error messages, or network message sizes
- [ ] Spectators see only what they're allowed to see, consistently
- [ ] Replays reveal hidden info only after the game ends
- [ ] Browser devtools inspection of state/store reveals nothing hidden
- [ ] No seed shipped to a client (nerfSeed, draftSeed, or any fork) lets it derive the master seed, the opponent's seed or future draft offers; seed space and derivation are checked against brute force
- [ ] Every card whose text grants information (reveal the opponent's nerf, peek at offers) actually delivers it in online play and is not dead text under the current visibility policy
- [ ] Lock-in timeouts resolve to a server-random choice, never a fixed index that tells the opponent what was picked
- [ ] UI secrecy copy ('stays secret until the game ends') matches what the server sends in every mode: classic, nerf queue, nerf friend, buff, house, tournament, arena
- [ ] A frame-capture test runs the real worker GameServer with fake sockets and asserts per-recipient payloads for every mode and for spectators
- [ ] Spectators who join before a game starts get a full snapshot when it starts, and the DO and the arena hub behave the same
- [ ] House bots and the remote engine never read the human's hidden nerf (search, draft picks and nerf picks use only public information plus their own rule)

### 2.4 Draft system
- [ ] Draft pools sized correctly, no duplicates where not allowed
- [ ] Reroll/skip logic, limits respected
- [ ] Timer expiry auto-picks sensibly
- [ ] Disconnect mid-draft resumes on reconnect
- [ ] Both players can't see each other's picks unless designed to
- [ ] Draft results stored with the game record
- [ ] Every draft wait has a terminal outcome even in untimed games; no seat can block the opponent's turn indefinitely
- [ ] The opening nerf deal is tested (distinctness, tier symmetry, per-card frequency), and the pool overrides it used are frozen on the match
- [ ] Docs describing draft visibility, cadence and timeout behaviour match the code

### 2.5 Balance
- [ ] Headless sim harness exists: engine vs engine, configurable card sets, N games, outputs CSV
- [ ] Win rate per card, per side, per time control
- [ ] Pick rate per card from real game data (read-only, from local or exported data, never prod writes)
- [ ] Cards with win rate outside 45 to 55 percent flagged for review
- [ ] Cards never picked flagged for buff or redesign
- [ ] White/black advantage measured with and without cards
- [ ] Balance changes recorded with before/after sim numbers in DECISIONS.md
- [ ] Balance changes are config, not code, so they can be tuned without redeploying logic
- [ ] Committed win-rate data matches the current engine (codeHash) and npm run report:winrate succeeds on what is committed
- [ ] Every override the moderator card editor accepts (tier, enabled, text) is applied in game for both buffs and nerfs, or the editor refuses it
- [ ] Nerfs have their own measured win-rate cost (nerf vs no nerf, both colours), not only buffs

---

## 3. AI / ENGINE OPPONENT

- [ ] Search runs in a Web Worker, never blocks UI
- [ ] Iterative deepening with time limits that respect the clock
- [ ] Transposition table keyed including nerf/buff state
- [ ] Move ordering (captures, killers, history) for speed
- [ ] Evaluation understands buffed and nerfed piece values
- [ ] AI never attempts an illegal move under any card combo (fuzz test this)
- [ ] Difficulty levels feel distinct, measured by sim vs each other (each level should beat the level below ~70 percent+)
- [ ] Low levels make human-looking mistakes, not random nonsense
- [ ] Natural-feeling think time with small variance
- [ ] AI drafts cards sensibly, not randomly
- [ ] Opening variety so games vs AI aren't identical
- [ ] Engine speed benchmark (nodes per second) tracked in LEARNINGS.md across iterations
- [ ] The AI's move pick, card-activation choice and draft choice never mutate the live game (serializeGame identical before and after), asserted in the AI fuzz
- [ ] Remote engine-service replies are matched to local legal moves on every Move field (from, to, promotion, via, drop)
- [ ] Displayed bot ratings (practice BOT_ELO, house tier ratings, Play-vs-bot bands) are backed by a measured ladder
- [ ] All AI randomness goes through a seeded RNG (no Math.random in pickAIMove's easy and blunder paths), so a bot game reproduces from its seed

---

## 4. MULTIPLAYER, NETWORKING, BACKEND (local/dev only)

- [ ] Matchmaking pairs by rating and time control, widens range over time
- [ ] Queue cancel works instantly
- [ ] Reconnect after refresh, network drop, phone sleep, tab switch
- [ ] Two tabs on same account handled gracefully (one active, the other warned)
- [ ] Move submitted twice is idempotent
- [ ] Out-of-order messages handled via sequence numbers
- [ ] Client and server never desync; if they do, client resyncs from server state automatically
- [ ] Clock is server-authoritative, client shows smooth local countdown with lag compensation
- [ ] Abandonment detection with fair grace period and claim-win button
- [ ] Rematch flow, colour swap on rematch
- [ ] Challenge a friend via link
- [ ] Spectating
- [ ] Rate limiting on actions and chat
- [ ] Input validation on every message, server rejects garbage without crashing the room
- [ ] Durable Object / room cleanup so dead rooms don't leak
- [ ] Load test locally: 100+ concurrent simulated games, note results in LEARNINGS.md
- [ ] Graceful handling when server restarts mid-game
- [ ] The Durable Object's checkpoint-resume path and a full replay produce the same desyncFingerprint at every committed ply (no state that depends on which path rebuilt the game)
- [ ] Seats whose sockets vanish with a deploy or isolate reset get a disconnect stamp, so opponentGone, claim-win and room GC still work
- [ ] A finished game whose D1/Postgres record write fails is retried until recorded; nothing marks it recorded without a successful write
- [ ] Client-supplied strings never index plain objects (prototype keys like 'constructor' are rejected as pools, ids or types)
- [ ] One account cannot hold two live games at once via queue, playbot, challenge or a second tab
- [ ] Paired/autoStart games whose second seat never arrives are aborted within about a minute, and the waiting player is told
- [ ] Games where a side never moved end as aborted (unrated), never as rated abandonment or timeout wins
- [ ] Per-address and per-account cap on concurrent sockets to the single global Durable Object
- [ ] Capacity budget for the single global DO is measured and recorded: per-move CPU, alarm-pass cost per live game, storage bytes per move, and the live-game count where it saturates
- [ ] Deploys that bump REPLAY_VERSION: the number of live games ended as 'server update interrupted this game' is counted and kept near zero
- [ ] DO realtime behaviour has an executable in-process test (fake runtime) in CI, not only regex checks over worker.ts
- [ ] Moderation (mute, ban, rename) takes effect on sockets that are already open
- [ ] Half-open sockets are detected on both ends within about 30s by heartbeat timeout, not left to TCP
- [ ] The server-side rated paths (queue, playbot, custom create, tournaments) match the product rules on which games may move rating

---

## 5. ACCOUNTS, RATINGS, DATA

- [ ] Rating update applied exactly once per rated game
- [ ] Aborted games don't affect rating
- [ ] Provisional rating period
- [ ] Rating history graph on profile
- [ ] Separate ratings per time control if applicable
- [ ] Guest play works and can convert to an account without losing history
- [ ] Profile page: stats, favourite cards, win rate by card, recent games
- [ ] Game history list with filters and pagination
- [ ] Settings persist: board theme, piece set, sound, animation speed, premove, auto-queen, confirm resign
- [ ] Username rules, profanity filter, unicode edge cases
- [ ] Account deletion and data export exist
- [ ] Any schema change has a migration path and is backward compatible with existing games
- [ ] Archived rating_before/after equal what was actually applied, including retried, replayed and concurrent (CAS-retried) results
- [ ] The server enforces rated-game invariants (two distinct accounts, a mode bucket, no stacked or handicapped presets, no result before both sides moved) whatever the client sends
- [ ] Inactive ratings regain deviation over time, and provisional ratings are kept off, or clearly separated on, leaderboards
- [ ] Profile counters (games, W/L/D, win rate) agree with the game list they sit above
- [ ] migrations/ builds a working database from empty, contains no replayable data changes (seeds, resets, owner grants), and a guard diffs it against the runtime schema
- [ ] Archived games replay under the engine version they were recorded with, or say plainly that they cannot
- [ ] Signed-in history surfaces read the account archive, not device storage
- [ ] Rated games between accounts sharing an IP or device, or against a minutes-old guest, are flagged for rating farming
- [ ] Manual rating edits (owner and mod grants, hand_set) are audited and visible as points in the player's rating history

---

## 6. UI AND VISUAL DESIGN

### 6.1 Board
- [ ] Drag and drop and click-click both work on mouse, touch, pen
- [ ] Drag ghost follows finger exactly, no offset on mobile
- [ ] Legal move dots, capture rings, last move highlight, check glow
- [ ] Premove with clear visual and cancel
- [ ] Right-click arrows and square marks, cleared on left click
- [ ] Board flip, auto-flip option for local play
- [ ] Coordinates inside or outside board, toggleable
- [ ] Multiple board themes and piece sets, previewed in settings
- [ ] Board resizable on desktop, fills width sensibly on mobile
- [ ] Nerf/buff badges on pieces readable at small sizes without covering the piece
- [ ] Captured pieces and material difference display
- [ ] Move list with clickable moves to review during and after the game
- [ ] Keyboard navigation through move list (arrows)
- [ ] Material and captured-piece display stays correct after promotion and when cards summon, transform, revive or steal pieces (computed from capture pools and on-board material, not inferred from the start set)
- [ ] Per-game view state (flip, review ply, drawn arrows) never leaks into persisted or account-synced settings or into the next game
- [ ] Every surface that renders a Board (play, spectate, replay, history, analysis, tutorial) honours the same display prefs and shows check
- [ ] No board overlay (VFX canvas, WebGL layer, passive auras, signature scenes, splash, effect popovers) can swallow a tap or click; a guard asserts pointer-events:none on every layer above the squares
- [ ] On-square marks (countdown chips, motif badges, status chips, shields, bound sigils, coordinates) never overlap each other and occlude at most a set share of the piece at 320px, checked by script for every piece set
- [ ] Coordinate labels and move hints (dots, rings, last-move, premove tint) keep a minimum contrast or deltaE on every board theme, checked by script
- [ ] Drag, click and drop stay correct while a card animation, board shake, draft overlay or effect popover is running
- [ ] Last-move highlight covers every ply of a multi-move turn (extra-move cards) and card-driven piece relocations
- [ ] The board stays playable in landscape phone viewports (squares of at least 32px at 640x360 and 844x390)
- [ ] The premove option generator has a unit test (dedupe, nerf filter, buff union, self-check guard), and a queued premove is re-validated after a card changes the position

### 6.2 Layout and screens
- [ ] Homepage instantly communicates what NerfChess is in one glance
- [ ] Clear primary CTA: Play now
- [ ] Play menu: vs AI, quick match, friend link, time controls
- [ ] Game screen layout: board, clocks, cards, move list, chat, controls, all reachable on mobile without scrolling during play
- [ ] Post-game screen: result, rating change animation, key moment, rematch, share, analyze
- [ ] Profile, leaderboard, card codex, settings, about, how to play
- [ ] 404 page with personality
- [ ] Every screen tested at 320, 360, 390, 414, 768, 1024, 1280, 1440, 1920, 2560 widths
- [ ] Landscape phone layout
- [ ] No content hidden behind iOS notch or Android nav bar (safe-area insets)
- [ ] The board has a minimum size on every viewport shape and at every breakpoint edge (639/640, 1023/1024, landscape phones), and the hand-written boardFitClass calc strings in OnlineMatch.tsx and game/page.tsx come from one source
- [ ] viewport-fit=cover is matched by left/right/bottom safe-area padding on the page shell and on every fixed or floating control
- [ ] Every global destination, including How to play and the tutorial, is reachable from the desktop header and not only from the phone hamburger
- [ ] One action has one label and one icon on every entry point (homepage, lobby, header Play menu)
- [ ] The route sweep (width x theme x pointer x orientation) runs on a schedule or in CI so its committed baseline actually gates

### 6.3 Design system
- [ ] Design tokens for colour, spacing, radius, shadow, type scale, motion durations
- [ ] Every component uses tokens, no magic numbers
- [ ] Consistent button hierarchy (primary, secondary, ghost, danger)
- [ ] Consistent iconography from one set
- [ ] Typography: distinctive display font for headings, highly readable body font, tabular numbers on clocks and ratings
- [ ] Dark and light themes both feel designed, not inverted
- [ ] Load `frontend-design` and run a full critique of the visual identity at least once every 30 iterations
- [ ] Every transient overlay (toast, notice, board banner, opponent-plays card) is legible in every theme; no fixed-dark Tailwind colour (ink-*, black, white/NN) ships without a light override or an allowlisted reason
- [ ] The design docs (DESIGN.md, design-system.md, themes.md, the loop's working rules) state the token values globals.css actually ships (radius, text ramp, accent), checked by a script
- [ ] Components consume the type-scale tokens (--step-*, text-xs/sm), and new arbitrary text-[Npx] values are ratcheted to zero

### 6.4 States
- [ ] Loading skeletons, not spinners, for content
- [ ] Empty states with helpful next actions
- [ ] Error states with retry
- [ ] Offline banner when connection drops
- [ ] Toasts for non-blocking feedback, consistent position and timing
- [ ] Polled data (lobby snapshot, TV list, homepage live counters) shows it is stale once polls fail after a first successful load
- [ ] Floating notices have assigned lanes, so no two can occupy the same spot, and no feedback is desktop-only

---

## 7. ANIMATION, SOUND, GAME FEEL

- [ ] Piece moves ease naturally, duration scales slightly with distance
- [ ] Capture: small impact, captured piece fades/shatters
- [ ] Check: king square pulse
- [ ] Checkmate: dramatic but short end sequence
- [ ] Promotion: piece transforms with flair
- [ ] Castling animates both pieces
- [ ] Card draw, card reveal (flip), card play, nerf apply (debuff effect), buff apply (glow) animations
- [ ] Draft screen: cards deal in, hover lift, pick snap
- [ ] Rating change counts up/down on post-game screen
- [ ] Low time: clock pulses, subtle tick sound under 10s
- [ ] Hover and press states on every interactive element
- [ ] Page transitions smooth, no flash of unstyled content
- [ ] Respect prefers-reduced-motion everywhere
- [ ] Animation speed setting (off, fast, normal)
- [ ] Animations never delay input acceptance or premoves
- [ ] All animations hit 60fps on a mid-range Android phone (test with CPU throttling 4x)
- [ ] Sound set: move, capture, check, castle, promote, low time, win, lose, draw, card play, nerf, buff, match found, notify
- [ ] Sounds are short, mixed at consistent volume, preloaded, and mutable
- [ ] Optional haptics on mobile for capture/check/match found
- [ ] Board diff feedback is pinned by a test: every core move type (quiet, capture, en passant, castle, promotion by click, drag and premove, crazyhouse drop) gets the right slide or flourish and never a card-removal detonation
- [ ] Server presentation budgets (draftPrepMs and similar) cover the client's worst-case choreography (spectacle queue cap + vault + deal at the slowest effect-duration setting), so no animation uses up a server deadline or a player's clock
- [ ] Information-bearing motion (clock separator, check, card-play fallback) survives the low-time motion hold and Animations off
- [ ] Cue loudness is consistent across sound themes (sampled vs synthesized), checked by an offline render guard, and escalation ladders (low time then urgent) get louder in every theme
- [ ] Spectators and TV hear the same move, capture, castle and check audio as the players
- [ ] Every exported sound cue has a call site and every sound pref has a Settings control (no dead cues, no unreachable prefs, no cue gated by an unrelated toggle)
- [ ] Hover styles only apply on hover-capable pointers (no sticky hover after a tap on touch)
- [ ] Animation speed modes scale the explicit per-feature durations (piece glide, card effect duration) instead of a CSS clamp silently overriding them
- [ ] Haptics have their own toggle and follow the same motion and mute policy as the visuals

---

## 8. PERFORMANCE

- [ ] Lighthouse mobile performance 95+ on homepage and game page (record numbers each time)
- [ ] LCP under 2s, CLS under 0.05, INP under 200ms
- [ ] JS bundle size measured and tracked in LEARNINGS.md, initial route under a set budget
- [ ] Route-level code splitting
- [ ] Card art lazy loaded, responsive sizes, modern formats (AVIF/WebP)
- [ ] Fonts subset, preloaded, font-display swap
- [ ] Static assets long-cached with hashed names
- [ ] No unnecessary re-renders during play (profile React/whatever framework)
- [ ] Websocket payloads minimal, diffs instead of full state where safe
- [ ] Memory stable over a 2 hour session (no leaks from listeners, timers, animation frames)
- [ ] Works on slow 3G throttling without breaking
- [ ] Routes that never run a game (/, /play, /lobby, the /puzzles shell) do not statically import src/engine/game.ts or the card libraries, and a guard fails if they do
- [ ] Render-blocking CSS per route is measured and budgeted: globals.css on every page, plus the effect CSS statically imported by Board on game routes
- [ ] Worker script size and isolate cold start (global-scope evaluation of the 2.1k-card library and the OpenNext handler) are measured against Cloudflare's size and startup limits
- [ ] Post-hydration lazy loads (sigVisuals, three.js, plays modules, card libraries) respect Save-Data and effectiveType and are deferred until visible or needed
- [ ] Module-level caches of canvases, bitmaps and decoded audio (clip renderer, VFX sprites, sounds) are bounded and freed when the owning UI closes
- [ ] HTML TTFB is measured: the root layout reads cookies so every route SSRs per request with no incremental cache; decide which routes may be static or cached
- [ ] Real-user web vitals (LCP, INP, CLS) are collected from production, not only lab runs on next dev
- [ ] Per-ply main-thread budget on the game route (React commit plus effects for one move at 4x CPU, production build) is measured separately from engine cost
- [ ] Performance numbers come from a production build, not next dev (unminified, StrictMode double render); every recorded number says which build it came from

---

## 9. ACCESSIBILITY

- [ ] Run `design:accessibility-review` on every screen
- [ ] Full game playable by keyboard alone
- [ ] Screen reader announces moves, checks, card effects, clock warnings
- [ ] Squares and pieces have accessible names
- [ ] Focus visible everywhere, logical tab order, focus trapped in modals
- [ ] Colour contrast AA minimum on all text and important UI
- [ ] Highlights distinguishable for colourblind users (add pattern/shape not just colour)
- [ ] Text scales to 200 percent without breaking layout
- [ ] Touch targets at least 44px
- [ ] Screen-reader text (aria-label, sr-only square descriptions, live announcements, card names) never reveals what the visual board hides: the opponent's nerf, unrevealed hexes, masked draft picks
- [ ] Every aria-live region is in the DOM before its text changes; no live region is mounted with its message already inside (the PlayAnnouncement and ExtraTurnsBanner pattern)
- [ ] Card VFX and signature animations (sigVisuals, 3D board) stay under WCAG 2.3.1 flash thresholds (3 per second, red flash), measured per card
- [ ] The root font size is relative so the user's browser text-size preference is honoured
- [ ] The 3D board mode and the clip studio are keyboard-operable and labelled, like the 2D board

---

## 10. CODE QUALITY, TESTS, TOOLING

- [ ] One command runs typecheck, lint, unit, integration, e2e
- [ ] TypeScript strict mode on, zero `any` without a comment justifying it
- [ ] ESLint and Prettier configured and clean
- [ ] Engine has near 100 percent branch coverage
- [ ] Every card has a test
- [ ] Playwright e2e: signup, guest play, vs AI full game, draft, online game between two browser contexts, reconnect mid-game, rematch, settings persistence
- [ ] Visual regression screenshots for key screens
- [ ] Fuzz test: random legal games with random card sets, 10k games, assert no crash and no illegal state
- [ ] Dead code and unused deps removed (run `engineering:tech-debt`)
- [ ] Duplicate logic between client and server extracted into shared package where safe
- [ ] Clear folder structure documented in LEARNINGS.md
- [ ] Error boundary catches UI crashes and shows recovery screen
- [ ] Client error logging hook in place (dev only, no prod config changes)
- [ ] Every guard that reads git history (test:sitemap-dates, build stamp) passes on a shallow clone, or detects it and says so
- [ ] The engine suites that need dist-server (test:rules, test:nerfs, test:desync, test:snapshot) and the tsx engine suites (test:lab, test:parity, test:san, test:draft-*) run in CI on every push
- [ ] Every nerf, not only EXPANDED_NERFS, and every buff is smoke-played in CI (no throw, no zero-legal-move state without a result)
- [ ] Clock billing (elapsed, grace, draft-window exclusion, increment) has one implementation shared by worker.ts, arena-service and server/index.ts, with a unit test
- [ ] The legacy standalone server (server/index.ts) is either retired or covered by the same protocol tests as the Durable Object
- [ ] ESLint covers arena-service/ and engine-service/, which are currently ignored
- [ ] A component-level error boundary isolates the VFX/effects layers so a card animation crash cannot unmount a live match
- [ ] Single source files stay under a size budget (basicPlays, greatPlays and sigVisuals.tsx exceed Babel's 500KB deopt threshold)
- [ ] Status of rows in docs/ralph-backlog.md and docs/polish-pass/LEDGER.md is re-verified against the code each audit pass (C4 and F250 are stale)

---

## 11. NEW PLAYER EXPERIENCE

- [ ] First visit to first move in under 10 seconds
- [ ] Interactive tutorial: basic nerf, basic buff, draft, first game vs easy AI
- [ ] Tooltips on first appearance of each mechanic, dismissible, remembered
- [ ] "How to play" page with short animated examples
- [ ] Beginner-friendly card subset for first few games
- [ ] Clear explanation of why a move is illegal when a nerf blocks it (without leaking hidden info)
- [ ] Card descriptions are scored for reading level and length, and every mechanic term in card text links to the glossary
- [ ] The first bot game's defaults (difficulty, colour, clock, mode) are chosen for a newcomer, and the home page points first-time visitors to the guided game

---

## 12. FEATURES (P3, only after higher priorities are clear)

- [ ] Card codex: search, filter by type/rarity/piece/effect, sort, detail pages with examples
- [ ] Puzzle mode using nerf/buff positions, with puzzle rating
- [ ] Daily challenge with shareable result (Wordle style)
- [ ] Analysis board with nerf state shown, step through game
- [ ] Game highlight GIF/video export for TikTok/Shorts/Reels (vertical 9:16 option)
- [ ] Shareable game links with rich previews
- [ ] Leaderboards: global, weekly, per card
- [ ] Achievements/badges for fun milestones
- [ ] Custom game settings for friend matches (card pool, time control)
- [ ] Tournament/arena mode for club events like the Hart House one
- [ ] Emotes in game, rate-limited
- [ ] Streamer mode (hide names, delay)
- [ ] PWA: installable, offline vs AI play
- [ ] Does every replay surface (/history/[id], /game/[id], clip export, spectator, analysis) reproduce card board rewrites, or does any of them fall back to a moves-only replay for draft games?
- [ ] Is the shipped puzzle corpus re-proven against the current engine in CI, so a rules or card change cannot leave a wrong 'proven' answer live?
- [ ] How many days of unique daily puzzles remain before the corpus repeats, and does regenerating it reshuffle past days?
- [ ] Does every option a create form offers (tournament format, friend-game settings) change what the server actually does, rather than only the label?
- [ ] Are protocol options the server accepts (stacked, picksVisible, spectatorDelaySec) reachable from some UI, or are they dead fields?
- [ ] Do achievements evaluate threshold milestones on the post-game state, and is the catalog unit tested against the engine's real reason strings?
- [ ] Do lazily advanced systems (the tournament engine advances on read) still make progress when nobody has the page open?

---

## 13. COPY, SEO, SHARING

- [ ] Run `design:ux-copy` over every screen
- [ ] Every button label is a verb and unambiguous
- [ ] Error messages say what happened and what to do
- [ ] Some personality and humour in copy, matching the meme-heavy brand
- [ ] Unique title and meta description per page
- [ ] Open Graph and Twitter cards with custom images per page and per shared game
- [ ] sitemap.xml and robots.txt
- [ ] Structured data where relevant
- [ ] Landing page section explaining NerfChess for search traffic
- [ ] Favicon set, apple touch icon, manifest
- [ ] Generated SEO artefacts (sitemapDates.gen.ts) cannot go stale between commits: they are generated at build time or enforced by a pre-commit hook
- [ ] Share images and metadata for live or in-progress games never show hidden information (nerfs, unrevealed hexes, positions mid-game), pinned by a test
- [ ] Raw server error codes (bad_json, unauthorized, record_failed) never reach the UI as text

---

## 14. SECURITY (local review only)

- [ ] No secrets in client bundle
- [ ] Server validates every move and action, never trusts the client
- [ ] Auth tokens stored safely, sessions expire
- [ ] XSS: usernames and chat escaped everywhere
- [ ] CSRF protection where relevant
- [ ] Rate limits on auth endpoints
- [ ] Dependency audit (`npm audit`), upgrade vulnerable deps carefully
- [ ] CSP headers drafted (log in NEEDS_JOSEPH.md if it needs prod config)
- [ ] No WebSocket frame sent to a seat or spectator carries data the protocol marks secret (draft RNG seed or state, the opponent's nerf before reveal, masked held cards, future offers), and a guard asserts this per frame type
- [ ] Name-keyed powers (GOD_PANEL_USERNAMES, HOUSE_EDITOR, RATING_EDITOR, ADMIN_USERNAMES) cannot be claimed by a new, renamed or guest account, and every tool re-checks server-side on every action
- [ ] Bearer-secret service channels (arena ingest, engine service, analytics summary) deny by default when the secret is unset, compare in constant time, and cap what a forged payload can touch (house accounts only)
- [ ] IP-keyed rate limits group IPv6 addresses by prefix (/64), so rotating addresses inside one allocation does not reset them
- [ ] The auto-updated OCI sidecars (engine-service, arena-service) install from a committed lockfile with npm ci, never with an unpinned npm install
- [ ] Emails are verified before they are used for sign-in, uniqueness or outbound mail
- [ ] Users can change their password and revoke every other session, so a stolen cookie has a remedy short of the 90-day expiry
- [ ] Security headers are checked on the deployed site, including responses served by the ASSETS binding and directly by worker.ts, not only under next dev
- [ ] Auth bookkeeping tables (login_attempts, sessions, guest users) are pruned and do not grow without bound
- [ ] User text that reaches server-side renderers (next/og link previews, email HTML) is length-capped and tracked against renderer advisories

---

## 15. META: IMPROVE THE LOOP ITSELF

- [ ] Every 25 iterations, review STATE.md and the git log: is the loop spending time well? Rebalance priorities in BACKLOG.md
- [ ] Every 25 iterations, look for regressions: rerun full Lighthouse, full e2e, full sim, compare to recorded numbers
- [ ] If an area has been neglected for 20+ iterations, bump one of its items up
- [ ] Add new lines to this file whenever a bug reveals a category you hadn't thought of
- [ ] Keep LEARNINGS.md tidy: merge duplicates, keep it under ~400 lines so future iterations can read it fast
- [ ] Does every backlog row still marked TODO describe work that is actually missing? Check that shipped features have their rows closed.
- [ ] Is there exactly one backlog the audit writes to and the loop reads from?
- [ ] Are owner-only questions collected in one queue (NEEDS_JOSEPH.md), so the loop stops picking blocked items?
