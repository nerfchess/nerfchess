# Turn-cost labels on every card

## Goal

Players could not tell, before drafting or before clicking "Use", whether
playing a card would cost them their move for the turn. Make every card state
whether using it uses up a turn.

## The four states

Every card falls into exactly one bucket. The bucket is derived, never stored
separately, from the same two fields the engine already uses to decide whether
to pass the turn (`Buff.kind` and `Buff.freeAction`; see
`game.ts` `passTurnAfterBuff` and the `!def.freeAction` guard). Because the
label reads the same fields the rules engine acts on, the label can never
disagree with what the game actually does.

| State | Shown as | When |
| --- | --- | --- |
| turn | Uses your turn | `activated` and not a free action: playing the card is your move |
| free | Free action | `activated` with `freeAction: true`: resolves within your turn |
| instant | Instant | `instant`: applies the moment you draft it, nothing to activate |
| passive | Passive | `passive`: always on while held; also every nerf |

Nerfs are secret passive handicaps that are never activated, so they are always
Passive (`NERF_TURN_COST`).

The derivation lives in one place:

```ts
// src/engine/buff.ts
export function turnCost(b: Pick<Buff, "kind" | "freeAction">): TurnCost {
  if (b.kind === "activated") return b.freeAction ? "free" : "turn";
  if (b.kind === "instant") return "instant";
  return "passive";
}
```

## Where it shows

One shared chip component, `TurnCostBadge`, renders the state everywhere:

- `BuffCard` (the shared card face) covers the draft picker, the codex, and the
  in-game modal.
- `BuffDock` rows (your held cards and revealed opponent cards), which also back
  the mobile drawer. Uses the short label set to fit the tight rows.
- `NerfCard` and `PlayerNerfCard` show a Passive chip on the nerf, and the boon
  corner list in nerf mode shows each boon's chip.

The turn-spending state wears the warm gold accent so the one real cost stands
out; free / instant / passive read progressively quieter.

## The audit

Turn cost is derived, so the badge matches engine behavior by construction. A
separate audit checked whether each card's flags themselves are set sensibly
for its effect, since a wrong flag would make the (accurate) badge advertise a
design mistake.

Two passes:

1. Deterministic (`scripts/audit-turn-cost.cjs`): classifies all 419 cards and
   flags any whose written description contradicts the derived turn cost.
2. Semantic (multi-agent sweep of all 419 cards): flags cards whose turn cost
   seems wrong for the effect, then adversarially verifies each "obvious" flag
   so only unambiguous, no-balance-judgment mistakes are auto-fixed. Everything
   debatable is reported here for the owner to decide, because changing a flag
   changes real (rating-adjacent) gameplay.

### Distribution (419 cards)

- Uses your turn: 155
- Free action: 12
- Instant: 129
- Passive: 123

### Findings

Deterministic pass (`scripts/audit-turn-cost.cjs`): zero description-vs-behavior
contradictions. Four cards (Promote Now, Double Queen, Twin Queens, Mass Promote
Minor) say a pawn promotes "instantly"; reviewed and correct: "instantly" is
flavor for the promotion, and they correctly read Uses your turn.

Semantic pass (8 finders over all 419 cards, each flagged card adversarially
verified): 12 cards flagged. Every one was checked against source. The result:
no genuine turn-cost errors, so no flags were changed. The flags the finders
called "obvious" mistakes were false positives, because the finders judged from
card descriptions without the implementation:

- warp_rook, rift_walker (flagged passive -> turn): both are `augment(...)`
  move-augments. The "teleport once" is an extra legal move the piece gains; you
  make it as your normal move. The card itself is correctly Passive (there is no
  separate activation to spend a turn on).
- extra_move_repeat (flagged passive -> free): a passive that auto-grants an
  extra move for two turns while held. Correctly Passive; "free" is only for
  activated cards.
- full_rewind, time_rewind (flagged passive -> turn / instant): unimplemented
  placeholders (`def` with no mechanics), so they never appear in drafts. Their
  default Passive label is harmless.
- scout (flagged passive -> instant): a one-shot reveal that fires from `init`
  on draft. Passive vs Instant here is a cosmetic category nuance; both are
  zero-turn, so the turn-cost label is already right.

Debatable items, reported for the owner, not changed (each is a design/balance
call, not a correctness fix):

- wazir_rook, camel_knight, phase_rook (turn): these are `pieceBound` upgrades.
  Activating one spends a turn to designate which piece gets the permanent
  upgrade, then the upgrade is passive. That the setup costs a turn is
  intentional, and the badge now makes it visible (unlike the one-shot `augment`
  movement cards, which are Passive).
- tempo_theft, peasant_levy, noble_rout: minor category preferences with no
  turn-cost impact.

Nuance worth noting: a passive move-augment card (warp_rook and friends) grants a
move you still make on your own turn, so the move itself uses your turn as any
move does. "Passive" here means the card has no separate activation to spend a
turn on, which is accurate. The full per-card classification is in
`docs/turn-cost-table.json`.

## Files changed

- `src/engine/buff.ts` - `TurnCost`, `turnCost()`, `NERF_TURN_COST`.
- `src/components/TurnCostBadge.tsx` - the shared chip (new).
- `src/components/BuffCard.tsx`, `BuffDock.tsx`, `NerfCard.tsx`,
  `PlayerNerfCard.tsx` - render the chip.
- `src/components/OnlineMatch.tsx`, `src/app/game/page.tsx` - pass each boon's
  cost into the corner list.
- `scripts/audit-turn-cost.cjs`, `docs/turn-cost-table.json` - the audit tool
  and its full table (new).
