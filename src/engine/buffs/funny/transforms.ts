// Funny set: TRANSFORMATIONS & PIECE POWERS. Each reuses an existing movement
// primitive (pieceBound, permanentAugment) or a conditional passive modeled on
// the library's trade_up card. Nothing here touches a king's move legality in a
// way that could soft-lock: added moves only widen the move list.

import { Buff, Square } from "./shared";
import {
  card,
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

/** The hill: the four central squares (d4, e4, d5, e5) plus the ring of
 * squares directly around them (the extended center, c3 to f6). */
const onHill = (sq: number) =>
  FILE(sq) >= 2 && FILE(sq) <= 5 && RANK(sq) >= 2 && RANK(sq) <= 5;

export const FUNNY_TRANSFORMS: Buff[] = [
  card(
    {
      id: "amazon",
      icon: "Crown",
      name: "Amazon",
      description: "Your queen is crowned an Amazon: for the game she also moves like a knight.",
      tier: 7,
      category: "movement",
      requires: ["q"],
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
      icon: "Flag",
      name: "King of the Hill",
      description: "Your king rules the hill: while it stands on or beside one of the four center squares it may move like a queen, though those extended queen moves cannot capture.",
      tier: 4,
      category: "movement",
      flavor: "Plant the flag and hold the high ground.",
      fx: { motif: "empower", pieces: ["k"], moveAs: "q", self: true },
    },
    permanentAugment((_m, inst, api) =>
      mySquares(api.board, api.me, "k").flatMap((sq) =>
        // The king rules the hill by moving like a queen, but those extended
        // queen moves cannot capture: drop any that land on an enemy piece.
        onHill(sq)
          ? slideMoves(api.board, sq, ALL_DIRS, inst.id).filter((m) => !m.captured)
          : [],
      ),
    ),
  ),
  card(
    {
      id: "understudy",
      icon: "Drama",
      name: "Understudy",
      description: "The first time your queen is captured, one of your bishops, or a knight if you have no bishop, immediately turns into a queen on its own square. If you have neither, nothing happens. Triggers once.",
      tier: 4,
      category: "pieces",
      flavor: "Spotlight, and a bow.",
    },
    {
      kind: "passive",
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp || move.captured !== "q") return;
        // The understudy is a bishop, or a knight when the bishops are gone.
        const b =
          mySquares(api.board, api.me, "b")[0] ?? mySquares(api.board, api.me, "n")[0];
        if (b != null) api.setPieceType(b, "q");
        inst.spent = true;
      },
      status: () => "waiting in the wings",
    },
  ),
  card(
    {
      id: "clone",
      icon: "Copy",
      name: "Clone",
      description: "Run one of your pawns through the photocopier: place an exact copy on an empty square beside it, once.",
      tier: 3,
      category: "pieces",
      requires: ["p"],
      flavor: "Flash. Now there are two.",
    },
    activated(
      (_inst, api, picks) => {
        // The copy tray reaches only the adjacent ring, one square in every
        // direction (it used to reach two).
        const adj = (sq: number) => {
          const out: number[] = [];
          for (let df = -1; df <= 1; df++) {
            for (let dr = -1; dr <= 1; dr++) {
              if (df === 0 && dr === 0) continue;
              const f = FILE(sq) + df, r = RANK(sq) + dr;
              if (f < 0 || f > 7 || r < 0 || r > 7) continue;
              const to = SQ(f, r);
              if (!api.board.pieces[to] && pawnRankOk(to)) out.push(to);
            }
          }
          return out;
        };
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
