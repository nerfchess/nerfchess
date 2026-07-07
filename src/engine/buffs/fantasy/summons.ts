// Fantasy set: SUMMONING. Call things onto the board: a dragon that lands as a
// queen (placePieces), a phantom guardian and a stone golem that serve for a
// while and then fade (summonTemp), a wall of living thorns that seals the
// squares around a point (barred neighbors), a full warband from a summoning
// circle (placePieces), and a humble imp familiar (placePieces). placePieces
// refuses to drop a pawn on an illegal rank, and the barred wall is partial, so
// nothing here can soft-lock a turn.

import { Buff } from "./shared";
import {
  card,
  placePieces,
  summonTemp,
  barNeighbors,
  myHalfZone,
} from "./shared";

export const FANTASY_SUMMONS: Buff[] = [
  card(
    {
      id: "imp_familiar",
      name: "Imp Familiar",
      description:
        "Place a new pawn on any empty square in your half, once.",
      tier: 2,
      category: "pieces",
      flavor: "It is mostly loyal and entirely smug.",
    },
    placePieces(["p"], myHalfZone),
  ),
  card(
    {
      id: "phantom_guardian",
      name: "Phantom Guardian",
      description:
        "Call up a phantom guardian that fights beside you as a bishop for 4 of your turns, then dissolves back into the aether.",
      tier: 4,
      category: "pieces",
      flavor: "Half here, half somewhere colder.",
    },
    summonTemp("b", 4, myHalfZone),
  ),
  card(
    {
      id: "wall_of_thorns",
      name: "Wall of Thorns",
      description:
        "A thicket of living thorns bursts up around an empty square: your opponent cannot enter any of the 8 squares around it for their next 3 turns.",
      tier: 5,
      category: "hex",
      flavor: "Every branch is a spear.",
      fx: { motif: "blindfold" },
    },
    barNeighbors(3, "Choose the empty square the thorns burst from"),
  ),
  card(
    {
      id: "stone_golem",
      name: "Stone Golem",
      description:
        "Bind a spirit into rock and stone: a lumbering golem serves as a rook for 5 of your turns, then crumbles back to rubble.",
      tier: 5,
      category: "pieces",
      flavor: "Slow, patient, and extremely heavy.",
    },
    summonTemp("r", 5, myHalfZone),
  ),
  card(
    {
      id: "summoning_circle",
      name: "Summoning Circle",
      description:
        "Chalk a summoning circle and a whole warband answers: place a new knight, a new bishop, and a new pawn on empty squares in your half, once.",
      tier: 7,
      category: "pieces",
      flavor: "Three names spoken, three shapes stepping through.",
    },
    placePieces(["n", "b", "p"], myHalfZone),
  ),
  card(
    {
      id: "summon_dragon",
      name: "Summon Dragon",
      description:
        "Place a new queen on any empty square in your half, once.",
      tier: 7,
      category: "pieces",
      flavor: "The oldest thing on the board, and the hungriest.",
    },
    placePieces(["q"], myHalfZone),
  ),
];
