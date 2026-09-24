// Link preview for /puzzles: today's puzzle, its position seen from the side
// to play and what it asks. Rendered per request (the puzzle changes at UTC
// midnight) and edge cached for an hour.

import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/ogCard";
import { dailyPuzzleImage } from "@/lib/og/puzzleImage";
import { pageAlt } from "@/lib/og/pageImage";

export const dynamic = "force-dynamic";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = pageAlt("/puzzles");

export default function OgImage() {
  return dailyPuzzleImage();
}
