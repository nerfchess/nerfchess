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

// Sentinel reroll count for the god-panel "infinite rerolls" tool. When an
// owner flips the toggle on, the server reports THIS value as their own seat's
// rerollsLeft (draftStateFor) so the Reroll control always shows, and the
// draft-reroll handler tops the real count back up so it never actually drains
// — a video-scripting aid for the god-panel accounts. The client shows "∞"
// instead of the raw number when rerollsLeft reaches it. Shared here so the
// game server (worker.ts) and the draft UI (DraftOverlay) agree on the value.
export const INFINITE_REROLLS = 999;

// The single account allowed to edit a house bot's identity (username, avatar,
// bio) directly from that bot's profile — "click a house bot and edit it".
// Deliberately ONE name (narrower than the god-panel set and independent of the
// admin role), per the owner's request. Server routes re-verify this; the
// client gate only decides whether to show the controls. Matched
// case-insensitively so a stored-casing difference can never lock the owner out.
export const HOUSE_EDITOR_USERNAME = "ilovenewjeans";
export function isHouseEditor(username: string | null | undefined): boolean {
  return !!username && username.toLowerCase() === HOUSE_EDITOR_USERNAME;
}

// The single account allowed to overwrite ANY player's rating directly from
// that player's profile — the "edit button on people's rating" that sets every
// rating bucket (Nerf, Buff, and any legacy speed rows) plus the legacy shared
// column to one number at once. Deliberately ONE name (independent of the admin
// role), per the owner's request. The /api/mod/ratings route re-verifies this;
// the client gate only decides whether to show the control. Matched
// case-insensitively so a stored-casing difference can never lock the owner out.
export const RATING_EDITOR_USERNAME = "ilovenewjeans";
export function isRatingEditor(username: string | null | undefined): boolean {
  return !!username && username.toLowerCase() === RATING_EDITOR_USERNAME;
}
