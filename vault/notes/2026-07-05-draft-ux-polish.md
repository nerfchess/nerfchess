# Draft UX polish (owner punch list, 2026-07-05)

Five in-game UX fixes from the owner's punch list, all client-side except one
small protocol addition.

## 1. Waiting overlay is translucent now

The "waiting for opponent's pick" screen (OnlineMatch) dropped the heavy
`bg-black/70 backdrop-blur` for `bg-black/30` with no blur, so the board shows
through. The panel shrank to a compact centered card that shows the opponent's
draft status (still choosing / banked / locked in) and the `LockInCountdown`
against the shared draft deadline. The backdrop is pointer-transparent; only
the card itself catches clicks.

## 2. Softer draft-offer chime

`playNotify()` (the lichess GenericNotify dong) is no longer used for draft
offers. New `playDraftChime()` in `src/lib/sounds.ts`: a synthesized shimmer,
four high partials (G6-B6-E7-G7) staggered a few tens of ms apart, each doubled
with a +-7 cent detune so the beating glistens, fast attack, ~1.1s decay.
Dependency-free (pure WebAudio, no sample file), honors mute/volume/master
sound prefs. The challenge sound (SocialNotify) is untouched, and `playNotify`
stays for anything else that wants the dong.

## 3. "Usable" tag on activatable cards

BuffDock rows get a small verdigris "Usable" pill when the card is actually
activatable right now (kind activated, not spent/nullified, and `canAct`, the
same gate as the enabled Use button). The mobile drawer reuses BuffDock, so it
inherits the tag.

## 4. Take-both indicator

When `flags.takeBoth > 0`:

- BuffDock shows a gold banner "Next draft: you take BOTH cards" above the
  held-card list (desktop dock and mobile drawer, online and bot games).
- The draft overlay shows a prominent gold chip "You take BOTH cards this
  draft" under the heading; the minimized side panel renders its take-both
  line in gold instead of body text.

## 5. Opponent left on the end screen

- GameOver gets `opponentLeft` (wired to OnlineMatch's `opponentGone`, which
  the server's `opponentGone` frame sets even after game end) and shows an
  "Opponent left the game" status line.
- If a rematch offer is pending when the opponent leaves, the disabled
  "Rematch offered..." button becomes an enabled "Cancel rematch offer".
- Protocol addition (trivial): client frame `rematchCancel`, server frame
  `rematchCancelled { color }`. The worker clears `rematchOfferBy` (only the
  offerer can cancel, only before a rematch game exists) and broadcasts; both
  clients reset `rematchStatus` to none.
- A rematch offer arriving FROM the opponent now clears `opponentGone`
  (proof of life).

Also: the opponent-resolved badge in DraftOverlay now says "Opponent banked"
vs "Opponent locked in" (new `oppBanked` prop, fed by the `draft-resolved`
frame's kind).

Files: src/components/OnlineMatch.tsx, DraftOverlay.tsx, BuffDock.tsx,
GameOver.tsx, src/lib/sounds.ts, src/lib/multiplayer.ts, worker.ts.
