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
  FILE,
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
    { id: "homebound_pawns", name: "Homebound Pawns", description: "Your pawns can't advance past the halfway line unless the move is a capture; only by force can they cross into enemy soil.", flavor: "They only leave home soil to seize ground by force.", icon: "flag" },
    {
      // Distinct from pawn_ceiling (a hard wall at midfield for every pawn
      // move): a capturing pawn move may still cross the halfway line here.
      filterMoves: (moves, _state, ctx) =>
        moves.filter(
          (m) => !(m.piece === "p" && !m.captured && relRank(ctx.me, m.to) > 4),
        ),
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
    { id: "no_retreat_ever", name: "No Retreat Ever", description: "Every move you make must advance toward the enemy; no piece may move backward or even hold its rank.", flavor: "Only ever forward, never a step wasted.", icon: "move" },
    {
      // Distinct from forward_march (allows level and sideways moves) and
      // onward_only (delayed, allows level moves): here every move must strictly
      // gain rank toward the enemy.
      filterMoves: (moves, _state, ctx) => {
        const adv = moves.filter((m) => relRank(ctx.me, m.to) > relRank(ctx.me, m.from));
        return adv.length ? adv : moves;
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
