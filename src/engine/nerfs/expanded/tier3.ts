// Tier 3 (Common) expanded nerfs: real bounded constraints on a piece class or
// on capturing. Each still leaves legal moves from the opening (they target one
// piece type, a direction, a zone, captures only, or a loose counter). Import
// only from ./shared, one nerf per N(...).

import { Nerf } from "./shared";
import {
  nerf,
  tierNerf,
  filter,
  relRank,
  FILE,
  RANK,
  SQ,
  inBoard,
  PIECE_VALUE,
  countHistory,
  isInCheck,
  makeMove,
} from "./shared";

const N = tierNerf(3);

export const NERFS_T3: Nerf[] = [
  nerf(
    { id: "half_a_queen", name: "Half a Queen", description: "Your queen can only move like a rook, never diagonally, except one diagonal move is allowed once per game.", flavor: "She left the diagonals at home.", icon: "castle", tier: 5 },
    {
      filterMoves: (moves, _state, ctx) => {
        // Once-per-game exemption: a single diagonal queen move is allowed. Once
        // she has made one (recorded in history), diagonals are shut again.
        const usedDiag = ctx.board.history.some(
          (m) =>
            m.color === ctx.me &&
            m.piece === "q" &&
            FILE(m.to) !== FILE(m.from) &&
            RANK(m.to) !== RANK(m.from),
        );
        return moves.filter((m) => {
          if (m.piece !== "q") return true;
          if (FILE(m.to) === FILE(m.from) || RANK(m.to) === RANK(m.from)) return true;
          return !usedDiag;
        });
      },
    },
  ),
  nerf(
    { id: "sidewinder", name: "Sidewinder", description: "Your rooks can only move horizontally along ranks, never up or down files, except one vertical move is allowed once per game.", flavor: "The towers slide side to side.", icon: "move-horizontal", tier: 4 },
    {
      filterMoves: (moves, _state, ctx) => {
        // Once-per-game exemption: a single rank-changing rook move is allowed.
        // After the first one (recorded in history), files are shut again.
        const usedVert = ctx.board.history.some(
          (m) => m.color === ctx.me && m.piece === "r" && RANK(m.to) !== RANK(m.from),
        );
        return moves.filter(
          (m) => !(m.piece === "r" && RANK(m.to) !== RANK(m.from)) || !usedVert,
        );
      },
    },
  ),
  nerf(
    { id: "pull_of_the_center", name: "Pull of the Center", description: "Your pawns can only capture toward the center files.", flavor: "Blades are drawn inward.", icon: "move-horizontal", tier: 3 },
    {
      filterMoves: filter((m) => {
        if (m.piece !== "p" || !m.captured) return true;
        return Math.abs(FILE(m.to) - 3.5) < Math.abs(FILE(m.from) - 3.5);
      }),
    },
  ),
  nerf(
    { id: "one_bite_at_a_time", name: "One Bite at a Time", description: "After a capture, you can't capture again for two of your turns, except your chosen pawn (on a random file, shown from the start) may still capture.", flavor: "Chew before you swallow.", icon: "timer", tier: 5 },
    {
      // Distinct from remorseful (a single-turn cooldown) and battle_fatigue (a
      // per-piece cooldown): here ANY capture in your last two turns blocks all
      // captures this turn, a two-turn whole-army cooldown. Exemption: one chosen
      // pawn is excluded. No player-choice flow exists in a filterMoves nerf, so
      // the chosen pawn is fixed deterministically as the pawn on a file picked
      // at the start; its captures are always allowed.
      init: (rng) => ({ file: rng.int(8) }),
      filterMoves: (moves, state, ctx) => {
        const s = state as { file: number };
        const mine = ctx.board.history.filter((m) => m.color === ctx.me);
        const recentCapture = mine.slice(-2).some((m) => m.captured);
        if (!recentCapture) return moves;
        return moves.filter(
          (m) => !m.captured || (m.piece === "p" && FILE(m.from) === s.file),
        );
      },
      visual: (state) => {
        const s = state as { file: number };
        const sqs: number[] = [];
        for (let r = 0; r < 8; r++) sqs.push(SQ(s.file, r));
        return { highlightSquares: sqs };
      },
    },
  ),
  N(
    { id: "cautious_cavalry", name: "Cautious Cavalry", description: "The enemy half of the board is shown from the start. From your second turn on, your knights can't cross into it.", flavor: "The horses balk at the border.", icon: "flag" },
    {
      // The restricted region (the enemy half) is revealed from move one; the ban
      // itself waits one turn so you see it coming before it bites.
      filterMoves: (moves, _state, ctx) =>
        ctx.moveNumber < 1
          ? moves
          : moves.filter((m) => !(m.piece === "n" && relRank(ctx.me, m.to) > 4)),
      visual: (_state, ctx) => {
        const banned: number[] = [];
        for (let sq = 0; sq < 64; sq++) if (relRank(ctx.me, sq) > 4) banned.push(sq);
        return { bannedSquares: banned };
      },
    },
  ),
  nerf(
    { id: "carnivore_bishops", name: "Carnivore Bishops", description: "Starting on your fourth move, your bishops can only move when they capture.", flavor: "They march only to feed.", icon: "church", tier: 5 },
    {
      filterMoves: (moves, _state, ctx) =>
        ctx.moveNumber < 3 ? moves : moves.filter((m) => !(m.piece === "b" && !m.captured)),
    },
  ),
  nerf(
    { id: "no_retreat", name: "No Retreat", description: "Your king can't step backward toward your own back rank.", flavor: "A king never gives ground.", icon: "crown", tier: 3 },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter(
          (m) => !(m.piece === "k" && relRank(ctx.me, m.to) < relRank(ctx.me, m.from)),
        ),
    },
  ),
  N(
    { id: "one_way_bishops", name: "One Way Bishops", description: "The squares your bishops may not quietly retreat into are shown from the start. From your second turn on, your bishops can't retreat on a quiet move, but they may still strike backward: a bishop may only lose rank when the move is a capture.", flavor: "Faith advances, and draws blood where it must.", icon: "church" },
    {
      // Distinct from clergy (no bishop move may lose rank at all, captures
      // included) and advancing_faith (bishops must strictly advance): here a
      // bishop may retreat, but only to capture. The restricted region (the quiet
      // backward squares behind each bishop) is revealed from move one; the ban
      // waits one turn so you see it coming before it bites.
      filterMoves: (moves, _state, ctx) =>
        ctx.moveNumber < 1
          ? moves
          : moves.filter(
              (m) =>
                !(
                  m.piece === "b" &&
                  !m.captured &&
                  relRank(ctx.me, m.to) < relRank(ctx.me, m.from)
                ),
            ),
      visual: (_state, ctx) => {
        const banned: number[] = [];
        const dir = ctx.me === "w" ? -1 : 1; // backward in rank terms
        for (let sq = 0; sq < 64; sq++) {
          const p = ctx.board.pieces[sq];
          if (!p || p.color !== ctx.me || p.type !== "b") continue;
          for (const df of [-1, 1]) {
            let f = FILE(sq) + df;
            let r = RANK(sq) + dir;
            while (inBoard(f, r)) {
              const t = SQ(f, r);
              if (ctx.board.pieces[t]) break; // a capture there is allowed: stop the ray
              banned.push(t);
              f += df;
              r += dir;
            }
          }
        }
        return { bannedSquares: banned };
      },
    },
  ),
  N(
    { id: "no_free_lunch", name: "No Free Lunch", description: "No even trades: you can't capture a piece worth exactly as much as the piece making the capture, except capturing a piece that has your king in check is always legal.", flavor: "An even swap is no bargain.", icon: "ban" },
    {
      // Distinct from punching_down (bans capturing higher value) and fair_fight
      // (bans capturing lower value): No Free Lunch bans only EQUAL-value
      // captures, so no clean even trades. Exception: while in check, a capture
      // that removes the check (i.e. takes the checking piece) is always allowed.
      filterMoves: (moves, _state, ctx) => {
        const inCheck = isInCheck(ctx.board, ctx.me);
        return moves.filter((m) => {
          if (!m.captured || m.captured === "k") return true;
          if (PIECE_VALUE[m.captured] !== PIECE_VALUE[m.piece]) return true;
          // Even-value capture: banned, unless it captures the checking piece.
          return inCheck && !isInCheck(makeMove(ctx.board, m), ctx.me);
        });
      },
    },
  ),
  nerf(
    { id: "overzealous", name: "Overzealous", description: "You lose if you capture more than 10 enemy pieces. The count is only checked after your sixth move.", flavor: "Bloodlust is its own undoing.", icon: "droplet", tier: 4 },
    {
      init: () => ({ caps: 0 }),
      onTurnStart: (_state, ctx) => ({ caps: countHistory(ctx, (m) => !!m.captured) }),
      checkLoss: (state, ctx) =>
        ctx.moveNumber >= 6 && (state.caps as number) > 10
          ? { reason: "you spilled too much blood" }
          : null,
      progress: (state) => ({
        value: state.caps as number,
        max: 10,
        label: (state.caps as number) + "/10 captures",
      }),
    },
  ),
];
