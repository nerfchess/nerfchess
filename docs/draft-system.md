# Draft mode: nerf + buff drafts

Draft mode is an alternate ruleset (`/game?...&draft=1`, "Ruleset: Draft" on the
play page). The arc: you start weak and asymmetric from a hidden nerf, then
draft your way back to power. The comeback is the game.

## The loop

1. **Nerf draft** — before the first move each player sees two nerf cards and
   picks one. You can see which two cards your opponent is choosing between,
   but **not** which one they took (hidden choice was picked over visible for
   chaos; reveal buffs like *Extra Glance* / *Watchtower* exist to buy the
   information back).
2. **Buff cadence** — every **6** of your own moves you get a buff draft: two
   cards, pick one. Buff offers, picks, and held buffs are **public** —
   both players can see them (the opponent's current offer is only shown to
   you if you drafted *Peek* / *Draft Insight*, their held buffs are always
   visible in the dock).
3. **Banking** — on any buff draft you can skip instead of picking. Your next
   draft then rolls one tier higher. Banking **does not stack** (cap +1); a
   second consecutive skip just re-banks the same +1.

## Tier progression

Draft #k rolls around tier `min(6, k)` with per-card jitter of ±1
(18% up / 18% down). **Tiers 7–8 are gated**: the natural curve tops out at
6, so the top tiers are only reachable via jitter, banking, or
draft-manipulation buffs (*Recast*, *Draft Tyranny*) — and every rolled level
above 6 has a 45% chance to slip back one. This keeps the board-clearing /
near-invincibility cards rare blowout moments instead of the default endgame.
All rolls come from a seeded RNG stored in the match state, so replays and
snapshots are deterministic.

## Engine architecture

- `src/engine/buff.ts` — core types: `Buff` (definition + hooks),
  `BuffInstance` (held card), `BuffMatchState` (per-game draft/effect state,
  fully JSON-serializable, lives at `NerfGame.buffs`), `ActiveEffect`
  (freezes, shields, barred lines, king-safety, nerf suspension).
- `src/engine/buffs/helpers.ts` — factories (move-gen helpers, targeted
  removal/placement/revival/freeze/shield/steal builders) so most cards are a
  few lines each.
- `src/engine/buffs/library.ts` — the full library: 263 cards (8 tiers ×
  ~32, plus the cross-cutting nerf-modifier set). ~160 are mechanically
  implemented; the rest are cataloged stubs (`implemented: false`) that never
  appear in drafts, mirroring how unimplemented nerfs work.
- `src/engine/draft.ts` — tier rolling, offer generation, banking.
- `src/engine/game.ts` — integration: `enableDraftMode`, the legal-move
  pipeline (freeze → buff augments → nerf filter → opponent
  shields/zones/filters), turn manipulation (extra moves / skips), draft
  cadence, `pickDraftCard` / `bankDraft` / `activateBuff` / `buffNextTarget`,
  and `aiResolveDraft` for bots.

### Buff kinds

- **passive** — hooks run while held (move augments, timed effects,
  piece-bound upgrades like *Knight to Nightrook*). Buff-granted moves are
  tagged with `Move.via` so charges are consumed when the move is played, and
  they flow through the existing AI search untouched (the bot sees and uses
  them).
- **instant** — applies the moment the card is picked (freezes, reveals,
  skips, board-wide effects).
- **activated** — the holder clicks *Use* in the buff dock on their turn and
  picks targets (squares or enemy buffs) in a small picker modal.

### Rules decisions baked into the engine

- Nerf constraints still govern buff-granted moves (augments run **before**
  the nerf's `filterMoves`).
- Freezes never affect kings, and a player locked down entirely by buff
  effects gets a **forced pass** (their effect timers tick) instead of losing
  by "no legal moves". Mutual paralysis is a draw.
- Buff effects that mutate the board directly (summons, removals, teleports)
  bypass move history, so threefold-repetition detection is effectively reset
  by them (fifty-move counting is unaffected).
- Nerf-modifier buffs: *Grace Period* (suspend 4 turns) and *Nerf Breaker*
  (remove outright) are implemented because they don't need per-nerf
  downgrade paths. The graded ones (*Loosen the Leash*, *Piece Parole*,
  *Half Measure*, *Rehab*, *Nerf Reversal*) are stubs until nerfs declare
  their own downgrade paths — that category has to be built in tandem with
  the nerf library.

## UI

- `src/components/DraftOverlay.tsx` — the pick-or-bank modal, with whatever
  opponent-draft info your reveals entitle you to.
- `src/components/BuffCard.tsx` — card rendering (tier colors, category,
  status, spent/nullified states).
- `src/components/BuffDock.tsx` — held buffs (yours + opponent's), activation
  buttons, and the square/buff target picker.
- The nerf draft screen and all wiring live in `src/app/game/page.tsx`
  (AI games). Saved games and the AI worker snapshot carry the full
  `buffs` state, so refresh/restore and worker search both work in draft mode.

## Known gaps / follow-ups

- **Multiplayer**: draft mode is AI-only right now. The engine state is one
  serializable object (`NerfGame.buffs`) designed to be relayed by the game
  server; the server protocol and `OnlineMatch` need draft messages
  (offer/pick/bank/activate) plus per-seat visibility filtering.
- The buff dock only renders in the desktop side rail (`lg:` breakpoint); a
  mobile drawer is needed.
- Bots draft (preferring cards they can use without a targeting UI) but never
  *activate* targeted buffs they hold.
- ~100 cards are stubs (atomic/explosion family, rewinds, move-history
  effects like *Momentum*, per-piece conditional shields). The `Buff` hook
  surface covers most of them; explosions and rewinds need new engine events.
- Board visualization for zone effects (barred files, sanctuaries, frozen
  pieces) — the effects work but aren't painted on the board yet.
