# NerfChess changelog

Canonical, version-controlled changelog. This file is the single source of truth
(the Google Drive copy, if any, is just a mirror). It is a timestamped, append
only log: the NEWEST entries are at the BOTTOM, so each update adds a new
`## <timestamp ET>` block and you keep reading down the file. Timestamps are US
Eastern (ET). Keep the append-only discipline; do not rewrite old blocks.

How to update it (do this with every change, without being asked):
1. Get the time in ET: `date "+%Y-%m-%d %H:%M %Z"`.
2. APPEND a new `## <timestamp ET>` block at the bottom (never rewrite old ones).
3. List what changed, with PR numbers and status (OPEN / MERGED).
4. Commit this file together with the change.

Other standing conventions: PR-only (never commit to master; the owner merges);
no em dashes anywhere; bump `buildVersion` in worker.ts on server changes; verify
with `npx tsc --noEmit` and, for server/engine changes, `npm run server:build`.

---

## 2026-07-05 (earlier this session)

Rule content:
- Opponent-hexes (curses on your opponent): 104 new, 10 to 16 per tier. PR #140/#141. MERGED. Reshipped missing tier 5-8 hexes (53 cards) as PR #166. MERGED.
- Nerf-relief boons (soften your own nerf): 32 new, pool 25 to 52. PR #142. MERGED.
- Expanded nerfs: 82 new across all 8 tiers (implemented count 232 to 302). PR #144. MERGED.
- Rule audit: objective sweep + 14-agent judgment pass; 24 findings fixed. PR #149. MERGED.

Features / UI:
- Draggable hotbar (drag an activated card onto its target). PR #145. MERGED.
- Leaderboard seeded with 150 lichess-style fake players (reversible migration). PR #143. MERGED.
- Per-effect board animations (king-only, no-pawn-advance, hex cast). PR #146. MERGED.
- Mobile nav hamburger; homepage stat counts the full library; subtler house flower. PR #147. MERGED.
- Design refresh (metal-gradient buttons, focus ring, docs/DESIGN.md). PR #148. MERGED.
- Jargon glossary tooltips. PR #164. MERGED.
- Mobile draft/UX fixes. PR #163. MERGED.
- Moderator panel members list excludes the 150 seeded bots. PR #169. MERGED.
- Tutorial "The four cards" section (nerf/buff/hex/boon, who-it-hits distinction). PR #170. MERGED.
- Codex: buff cards get the difficulty ornament; hex and boon become their own tabs; "Suggest a nerf" becomes "Suggest a rule". PR #171. MERGED.

Server / connection:
- Client connection resilience (retry/backoff, reconnect during matchmaking, seat at pairing). PR #150. MERGED.
- House-bot + game-server hardening (both modes queued, acceptWebSocket wrapped, update-interrupted games drawn+unrated). PR #151. MERGED.
- Overload/scan fix + accepting-a-bot-game fix (persisted disconnect gate). PR #168. MERGED.

---

## 2026-07-05 18:39 ET (server crisis, bots, tournaments, feature wave)

Deploy / build:
- A collaborator added a Hyperdrive/Postgres binding (#172) that BROKE the Cloudflare Workers Build, so #168-171 merged but could not deploy until fixed (#173). buildVersion was a static string, so deploys were unverifiable. Fixed: buildVersion is now bumped on server changes so /healthz identifies the running build.

Server stability saga:
- Symptom: "couldn't reach game server", slow loads, then hard crashes ("Durable Object exceeded its CPU time limit and was reset", timeouts).
- Root cause: the single global Durable Object ran FULL match-table scans on the request path and first index build; under bot churn the table bloated and each scan blew the CPU limit before it could GC, so it never drained (death spiral).
- PR #174 (server-cpu-fix-1): emergency alarm throttle + no filler + version marker. Helped, insufficient. MERGED.
- PR #176 (bounded GC + persisted live-index, no full scans): the real structural fix. CLOSED to avoid competing with the collaborator's server work.
- Collaborator PR #175: throttled the scans + fixed lobby seek pairing + stuck bots. MERGED. Server stabilized (briefly).

House bots:
- PR #177: HOUSE_ENABLED flag to pause all bot activity (clears seeks, draws in-progress bot games unrated). MERGED.
- PR #183: re-enabled bots; roster 16 to 50 with creative handles (waterbottle, iloveproteinbars, flower, bssfan, grade11isscary, timmychenbiggestfan, josephleungadmirer, kingcongo, SIXSEVENHAHAHAH, anarchychess + fillers); load-test caps. MERGED.
- PR #186: fewer seekers (2-4), faster bot-vs-bot spawn (20-80s to 4-10s), caps 18/20, buildVersion house-tune-1. OPEN.

Features:
- PR #178 cooler draft: glass reveal FX (drama scales with tier) + Surprise-your-friend stacked preset. MERGED.
- PR #179 UI redesign: research (docs/ui-research.md), mode-seam signature, fluid type scale, de-bland home/lobby, lichess rating chart, snappier search. MERGED.
- PR #180 low-time warning sound synced to the visible clock. MERGED.
- PR #181 profile polish + custom emoji flairs + avatar/flair rejection messaging. MERGED.
- PR #182 rule audit (judgment): correctness / tier-fit / clarity fixes. MERGED.
- PR #184 board bugs: mobile premove cancel, illegal-move arrows, fullscreen/resize. MERGED.

---

## 2026-07-05 evening ET (feature wave PRs, server still crashing, tooling)

Feature PRs opened:
- PR #187 tournaments: lichess-style list + detail + join/withdraw + standings/podium; D1-backed; reversible migration 0015; auth-gated. Built from scratch (no lichess source copied). OPEN.
- PR #188 homepage copy (Nerf = secret handicaps revealed at end; drafting; Buff = no nerfs, draft power-ups; win by capturing the king) + 3 nerf and 3 buff clickable cards to the codex. OPEN.
- PR #189 loading/join speedups: parallel replay prefetch, in-flight connect dedupe, board skeletons, cached lobby snapshot, hero prefetch. OPEN.
- PR #191 draft settings on /play + fixed Play-vs-Bot (it silently gave both sides hidden nerfs) + true Plain chess vs bot. OPEN.

Server:
- Under the 50-bot load (#183 + #186 both deployed, buildVersion house-tune-1) /healthz was 1/10 OK even at ~2 live games: still the full match-table scan choking on churn. The throttle-only fix (#175) does not eliminate the scan or drain the bloat.
- PR #192 (server-boundedgc-1): revived the bounded-GC (persisted live-id index, bounded cursor sweep, no full scans on the request path or index build) reconciled onto current server code, keeping the friend's alarm guards. OPEN. This is the durable fix for the crash under load.

Tooling / process:
- Set up Claude-in-Chrome (browser automation connected).
- Moved this changelog into the repo as docs/CHANGELOG.md (this file) as the canonical, always-available, version-controlled source of truth; documented the update process in CLAUDE.md.

Notes:
- Anything visual is typecheck-clean but needs a preview-deploy eyeball; the game board cannot be run in the build environment.

---

## 2026-07-05 night ET (UI warmth pass, PR conflict fixes, moderator controls)

UI / design:
- PR #194 approachability/warmth pass, grounded in a fresh multi-agent research sweep (Lichess, chess.com, top UI, the AI-generated-look tells, verified brand hexes). Warm the neutrals and structure, never the single accent: warm text ramp (--paper + tailwind parchment), ink-ladder elevation (--surface-panel/raise/hover) for menus/modals/hover rows, warm hover-reactive hairline (--edge/--edge-strong), governed --pos/--warm status pair reusing the mode-seam hues, motion vocabulary (--ease-*/--dur-*), breathing hero aura (opacity-only, gated), .tabular/.press/.hover-lift/.stagger-in utilities. GameOver victory beat recolored to the Nerf->Buff seam with a warm scrim and a rating count-up. Shared warm EmptyState (history + inbox), dismissible first-run welcome, and an anti-slop guardrail in docs/DESIGN.md. tsc + next build green. OPEN.
- Merged current master into PR #194 and resolved the conflicts (page.tsx: kept master's clickable example cards, added the staggered entrance; history: kept the new EmptyState, adopted /play for Play vs Bot).

Server / moderation:
- Resolved PR #192 against current master (bounded-GC preserved; master's house-tune changes coexist in disjoint regions); tsc + server:build clean; pushed.
- Moderator house-bots on/off toggle. New app_settings key/value table (migration 0016) flipped by mods via a guarded POST /api/mod/house; the game-server DO reads house_enabled (cached ~15s) in place of the HOUSE_ENABLED constant, which stays a hard code-level kill switch. A flip takes effect within a few seconds without a redeploy: bot seeks clear and any bot game winds down. buildVersion -> house-toggle-1.
- Mod Players tab now opens on a default roster (the most recent non-guest members) instead of a blank box, and still searches on input.

Notes:
- The warmth changes are typecheck/build-clean but want a preview-deploy eyeball; the board and the Durable Object can't fully run in the build environment.

---

## 2026-07-05 20:50 ET (count-based cards no longer soft-lock with few targets)

- Fix: cards that collect N targets (teleport N pieces, "three of your pieces become amazons" like Titan Legion, remove/freeze/promote/advance N, and the removeEnemies / placePieces / voidSquares factories) soft-locked when the board had fewer than N eligible targets: you picked the few that existed, then got stranded on an empty step you could neither complete nor skip, so the card did nothing. Now they resolve with as many targets as are available. Central one-line guard in buffNextTarget (src/engine/game.ts): once at least one target is picked, a non-finishable step with no remaining candidates ends collection, so the effect applies to the picks gathered so far. Safe for structured collectors (relocateMany, Warp Sovereign, stealBuffs, lineSweep) which already self-guard or ignore a dangling pick.
- Test: scripts/test-hexes.cjs (npm run test:rules) now drives every activated card on two sparse boards and fails on any soft-lock or non-termination. Verified to fail without the fix (7 cards) and pass with it (149 activated cards clean). tsc clean; test:rules and test:nerfs green.
- Design note: docs/2026-07-05-count-target-graceful-design.md. PR #197. OPEN.

---

## 2026-07-05 21:02 ET (turn-cost labels on every card)

- Feature: every draftable card now states whether using it uses up a turn, with a small badge in four states: Uses your turn (activated, playing it is your move), Free action (activated but resolves within your turn), Instant (applies the moment you draft it), Passive (always on while held). Nerfs are labeled Passive (secret handicaps, never activated). The label is derived from the same kind/freeAction fields the engine uses to pass the turn (game.ts), so it can never disagree with actual behavior. Shown on the shared BuffCard (draft picker, codex, in-game modal), the in-game BuffDock rows (own + revealed opponent cards; mobile drawer via the same rows), the boon corner list, and NerfCard/PlayerNerfCard. New src/engine/buff.ts turnCost()/NERF_TURN_COST and src/components/TurnCostBadge.tsx.
- Audit: swept all 419 cards for turn-cost mislabels. Deterministic pass (scripts/audit-turn-cost.cjs, table in docs/turn-cost-table.json): zero description-vs-behavior contradictions. Semantic pass (multi-agent, all cards, adversarially verified) flagged 12; all checked against source and found to be false positives (the flagged passive->turn cards are passive move-augments or unimplemented placeholders, correctly zero-turn) or design/balance calls left for the owner (pieceBound upgrades that intentionally spend a turn to designate a piece, which the badge now makes visible). No flags changed: the derived badge is correct by construction. Distribution: 155 Uses your turn, 12 Free action, 129 Instant, 123 Passive.
- Design note: docs/2026-07-05-turn-cost-labels-design.md. PR #198. Typecheck-clean; test:rules green; visuals want a preview-deploy eyeball. MERGED.

---

## 2026-07-05 21:39 ET (walnut hex: lifetime fix + walnut-piece visual)

- Fix: a walnut (and freeze) is bound to the piece on its square, but the effect was only removed when its turn timer expired, so when the walnutted piece was captured or removed the marker lingered on the empty square or jumped onto the capturing enemy piece. New pruneOrphanedSquareEffects in game.ts drops any freeze/walnut whose square no longer holds a piece of the effect's owner; called after every move and after every buff board mutation (settleAfterBuff). The visual reads effects live (draftZones), so it clears with the effect.
- Visual: a walnutted piece now renders as the whole piece becoming a plump, glossy walnut (new WalnutPiece in Pieces.tsx: gradient shell, brain-like ridges, gloss, per-instance gradient ids) with the original piece shrunk down and nestled inside the shell so you can still tell what it was. Replaces the old amber-tint-plus-peanut-emoji marker; a faint amber square wash remains.
- Animation: the walnut pops in with a comedic crunch, then gives a periodic little shudder as if the trapped piece is rattling to crack out (globals.css walnut-crunch + walnut-jiggle; cut under prefers-reduced-motion).
- Test: scripts/test-hexes.cjs (npm run test:rules) now asserts a walnut is pruned when its piece is captured. Verified to fail without the fix and pass with it. tsc clean; test:rules green. The visual wants a preview-deploy eyeball.
- PR #199. OPEN.

---

## 2026-07-12 00:18 ET (codex card insights: stats + history on every card page)

Implements docs/2026-07-11-codex-card-insights-design.md. Not yet a PR.

Codex pages:
- Hexes and boons get their own URL namespaces (/codex/hex/[id], /codex/boon/[id]), statically generated like the buff/nerf pages. Old /codex/buff URLs for those ids keep rendering with canonical + og:url pointing at the family path (no redirects). cardPath() in cardCodex.ts routes the codex list, related-card links, and the sitemap to the family paths.
- Every card page gains a server-rendered "History" timeline: wave-introduction line (src/data/cardHistory.ts, dates from git + this changelog) plus room for curated per-card balance notes (CARD_HISTORY).
- New "In play" panel (client, src/components/codex/CardInsights.tsx): games carried / seen in offers / picked, holder win rate (hidden under 20 decided games) with tier average, last-30-days activity, popularity rank within (family, tier), house-bot split, plus "currently disabled" / runtime tier-move banners. Renders nothing on failure; static content unaffected.
- Copy fix: hex/item category blurbs were missing their verb ("As a hex card, it a curse...").

Stats pipeline:
- src/lib/server/cardInsights.ts: one full-scan rollup over the games archive into a JSON blob cached in new D1 table codex_insights_cache (migrations/0023, mirrored in schema.ts), recomputed lazily when older than 6h, stale-served on failure. Nerf stats from the nerf id columns (portable SQL via pgAll); buff/hex/boon pick stats from draft_record (Postgres JSONB lateral walk, D1 json_each fallback). House bots split by the hp_ user-id prefix. Both SQL variants verified against a real SQLite with known fixtures.
- New GET /api/cards/insights?kind=&id= slices the blob per card; Cache-Control public max-age=300, s-maxage=3600. Only aggregates leave the server: no draft_record contents, no draftSeed, no per-game rows, grant actions never counted.

Moderator change history:
- New append-only D1 table card_override_history (migrations/0024, mirrored in schema.ts), no actor column (events are public, moderator identity is not).
- upsertCardOverride/deleteCardOverride now read-before-write and record one row per changed field (best effort: an audit failure never fails the override). Events (plus a synthetic "adjusted" event for pre-audit overrides) are served by the insights endpoint and rendered as "Moderator changes" on the card page.

Verified: tsc clean (only pre-existing stale .next/types artifacts), server:build green, dev-server walkthrough of hex/boon/nerf pages including a seeded 36-game fixture (win rates, ranks, tier average, bot split, tier-move banner, and audit events all correct, then cleaned up). buildVersion bumped to codex-card-insights-1.

---

## 2026-07-17 13:30 ET (dungeon gate lobby CTA, chest reveal ledger, nerf-mode wave 2)

UI:
- The Open Lobby CTA (desktop hero + mobile OpenLobbyPanel) is now a full dungeon gate (new DungeonGateButton + CSS): carved granite courses, iron corner braces with rivets, an Elder-Futhark rune lintel that ignites on hover, torch-pooled jambs, and a clipped four-ember file. Complete default/hover/pressed/focus-visible/loading/disabled states; transform/filter-only state changes (no layout shift), decorations clipped inside the button, gated under data-anim=off and data-perf=low.
- Leaderboard podium keeps the same three-across treasure-dais silhouette on phones (smaller avatars via a matchMedia hook, tightened columns, risers keep mobile min-heights, bios hidden below sm) instead of the squished vertical stack.

Draft chest:
- New reveal-state ledger (src/lib/draftReveal.ts, localStorage): the treasure chest plays exactly once per unique offer version (scope game id + offer index + reroll count). Fixes the asymmetry where a NEW draft arriving while the panel was minimized skipped the chest (the initial packStage honored `minimized`) while a reroll always played it (the dealKey reset path ignored it). Chest now fires for first/scheduled/banked/apex/reroll drafts and unrevealed reconnect restores; never for rerenders, StrictMode double-mounts, re-delivered draft states, or refresh after the reveal was watched. The draft chime rides the same ledger; a Skip control under the sealed chest jumps straight to the deal. Online scope start.id; local AI games scope ai:<game.startedAt> (survives the save/restore round-trip).

Nerf-mode wave 2 (audit: docs/2026-07-17-card-library-audit.md):
- Combination guard: COMBO_TAGS exclusive families in draft.ts — turn-theft (8 cards), draft-denial (14), mass-freeze (2). The draft never offers a card from a family the caster already holds unspent; deterministic pool filter over synced state (desync/replay-safe); BuffCard prints the exclusivity rule on the card face.
- +28 boons (bw2_*, boons2.ts; T6:5 T7:4 T8:4 of the batch), +27 hexes (hw2_*, hexes/wave2.ts, curse-structured: marks, transfers, delayed dooms, spreading ground, escalation contracts), +16 nerfs (nw2_*, nerfs/wave2.ts, filling T1/T2/T7/T8). Family totals: boons 60->88, hexes 180->207, nerfs 342->358.
- Tier 6-8 nerf rebalance (12 cards, all documented in docs/2026-07-17-nerf-wave2-and-rebalance.md): after-my-move grace + warning hints for the instant-execution loss cards (boastful, wn_glass_queen, wn_pin_cushion, wn_house_of_cards), narrowed trigger zones (hold_them_back, abstinence, helicopter_parent, closed_book), announced windows (glorious_battle), capped requirements (inching_forward), budget raise (war_footing), death_wish re-tiered 6->8.
- Animation coverage: five boon templates + five curse templates, 41 unique per-card flourish dressings, 14 fully bespoke tier 7-8 scenes (boonPlays.tsx/cursePlays.tsx); shared-flagship ratchet unchanged at 381/45 — every new card has a bespoke flagship. Passive-effect registry regenerated: 639 unique compositions covering all 16 new nerfs.
- Verified: tsc clean, eslint clean (2 pre-existing warnings), test:rules, test:nerfs, test:passive-registry, test:animations, test:desync, test:snapshot all green.

---

## 2026-07-17 17:45 ET (wave 3: multi-agent expansion, dungeon lobby, bot identity)

Delivered by a seven-subagent pipeline (content audit, boon designer, hex designer, balance reviewer, animation mapper, lobby redesign, bot data consistency) coordinated by the integrator.

Content (audit brief: docs/2026-07-17-wave3-content-map.md):
- +44 boons (bw3_*, boons3.ts) and +40 hexes (hw3_*, hexes/wave3.ts) in the genuinely open mechanic families (turncoat/possession, summoned hazards, sympathetic links, contracts, contagion, comeback, clocks, terrain, miracles); zero additions to the saturated petrify/freeze/zone/leash piles. Totals: boons 88->132, hexes 207->247, ALL_BUFFS 1006.
- Balance review over all 84 cards: bw3_futures_market fixed (prepThree gated out the banked-apex path, the card could never fire as described) and retiered T6->T7; bw3_battlefield_commission differentiated from field_knighting via deficit scaling; hw3_hydra_hex T7->T6. Verified: no new COMBO_TAGS families needed, no ward-stack lockouts, no soft-lock paths, determinism clean.
- Animation map: 63 dressed-template flagships (unique per-card SVG dressings across the ten wave templates) + 21 bespoke T7/T8 scenes; 8 new transform/opacity keyframes; shared-flagship baseline held at 381/45. Registries regenerated: 1355 icons, 687 plugin ids, 675 passive compositions.

Lobby (Fable agent):
- Full dungeon-chamber redesign extending the DungeonGateButton system: granite Quick-match chamber with Buff/Nerf carved-door mode cards (igniting in-flow selected state), engraved stone time-control tokens with a mobile bottom-sheet picker, ember tab underline, segmented rune filter, engraved section labels, stone secondary cards, dungeonized loading skeleton, sticky CTA as a real DungeonGateButton on a torchlit plinth.
- Mobile overhaul: hidden tab scrollbar with edge fade (no active-tab clipping), compact one-row masthead, 44px+ targets, safe-area insets, wrap-safe rating rows, no horizontal overflow at 360px; FpsMeter debug chip is now development-only.

Bot identity (worker.ts, games.ts, ratingSql.ts, profile page):
- Inline bot-avatar browser upload for house editors (ilovenewjeans): client validation, center-crop + compress to ~200KB, preview-before-save, server-side re-validation through the centralized isHouseEditor permission.
- Username propagation: houseNotify records actor_user_id (notifications heal on rename), live seats re-read canonical names, retained seeks re-sync from houseLiveInfo. Rule: archived games keep at-the-time names; current-state surfaces always canonical.
- Rating sync: bestLiveRatingSql unified onto the most-played-bucket rule (ends the MAX-vs-most-played divergence), per-mode challenge seeding, and recordFinishedGame rating writes converted to optimistic CAS with bounded retry so concurrent DO + arena-isolate results never lose an update.

Verified: tsc clean, eslint clean (2 pre-existing warnings), test:rules, test:nerfs, test:passive-registry, test:animations, test:desync, test:snapshot, test:glicko, and next build all green.

---

## 2026-07-18 17:08 ET (codex rule completeness: two orphaned nerfs restored)

Rule content:
- Codex completeness audit: cross-referenced every card id defined in the engine against ALL_BUFFS + ALL_NERFS (what the Codex renders). All 1006 buffs and 358 nerfs already surfaced; found five nerf rules defined in source but absent from the Codex, two of them accidental.
- Restored two fully implemented, non-duplicate nerf rules that were defined but never wired into any registry array (orphaned in the b437f3c refactor), so they never appeared in the Codex or the draft pool: Clergy (tier 2, bishops cannot retreat toward your own side; extras.ts EXTRA_NERFS) and Hand and Brainless (tier 6, each turn a random piece type you must move if able; implemented.ts ALL_IMPLEMENTED). ALL_NERFS 358 to 360.
- Left the deliberately retired rules retired (RETIRED_NERFS: resolvable by id for old replays, out of the Codex by design): Foot Soldiers Only (verified exact mechanical duplicate of the live Serf Labor, identical move filter), Number of the Beast, and Hand and Gigabrain.
- Regenerated derived registries: cardIconMap.gen.ts (1355 to 1357 cards: the two new ids plus the deterministic open-address probe cascade through the generic File-icon cluster, curated tier 7+ overrides untouched) and passive compositions.ts (675 to 677: two new nerf tuples plus deterministic sentence-uniqueness disambiguation).

Verified: tsc clean, eslint clean (2 pre-existing warnings), test:rules, test:nerfs, test:passive-registry, test:desync, test:apex, test:snapshot all green; both new nerfs prerender their /codex/nerf/[id] pages and never soft-lock from the opening. PR #425. OPEN.

---

## 2026-07-20 03:20 ET (autonomous overhaul pass: bot-profile routing, draft preview, knight/bishop overlap, em-dash guard, rule accuracy, friends skeleton)

Delivered from a seven-subagent read-only investigation (bot routing, effect duplication, em-dash enumeration, skeleton coverage, mobile layout, sound coverage, rule text) plus hands-on integration. Every change verified with the existing harnesses; no worker.ts / DO change, so buildVersion is untouched.

Bot profile routing after rename (the "old link opens Account not found" bug):
- Root cause: a NEW username resolves fine (rename writes username_lower, the profile lookup is case-insensitive), but OLD names dead-ended forever. Player identity was denormalized only for display in two spots that no rename backfilled: the frozen game-archive names (games.white_name/black_name) and any previously shared /u/oldName URL, with no old-to-current redirect anywhere. Live, id-joined surfaces (leaderboard, Online Now, notifications, lobby/TV) already tracked renames correctly.
- Fix (single mechanism repairs history links, recent-games links, and old shared URLs at once): new username_history(old_username_lower to user_id) table (migrations/0037 + schema.ts, idempotent). Both rename paths now record the outgoing name in the same write (flagged-user rename in /api/auth/rename; House-bot editor in /api/mod/house/personas, folded into its atomic batch). Renaming back clears the prior redirect (no loops). The profile API (/api/users/[username]) resolves a missed lookup through username_history and returns the current username; the profile page forwards with router.replace. Usernames were already never the permanent id (games/ratings/leaderboard key on account id); this only repairs the denormalized display name.

Opponent draft preview (bottom of the draft overlay):
- Replaced the single-line text summary ("Opponent's draft: Name (T3)...") with a new compact, dungeon-styled OpponentDraftPanel: small tier-tinted cards with the card face icon, name, tier chip, category, and a tap-to-expand short description; face-down backs (tier numeral) for tier-only and hidden states. Deliberately smaller than your own cards so your choices stay the visual priority; wraps without horizontal overflow; tapping toggles detail only (never touches the draft). Information permissions are unchanged: it renders only what the caller already deemed visible (showCards / showTier / reveal / lastPick), so nothing hidden can leak.

Knight-to-bishop overlap (Tier 3 vs Tier 7):
- Confirmed the pair: wa_spectral_minors (Spectral Retinue, T3 buff-mode instant) and bw3_mummers_dance (Mummers' Dance, T7 nerf-mode activated) had byte-identical effect bodies (swap every knight to bishop and back). Resolved by differentiating the T7 boon rather than deleting either: Mummers' Dance now also shields the whole re-tasked minor corps from capture for the opponent's next turn, so the army-wide re-task cannot be punished mid-costume-change. That protective rider is what earns the higher tier; the bare swap alone is a T3 effect. Distinction documented in-code.

Em dashes (static guard for the standing "no em dashes in user-facing text" rule):
- New scripts/check-emdash.ts (npm run test:emdash): a TypeScript-AST scanner that flags em dashes only inside rendered nodes (string literals, template literals, JSX text; className and other non-rendered attributes excluded) and never inside comments or SVG path data. Confirmed the convention is honored essentially perfectly: of ~1600 em-dash occurrences in src, all but one were in code comments. Fixed the lone rendered case (a cardIcon dev console message). Wired as a first-class check.

Rule-description accuracy (displayed text vs implemented behavior):
- Fixed three nerf descriptions that misdescribed their own code (the accurate text existed only in dead library.ts stubs that the implemented cards shadow): Thunderdome now says a piece in the center 16 can never leave the zone (the code makes it impossible, not "rarely"); Quicksand now describes the correct cumulative "second landing on the same 4th/5th-rank square, ever" rule (not "twice in a row"); Ichthyophobe no longer claims "Stockfish" (the engine is a one-ply greedy heuristic).

Friends panel loading (skeleton + error separation):
- FriendsPanel rendered nothing while its first fetch was in flight and hung on a blank panel if that fetch 5xx'd or went offline. Added a themed roster skeleton (pulse rows matching the final layout, motion-reduce aware) for the loading state and a separate "Try again" retry for the failed-load state.

Investigation findings recorded for follow-up (not changed this pass, to avoid registry churn / risky content surgery): several same-tier nerf mirror pairs (oddball/even_keeled, remorseful/one_bite_at_a_time) and tier inversions (onward_only T7 weaker than forward_march T5) where every alternative mechanic collides with an existing nerf (punching_down, theocracy), so re-theming would trade one duplicate for another; the persistent passive-aura sound layer is intentionally silent (effect activations already voice through sounds.ts, and continuous ambient passives are undesirable); a handful of low-severity mobile polish items (rating-chart tooltip edge clamp, a couple of username truncations, one wrapping button row).

Verified: tsc --noEmit clean, eslint clean (2 pre-existing warnings, both unrelated in game/page.tsx), and test:rules, test:nerfs, test:passive-registry, test:animations, test:desync, test:apex, test:snapshot, test:emdash all green. Visual/audio changes want a preview-deploy eyeball (the build env cannot render them). PR OPEN.

---

## 2026-07-20 04:29 ET (sound for every effect, complete card registry, whole-library card review)

Exhaustive card + sound pass (PR #428). Delivered with a 59-agent workflow (one auditor per card-source file, every one of the 1366 cards) whose findings were each verified against the engine before any fix.

Sound coverage for every effect:
- Every card's persistent effect (a nerf reveal, a buff/boon/hex acquisition) already carried a sound family in its passive composition (compositions.ts soundCue) that nothing ever played. Wired end to end: nine procedural Web Audio family voices in sounds.ts (decree, strike, bind, territory, tempo, blessing, summon, fracture, veil), each short and distinct, subtler than the marquee attack voices, gated by the effects pref + mute via fx(), and volume-scaled (tone() does not self-apply the volume setting).
- playPassiveCue dispatches "passive/<family>" to its voice, rate-limited (max 4 cues per 0.5s, extras dropped never queued) so a burst of reveals on load/reconnect cannot stack into a wall, and it only reads the audio clock so it can never autoplay before a user gesture. PassiveSpawn fires the cue exactly once per activation (ref-guarded against the re-renders that recreate the visual), one shot on spawn, never a continuous ambient loop.
- Result: all 677 passive effects (360 nerfs + 317 passive buffs) are voiced; the other 689 buffs are instant/activated and already voice through the cast/signature system. scripts/check-sound-coverage.cjs (npm run test:sound) asserts every composition carries a cue and every family has a wired dispatcher voice.

Complete card registry:
- scripts/gen-card-registry.ts (npm run test:card-registry) generates docs/card-registry.json, one derived row per card (all 1366: id, name, kind, category, tier, mechanic, description, animation family/primitives, sound cue/source, target). Everything is read from ALL_NERFS + ALL_BUFFS + PASSIVE_COMPOSITIONS, so it cannot drift; 0 empty descriptions.

Card review fixes (each verified; several plausible soft-lock reports were confirmed FALSE POSITIVES and left untouched, protected by the nerf filter safety net at game.ts:1130 and timedOppFilter's built-in fallback: cowardly, slowpoke, wa_jinx; understudy is guarded by heldBuffs dropping spent):
- Five reactive freezes added during the OPPONENT's own move with turns:1 never held: the shared post-move tick (game.ts:1505) decrements an opp-owned effect on that same move, so turns:1 ticked to 0 and the effect silently did nothing. Bumped to turns:2 (one effective frozen turn, the +1 the correct cards already use): we_frost_ward, wc_banana_peel_trail, kraken, the pt claimed-square freeze, the wa void-rift freeze.
- we_quagmire stuck a piece 2 turns while promising 3 (same tick convention inside mireSquares, its one caller); added the +1 there. wc_quicksand_patch reworded from "cannot move" to "can only crawl one square at a time" (the effect is a walnut, which the engine lets shuffle one square).

Recorded for follow-up (verified real but not changed this pass): a handful of description-count / placement mismatches (bw2_early_coronation promotable-rank range, hyein blocker-skipping wording, hw3_jammed_castle "two turns" timing, reinforcements back-rank exclusion, seance return-square, promotion_phobia back-rank reachability, castle_curfew move-20 off-by-one). ww_counter_charge and wa_stone_pawns were reported but are CORRECT once the tick convention and walnut semantics are accounted for.

Verified: tsc --noEmit clean, eslint clean (2 pre-existing warnings), and test:rules, test:desync, test:snapshot, test:apex, test:passive-registry, test:sound, test:card-registry all green. Audio and visuals want a preview-deploy eyeball (the build env has no audio). PR #428. OPEN.

## 2026-07-23 03:11 EDT

Balance overhaul (owner doc "NerfChess Balance Overhaul", 2228 named card changes). PR #445. OPEN.

Rule content:
- Full-library balance pass across all four sections: 949 buffs, 527 hexes, 404 boons, 348 nerfs. 837 tier moves, 1372 mechanical tweaks, 12 replacements, 7 renames (ids never change).
- Recurring templates applied consistently: duration shortenings (minimum one; exactly-one-turn effects grant one defender exemption instead), delayed activations (effects begin after the opponent's reply), first-affected-piece escape moves, non-capturing special moves, lossy one-shot charges, reroll riders and reroll costs, small clock garnish (5 to 15 seconds) where a card names no target.
- Tier 9 is now a valid apex band for hexes (special: true, never in the normal curve): The Curse Engine, Peace of the Grave, Mirror of Winter. Regicide left the apex band for the normal tier-8 pool per its retier; apex offers stay pure tier 9/10.
- Openers may carry a balance tier (opener() honors meta.tier; the opener pool still keys off the opener flag alone).
- Codex: every touched card gains a dated balance-history event (src/data/balanceWave1.ts, generated from the owner directives) merged into each card page's timeline.

Engine fixes surfaced by the pass:
- grantInventory now bumps the mutation counter, so pocket grants from hidden passive hooks reveal to replicas and can never desync the crazyhouse inventory (found by the desync harness).
- Living Board's targeting chain terminates after the optional king-step pick.
- Guardian-family openers enforce protection via move filters (the shared shield effect expired the turn it was added); flagged for a wider shield-family fix.

Harness/docs: passive compositions regenerated (1333 entries), card registry + card audit + animation baseline regenerated, desync scenarios and sims (cold_snap, phantom_rook, chess_diff, balance-fixes, apex) updated to the new behaviors. Full battery green: typecheck, lint, rules, nerfs, lab 2083/2083, passive-registry, apex, desync, snapshot, fairness, sequence, purity, emdash, sound, animations, spectator/tv/replay/archive, glicko, build. Known pre-existing failure left alone: sim-capture-accounting's perfect_rewind scenario references a card that never shipped (fails on master too).
- Draft picker: the gold selection ring now follows the card's hover lift on desktop (it sat 3px low); the minimized panel's ring rides the card itself.
