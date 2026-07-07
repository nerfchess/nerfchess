# NerfChess: where it stands and what to do next

Written after walking the live site (nerfchess.com) and the codebase.

## Honest assessment first

NerfChess is **not** an early prototype. It is a polished, feature-complete
product: two full modes (Nerf/Buff), a 700+ card library with a searchable
codex, a lobby + matchmaking, TV with Nerf/Buff filters, tournaments, clubs, a
community feed, inbox/messaging, leaderboards, per-mode ratings, game history +
replays, an analysis board, profiles/flairs, a tutorial, house bots that keep
the queue warm, and mobile drawers. The visual design is cohesive and
lichess-caliber.

So the useful question is **not** "what feature is missing" (very little is).
It is: **what will actually make people stay and bring friends.** Two things are
visibly true from the live site:

1. The core loop and content are done and look great.
2. Liquidity is the real problem: the lobby showed "2 players online." House
   bots paper over it, but the growth lever is **retention + acquisition**, not
   more features.

Below, priorities are ordered by impact-per-effort for a small team.

---

## Priority 0 - Stability and correctness (jank quietly kills competitive games)

1. **Nerf desyncs (the open bug).** In a competitive game, a board that
   disagrees between the two players is the single biggest trust-killer. It is
   currently unreproducible from code inspection (no `Math.random`/`Date` in the
   rule logic; RNG seeds match). Ship **desync telemetry**: each client
   periodically hashes its board + legal-move set; if the hash diverges from the
   server's, log the two nerf ids, the ply, and the last move. Real traffic will
   name the culprit nerf(s) within a day, and then it is a targeted fix instead
   of a hunt.
2. **Server stability under load.** The single global Durable Object has a crash
   history under bot churn (full-table scans blowing the CPU limit). Confirm the
   bounded-GC fix is merged and deployed, and that `/healthz` stays green under
   the 50-bot roster at peak. A server that falls over at your busiest moment
   undoes every growth effort.
3. **Land the in-flight fixes.** This session opened: turn-cost labels (merged),
   count-target soft-lock (#197), walnut lifetime+visual (#199), banana peel
   visibility (#201), funny cards (#202), opponent-plays log (#203), nerf-pick
   deadline grace (#204). Merge them in stack order, deploy, and do one
   preview-deploy eyeball pass on the visuals (the build env can't render them).
4. **Close the marquee-card bugs.** Buff Siphon/steal transferring only part of
   an effect, and the Resurrect bug, are correctness bugs on headline cards -
   the cards people screenshot. Fix before marketing.

## Priority 0.5 - Instrumentation (do this basically first; it de-risks everything else)

Without it, the rest of this roadmap is guesswork. Add basic product analytics:

- Funnel: land -> sign up -> first game finished -> second game -> D1 / D7
  return.
- Per-mode split (Nerf vs Buff), and where people drop off.
- Per-card **pick rate and win rate** (this doubles as your balance dataset).

You already log games; surface these as a private dashboard. Then you optimize
with data instead of vibes.

## Priority 1 - Retention: convert first-timers into regulars

1. **Make the first session teach itself.** A tutorial route exists - make sure
   it is a genuine *guided first game* (forced moves that demonstrate a nerf and
   a buff draft in ~3 minutes), not just text. Comprehension of a novel ruleset
   in session 1 is the biggest retention driver here.
2. **Puzzles + a daily puzzle.** This is the retention engine of every chess
   site, and you don't have it yet. "Win this position under <nerf>" or "find the
   buff play." A daily puzzle gives people a reason to return **even when no
   opponent is online** - it sidesteps the liquidity problem entirely, and it is
   extremely on-brand for a rules-twist game.
3. **Lean into the post-game payoff.** You already reveal secret nerfs at game
   end - make that moment shareable and sticky: a game-summary card ("I won
   under Shadow Queen"), one-click rematch, and "analyze with the nerf shown."
4. **A single-player ladder vs the named bots.** You have 50 personas already;
   let a solo player challenge them by name/skill as a progression ("beat the
   roster"). Always-available, satisfying play when humans are scarce.

## Priority 2 - Growth and virality

1. **Shareable replays + auto-generated image/GIF** of a game's key moment. Your
   effects are visually distinctive (walnut, lightning, banana peel) - that is
   free shareability. A "share" button that mints an OG-rich link.
2. **OG images + SEO.** Every game/codex/tournament URL should render a rich
   preview card so links on Discord/X look good, and the codex/rules should be
   crawlable (a novel game is searchable - own those queries).
3. **Discord + a live-game embed.** Niche chess variants live on Discord;
   a "there's a game live" hook drives return visits.
4. **Friend hooks with a twist:** "first to beat me under a random nerf" as a
   challenge link - the novelty is the viral wrapper.

## Priority 3 - Mobile (likely half the audience)

1. **A real device QA pass** on iOS Safari + Android Chrome: board, draft
   overlay, buff dock/drawer, and the effect animations at common sizes.
2. **Installable PWA:** add-to-home-screen, an offline shell, and push
   notifications for "your move" / "a game is available." Cheap, large retention
   win for casual mobile players.

## Priority 4 - Content, balance, polish

1. **Data-driven balance pass** using the pick/win-rate data from Priority 0.5
   plus the turn-cost audit already run (the debatable `pieceBound` items).
2. **Extend the effect juice.** Walnut and banana peel now animate; give the
   other marquee hexes/buffs the same small, consistent animation vocabulary.
   It makes the game feel alive and is your best organic-share asset.
3. **Finish the small backlog UX items:** softer lobby red, wider drafted-rules
   box, smaller spectator move list, a buff "shimmer" sound, a take-both
   indicator, the Warp Sovereign flow, and an "opponent left the end screen"
   indicator so a stale rematch offer can be cancelled.

---

## The one-line take

The product is built and looks great. The next win is **not** another feature -
it is: (1) kill the desync/stability gremlins so competitive players trust it,
(2) add an onboarding + puzzles loop so people stick without needing a live
opponent, and (3) instrument the funnel so you optimize with data. Everything
else is polish on an already-strong base.
