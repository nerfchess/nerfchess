# Card-library audit — 2026-07-17 (pre-expansion baseline)

Ground truth for the Nerf-mode expansion wave. All counts were produced by
importing the live registries (`ALL_BUFFS` from `src/engine/buffs/library.ts`,
`ALL_NERFS` from `src/engine/nerfs/library.ts`) with `tsx` and tallying
`category` / `tier` / the `boon` flag — not by reading docs (several older
docs are stale; `docs/draft-system.md` still says 263 cards).

## Baseline counts (before this wave)

Family split of the 867-card buff registry plus the 342-nerf registry:

| Family | Total | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 | T9+ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pure buffs | 609 | 26 | 46 | 91 | 134 | 126 | 83 | 50 | 40 | 13 |
| Hexes | 180 | 15 | 18 | 26 | 31 | 32 | 24 | 17 | 14 | 3 |
| Boons (boon flag or nerf-relief) | 60 | 8 | 12 | 12 | 9 | 8 | 3 | 6 | 2 | — |
| Items | 18 | 1 | 8 | 6 | 3 | — | — | — | — | — |
| Nerfs | 342 | 22 | 31 | 60 | 66 | 61 | 58 | 27 | 17 | — |

Buff-category split: movement 151 · pieces 140 · tempo 101 · protection 100 ·
attack 97 · draft 45 · nerf-relief 29 · info 6 · hex 180 · item 18.

Implementation status: every registered card is implemented (no stubs
survive); every card resolves a flagship animation (registry: 812 keep ·
336 polish · 45 partial · 0 full; ratchet baseline 381 shared / 45 tier-5+,
shrink-only, enforced by `npm run test:animations`).

## Gaps and skews identified

1. **Boons are the starved family.** 60 cards vs 609 pure buffs, and the top
   of the ladder is nearly empty (T6: 3, T8: 2). Nerf mode deals ~40% of its
   slots from the boon/item bucket, so the same boons recur game after game —
   the single biggest source of "Nerf Mode feels empty and repetitive."
2. **Nerf tiers are barbell-thin.** T3–T6 are healthy (60/66/61/58) but the
   entry tiers (T1: 22, T2: 31) and the flagship tiers (T7: 27, T8: 17) are
   thin, so the extreme ends of the opening-handicap roll repeat quickly.
3. **Hexes lean mid-tier.** 180 cards but concentrated T3–T5; and a large
   share are restriction-shaped ("piece X can't do Y for N turns") rather
   than curse-structured (marks, transfers, delayed punishments, contracts).
4. **Info category is nearly empty** (6 cards) — strategic-information play
   barely exists. (Deliberately left for a future wave: info cards interact
   with the hidden-nerf reveal rules and need their own design pass.)
5. **Items stop at T4** (18 cards, none above T4). Future-wave candidate.
6. **Overrepresented mechanics** (from the animation-template clustering,
   which mirrors mechanic families): freezes (19 cards on the ColdSnap
   template alone), plain shields/protections (SigilRing 20+), draft-denial
   (13 on ScrollSnap), "revive one piece" (13 on LanternLift). New content
   must not add to these piles.
7. **Oppressive combinations existed unguarded.** Nothing stopped a player
   holding several turn-skip cards (time_skip/time_lock/time_freeze/
   grand_malediction/…), several draft-denial cards (draft_supremacy +
   sealed_archive + …), or stacking board-wide freezes — the exact
   "opponent never takes a normal turn" loops the design rules forbid.
   Addressed this wave: see the combination guard below.
8. **Schema has no incompatibility/stack fields.** `Buff`/`Nerf` carry no
   conflictsWith/stackLimit; the only prior guard was "never offer a card
   you already hold unspent."

## Actions taken this wave

- **Combination guard** (`COMBO_TAGS` / `COMBO_TAG_LABELS` in
  `src/engine/draft.ts`): exclusive families `turn-theft` (8 cards),
  `draft-denial` (14 cards), `mass-freeze` (2 cards). While a player holds an
  unspent card of a family, the draft never offers them another from the same
  family — a deterministic pool filter over synced state (desync- and
  replay-safe). The rule is printed on the card face (BuffCard renders an
  "Exclusive" note), never silent.
- **Boon wave 2** (`src/engine/buffs/boons2.ts`, flagships in
  `boonPlays.tsx`): new boons weighted toward T4–T8; identity: miracles,
  contracts, transformations, comeback engines — not bigger-number buffs.
- **Hex wave 2** (`src/engine/buffs/hexes/wave2.ts`, flagships in
  `cursePlays.tsx`): curse-structured hexes (marks, transfers, delayed
  punishments, spreading ground, stack-morphing conditions), each with
  stated counterplay.
- **Nerf wave 2 + rebalance** (`src/engine/nerfs/wave2.ts`,
  `docs/2026-07-17-nerf-wave2-and-rebalance.md`): T1/T2/T7/T8 fill plus a
  surgical audit of tier 6–8 nerfs against forced-loss/randomness/
  counterplay criteria; every change documented.
- Post-wave counts are recorded in the design notes for each batch and in
  the PR summary.

## Roadmap to the ~350-per-family scale target

The owner target (~350 buffs / 350 nerfs / 350 hexes / 350 boons) is a
multi-wave scale goal, not a single-PR deliverable — the repo's quality
gates (unique mechanics, per-card flagship dressing, passive-language
uniqueness for nerfs, desync-safe determinism) make bulk generation the
wrong tool, and the owner's own instruction is quality over the exact
number. Suggested wave cadence, each batch passing uniqueness / balance /
animation / mobile / performance / clarity review:

1. Boons to ~150 (two more waves, T5–T8 heavy), then to parity.
2. Hexes to ~250 (curse-structure families: contagion, contracts, marks).
3. Nerf T1/T2 comfort pool and T7/T8 flagship pool to ~30 each.
4. An info-category wave (needs its own hidden-information design pass).
5. Items T5+ (relic-grade items).
