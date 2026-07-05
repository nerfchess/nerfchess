// Tier 5 (Brutal) expanded nerfs: strong restrictions that mostly disable a
// piece role, plus counter-based losses. Each still leaves legal moves from the
// opening (pawn moves survive every rule here). Import only from
// ./shared, one nerf per N(...).

import { Nerf } from "./shared";
import {
  tierNerf,
  filter,
  relRank,
  cheb,
  countHistory,
  attackedBy,
  isInCheck,
  makeMove,
  Color,
} from "./shared";

const N = tierNerf(5);

const other = (c: Color): Color => (c === "w" ? "b" : "w");

export const NERFS_T5: Nerf[] = [
  N(
    { id: "defanged_queen", name: "Defanged Queen", description: "Your queen can't capture and can't give check.", flavor: "All crown, no claws.", icon: "crown" },
    {
      filterMoves: (moves, _state, ctx) => {
        const opp = other(ctx.me);
        return moves.filter((m) => {
          if (m.piece !== "q") return true;
          if (m.captured) return false;
          return !isInCheck(makeMove(ctx.board, m), opp);
        });
      },
    },
  ),
  N(
    { id: "stunted_rooks", name: "Stunted Rooks", description: "Your rooks can only move one square at a time.", flavor: "The towers shuffle inch by inch.", icon: "castle" },
    {
      filterMoves: filter((m) => !(m.piece === "r" && cheb(m.from, m.to) > 1)),
    },
  ),
  N(
    { id: "myopic_bishops", name: "Myopic Bishops", description: "Your bishops can't move more than two squares.", flavor: "They can't see past the next tile.", icon: "church" },
    {
      filterMoves: filter((m) => !(m.piece === "b" && cheb(m.from, m.to) > 2)),
    },
  ),
  N(
    { id: "hobbled_knights", name: "Hobbled Knights", description: "Your knights can't advance toward the enemy side; their rank may never increase.", flavor: "The horses only ever fall back.", icon: "move" },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter(
          (m) => !(m.piece === "n" && relRank(ctx.me, m.to) > relRank(ctx.me, m.from)),
        ),
    },
  ),
  N(
    { id: "homebound_pawns", name: "Homebound Pawns", description: "Your pawns can't move past the halfway line into the enemy half.", flavor: "Foot soldiers who never leave home soil.", icon: "flag" },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter((m) => !(m.piece === "p" && relRank(ctx.me, m.to) > 4)),
    },
  ),
  N(
    { id: "no_mans_land", name: "No Man's Land", description: "You can't move any piece onto a square your opponent currently attacks.", flavor: "Every guarded square is a minefield.", icon: "ban" },
    {
      filterMoves: (moves, _state, ctx) => {
        const atk = attackedBy(ctx.board, other(ctx.me));
        return moves.filter((m) => !atk.has(m.to));
      },
    },
  ),
  N(
    { id: "pawns_do_the_dirty_work", name: "Pawns Do the Dirty Work", description: "Only your pawns may capture; none of your other pieces can capture.", flavor: "The officers keep their hands clean.", icon: "swords" },
    {
      filterMoves: filter((m) => !(m.captured && m.piece !== "p")),
    },
  ),
  N(
    { id: "no_retreat_ever", name: "No Retreat Ever", description: "None of your pieces may move backward toward your own back rank.", flavor: "Forward or sideways, never home.", icon: "move" },
    {
      filterMoves: (moves, _state, ctx) => {
        const fwd = moves.filter((m) => relRank(ctx.me, m.to) >= relRank(ctx.me, m.from));
        return fwd.length ? fwd : moves;
      },
    },
  ),
  N(
    { id: "blood_quota", name: "Blood Quota", description: "You may make only six captures all game; you lose if you make a seventh.", flavor: "Six heads, then sheathe the sword.", icon: "droplet" },
    {
      init: () => ({ caps: 0 }),
      onTurnStart: (_state, ctx) => ({ caps: countHistory(ctx, (m) => !!m.captured) }),
      checkLoss: (state) =>
        (state.caps as number) > 6 ? { reason: "you exceeded your blood quota" } : null,
      progress: (state) => ({
        value: state.caps as number,
        max: 6,
        label: (state.caps as number) + "/6 captures",
      }),
    },
  ),
  N(
    { id: "restless_crown", name: "Restless Crown", description: "Your king may move only six times all game; you lose on his seventh move.", flavor: "A wandering king loses his kingdom.", icon: "crown" },
    {
      init: () => ({ kingMoves: 0 }),
      onTurnStart: (_state, ctx) => ({ kingMoves: countHistory(ctx, (m) => m.piece === "k") }),
      checkLoss: (state) =>
        (state.kingMoves as number) > 6 ? { reason: "your king wandered too far" } : null,
      progress: (state) => ({
        value: state.kingMoves as number,
        max: 6,
        label: (state.kingMoves as number) + "/6 king moves",
      }),
    },
  ),
];
