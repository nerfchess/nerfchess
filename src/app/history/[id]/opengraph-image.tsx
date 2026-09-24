// Preview for /history/[id]. Replays live in the viewer's browser, so the
// server only knows the game when the id is an archived game id; otherwise
// the card is the generic game card.

import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/ogCard";
import { gameImage } from "@/lib/og/routes";

// Live data: rendered per request, cached by Cache-Control and the edge cache
// in src/lib/og/render.ts, never frozen at build.
export const dynamic = "force-dynamic";

export async function generateImageMetadata({ params }: { params: { id: string } }) {
  return [{ id: "card", size: OG_SIZE, contentType: OG_CONTENT_TYPE, alt: `A Nerf Chess game replay: the players, the board and the result` }];
}

export default async function OgImage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return gameImage(id);
}
