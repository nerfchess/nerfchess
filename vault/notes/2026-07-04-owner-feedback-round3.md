# Owner feedback round 3 (gameplay overhaul backlog)

Date: 2026-07-04. Source: owner messages after playing the deployed draft mode. Work split across agents; check PR list for progress.

## Draft economy rules

- Buff tier curve becomes 1, 2, 3, 5, 7 for drafts 1 to 5, with plus or minus 1 jitter, and BOTH players always receive the same rolled tier pair (if the opponent sees tier 3 and 4 options, you see tier 3 and 4 options).
- Banking gives plus 1 over the opponent on the NEXT draft only, never stacking, and only that one draft.
- Both players lock their pick within 15 seconds (nerf pick and every buff pick); the game clock pauses during picks. Show that the opponent has locked in (event only, not the card). After both lock, an animation slides the chosen card aside; the card stays visible somewhere on screen for its owner.

## Visibility overhaul (supersedes "held buffs are public")

- Held buffs are HIDDEN from the opponent by default, like nerfs. The opponent only sees that something was drafted or locked in, never which card.
- Reveal effects become their own buffs (Peek family stays one shot). Mirror should copy a RANDOM opponent buff rather than a chosen one, since choices are no longer visible.
- You cannot see the opponent's nerf options in the opening draft either.
- Spectator rules unchanged: nothing private, reveals at game end.

## Turn and safety rules

- Using an activated buff consumes your move, unless the card explicitly says otherwise.
- No buff may enable capturing the king before the opponent replies, INCLUDING summons and placements (extend chainKingGuard to cover post-activation moves and placed pieces). State it in card instructions where relevant.
- Pawns can never be placed or revived onto rank 1 or rank 8.
- One-time-use cards must be strictly unusable after use (audit spent handling).
- Remove the nerf fixation card from the pool. Clarify Time Skip's text: it activates instantly when picked.

## Multiplayer bugs

- Challenge accept race: owner accepted a friend's challenge, got "code did not work", and the friend ended up paired with a stranger. Direct challenges must reserve the seat for the addressed user only.
- Rematch sometimes lands both players as spectators. Seat tokens must carry into the rematch game.
- Abandonment: if the opponent is gone for 30 seconds, offer claim win or claim draw buttons.

## Time controls and sound

- Remove time controls under 30 seconds and ultrabullet entirely, or force them unrated.
- Random repeated sounds bug: game over sound replays randomly.
- Remove the spoken five four three countdown at game start; a quiet ten second countdown is enough.

## UI

- Left rail: both players' buff areas visible without scrolling, activation obvious.
- Activated buff targeting should use the real board (click your actual piece), not the popup mini board.
- Fun content welcome: e.g. a lightning strike card removing up to 3 minor pieces or pawns, with a small strike animation; add tasteful animations for dramatic effects.

## Status

- Buff library implementation salvaged as draft PR #105 (tiers 1 to 7 done, tier 8 and verification outstanding, interrupted by usage limit).
- snomuffin moderator role change still needs owner action (site Moderation page, or wrangler auth in session).
