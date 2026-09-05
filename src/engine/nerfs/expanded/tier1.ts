// Tier 1 (Trivial) expanded nerfs: light self-restrictions, each easily worked
// around and always leaving legal moves from the opening. Authoring template
// for the other tiers: import only from ./shared, one nerf per `N(...)`.

import { Nerf } from "./shared";
import { nerf, filter, relRank, isInCheck, makeMove, FILE, RANK, SQ } from "./shared";

export const NERFS_T1: Nerf[] = [
  nerf(
    { id: "right_handed", name: "Right Handed", description: "You can't move to the a-file, except once per game.", tier: 3, flavor: "The left edge is a blind spot.", icon: "ban" },
    {
      filterMoves: (moves, _state, ctx) => {
        const usedExemption = ctx.board.history.some(
          (m) => m.color === ctx.me && FILE(m.to) === 0,
        );
        return usedExemption ? moves.filter((m) => FILE(m.to) !== 0) : moves;
      },
    },
  ),
  nerf(
    { id: "no_stone_cutting", name: "No Stone Cutting", description: "You can't capture bishops.", tier: 3, flavor: "The clergy are untouchable.", icon: "church" },
    { filterMoves: filter((m) => m.captured !== "b") },
  ),
  nerf(
    { id: "teetotaler", name: "Teetotaler", description: "You can't capture rooks, unless the rook is giving check.", tier: 1, flavor: "Towers are for admiring, not toppling.", icon: "castle" },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter((m) => {
          if (m.captured !== "r") return true;
          // Capturing the checking piece is always legal: allow a rook capture
          // only when you are in check and the capture removes it.
          if (!isInCheck(ctx.board, ctx.me)) return false;
          return !isInCheck(makeMove(ctx.board, m), ctx.me);
        }),
    },
  ),
  nerf(
    { id: "flat_footed", name: "Flat Footed", description: "Your pawns can't advance two squares.", tier: 2, flavor: "No spring in the step.", icon: "footprints" },
    { filterMoves: filter((m) => !(m.piece === "p" && m.isDoublePawn)) },
  ),
  nerf(
    { id: "keep_off_the_grass", name: "Keep Off the Grass", description: "Starting on your fourth move, your king can't move onto the four center squares.", tier: 2, flavor: "The middle of the board is roped off for royalty.", icon: "flag" },
    {
      filterMoves: (moves, _state, ctx) => {
        if (ctx.moveNumber < 3) return moves; // activation delayed until move 4
        return moves.filter(
          (m) =>
            !(
              m.piece === "k" &&
              [SQ(3, 3), SQ(4, 3), SQ(3, 4), SQ(4, 4)].includes(m.to)
            ),
        );
      },
    },
  ),
  nerf(
    { id: "knights_off_the_rail", name: "Knights Off the Rail", description: "Your knights can't move to the a-file or h-file, unless you have no other legal move, in which case one king move is allowed.", tier: 2, flavor: "A knight on the rim keeps falling off.", icon: "ban" },
    {
      filterMoves: (moves, _state, ctx) => {
        const compliant = moves.filter(
          (m) => !(m.piece === "n" && (FILE(m.to) === 0 || FILE(m.to) === 7)),
        );
        if (compliant.length > 0) return compliant;
        // No compliant move exists: allow one king move as an escape.
        const kingMoves = moves.filter((m) => m.piece === "k");
        return kingMoves.length > 0 ? kingMoves : moves;
      },
    },
  ),
  nerf(
    { id: "no_drawbridge", name: "No Drawbridge", description: "You can't castle.", tier: 2, flavor: "The castle gate is rusted shut.", icon: "lock" },
    { filterMoves: filter((m) => !m.castle) },
  ),
  nerf(
    { id: "pen_pusher", name: "Pen Pusher", description: "Your rooks can't capture, unless your king is in check.", tier: 1, flavor: "The towers push paper, not soldiers.", icon: "castle" },
    {
      filterMoves: (moves, _state, ctx) => {
        // The restriction pauses while you are answering a check.
        if (isInCheck(ctx.board, ctx.me)) return moves;
        return moves.filter((m) => !(m.piece === "r" && m.captured));
      },
    },
  ),
  nerf(
    { id: "soft_paws", name: "Soft Paws", description: "Your knights can't capture pawns, except one pawn, once per game.", tier: 2, flavor: "The horses refuse to trample infantry.", icon: "leaf" },
    {
      filterMoves: (moves, _state, ctx) => {
        const usedExemption = ctx.board.history.some(
          (m) => m.color === ctx.me && m.piece === "n" && m.captured === "p",
        );
        return usedExemption
          ? moves.filter((m) => !(m.piece === "n" && m.captured === "p"))
          : moves;
      },
    },
  ),
  nerf(
    { id: "homebody_king", name: "Homebody King", description: "Your king can't leave your first two ranks.", tier: 2, flavor: "His majesty prefers the palace.", icon: "home" },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter((m) => !(m.piece === "k" && relRank(ctx.me, m.to) > 2)),
    },
  ),
  nerf(
    { id: "no_first_blood_pawn", name: "Squeamish", description: "Your pawns can't make the game's first capture.", tier: 2, flavor: "Someone else has to start it.", icon: "droplet" },
    {
      filterMoves: (moves, _state, ctx) => {
        const anyCapture = ctx.board.history.some((m) => m.captured);
        return anyCapture ? moves : moves.filter((m) => !(m.piece === "p" && m.captured));
      },
    },
  ),
  nerf(
    { id: "level_headed", name: "Level Headed", description: "Your queen can't move diagonally more than 3 squares, unless you are answering a check.", tier: 2, flavor: "She keeps her long game grounded.", icon: "move" },
    {
      filterMoves: (moves, _state, ctx) => {
        // A legal response to check always overrides the restriction.
        if (isInCheck(ctx.board, ctx.me)) return moves;
        return moves.filter((m) => {
          if (m.piece !== "q") return true;
          const df = Math.abs(FILE(m.to) - FILE(m.from));
          const dr = Math.abs(RANK(m.to) - RANK(m.from));
          return !(df === dr && df > 3);
        });
      },
    },
  ),
];
