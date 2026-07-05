# Draft confirm, in-pill grace timer, notification sounds

Date: 2026-07-05

## Pick confirmation and waiting screen

Every draft pick is now two-step, purely client-side (no protocol changes):
the first click selects a card (gold ring, others dim), then a Confirm button
or a second click on the same card commits it.

- Buff drafts: `DraftOverlay` owns the selection state. At the 15s lock-in
  deadline an unconfirmed selection is submitted as the pick; with nothing
  selected the old behavior stands (bot games run the parent's card-0/bank
  auto-resolve via `onExpire`, online games let the server resolve).
  `LockInCountdown` now calls `onExpire` through a ref so the deadline
  handler sees the live selection instead of a stale closure.
- Opening nerf pick: same flow in `OnlineMatch` (online) and `game/page.tsx`
  (bot). Online, an unconfirmed selection is sent at the deadline; the server
  still auto-picks option 0 when nothing was selected.
- After my buff pick resolves while the opponent's simultaneous draft is
  still open, a full-screen "Waiting for opponent's pick" overlay holds until
  their dtResolved arrives. It replaces the old top-bar "opponent is choosing
  a buff" banner. Bot games resolve instantly, so the overlay is online-only
  in practice.

## First-move grace timer

The "Free time - Xs until your clock starts" popups are gone, along with the
250ms `graceSecondsLeft` interval in `OnlineMatch`. `ClockPill` now renders a
tiny gold mono "+10 ... +1" countdown next to the main time, derived from the
`startDelayMs` it already receives; it disappears when the grace window ends.
The pill owns its own ticking, so the match surface no longer re-renders four
times a second during the window.

## Sounds

- Vendored `SocialNotify.mp3` from lichess (lichess-org/lila,
  `public/sound/standard/`; `NewChallenge.mp3` there is a symlink to it).
  AGPL v3, same as the rest of `public/sound/lichess/` (see its README).
- `playNotify()` (GenericNotify, already vendored) fires when a buff draft
  offer appears (`DraftOverlay` mount / offer index change), bot and online.
- `playChallenge()` (SocialNotify) fires in `SiteHeader` when the 30s
  challenge poll detects a challenge ID it has not seen before. The first
  poll only seeds the known set, so a pending challenge never dings on page
  load or navigation.
