// Mystic set: THE OCCULT. Spirit work and hidden power: a third eye that reads
// their nerf and grants a reroll, a seance calling a captured piece back (reviveOne),
// a hex doll that pins a piece in place (walnut), a chalk warding circle
// around your throne (king_safe), a ley line no enemy may cross (barLine), a
// spirit guide that walks beside you and departs (summonTemp), and a mirror
// that traps an enemy soul and turns it to your service (convertEnemies).
// Every card reuses an existing primitive and respects the rails: kings are
// never petrified, converted, or targeted, and nothing here can soft-lock.

import { Buff } from "./shared";
import {
  card,
  activated,
  addEffect,
  bindCandidates,
  bindPiece,
  instant,
  markRevived,
  mySquares,
  revivable,
  slideMoves,
  ALL_DIRS,
  FILE,
  RANK,
  SQ,
} from "./shared";

export const MYSTIC_OCCULT: Buff[] = [
  card(
    {
      id: "third_eye",
      name: "Third Eye",
      description:
        "Your third eye opens onto what is still hidden: see your opponent's nerf for the rest of the game, and gain one draft reroll.",
      tier: 1,
      category: "info",
      boon: true,
      flavor: "It does not blink. It does not need to.",
    },
    // Reworked for the full-transparency era: hands and offers are public, so
    // the eye now reads the one thing that stays secret (the nerf) and guides
    // the holder's own hand (+1 reroll). Unique combo: Extra Glance is the
    // reveal alone, Peek the reroll alone.
    instant((_inst, api) => {
      api.mine.oppNerfRevealed = true;
      api.mine.rerollsLeft = (api.mine.rerollsLeft ?? 0) + 1;
    }),
  ),
  card(
    {
      id: "seance",
      name: "Seance",
      description: "Send one of your knights or bishops across to the other side, and one of your captured rooks returns in its place, on the square that knight or bishop just vacated. Casting the circle also spends your next unused reroll, if you have one.",
      tip: "A straight upgrade in material, as long as the square suits a rook.",
      tier: 3,
      category: "pieces",
      requires: ["n", "b"],
      flavor: "Is anyone there? Knock twice for check.",
    },
    activated(
      (_inst, api, picks) => {
        if (picks.length > 0) return null;
        return {
          kind: "square",
          label: "Choose the piece that crosses over",
          squares:
            revivable(api, "r") > 0
              ? mySquares(api.board, api.me).filter((sq) =>
                  ["n", "b"].includes(api.board.pieces[sq]!.type),
                )
              : [],
        };
      },
      (_inst, api, picks) => {
        const sq = picks[0]?.square;
        if (sq == null || revivable(api, "r") <= 0) return;
        api.removePiece(sq);
        api.place(sq, "r", api.me);
        markRevived(api, "r");
        if (api.mine.rerollsLeft > 0) api.mine.rerollsLeft -= 1;
      },
    ),
  ),
  card(
    {
      id: "hex_doll",
      name: "Hex Doll",
      description:
        "You bind a lock of horsehair to a little cloth doll: choose one enemy piece except a king. If it captures anything within their next 2 turns, the pin goes in and it is destroyed.",
      tier: 4,
      category: "hex",
      flavor: "Do not ask where the hair came from.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    {
      kind: "activated",
      spendOnUse: false,
      // One activation only: the doll is sewn to a single piece.
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the enemy piece the doll binds",
              squares: mySquares(api.board, api.opp).filter(
                (sq) => api.board.pieces[sq]!.type !== "k",
              ),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 2;
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as number | undefined;
        if (sq == null) return;
        // The bind ends when the bound piece is captured.
        if (move.to === sq && move.from !== sq) {
          inst.spent = true;
          return;
        }
        if (move.from === sq) {
          // The doll's piece moved: if it captured, the pin goes in.
          if (move.color === api.opp && move.captured) {
            const p = api.board.pieces[move.to];
            if (p && p.color === api.opp && p.type !== "k") api.removePiece(move.to);
            inst.spent = true;
            return;
          }
          inst.state.sq = move.to;
        }
        if (move.color === api.opp) {
          const t = ((inst.state.turns as number) ?? 0) - 1;
          inst.state.turns = t;
          if (t <= 0) inst.spent = true;
        }
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to bind the doll"
          : `${(inst.state.turns as number) ?? 0} of their turns left`,
    },
  ),
  card(
    {
      id: "warding_circle",
      name: "Warding Circle",
      description:
        "You chalk a circle of old names around your throne: no enemy piece may end its move on any of the squares around your king, for your opponent's next 2 turns.",
      tier: 4,
      category: "protection",
      flavor: "Salt, chalk, and absolute confidence.",
      fx: { motif: "ward", pieces: ["k"], self: true },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 2;
      },
      filterOpponentMoves: (moves, inst, api) => {
        if (((inst.state.turns as number) ?? 0) <= 0) return moves;
        const k = mySquares(api.board, api.me, "k")[0];
        if (k == null) return moves;
        const kept = moves.filter(
          (m) =>
            // The king's own square stays reachable (the circle guards the
            // ground around the throne, it does not make the king immortal).
            m.to === k ||
            Math.max(Math.abs(FILE(m.to) - FILE(k)), Math.abs(RANK(m.to) - RANK(k))) > 1,
        );
        // Safety net: never strand the opponent with zero moves.
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (move.color !== api.opp) return;
        const t = ((inst.state.turns as number) ?? 0) - 1;
        inst.state.turns = t;
        if (t <= 0) inst.spent = true;
      },
      status: (inst) => `${(inst.state.turns as number) ?? 0} of their turns left`,
    },
  ),
  card(
    {
      id: "ley_line",
      name: "Ley Line",
      description:
        "You wake the old current sleeping under the board: choose one of your pieces and an empty square on its own file. After your opponent's next move, it rides the current there.",
      tier: 2,
      category: "movement",
      flavor: "The land remembers its own roads.",
    },
    // Balance pass: the current takes a beat to wake. Activation only arms the
    // ride; the piece crosses after the opponent has replied once.
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) => {
        if (inst.state.armed) return null;
        if (picks.length >= 2) return null;
        if (picks.length === 0) {
          const hasFile = (sq: number) =>
            Array.from({ length: 8 }, (_, r) => SQ(FILE(sq), r)).some(
              (d) => d !== sq && !api.board.pieces[d],
            );
          return {
            kind: "square",
            label: "Choose the piece that rides the ley line",
            squares: mySquares(api.board, api.me).filter(
              (sq) => api.board.pieces[sq]!.type !== "k" && hasFile(sq),
            ),
          };
        }
        const from = picks[0].square!;
        return {
          kind: "square",
          label: "Choose the empty square on its file",
          squares: Array.from({ length: 8 }, (_, r) => SQ(FILE(from), r)).filter(
            (sq) => sq !== from && !api.board.pieces[sq],
          ),
        };
      },
      effect: (inst, _api, picks) => {
        const from = picks[0]?.square, to = picks[1]?.square;
        if (from == null || to == null || inst.state.armed) return;
        inst.state.from = from;
        inst.state.to = to;
        inst.state.armed = true;
      },
      onMovePlayed: (inst, move, api) => {
        if (!inst.state.armed) return;
        let from = inst.state.from as number | undefined;
        // Captured before it could ride: the current fades.
        if (from != null && move.to === from && move.from !== from) {
          inst.spent = true;
          return;
        }
        // Follow the piece if it moves on its own before the current wakes.
        if (from != null && move.from === from) {
          from = move.to;
          inst.state.from = from;
        }
        if (move.color !== api.opp) return;
        const to = inst.state.to as number | undefined;
        if (
          from != null &&
          to != null &&
          api.board.pieces[from]?.color === api.me &&
          !api.board.pieces[to]
        ) {
          api.relocate(from, to);
        }
        inst.spent = true;
      },
      status: (inst) =>
        inst.state.armed
          ? "the current wakes after their next move"
          : "activate to wake the current",
    },
  ),
  card(
    {
      id: "spirit_guide",
      name: "Spirit Guide",
      description:
        "A patient spirit settles into one of your pieces: for your next 4 turns it may also step one square in any direction, and it cannot be captured for your opponent's next 3 turns.",
      tier: 5,
      category: "protection",
      flavor: "It has walked this road before. It knows where the holes are.",
    },
    bindPiece("Choose the piece the spirit joins", bindCandidates(), {
      turns: 4,
      shieldTurns: 3,
      gen: (board, sq, via) => slideMoves(board, sq, ALL_DIRS, via, 1),
    }),
  ),
  card(
    {
      id: "mirror_of_souls",
      name: "Mirror of Souls",
      description:
        "You hold the glass between two reflections: name one of your pieces and an enemy piece of the same kind. After your opponent's next move, they trade places. Kings cast no reflection.",
      tier: 5,
      category: "movement",
      flavor: "The glass gives everything back except loyalty.",
    },
    // Balance pass: the glass settles a beat late. Naming the pair arms the
    // trade; the reflections swap after the opponent has replied once.
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) => {
        if (inst.state.armed) return null;
        if (picks.length >= 2) return null;
        if (picks.length === 0) {
          return {
            kind: "square",
            label: "Choose your piece to reflect",
            squares: mySquares(api.board, api.me).filter((sq) => {
              const t = api.board.pieces[sq]!.type;
              return t !== "k" && mySquares(api.board, api.opp, t).length > 0;
            }),
          };
        }
        const mine = picks[0].square!;
        const t = api.board.pieces[mine]?.type;
        return {
          kind: "square",
          label: "Choose the enemy piece in the mirror",
          squares: t ? mySquares(api.board, api.opp, t) : [],
        };
      },
      effect: (inst, _api, picks) => {
        const a = picks[0]?.square, b = picks[1]?.square;
        if (a == null || b == null || inst.state.armed) return;
        inst.state.a = a;
        inst.state.b = b;
        inst.state.armed = true;
      },
      onMovePlayed: (inst, move, api) => {
        if (!inst.state.armed) return;
        let a = inst.state.a as number | undefined;
        let b = inst.state.b as number | undefined;
        // Either reflection may be captured before the glass settles.
        if (a != null && move.to === a && move.from !== a) {
          inst.spent = true;
          return;
        }
        if (b != null && move.to === b && move.from !== b) {
          inst.spent = true;
          return;
        }
        // Follow either piece if it moves before the swap resolves.
        if (b != null && move.from === b) {
          b = move.to;
          inst.state.b = b;
        }
        if (a != null && move.from === a) {
          a = move.to;
          inst.state.a = a;
        }
        if (move.color !== api.opp) return;
        if (a != null && b != null) {
          const mine = api.board.pieces[a], theirs = api.board.pieces[b];
          if (
            mine &&
            theirs &&
            mine.color === api.me &&
            theirs.color === api.opp &&
            mine.type === theirs.type &&
            mine.type !== "k"
          ) {
            const t = mine.type;
            api.removePiece(b);
            api.relocate(a, b);
            api.place(a, t, api.opp);
          }
        }
        inst.spent = true;
      },
      status: (inst) =>
        inst.state.armed
          ? "the glass settles after their next move"
          : "activate to raise the mirror",
    },
  ),
];
