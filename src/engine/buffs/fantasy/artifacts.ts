// Fantasy set: MYTHIC ARTIFACTS. Relics of a lost age: a blade that lets a
// bishop cut like a queen (pieceBound), a war-horn that calls reinforcements
// (placePieces), an orb that dominates an enemy champion and muzzles the enemy
// queen while you hold it (setPieceColor + a queen no-capture filter), a
// staff that freezes a foe in time (freeze), an ancient aegis that wards your
// whole army and its king from capture (shield + king_safe), and a battle-banner
// that quickens your cavalry (timedAugment). Movement grants only ever widen a
// piece's move list, so none of these can soft-lock a turn.

import { Buff } from "./shared";
import {
  card,
  pieceBound,
  placePieces,
  freezeTarget,
  timedAugment,
  slideMoves,
  mySquares,
  myHalfZone,
  addEffect,
  instant,
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
        "Take control of one enemy rook or queen for the rest of the game, once. While you still hold the dominated piece, the enemy queen cannot capture. Kings cannot be taken.",
      tier: 7,
      category: "pieces",
      flavor: "Its light pours in through the eyes.",
    },
    {
      kind: "activated",
      // Stays in hand after use (like Excalibur) so its aura keeps running while
      // the dominated piece lives; it is never re-aimed once a piece is taken.
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose an enemy rook or queen to dominate",
              squares: mySquares(api.board, api.opp).filter((sq) => {
                const t = api.board.pieces[sq]!.type;
                return t === "q" || t === "r";
              }),
            },
      effect: (inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || inst.state.sq != null) return;
        api.setPieceColor(sq, api.me);
        inst.state.sq = sq;
      },
      // The orb's aura muzzles the enemy queen while you hold the dominated
      // piece: strip the queen's capturing moves. A partial filter with the
      // standard never-strand guard, so the opponent always keeps a move.
      filterOpponentMoves: (moves, inst, api) => {
        const sq = inst.state.sq as number | undefined;
        if (sq == null) return moves;
        const held = api.board.pieces[sq];
        if (!held || held.color !== api.me) return moves;
        const kept = moves.filter((m) => !(m.piece === "q" && m.captured));
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as number | undefined;
        if (sq == null) return;
        // Follow the dominated piece; if it is captured or overrun the orb goes
        // dark, ending the aura and spending the card.
        if (move.capturedSquare === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        if (move.from === sq) {
          inst.state.sq = move.to;
        } else if (move.to === sq && move.from !== sq) {
          inst.spent = true;
          inst.state.sq = undefined;
        }
      },
      status: (inst) =>
        inst.state.sq == null ? "activate to dominate" : "the orb holds a champion",
    },
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
        "Lift the ancient aegis and its ward falls over your whole host, your king included: nothing you own can be captured for your opponent's next 2 turns.",
      tier: 7,
      category: "protection",
      flavor: "Forged before the first war, unbroken since.",
      fx: { motif: "ward", pieces: "all", self: true },
    },
    // An unbroken bulwark: the army shield AND a king ward, so unlike the plain
    // army aegis the crown cannot be taken either while it holds.
    instant((_inst, api) => {
      addEffect(api, { kind: "shield", owner: api.me, squares: null, turns: 2 });
      addEffect(api, { kind: "king_safe", owner: api.me, turns: 2 });
    }),
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
