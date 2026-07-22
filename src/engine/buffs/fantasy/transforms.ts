// Fantasy set: LEGENDARY TRANSFORMATIONS. Pieces reforged into something
// greater: a champion raised to godhood as a queen (setPieceType), a king who
// moves with a queen's reach (pieceBound), a rook that unfurls dragon wings
// (pieceBound), a minor piece grown into a tower (setPieceType), a whole rank
// of bishops ascending to queen-lines (permanentAugment), and pawns transmuted
// to gold (setPieceType). Movement grants only widen a piece's move list and
// setPieceType never targets a king, so nothing here can soft-lock.

import { Buff } from "./shared";
import {
  card,
  activated,
  grantInventory,
  transformOwn,
  pieceBound,
  permanentAugment,
  leapMoves,
  slideMoves,
  mySquares,
  DIAG_DIRS,
  ORTHO_DIRS,
  KNIGHT_LEAPS,
  type Square,
  type Mech,
} from "./shared";

// Balance pass: wrap an activated mechanic so resolving it also consumes the
// caster's next unused reroll, if any. The base effect is preserved.
function consumesReroll(base: Mech): Mech {
  const inner = base.effect;
  return {
    ...base,
    effect: (inst, api, picks) => {
      inner?.(inst, api, picks);
      api.mine.rerollsLeft = Math.max(0, (api.mine.rerollsLeft ?? 0) - 1);
    },
  };
}

export const FANTASY_TRANSFORMS: Buff[] = [
  card(
    {
      id: "metamorphosis",
      icon: "RefreshCw",
      name: "Metamorphosis",
      description:
        "Force a violent change of form on one of your own pawns, knights, or bishops: it reshapes itself into a rook, once. Using it consumes your next unused reroll, if you have one.",
      tier: 4,
      category: "pieces",
      requires: ["p", "n", "b"],
      flavor: "Bones crack, and settle into something taller.",
    },
    consumesReroll(
      transformOwn(1, ["p", "n", "b"], "r", "Choose the piece to reshape into a rook"),
    ),
  ),
  card(
    {
      id: "dragon_form",
      icon: "PlaneTakeoff",
      name: "Dragon Form",
      description:
        "One of your rooks unfurls a pair of dragon wings for a single flight: choose a rook; until it next moves it may also slide diagonally like a queen, but the first move it makes, diagonal or straight, folds the wings and spends the charge.",
      tier: 5,
      category: "movement",
      requires: ["r"],
      flavor: "The tower learns to fly.",
      fx: { motif: "empower", pieces: ["r"], moveAs: "q", self: true },
    },
    // Balance pass: keep the diagonal move, but the flight is a single charge.
    // The engine only ever offers the granted move when legal, so a failed
    // attempt cannot occur; instead the charge expires the moment the bound
    // rook next moves, taken (a diagonal flight) or not (a plain rook move).
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the rook to take Dragon Form",
              squares: mySquares(api.board, api.me, "r"),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        inst.state.sq = picks[0]?.square;
        inst.state.charges = 1;
      },
      augmentMoves: (moves, inst, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || ((inst.state.charges as number) ?? 0) <= 0) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type !== "r") return;
        for (const e of slideMoves(api.board, sq, DIAG_DIRS, inst.id)) {
          if (!moves.some((m) => m.from === e.from && m.to === e.to)) moves.push(e);
        }
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        // Bound rook captured or overrun: the wings are gone.
        if (move.capturedSquare === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        if (move.to === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        // The bound rook moved: the single flight is spent, taken or not.
        if (move.from === sq && move.color === api.me) {
          inst.state.charges = 0;
          inst.spent = true;
          inst.state.sq = undefined;
        }
      },
      status: (inst) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return "activate to choose a rook";
        return ((inst.state.charges as number) ?? 0) > 0 ? "wings ready for one flight" : "wings folded";
      },
    },
  ),
  card(
    {
      id: "apotheosis",
      icon: "Trophy",
      name: "Apotheosis",
      description:
        "Raise one of your knights, bishops, or rooks to godhood: it leaves the board for a higher plane, and a queen joins your pocket to descend in its place on a later turn. In exchange, you skip your next draft.",
      tier: 5,
      category: "pieces",
      requires: ["n", "b", "r"],
      flavor: "Mortal one moment, divine the next.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the piece to raise to godhood",
              squares: mySquares(api.board, api.me).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b" || t === "r";
              }),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const t = api.board.pieces[sq]?.type;
        if (t !== "n" && t !== "b" && t !== "r") return;
        api.removePiece(sq, { uncounted: true });
        grantInventory(api, "q", 1);
        // Balance pass: ascending costs you your next draft.
        api.mine.flags.blockedDrafts = (api.mine.flags.blockedDrafts ?? 0) + 1;
      },
    ),
  ),
  card(
    {
      id: "god_king",
      icon: "Church",
      name: "God-King",
      description:
        "Your king walks between heartbeats: it may also leap like a knight, for the rest of the game.",
      tier: 6,
      category: "movement",
      flavor: "The throne goes where it pleases now.",
      fx: { motif: "empower", pieces: ["k"], moveAs: "n", self: true },
    },
    permanentAugment((_m, inst, api) =>
      mySquares(api.board, api.me, "k").flatMap((sq) =>
        leapMoves(api.board, sq, KNIGHT_LEAPS, inst.id),
      ),
    ),
  ),
  card(
    {
      id: "celestial_ascension",
      icon: "Sunrise",
      name: "Celestial Ascension",
      description:
        "Your bishops ascend to a higher plane: for the game every one of them also moves in straight lines like a rook, wielding a queen's full reach.",
      tier: 7,
      category: "movement",
      requires: ["b"],
      flavor: "The whole clergy takes wing at once.",
      fx: { motif: "empower", pieces: ["b"], moveAs: "q", self: true },
    },
    permanentAugment((_m, inst, api) =>
      mySquares(api.board, api.me, "b").flatMap((sq) =>
        slideMoves(api.board, sq, ORTHO_DIRS, inst.id),
      ),
    ),
  ),
  card(
    {
      id: "philosophers_stone",
      icon: "FlaskConical",
      name: "Philosopher's Stone",
      description:
        "Press the fabled stone to your ranks and transmute base metal to gold: three of your pawns become queens, once.",
      tier: 9,
      category: "pieces",
      requires: ["p"],
      flavor: "The final work of a thousand alchemists.",
    },
    transformOwn(3, ["p"], "q", "Choose a pawn to transmute to gold"),
  ),
];
