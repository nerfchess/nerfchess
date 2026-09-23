// Route skeleton for /game and /game/[id]: the same game frame the pages show
// while a game is being found (the compact header, a status line, the board
// column and the move-list column), so the page chunk swaps in without the
// header or the board moving. It used to be a separate drawing with the full
// header's stand-in, a 1152px column and inline 1px radii.

import { GameFrameSkeleton } from "./GameSkeleton";

export default function Loading() {
  return <GameFrameSkeleton label="Loading the game…" />;
}
