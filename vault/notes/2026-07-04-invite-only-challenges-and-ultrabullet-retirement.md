# Invite-only challenges, abandonment claims, UltraBullet retirement

Decisions from the multiplayer bug pass (branch claude/mp-bugs-sounds-timecontrols):

- Direct challenges now reserve the Black seat server-side. `create` accepts an
  optional `invite` username (signed-in hosts only); the match stores
  `invitedUsername`, is excluded from the lobby's open-challenge list, and
  `join` rejects anyone else with `invite_only`. Root cause of the pairing race:
  challenge games were listed as open challenges anyone could join.
- `join` now rejects codes whose host has no connected socket (`host_gone`)
  instead of starting a game against an empty seat.
- Rematch seats are re-delivered: on `reconnect` to a match with `rematchedTo`,
  the server re-sends the `rematched` frame for that seat. /game/[id] also
  handles `rematched` at page level (the frame can arrive before OnlineMatch
  subscribes). Root cause of the spectator bug: the frame was fire-and-forget.
- Abandonment claims: `claimWin` / `claimDraw` frames, valid 30s+ after the
  opponent disconnected (server constant `abandonmentClaimMs`), end the match
  with reason "abandonment". Client shows the buttons 15s after `opponentGone`
  (which itself arrives after the 15s disconnect grace).
- Game-over chime is guarded by a module-level played-once set keyed by
  gameId (or startedAt for bot games) because GameOver remounts on
  dismiss/reopen and on reconnect end-frame replays.
- First-move grace countdown is visual only now: one soft tick at 1s, no
  per-second beep series.
- UltraBullet retired the least invasive way: queue pool "15s+0" removed
  (worker, standalone server, QueueButton), friend/play sliders start at 30s
  (0 = unlimited still allowed), and tab surfaces use ACTIVE_RATING_CATEGORIES.
  The category itself stays in RATING_CATEGORIES / SpeedCategory because
  removing it would break historical rating rows, perSpeed stats aggregation
  (computePlayerStats indexes by categoryForTimeControl of old 15s games), and
  localStorage rating buckets.
