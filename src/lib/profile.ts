// Local player profile. There is no server-side account system yet: the
// profile lives in localStorage so it persists across page refreshes and is
// shown wherever the player appears. When real sign-in lands, hydrate this
// from the authenticated user instead.

const STORAGE_KEY = "nerfchess.profile.v1";
export const PROFILE_CHANGED_EVENT = "nerfchess:profile-changed";
export const USERNAME_MAX_LENGTH = 24;

export interface Profile {
  username: string | null;
  avatarId: string | null;
}

// Preset profile pictures: a chess glyph on a tinted plate, Lichess-quiet.
export interface AvatarSpec {
  id: string;
  glyph: string;
  label: string;
  fg: string;
  bg: string;
  border: string;
}

const PIECE_GLYPHS: Array<[string, string]> = [
  ["knight", "♞"],
  ["king", "♚"],
  ["queen", "♛"],
  ["rook", "♜"],
  ["bishop", "♝"],
  ["pawn", "♟"],
];

const AVATAR_HUES: Array<[string, string, string]> = [
  // [hue id, foreground, rgb triple for the tint]
  ["blue", "#4a9fee", "74 159 238"],
  ["green", "#7bb52f", "123 181 47"],
  ["amber", "#e6bf6a", "230 191 106"],
  ["red", "#dc5a54", "220 90 84"],
];

export const AVATARS: AvatarSpec[] = AVATAR_HUES.flatMap(([hue, fg, rgb]) =>
  PIECE_GLYPHS.map(([piece, glyph]) => ({
    id: `${hue}-${piece}`,
    glyph,
    label: `${hue[0].toUpperCase()}${hue.slice(1)} ${piece}`,
    fg,
    bg: `rgba(${rgb.split(" ").join(",")},0.14)`,
    border: `rgba(${rgb.split(" ").join(",")},0.45)`,
  }))
);

export function avatarById(id: string | null | undefined): AvatarSpec | null {
  if (!id) return null;
  return AVATARS.find((a) => a.id === id) ?? null;
}

// Stable avatar for names without a profile (bots, seeded ladder players), so
// lists of players look uniform.
export function avatarForName(name: string): AvatarSpec {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATARS[hash % AVATARS.length];
}

function normalizeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, USERNAME_MAX_LENGTH);
  return trimmed || null;
}

export function loadProfile(): Profile {
  if (typeof window === "undefined") return { username: null, avatarId: null };
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) || "null"
    ) as Partial<Profile> | null;
    return {
      username: normalizeName(parsed?.username),
      avatarId: avatarById(typeof parsed?.avatarId === "string" ? parsed.avatarId : null)?.id ?? null,
    };
  } catch {
    return { username: null, avatarId: null };
  }
}

export function saveProfile(profile: Profile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        username: normalizeName(profile.username),
        avatarId: avatarById(profile.avatarId)?.id ?? null,
      })
    );
  } catch {}
  window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
}

export function saveUsername(raw: string) {
  saveProfile({ ...loadProfile(), username: raw });
}

export function saveAvatar(avatarId: string | null) {
  saveProfile({ ...loadProfile(), avatarId });
}
