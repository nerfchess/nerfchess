// Profile pictures. Avatars are chosen from a fixed preset catalog (a chess
// piece on a colored plate) and stored as a preset id in users.avatar, so no
// image uploads or object storage are needed. Accounts that never picked one
// get a deterministic default derived from their username.

import type { PieceType } from "@/engine/types";

export type AvatarSpec = { piece: PieceType; pieceColor: "w" | "b"; bg: string };

const PALETTES = [
  { id: "gold", bg: "#7c611f" },
  { id: "verdigris", bg: "#28604f" },
  { id: "bruise", bg: "#4e3f6e" },
  { id: "oxblood", bg: "#6e2727" },
  { id: "slate", bg: "#3b4a5c" },
  { id: "copper", bg: "#7a4526" },
  { id: "moss", bg: "#4c5722" },
  { id: "plum", bg: "#5e2c4e" },
] as const;
const PIECES: PieceType[] = ["p", "n", "b", "r", "q", "k"];

export const AVATAR_IDS: string[] = [];
export const AVATARS: Record<string, AvatarSpec> = {};
for (const palette of PALETTES) {
  for (const piece of PIECES) {
    const id = `${palette.id}_${piece}`;
    AVATAR_IDS.push(id);
    AVATARS[id] = { piece, pieceColor: "w", bg: palette.bg };
  }
}

// Defaults for accounts that never picked an avatar hash into the original
// 16-preset pool only, so expanding the catalog never reshuffles the look of
// existing players.
const DEFAULT_POOL = AVATAR_IDS.filter(
  (id) =>
    ["gold", "verdigris", "bruise", "oxblood"].some((p) => id.startsWith(`${p}_`)) &&
    ["n", "b", "r", "q"].includes(id.split("_")[1]),
);

export function isAvatarId(value: unknown): value is string {
  return typeof value === "string" && value in AVATARS;
}

// Uploaded profile pictures are stored inline as small data URLs (the client
// crops + downscales to 96px before uploading), so no object storage is
// needed. The size cap keeps list endpoints (leaderboard, lobby) light.
export const CUSTOM_AVATAR_MAX_CHARS = 24_000;

export function isCustomAvatar(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= CUSTOM_AVATAR_MAX_CHARS &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)
  );
}

/** The avatar to show: the stored preset when valid, else a stable default
 *  hashed from the username so the same player always looks the same. */
export function avatarIdFor(name: string, stored?: string | null): string {
  if (stored && stored in AVATARS) return stored;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return DEFAULT_POOL[hash % DEFAULT_POOL.length];
}
