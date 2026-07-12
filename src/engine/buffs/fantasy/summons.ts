// Fantasy set: SUMMONING. A dragon (queen), a warband from a summoning circle
// (knight + bishop + pawn), and a humble imp familiar (pawn) are banked into
// your crazyhouse-style pocket (grantInventory, a free instant): you draft them
// now and spend a later turn to DROP each onto an empty square, so the summon
// costs no move. A phantom guardian and a stone golem instead serve for a while
// and then fade (summonTemp), and a wall of living thorns seals the squares
// around a point (barred neighbors). The engine's drop generator refuses to
// drop a pawn on rank 1 or 8, and the barred wall is partial, so nothing here
// can soft-lock a turn.

import { Buff, Square } from "./shared";
import {
  card,
  summonTemp,
  barNeighbors,
  myHalfZone,
  anyEmptyZone,
  backRankZone,
  emptySquares,
  explodeAt,
  captureSquare,
  FILE,
  RANK,
} from "./shared";

export const FANTASY_SUMMONS: Buff[] = [
  card(
    {
      id: "imp_familiar",
      icon: "Cat",
      name: "Imp Familiar",
      description:
        "A smug little imp perches on an empty square of your back rank and fights as a bishop for 3 of your turns, then scampers back through the veil.",
      tier: 2,
      category: "pieces",
      flavor: "Mostly loyal and entirely smug.",
    },
    summonTemp("b", 3, backRankZone),
  ),
  card(
    {
      id: "phantom_guardian",
      icon: "ShieldHalf",
      name: "Phantom Guardian",
      description:
        "Call up a phantom guardian that fights beside you as a bishop for 5 of your turns, then dissolves back into the aether.",
      tier: 4,
      category: "pieces",
      flavor: "Half here, half somewhere colder.",
    },
    summonTemp("b", 5, myHalfZone),
  ),
  card(
    {
      id: "wall_of_thorns",
      icon: "Fence",
      name: "Wall of Thorns",
      description:
        "A thicket of undying thorns bursts up around an empty square: your opponent can never enter any of the 8 squares around it, for the rest of the game.",
      tier: 6,
      category: "hex",
      flavor: "Every branch is a spear, and none of them wither.",
      fx: { motif: "blindfold" },
    },
    // 999 turns: outlasts any realistic game, so the card reads "for the game".
    barNeighbors(999, "Choose the empty square the thorns burst from"),
  ),
  card(
    {
      id: "stone_golem",
      icon: "Blocks",
      name: "Stone Golem",
      description:
        "Bind a spirit into rock and stone: a lumbering golem serves as a rook for 6 of your turns, then crumbles back to rubble.",
      tier: 5,
      category: "pieces",
      flavor: "Slow, patient, and extremely heavy.",
    },
    summonTemp("r", 6, myHalfZone),
  ),
  card(
    {
      id: "summoning_circle",
      icon: "Hexagon",
      name: "Summoning Circle",
      description:
        "Chalk the circle and speak a greater name: a summoned queen steps through onto any empty square and serves for 6 of your turns before the circle pulls her back.",
      tier: 8,
      category: "pieces",
      flavor: "One name spoken, and the candles all lean away.",
    },
    summonTemp("q", 6, anyEmptyZone),
  ),
  card(
    {
      id: "summon_dragon",
      icon: "Sparkle",
      name: "Summon Dragon",
      description:
        "An actual dragon answers: place a new queen on an empty square in your half. Whenever she captures, she breathes fire: every enemy piece except a king on the 8 squares around her kill is also removed. Shielded pieces resist the flame.",
      tier: 7,
      category: "pieces",
      flavor: "The oldest thing on the board, and the hungriest.",
    },
    {
      kind: "activated",
      spendOnUse: false,
      // One activation only: one dragon per horn call.
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose where the dragon lands",
              squares: emptySquares(api.board, myHalfZone(api)),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        api.place(sq, "q", api.me);
        inst.state.sq = sq;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        // Follow the dragon; the buff retires when she is slain.
        if (move.to === sq && move.from !== sq) {
          inst.spent = true;
          return;
        }
        if (move.from === sq) {
          inst.state.sq = move.to;
          if (move.color === api.me && move.captured && move.captured !== "k") {
            explodeAt(api, captureSquare(move) ?? move.to);
          }
        }
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        return sq == null
          ? "activate to summon the dragon"
          : `dragon at ${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`;
      },
    },
  ),
];
