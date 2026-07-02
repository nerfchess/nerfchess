// Local player profile. There is no server-side account system yet: the
// username lives in localStorage so it persists across page refreshes and is
// shown wherever the player appears. When real sign-in lands, hydrate this
// from the authenticated user instead.

const STORAGE_KEY = "nerfchess.profile.v1";
export const PROFILE_CHANGED_EVENT = "nerfchess:profile-changed";
export const USERNAME_MAX_LENGTH = 24;

export interface Profile {
  username: string | null;
}

function normalize(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, USERNAME_MAX_LENGTH);
  return trimmed || null;
}

export function loadProfile(): Profile {
  if (typeof window === "undefined") return { username: null };
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) || "null"
    ) as Partial<Profile> | null;
    return { username: normalize(parsed?.username) };
  } catch {
    return { username: null };
  }
}

export function saveUsername(raw: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ username: normalize(raw) }));
  } catch {}
  window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
}
