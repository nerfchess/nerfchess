// Reveal-state ledger for draft offers: which treasure-chest reveals this
// player has already watched, per game and per exact offer version.
//
// The chest animation must fire exactly once for each unique offer a player
// is shown — the first draft, every scheduled draft, banked and apex drafts,
// each reroll (a reroll bumps the offer version, so it counts as a new
// offer), and a reconnect that restores an offer the player never saw. It
// must NOT fire again for an offer the player already watched: reopening the
// same draft, component remounts (the overlay is keyed per offer index and
// remounts on reconnect/replay epochs), React StrictMode double-mounts,
// network retries that re-deliver the same draft state, or a page refresh
// after the reveal already played.
//
// Component state cannot express that contract — the overlay remounts freely
// — so the "has this exact offer's reveal played" bit lives here, in
// localStorage, keyed by (game, offer index, offer version). Everything is
// wrapped in try/catch: storage being unavailable (private mode, quota)
// degrades to "always play the chest", never to a crash.

const KEY = "nerfchess.draftReveal.v1";

// One entry per game: when we last touched it (for pruning) plus the set of
// offer keys whose reveal has played. Offer keys are `${index}:${rerolled}` —
// the same identity the overlay uses to key its deal, so a reroll (bumped
// `rerolled`) is a fresh key and earns a fresh chest.
type Ledger = Record<string, { at: number; seen: Record<string, true> }>;

// Keep the ledger small: only the most recent handful of games, and nothing
// older than two days. Pruned on every write.
const MAX_GAMES = 12;
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

/** The offer-version identity: same shape as DraftOverlay's dealKey. */
export function offerRevealKey(index: number, rerolled?: number): string {
  return `${index}:${rerolled ?? 0}`;
}

function readLedger(): Ledger {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Ledger;
  } catch {
    return {};
  }
}

/** True when the chest reveal for this exact offer version already played
 * for this player on this device. Unknown scope/storage failure both read as
 * "not played", so the worst degradation is an extra chest, never a missing
 * one. */
export function hasRevealPlayed(scope: string, offerKey: string): boolean {
  return !!readLedger()[scope]?.seen?.[offerKey];
}

/** Record that the reveal for this exact offer version has played. Idempotent
 * — safe under StrictMode double-effects and repeated renders. */
export function markRevealPlayed(scope: string, offerKey: string): void {
  if (typeof window === "undefined") return;
  try {
    const ledger = readLedger();
    const entry = ledger[scope] ?? { at: 0, seen: {} };
    if (entry.seen[offerKey] && entry.at > Date.now() - MAX_AGE_MS / 2) return;
    entry.at = Date.now();
    entry.seen[offerKey] = true;
    ledger[scope] = entry;

    // Prune: drop stale games, then oldest-first down to the cap.
    const cutoff = Date.now() - MAX_AGE_MS;
    const games = Object.entries(ledger).filter(([, v]) => v && v.at >= cutoff);
    games.sort((a, b) => b[1].at - a[1].at);
    const kept: Ledger = {};
    for (const [id, v] of games.slice(0, MAX_GAMES)) kept[id] = v;

    window.localStorage.setItem(KEY, JSON.stringify(kept));
  } catch {
    // Storage unavailable: the chest may replay after a refresh. Acceptable.
  }
}
