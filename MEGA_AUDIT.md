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

### 1.3 Notation and state
- [ ] SAN and FEN (or extended FEN with nerf state) round-trip perfectly
- [ ] PGN export includes card/nerf info as tags or comments
- [ ] Game replay from stored moves reproduces the exact final state every time
- [ ] Deterministic RNG: any randomness is seeded server-side and reproducible for replays and tests

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

### 2.3 Hidden information
- [ ] Opponent client never receives the identity of hidden nerfs (check the actual websocket payloads)
- [ ] Hidden info isn't leaked via timing, animation differences, legal move highlights, sound, error messages, or network message sizes
- [ ] Spectators see only what they're allowed to see, consistently
- [ ] Replays reveal hidden info only after the game ends
- [ ] Browser devtools inspection of state/store reveals nothing hidden

### 2.4 Draft system
- [ ] Draft pools sized correctly, no duplicates where not allowed
- [ ] Reroll/skip logic, limits respected
- [ ] Timer expiry auto-picks sensibly
- [ ] Disconnect mid-draft resumes on reconnect
- [ ] Both players can't see each other's picks unless designed to
- [ ] Draft results stored with the game record

### 2.5 Balance
- [ ] Headless sim harness exists: engine vs engine, configurable card sets, N games, outputs CSV
- [ ] Win rate per card, per side, per time control
- [ ] Pick rate per card from real game data (read-only, from local or exported data, never prod writes)
- [ ] Cards with win rate outside 45 to 55 percent flagged for review
- [ ] Cards never picked flagged for buff or redesign
- [ ] White/black advantage measured with and without cards
- [ ] Balance changes recorded with before/after sim numbers in DECISIONS.md
- [ ] Balance changes are config, not code, so they can be tuned without redeploying logic

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

### 6.3 Design system
- [ ] Design tokens for colour, spacing, radius, shadow, type scale, motion durations
- [ ] Every component uses tokens, no magic numbers
- [ ] Consistent button hierarchy (primary, secondary, ghost, danger)
- [ ] Consistent iconography from one set
- [ ] Typography: distinctive display font for headings, highly readable body font, tabular numbers on clocks and ratings
- [ ] Dark and light themes both feel designed, not inverted
- [ ] Load `frontend-design` and run a full critique of the visual identity at least once every 30 iterations

### 6.4 States
- [ ] Loading skeletons, not spinners, for content
- [ ] Empty states with helpful next actions
- [ ] Error states with retry
- [ ] Offline banner when connection drops
- [ ] Toasts for non-blocking feedback, consistent position and timing

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

---

## 11. NEW PLAYER EXPERIENCE

- [ ] First visit to first move in under 10 seconds
- [ ] Interactive tutorial: basic nerf, basic buff, draft, first game vs easy AI
- [ ] Tooltips on first appearance of each mechanic, dismissible, remembered
- [ ] "How to play" page with short animated examples
- [ ] Beginner-friendly card subset for first few games
- [ ] Clear explanation of why a move is illegal when a nerf blocks it (without leaking hidden info)

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

---

## 15. META: IMPROVE THE LOOP ITSELF

- [ ] Every 25 iterations, review STATE.md and the git log: is the loop spending time well? Rebalance priorities in BACKLOG.md
- [ ] Every 25 iterations, look for regressions: rerun full Lighthouse, full e2e, full sim, compare to recorded numbers
- [ ] If an area has been neglected for 20+ iterations, bump one of its items up
- [ ] Add new lines to this file whenever a bug reveals a category you hadn't thought of
- [ ] Keep LEARNINGS.md tidy: merge duplicates, keep it under ~400 lines so future iterations can read it fast
