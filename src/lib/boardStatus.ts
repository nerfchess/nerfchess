// The board's status vocabulary: every way a card can change a piece or a
// square, reduced to eleven classes that each own ONE colour, ONE glyph and
// ONE plain sentence. Every board mark (frame, corner chip, motif badge,
// hover card, the key in the side rail) reads from this table, so a frozen
// knight, a chained rook and a shielded bishop are told apart at a glance and
// a new player can learn the whole language from the key.
//
// Colours are picked for contrast on both board tints and never reused
// between classes. Anything a card does that is not in this list falls into
// the class whose sentence is true of it.

export type BoardStatus =
  | "frozen"
  | "restricted"
  | "muzzled"
  | "blind"
  | "slowed"
  | "shielded"
  | "empowered"
  | "warded"
  | "barred"
  | "doomed"
  | "trap";

export interface BoardStatusDef {
  /** Two-word label for chips and the key. */
  label: string;
  /** One plain sentence: what it means for the piece or square. */
  plain: string;
  /** The class colour (hex). Frames, chips, badges and the key all use it. */
  color: string;
  /** Glyph id drawn by StatusGlyph. */
  glyph: BoardStatus;
  /** Whether this class marks a piece (true) or an empty square (false). */
  onPiece: boolean;
  /** Which side benefits: your own effects read green-ish in the key. */
  side: "good" | "bad" | "neutral";
}

export const BOARD_STATUS: Record<BoardStatus, BoardStatusDef> = {
  frozen: { label: "Can't move", plain: "This piece cannot move while the effect holds.", color: "#7dd3fc", glyph: "frozen", onPiece: true, side: "bad" },
  restricted: { label: "Movement limited", plain: "This piece can move, but not the way it normally does.", color: "#b4b4bc", glyph: "restricted", onPiece: true, side: "bad" },
  muzzled: { label: "Can't capture", plain: "This piece cannot capture while the effect holds.", color: "#fb923c", glyph: "muzzled", onPiece: true, side: "bad" },
  blind: { label: "Sight limited", plain: "This piece cannot see or reach part of the board.", color: "#a78bfa", glyph: "blind", onPiece: true, side: "bad" },
  slowed: { label: "Slowed", plain: "This side loses tempo: delayed, skipped or rationed moves.", color: "#d4b06a", glyph: "slowed", onPiece: true, side: "bad" },
  shielded: { label: "Can't be captured", plain: "This piece cannot be captured while the shield holds.", color: "#86efac", glyph: "shielded", onPiece: true, side: "good" },
  empowered: { label: "Gained powers", plain: "This piece moves or acts beyond its normal rules.", color: "#fcd34d", glyph: "empowered", onPiece: true, side: "good" },
  warded: { label: "Enemy can't enter", plain: "Your opponent cannot move a piece onto this square.", color: "#5eead4", glyph: "warded", onPiece: false, side: "good" },
  barred: { label: "You can't enter", plain: "You cannot move a piece onto this square.", color: "#f87171", glyph: "barred", onPiece: false, side: "bad" },
  doomed: { label: "Dies soon", plain: "This piece is removed when its countdown reaches zero.", color: "#c084fc", glyph: "doomed", onPiece: true, side: "bad" },
  trap: { label: "Trap", plain: "The first enemy piece to land here springs the trap.", color: "#f59e0b", glyph: "trap", onPiece: false, side: "neutral" },
};

export const BOARD_STATUS_ORDER: BoardStatus[] = [
  "frozen",
  "restricted",
  "muzzled",
  "blind",
  "slowed",
  "shielded",
  "empowered",
  "warded",
  "barred",
  "doomed",
  "trap",
];

/** Card-fx motifs (engine/buff.ts CardFx.motif) mapped onto the status class
 *  they express, so a motif badge wears its class colour, not its tier. */
export const MOTIF_STATUS: Record<string, BoardStatus> = {
  jail: "frozen",
  anchor: "restricted",
  muzzle: "muzzled",
  blindfold: "blind",
  slow: "slowed",
  empower: "empowered",
  ward: "shielded",
  rally: "empowered",
};

export function statusColor(s: BoardStatus): string {
  return BOARD_STATUS[s].color;
}

/** "Can't move · 2 turns left" for the popover headline. */
export function statusHeadline(s: BoardStatus, turns?: number | null): string {
  const base = BOARD_STATUS[s].label;
  if (turns == null) return base;
  return `${base} · ${turns} turn${turns === 1 ? "" : "s"} left`;
}
