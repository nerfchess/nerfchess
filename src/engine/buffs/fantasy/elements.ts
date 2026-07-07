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
  FILE,
  RANK,
  SQ,
  inBoard,
  type Mech,
  type BuffInstance,
  type BuffApi,
  type BuffPick,
} from "./shared";

// Chain Lightning reuses lineSweep's diagonal capture sweep (so it never
// reimplements ray logic), then adds its signature: after the bishop lands, the
// bolt jumps past it to the next enemy piece on the SAME diagonal and freezes it
// for 2 turns. That chained freeze is what sets it apart from the plain diagonal
// sweeps (Unmake, Arc Lightning). Every step is a pure read of the post-sweep
// board, so it replays identically on both clients.
function chainLightningSweep(): Mech {
  const base = lineSweep("b", DIAG_DIRS, 2);
  return {
    ...base,
    effect: (inst: BuffInstance, api: BuffApi, picks: BuffPick[]) => {
      base.effect?.(inst, api, picks);
      const from = picks[0]?.square;
      const to = picks[1]?.square;
      if (from == null || to == null || from === to) return;
      const df = Math.sign(FILE(to) - FILE(from));
      const dr = Math.sign(RANK(to) - RANK(from));
      let f = FILE(to) + df;
      let r = RANK(to) + dr;
      while (inBoard(f, r)) {
        const sq = SQ(f, r);
        const p = api.board.pieces[sq];
        if (p) {
          if (p.color === api.opp && p.type !== "k") {
            addEffect(api, { kind: "freeze", sq, owner: api.opp, turns: 2, skin: "shock" });
          }
          break;
        }
        f += df;
        r += dr;
      }
    },
  };
}

export const FANTASY_ELEMENTS: Buff[] = [
  card(
    {
      id: "starfall",
      icon: "Star",
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
      icon: "Snowflake",
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
      icon: "ArrowDownToLine",
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
      icon: "Zap",
      name: "Chain Lightning",
      description:
        "One bishop captures up to two enemy pieces down a diagonal and lands beyond them; the bolt then jumps on to freeze the next enemy piece further along that diagonal for 2 of their turns, once.",
      tier: 5,
      category: "attack",
      requires: ["b"],
      flavor: "It leaps from soul to soul.",
    },
    chainLightningSweep(),
  ),
  card(
    {
      id: "fissure_field",
      icon: "Split",
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
