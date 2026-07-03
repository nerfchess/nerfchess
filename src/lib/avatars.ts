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
] as const;
const PIECES: PieceType[] = ["n", "b", "r", "q"];

export const AVATAR_IDS: string[] = [];
export const AVATARS: Record<string, AvatarSpec> = {};
for (const palette of PALETTES) {
  for (const piece of PIECES) {
    const id = `${palette.id}_${piece}`;
    AVATAR_IDS.push(id);
    AVATARS[id] = { piece, pieceColor: "w", bg: palette.bg };
  }
}

export function isAvatarId(value: unknown): value is string {
  return typeof value === "string" && value in AVATARS;
}

/** The avatar to show: the stored preset when valid, else a stable default
 *  hashed from the username so the same player always looks the same. */
export function avatarIdFor(name: string, stored?: string | null): string {
  if (stored && stored in AVATARS) return stored;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_IDS[hash % AVATAR_IDS.length];
}
