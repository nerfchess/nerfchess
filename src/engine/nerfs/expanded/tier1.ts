// Tier 1 (Trivial) expanded nerfs: light self-restrictions, each easily worked
// around and always leaving legal moves from the opening. Authoring template
// for the other tiers: import only from ./shared, one nerf per `N(...)`.

import { Nerf } from "./shared";
import { tierNerf, filter, relRank, FILE, RANK, SQ } from "./shared";

const N = tierNerf(1);

export const NERFS_T1: Nerf[] = [
  N(
    { id: "right_handed", name: "Right Handed", description: "You can't move to the a-file.", flavor: "The left edge is a blind spot.", icon: "ban" },
    { filterMoves: filter((m) => FILE(m.to) !== 0) },
  ),
  N(
    { id: "no_stone_cutting", name: "No Stone Cutting", description: "You can't capture bishops.", flavor: "The clergy are untouchable.", icon: "church" },
    { filterMoves: filter((m) => m.captured !== "b") },
  ),
  N(
    { id: "teetotaler", name: "Teetotaler", description: "You can't capture rooks.", flavor: "Towers are for admiring, not toppling.", icon: "castle" },
    { filterMoves: filter((m) => m.captured !== "r") },
  ),
  N(
    { id: "flat_footed", name: "Flat Footed", description: "Your pawns can't advance two squares.", flavor: "No spring in the step.", icon: "footprints" },
    { filterMoves: filter((m) => !(m.piece === "p" && m.isDoublePawn)) },
  ),
  N(
    { id: "keep_off_the_grass", name: "Keep Off the Grass", description: "Your king can't move onto the four center squares.", flavor: "The middle of the board is roped off for royalty.", icon: "flag" },
    {
      filterMoves: filter(
        (m) =>
          !(
            m.piece === "k" &&
            [SQ(3, 3), SQ(4, 3), SQ(3, 4), SQ(4, 4)].includes(m.to)
          ),
      ),
    },
  ),
  N(
    { id: "knights_off_the_rail", name: "Knights Off the Rail", description: "Your knights can't move to the a-file or h-file.", flavor: "A knight on the rim keeps falling off.", icon: "ban" },
    {
      filterMoves: filter(
        (m) => !(m.piece === "n" && (FILE(m.to) === 0 || FILE(m.to) === 7)),
      ),
    },
  ),
  N(
    { id: "no_drawbridge", name: "No Drawbridge", description: "You can't castle.", flavor: "The castle gate is rusted shut.", icon: "lock" },
    { filterMoves: filter((m) => !m.castle) },
  ),
  N(
    { id: "pen_pusher", name: "Pen Pusher", description: "Your rooks can't capture.", flavor: "The towers push paper, not soldiers.", icon: "castle" },
    { filterMoves: filter((m) => !(m.piece === "r" && m.captured)) },
  ),
  N(
    { id: "soft_paws", name: "Soft Paws", description: "Your knights can't capture pawns.", flavor: "The horses refuse to trample infantry.", icon: "leaf" },
    { filterMoves: filter((m) => !(m.piece === "n" && m.captured === "p")) },
  ),
  N(
    { id: "homebody_king", name: "Homebody King", description: "Your king can't leave your first two ranks.", flavor: "His majesty prefers the palace.", icon: "home" },
    {
      filterMoves: (moves, _state, ctx) =>
        moves.filter((m) => !(m.piece === "k" && relRank(ctx.me, m.to) > 2)),
    },
  ),
  N(
    { id: "no_first_blood_pawn", name: "Squeamish", description: "Your pawns can't make the game's first capture.", flavor: "Someone else has to start it.", icon: "droplet" },
    {
      filterMoves: (moves, _state, ctx) => {
        const anyCapture = ctx.board.history.some((m) => m.captured);
        return anyCapture ? moves : moves.filter((m) => !(m.piece === "p" && m.captured));
      },
    },
  ),
  N(
    { id: "level_headed", name: "Level Headed", description: "Your queen can't move diagonally more than 3 squares.", flavor: "She keeps her long game grounded.", icon: "move" },
    {
      filterMoves: filter((m) => {
        if (m.piece !== "q") return true;
        const df = Math.abs(FILE(m.to) - FILE(m.from));
        const dr = Math.abs(RANK(m.to) - RANK(m.from));
        return !(df === dr && df > 3);
      }),
    },
  ),
];
