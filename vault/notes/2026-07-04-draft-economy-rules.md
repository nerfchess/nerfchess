# Draft economy rules (owner-requested)

Decisions shipped in the `claude/draft-economy-rules` branch:

- **Shared tier pairs**: each draft round rolls one tier pair for both
  players (base curve 1, 2, 3, 5, 7 across rounds 1-5, then 7; one shared
  ±1 jitter per round; slip gate above 6 unchanged). `rollSharedTiers` in
  `src/engine/draft.ts`, rolled once in playMove's cadence block.
- **Banking**: exactly +1 over the shared pair, one round, never stacks.
- **Buff use costs the turn**: `activateBuff` passes the turn (same
  handover bookkeeping as playMove) unless the card has `freeAction: true`.
  Free actions: the extra-move family (extra_move, time_stop_short,
  overwhelm, onslaught, blitzkrieg) via `extraMovesNow`.
- **King safety**: every activation sets `chainKingGuard` to the activator,
  so no buff can enable a king capture before the opponent replies. Pawns
  can never be placed or revived on rank 1 or 8 (placePieces, reviveOne,
  autoRevive, phoenix_rebirth, rampart all filter).
- **Mirror** now copies one random unspent opponent buff (api.rng, no
  target choice) because opponent buffs are becoming hidden.
- **Fixation nerf removed** from the nerf library. Old saved games that
  reference the id `fixation` will no longer rebuild.
- Worker draft matches track the real side to move in `StoredMatch.turnColor`
  because activations and tempo cards move the turn off move parity; clocks
  and flag checks read it through `activeColor`.
- Bot games now deal the opening nerf draft with the worker's anchor/partner
  matched-tier scheme (`dealNerfOptions` in `src/app/game/page.tsx` mirrors
  `dealNerfDraftOptions`), so both players always see the same tier pair.
