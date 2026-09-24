// Link preview for /puzzles/[id]: the puzzle's position from the solver's
// side and its goal. Unknown ids get a "not found" card, never an error.

import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/ogCard";
import { puzzleImage } from "@/lib/og/puzzleImage";

// Rendered on request and cached (Cache-Control plus the edge cache in
// src/lib/og/render.ts), not frozen at build.
export const dynamic = "force-dynamic";

export async function generateImageMetadata({ params }: { params: { id: string } }) {
  return [{ id: "card", size: OG_SIZE, contentType: OG_CONTENT_TYPE, alt: "A Nerf Chess puzzle: the position and what it asks you to find" }];
}

export default async function OgImage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return puzzleImage(id);
}
