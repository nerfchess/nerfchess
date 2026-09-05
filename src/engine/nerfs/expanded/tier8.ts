// Tier 8 (Unhinged) expanded nerfs: extreme, near-unplayable self-handicaps that
// confine whole armies, forbid capturing outright, force perpetual pawn marches,
// or turn a single check into a loss. Every rule below still leaves a legal move
// in the opening (pawn moves always survive, so no rule soft-locks move 1).
// Import only from ./shared, one nerf per N(...).

import { Nerf } from "./shared";
import { nerf, tierNerf, filter, relRank, cheb, isInCheck, FILE } from "./shared";

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
      description: "You can't move any piece past your own fourth rank; the enemy half of the board is off limits. Spawned pieces and teleports can't bypass the boundary either.",
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
      description: "You can never capture an enemy piece, except the king to win. No card effect can capture on your behalf either, except one that captures the king.",
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
  nerf(
    {
      id: "retrograde_knights",
      name: "Retrograde Knights",
      description: "Your knights can only move homeward, toward your own side, and can never advance, except that each knight's first move off its home square is exempt from the homeward rule.",
      flavor: "Horses that only ever bolt for the stable.",
      icon: "move",
      tier: 5,
    },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter((m) => {
          if (m.piece !== "n") return true;
          // Homeward (strictly toward own back rank) is always allowed.
          if (relRank(ctx.me, m.to) < relRank(ctx.me, m.from)) return true;
          // First-move exception: a knight still on its home square (b/g file,
          // own back rank) that has not moved yet gets one move exempt from the
          // homeward rule, so it can leave the wall it would otherwise be stuck
          // against. History with no prior knight move from this square proves
          // it is still the first move.
          const home =
            relRank(ctx.me, m.from) === 1 && (FILE(m.from) === 1 || FILE(m.from) === 6);
          if (
            home &&
            !ctx.board.history.some(
              (h) => h.color === ctx.me && h.piece === "n" && h.from === m.from,
            )
          ) {
            return true;
          }
          return false;
        }),
    },
  ),
  nerf(
    {
      id: "crippled_clergy",
      name: "Crippled Clergy",
      description: "Each bishop of yours shuffles: every bishop move covers a single diagonal step.",
      flavor: "The priests hobble along on canes.",
      icon: "church",
      tier: 5,
    },
    {
      filterMoves: filter((m) => !(m.piece === "b" && cheb(m.from, m.to) > 1)),
    },
  ),
  nerf(
    {
      id: "hobbled_queen",
      name: "Hobbled Queen",
      description: "Your queen can only move one square at a time, like a second king.",
      flavor: "Her crown is heavy and her feet are sore.",
      icon: "crown",
      tier: 6,
    },
    {
      filterMoves: filter((m) => !(m.piece === "q" && cheb(m.from, m.to) > 1)),
    },
  ),
  N(
    {
      id: "glass_king",
      name: "Glass King",
      description: "From your move 10 on, your king is exiled from his own back two ranks: he must leave them if he is still there, may never step back onto them, and from that move any check anywhere on the board loses instantly.",
      tip: "Before move 10 he is safe at home, so use those moves to find him somewhere else to live.",
      flavor: "Safe in his chambers, shattered in the open.",
      icon: "shield-alert",
    },
    {
      // Timed exile: through move 9 the king is unrestricted and safe. From
      // move 10 the glass sets: he can never move onto his home two ranks, must
      // be driven off them if still there, and any check at all is fatal.
      // Reads the live board and my move number only, no persistent state.
      filterMoves: (moves, _state, ctx) => {
        if (ctx.moveNumber < 10) return moves;
        let ks = -1;
        for (let sq = 0; sq < 64; sq++) {
          const p = ctx.board.pieces[sq];
          if (p && p.color === ctx.me && p.type === "k") {
            ks = sq;
            break;
          }
        }
        // The king may never move onto his own back two ranks.
        let out = moves.filter(
          (m) => !(m.piece === "k" && relRank(ctx.me, m.to) <= 2),
        );
        // If he is still on those ranks, he must leave: allow only king moves
        // that carry him off, unless no such move exists (never soft-lock).
        if (ks >= 0 && relRank(ctx.me, ks) <= 2) {
          const exits = out.filter(
            (m) => m.piece === "k" && relRank(ctx.me, m.to) > 2,
          );
          if (exits.length > 0) out = exits;
        }
        return out;
      },
      checkLoss: (_state, ctx) => {
        if (ctx.moveNumber < 10) return null;
        return isInCheck(ctx.board, ctx.me)
          ? { reason: "your glass king shattered in the open" }
          : null;
      },
    },
  ),
  nerf(
    {
      id: "march_or_die",
      name: "March or Die",
      description: "You lose if four of your turns pass in a row without you moving a pawn.",
      flavor: "The drum never stops, and neither can the column.",
      icon: "timer",
      tier: 5,
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
        (state.dry as number) >= 4 ? { reason: "the column halted and was overrun" } : null,
      progress: (state) => ({
        value: state.dry as number,
        max: 4,
        label: (state.dry as number) + "/4 turns since a pawn moved",
      }),
    },
  ),
];
