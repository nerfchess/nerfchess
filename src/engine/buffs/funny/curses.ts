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
      description: "The whole room tilts sideways: for their next 2 turns your opponent may only make diagonal moves. Their king keeps its footing and may still step anywhere.",
      tier: 4,
      category: "hex",
      flavor: "One look down and the floor becomes a wall.",
      fx: { motif: "slow", pieces: ["p", "n", "b", "r", "q"] },
    },
    curse(2, (moves) =>
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
      description: "Your opponent's rooks are folded into paper cranes: they may move at most 1 square for their next 4 turns.",
      tier: 4,
      category: "hex",
      flavor: "Crinkle, crinkle.",
      fx: { motif: "anchor", pieces: ["r"] },
    },
    curse(4, (moves) => moves.filter((m) => m.piece !== "r" || dist(m.from, m.to) <= 1)),
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
      description: "Your opponent's army is homesick: every piece may only move toward or along its own back rank for their next 4 turns.",
      tier: 5,
      category: "hex",
      flavor: "There is no place like home.",
      fx: { motif: "anchor", pieces: "all" },
    },
    curse(4, (moves, api) =>
      moves.filter((m) => relRank(api.opp, m.to) <= relRank(api.opp, m.from)),
    ),
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
      description: "Your opponent cannot capture on their next 2 turns.",
      tier: 3,
      category: "hex",
      flavor: "Cannot hit what you cannot see.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    curse(2, (moves) => moves.filter((m) => !m.captured)),
  ),
];
