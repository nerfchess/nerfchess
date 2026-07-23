// Funny set: CURSES WITH PERSONALITY. Opponent-move filters (category "hex")
// built entirely on the shared `curse` helper, which guarantees the filter is
// partial: if a curse would leave the opponent with zero moves it falls back to
// the full move list, so none of these can ever soft-lock a turn.

import { Buff } from "./shared";
import { card, curse, dist, mySquares, tickTurns, turnsLeft, FILE, RANK, relRank } from "./shared";

export const FUNNY_CURSES: Buff[] = [
  card(
    {
      id: "vertigo",
      icon: "Tornado",
      name: "Vertigo",
      description: "The whole room tilts sideways: for their next turn your opponent may only make diagonal moves. Their king keeps its footing and may still step anywhere.",
      tier: 4,
      category: "hex",
      flavor: "One look down and the floor becomes a wall.",
      fx: { motif: "slow", pieces: ["p", "n", "b", "r", "q"] },
    },
    curse(1, (moves) =>
      moves.filter((m) => {
        if (m.piece === "k") return true;
        const df = Math.abs(FILE(m.to) - FILE(m.from));
        const dr = Math.abs(RANK(m.to) - RANK(m.from));
        return df === dr && df > 0;
      }),
    ),
  ),
  card(
    {
      id: "origami",
      icon: "Origami",
      name: "Origami",
      description: "Your opponent's rooks are folded into paper cranes: they may move at most 1 square for their next 3 turns.",
      tier: 4,
      category: "hex",
      flavor: "Crinkle, crinkle.",
      fx: { motif: "anchor", pieces: ["r"] },
    },
    curse(3, (moves) => moves.filter((m) => m.piece !== "r" || dist(m.from, m.to) <= 1)),
  ),
  card(
    {
      id: "gremlins",
      icon: "Rat",
      name: "Gremlins",
      description: "For their next 4 turns, your opponent's rooks can only move an even number of squares.",
      tier: 4,
      category: "hex",
      flavor: "Do not feed them after midnight.",
      fx: { motif: "anchor", pieces: ["r"] },
    },
    curse(4, (moves) => moves.filter((m) => m.piece !== "r" || dist(m.from, m.to) % 2 === 0)),
  ),
  card(
    {
      id: "homesick",
      icon: "House",
      name: "Homesick",
      description: "Your opponent's army is homesick: every piece may only move toward or along its own back rank for their next 4 turns. The first piece they move gets one free move before the pull sets in.",
      tier: 5,
      category: "hex",
      flavor: "There is no place like home.",
      fx: { motif: "anchor", pieces: "all" },
    },
    // Preserve the 4-turn duration, but the first affected piece the opponent
    // moves gets one unrestricted escape move; the homeward pull bites from the
    // move after that (still ticking across the same 4 of their turns).
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 4;
        inst.state.escaped = false;
      },
      filterOpponentMoves: (moves, inst, api) => {
        if (turnsLeft(inst) <= 0 || !inst.state.escaped || moves.length === 0) return moves;
        const kept = moves.filter((m) => relRank(api.opp, m.to) <= relRank(api.opp, m.from));
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (turnsLeft(inst) <= 0) return;
        if (!inst.state.escaped && move.color === api.opp) inst.state.escaped = true;
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        inst.state.escaped
          ? `${turnsLeft(inst)} of their turns left`
          : "one escape move, then homesick",
    },
  ),
  card(
    {
      id: "opposite_day",
      icon: "FlipHorizontal2",
      name: "Opposite Day",
      description: "For your opponent's next 2 turns, they cannot move any piece closer to your king. Moves that keep the same distance are allowed. If that would leave them with no legal move, the restriction is lifted for that turn.",
      tier: 5,
      category: "hex",
      flavor: "Everything backwards, obviously.",
      fx: { motif: "slow", pieces: "all" },
    },
    curse(2, (moves, api) => {
      const k = mySquares(api.board, api.me, "k")[0];
      if (k == null) return moves;
      return moves.filter((m) => dist(m.to, k) >= dist(m.from, k));
    }),
  ),
  card(
    {
      id: "cream_pie",
      icon: "CakeSlice",
      name: "Cream Pie",
      description: "The pie is still in the air: after your opponent's next move, they cannot capture for their following 2 turns.",
      tier: 3,
      category: "hex",
      flavor: "Cannot hit what you cannot see.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    // Preserve the 2-turn no-capture window, but delay it: the opponent plays
    // one unaffected move first, then the muzzle arms for their next 2 turns.
    {
      kind: "passive",
      init: (inst) => {
        inst.state.turns = 2;
        inst.state.armed = false;
      },
      filterOpponentMoves: (moves, inst, api) => {
        if (!inst.state.armed || turnsLeft(inst) <= 0 || moves.length === 0) return moves;
        const kept = moves.filter((m) => !m.captured);
        return kept.length > 0 ? kept : moves;
      },
      onMovePlayed: (inst, move, api) => {
        if (!inst.state.armed) {
          if (move.color === api.opp) inst.state.armed = true;
          return;
        }
        tickTurns(inst, move, api.opp);
      },
      status: (inst) =>
        inst.state.armed
          ? `${turnsLeft(inst)} of their turns left`
          : "arming after their next move",
    },
  ),
];
