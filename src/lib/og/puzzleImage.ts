// Link previews for puzzles: today's puzzle on /puzzles and one card per
// puzzle, each showing its position.

import { ogImage, OG_CACHE, pageCard } from "@/lib/ogCard";
import { puzzleById, puzzleTitle, todaysPuzzle } from "@/lib/seoPuzzles";
import type { Puzzle } from "@/lib/puzzles/types";
import type { Piece } from "@/engine/types";
import { staticPageImage } from "./pageImage";

function puzzleCard(p: Puzzle, kicker: string) {
  return pageCard({
    kicker,
    title: puzzleTitle(p),
    subtitle: p.format === "card-choice" ? "Only one of the two cards wins. Can you see which?" : `${p.hero === "w" ? "White" : "Black"} to play.`,
    board: { pieces: p.snapshot.board.pieces as (Piece | null)[], flip: p.hero === "b" },
  });
}

export function puzzleImage(rawId: string) {
  let id = rawId;
  try {
    id = decodeURIComponent(rawId);
  } catch {}
  const p = puzzleById(id);
  return ogImage(() => (p ? puzzleCard(p, "Puzzle") : pageCard({ kicker: "Puzzle", title: "Puzzle not found", subtitle: "Today's puzzle is on the puzzles page." })), OG_CACHE.static, p ? `puzzles/${p.id}` : undefined);
}

/** Today's puzzle, so a shared /puzzles link shows the position people will
 *  actually get. Keyed by the UTC date and cached for an hour. */
export function dailyPuzzleImage() {
  const today = todaysPuzzle();
  if (!today) return staticPageImage("/puzzles");
  return ogImage(() => puzzleCard(today.puzzle, `Daily puzzle #${today.number}`), OG_CACHE.slow, `puzzles/daily/${today.key}`);
}
