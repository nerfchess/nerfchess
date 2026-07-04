# Lichess-inspired feature plan (Phase 4: stats and community)

Date: 2026-07-04
Source: research pass over github.com/lichess-org, lila, and lichess.org, per draft-system spec. Product inspiration only, no code copying. Puzzles are excluded by requirement.

## What to copy conceptually

- Live counters in the header ("X players, Y games in play") as a small "X online, Y games live" badge fed from existing Durable Object presence.
- Lichess TV: auto-featured top-rated live game as "NerfChess TV" with a mini board on the lobby, clicking through to the existing spectate view.
- Watch page channels as tabs in the live game browser: Top Rated, Classic, Draft, Bots.
- Profile rating boxes per mode: Classic rating card with games played and leaderboard rank; Draft shows games played only until a separate Draft rating exists.
- Rating graph on profile: store a rating snapshot per rated game, render a simple line chart.
- W/L/D record aggregated per mode in D1, shown on profile and in head-to-head on game pages.
- Activity feed grouped by day ("Played 12 games, rating +15"), derived from the games table, no separate event store.
- Performance stats: highest rating with date, streaks, time played, session tracking (games per sitting, longest session) computed from game timestamps.
- Players page as leaderboard hub: one Community page with top 10 Classic, most active this week, online players.
- Header player search with autocomplete and online indicator linking to profiles.
- Rating distribution chart with percentile marker, once population allows.

## What to avoid

- Chess Insights style answer engine (metrics x dimensions x filters): months of work for one dev, low payoff at small scale.
- Puzzles: hard requirement, excluded, including puzzle boxes on profiles.
- Manual seek/hook list in the lobby: looks empty and dead with a small pool; quick pairing plus challenges already covers it.
- Streamers/coaches programs, forums, studies, broadcasts: need audience and moderation capacity that does not exist yet.
- Separate rating pools per time control: fragments a small population; keep one Classic rating.

## What fits now (one PR each, highest value first)

1. W/L/D aggregates per mode on profile (D1 query plus UI card).
2. Rating history snapshots plus profile rating graph.
3. Community page: top 10 leaderboard, most active this week, online players.
4. NerfChess TV featured game on the lobby.
5. Daily-grouped activity feed on profiles.
6. Session and playing-time stats (time played, longest session, win streak) on the stats page.
7. Navbar player search with autocomplete and online dot.
8. Live counters badge in the header.

## What should wait

- Rating distribution histogram with percentile (needs a few hundred rated players).
- Draft ratings, Draft leaderboard, Draft TV channel (blocked on rated PvP Draft).
- Deep performance page (best wins by opponent rating, longest losing streaks) after W/L/D ships.
- Insights-lite (win rate by nerf rule or buff card) as a single fixed chart, not a query engine.
- Mobile-specific layout pass once the above pages exist to reflow.
