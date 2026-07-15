// Plain-language "which pieces does this card touch" line, derived only from
// data the card already carries: a nerf's mechanic categories (see
// nerfCategories) or a buff's board-motif metadata (CardFx.pieces / self) and
// its draft-pool piece requirement. Returns null when nothing is derivable, so
// the caller renders the line only when it is honest. React-free so both the
// server detail pages and the client expand view can use it.

import type { Buff } from "@/engine/buff";
import type { Nerf } from "@/engine/nerf";
import type { PieceType } from "@/engine/types";
import { categoriesOf } from "@/lib/nerfCategories";

const PIECE_PLURAL: Record<PieceType, string> = {
  k: "kings",
  q: "queens",
  r: "rooks",
  b: "bishops",
  n: "knights",
  p: "pawns",
};

// The nerf mechanic categories that name a piece family, mapped to plain words.
const NERF_PIECE_CATEGORY: Record<string, string> = {
  King: "kings",
  Queen: "queens",
  Pawns: "pawns",
  Knights: "knights",
  Bishops: "bishops",
  Rooks: "rooks",
};

/** "a, b, and c" from a word list (Oxford comma), or "a and b", or "a". */
function listWords(words: string[]): string {
  const seen = words.filter((w, i) => words.indexOf(w) === i);
  if (seen.length === 0) return "";
  if (seen.length === 1) return seen[0];
  if (seen.length === 2) return `${seen[0]} and ${seen[1]}`;
  return `${seen.slice(0, -1).join(", ")}, and ${seen[seen.length - 1]}`;
}

/** A short plain sentence naming the pieces a card affects, or null when the
 * data does not make it derivable (so nothing is faked). */
export function affectedLine(kind: "buff" | "nerf", card: Buff | Nerf): string | null {
  if (kind === "nerf") {
    const pieces = categoriesOf(card.id)
      .map((c) => NERF_PIECE_CATEGORY[c])
      .filter((w): w is string => Boolean(w));
    if (pieces.length === 0) return null;
    return `Affects your ${listWords(pieces)}.`;
  }

  const buff = card as Buff;
  // Board-motif metadata is the most explicit signal of who and what is touched.
  if (buff.fx?.pieces) {
    const whose = buff.fx.self ? "your" : "your opponent's";
    if (buff.fx.pieces === "all") return `Affects ${whose} whole army.`;
    return `Affects ${whose} ${listWords(buff.fx.pieces.map((p) => PIECE_PLURAL[p]))}.`;
  }
  // Otherwise, a draft-pool piece requirement still tells the reader which of
  // their own pieces the card needs.
  if (buff.requires && buff.requires.length > 0) {
    return `Needs one of your ${listWords(buff.requires.map((p) => PIECE_PLURAL[p]))} in play.`;
  }
  return null;
}
