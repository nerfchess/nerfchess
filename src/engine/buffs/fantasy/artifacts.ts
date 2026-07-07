// Fantasy set: MYTHIC ARTIFACTS. Relics of a lost age: a blade that lets a
// bishop cut like a queen (pieceBound), a war-horn that calls reinforcements
// (placePieces), an orb that dominates an enemy champion (convertEnemies), a
// staff that freezes a foe in time (freeze), an ancient aegis that turns your
// whole army invulnerable (shieldArmy), and a battle-banner that quickens your
// cavalry (timedAugment). Movement grants only ever widen a piece's move list,
// so none of these can soft-lock a turn.

import { Buff } from "./shared";
import {
  card,
  pieceBound,
  placePieces,
  convertEnemies,
  freezeTarget,
  shieldArmy,
  timedAugment,
  slideMoves,
  mySquares,
  myHalfZone,
  ORTHO_DIRS,
  ALL_DIRS,
} from "./shared";

export const FANTASY_ARTIFACTS: Buff[] = [
  card(
    {
      id: "excalibur",
      icon: "Sword",
      name: "Excalibur",
      description:
        "One of your bishops also moves like a rook for the game, giving it full queen movement.",
      tier: 5,
      category: "movement",
      requires: ["b"],
      flavor: "The lake gives up its blade only once.",
      fx: { motif: "empower", pieces: ["b"], moveAs: "q", self: true },
    },
    pieceBound("b", "Choose the bishop to wield Excalibur", (board, sq, via) =>
      slideMoves(board, sq, ORTHO_DIRS, via),
    ),
  ),
  card(
    {
      id: "horn_of_summoning",
      icon: "Music",
      name: "Horn of Summoning",
      description:
        "Place a new knight and a new bishop on empty squares in your half, once.",
      tier: 6,
      category: "pieces",
      flavor: "One long note, and the hills empty toward you.",
    },
    placePieces(["n", "b"], myHalfZone),
  ),
  card(
    {
      id: "orb_of_dominion",
      icon: "Orbit",
      name: "Orb of Dominion",
      description:
        "Take control of one enemy rook or queen for the rest of the game, once. Kings cannot be taken.",
      tier: 7,
      category: "pieces",
      flavor: "Its light pours in through the eyes.",
    },
    convertEnemies(1, ["q", "r"], "Choose an enemy champion to dominate"),
  ),
  card(
    {
      id: "staff_of_stasis",
      icon: "Wand",
      name: "Staff of Stasis",
      description:
        "Tap the Staff of Stasis and lock one enemy piece inside a bubble of frozen time: it cannot move for 3 of their turns. Kings cannot be targeted.",
      tier: 4,
      category: "tempo",
      flavor: "For it, a heartbeat lasts an age.",
    },
    freezeTarget(3, "bubble"),
  ),
  card(
    {
      id: "aegis_of_ages",
      icon: "ShieldPlus",
      name: "Aegis of the Ages",
      description:
        "Lift the ancient aegis and its ward falls over your whole host: none of your pieces can be captured for your opponent's next 2 turns.",
      tier: 7,
      category: "protection",
      flavor: "Forged before the first war, unbroken since.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    shieldArmy(2),
  ),
  card(
    {
      id: "banner_of_war",
      icon: "FlagTriangleRight",
      name: "Banner of War",
      description:
        "Raise the banner and your cavalry surges: for your next 2 turns each of your knights may also step one square in any direction like a king.",
      tier: 3,
      category: "movement",
      requires: ["n"],
      flavor: "Follow the colors and do not look back.",
      fx: { motif: "empower", pieces: ["n"], moveAs: "k", self: true },
    },
    timedAugment(2, (_m, inst, api) =>
      mySquares(api.board, api.me, "n").flatMap((sq) =>
        slideMoves(api.board, sq, ALL_DIRS, inst.id, 1),
      ),
    ),
  ),
];
