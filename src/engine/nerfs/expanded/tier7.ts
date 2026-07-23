// Tier 7 (Punishing) expanded nerfs: near-crippling self-handicaps that force
// aggression, confine whole roles, or add a loss condition. Every rule below
// still leaves legal moves in the opening (pawn or knight moves always survive),
// so none soft-locks move 1. Import only from ./shared, one nerf per N(...).

import { Nerf } from "./shared";
import {
  nerf,
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
      description: "You must give check on every turn you are able to. No card effect can grant a move that escapes this.",
      flavor: "The hound never lets the scent go cold.",
      icon: "target",
    },
    {
      // The engine applies this filter after buff augmentMoves, so a card
      // effect that adds a move cannot make an otherwise forbidden (non-check)
      // move legal on a turn where a checking move exists.
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
      description: "From your 4th move on, none of your pieces may move backward toward your own back rank.",
      flavor: "Once the march begins, there is no road home.",
      icon: "arrow-up",
    },
    {
      // Distinct from forward_march (no-backward from move 1) and
      // no_retreat_ever (must strictly advance): the ban switches on once the
      // opening is under way, from your 4th move onward, so it cannot soft-lock
      // the opening.
      filterMoves: (moves, _state, ctx) => {
        if (ctx.moveNumber < 4) return moves;
        const fwd = moves.filter((m) => relRank(ctx.me, m.to) >= relRank(ctx.me, m.from));
        return fwd.length ? fwd : moves;
      },
    },
  ),
  nerf(
    {
      id: "straight_and_narrow",
      name: "Straight and Narrow",
      description: "You can't make any diagonal move: your bishops are stuck, your queen moves only like a rook, and your pawns can't capture.",
      flavor: "Straight lines only.",
      icon: "flag",
      tier: 6,
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
      description: "From your 4th move on, if you can capture you must, and if any available capture also gives check, you must make a checking capture.",
      flavor: "See blood, draw blood.",
      icon: "swords",
    },
    {
      // Distinct from checkers (any capture forced) and the conditional
      // forced-capture family (barbarian_rage/pacman/hungry_pawns): captures
      // are always forced when available, and a checking capture is forced
      // over a quiet one. The rule holds off until your 4th move so the opening
      // cannot be soft-locked.
      filterMoves: (moves, _state, ctx) => {
        if (ctx.moveNumber < 4) return moves;
        const caps = moves.filter((m) => m.captured);
        if (!caps.length) return moves;
        const opp = other(ctx.me);
        const checkingCaps = caps.filter((m) => isInCheck(makeMove(ctx.board, m), opp));
        return checkingCaps.length ? checkingCaps : caps;
      },
    },
  ),
  nerf(
    {
      id: "cloistered_queen",
      name: "Cloistered Queen",
      description: "Your queen cannot move until you castle or reach your 12th move, whichever comes first.",
      flavor: "She keeps to her chambers until the king is safe behind his walls.",
      icon: "crown",
      tier: 5,
    },
    {
      // Distinct from stay_at_home_mom and caged_queen (both spatial queen
      // confinement): this is a temporal lockout. The queen is frozen until you
      // castle, or until your 12th move if you never castle, then moves freely.
      filterMoves: (moves, _state, ctx) => {
        const castled = ctx.board.history.some((m) => m.color === ctx.me && !!m.castle);
        if (castled || ctx.moveNumber >= 12) return moves;
        return moves.filter((m) => m.piece !== "q");
      },
    },
  ),
  nerf(
    {
      id: "retreating_bishops",
      name: "Retreating Bishops",
      description: "Your bishops can only retreat toward your own back rank, but once per game a bishop may make one non-retreating move.",
      flavor: "The clergy only ever falls back.",
      icon: "church",
      tier: 5,
    },
    {
      // Distinct from timid_bishops (which merely forbids advancing, so level
      // moves are fine): here every bishop move must strictly lose rank, a pure
      // retreat, with one exception. Once per game a bishop may take a single
      // non-retreating step (its color is preserved by the diagonal move). The
      // free step is spent as soon as any such move appears in history.
      init: () => ({ usedStep: false }),
      onTurnStart: (_state, ctx) => ({
        usedStep: ctx.board.history.some(
          (m) =>
            m.color === ctx.me &&
            m.piece === "b" &&
            relRank(ctx.me, m.to) >= relRank(ctx.me, m.from),
        ),
      }),
      filterMoves: (moves, state, ctx) => {
        const usedStep = state.usedStep as boolean;
        return moves.filter((m) => {
          if (m.piece !== "b") return true;
          // Pure retreats (strictly losing rank) are always allowed.
          if (relRank(ctx.me, m.to) < relRank(ctx.me, m.from)) return true;
          // A non-retreating bishop move is only offered while the once-per-game
          // step is unused.
          return !usedStep;
        });
      },
    },
  ),
  nerf(
    {
      id: "broadside_rooks",
      name: "Broadside Rooks",
      description: "Your rooks glide any distance sideways along a rank, but can only inch one square at a time up or down a file.",
      flavor: "The towers roll broadside, and only creep when they climb.",
      icon: "castle",
      tier: 4,
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
  nerf(
    {
      id: "predatory_knights",
      name: "Predatory Knights",
      description: "Your knights can only move by capturing, except that every third turn a knight with no capture may make one quiet move.",
      flavor: "The horses hunt or stand still.",
      icon: "sword",
      tier: 6,
    },
    {
      // Knights are capture-only, but on every third owner turn (moves 3, 6, 9,
      // ...) a non-capturing knight move is allowed as well.
      filterMoves: (moves, _state, ctx) => {
        if (ctx.moveNumber % 3 === 0) return moves;
        return moves.filter((m) => !(m.piece === "n" && !m.captured));
      },
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
      description: "You lose if you make more than 12 non-capturing moves all game.",
      flavor: "Peace is a luxury you cannot afford.",
      icon: "timer",
    },
    {
      // Rebalance 2026-07: quiet budget raised 10 -> 14, then trimmed 14 -> 12
      // to tighten the grace window by two turns. The card still demands a fast,
      // violent game but leaves room for a direct attacking plan to finish.
      init: () => ({ quiet: 0 }),
      onTurnStart: (_state, ctx) => ({
        quiet: countHistory(ctx, (m) => !m.captured),
      }),
      checkLoss: (state) =>
        (state.quiet as number) > 12 ? { reason: "too many idle turns off the attack" } : null,
      progress: (state) => ({
        value: state.quiet as number,
        max: 12,
        label: (state.quiet as number) + "/12 quiet moves",
      }),
    },
  ),
];
