# Nerf mode and Buff mode split (2026-07-04)

The site now has two sections instead of one merged Draft ruleset.

## Decisions

- Engine: `BuffMatchState.mode?: "nerf" | "buff"`. Absent = legacy merged
  rules, so saved and archived games replay unchanged. `enableDraftMode(game,
  seed, { mode })` derives the cadence from the mode (nerf = 10 own moves,
  buff and legacy = 6).
- Card pools filter inside `rollOffer`: buff mode excludes category "nerf",
  nerf mode contains ONLY category "nerf". The adjacent-tier fallback runs on
  the filtered pool, so a mode can never leak the other section's cards. A
  completely dry pool skips the draft (rollOffer returns null) instead of
  blocking the player behind an empty offer.
- Nerf mode currently offers exactly two implemented cards: Grace Period
  (tier 4) and Nerf Breaker (tier 6). That matches the owner's "roughly 1-2
  nerf-affecting buffs". More nerf-category cards (Loosen the Leash, Piece
  Parole, Half Measure, Rehab, Nerf Reversal) are stubs and join the pool
  automatically once implemented.
- Buff mode has no nerfs at all: both seats run a new exported
  `UNRESTRICTED_NERF` (id "none"), the opening nerf draft is skipped, and the
  match starts like a classic game. Stored buff-mode matches carry "none" as
  both nerf ids.
- Wire protocol: `create` takes `mode`, and `start` / `wstart` echo it inside
  the draft extras. Rematches inherit the mode. Documented in
  docs/game-server-protocol.md.
- Defaults: quick-pairing queue games and the friend page default to Buff
  mode; the play page defaults to Buff with a two-card mode picker. No UI
  creates legacy merged games anymore.
- Nerf mode hides the opponent's nerf completely: the nerf-draft screens no
  longer show which two options the opponent is choosing between (the wire
  still carries them for legacy clients; UI-only hiding), and the rule
  reveals only at game end.
- Hidden-rule placeholder UI removed: `PlayerNerfCard` gained `hideNerf`
  (header only, no "Hidden rule" plate) used by all draft games, and the
  spectate page dropped its "keeps their rule secret until the end" plates.
- Readability: the in-game right rail widened (sm:w-52 to sm:w-64), the
  online left rail gives the buff dock a larger row share, and BuffDock now
  prints each held buff's full description under its name.
- Picks visibility: the Hidden/Visible picks option was removed from the play
  and friend pages (the sections always play hidden); the server still honors
  `picksVisible` for old clients and legacy games.

## Verified

- `npm run typecheck` clean.
- tsx sim: buff mode cadence 6, first offers at ply 12, zero nerf-category
  cards over 40 plies; nerf mode cadence 10, first offers at ply 20, only
  grace_period and nerf_breaker offered; legacy games carry no mode and keep
  cadence 6.
