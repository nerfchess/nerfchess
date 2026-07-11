// The accounts allowed to use the owner "god panel" tools: the in-game
// card-summon panel, the -15s opponent-clock cheat, and the "see opponent
// buffs" reveal. Kept in ONE place so the game server (worker.ts), the
// /api/mod/god-panel route, and the client gates (OnlineMatch, /mod) all agree
// on the same list. Matched case-insensitively everywhere, so a stored-casing
// difference can never lock an owner out.
//
// On the client these checks are UX/allowlist only: every god-panel message is
// re-verified server-side (worker.ts), so nothing here is trusted for
// authorization.
export const GOD_PANEL_USERNAMES = ["ilovenewjeans", "ruylopezsolos"] as const;

// True when `username` (any casing) is one of the god-panel accounts.
export function isGodPanelUser(username: string | null | undefined): boolean {
  if (!username) return false;
  const u = username.toLowerCase();
  return GOD_PANEL_USERNAMES.some((name) => name === u);
}
