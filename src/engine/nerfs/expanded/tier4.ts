// Tier 4 (Severe) expanded nerfs: restrictions that shape several turns or add
// a gentle loss condition with a loose counter. Each still leaves legal moves
// in the opening. Import only from ./shared, one nerf per N(...).

import { Nerf } from "./shared";
import { tierNerf, filter, relRank, FILE, RANK, PIECE_VALUE } from "./shared";

const N = tierNerf(4);

export const NERFS_T4: Nerf[] = [
  N(
    { id: "rooks_charge", name: "Rooks Charge", description: "Your rooks can only move straight forward toward the enemy, never sideways or backward.", flavor: "The towers only know one command: advance.", icon: "castle" },
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
    { id: "frozen_cavalry", name: "Frozen Cavalry", description: "From your 18th move on, you can't move your knights.", flavor: "The horses seize up mid campaign.", icon: "snowflake" },
    {
      filterMoves: (moves, _state, ctx) =>
        ctx.moveNumber < 18 ? moves : moves.filter((m) => m.piece !== "n"),
    },
  ),
  N(
    { id: "castle_curfew", name: "Castle Curfew", description: "You lose if you have not castled by your 20th move.", flavor: "The gate bars at the twentieth bell.", icon: "castle" },
    {
      init: () => ({ moves: 0, castled: false }),
      onTurnStart: (_state, ctx) => ({
        moves: ctx.moveNumber,
        castled: ctx.board.history.some((m) => m.color === ctx.me && !!m.castle),
      }),
      checkLoss: (state) =>
        !state.castled && (state.moves as number) > 20 ? { reason: "never castled in time" } : null,
      progress: (state) =>
        state.castled
          ? { value: 20, max: 20, label: "castled" }
          : { value: Math.min(state.moves as number, 20), max: 20, label: state.moves + "/20 to castle" },
    },
  ),
  N(
    { id: "royal_bloodlust", name: "Royal Bloodlust", description: "The turn after your king captures, you must make a capture with any piece if you can.", flavor: "One royal kill and the whole court bays for blood.", icon: "crown" },
    {
      // Distinct from escort_mission/kingfisher (king must capture) and
      // barbarian_rage (ANY capture triggers the follow-up): only a KING
      // capture last turn forces a capture this turn.
      filterMoves: (moves, _state, ctx) => {
        if (!(ctx.myLastMove?.piece === "k" && ctx.myLastMove?.captured)) return moves;
        const caps = moves.filter((m) => m.captured);
        return caps.length ? caps : moves;
      },
    },
  ),
  N(
    { id: "queen_grounded", name: "Queen Grounded", description: "From your 12th move on, your queen can't move into the opponent's half of the board.", flavor: "Her range collapses to home soil.", icon: "crown" },
    {
      filterMoves: (moves, _state, ctx) =>
        ctx.moveNumber < 12
          ? moves
          : moves.filter((m) => !(m.piece === "q" && relRank(ctx.me, m.to) > 4)),
    },
  ),
  N(
    { id: "thinning_ranks", name: "Thinning Ranks", description: "You lose if you are ever left with fewer than three pawns.", flavor: "Without the infantry the war is already lost.", icon: "users" },
    {
      init: () => ({ pawns: 8 }),
      onTurnStart: (_state, ctx) => ({
        pawns: ctx.board.pieces.filter((p) => p && p.color === ctx.me && p.type === "p").length,
      }),
      checkLoss: (state) => ((state.pawns as number) < 3 ? { reason: "too few pawns remain" } : null),
      progress: (state) => ({ value: 8 - (state.pawns as number), max: 6, label: state.pawns + " pawns left" }),
    },
  ),
  N(
    { id: "no_retreat_rooks", name: "No Retreat Rooks", description: "From your 10th move on, your rooks can't move toward your own back rank.", flavor: "The towers only ever roll forward.", icon: "castle" },
    {
      filterMoves: (moves, _state, ctx) =>
        ctx.moveNumber < 10
          ? moves
          : moves.filter(
              (m) => !(m.piece === "r" && relRank(ctx.me, m.to) < relRank(ctx.me, m.from)),
            ),
    },
  ),
  N(
    { id: "bishop_tunnel_vision", name: "Bishop Tunnel Vision", description: "Your bishops can't move more than three squares in a single move.", flavor: "The clergy squint down short diagonals.", icon: "church" },
    {
      filterMoves: filter(
        (m) => m.piece !== "b" || Math.abs(FILE(m.to) - FILE(m.from)) <= 3,
      ),
    },
  ),
  N(
    { id: "hungry_pawns", name: "Hungry Pawns", description: "Whenever one of your pawns can capture, you must make a capture with a pawn.", flavor: "The infantry lunges at every scrap.", icon: "utensils" },
    {
      filterMoves: (moves) => {
        const pawnCaps = moves.filter((m) => m.piece === "p" && m.captured);
        return pawnCaps.length ? pawnCaps : moves;
      },
    },
  ),
  N(
    { id: "war_of_attrition", name: "War of Attrition", description: "You lose if you ever make more than twelve non-capturing moves in a row.", flavor: "An idle army rots in the field.", icon: "timer" },
    {
      init: () => ({ streak: 0 }),
      onTurnStart: (_state, ctx) => {
        const mine = ctx.board.history.filter((m) => m.color === ctx.me);
        let streak = 0;
        for (let i = mine.length - 1; i >= 0; i--) {
          if (mine[i].captured) break;
          streak++;
        }
        return { streak };
      },
      checkLoss: (state) => ((state.streak as number) > 12 ? { reason: "too long without a capture" } : null),
      progress: (state) => ({ value: Math.min(state.streak as number, 12), max: 12, label: state.streak + "/12 quiet streak" }),
    },
  ),
  N(
    { id: "fair_fight", name: "Fair Fight", description: "You can't capture a piece worth less than the piece making the capture; no bullying weaker pieces, only equal or stronger prey.", flavor: "Pick on someone your own size, or bigger.", icon: "scale" },
    {
      // Mirror of punching_down (which bans capturing HIGHER-value pieces):
      // Fair Fight bans capturing LOWER-value pieces, so a rook may not snap up
      // a lone pawn. A distinct rule, not the old no_free_lunch text.
      filterMoves: filter(
        (m) =>
          !m.captured ||
          m.captured === "k" ||
          PIECE_VALUE[m.captured] >= PIECE_VALUE[m.piece],
      ),
    },
  ),
];
