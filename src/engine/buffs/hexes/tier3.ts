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
      description: "Turn one enemy knight or bishop you target into a walnut for 2 of their turns.",
      flavor: "One look and the minor turns to stone.",
    },
    walnutTarget(2, ["n", "b"]),
  ),

  // --- petrify all: knights -----------------------------------------------
  H(
    {
      id: "hobbled_cavalry",
      name: "Hobbled Cavalry",
      description: "Your opponent's knights turn to walnuts for 2 of their turns.",
      flavor: "The horses will not stir.",
    },
    walnutAll(["n"], 2),
  ),

  // --- petrify: one targeted rook -----------------------------------------
  H(
    {
      id: "petrified_towers",
      name: "Petrified Towers",
      description: "Turn one enemy rook you target into a walnut for 2 of their turns.",
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
    },
    curse(2, (moves) => moves.filter((m) => m.piece !== "b")),
  ),

  // --- timed filter: queen short range ------------------------------------
  H(
    {
      id: "leaden_queen",
      name: "Leaden Queen",
      description: "Your opponent's queen slides at most 2 squares for their next 3 turns.",
      flavor: "Her gown is sewn with lead.",
    },
    curse(3, (moves) => moves.filter((m) => m.piece !== "q" || dist(m.from, m.to) <= 2)),
  ),

  // --- timed filter: knights cannot move ----------------------------------
  H(
    {
      id: "spooked_steeds",
      name: "Spooked Steeds",
      description: "Your opponent cannot move their knights for their next 2 turns.",
      flavor: "The horses shy at every shadow.",
    },
    curse(2, (moves) => moves.filter((m) => m.piece !== "n")),
  ),

  // --- no_pawn_advance: pawns frozen forward ------------------------------
  H(
    {
      id: "trench_line",
      name: "Trench Line",
      description: "Your opponent's pawns cannot advance for their next 3 turns.",
      flavor: "The infantry are pinned in the mud.",
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 3 });
    }),
  ),

  // --- king_only: only the king may move (one turn) -----------------------
  H(
    {
      id: "royal_duty",
      name: "Royal Duty",
      description: "On your opponent's next turn they may move only their king.",
      flavor: "The crown must answer the summons alone.",
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_only", against: api.opp, turns: 1 });
    }),
  ),

  // --- barred: seal the four center squares -------------------------------
  H(
    {
      id: "no_mans_land",
      name: "No Man's Land",
      description: "Your opponent cannot enter the four center squares (d4, e4, d5, e5) for their next 3 turns.",
      flavor: "The middle of the board is scorched ground.",
    },
    instant((_inst, api) => {
      const squares = [SQ(3, 3), SQ(4, 3), SQ(3, 4), SQ(4, 4)];
      addEffect(api, { kind: "barred", squares, against: api.opp, turns: 3 });
    }),
  ),

  // --- draft denial: block one draft --------------------------------------
  H(
    {
      id: "sealed_orders",
      name: "Sealed Orders",
      description: "Your opponent's next draft is skipped outright, giving them no new card.",
      flavor: "The dispatch never reaches the tent.",
    },
    blockDrafts(1),
  ),

  // --- skip: opponent loses a turn ----------------------------------------
  H(
    {
      id: "wasted_hour",
      name: "Wasted Hour",
      description: "Your opponent skips their next turn.",
      flavor: "The whole camp oversleeps.",
    },
    skipOpponent(1),
  ),
];
