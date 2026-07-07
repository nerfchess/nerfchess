// Funny set: CURSES WITH PERSONALITY. Opponent-move filters (category "hex")
// built entirely on the shared `curse` helper, which guarantees the filter is
// partial: if a curse would leave the opponent with zero moves it falls back to
// the full move list, so none of these can ever soft-lock a turn.

import { Buff } from "./shared";
import { card, curse, dist, mySquares, FILE, RANK, relRank } from "./shared";

export const FUNNY_CURSES: Buff[] = [
  card(
    {
      id: "vertigo",
      name: "Vertigo",
      description: "Your opponent's queen is afraid of heights: she cannot move more than 2 squares for their next 3 turns.",
      tier: 4,
      category: "hex",
      flavor: "One look down and she wobbles.",
      fx: { motif: "anchor", pieces: ["q"] },
    },
    curse(3, (moves) => moves.filter((m) => m.piece !== "q" || dist(m.from, m.to) <= 2)),
  ),
  card(
    {
      id: "origami",
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
      name: "Gremlins",
      description: "For their next 3 turns, your opponent's rooks can only move an even number of squares.",
      tier: 3,
      category: "hex",
      flavor: "Do not feed them after midnight.",
      fx: { motif: "anchor", pieces: ["r"] },
    },
    curse(3, (moves) => moves.filter((m) => m.piece !== "r" || dist(m.from, m.to) % 2 === 0)),
  ),
  card(
    {
      id: "homesick",
      name: "Homesick",
      description: "Your opponent's army is homesick: every piece may only move toward or along its own back rank for their next 3 turns.",
      tier: 5,
      category: "hex",
      flavor: "There is no place like home.",
      fx: { motif: "anchor", pieces: "all" },
    },
    curse(3, (moves, api) =>
      moves.filter((m) => relRank(api.opp, m.to) <= relRank(api.opp, m.from)),
    ),
  ),
  card(
    {
      id: "opposite_day",
      name: "Opposite Day",
      description: "On your opponent's next turn (1 turn), they cannot move any piece closer to your king. Moves that keep the same distance are allowed. If that would leave them with no legal move, the restriction is lifted for that turn.",
      tier: 4,
      category: "hex",
      flavor: "Everything backwards, obviously.",
      fx: { motif: "slow", pieces: "all" },
    },
    curse(1, (moves, api) => {
      const k = mySquares(api.board, api.me, "k")[0];
      if (k == null) return moves;
      return moves.filter((m) => dist(m.to, k) >= dist(m.from, k));
    }),
  ),
  card(
    {
      id: "cream_pie",
      name: "Cream Pie",
      description: "Your opponent cannot capture on their next turn.",
      tier: 3,
      category: "hex",
      flavor: "Cannot hit what you cannot see.",
      fx: { motif: "muzzle", pieces: "all" },
    },
    curse(1, (moves) => moves.filter((m) => !m.captured)),
  ),
];
