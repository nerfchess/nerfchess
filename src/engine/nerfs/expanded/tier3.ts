// Tier 3 (Common) expanded nerfs: real bounded constraints on a piece class or
// on capturing. Each still leaves legal moves from the opening (they target one
// piece type, a direction, a zone, captures only, or a loose counter). Import
// only from ./shared, one nerf per N(...).

import { Nerf } from "./shared";
import {
  tierNerf,
  filter,
  relRank,
  FILE,
  RANK,
  PIECE_VALUE,
  countHistory,
} from "./shared";

const N = tierNerf(3);

export const NERFS_T3: Nerf[] = [
  N(
    { id: "half_a_queen", name: "Half a Queen", description: "Your queen can only move like a rook, never diagonally.", flavor: "She left the diagonals at home.", icon: "castle" },
    {
      filterMoves: filter((m) => {
        if (m.piece !== "q") return true;
        return FILE(m.to) === FILE(m.from) || RANK(m.to) === RANK(m.from);
      }),
    },
  ),
  N(
    { id: "sidewinder", name: "Sidewinder", description: "Your rooks can only move horizontally along ranks, never up or down files.", flavor: "The towers slide side to side.", icon: "move-horizontal" },
    {
      filterMoves: filter((m) => !(m.piece === "r" && RANK(m.to) !== RANK(m.from))),
    },
  ),
  N(
    { id: "pull_of_the_center", name: "Pull of the Center", description: "Your pawns can only capture toward the center files.", flavor: "Blades are drawn inward.", icon: "move-horizontal" },
    {
      filterMoves: filter((m) => {
        if (m.piece !== "p" || !m.captured) return true;
        return Math.abs(FILE(m.to) - 3.5) < Math.abs(FILE(m.from) - 3.5);
      }),
    },
  ),
  N(
    { id: "one_bite_at_a_time", name: "One Bite at a Time", description: "You can't capture on two consecutive turns.", flavor: "Chew before you swallow.", icon: "timer" },
    {
      filterMoves: (moves, _state, ctx) =>
        ctx.myLastMove?.captured ? moves.filter((m) => !m.captured) : moves,
    },
  ),
  N(
    { id: "cautious_cavalry", name: "Cautious Cavalry", description: "Your knights can't cross into the enemy half of the board.", flavor: "The horses balk at the border.", icon: "flag" },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter((m) => !(m.piece === "n" && relRank(ctx.me, m.to) > 4)),
    },
  ),
  N(
    { id: "carnivore_bishops", name: "Carnivore Bishops", description: "Your bishops can only move when they capture.", flavor: "They march only to feed.", icon: "church" },
    {
      filterMoves: filter((m) => !(m.piece === "b" && !m.captured)),
    },
  ),
  N(
    { id: "no_retreat", name: "No Retreat", description: "Your king can't step backward toward your own back rank.", flavor: "A king never gives ground.", icon: "crown" },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter(
          (m) => !(m.piece === "k" && relRank(ctx.me, m.to) < relRank(ctx.me, m.from)),
        ),
    },
  ),
  N(
    { id: "one_way_bishops", name: "One Way Bishops", description: "Your bishops can only move toward the enemy side, never back toward your own.", flavor: "Faith moves forward.", icon: "church" },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter(
          (m) => !(m.piece === "b" && relRank(ctx.me, m.to) < relRank(ctx.me, m.from)),
        ),
    },
  ),
  N(
    { id: "no_free_lunch", name: "No Free Lunch", description: "You can't capture a piece worth more than the piece making the capture.", flavor: "No favorable trades, ever.", icon: "ban" },
    {
      filterMoves: filter((m) => {
        if (!m.captured) return true;
        return PIECE_VALUE[m.captured] <= PIECE_VALUE[m.piece];
      }),
    },
  ),
  N(
    { id: "overzealous", name: "Overzealous", description: "You lose if you capture more than 10 enemy pieces.", flavor: "Bloodlust is its own undoing.", icon: "droplet" },
    {
      init: () => ({ caps: 0 }),
      onTurnStart: (_state, ctx) => ({ caps: countHistory(ctx, (m) => !!m.captured) }),
      checkLoss: (state) =>
        (state.caps as number) > 10 ? { reason: "you spilled too much blood" } : null,
      progress: (state) => ({
        value: state.caps as number,
        max: 10,
        label: (state.caps as number) + "/10 captures",
      }),
    },
  ),
];
