// Tier 2 (Easy) expanded nerfs: single piece-type restrictions and mild
// standing rules, each easily worked around and always leaving legal moves from
// the opening. Import only from ./shared, one nerf per `N(...)`.

import { Nerf } from "./shared";
import { tierNerf, filter, relRank, FILE, RANK, cheb } from "./shared";

const N = tierNerf(2);

export const NERFS_T2: Nerf[] = [
  N(
    { id: "orthodox_king", name: "Orthodox King", description: "Your king can only move horizontally or vertically, never diagonally.", flavor: "His majesty walks a straight line.", icon: "plus" },
    {
      filterMoves: filter((m) => {
        if (m.piece !== "k") return true;
        const df = Math.abs(FILE(m.to) - FILE(m.from));
        const dr = Math.abs(RANK(m.to) - RANK(m.from));
        return !(df === 1 && dr === 1);
      }),
    },
  ),
  N(
    { id: "cavalry_charge", name: "Cavalry Charge", description: "Your knights can't move backward toward your own side.", flavor: "Horses only know one direction: forward.", icon: "move-up" },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter((m) => !(m.piece === "n" && relRank(ctx.me, m.to) < relRank(ctx.me, m.from))),
    },
  ),
  N(
    { id: "monastic_vows", name: "Monastic Vows", description: "Your bishops can't capture.", flavor: "The clergy have sworn off bloodshed.", icon: "church" },
    { filterMoves: filter((m) => !(m.piece === "b" && m.captured)) },
  ),
  N(
    { id: "cramped_rooks", name: "Cramped Rooks", description: "Your rooks can't move more than 4 squares.", flavor: "The towers are stiff in the joints.", icon: "castle" },
    { filterMoves: filter((m) => !(m.piece === "r" && cheb(m.from, m.to) > 4)) },
  ),
  N(
    { id: "merciful_queen", name: "Merciful Queen", description: "Your queen can't capture.", flavor: "She commands, but she will not strike.", icon: "crown" },
    { filterMoves: filter((m) => !(m.piece === "q" && m.captured)) },
  ),
  N(
    { id: "pawn_ceiling", name: "Pawn Ceiling", description: "Your pawns can't move past the middle of the board.", flavor: "The infantry hits an invisible wall at midfield.", icon: "flag" },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter((m) => !(m.piece === "p" && relRank(ctx.me, m.to) > 4)),
    },
  ),
  N(
    { id: "knights_abroad", name: "Knights Abroad", description: "Once one of your knights crosses into the enemy half, it can't come back to your own half.", flavor: "The cavalry only feels alive in enemy territory.", icon: "ban" },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter(
          (m) =>
            !(
              m.piece === "n" &&
              relRank(ctx.me, m.from) > 4 &&
              relRank(ctx.me, m.to) <= 4
            ),
        ),
    },
  ),
  N(
    { id: "advancing_faith", name: "Advancing Faith", description: "Your bishops can't move backward toward your own side.", flavor: "The faithful never look back.", icon: "move-up" },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter((m) => !(m.piece === "b" && relRank(ctx.me, m.to) < relRank(ctx.me, m.from))),
    },
  ),
  N(
    { id: "columnar_rooks", name: "Columnar Rooks", description: "Your rooks can only move along files, never sideways along ranks.", flavor: "The towers ride the elevator, not the hallway.", icon: "move-vertical" },
    { filterMoves: filter((m) => !(m.piece === "r" && RANK(m.from) === RANK(m.to))) },
  ),
  N(
    { id: "queen_fatigue", name: "Queen Fatigue", description: "You lose if you move your queen more than 12 times.", flavor: "Even a queen tires of the march.", icon: "timer" },
    {
      init: () => ({ moves: 0 }),
      onTurnStart: (_state, ctx) => ({
        moves: ctx.board.history.filter((m) => m.color === ctx.me && m.piece === "q").length,
      }),
      checkLoss: (state) => ((state.moves as number) > 12 ? { reason: "your queen collapsed from exhaustion" } : null),
      progress: (state) => ({ value: state.moves as number, max: 12, label: (state.moves as number) + "/12 queen moves" }),
    },
  ),
];
