// Tier 1 (Trivial) hexes: short, single-restriction curses on the opponent,
// each easily worked around and carrying no material swing. This file is the
// authoring template for the other tiers: import only from ./shared, one card
// per `hex(...)`, and lean on `curse`/`walnutTarget`/etc. so the safety rails
// (kings never frozen, filters never soft-lock) come for free.

import { Buff } from "./shared";
import { tierHexes, curse, FILE, RANK } from "./shared";

const H = tierHexes(1);

/** Chebyshev (king-step) distance a move travels. */
const dist = (from: number, to: number) =>
  Math.max(Math.abs(FILE(to) - FILE(from)), Math.abs(RANK(to) - RANK(from)));

/** Is a square on the board's rim (a/h file or 1/8 rank)? */
const onRim = (sq: number) =>
  FILE(sq) === 0 || FILE(sq) === 7 || RANK(sq) === 0 || RANK(sq) === 7;

export const HEXES_T1: Buff[] = [
  H(
    { id: "cold_feet", name: "Cold Feet", description: "Your opponent's pawns cannot capture for their next 3 turns.", flavor: "The infantry lose their nerve." },
    curse(3, (moves) => moves.filter((m) => !(m.piece === "p" && m.captured))),
  ),
  H(
    { id: "slippery_grip", name: "Slippery Grip", description: "Your opponent's rooks slide at most 3 squares for their next 4 turns.", flavor: "Buttered the tower floors." },
    curse(4, (moves) => moves.filter((m) => m.piece !== "r" || dist(m.from, m.to) <= 3)),
  ),
  H(
    { id: "foggy_glasses", name: "Foggy Glasses", description: "Your opponent's bishops cannot capture for their next 3 turns.", flavor: "Can't hit what you can't see." },
    curse(3, (moves) => moves.filter((m) => !(m.piece === "b" && m.captured))),
  ),
  H(
    { id: "knock_knees", name: "Knock Knees", description: "Your opponent's knights cannot land on the rim for their next 4 turns.", flavor: "The horses fear the edge of the world." },
    curse(4, (moves) => moves.filter((m) => !(m.piece === "n" && onRim(m.to)))),
  ),
  H(
    { id: "molasses", name: "Molasses", description: "Your opponent's queen slides at most 3 squares for their next 3 turns.", flavor: "Slow going, your majesty." },
    curse(3, (moves) => moves.filter((m) => m.piece !== "q" || dist(m.from, m.to) <= 3)),
  ),
  H(
    { id: "drawbridge", name: "Drawbridge", description: "Your opponent cannot castle for their next 6 turns.", flavor: "Someone raised it and lost the crank." },
    curse(6, (moves) => moves.filter((m) => !m.castle)),
  ),
  H(
    { id: "stage_fright", name: "Stage Fright", description: "Your opponent cannot promote a pawn for their next 4 turns.", flavor: "The understudy freezes at the footlights." },
    curse(4, (moves) => moves.filter((m) => !m.promotion)),
  ),
  H(
    { id: "butterfingers", name: "Butterfingers", description: "Your opponent's queen cannot capture for their next 3 turns.", flavor: "Everything she grabs squirts free." },
    curse(3, (moves) => moves.filter((m) => !(m.piece === "q" && m.captured))),
  ),
  H(
    { id: "stiff_joints", name: "Stiff Joints", description: "Your opponent's queen cannot move diagonally for their next 2 turns.", flavor: "Sideways or forward. Pick one." },
    curse(2, (moves) =>
      moves.filter(
        (m) =>
          m.piece !== "q" ||
          FILE(m.to) === FILE(m.from) ||
          RANK(m.to) === RANK(m.from),
      ),
    ),
  ),
  H(
    { id: "crossed_wires", name: "Crossed Wires", description: "Your opponent's knights cannot capture for their next 2 turns.", flavor: "The cavalry charges the wrong hill." },
    curse(2, (moves) => moves.filter((m) => !(m.piece === "n" && m.captured))),
  ),
  H(
    { id: "cold_open", name: "Cold Open", description: "Your opponent cannot move their queen for their next 2 turns.", flavor: "The lady sits this one out." },
    curse(2, (moves) => moves.filter((m) => m.piece !== "q")),
  ),
  H(
    { id: "royal_restraint", name: "Royal Restraint", description: "Your opponent's king cannot capture for their next 4 turns.", flavor: "The crown does not stoop to brawling." },
    curse(4, (moves) => moves.filter((m) => !(m.piece === "k" && m.captured))),
  ),
];
