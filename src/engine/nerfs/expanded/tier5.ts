// Tier 5 (Brutal) expanded nerfs: strong restrictions that mostly disable a
// piece role, plus counter-based losses. Each still leaves legal moves from the
// opening (pawn moves survive every rule here). Import only from
// ./shared, one nerf per N(...).

import { Nerf } from "./shared";
import {
  nerf,
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
  nerf(
    { id: "defanged_queen", name: "Defanged Queen", description: "Your queen can't capture and can't give check.", flavor: "All crown, no claws.", icon: "crown", tier: 6 },
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
  nerf(
    { id: "stunted_rooks", name: "Stunted Rooks", description: "From your fourth move on, your rooks can only move one square at a time.", flavor: "The towers shuffle inch by inch.", icon: "castle", tier: 6 },
    {
      // Activation delayed until move 4 (moveNumber >= 3): the first three moves
      // are unrestricted so the opening cannot be soft-locked.
      filterMoves: (moves, _state, ctx) =>
        ctx.moveNumber < 3
          ? moves
          : moves.filter((m) => !(m.piece === "r" && cheb(m.from, m.to) > 1)),
    },
  ),
  nerf(
    { id: "myopic_bishops", name: "Myopic Bishops", description: "From your fourth move on, your bishops can't move more than two squares.", flavor: "They can't see past the next tile.", icon: "church", tier: 6 },
    {
      // Activation delayed until move 4 (moveNumber >= 3): the first three moves
      // are unrestricted so the opening cannot be soft-locked.
      filterMoves: (moves, _state, ctx) =>
        ctx.moveNumber < 3
          ? moves
          : moves.filter((m) => !(m.piece === "b" && cheb(m.from, m.to) > 2)),
    },
  ),
  nerf(
    { id: "hobbled_knights", name: "Hobbled Knights", description: "Your knights can't advance toward the enemy side; their rank may never increase.", flavor: "The horses only ever fall back.", icon: "move", tier: 6 },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter(
          (m) => !(m.piece === "n" && relRank(ctx.me, m.to) > relRank(ctx.me, m.from)),
        ),
    },
  ),
  N(
    { id: "homebound_pawns", name: "Homebound Pawns", description: "From your fourth move on, your pawns can't advance past the halfway line unless the move is a capture; only by force can they cross into enemy soil.", flavor: "They only leave home soil to seize ground by force.", icon: "flag" },
    {
      // Distinct from pawn_ceiling (a hard wall at midfield for every pawn
      // move): a capturing pawn move may still cross the halfway line here.
      // Activation delayed until after move 3 (moveNumber >= 3): the rule starts
      // on your fourth move.
      filterMoves: (moves, _state, ctx) =>
        ctx.moveNumber < 3
          ? moves
          : moves.filter(
              (m) => !(m.piece === "p" && !m.captured && relRank(ctx.me, m.to) > 4),
            ),
    },
  ),
  nerf(
    { id: "no_mans_land", name: "No Man's Land", description: "You can't move any piece onto a square your opponent currently attacks, except once per game you may step onto an attacked square.", flavor: "Every guarded square is a minefield.", icon: "ban", tier: 6 },
    {
      // Once-per-game exemption: you may make a single move onto an attacked
      // square. Whether the attacked squares depend on the live position (not on
      // the move alone), so the exemption is tracked in state: onTurnStart
      // snapshots the danger squares you are about to move from, and next turn
      // checks whether your last move landed on one of them, spending the token.
      init: () => ({ spent: false, danger: [] as number[] }),
      onTurnStart: (state, ctx) => {
        let spent = state.spent as boolean;
        const prevDanger = state.danger as number[];
        const last = ctx.myLastMove;
        if (!spent && last && prevDanger.includes(last.to)) spent = true;
        return { spent, danger: [...attackedBy(ctx.board, other(ctx.me))] };
      },
      filterMoves: (moves, state, ctx) => {
        // While the token is unspent, every move is offered: stepping onto an
        // attacked square spends the token (recorded next turn). Once spent, the
        // ban is absolute, with a soft-lock fallback if no safe square remains.
        if (!(state.spent as boolean)) return moves;
        const atk = attackedBy(ctx.board, other(ctx.me));
        const safe = moves.filter((m) => !atk.has(m.to));
        return safe.length ? safe : moves;
      },
    },
  ),
  nerf(
    { id: "pawns_do_the_dirty_work", name: "Pawns Do the Dirty Work", description: "Only your pawns may capture; none of your other pieces can capture.", flavor: "The officers keep their hands clean.", icon: "swords", tier: 6 },
    {
      filterMoves: filter((m) => !(m.captured && m.piece !== "p")),
    },
  ),
  nerf(
    { id: "no_retreat_ever", name: "No Retreat Ever", description: "Every move you make must advance toward the enemy; no piece may move backward or even hold its rank, except one non-advancing move is allowed once per game.", flavor: "Only ever forward, never a step wasted.", icon: "move", tier: 6 },
    {
      // Distinct from forward_march (allows level and sideways moves) and
      // onward_only (delayed, allows level moves): here every move must strictly
      // gain rank toward the enemy. Once-per-game exemption: a single
      // non-advancing move is allowed. It is spent the first time one appears in
      // history (relRank not increasing), after which advance is forced again.
      filterMoves: (moves, _state, ctx) => {
        const usedExemption = ctx.board.history.some(
          (m) => m.color === ctx.me && relRank(ctx.me, m.to) <= relRank(ctx.me, m.from),
        );
        if (!usedExemption) return moves;
        const adv = moves.filter((m) => relRank(ctx.me, m.to) > relRank(ctx.me, m.from));
        return adv.length ? adv : moves;
      },
    },
  ),
  nerf(
    { id: "blood_quota", name: "Blood Quota", description: "You may make only six captures all game. One compliance token excuses a single extra capture; you lose only when you make an eighth capture.", flavor: "Six heads, then sheathe the sword.", icon: "droplet", tier: 6 },
    {
      // The loss condition stays a capture-count limit. One compliance token
      // excuses the seventh capture, so the loss only fires past seven.
      init: () => ({ caps: 0 }),
      onTurnStart: (_state, ctx) => ({ caps: countHistory(ctx, (m) => !!m.captured) }),
      checkLoss: (state) =>
        (state.caps as number) > 7 ? { reason: "you exceeded your blood quota" } : null,
      progress: (state) => {
        const caps = state.caps as number;
        return {
          value: Math.min(caps, 6),
          max: 6,
          label: caps > 6 ? "6/6 captures, compliance token spent" : caps + "/6 captures",
        };
      },
    },
  ),
  nerf(
    { id: "restless_crown", name: "Restless Crown", description: "Your king may move only six times all game. One compliance token excuses a single extra king move; you lose only on his eighth move.", flavor: "A wandering king loses his kingdom.", icon: "crown", tier: 6 },
    {
      // The loss condition stays a king-move limit. One compliance token excuses
      // the seventh king move, so the loss only fires past seven.
      init: () => ({ kingMoves: 0 }),
      onTurnStart: (_state, ctx) => ({ kingMoves: countHistory(ctx, (m) => m.piece === "k") }),
      checkLoss: (state) =>
        (state.kingMoves as number) > 7 ? { reason: "your king wandered too far" } : null,
      progress: (state) => {
        const kingMoves = state.kingMoves as number;
        return {
          value: Math.min(kingMoves, 6),
          max: 6,
          label: kingMoves > 6 ? "6/6 king moves, compliance token spent" : kingMoves + "/6 king moves",
        };
      },
    },
  ),
];
