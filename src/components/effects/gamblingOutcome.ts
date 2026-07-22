// Outcome channel for the gambling (gm_*) play animations.
//
// Every gambling card rolls with the seeded effect RNG and records what
// actually happened in inst.state (gambling.ts house rules). The surfaces
// that fire card-use signatures (OnlineMatch, the spectator page) stash that
// state here right before firing, and the gamblingPlays.tsx Render components
// take it at mount so the table-side animation enacts the TRUE outcome: the
// lootbox opens what it opened, the coin lands on the face it landed on.
//
// Single-slot per card id, cleared on read, no timers. A missed hand-off
// (e.g. a queued replay long after the play) simply reads null and the
// animation falls back to its neutral choreography.

const slots = new Map<string, Record<string, unknown>>();

/** Stash a just-resolved gambling card's inst.state for its play animation.
 * Copies the state so later engine mutation cannot rewrite the outcome. */
export function stashGamblingOutcome(cardId: string, state: Record<string, unknown>): void {
  if (!cardId.startsWith("gm_")) return;
  slots.set(cardId, { ...state });
}

/** Take (and clear) the stashed outcome for a card. null = nothing stashed:
 * the animation should play its neutral variant. */
export function takeGamblingOutcome(cardId: string): Record<string, unknown> | null {
  const s = slots.get(cardId);
  if (s === undefined) return null;
  slots.delete(cardId);
  return s;
}
