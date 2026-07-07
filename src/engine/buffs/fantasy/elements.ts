// Fantasy set: ELEMENTS & CATACLYSM. Raw nature turned to war: a meteor that
// cools into a rook (placePieces), a wall of ice sealing a file (barLine), a
// sinkhole that swallows whoever steps in (voidSquares), a bishop's lightning
// arcing through the ranks (lineSweep), and a fissure that nails the enemy's
// pawns to the ground (no_pawn_advance). Every card reuses a shipped primitive;
// barred squares and no_pawn_advance can never strand the opponent with zero
// moves.

import { Buff } from "./shared";
import {
  card,
  placePieces,
  barLine,
  voidSquares,
  lineSweep,
  addEffect,
  instant,
  anyEmptyZone,
  DIAG_DIRS,
} from "./shared";

export const FANTASY_ELEMENTS: Buff[] = [
  card(
    {
      id: "starfall",
      name: "Starfall",
      description:
        "Place a new rook on any empty square, once.",
      tier: 5,
      category: "pieces",
      flavor: "The crater is still glowing.",
    },
    placePieces(["r"], anyEmptyZone),
  ),
  card(
    {
      id: "frost_wall",
      name: "Frost Wall",
      description:
        "A wall of blue ice erupts from the board: pick any square and its entire file becomes impassable to your opponent for their next 3 turns.",
      tier: 5,
      category: "hex",
      flavor: "Cold enough to stop an army cold.",
      fx: { motif: "blindfold" },
    },
    barLine("file", 3),
  ),
  card(
    {
      id: "sinkhole",
      name: "Sinkhole",
      description:
        "Open two yawning sinkholes on empty squares: the first enemy piece to step onto each one (never a king) plunges out of the game. They stay open the rest of the match.",
      tier: 6,
      category: "attack",
      flavor: "The ground had other plans.",
    },
    voidSquares(2, null),
  ),
  card(
    {
      id: "chain_lightning",
      name: "Chain Lightning",
      description:
        "One bishop captures up to two enemy pieces down a diagonal and lands beyond them, once.",
      tier: 5,
      category: "attack",
      flavor: "It leaps from soul to soul.",
    },
    lineSweep("b", DIAG_DIRS, 2),
  ),
  card(
    {
      id: "fissure_field",
      name: "Fissure Field",
      description:
        "The ground splits into a lattice of fissures across the enemy front: your opponent's pawns cannot advance for their next 4 turns. They may still capture diagonally.",
      tier: 4,
      category: "hex",
      flavor: "Every furrow becomes a chasm.",
      fx: { motif: "anchor", pieces: ["p"] },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "no_pawn_advance", against: api.opp, turns: 4 });
    }),
  ),
];
