# Count-based cards resolve with fewer targets than their nominal count

## Bug

Cards that collect N targets ("teleport N of your pieces", "three of your pieces
become amazons", "remove three enemy pawns", "freeze two enemy pieces"...) soft-
locked when the board held fewer than N eligible targets. The player picked the
few that existed, then landed on a step offering zero candidates that was neither
completable nor skippable, so the card could only be cancelled and did nothing.

Confirmed with a repro: `titan_legion` ("Three of your pieces become
uncapturable amazons") with only two eligible non-king pieces stalls after two
picks.

## Root cause

The affected collectors terminate their pick loop only on `picks.length >= N`:

```ts
targets: (_inst, api, picks) =>
  picks.length >= 3
    ? null
    : { kind: "square", label: `Choose a titan (${picks.length + 1}/3)`,
        squares: bindCandidates()(api).filter((sq) => !picks.some((k) => k.square === sq)) },
```

When candidates run out before reaching N, the collector keeps returning a step
with an empty `squares` list (it never returns `null` until N picks), and the UI
has no way to advance or finish. `relocateMany` and a few others already guard
this (`if (!squares.length && picks.length > 0) return null`), but most flat
count collectors do not, and the same shape recurs across ~15 cards and the
`removeEnemies` / `placePieces` / `voidSquares` factories.

## Fix

One central guard in `buffNextTarget` (`src/engine/game.ts`), the single choke
point every target step flows through. Once at least one target is picked, a
non-finishable step with no remaining candidates ends collection, so the effect
resolves with the picks gathered so far:

```ts
const target = def.targets(inst, makeBuffApi(game, color), picks);
if (target && picks.length > 0) {
  if (target.kind === "square" && target.squares.length === 0 && !target.finishable) return null;
  if (target.kind === "enemy-buff" && target.options.length === 0) return null;
}
return target;
```

This is safe for every collector in the library:

- Flat count collectors (Titan Legion, remove/freeze/promote/advance N, the
  `removeEnemies` / `placePieces` / `voidSquares` factories) resolve with the
  available targets. Their effects already iterate over `picks`, so they simply
  apply to as many as existed.
- Structured collectors are unaffected: `relocateMany`, `stealBuffs`, Blink
  Army, and `lineSweep` already self-guard and return `null` first; Warp
  Sovereign ignores a dangling unpaired pick (`for (i; i + 1 < picks.length;`)
  and marks pair boundaries finishable; Trampoline's effect no-ops when it has
  no destination pick.
- The first step (`picks.length === 0`, a genuinely unusable card such as a
  freeze with no enemies on the board) keeps its existing behavior.

Defense in depth: because the guard is central, no future count card can
reintroduce this soft-lock.

## Test

`scripts/test-hexes.cjs` (the `npm run test:rules` gate) now drives every
implemented activated card on two deliberately sparse boards (one-of-each-type,
and two-non-kings-total for the "three pieces but I have two" case) and fails if
any card strands the player on an empty non-finishable step or fails to
terminate. Verified to fail without the fix (7 cards soft-lock) and pass with it
(149 activated cards clean).

## Files changed

- `src/engine/game.ts` - the central `buffNextTarget` guard.
- `scripts/test-hexes.cjs` - the count-target termination regression test.
