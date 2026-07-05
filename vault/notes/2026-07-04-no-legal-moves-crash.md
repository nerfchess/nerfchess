# No-legal-moves handling centralized in resolveNoMoves

Bug report: a player left with zero legal moves froze the game ("kinda just crashes").

Findings:

- The engine convention (docs/draft-system.md): zero legal moves is a loss for the stuck player; in draft mode a lockdown caused purely by buff effects is a forced pass, and mutual lockdown is a draw ("mutual paralysis").
- `playMove` and `passTurnAfterBuff` each had a private copy of that rule, but **instant buffs resolved from a draft pick** (`pickDraftCard` -> `acquireBuff` -> `settleAfterBuff`) never ran it. Mass Freeze or World End picked while the opponent was to move left them with zero legal moves, no result, and no pass: soft-lock in local and online draft games.
- Fix: the rule now lives in one engine function, `resolveNoMoves` (src/engine/game.ts), called from `playMove`, `passTurnAfterBuff`, and `settleAfterBuff`. The online worker already syncs turn/result changes after draft actions, so no worker changes were needed.
- Second crash found while smoke-testing: nerfs that replay history from the initial board (e.g. You Best Not Miss `boardAfter`) throw `TypeError: Cannot read properties of null` inside `makeMove` once a draft buff has mutated the board outside history. `makeMove` now treats a move from an empty square as a no-op (same pattern as its self-capture guard).
- Repro technique: bot-vs-bot loops over `PLAYABLE_NERFS` seeds with `pickAIMove("easy")` in plain and draft mode surface these engine crashes quickly.
