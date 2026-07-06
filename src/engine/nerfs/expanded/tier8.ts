// Tier 8 (Unhinged) expanded nerfs: extreme, near-unplayable self-handicaps that
// confine whole armies, forbid capturing outright, force perpetual pawn marches,
// or turn a single check into a loss. Every rule below still leaves a legal move
// in the opening (pawn moves always survive, so no rule soft-locks move 1).
// Import only from ./shared, one nerf per N(...).

import { Nerf } from "./shared";
import { tierNerf, filter, relRank, FILE, cheb, isInCheck } from "./shared";

const N = tierNerf(8);

// Retired duplicate: "Foot Soldiers Only" was mechanically identical to
// Serf Labor (pawns and king only). It is kept OUT of the tier 8 pool and
// the Codex, but stays resolvable by id (via RETIRED_NERFS in
// implemented.ts) so replays and histories of old games still render.
export const FOOTSOLDIERS_ONLY: Nerf = N(
  {
    id: "footsoldiers_only",
    name: "Foot Soldiers Only",
    description: "You can only move pawns and your king. Every other piece is rooted in place.",
    flavor: "The generals have all deserted.",
    icon: "users",
  },
  {
    filterMoves: filter((m) => m.piece === "p" || m.piece === "k"),
  },
);

export const NERFS_T8: Nerf[] = [
  N(
    {
      id: "serf_labor",
      name: "Serf Labor",
      description: "You can only move your pawns and your king. No other piece may ever move.",
      flavor: "The nobles sit idle while the peasants toil.",
      icon: "flag",
    },
    {
      filterMoves: filter((m) => m.piece === "p" || m.piece === "k"),
    },
  ),
  N(
    {
      id: "own_half_only",
      name: "Own Half Only",
      description: "You can't move any piece past your own fourth rank; the enemy half of the board is off limits.",
      flavor: "Cross the line and you never come back, so no one crosses.",
      icon: "fence",
    },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter((m) => relRank(ctx.me, m.to) <= 4),
    },
  ),
  N(
    {
      id: "total_pacifism",
      name: "Total Pacifism",
      description: "You can never capture an enemy piece, except the king to win.",
      flavor: "A war fought entirely by dancing around each other, right up to the last step.",
      icon: "heart",
    },
    {
      // Forbid every capture but the king itself. Winning is king capture, so
      // banning that too would make the game literally unwinnable for you (best
      // case a draw). The one lethal exception keeps the handicap brutal but
      // still winnable.
      filterMoves: filter((m) => !m.captured || m.captured === "k"),
    },
  ),
  N(
    {
      id: "retrograde_knights",
      name: "Retrograde Knights",
      description: "Your knights can only move backward toward your own side; a knight's rank can never advance.",
      flavor: "Horses that only ever bolt for the stable.",
      icon: "move",
    },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter(
          (m) => !(m.piece === "n" && relRank(ctx.me, m.to) >= relRank(ctx.me, m.from)),
        ),
    },
  ),
  N(
    {
      id: "crippled_clergy",
      name: "Crippled Clergy",
      description: "Your bishops can only move one square at a time.",
      flavor: "The priests hobble along on canes.",
      icon: "church",
    },
    {
      filterMoves: filter((m) => !(m.piece === "b" && cheb(m.from, m.to) > 1)),
    },
  ),
  N(
    {
      id: "rooks_charge",
      name: "Rooks Charge",
      description: "Your rooks can only move straight forward toward the enemy, never sideways or backward.",
      flavor: "The towers only know one command: advance.",
      icon: "castle",
    },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter(
          (m) =>
            !(
              m.piece === "r" &&
              !(FILE(m.to) === FILE(m.from) && relRank(ctx.me, m.to) > relRank(ctx.me, m.from))
            ),
        ),
    },
  ),
  N(
    {
      id: "hobbled_queen",
      name: "Hobbled Queen",
      description: "Your queen can only move one square at a time, like a second king.",
      flavor: "Her crown is heavy and her feet are sore.",
      icon: "crown",
    },
    {
      filterMoves: filter((m) => !(m.piece === "q" && cheb(m.from, m.to) > 1)),
    },
  ),
  N(
    {
      id: "glass_king",
      name: "Glass King",
      description: "You lose the instant your king is put in check even once.",
      flavor: "One touch and the throne shatters.",
      icon: "shield-alert",
    },
    {
      checkLoss: (_state, ctx) =>
        isInCheck(ctx.board, ctx.me) ? { reason: "your glass king was checked" } : null,
    },
  ),
  N(
    {
      id: "march_or_die",
      name: "March or Die",
      description: "You lose if six of your turns pass in a row without you moving a pawn.",
      flavor: "The drum never stops, and neither can the column.",
      icon: "timer",
    },
    {
      init: () => ({ dry: 0 }),
      onTurnStart: (_state, ctx) => {
        const mine = ctx.board.history.filter((m) => m.color === ctx.me);
        let dry = 0;
        for (let i = mine.length - 1; i >= 0; i--) {
          if (mine[i].piece === "p") break;
          dry++;
        }
        return { dry };
      },
      checkLoss: (state) =>
        (state.dry as number) >= 6 ? { reason: "the column halted and was overrun" } : null,
      progress: (state) => ({
        value: state.dry as number,
        max: 6,
        label: (state.dry as number) + "/6 turns since a pawn moved",
      }),
    },
  ),
];
