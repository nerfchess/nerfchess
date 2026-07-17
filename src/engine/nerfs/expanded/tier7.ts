// Tier 7 (Punishing) expanded nerfs: near-crippling self-handicaps that force
// aggression, confine whole roles, or add a loss condition. Every rule below
// still leaves legal moves in the opening (pawn or knight moves always survive),
// so none soft-locks move 1. Import only from ./shared, one nerf per N(...).

import { Nerf } from "./shared";
import {
  tierNerf,
  filter,
  relRank,
  FILE,
  RANK,
  isInCheck,
  makeMove,
  countHistory,
  Color,
} from "./shared";

const N = tierNerf(7);

const other = (c: Color): Color => (c === "w" ? "b" : "w");

export const NERFS_T7: Nerf[] = [
  N(
    {
      id: "relentless_hunter",
      name: "Relentless Hunter",
      description: "You must give check on every turn you are able to.",
      flavor: "The hound never lets the scent go cold.",
      icon: "target",
    },
    {
      filterMoves: (moves, _state, ctx) => {
        const opp = other(ctx.me);
        const checks = moves.filter((m) => isInCheck(makeMove(ctx.board, m), opp));
        return checks.length ? checks : moves;
      },
    },
  ),
  N(
    {
      id: "onward_only",
      name: "Onward Only",
      description: "From your 8th move on, none of your pieces may move backward toward your own back rank.",
      flavor: "Once the march begins, there is no road home.",
      icon: "arrow-up",
    },
    {
      // Distinct from forward_march (no-backward from move 1) and
      // no_retreat_ever (must strictly advance): the ban only switches on once
      // the army has committed, from your 8th move onward.
      filterMoves: (moves, _state, ctx) => {
        if (ctx.moveNumber < 8) return moves;
        const fwd = moves.filter((m) => relRank(ctx.me, m.to) >= relRank(ctx.me, m.from));
        return fwd.length ? fwd : moves;
      },
    },
  ),
  N(
    {
      id: "straight_and_narrow",
      name: "Straight and Narrow",
      description: "You can't make any diagonal move: your bishops are stuck, your queen moves only like a rook, and your pawns can't capture.",
      flavor: "Straight lines only.",
      icon: "flag",
    },
    {
      filterMoves: filter((m) => {
        const df = Math.abs(FILE(m.to) - FILE(m.from));
        const dr = Math.abs(RANK(m.to) - RANK(m.from));
        return !(df === dr && df !== 0);
      }),
    },
  ),
  N(
    {
      id: "compulsory_capture",
      name: "No Restraint",
      description: "If you can capture you must, and if any available capture also gives check, you must make a checking capture.",
      flavor: "See blood, draw blood.",
      icon: "swords",
    },
    {
      // Distinct from checkers (any capture forced) and the conditional
      // forced-capture family (barbarian_rage/pacman/hungry_pawns): captures
      // are always forced when available, and a checking capture is forced
      // over a quiet one.
      filterMoves: (moves, _state, ctx) => {
        const caps = moves.filter((m) => m.captured);
        if (!caps.length) return moves;
        const opp = other(ctx.me);
        const checkingCaps = caps.filter((m) => isInCheck(makeMove(ctx.board, m), opp));
        return checkingCaps.length ? checkingCaps : caps;
      },
    },
  ),
  N(
    {
      id: "cloistered_queen",
      name: "Cloistered Queen",
      description: "Your queen stays cloistered and cannot move at all until you have castled.",
      flavor: "She keeps to her chambers until the king is safe behind his walls.",
      icon: "crown",
    },
    {
      // Distinct from stay_at_home_mom and caged_queen (both spatial queen
      // confinement): this is a temporal lockout. The queen is frozen until you
      // castle, then moves freely.
      filterMoves: (moves, _state, ctx) => {
        const castled = ctx.board.history.some((m) => m.color === ctx.me && !!m.castle);
        if (castled) return moves;
        return moves.filter((m) => m.piece !== "q");
      },
    },
  ),
  N(
    {
      id: "retreating_bishops",
      name: "Retreating Bishops",
      description: "Your bishops can only ever retreat toward your own back rank; they can never advance and never even hold their rank.",
      flavor: "The clergy only ever falls back.",
      icon: "church",
    },
    {
      // Distinct from timid_bishops (which merely forbids advancing, so level
      // moves are fine): here every bishop move must strictly lose rank, a pure
      // retreat.
      filterMoves: (moves, _state, ctx) =>
        moves.filter(
          (m) => !(m.piece === "b" && relRank(ctx.me, m.to) >= relRank(ctx.me, m.from)),
        ),
    },
  ),
  N(
    {
      id: "broadside_rooks",
      name: "Broadside Rooks",
      description: "Your rooks glide any distance sideways along a rank, but can only inch one square at a time up or down a file.",
      flavor: "The towers roll broadside, and only creep when they climb.",
      icon: "castle",
    },
    {
      // Distinct from sidewinder (rank-only, no vertical movement at all):
      // broadside rooks keep free horizontal range but are limited to a single
      // step vertically.
      filterMoves: filter((m) => {
        if (m.piece !== "r") return true;
        if (RANK(m.from) === RANK(m.to)) return true;
        if (FILE(m.from) === FILE(m.to)) return Math.abs(RANK(m.to) - RANK(m.from)) <= 1;
        return true;
      }),
    },
  ),
  N(
    {
      id: "predatory_knights",
      name: "Predatory Knights",
      description: "Your knights can only move by capturing an enemy piece.",
      flavor: "The horses hunt or stand still.",
      icon: "sword",
    },
    {
      filterMoves: filter((m) => !(m.piece === "n" && !m.captured)),
    },
  ),
  N(
    {
      id: "reckless_monarch",
      name: "Reckless Monarch",
      description: "Whenever your king can step toward the enemy, you must move your king forward.",
      flavor: "A king who cannot sit still.",
      icon: "flame",
    },
    {
      // Distinct from bottled_lightning (any king move forced) and skittish
      // (king forced only while in check): this forces the king specifically
      // FORWARD whenever an advancing king step is legal.
      filterMoves: (moves, _state, ctx) => {
        const charge = moves.filter(
          (m) => m.piece === "k" && relRank(ctx.me, m.to) > relRank(ctx.me, m.from),
        );
        return charge.length ? charge : moves;
      },
    },
  ),
  N(
    {
      id: "war_footing",
      name: "War Footing",
      description: "You lose if you make more than 14 non-capturing moves all game.",
      flavor: "Peace is a luxury you cannot afford.",
      icon: "timer",
    },
    {
      // Rebalance 2026-07: quiet budget raised 10 -> 14. With at most 15 enemy
      // units to capture, a 10-move budget hard-capped the whole game near 25
      // of your moves, turning most normal wins into losses by clock-out. At
      // 14 the card still demands a fast, violent game (about 29 moves) but a
      // direct attacking plan can actually finish inside it.
      init: () => ({ quiet: 0 }),
      onTurnStart: (_state, ctx) => ({
        quiet: countHistory(ctx, (m) => !m.captured),
      }),
      checkLoss: (state) =>
        (state.quiet as number) > 14 ? { reason: "too many idle turns off the attack" } : null,
      progress: (state) => ({
        value: state.quiet as number,
        max: 14,
        label: (state.quiet as number) + "/14 quiet moves",
      }),
    },
  ),
];
