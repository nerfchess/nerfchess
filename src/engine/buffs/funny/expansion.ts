// Funny set: EXPANSION PERMIT. The board "grows" a ninth file and rank —
// visually only (Board.tsx paints an under-construction ring while the card
// is live) — while the actual mechanic is cylinder-chess horizontal wrap:
// for the owner's next 4 turns their rooks and queens may slide off one side
// of the board and re-enter on the other side of the SAME rank, continuing
// until blocked. Built on timedAugment (helpers.ts), so ticking, status text,
// and the added-moves-only guarantee all come from the shared primitive.
//
// Desync safety: the wrap generator below is a pure function of the synced
// board (no rng, no clocks, no ordering dependence), so every replica
// generates the identical move list.

import { Buff } from "./shared";
import {
  BuffApi,
  FILE,
  Move,
  RANK,
  SQ,
  Square,
  card,
  mySquares,
  timedAugment,
} from "./shared";

/** How many of the owner's turns the permit lasts. */
const PERMIT_TURNS = 3;

/**
 * Cylinder-wrap sliding moves for the piece on `from`: horizontal only. The
 * slider must have a CLEAR path to the board edge in the travel direction
 * (blockers along the wrapped path are respected exactly like a normal
 * slide); it then re-enters on the far file of the SAME rank and keeps
 * sliding until it hits a piece (capturing an enemy like any normal move —
 * but NEVER a king) or completes the lap back to its own square. Duplicates
 * of ordinary moves are harmless: addNovel (inside timedAugment) dedupes.
 */
function wrapSlides(api: BuffApi, from: Square, via: string): Move[] {
  const board = api.board;
  const p = board.pieces[from];
  if (!p) return [];
  const out: Move[] = [];
  const r = RANK(from);
  for (const df of [1, -1] as const) {
    // Walk to the edge first: the wrap only exists when the run OFF the
    // board is unobstructed.
    let f = FILE(from) + df;
    let clear = true;
    while (f >= 0 && f <= 7) {
      if (board.pieces[SQ(f, r)]) {
        clear = false;
        break;
      }
      f += df;
    }
    if (!clear) continue;
    // Re-enter on the far side of the same rank and keep sliding.
    f = (f + 8) % 8;
    while (true) {
      const to = SQ(f, r);
      if (to === from) break; // empty rank: a full lap ends the ray
      const t = board.pieces[to];
      if (!t) {
        out.push({ from, to, piece: p.type, color: p.color, via });
      } else {
        // Captures land like normal moves; kings are never capturable via
        // the wrap (the cardinal engine rail for generated moves).
        if (t.color !== p.color && t.type !== "k") {
          out.push({
            from,
            to,
            piece: p.type,
            color: p.color,
            captured: t.type,
            capturedSquare: to,
            via,
          });
        }
        break;
      }
      f = (f + df + 8) % 8;
    }
  }
  return out;
}

export const FUNNY_EXPANSION: Buff[] = [
  card(
    {
      id: "expansion_permit",
      icon: "Construction",
      name: "Expansion Permit",
      description:
        "The construction crew bolts a ninth file onto the board: for your next 3 turns your rooks and queens may slide off one side of the board and back on the other.",
      tier: 5,
      category: "movement",
      requires: ["r", "q"],
      flavor: "Zoning approved. Physics pending.",
      fx: { motif: "empower", pieces: ["r", "q"], self: true },
    },
    timedAugment(PERMIT_TURNS, (_m, inst, api) =>
      [
        ...mySquares(api.board, api.me, "r"),
        ...mySquares(api.board, api.me, "q"),
      ].flatMap((sq) => wrapSlides(api, sq, inst.id)),
    ),
  ),
];
