// Fantasy set: SUMMONING. A dragon (queen), a warband from a summoning circle
// (knight + bishop + pawn), and a humble imp familiar (pawn) are banked into
// your crazyhouse-style pocket (grantInventory, a free instant): you draft them
// now and spend a later turn to DROP each onto an empty square, so the summon
// costs no move. A phantom guardian and a stone golem instead serve for a while
// and then fade (summonTemp), and a wall of living thorns seals the squares
// around a point (barred neighbors). The engine's drop generator refuses to
// drop a pawn on rank 1 or 8, and the barred wall is partial, so nothing here
// can soft-lock a turn.

import { Buff } from "./shared";
import {
  card,
  summonTemp,
  barNeighbors,
  myHalfZone,
  grantInventory,
  instant,
} from "./shared";

export const FANTASY_SUMMONS: Buff[] = [
  card(
    {
      id: "imp_familiar",
      icon: "Cat",
      name: "Imp Familiar",
      description:
        "A new pawn joins your pocket. Later, spend a turn to drop it onto any empty square.",
      tier: 2,
      category: "pieces",
      flavor: "It is mostly loyal and entirely smug.",
    },
    instant((_inst, api) => grantInventory(api, "p", 1)),
  ),
  card(
    {
      id: "phantom_guardian",
      icon: "ShieldHalf",
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
      icon: "Fence",
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
      icon: "Blocks",
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
      icon: "Hexagon",
      name: "Summoning Circle",
      description:
        "Chalk a summoning circle and a whole warband answers: a new knight, bishop, and pawn arrive in your pocket, ready to drop onto empty squares on later turns.",
      tier: 7,
      category: "pieces",
      flavor: "Three names spoken, three shapes stepping through.",
    },
    instant((_inst, api) => {
      grantInventory(api, "n", 1);
      grantInventory(api, "b", 1);
      grantInventory(api, "p", 1);
    }),
  ),
  card(
    {
      id: "summon_dragon",
      icon: "Sparkle",
      name: "Summon Dragon",
      description:
        "A new queen joins your pocket. Later, spend a turn to drop it onto any empty square.",
      tier: 7,
      category: "pieces",
      flavor: "The oldest thing on the board, and the hungriest.",
    },
    instant((_inst, api) => grantInventory(api, "q", 1)),
  ),
];
