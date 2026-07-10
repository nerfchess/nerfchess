// Tier 3 (Common) hexes: real but bounded curses on the opponent. Each is a
// small tempo edge or a short, single constraint, spread across every piece
// target and across mechanic types (timed filters, petrify, freeze, barred
// squares, king-only, no-pawn-advance, a draft block, and a skip).

import { Buff } from "./shared";
import {
  tierHexes,
  curse,
  walnutAll,
  walnutTarget,
  freezeTarget,
  blockDrafts,
  skipOpponent,
  instant,
  addEffect,
  FILE,
  RANK,
  SQ,
} from "./shared";

const H = tierHexes(3);

/** Chebyshev (king-step) distance a move travels. */
const dist = (from: number, to: number) =>
  Math.max(Math.abs(FILE(to) - FILE(from)), Math.abs(RANK(to) - RANK(from)));

export const HEXES_T3: Buff[] = [
  // --- freeze: one targeted piece -----------------------------------------
  H(
    {
      id: "frostbite",
      name: "Frostbite",
      description: "Freeze one enemy piece you target for 3 of their turns. Kings cannot be targeted.",
      flavor: "The cold sinks into the joints.",
    },
    freezeTarget(3),
  ),

  // --- petrify: one targeted minor ----------------------------------------
  H(
    {
      id: "gorgons_glance",
      name: "Gorgon's Glance",
      description: "Turn one enemy knight or bishop you target into a walnut for 2 of their turns: it can only shuffle one square at a time.",
      flavor: "One look and the minor turns to stone.",
    },
    walnutTarget(2, ["n", "b"]),
  ),

  // --- petrify all: knights -----------------------------------------------
  H(
    {
      id: "hobbled_cavalry",
      name: "Hobbled Cavalry",
      description: "Your opponent's knights turn to walnuts for 2 of their turns: a walnut can only shuffle one square at a time.",
      flavor: "The horses will not stir.",
      // Board already paints walnuts; fx carried for consistency.
      fx: { motif: "jail", pieces: ["n"] },
    },
    walnutAll(["n"], 2),
  ),

  // --- petrify: one targeted rook -----------------------------------------
  H(
    {
      id: "petrified_towers",
      name: "Petrified Towers",
      description: "Turn one enemy rook you target into a walnut for 2 of their turns: it can only shuffle one square at a time.",
      flavor: "Stone towers do not roll.",
    },
    walnutTarget(2, ["r"]),
  ),

  // --- timed filter: rooks cannot move ------------------------------------
  H(
    {
      id: "anchored_rooks",
      name: "Anchored Rooks",
      description: "Your opponent cannot move their rooks for their next 2 turns.",
      flavor: "Chains bolt the towers to the floor.",
      fx: { motif: "jail", pieces: ["r"] },
    },
    curse(2, (moves) => moves.filter((m) => m.piece !== "r")),
  ),

  // --- timed filter: bishops cannot move ----------------------------------
  H(
    {
      id: "blinkered_bishops",
      name: "Blinkered Bishops",
      description: "Your opponent cannot move their bishops for their next 2 turns.",
      flavor: "The clergy are shut in the vestry.",
      fx: { motif: "jail", pieces: ["b"] },
    },
    curse(2, (moves) => moves.filter((m) => m.piece !== "b")),
  ),

  // --- timed filter: knights cannot move ----------------------------------
  H(
    {
      id: "spooked_steeds",
      name: "Spooked Steeds",
      description: "Your opponent cannot move their knights for their next 2 turns.",
      flavor: "The horses shy at every shadow.",
      fx: { motif: "jail", pieces: ["n"] },
    },
    curse(2, (moves) => moves.filter((m) => m.piece !== "n")),
  ),

  // --- king_only: only the king may move (one turn) -----------------------
  H(
    {
      id: "royal_duty",
      name: "Royal Duty",
      description: "On your opponent's next turn they may move only their king.",
      flavor: "The crown must answer the summons alone.",
      // Board already paints king_only; fx carried for consistency.
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_only", against: api.opp, turns: 1 });
    }),
  ),

  // --- timed filter: one turn of pawn-or-king moves only --------------------
  H(
    {
      id: "wasted_hour",
      name: "Wasted Hour",
      description: "The officers argue all morning: on your opponent's next turn they may only move a pawn or their king.",
      flavor: "The whole camp oversleeps.",
      fx: { motif: "slow", pieces: ["n", "b", "r", "q"] },
    },
    curse(1, (moves) => moves.filter((m) => m.piece === "p" || m.piece === "k")),
  ),

  // --- timed filter: queen short range ------------------------------------
  H(
    { id: "leaden_crown", name: "Leaden Crown", description: "Your opponent's queen slides at most 2 squares for their next 4 turns.", flavor: "The crown weighs heavy.", fx: { motif: "anchor", pieces: ["q"] } },
    curse(4, (moves) => moves.filter((m) => m.piece !== "q" || dist(m.from, m.to) <= 2)),
  ),

  // --- full pawn lock: salted ground roots the infantry in place ----------
  H(
    // Distinct from Pawn Nerf (crossref), which only blocks the pawn ADVANCE
    // and still lets pawns capture, for 3 turns. Salt is the heavier-per-turn
    // but shorter version: it freezes the enemy pawns COMPLETELY (no advance
    // and no capture) for 2 turns. curse() keeps the non-empty fallback so it
    // never soft-locks and ticks exactly the opponent's next 2 turns.
    { id: "sown_salt", name: "Sown Salt", description: "Your opponent's pawns are rooted in salted ground and cannot move at all, not even to capture, for their next 2 turns.", flavor: "Nothing grows in salted fields.", fx: { motif: "anchor", pieces: ["p"] } },
    curse(2, (moves) => moves.filter((m) => m.piece !== "p")),
  ),

  // --- timed filter: the center is a truce zone, no captures there ---------
  H(
    // Not a second No Man's Land (that BARS the center outright): pieces may
    // still cross and occupy the middle, they just cannot take anything there.
    { id: "no_trespass", name: "No Trespass", description: "A truce holds at the crossroads: your opponent cannot capture anything standing on the four center squares (d4, e4, d5, e5) for their next 5 turns.", fx: { motif: "muzzle", pieces: "all" } },
    curse(5, (moves) =>
      moves.filter((m) => {
        const cap = m.capturedSquare ?? (m.captured ? m.to : null);
        if (cap == null) return true;
        return ![SQ(3, 3), SQ(4, 3), SQ(3, 4), SQ(4, 4)].includes(cap);
      }),
    ),
  ),
];
