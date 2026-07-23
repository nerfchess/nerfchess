// ---------------------------------------------------------------------------
// Deterministic draft-timeout resolution.
//
// When a draft's decision window expires the draft must resolve on its own,
// deterministically, and never strand the match in a "resolve me later"
// recovery state. This module owns the ONE decision every surface makes at
// that moment: which offered card to take.
//
//   - If the player has a card selected (tentatively highlighted but not yet
//     confirmed), that card is auto-confirmed.
//   - Otherwise one of the currently offered cards is chosen via the injected
//     authoritative RNG. Never Skip & Bank: banking is only ever the result of
//     the player explicitly pressing Skip & Bank, so a silent timeout must not
//     forfeit the pick.
//
// The function is pure and framework-free so it runs identically in the local
// bot game, in OnlineMatch (whose `onPick` sends a server-validated, recorded
// draftPick frame), and in node test scripts with a seeded RNG. Idempotency is
// the CALLER's job and is trivial: a resolved offer is cleared, so a duplicate
// timeout event (a refresh, a reconnect, a doubled interval tick) finds no
// offer and this returns null. `DraftTimeoutGuard` packages that guard for
// callers that resolve against a plain model.
// ---------------------------------------------------------------------------

export interface DraftTimeoutInput {
  /** How many cards are on the table for this offer. */
  offeredCount: number;
  /** The player's tentative selection, or null if nothing is highlighted. */
  selectedIndex: number | null;
  /** Authoritative RNG in [0, 1). Defaults to Math.random. Inject a seeded
   * source for deterministic tests / replays. */
  random?: () => number;
}

export interface DraftTimeoutResolution {
  /** Index of the offered card to auto-confirm. */
  index: number;
  /** Why this card was chosen — for telemetry / labels only. */
  reason: "selected" | "auto";
}

/**
 * Decide which offered card a timed-out draft should take. Returns null only
 * when there is nothing to resolve (an empty offer), so callers can treat null
 * as "already resolved / nothing to do".
 */
export function resolveDraftTimeout(input: DraftTimeoutInput): DraftTimeoutResolution | null {
  const { offeredCount, selectedIndex } = input;
  if (!Number.isFinite(offeredCount) || offeredCount <= 0) return null;
  if (
    selectedIndex != null &&
    Number.isInteger(selectedIndex) &&
    selectedIndex >= 0 &&
    selectedIndex < offeredCount
  ) {
    return { index: selectedIndex, reason: "selected" };
  }
  const random = input.random ?? Math.random;
  const roll = random();
  // Clamp defensively: a broken RNG returning >= 1 or < 0 must still land on a
  // real offered card, never off the end of the array.
  const raw = Math.floor((Number.isFinite(roll) ? roll : 0) * offeredCount);
  const index = Math.min(offeredCount - 1, Math.max(0, raw));
  return { index, reason: "auto" };
}

/**
 * Idempotency wrapper for surfaces that resolve a timeout against their own
 * draft model. `resolve` picks the card exactly once per offer version: a
 * duplicate call (or one for an offer that has already been consumed / rolled
 * away) is a no-op. Keyed by a caller-supplied offer identity so a reroll — a
 * brand new offer version — is correctly treated as a fresh, resolvable draft.
 */
export class DraftTimeoutGuard {
  private resolvedKeys = new Set<string>();

  /** True once this exact offer version has been resolved by a timeout. */
  hasResolved(offerKey: string): boolean {
    return this.resolvedKeys.has(offerKey);
  }

  /**
   * Resolve `offerKey` once. `apply(index)` performs the actual pick. Returns
   * the resolution that was applied, or null when this offer version was
   * already resolved (duplicate event) or there was nothing to resolve.
   */
  resolve(
    offerKey: string,
    input: DraftTimeoutInput,
    apply: (resolution: DraftTimeoutResolution) => void,
  ): DraftTimeoutResolution | null {
    if (this.resolvedKeys.has(offerKey)) return null;
    const resolution = resolveDraftTimeout(input);
    if (!resolution) return null;
    this.resolvedKeys.add(offerKey);
    apply(resolution);
    return resolution;
  }

  /** Forget an offer version (e.g. a reroll replaced it before it resolved). */
  forget(offerKey: string): void {
    this.resolvedKeys.delete(offerKey);
  }
}
