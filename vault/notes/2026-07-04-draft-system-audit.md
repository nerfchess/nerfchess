# Draft-system spec audit (master @ dbf307c)

Date: 2026-07-04
Source: four parallel read-only audits of the repo against the owner's draft-system spec (Phases 1-4). File:line refs verified at commit dbf307c.

## Phase 1 balance fixes: ALL MISSING

1. Chain king-capture guard: MISSING. Extra-move/skip handling keeps the turn (src/engine/game.ts:383-394) but legalMoves never gates king capture during chains; checkLossConditions ends the game on king capture instantly (game.ts:315-317).
2. Freeze plus tempo prevention: MISSING. No panic step, no mutual exclusion. Kings unfreezable (buffs/helpers.ts:411,428) and force-pass exists (game.ts:413-434) but freeze cards plus Onslaught/Blitzkrieg still combine.
3. One-shot reveals: MISSING. peek/quick_glance/draft_insight set seeOppCards/seeOppTier (buffs/library.ts:316,443,669-672) and nothing ever clears them; rollOffer consumes other flags but not these (draft.ts:47-54).
4. Draft unrated: MISSING. Rating gate is only the rated URL param (app/game/page.tsx:452-462), independent toggles on play page (play/page.tsx:121-128). No draft rating category in DB (only speed buckets, user_ratings.category).
5. Total Nullify rework: MISSING. nullifyAll (buffs/helpers.ts:523-529) marks all unspent buffs nullified including pieceBound God Knight; same for grand/absolute/chain_nullify and total_plunder. Sever (targeted) works.

Also: DEFAULT_CADENCE=6 exists (draft.ts:21) but lacks the 5/6/7 tuning comment. Bot draft (game.ts:542-559) never banks, defensive buffs not danger-gated, Purge/Annihilate target types exclude queens.

## Phase 2: mostly done

DONE: board effect painting (Board.tsx:678-741, zones from game/page.tsx:761-778), MobileBuffDrawer bottom sheet, blocking DraftOverlay, draft persistence in bot games (gamePersistence.ts), buff dock Use button + mini-board TargetModal.
GAPS: no hidden/visible opponent-picks setting anywhere; BuffDock.tsx:93-112 always shows opponent buffs (leak vs "hidden default"); DraftOverlay lacks max-h/overflow on short phones; global effects (king_only, no_pawn_advance, king_safe, nerf_suspended) have no board indicator.

## Phase 3: infra done, draft protocol absent

DONE: reconnect (worker.ts:823-856, 15s grace, no auto-resign), spectate (watchMatch worker.ts:1366-1397, nerfs hidden until result at :1393), lobby snapshot, TV page, rematch, challenges, quick pairing (10 pools).
MISSING: zero draft frames in worker.ts ClientFrame (:85-106); OnlineMatch/multiplayer.ts have no draft awareness. Draft is bot-only client-side. Integration points: worker.ts dispatch :281-326, StoredMatch :30-61, startPayload :605-633 (per-color filtering lives here), watchMatch :1366-1397.
PARTIAL: search panel is right-anchored player search only (SiteHeader.tsx:248-260); pairing is FCFS not rating-banded; no ruleset/rated filters on lobby lists. House bots retired (migration 0008).

## Phase 4: partial

DONE: leaderboard per speed category, profiles /u/[username] and /profile, W/L/D global + per speed, PlayerStatsPanel (streaks, best wins, by-speed win rate), TV/HeroTv/live browser, public game links, clubs/tournaments shells, moderation, DMs, notifications.
PARTIAL: RatingChart (only graph, hand-rolled SVG) mixes all speed categories in one line, only on /u pages; PGN export only in GameOver + analysis, not the /game/[id] replay page.
MISSING: games table has no ruleset column (Classic vs Draft analytics impossible); recent-performance graph, daily W/L/D, session W/L/D; session tracking anywhere; per-player favorite nerfs (computable from games nerf ids); head-to-head; per-player avg game length; buff pick/win rates (needs draft persistence, blocked on online draft); community hub page; global recent games / top games feeds; follow/friends.

## Key files

Engine: src/engine/draft.ts (rollTier/rollOffer/bankOffer/DEFAULT_CADENCE), src/engine/game.ts (playMove, legalMoves, pickDraftCard/bankDraft, aiResolveDraft/aiActivateBuffs), src/engine/buff.ts (types), src/engine/buffs/library.ts (263 cards), src/engine/buffs/helpers.ts (mechanics).
Server: worker.ts (GameServer DO), src/lib/server/{schema,games,auth}.ts, migrations/.
Client: src/app/game/page.tsx (bot+draft match), src/components/{OnlineMatch,BuffDock,DraftOverlay,MobileBuffDrawer,Board}.tsx, src/lib/{multiplayer,gamePersistence,playerStats}.ts.

Related: [[2026-07-04-lichess-feature-plan]]
