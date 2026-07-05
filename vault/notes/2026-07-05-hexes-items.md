# Hexes and items: nerf mode's draft flips outward

Owner request (2026-07-05): nerf mode's every-6-moves draft should hand you
a card to nerf your OPPONENT (the walnut queen), not just self-relief; add
fun inventory items to both modes; and cap opening drawbacks below tier
three for now.

## What changed

Nerf mode's draft pool flips from all-boons to hex-majority. Each card slot
now rolls a bucket first: 60% of draws prefer the hex bucket (curses cast on
the opponent, drawback intensifiers included), 40% prefer the boon/item
bucket (self-relief plus consumables). When the preferred bucket has no card
at the rolled tier the slot falls back to the whole nerf-mode pool, so a
draft never blocks. The bucket roll runs through the existing rollOffer RNG
stream (one extra `rng.next()` per card), so offers stay deterministic per
seed. Mechanism: `HEX_SHARE` in `src/engine/draft.ts`; mode filter in
`rollOffer` (`inMode`). Measured share over 6000 simulated draws: 57.5%
hexes, 20.4% nerf-relief boons, 6.2% items, the rest boon-flagged generals.

Buff mode additionally draws items but never hexes or nerf-relief cards
(verified: 0 in 6000 draws).

## New hex cards (category "hex", nerf mode only)

| Tier | Card | Effect |
|------|------|--------|
| 1 | Heavy Boots | Enemy pawns cannot double-step for their next 4 turns |
| 1 | Toll Gate | Opponent cannot capture en passant for their next 6 turns |
| 2 | Cold Snap | Freeze one enemy piece (not the king) for 2 of their turns |
| 2 | Butter Bishops | Enemy bishops slide at most 2 squares for their next 4 turns |
| 3 | Lame Horses | Enemy knights cannot capture for their next 4 turns |
| 3 | Twist the Knife | Intensifier: their next 3 captures freeze the capturing piece for 1 turn |
| 4 | Flypaper File | Pick a file: for 4 turns, enemy pieces entering it are stuck 2 turns |
| 4 | Dead Letter | Opponent's next draft is skipped |
| 5 | Walnut Queen | Their queen is a walnut (cannot move) for 3 of their turns |
| 5 | Ball and Chain | Intensifier: for their next 5 turns, their just-moved piece must rest a turn |
| 5 | Royal Summons | For their next 2 turns they must move their king if it can move |
| 6 | Creeping Frost | Freeze two enemy pieces (not the king) for 2 of their turns |
| 7 | Walnut Court | Every enemy rook is a walnut for 2 of their turns |
| 8 | Grand Malediction | Opponent skips their next turn and their next draft |

Walnuts are a new `ActiveEffect` kind ("walnut"): mechanically a freeze
(shares legalMoves' frozen-square path, ticks on the owner's turns, kings
never affected) with its own board marker (amber tint + a nut emoji via the
new `walnutSquares` Board visual, fed by `draftZones`). Walnut Shell (item)
cracks one off your own piece.

Safety rails kept: kings are never frozen or walnut-ed, Royal Summons and
Ball and Chain keep a fallback move (or lean on the forced-pass rule), all
activated hexes set chainKingGuard through the normal activateBuff path.

## New item cards (category "item", BOTH modes)

| Tier | Card | Effect |
|------|------|--------|
| 1 | Walnut Shell | Free one of your pieces from any freeze or walnut |
| 2 | Apple | Feed a piece: uncapturable for 2 turns while it digests |
| 2 | Banana Peel | Trap an empty square: first enemy piece entering slips one square back toward home |
| 3 | Trampoline | Bounce one of your pieces to an empty square within 2 |
| 3 | Magnet | Drag one enemy piece (not the king) one square toward your king |
| 4 | Firecracker | Startle an enemy piece one square back toward its home rank |
| 4 | Coffee | Take a second move this turn (free action) |

## Opening drawback cap (temporary)

`MAX_OPENING_NERF_TIER = 2` in `src/engine/nerfs/library.ts`; every roll
site funnels through `openingNerfPool()` (25 nerfs at tiers 1-2): the
worker's `dealNerfDraftOptions` and `pickNerfPair` (online), the bot page's
`dealNerfOptions` / `pickRandomNerf`, and OnlineMatch's fallback pick. Raise
or delete the one constant to reopen the ladder.

## Bots and UI

- `aiDraftChoice` scores hexes like other cards (passives/instants 100,
  activated 80); `aiCollectPicks` auto-targets them (verified: the bot
  fires Cold Snap on an exposed queen and does not re-activate an online
  Flypaper File; reusable hexes store their anchor in `state.sq` so the
  existing online-permanent guard applies).
- `draftCardNoun("nerf")` is now "hex"; DraftOverlay says "Choose a hex or
  a boon" with a one-line explainer, dock labels read "Hexes & boons",
  FAQ/tutorial/about copy updated.
- REPLAY_VERSION bumped 2 -> 3 (the bucket roll consumes an extra RNG draw
  per card, so stored replays desync by construction).

## Verification

`npx -y tsx scripts/sim-hexes-items.ts`: all 30 checks pass (composition
band 50-70%, buff-mode leak zero, Walnut Queen 3-turn lifecycle, Apple in
both modes, Banana Peel slip, bot targeting, tier cap over 500 deals, no
duplicate card ids; the dup check exists because the first draft of
Creeping Frost collided with the tier-7 buff "deep_freeze").
