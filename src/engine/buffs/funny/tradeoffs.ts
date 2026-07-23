// Funny set: TRADE-OFFS. Each card is a Faustian bargain: a strong effect now,
// paid for a few of your turns later. The "pay it later" half runs on two
// engine primitives:
//   - timed_loss: a trade-off timer that, after N of your turns, removes (or
//     reverts) a tracked piece. Borrowed Time uses it to reclaim the queen.
//   - short_leash: for N of your turns you may only step one square. Berserker
//     drops into it once the rampage ends.
// Both live in buff.ts and are ticked in game.ts alongside every other timed
// effect, with the same non-soft-lock guarantee (king captures stay legal and
// the leash is relaxed rather than ever stranding the mover). Glass Cannon and
// Sugar Rush pay their price through existing primitives (pawn removal, the
// extra-move / skip counters), so no new engine surface is needed for them.

import { Buff, BuffApi, Move, Square } from "./shared";
import {
  card,
  instant,
  activated,
  activatedSimple,
  addEffect,
  mySquares,
  slideMoves,
  turnsLeft,
  DIAG_DIRS,
  ALL_DIRS,
  FILE,
  RANK,
  SQ,
  inBoard,
} from "./shared";

/** Diagonal captures that ignore every blocker in between: one capture move for
 * each enemy piece (never a king) standing anywhere along the bishop's
 * diagonals, whatever sits between them. Quiet moves stay the bishop's own. */
function glassCannonCaptures(api: BuffApi, from: Square, via: string): Move[] {
  const out: Move[] = [];
  const p = api.board.pieces[from];
  if (!p) return out;
  for (const [df, dr] of DIAG_DIRS) {
    let f = FILE(from) + df;
    let r = RANK(from) + dr;
    while (inBoard(f, r)) {
      const to = SQ(f, r);
      const t = api.board.pieces[to];
      if (t && t.color !== p.color && t.type !== "k") {
        out.push({ from, to, piece: p.type, color: p.color, captured: t.type, capturedSquare: to, via });
      }
      f += df;
      r += dr;
    }
  }
  return out;
}

export const FUNNY_TRADEOFFS: Buff[] = [
  card(
    {
      id: "borrowed_time",
      icon: "Hourglass",
      name: "Borrowed Time",
      description:
        "Your queen becomes uncapturable for your next 4 moves, and then her time runs out: she is removed from the board.",
      tier: 5,
      category: "protection",
      requires: ["q"],
      flavor: "Every debt comes due.",
      fx: { motif: "ward", pieces: ["q"], self: true },
    },
    instant((_inst, api) => {
      const q = mySquares(api.board, api.me, "q")[0];
      if (q == null) return;
      addEffect(api, { kind: "shield", owner: api.me, squares: [q], turns: 4 });
      addEffect(api, { kind: "timed_loss", owner: api.me, sq: q, turns: 4, then: "remove" });
    }),
  ),
  card(
    {
      id: "berserker",
      icon: "Axe",
      name: "Berserker",
      description:
        "For your next 3 turns, all your pieces except your king also move like a queen. For the 2 turns after that, all your pieces can move only one square.",
      tier: 7,
      category: "movement",
      flavor: "Blood first, thinking later.",
      fx: { motif: "rally", pieces: "all", self: true },
    },
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 3;
        inst.state.phase = "rage";
      },
      augmentMoves: (moves, inst, api) => {
        if (inst.state.phase !== "rage" || turnsLeft(inst) <= 0) return;
        const have = new Set(moves.map((m) => m.from * 64 + m.to));
        for (const sq of mySquares(api.board, api.me)) {
          const p = api.board.pieces[sq]!;
          if (p.type === "k") continue; // the king keeps its own steps
          for (const mv of slideMoves(api.board, sq, ALL_DIRS, inst.id)) {
            const key = mv.from * 64 + mv.to;
            if (!have.has(key)) {
              have.add(key);
              moves.push(mv);
            }
          }
        }
      },
      onMovePlayed: (inst, move, api) => {
        if (inst.state.phase !== "rage" || move.color !== api.me) return;
        const left = turnsLeft(inst) - 1;
        inst.state.turns = left;
        if (left <= 0) {
          // The rampage ends: apply the one-square leash for 2 more of my
          // turns. It is added inside this move's hook, so the immediate
          // effect tick that follows would eat one turn: ask for 3 to leave 2.
          addEffect(api, { kind: "short_leash", owner: api.me, turns: 3 });
          inst.state.phase = "leash";
          inst.spent = true; // the leash effect carries the downside from here
        }
      },
      status: (inst) =>
        inst.state.phase === "rage" ? `raging for ${turnsLeft(inst)} of your turns` : "hobbled",
    },
  ),
  card(
    {
      id: "glass_cannon",
      icon: "Gem",
      name: "Glass Cannon",
      description:
        "Choose a bishop. Once your opponent replies, for your next 4 turns it can capture any enemy except the king along its diagonals, passing through anything in between. But while it is overcharged, if it is captured, two of your pawns shatter with it.",
      tier: 6,
      category: "attack",
      requires: ["b"],
      flavor: "All power, no armor.",
      fx: { motif: "empower", pieces: ["b"], self: true },
    },
    {
      kind: "activated",
      spendOnUse: false,
      targets: (inst, api, picks) =>
        picks.length > 0 || inst.state.sq != null
          ? null
          : {
              kind: "square",
              label: "Choose the bishop to overcharge",
              squares: mySquares(api.board, api.me, "b"),
            },
      effect: (inst, _api, picks) => {
        if (inst.state.sq != null) return;
        const sq = picks[0]?.square;
        if (sq == null) return;
        inst.state.sq = sq;
        inst.state.turns = 4;
      },
      augmentMoves: (moves, inst, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null || (inst.state.turns as number) <= 0) return;
        const p = api.board.pieces[sq];
        if (!p || p.color !== api.me || p.type !== "b") return;
        const have = new Set(moves.map((m) => m.from * 64 + m.to));
        for (const mv of glassCannonCaptures(api, sq, inst.id)) {
          const key = mv.from * 64 + mv.to;
          if (!have.has(key)) {
            have.add(key);
            moves.push(mv);
          }
        }
      },
      onMovePlayed: (inst, move, api) => {
        const sq = inst.state.sq as Square | undefined;
        if (sq == null) return;
        // Brittle: the overcharged bishop is captured -> two of my pawns go too.
        if (move.color === api.opp && move.capturedSquare === sq) {
          for (const pawn of mySquares(api.board, api.me, "p").slice(0, 2)) {
            api.removePiece(pawn, { uncounted: true });
          }
          inst.spent = true;
          inst.state.sq = undefined;
          return;
        }
        // Follow the bishop as it moves; retire after 4 of my turns.
        if (move.from === sq) inst.state.sq = move.to;
        if (move.color !== api.me) return;
        const left = (inst.state.turns as number) - 1;
        inst.state.turns = left;
        if (left <= 0) {
          inst.spent = true;
          inst.state.sq = undefined;
        }
      },
      status: (inst) =>
        inst.state.sq == null
          ? "activate to overcharge a bishop"
          : `overcharged, ${(inst.state.turns as number) ?? 0} of your turns left`,
    },
  ),
  card(
    {
      id: "sugar_rush",
      icon: "Candy",
      name: "Sugar Rush",
      description:
        "Slam a sugar rush: take three extra moves right now. Then comes the sugar crash and you skip your next turn.",
      tier: 4,
      category: "tempo",
      flavor: "Wheee... zzz.",
      fx: { motif: "rally", pieces: "all", self: true },
    },
    {
      ...activatedSimple((_inst, api) => {
        api.bs.extraMoves[api.me] += 3;
        api.bs.skips[api.me] += 1;
      }),
      freeAction: true,
    },
  ),
];
