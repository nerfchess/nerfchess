// Curated club identity icons: one lucide icon name from a fixed set plus one
// of the site's accent colors, stored on clubs.icon as "iconName|colorId"
// (empty string means "no icon yet": the UI falls back to a monogram of the
// club name). Keeping the set curated means every icon renders consistently
// everywhere and nothing unpleasant can be smuggled into a club's identity.
// Legacy emoji values no longer parse; they fall back to the monogram.

import { isUploadedImage, validateImageDataUrl } from "@/lib/imageValidate";

export const CLUB_ICON_NAMES: readonly string[] = [
  "Swords", "Crown", "Castle", "Shield", "Rocket", "Flame",
  "Anchor", "Star", "Zap", "Trophy", "Gem", "Skull",
  "Cat", "Dog", "Bird", "Fish", "Rabbit", "Turtle",
  "Ghost", "Sun", "Moon", "Mountain", "Trees", "Dice5",
];

export interface ClubIconColor {
  id: string;
  label: string;
  /** Accent hex; tinted backgrounds are derived from it with alpha. */
  hex: string;
}

// The friendly kit: warm gold plus the coral/mint/sun trio, the Buff sky
// blue, and the Nerf rose (fixed hexes so club identity survives the
// accent-color setting).
export const CLUB_ICON_COLORS: readonly ClubIconColor[] = [
  { id: "gold",  label: "Gold",  hex: "#d8b56e" },
  { id: "coral", label: "Coral", hex: "#ef8a5f" },
  { id: "mint",  label: "Mint",  hex: "#58c39a" },
  { id: "sun",   label: "Sun",   hex: "#eec25e" },
  { id: "sky",   label: "Sky",   hex: "#5b9bd4" },
  { id: "rose",  label: "Rose",  hex: "#c4785f" },
];

export function encodeClubIcon(name: string, colorId: string): string {
  return `${name}|${colorId}`;
}

// Parsed icon. `name` is the lucide icon name. Old stored emoji values fail
// the CLUB_ICON_NAMES check and return null, so every consumer gracefully
// falls back to the monogram.
export function parseClubIcon(
  raw: string | null | undefined,
): { name: string; color: ClubIconColor } | null {
  if (!raw) return null;
  const sep = raw.indexOf("|");
  if (sep < 0) return null;
  const name = raw.slice(0, sep);
  const color = CLUB_ICON_COLORS.find((c) => c.id === raw.slice(sep + 1));
  if (!color || !CLUB_ICON_NAMES.includes(name)) return null;
  return { name, color };
}

/** Server-side validation: "" clears the icon, a "iconName|colorId" pair
 *  chooses a curated emblem, and a data-URL image is a custom uploaded icon
 *  (fully re-validated — MIME, byte-size, and pixel dimensions — server-side by
 *  imageValidate, so a client can never smuggle an oversized or non-image
 *  value through). */
export function isValidClubIcon(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value === "" || parseClubIcon(value) !== null) return true;
  return validateImageDataUrl(value).ok;
}

/** True when the stored icon is an uploaded image (rendered as <img>) rather
 *  than a curated emblem or the empty monogram fallback. */
export function isUploadedClubIcon(value: string | null | undefined): value is string {
  return isUploadedImage(value);
}
