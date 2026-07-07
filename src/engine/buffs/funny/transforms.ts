// Funny set: TRANSFORMATIONS & PIECE POWERS. Each reuses an existing movement
// primitive (pieceBound, permanentAugment) or a conditional passive modeled on
// the library's trade_up card. Nothing here touches a king's move legality in a
// way that could soft-lock: added moves only widen the move list.

import { Buff } from "./shared";
import {
  card,
  pieceBound,
  permanentAugment,
  activated,
  slideMoves,
  leapMoves,
  mySquares,
  pawnRankOk,
  ALL_DIRS,
  KNIGHT_LEAPS,
  FILE,
  RANK,
  SQ,
} from "./shared";

/** The four central squares (d4, e4, d5, e5). */
const CENTER = [SQ(3, 3), SQ(4, 3), SQ(3, 4), SQ(4, 4)];

export const FUNNY_TRANSFORMS: Buff[] = [
  card(
    {
      id: "amazon",
      name: "Amazon",
      description: "Your queen is crowned an Amazon: for the game she also moves like a knight.",
      tier: 7,
      category: "movement",
      flavor: "Queen was not scary enough already.",
      fx: { motif: "empower", pieces: ["q"], moveAs: "n", self: true },
    },
    pieceBound("q", "Choose the queen to crown", (board, sq, via) =>
      leapMoves(board, sq, KNIGHT_LEAPS, via),
    ),
  ),
  card(
    {
      id: "king_of_the_hill",
      name: "King of the Hill",
      description: "Your king rules the hill: while it stands on one of the four center squares it may move like a queen.",
      tier: 6,
      category: "movement",
      flavor: "Plant the flag and hold the high ground.",
      fx: { motif: "empower", pieces: ["k"], moveAs: "q", self: true },
    },
    permanentAugment((_m, inst, api) =>
      mySquares(api.board, api.me, "k").flatMap((sq) =>
        CENTER.includes(sq) ? slideMoves(api.board, sq, ALL_DIRS, inst.id) : [],
      ),
    ),
  ),
  card(
    {
      id: "understudy",
      name: "Understudy",
      description: "The show must go on: if your queen is ever captured, one of your bishops is promoted to a queen in her place.",
      tier: 5,
      category: "pieces",
      flavor: "Spotlight, and a bow.",
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp || move.captured !== "q") return;
        const b = mySquares(api.board, api.me, "b")[0];
        if (b != null) api.setPieceType(b, "q");
        inst.spent = true;
      },
      status: () => "waiting in the wings",
    },
  ),
  card(
    {
      id: "clone",
      name: "Clone",
      description: "Run one of your pawns through the photocopier: place an exact copy on an empty square beside it, once.",
      tier: 6,
      category: "pieces",
      flavor: "Flash. Now there are two.",
    },
    activated(
      (_inst, api, picks) => {
        const adj = (sq: number) =>
          ALL_DIRS.flatMap(([df, dr]) => {
            const f = FILE(sq) + df, r = RANK(sq) + dr;
            if (f < 0 || f > 7 || r < 0 || r > 7) return [];
            const to = SQ(f, r);
            return !api.board.pieces[to] && pawnRankOk(to) ? [to] : [];
          });
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose a pawn to clone",
            squares: mySquares(api.board, api.me, "p").filter((sq) => adj(sq).length > 0),
          };
        }
        if (picks.length === 1) {
          return {
            kind: "square",
            label: "Choose the empty square for the copy",
            squares: adj(picks[0].square!),
          };
        }
        return null;
      },
      (_inst, api, picks) => {
        const to = picks[1]?.square;
        if (to != null && !api.board.pieces[to] && pawnRankOk(to)) {
          api.place(to, "p", api.me);
        }
      },
    ),
  ),
];
