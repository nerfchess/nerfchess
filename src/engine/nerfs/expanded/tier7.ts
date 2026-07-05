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
      description: "Your pieces can never move backward, toward your own back rank.",
      flavor: "There is no road home.",
      icon: "arrow-up",
    },
    {
      filterMoves: (moves, _state, ctx) => {
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
      description: "If you have any capture available, you must make a capture.",
      flavor: "See blood, draw blood.",
      icon: "swords",
    },
    {
      filterMoves: (moves) => {
        const caps = moves.filter((m) => m.captured);
        return caps.length ? caps : moves;
      },
    },
  ),
  N(
    {
      id: "cloistered_queen",
      name: "Cloistered Queen",
      description: "Your queen can never leave your first two ranks.",
      flavor: "Her Majesty keeps to her chambers.",
      icon: "crown",
    },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter((m) => !(m.piece === "q" && relRank(ctx.me, m.to) > 2)),
    },
  ),
  N(
    {
      id: "retreating_bishops",
      name: "Retreating Bishops",
      description: "Your bishops can never move toward the enemy; a bishop's rank may only decrease.",
      flavor: "The clergy only ever falls back.",
      icon: "church",
    },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter(
          (m) => !(m.piece === "b" && relRank(ctx.me, m.to) > relRank(ctx.me, m.from)),
        ),
    },
  ),
  N(
    {
      id: "broadside_rooks",
      name: "Broadside Rooks",
      description: "Your rooks can only move sideways along ranks, never forward or backward along files.",
      flavor: "The towers slide, but never climb.",
      icon: "castle",
    },
    {
      filterMoves: filter((m) => !(m.piece === "r" && RANK(m.from) !== RANK(m.to))),
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
      description: "Whenever your king has a legal move, you must move your king.",
      flavor: "A king who cannot sit still.",
      icon: "flame",
    },
    {
      filterMoves: (moves) => {
        const kingMoves = moves.filter((m) => m.piece === "k");
        return kingMoves.length ? kingMoves : moves;
      },
    },
  ),
  N(
    {
      id: "war_footing",
      name: "War Footing",
      description: "You lose if you make more than 10 non-capturing moves all game.",
      flavor: "Peace is a luxury you cannot afford.",
      icon: "timer",
    },
    {
      init: () => ({ quiet: 0 }),
      onTurnStart: (_state, ctx) => ({
        quiet: countHistory(ctx, (m) => !m.captured),
      }),
      checkLoss: (state) =>
        (state.quiet as number) > 10 ? { reason: "too many idle turns off the attack" } : null,
      progress: (state) => ({
        value: state.quiet as number,
        max: 10,
        label: (state.quiet as number) + "/10 quiet moves",
      }),
    },
  ),
];
