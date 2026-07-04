# Hidden held buffs, lock-in timers, on-board targeting

Date: 2026-07-04. Branch claude/hidden-buffs-draft-ux. Supersedes the "held buffs are public" rule in [[2026-07-04-draft-online-protocol]].

## Visibility model

Held buff identities are now hidden like nerfs: each side only learns THAT the opponent drafted, banked, or used, plus the card's tier, never which card, unless picksVisible or a reveal effect applies. Everything reveals at game end through the end frame's draftBuffs (which already existed).

Because client replicas replay both players' moves through the engine, a card whose effect has shown on the table MUST carry its identity on the wire or every replica desyncs. The server therefore auto-reveals:

- instant cards at pick (their effect mutates the board on the spot),
- activated cards at use (dtUsed now carries `card: { id, tier }`),
- passive cards the first time one of their granted moves is played (moves are tagged `via: buffId`; the server sends a pre-move dtState naming the card before broadcasting the move),
- anything a use creates or moves between players (Mirror copies, stolen cards).

The revealed set is derived, never persisted: `GameServer.draftRebuild` is repopulated on every gameFromMatch replay, so reconnect payloads (publicDraftActions, draftStateFor) mask exactly the cards that have never shown. Masked entries are `{ hidden: true, tier, spent?, nullified? }`; the client stores them as inert placeholder BuffInstances with an empty id (every engine hook skips unknown ids).

Spectators get both sides masked while live regardless of picksVisible; the end frame reveals all.

## Lock-in timers

Every pick (opening nerf pick and each buff offer) has a 15s window (`draftLockInMs`). While any buff offer is pending the match clock is paused (`runningSince = null`); `dtDeadline` / `nerfDeadline` are stored on the match, surfaced in start/dtOffer payloads, and enforced by the DO alarm via `enforceDraftDeadlines`: overdue nerf picks take option 0, overdue offers take card 0, or bank when `nullifyIncoming > 0` (any pick would arrive dead). Bot games mirror the same rules client-side and shift `turnStartedAtRef` by the paused span.

## Targeting

Activated buffs target on the real board: `useBuffTargeting` (BuffDock.tsx) owns the pick chain, pages pass `targeting.target.squares` to the Board's new `pickSquares`/`onPickSquare` props, Escape or the TargetingBanner chip cancels. Only enemy-buff-list targets still use a modal (EnemyBuffModal); masked entries there render as "Hidden buff · tier".

## Known gaps

- Under picksVisible, seats see everything but spectators still get masked dtResolved frames (they reveal at end); held-buff spectator masking ignores picksVisible by design ("spectators see nothing private").
- The bot game reveals the bot's cards only when spent/nullified (or picksVisible); it does not mirror the instant/via-move auto-reveal rules exactly.
- games table still has no ruleset column (pre-existing).
