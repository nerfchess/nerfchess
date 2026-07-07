// Fantasy set: DRAGONS & BEASTS. Great monsters that either tear a line through
// the enemy (lineSweep, the same primitive as Cavalry Charge), turn a foe to
// stone (petrify/walnut), carry your own pieces across the board (relocate), or
// arrive as reinforcements (placePieces / summonTemp). Nothing here touches a
// king's move legality in a way that could soft-lock; the petrify helpers never
// target a king.

import { Buff } from "./shared";
import {
  card,
  lineSweep,
  petrifyTarget,
  walnutAll,
  relocateAnywhere,
  summonTemp,
  placePieces,
  myHalfZone,
  ORTHO_DIRS,
  ALL_DIRS,
} from "./shared";

export const FANTASY_BEASTS: Buff[] = [
  card(
    {
      id: "dragons_breath",
      icon: "FlameKindling",
      name: "Dragon's Breath",
      description:
        "One rook captures every enemy piece in a straight line in a single move, once.",
      tier: 5,
      category: "attack",
      flavor: "Everything in the corridor turns to ash.",
    },
    lineSweep("r", ORTHO_DIRS, null),
  ),
  card(
    {
      id: "wyverns_dive",
      icon: "Feather",
      name: "Wyvern's Dive",
      description:
        "A wyvern folds its wings and dives: one of your knights streaks in a straight line, snatches the first enemy piece it reaches, and lands just beyond, once.",
      tier: 4,
      category: "attack",
      flavor: "The shriek comes a heartbeat before the talons.",
    },
    lineSweep("n", ALL_DIRS, 1),
  ),
  card(
    {
      id: "basilisk_stare",
      icon: "Eye",
      name: "Basilisk's Stare",
      description:
        "Freeze one enemy piece for 3 of their turns. Kings cannot be targeted.",
      tier: 3,
      category: "hex",
      flavor: "Do not, under any circumstance, look back.",
      fx: { motif: "jail" },
    },
    petrifyTarget(3, "Choose an enemy piece to turn to stone"),
  ),
  card(
    {
      id: "serpent_brood",
      icon: "Worm",
      name: "Serpent Brood",
      description:
        "A brood of stone serpents coils around the enemy clergy: every one of your opponent's bishops turns to a statue for 3 of their turns.",
      tier: 4,
      category: "hex",
      flavor: "Marble scales, and not a single blink.",
      fx: { motif: "jail", pieces: ["b"] },
    },
    walnutAll(["b"], 3),
  ),
  card(
    {
      id: "griffon_rider",
      icon: "Bird",
      name: "Griffon Rider",
      description:
        "Move one of your pieces to any empty square, once.",
      tier: 5,
      category: "movement",
      flavor: "Hold on tight and mind the updraft.",
    },
    relocateAnywhere(
      "Choose the piece the griffon lifts",
      "Choose the empty square it is carried to",
    ),
  ),
  card(
    {
      id: "direwolf_pack",
      icon: "PawPrint",
      name: "Direwolf Pack",
      description:
        "A spectral direwolf answers your howl and hunts at your side as a knight for 5 of your turns, then melts back into the mist.",
      tier: 4,
      category: "pieces",
      flavor: "The pack always returns to the wild.",
    },
    summonTemp("n", 5, myHalfZone),
  ),
  card(
    {
      id: "roost_of_rocs",
      icon: "Egg",
      name: "Roost of Rocs",
      description:
        "Two titanic rocs descend from the mountain roost and settle into your ranks as knights: place them on empty squares in your half, once.",
      tier: 6,
      category: "pieces",
      flavor: "Their shadows blot out the board.",
    },
    placePieces(["n", "n"], myHalfZone),
  ),
];
