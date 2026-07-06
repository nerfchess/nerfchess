// Curated club identity icons: one emoji from a fixed set plus one of the
// site's accent colors, stored on clubs.icon as "emoji|colorId" (empty string
// means "no icon yet": the UI falls back to a monogram of the club name).
// Keeping the set curated means every icon renders consistently everywhere
// and nothing unpleasant can be smuggled into a club's identity.

export const CLUB_ICON_EMOJI: readonly string[] = [
  "♟️", "👑", "🛡️", "⚔️", "🏰", "🎯", "🎲", "🧠",
  "⚡", "🔥", "⭐", "🌙", "🌊", "🍀", "🌸", "🎉",
  "🐴", "🐇", "🐢", "🦊", "🐼", "🦉", "🐙", "🐉",
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

export function encodeClubIcon(emoji: string, colorId: string): string {
  return `${emoji}|${colorId}`;
}

export function parseClubIcon(
  raw: string | null | undefined,
): { emoji: string; color: ClubIconColor } | null {
  if (!raw) return null;
  const sep = raw.indexOf("|");
  if (sep < 0) return null;
  const emoji = raw.slice(0, sep);
  const color = CLUB_ICON_COLORS.find((c) => c.id === raw.slice(sep + 1));
  if (!color || !CLUB_ICON_EMOJI.includes(emoji)) return null;
  return { emoji, color };
}

/** Server-side validation: "" clears the icon, anything else must be a
 *  curated "emoji|colorId" pair. */
export function isValidClubIcon(value: unknown): value is string {
  return typeof value === "string" && (value === "" || parseClubIcon(value) !== null);
}
