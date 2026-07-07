// Funny set: CHAOS & BOARD EFFECTS that map onto existing removal / zoning
// primitives. Roulette reuses the seeded RNG + removePiece (like Scout's init).
// Minefield and Trapdoor reuse voidSquares (remove an enemy that steps onto a
// marked square; kings are spared by the helper). Kraken and Lava Floor reuse
// barred squares (barLine / addEffect), the same mechanic the sealed-file hexes
// already ship, so the opening can never be barred into a soft-lock.

import { Buff } from "./shared";
import {
  card,
  instant,
  voidSquares,
  barLine,
  activated,
  addEffect,
  emptySquares,
  mySquares,
  ALL_DIRS,
  FILE,
  RANK,
  SQ,
  inBoard,
} from "./shared";

export const FUNNY_CHAOS: Buff[] = [
  card(
    {
      id: "roulette",
      icon: "Dices",
      name: "Roulette",
      description: "Spin the wheel: one random enemy piece other than the king is removed from the board.",
      tier: 5,
      category: "attack",
      flavor: "Round and round she goes.",
    },
    instant((_inst, api) => {
      const targets = mySquares(api.board, api.opp).filter(
        (sq) => api.board.pieces[sq]!.type !== "k",
      );
      if (targets.length) api.removePiece(targets[api.rng.int(targets.length)]);
    }),
  ),
  card(
    {
      id: "trapdoor",
      icon: "DoorOpen",
      name: "Trapdoor",
      description: "Open a trapdoor on an empty square. For your next 3 turns, any enemy piece except a king that moves onto that square is removed from the game.",
      tier: 4,
      category: "attack",
      flavor: "Mind the gap.",
    },
    voidSquares(1, 3),
  ),
  card(
    {
      id: "minefield",
      icon: "Bomb",
      name: "Minefield",
      description: "Seed three mines on empty squares. The first enemy piece, never the king, to step on a mine is destroyed.",
      tier: 6,
      category: "attack",
      flavor: "Click... uh oh.",
    },
    voidSquares(3, null),
  ),
  card(
    {
      id: "kraken",
      icon: "Fish",
      name: "Kraken",
      description: "A kraken surfaces on an empty square: your opponent cannot enter any of the 8 squares around it for their next 2 turns.",
      tier: 6,
      category: "hex",
      flavor: "Release the tentacles.",
      fx: { motif: "blindfold" },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the empty square the kraken rises on",
              squares: emptySquares(api.board),
            },
      (_inst, api, picks) => {
        const c = picks[0]?.square;
        if (c == null) return;
        const squares: number[] = [];
        for (const [df, dr] of ALL_DIRS) {
          const f = FILE(c) + df, r = RANK(c) + dr;
          if (inBoard(f, r)) squares.push(SQ(f, r));
        }
        if (squares.length) {
          addEffect(api, { kind: "barred", squares, against: api.opp, turns: 2 });
        }
      },
    ),
  ),
  card(
    {
      id: "lava_floor",
      icon: "Flame",
      name: "Lava Floor",
      description: "A whole rank erupts into lava: pick any square and its entire rank becomes impassable to your opponent for their next 3 turns.",
      tier: 5,
      category: "hex",
      flavor: "The floor is, in fact, lava.",
      fx: { motif: "blindfold" },
    },
    barLine("rank", 3),
  ),
];
