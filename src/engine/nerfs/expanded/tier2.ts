// Tier 2 (Easy) expanded nerfs: single piece-type restrictions and mild
// standing rules, each easily worked around and always leaving legal moves from
// the opening. Import only from ./shared, one nerf per `N(...)`.

import { Nerf } from "./shared";
import {
  nerf,
  tierNerf,
  relRank,
  FILE,
  RANK,
  SQ,
  inBoard,
  cheb,
  isInCheck,
  makeMove,
} from "./shared";

const N = tierNerf(2);
const N4 = tierNerf(4);

export const NERFS_T2: Nerf[] = [
  nerf(
    { id: "orthodox_king", name: "Orthodox King", description: "Your king can only move horizontally or vertically, never diagonally, except if no other legal move is available, your king may move diagonally.", flavor: "His majesty walks a straight line.", icon: "plus", tier: 3 },
    {
      filterMoves: (moves) => {
        const kept = moves.filter((m) => {
          if (m.piece !== "k") return true;
          const df = Math.abs(FILE(m.to) - FILE(m.from));
          const dr = Math.abs(RANK(m.to) - RANK(m.from));
          return !(df === 1 && dr === 1);
        });
        if (kept.length > 0) return kept;
        // No compliant move exists: allow one king move (the diagonal steps this
        // rule would otherwise forbid) as an escape.
        const kingMoves = moves.filter((m) => m.piece === "k");
        return kingMoves.length ? kingMoves : moves;
      },
    },
  ),
  nerf(
    { id: "cavalry_charge", name: "Cavalry Charge", description: "Your knights can't move backward toward your own side, except if no other legal move is available, your king may move.", flavor: "Horses only know one direction: forward.", icon: "move-up", tier: 3 },
    {
      filterMoves: (moves, _state, ctx) => {
        const kept = moves.filter((m) => !(m.piece === "n" && relRank(ctx.me, m.to) < relRank(ctx.me, m.from)));
        if (kept.length > 0) return kept;
        // No compliant move exists: allow one king move as an escape.
        const kingMoves = moves.filter((m) => m.piece === "k");
        return kingMoves.length ? kingMoves : moves;
      },
    },
  ),
  N4(
    { id: "monastic_vows", name: "Monastic Vows", description: "Your bishops can't capture, except capturing a piece that has your king in check is always legal.", flavor: "The clergy have sworn off bloodshed.", icon: "church" },
    {
      filterMoves: (moves, _state, ctx) => {
        const inCheck = isInCheck(ctx.board, ctx.me);
        return moves.filter((m) => {
          if (!(m.piece === "b" && m.captured)) return true;
          // Banned bishop capture: allowed only if it answers a check.
          return inCheck && !isInCheck(makeMove(ctx.board, m), ctx.me);
        });
      },
    },
  ),
  nerf(
    { id: "cramped_rooks", name: "Cramped Rooks", description: "Your rooks can't move more than 4 squares, except one longer rook move is allowed once per game.", flavor: "The towers are stiff in the joints.", icon: "castle", tier: 3 },
    {
      filterMoves: (moves, _state, ctx) => {
        // Once-per-game exemption: a single rook move longer than 4 squares is
        // allowed. After the first one (recorded in history), the cap returns.
        const usedLong = ctx.board.history.some(
          (m) => m.color === ctx.me && m.piece === "r" && cheb(m.from, m.to) > 4,
        );
        return moves.filter((m) => !(m.piece === "r" && cheb(m.from, m.to) > 4) || !usedLong);
      },
    },
  ),
  N(
    { id: "merciful_queen", name: "Merciful Queen", description: "Your queen won't cut down the common soldiers: she can't capture pawns, except capturing a pawn that has your king in check is always legal.", flavor: "She will not stoop to slaying peasants.", icon: "crown" },
    // Distinct from trophy_wife/defanged_queen (queen can't capture at all):
    // the merciful queen still takes pieces, just never a pawn.
    {
      filterMoves: (moves, _state, ctx) => {
        const inCheck = isInCheck(ctx.board, ctx.me);
        return moves.filter((m) => {
          if (!(m.piece === "q" && m.captured === "p")) return true;
          // Banned pawn capture: allowed only if it answers a check.
          return inCheck && !isInCheck(makeMove(ctx.board, m), ctx.me);
        });
      },
    },
  ),
  nerf(
    { id: "pawn_ceiling", name: "Pawn Ceiling", description: "Starting on your fourth move, your pawns can't move past the middle of the board.", flavor: "The infantry hits an invisible wall at midfield.", icon: "flag", tier: 3 },
    {
      filterMoves: (moves, _state, ctx) =>
        ctx.moveNumber < 3
          ? moves
          : moves.filter((m) => !(m.piece === "p" && relRank(ctx.me, m.to) > 4)),
    },
  ),
  N(
    { id: "knights_abroad", name: "Knights Abroad", description: "Once one of your knights crosses into the enemy half, it can't come back to your own half, except once per game, when no other legal move is available, one knight may return home.", flavor: "The cavalry only feels alive in enemy territory.", icon: "ban" },
    {
      filterMoves: (moves, _state, ctx) => {
        const kept = moves.filter(
          (m) =>
            !(
              m.piece === "n" &&
              relRank(ctx.me, m.from) > 4 &&
              relRank(ctx.me, m.to) <= 4
            ),
        );
        if (kept.length > 0) return kept;
        // No compliant move exists: a knight may return home once per game. The
        // exemption is spent the first time such a return appears in history.
        const usedExemption = ctx.board.history.some(
          (m) =>
            m.color === ctx.me &&
            m.piece === "n" &&
            relRank(ctx.me, m.from) > 4 &&
            relRank(ctx.me, m.to) <= 4,
        );
        return usedExemption ? kept : moves;
      },
    },
  ),
  nerf(
    { id: "advancing_faith", name: "Advancing Faith", description: "Your bishops must gain ground on every move: each bishop move has to advance toward the enemy, never staying level and never falling back, except a bishop move that gets your king out of check is always allowed.", flavor: "The faithful only ever press onward.", icon: "move-up", tier: 4 },
    {
      // Distinct from clergy (allows level bishop moves) and one_way_bishops
      // (allows backward captures): advancing_faith requires every bishop move
      // to strictly gain rank, unless the move is a legal response to check.
      filterMoves: (moves, _state, ctx) => {
        const inCheck = isInCheck(ctx.board, ctx.me);
        return moves.filter((m) => {
          if (!(m.piece === "b" && relRank(ctx.me, m.to) <= relRank(ctx.me, m.from))) return true;
          // Non-advancing bishop move: allowed only if it answers a check.
          return inCheck && !isInCheck(makeMove(ctx.board, m), ctx.me);
        });
      },
    },
  ),
  N(
    { id: "columnar_rooks", name: "Columnar Rooks", description: "The squares your rooks may not slide sideways into are shown from the start. From your second turn on, your rooks glide any distance up and down a file, but can only shuffle one square at a time sideways along a rank.", flavor: "The towers ride the elevator; sideways, they only inch.", icon: "move-vertical" },
    // Distinct from no_shuffling (rooks may never move sideways at all):
    // columnar rooks keep full vertical range but get a single sideways step.
    {
      // The restricted region (the far sideways squares behind and ahead of each
      // rook along its rank) is revealed from move one; the ban itself waits one
      // turn so you see it coming before it bites.
      filterMoves: (moves, _state, ctx) =>
        ctx.moveNumber < 1
          ? moves
          : moves.filter((m) => {
              if (m.piece !== "r") return true;
              if (FILE(m.from) === FILE(m.to)) return true;
              if (RANK(m.from) === RANK(m.to)) return cheb(m.from, m.to) <= 1;
              return true;
            }),
      visual: (_state, ctx) => {
        const banned: number[] = [];
        for (let sq = 0; sq < 64; sq++) {
          const p = ctx.board.pieces[sq];
          if (!p || p.color !== ctx.me || p.type !== "r") continue;
          const r = RANK(sq);
          for (const df of [-1, 1]) {
            let f = FILE(sq) + df;
            let dist = 1;
            while (inBoard(f, r)) {
              const t = SQ(f, r);
              if (dist > 1) {
                banned.push(t); // sideways move of 2+ squares is forbidden here
                if (ctx.board.pieces[t]) break; // banned capture square, ray ends
              } else if (ctx.board.pieces[t]) {
                break; // single-step blocker: that move is allowed, ray ends
              }
              f += df;
              dist++;
            }
          }
        }
        return { bannedSquares: banned };
      },
    },
  ),
  nerf(
    { id: "queen_fatigue", name: "Queen Fatigue", description: "You lose if you move your queen more than 12 times. The count is only checked after your sixth move.", flavor: "Even a queen tires of the march.", icon: "timer", tier: 4 },
    {
      init: () => ({ moves: 0 }),
      onTurnStart: (_state, ctx) => ({
        moves: ctx.board.history.filter((m) => m.color === ctx.me && m.piece === "q").length,
      }),
      checkLoss: (state, ctx) =>
        ctx.moveNumber >= 6 && (state.moves as number) > 12
          ? { reason: "your queen collapsed from exhaustion" }
          : null,
      progress: (state) => ({ value: state.moves as number, max: 12, label: (state.moves as number) + "/12 queen moves" }),
    },
  ),
];
