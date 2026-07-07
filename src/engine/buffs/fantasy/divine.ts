// Fantasy set: GODS & THE DIVINE. Interventions of higher powers: a warding of
// the crown (king_safe), a bolt of judgment that smites enemy pieces
// (removeEnemies), a resurrection of the fallen (reviveOne), a divine command
// that turns a foe to your side (convertEnemies), and a decree that pins the
// enemy court in place (king_only). Every effect reuses an existing primitive
// and respects the rails: kings are never removed, frozen, or converted.

import { Buff } from "./shared";
import {
  card,
  addEffect,
  removeEnemies,
  reviveOne,
  convertEnemies,
  instant,
  backRankZone,
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
// Intervention uses it to freeze the first enemy piece to strike at the warded
// king. It reuses the very move generators the engine uses, so a hit it sees is
// exactly a move that could capture the king (a check).
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
        "Your king cannot be captured for your opponent's next 2 turns, and the first enemy piece to strike at your king in that time is frozen where it stands for 2 of their turns.",
      tier: 5,
      category: "protection",
      flavor: "Not today, the heavens say.",
      fx: { motif: "ward", pieces: ["k"], self: true },
    },
    {
      kind: "passive",
      init: (inst, api) => {
        inst.state.turns = 2;
        addEffect(api, { kind: "king_safe", owner: api.me, turns: 2 });
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        const kingSq = mySquares(api.board, api.me, "k")[0];
        if (
          kingSq != null &&
          move.to !== kingSq &&
          attacksKing(api.board, move.to, kingSq)
        ) {
          // The lunge is answered: the striker is frozen where it stands, and
          // the miracle is spent. The ward itself lives out its own timer.
          addEffect(api, { kind: "freeze", sq: move.to, owner: api.opp, turns: 2, skin: "shock" });
          inst.spent = true;
          return;
        }
        const left = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = left;
        if (left <= 0) inst.spent = true;
      },
      status: (inst) =>
        ((inst.state.turns as number) ?? 0) > 0 ? "the crown strikes back" : null,
    },
  ),
  card(
    {
      id: "judgment_day",
      icon: "Scale",
      name: "Judgment Day",
      description:
        "A pillar of holy light falls from a clear sky and smites one enemy knight, bishop, rook, or queen you name from the board.",
      tier: 6,
      category: "attack",
      flavor: "Weighed, measured, and found wanting.",
    },
    removeEnemies(1, ["n", "b", "r", "q"]),
  ),
  card(
    {
      id: "hallowed_return",
      icon: "Sparkles",
      name: "Hallowed Return",
      description:
        "A prayer is answered: one of your captured knights, bishops, or rooks is restored to life on an empty square of your back rank, once.",
      tier: 3,
      category: "pieces",
      flavor: "Called back from the far shore.",
    },
    reviveOne(["r", "b", "n"], backRankZone),
  ),
  card(
    {
      id: "divine_mandate",
      icon: "ScrollText",
      name: "Divine Mandate",
      description:
        "You speak with the authority of heaven: one enemy knight, bishop, or rook lays down its old allegiance and joins your army, once. Kings cannot be swayed.",
      tier: 6,
      category: "pieces",
      flavor: "Kneel, and rise ours.",
    },
    convertEnemies(1, ["n", "b", "r"], "Choose an enemy piece to command to your side"),
  ),
  card(
    {
      id: "divine_reckoning",
      icon: "Gavel",
      name: "Divine Reckoning",
      description:
        "Judgment falls on the whole court: on your opponent's next turn they may move only their king.",
      tier: 5,
      category: "hex",
      flavor: "Every courtier is called to account at once.",
      fx: { motif: "jail", pieces: ["p", "n", "b", "r", "q"] },
    },
    instant((_inst, api) => {
      addEffect(api, { kind: "king_only", against: api.opp, turns: 1 });
    }),
  ),
  card(
    {
      id: "heavens_wrath",
      icon: "CloudLightning",
      name: "Heaven's Wrath",
      description:
        "The sky splits and twin bolts of wrath descend: smite two enemy knights, bishops, rooks, or queens you name from the board.",
      tier: 8,
      category: "attack",
      flavor: "There is no shelter from a righteous storm.",
    },
    removeEnemies(2, ["n", "b", "r", "q"]),
  ),
];
