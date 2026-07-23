// Tier 6 (Cruel) expanded nerfs: heavy restrictions and self-imposed zone
// denial that strangle whole piece roles or whole regions of the board. Each
// still leaves legal moves from the opening (pawn and knight moves survive every
// rule here). Import only from ./shared, one nerf per N(...).

import { Nerf } from "./shared";
import {
  nerf,
  tierNerf,
  filter,
  relRank,
  FILE,
  RANK,
  attackedBy,
  makeMove,
  Color,
  Square,
} from "./shared";

const N = tierNerf(6);

const other = (c: Color): Color => (c === "w" ? "b" : "w");

// The central 16 squares: files c..f (2..5) and ranks 3..6 (2..5, zero-based).
const inCenter16 = (sq: Square) =>
  FILE(sq) >= 2 && FILE(sq) <= 5 && RANK(sq) >= 2 && RANK(sq) <= 5;

export const NERFS_T6: Nerf[] = [
  N(
    { id: "iron_curtain", name: "Iron Curtain", description: "You can't move any piece onto the central 16 squares (files c through f, ranks 3 through 6). Card-granted drops and teleports onto those squares are blocked the same way.", flavor: "The heart of the board is forbidden ground.", icon: "ban" },
    {
      // The nerf filter runs after buffs add their moves, so a card-granted
      // move (a drop or teleport) that lands on the center is rejected too:
      // spawned and teleported pieces obey the zone immediately.
      filterMoves: filter((m) => !inCenter16(m.to)),
    },
  ),
  N(
    { id: "no_clean_trades", name: "No Clean Trades", description: "You can't make a capture if the enemy could immediately recapture on that square. No card effect can make such a capture legal.", flavor: "Only take what you can keep.", icon: "shield" },
    {
      // The nerf filter runs after buffs add their moves, so a card-granted
      // capture that could be recaptured is filtered out too: a card effect
      // cannot make an otherwise forbidden capture legal.
      filterMoves: (moves, _state, ctx) => {
        const opp = other(ctx.me);
        return moves.filter((m) => {
          if (!m.captured) return true;
          const nb = makeMove(ctx.board, m);
          return !attackedBy(nb, opp).has(m.to);
        });
      },
    },
  ),
  N(
    { id: "no_hanging_pieces", name: "No Hanging Pieces", description: "You can't make a move that leaves any of your pieces attacked by the enemy and undefended. Card-granted drops and teleports must obey this too.", flavor: "Never leave a soldier exposed.", icon: "shield-alert" },
    {
      // The nerf filter runs after buffs add their moves, so a card-granted
      // move (a drop or teleport) that would leave a piece hanging is rejected
      // too: spawned and teleported pieces obey the rule immediately.
      filterMoves: (moves, _state, ctx) => {
        const me = ctx.me;
        const opp = other(me);
        return moves.filter((m) => {
          const nb = makeMove(ctx.board, m);
          const oppAtk = attackedBy(nb, opp);
          const myDef = attackedBy(nb, me);
          for (let sq = 0; sq < 64; sq++) {
            const p = nb.pieces[sq];
            if (!p || p.color !== me || p.type === "k") continue;
            if (oppAtk.has(sq) && !myDef.has(sq)) return false;
          }
          return true;
        });
      },
    },
  ),
  N(
    { id: "statue_king", name: "Statue King", description: "Your king can only move to capture; he can never take a quiet, non-capturing step, and no card effect can grant him one.", flavor: "The stone king stirs only to crush.", icon: "crown" },
    {
      // Distinct from lame_duck (king fully frozen), sleepy_king (moves only in
      // check) and out_of_breath (moves once): the statue king may move, but
      // only when the move captures an enemy piece. The nerf filter runs after
      // buffs add their moves, so a card-granted quiet king step is filtered
      // out too: a card effect cannot make an otherwise forbidden king move
      // legal.
      filterMoves: filter((m) => m.piece !== "k" || !!m.captured),
    },
  ),
  nerf(
    { id: "caged_queen", name: "Caged Queen", tier: 5, description: "Until you have made 12 moves your queen may not leave your back rank; after that she may leave it but can never cross the midline into the enemy half.", flavor: "She rules from the throne room, and ventures out only late.", icon: "crown" },
    {
      // Distinct from stay_at_home_mom and cloistered_queen: this confines the
      // queen to her own back rank until move 12, then to her own half of the
      // board (never past the midline) for the rest of the game.
      filterMoves: (moves, _state, ctx) =>
        moves.filter((m) => {
          if (m.piece !== "q") return true;
          // She can never cross the midline into the enemy half.
          if (relRank(ctx.me, m.to) > 4) return false;
          // Before you have made 12 moves, she may not leave the back rank.
          if (ctx.moveNumber < 12 && relRank(ctx.me, m.to) > 1) return false;
          return true;
        }),
    },
  ),
  nerf(
    { id: "anchored_rooks", name: "Anchored Rooks", tier: 5, description: "Your rooks may leave your back rank, but once a rook has left it, that rook can never return to it.", flavor: "The towers roll out once, and never roll home.", icon: "castle" },
    {
      // A rook already off the back rank may not step back onto it. Since a
      // departed rook can never return, each rook effectively leaves once.
      filterMoves: (moves, _state, ctx) =>
        moves.filter(
          (m) => !(m.piece === "r" && relRank(ctx.me, m.from) > 1 && relRank(ctx.me, m.to) === 1),
        ),
    },
  ),
  nerf(
    { id: "timid_bishops", name: "Timid Bishops", tier: 5, description: "Your bishops may only move toward your own side; their rank can never advance toward the enemy.", flavor: "Clergy who only ever retreat.", icon: "church" },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter(
          (m) => !(m.piece === "b" && relRank(ctx.me, m.to) > relRank(ctx.me, m.from)),
        ),
    },
  ),
  nerf(
    { id: "short_leash_knights", name: "Short Leash Knights", tier: 5, description: "Your knights may never move beyond your own first three ranks.", flavor: "The horses are tethered to the stable.", icon: "move" },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter((m) => !(m.piece === "n" && relRank(ctx.me, m.to) > 3)),
    },
  ),
  nerf(
    { id: "toothless_pawns", name: "Toothless Pawns", tier: 5, description: "Your pawns can never capture and can never move two squares.", flavor: "Foot soldiers who only trudge forward.", icon: "flag" },
    {
      filterMoves: filter((m) => !(m.piece === "p" && (!!m.captured || m.isDoublePawn))),
    },
  ),
  N(
    { id: "feast_or_famine", name: "Feast or Famine", description: "You lose if ten of your turns pass in a row without you capturing anything.", flavor: "An army that does not feed, starves.", icon: "timer" },
    {
      init: () => ({ dry: 0 }),
      onTurnStart: (_state, ctx) => {
        const mine = ctx.board.history.filter((m) => m.color === ctx.me);
        let dry = 0;
        for (let i = mine.length - 1; i >= 0; i--) {
          if (mine[i].captured) break;
          dry++;
        }
        return { dry };
      },
      checkLoss: (state) =>
        (state.dry as number) >= 10 ? { reason: "your army starved without a capture" } : null,
      progress: (state) => ({
        value: state.dry as number,
        max: 10,
        label: (state.dry as number) + "/10 hungry turns",
      }),
    },
  ),
];
