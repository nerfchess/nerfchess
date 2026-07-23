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
      tier: 6,
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
      tier: 7,
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
        "A prayer is answered exactly: one of your captured knights, bishops, or rooks is restored to life on one of its own starting squares, if one is free, once.",
      tier: 4,
      category: "pieces",
      flavor: "Called back from the far shore, to the very pew it left.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length > 0) return null;
        const homes: Record<string, number[]> = { r: [0, 7], n: [1, 6], b: [2, 5] };
        const rank = api.me === "w" ? 0 : 7;
        const type = (["r", "b", "n"] as const).find(
          (t) =>
            (api.capturedFromMe[t] ?? 0) - (api.mine.revived[t] ?? 0) > 0 &&
            homes[t].some((f) => !api.board.pieces[SQ(f, rank)]),
        );
        return {
          kind: "square",
          label: "Choose the home square it returns to",
          squares:
            type == null
              ? []
              : homes[type].map((f) => SQ(f, rank)).filter((sq) => !api.board.pieces[sq]),
        };
      },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || api.board.pieces[sq]) return;
        const homes: Record<string, number[]> = { r: [0, 7], n: [1, 6], b: [2, 5] };
        const rank = api.me === "w" ? 0 : 7;
        const type = (["r", "b", "n"] as const).find(
          (t) =>
            (api.capturedFromMe[t] ?? 0) - (api.mine.revived[t] ?? 0) > 0 &&
            homes[t].includes(FILE(sq)) &&
            RANK(sq) === rank,
        );
        if (type == null) return;
        api.place(sq, type, api.me);
        api.mine.revived[type] = (api.mine.revived[type] ?? 0) + 1;
      },
    ),
  ),
  card(
    {
      id: "divine_mandate",
      icon: "ScrollText",
      name: "Divine Mandate",
      description:
        "You speak with the authority of heaven: one enemy knight, bishop, or rook joins your army, and heaven shields the defection so it cannot be recaptured for your opponent's next 2 turns. Kings cannot be swayed.",
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
        // piece keeps it uncapturable for the opponent's next 2 turns (balance
        // pass: the largest duration trimmed by one).
        addEffect(api, { kind: "shield", owner: api.me, squares: [sq], turns: 2 });
      },
    ),
  ),
  card(
    {
      id: "divine_reckoning",
      icon: "Gavel",
      name: "Divine Reckoning",
      description:
        "The verdict is exile: choose one enemy piece except the king. If one of its own starting squares is free it is sent back there (nearest the a-file first); either way it is frozen for 2 of their turns.",
      tier: 5,
      category: "hex",
      flavor: "Every courtier is called to account, and sent to their room.",
      fx: { motif: "jail", pieces: "all" },
    },
    activated(
      (_inst, api, picks) =>
        picks.length > 0
          ? null
          : {
              kind: "square",
              label: "Choose the enemy piece to judge",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.opp || p.type === "k") return;
        const rank = api.opp === "w" ? 0 : 7;
        const homesByType: Record<string, number[]> = {
          r: [0, 7],
          n: [1, 6],
          b: [2, 5],
          q: [3],
          p: Array.from({ length: 8 }, (_, f) => f),
        };
        const homeRank = p.type === "p" ? (api.opp === "w" ? 1 : 6) : rank;
        const home = (homesByType[p.type] ?? [])
          .map((f) => SQ(f, homeRank))
          .find((h) => h !== sq && !api.board.pieces[h]);
        const finalSq = home != null ? home : sq;
        if (home != null) api.relocate(sq, home);
        addEffect(api, { kind: "freeze", sq: finalSq, owner: api.opp, turns: 2 });
      },
    ),
  ),
  card(
    {
      id: "heavens_wrath",
      icon: "CloudLightning",
      name: "Heaven's Wrath",
      description:
        "The sky splits and three bolts of wrath descend: smite three enemy knights, bishops, rooks, or queens you name from the board. Calling the storm consumes your next unused reroll, if you have one.",
      tier: 8,
      category: "attack",
      flavor: "There is no shelter from a righteous storm.",
    },
    // Balance pass: calling the storm also consumes your next unused reroll.
    (() => {
      const base = removeEnemies(3, ["n", "b", "r", "q"]);
      return {
        ...base,
        effect: (inst, api, picks) => {
          base.effect?.(inst, api, picks);
          api.mine.rerollsLeft = Math.max(0, (api.mine.rerollsLeft ?? 0) - 1);
        },
      };
    })(),
  ),
];
