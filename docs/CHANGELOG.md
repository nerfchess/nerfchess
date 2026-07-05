# NerfChess changelog

Canonical, version-controlled changelog. This file is the single source of truth
(the Google Drive copy, if any, is just a mirror). It is a timestamped, append
only log: the NEWEST entries are at the BOTTOM, so each update adds a new
`## <timestamp ET>` block and you keep reading down the file. Timestamps are US
Eastern (ET). Keep the append-only discipline; do not rewrite old blocks.

See CLAUDE.md for the process (when and how to update this).

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
