# Steal transfers, Resurrect pool, Warp Sovereign UX (2026-07-05)

Overnight punch list items 3, 5, and 7. All three reproduced with engine
scripts before fixing (crafted moves through playMove, buffs granted via
acquireBuff), then re-run to prove the fixes.

## Item 3: buff steals acted like removals

Root cause: stealBuffs splices the BuffInstance from the victim's list into
the thief's, but a locked-in piece-bound upgrade (Colossus, God Knight,
Living God, Anchor, the pieceBound family, placed Void Realm squares) carries
owner-relative baggage the splice does not move:

- board-level ActiveEffects the activation added (shield entries keyed by the
  victim's color) stayed with the victim, so the victim kept the
  uncapturability while losing the card;
- instance hooks run with the new owner's api (me and opp flipped), and the
  bound square now holds an enemy piece, so augmentMoves and
  filterOpponentMoves refuse to fire: the thief gained a dead card.

Net effect: stealing a bound Colossus was a weird half-nullify, exactly what
the owner reported.

Chosen rule: locked-in upgrades stay with their owner and cannot be stolen
or copied. "Locked in" is the existing onlinePermanent predicate that broad
nullify and Total Plunder already use (an activated spendOnUse:false card
whose binding state is set, or a permanent passive engine). Changes:

- stealBuffs gained a canSteal predicate; Buff Thief (Minor), Buff Thief,
  Buff Siphon, and Buff Plunder pass notLockedIn (= !onlinePermanent).
- Mirror's random copy pool excludes locked-in upgrades too (a copy would
  arrive bound to an enemy square).
- Card texts updated: "Locked-in upgrades stay put." / "Locked-in upgrades
  cannot be copied." Total Plunder already said it.

Not-yet-activated bound cards remain stealable and work fully for the thief,
who binds them to their own piece on activation (verified: stolen unbound
Colossus rebound by the thief grants both the queen movement and a shield
owned by the thief).

## Item 5: Resurrect bugged

Two real defects found:

1. Pieces destroyed by buffs (removeEnemies, explosions, meteors, sweeps,
   void squares, Extinction and friends) never entered the revivable pool.
   api.removePiece cleared the square without touching game.captured, so
   after a board-wipe card the victim's Resurrect had zero valid targets, a
   dead card at the moment it matters most. Fix: removePiece now counts the
   removed piece as captured by the other side, which also keeps material
   counters truthful. Side effects reviewed: the Duelist card already
   decrements capturedFromMe when it returns its piece, so no double count;
   a self-sacrificed piece (Detonate) becomes revivable by its owner, which
   we consider correct (the piece is genuinely gone). Replays stay
   deterministic because the same activateBuff runs on every replica.

2. Grand Resurrection revived the queen plus BOTH minors (spec listed
   ["q","n","b"] and autoRevive walked every entry) while the text promises
   "your queen and one minor piece". Full Resurrection had the same drift.
   autoRevive now takes alternative lists per slot: Grand is
   ["q", ["n","b"]], Full is ["q", "r", "r", ["n","b"]] (first revivable
   type in the list wins).

Also aligned the tier 3 Resurrect text with its actual behavior: the engine
tracks captured counts, not capture order, and revives the strongest type
first, so the text now reads "Bring back your strongest captured piece".
Basic revive accounting (capturedFromMe minus mine.revived) was verified
correct, no swapped pools.

## Item 7: Warp Sovereign UX

The card demanded exactly six sequential picks (three pairs) with no way to
stop early. Chosen mechanism: a `finishable` flag on square BuffTargets.
Every completed pair is a full effect on its own, so from the second pair
onward the first pick of each pair is finishable:

- swapOwnPieces marks the step; the effect already applies whole pairs from
  whatever picks arrive.
- useBuffTargeting gained finish(); TargetingBanner shows a Done button next
  to Cancel on finishable steps (both bot games and online).
- The worker's buffPicksComplete accepts an early stop when the next target
  is finishable, so the server validates partial chains.
- Card text: "Swap up to three pairs of your pieces, once. Stop after any
  pair."

relocateMany (Warp Field, Total Warp) got the same finishable treatment:
after the first completed piece move the player may stop. This also makes
Total Warp actually usable online: its full chain is 30 picks and the
server's pick cap was 8, so the card could never complete. The cap is now 32.

## Repro (before -> after)

- Steal bound Colossus: victim kept shield, thief got dead card -> bound
  Colossus no longer offered by Siphon; unbound steal still works fully.
- Meteor wipes white's queenside, Resurrect had 0 targets -> pieces join the
  pool, Resurrect offers 22 squares.
- grand_resurrection revived 3 pieces -> 2 (queen + one minor);
  full_resurrection revives 4 (q, r, r, one minor).
- Warp Sovereign after one pair: next target finishable:false and no way to
  stop -> finishable:true, activation with 2 picks swaps the pair and spends
  the card.
