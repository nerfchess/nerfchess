// Tier 6 (Cruel) expanded nerfs: heavy restrictions and self-imposed zone
// denial that strangle whole piece roles or whole regions of the board. Each
// still leaves legal moves from the opening (pawn and knight moves survive every
// rule here). Import only from ./shared, one nerf per N(...).

import { Nerf } from "./shared";
import {
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
    { id: "iron_curtain", name: "Iron Curtain", description: "You can't move any piece onto the central 16 squares (files c through f, ranks 3 through 6).", flavor: "The heart of the board is forbidden ground.", icon: "ban" },
    {
      filterMoves: filter((m) => !inCenter16(m.to)),
    },
  ),
  N(
    { id: "no_clean_trades", name: "No Clean Trades", description: "You can't make a capture if the enemy could immediately recapture on that square.", flavor: "Only take what you can keep.", icon: "shield" },
    {
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
    { id: "no_hanging_pieces", name: "No Hanging Pieces", description: "You can't make a move that leaves any of your pieces attacked by the enemy and undefended.", flavor: "Never leave a soldier exposed.", icon: "shield-alert" },
    {
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
    { id: "statue_king", name: "Statue King", description: "Your king can only move to capture; he can never take a quiet, non-capturing step.", flavor: "The stone king stirs only to crush.", icon: "crown" },
    {
      // Distinct from lame_duck (king fully frozen), sleepy_king (moves only in
      // check) and out_of_breath (moves once): the statue king may move, but
      // only when the move captures an enemy piece.
      filterMoves: filter((m) => m.piece !== "k" || !!m.captured),
    },
  ),
  N(
    { id: "caged_queen", name: "Caged Queen", description: "Your queen may never leave your own back rank.", flavor: "She rules from the throne room and nowhere else.", icon: "crown" },
    {
      // Distinct from stay_at_home_mom and cloistered_queen: this confines the
      // queen to a single rank (her back rank), not the home two ranks.
      filterMoves: (moves, _state, ctx) =>
        moves.filter((m) => !(m.piece === "q" && relRank(ctx.me, m.to) > 1)),
    },
  ),
  N(
    { id: "anchored_rooks", name: "Anchored Rooks", description: "Your rooks may never leave your back rank.", flavor: "The towers have no wheels.", icon: "castle" },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter((m) => !(m.piece === "r" && relRank(ctx.me, m.to) > 1)),
    },
  ),
  N(
    { id: "timid_bishops", name: "Timid Bishops", description: "Your bishops may only move toward your own side; their rank can never advance toward the enemy.", flavor: "Clergy who only ever retreat.", icon: "church" },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter(
          (m) => !(m.piece === "b" && relRank(ctx.me, m.to) > relRank(ctx.me, m.from)),
        ),
    },
  ),
  N(
    { id: "short_leash_knights", name: "Short Leash Knights", description: "Your knights may never move beyond your own first three ranks.", flavor: "The horses are tethered to the stable.", icon: "move" },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter((m) => !(m.piece === "n" && relRank(ctx.me, m.to) > 3)),
    },
  ),
  N(
    { id: "toothless_pawns", name: "Toothless Pawns", description: "Your pawns can never capture and can never move two squares.", flavor: "Foot soldiers who only trudge forward.", icon: "flag" },
    {
      filterMoves: filter((m) => !(m.piece === "p" && (!!m.captured || m.isDoublePawn))),
    },
  ),
  N(
    { id: "feast_or_famine", name: "Feast or Famine", description: "You lose if twelve of your turns pass in a row without you capturing anything.", flavor: "An army that does not feed, starves.", icon: "timer" },
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
        (state.dry as number) >= 12 ? { reason: "your army starved without a capture" } : null,
      progress: (state) => ({
        value: state.dry as number,
        max: 12,
        label: (state.dry as number) + "/12 hungry turns",
      }),
    },
  ),
];
