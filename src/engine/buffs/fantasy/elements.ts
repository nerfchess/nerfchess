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
  grantInventory,
  curse,
  emptySquares,
  inHalf,
  lineSweep,
  mySquares,
  addEffect,
  instant,
  DIAG_DIRS,
  FILE,
  RANK,
  SQ,
  inBoard,
  type Square,
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
  const base = lineSweep("b", DIAG_DIRS, 3);
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
        "A rook crashes down into your pocket: drop it onto any empty square on a later turn.",
      tier: 5,
      category: "pieces",
      flavor: "The crater is still glowing.",
    },
    // Balance pass: the star-iron pawn no longer lands, one fewer spawned piece.
    instant((_inst, api) => {
      grantInventory(api, "r", 1);
    }),
  ),
  card(
    {
      id: "frost_wall",
      icon: "Snowflake",
      name: "Frost Wall",
      description:
        "A wall of blue ice seals the keep: your opponent cannot move any piece onto your back two ranks for their next 4 turns.",
      tier: 5,
      category: "hex",
      flavor: "Cold enough to stop an army cold.",
      fx: { motif: "blindfold" },
    },
    instant((_inst, api) => {
      const ranks = api.me === "w" ? [0, 1] : [6, 7];
      const squares = ranks.flatMap((r) => Array.from({ length: 8 }, (_, f) => SQ(f, r)));
      addEffect(api, { kind: "barred", squares, against: api.opp, turns: 4 });
    }),
  ),
  card(
    {
      id: "sinkhole",
      icon: "ArrowDownToLine",
      name: "Sinkhole",
      description:
        "The earth chooses where to open: three sinkholes appear on random empty squares in your opponent's half. Any enemy piece except a king that steps onto one plunges out of the game. They stay open the rest of the match.",
      tier: 5,
      category: "attack",
      flavor: "The ground had other plans.",
    },
    {
      kind: "passive",
      // The three squares are drawn from the seeded api.rng at acquire time,
      // so every replica opens the identical sinkholes (desync-safe).
      init: (inst, api) => {
        const empties = emptySquares(api.board, (sq) => !inHalf(api.me, sq));
        const chosen: Square[] = [];
        for (let i = 0; i < 3 && empties.length > 0; i++) {
          const idx = api.rng.int(empties.length);
          chosen.push(empties.splice(idx, 1)[0]);
        }
        inst.state.squares = chosen;
      },
      onMovePlayed: (inst, move, api) => {
        const squares = inst.state.squares as Square[] | undefined;
        if (!squares?.length) return;
        if (move.color === api.opp && squares.includes(move.to) && move.piece !== "k") {
          api.removePiece(move.to);
        }
      },
      status: (inst) => {
        const squares = inst.state.squares as Square[] | undefined;
        if (!squares?.length) return null;
        const names = squares.map((sq) => `${"abcdefgh"[FILE(sq)]}${RANK(sq) + 1}`).join(", ");
        return `sinkholes at ${names}`;
      },
    },
  ),
  card(
    {
      id: "chain_lightning",
      icon: "Zap",
      name: "Chain Lightning",
      description:
        "One bishop captures up to three enemy pieces down a diagonal and lands beyond them; the bolt then jumps on to freeze the next enemy piece further along that diagonal for 2 of their turns, once.",
      tier: 4,
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
        "The ground splits open behind the enemy army: your opponent cannot move any piece onto their own back rank for their next 4 turns.",
      tier: 5,
      category: "hex",
      flavor: "There is no falling back over a chasm.",
      fx: { motif: "blindfold" },
    },
    curse(4, (moves, api) =>
      moves.filter((m) => RANK(m.to) !== (api.opp === "w" ? 0 : 7)),
    ),
  ),
];
