// Fantasy set: GODS & THE DIVINE. Interventions of higher powers: a warding of
// the crown (king_safe), a bolt of judgment that smites enemy pieces
// (removeEnemies) and petrifies the nearest survivor (walnut), a resurrection of
// the fallen (reviveOne), a divine command that turns a foe to your side and
// shields the defection (setPieceColor + shield), and a decree that pins the
// enemy court in place and nullifies their next draft (king_only +
// nullifyIncoming). Every effect reuses an existing primitive and respects the
// rails: kings are never removed, frozen, petrified, or converted.

import { Buff } from "./shared";
import {
  card,
  addEffect,
  removeEnemies,
  reviveOne,
  activated,
  instant,
  myHalfZone,
  mySquares,
  slideMoves,
  leapMoves,
  ALL_DIRS,
  ORTHO_DIRS,
  DIAG_DIRS,
  KNIGHT_LEAPS,
  FILE,
  RANK,
  SQ,
  inBoard,
  type BoardState,
  type Square,
} from "./shared";

// Does the piece on `from` attack `kingSq` from where it now stands? Divine
// Intervention uses it to reflect the first enemy piece to strike at the warded
// king clean off the board. It reuses the very move generators the engine uses,
// so a hit it sees is exactly a move that could capture the king (a check).
function attacksKing(board: BoardState, from: Square, kingSq: Square): boolean {
  const p = board.pieces[from];
  if (!p) return false;
  switch (p.type) {
    case "q":
      return slideMoves(board, from, ALL_DIRS, "x").some((m) => m.to === kingSq);
    case "r":
      return slideMoves(board, from, ORTHO_DIRS, "x").some((m) => m.to === kingSq);
    case "b":
      return slideMoves(board, from, DIAG_DIRS, "x").some((m) => m.to === kingSq);
    case "n":
      return leapMoves(board, from, KNIGHT_LEAPS, "x").some((m) => m.to === kingSq);
    case "k":
      return slideMoves(board, from, ALL_DIRS, "x", 1).some((m) => m.to === kingSq);
    case "p": {
      const r = RANK(from) + (p.color === "w" ? 1 : -1);
      return [FILE(from) - 1, FILE(from) + 1].some(
        (f) => inBoard(f, r) && SQ(f, r) === kingSq,
      );
    }
  }
  return false;
}

export const FANTASY_DIVINE: Buff[] = [
  card(
    {
      id: "divine_intervention",
      icon: "Sun",
      name: "Divine Intervention",
      description:
        "Your king cannot be captured for your opponent's next 3 turns, and the first enemy piece to strike at your king in that time is hurled clean off the board. Kings are never banished.",
      tier: 5,
      category: "protection",
      flavor: "Not today, the heavens say.",
      fx: { motif: "ward", pieces: ["k"], self: true },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 3;
        addEffect(api, { kind: "king_safe", owner: api.me, turns: 3 });
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        const kingSq = mySquares(api.board, api.me, "k")[0];
        const striker = api.board.pieces[move.to];
        if (
          kingSq != null &&
          move.to !== kingSq &&
          striker != null &&
          striker.type !== "k" &&
          attacksKing(api.board, move.to, kingSq)
        ) {
          // The strike is turned back on its author: the first enemy piece to
          // threaten the warded king is reflected clean off the board, and the
          // miracle is spent. Kings are never banished (they simply find the
          // crown uncapturable); the ward then lives out its own timer.
          api.removePiece(move.to);
          inst.spent = true;
          return;
        }
        const left = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = left;
        if (left <= 0) inst.spent = true;
      },
      status: (inst) =>
        ((inst.state.turns as number) ?? 0) > 0 ? "the heavens turn them away" : null,
    },
  ),
  card(
    {
      id: "judgment_day",
      icon: "Scale",
      name: "Judgment Day",
      description:
        "A pillar of holy light smites one enemy knight, bishop, rook, or queen you name, then petrifies the two enemy pieces nearest the impact into stone for the rest of the game. Kings are never petrified.",
      tier: 6,
      category: "attack",
      flavor: "Weighed, measured, and found wanting; the stone is left to mark the spot.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy knight, bishop, rook, or queen to smite",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b" || t === "r" || t === "q";
              }),
            },
      (_inst, api, picks) => {
        const target = picks[0]?.square;
        if (target == null) return;
        api.removePiece(target);
        // The pillar leaves monuments: the two nearest surviving enemy pieces
        // are petrified to walnuts for the rest of the game (never a king).
        // Nearest is Chebyshev distance; the sort tie-breaks on the lower
        // square index, so both picks are deterministic. A pure read of the
        // board, so it replays identically.
        const nearest = mySquares(api.board, api.opp)
          .filter((sq) => api.board.pieces[sq]!.type !== "k")
          .map((sq) => ({
            sq,
            d: Math.max(
              Math.abs(FILE(sq) - FILE(target)),
              Math.abs(RANK(sq) - RANK(target)),
            ),
          }))
          .sort((a, b) => a.d - b.d || a.sq - b.sq)
          .slice(0, 2);
        for (const { sq } of nearest) {
          addEffect(api, { kind: "walnut", sq, owner: api.opp, turns: 99 });
        }
      },
    ),
  ),
  card(
    {
      id: "hallowed_return",
      icon: "Sparkles",
      name: "Hallowed Return",
      description:
        "A prayer is answered: one of your captured knights, bishops, or rooks is restored to life on an empty square in your half, once.",
      tier: 3,
      category: "pieces",
      flavor: "Called back from the far shore.",
    },
    reviveOne(["r", "b", "n"], myHalfZone),
  ),
  card(
    {
      id: "divine_mandate",
      icon: "ScrollText",
      name: "Divine Mandate",
      description:
        "You speak with the authority of heaven: one enemy knight, bishop, or rook joins your army, and heaven shields the defection so it cannot be recaptured for your opponent's next 3 turns. Kings cannot be swayed.",
      tier: 6,
      category: "pieces",
      flavor: "Kneel, and rise ours.",
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose an enemy knight, bishop, or rook to command to your side",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "n" || t === "b" || t === "r";
              }),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        api.setPieceColor(sq, api.me);
        // Heaven shields the defector: a square-scoped shield that follows the
        // piece keeps it uncapturable for the opponent's next 3 turns.
        addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 3 });
      },
    ),
  ),
  card(
    {
      id: "divine_reckoning",
      icon: "Gavel",
      name: "Divine Reckoning",
      description:
        "Judgment falls on the whole court: for your opponent's next 2 turns they may move only their king, and their next drafted card arrives nullified.",
      tier: 5,
      category: "hex",
      flavor: "Every courtier is called to account at once.",
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_only", against: api.opp, turns: 2 });
      // The reckoning reaches their hand too: their next drafted buff arrives
      // nullified (spent before it can be used), reusing the engine's existing
      // draft-nullify flag so judgment strikes their army and their draft.
      api.theirs.flags.nullifyIncoming = (api.theirs.flags.nullifyIncoming ?? 0) + 1;
    }),
  ),
  card(
    {
      id: "heavens_wrath",
      icon: "CloudLightning",
      name: "Heaven's Wrath",
      description:
        "The sky splits and three bolts of wrath descend: smite three enemy knights, bishops, rooks, or queens you name from the board.",
      tier: 8,
      category: "attack",
      flavor: "There is no shelter from a righteous storm.",
    },
    removeEnemies(3, ["n", "b", "r", "q"]),
  ),
];
