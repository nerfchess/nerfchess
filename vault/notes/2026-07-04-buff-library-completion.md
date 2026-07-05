# Buff library completion (finish-buff-library branch)

Date: 2026-07-04. Follow-up to PR #105 and [[2026-07-04-draft-system-audit]]. Rebuilt on master after PR #118 landed all 14 tier 8 implementations mid-flight; this branch keeps only the work master does not have.

## Status after this pass

- Library: 264 cards total (263 + the new Lightning Strike), 252 implemented, 12 unimplemented.
- New in this branch: scout (tier 1), anchor (tier 2), suppress (tier 4), and the owner-requested lightning_strike (tier 6).
- lightning_strike (attack, activated): removes up to three enemy knights, bishops, or pawns (never king, queen, or rook); struck squares flash briefly via a new visual-only "strike" board effect painted by the existing zone system (Board.tsx sq-strike overlay, expires when the opponent replies, reduced-motion disables the flash). Wired in the bot game, online match, and spectator replay.

## Engine touches beyond the library

- buff.ts: new "strike" ActiveEffect kind (visual only) and DraftFlags.noDraftCards (Suppress).
- game.ts: BuffApi.relocate refuses enemy-buff pushes of a piece bound by Anchor; aiActivateBuffs skips reusable (spendOnUse: false) cards that are already online (state sq/sqs/squares/active) so the bot does not burn every turn re-activating a bound card such as God Knight or Titan Legion under the "activation consumes the move" rule.
- draft.ts: rollOffer honors noDraftCards by filtering category "draft" from that offer.
- reality_warp and total_warp (from PR #118) now route pawn destinations through a pawn-rank filter, honoring the "pawns never on rank 1 or 8" rule; card text states it. Pre-existing rift_storm (tier 7) still allows it and could use the same one-line fix.

## Left unimplemented (12), with reasons

- free_retreat (1), rewind_one (3), time_rewind (6), full_rewind (7): general undo needs positions rebuilt from history, which is impossible once a buff mutates the board (historyDiverged). PR #118's perfect_rewind works around this with fixed 8-half-move snapshots; the variable-depth rewinds need a real snapshot system.
- decoy (2): needs a phantom king and redefined check semantics; no engine hook exists.
- shadow_step (2): hidden destinations need per-viewer board filtering; board state is fully shared.
- pin_breaker (3): this variant has no pins (moving into check is legal; the game ends on king capture), so the card is mechanically meaningless.
- loosen_the_leash (2), piece_parole (3), half_measure (3), rehab (5), nerf_reversal (7): nerf definitions are opaque closures with no metadata for caps, cadences, disabled piece types, or weaker variants, so generic modification is impossible. Needs per-nerf modifier hooks.

## Verification

- npm run typecheck clean on the rebased branch.
- Smoke script (not committed): lightning_strike targets only knights/bishops/pawns, removes three, is spent and refuses reuse, sets chainKingGuard, and its flash effect expires on the opponent's reply; anchor blocks an enemy buff relocate but not friendly ones; scout's status names the revealed card; suppress filters draft cards from the opponent's next offer and consumes its flag; reality_warp and total_warp keep pawns off ranks 1/8; the AI fires titan_legion and endless_turn once and never re-fires them while online.
- 20 randomized bot-vs-bot draft games (cadence 3, random buff activations) ran to completion with no exceptions.
