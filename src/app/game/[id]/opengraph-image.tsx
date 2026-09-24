// Preview for /game/[id]: the finished position with both players, ratings,
// mode, clock and result, or the players of a game still in progress (from
// the public lobby list; no position is shown until it is over).

import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/ogCard";
import { gameImage } from "@/lib/og/routes";

// Live data: rendered per request, cached by Cache-Control and the edge cache
// in src/lib/og/render.ts, never frozen at build.
export const dynamic = "force-dynamic";

export async function generateImageMetadata({ params }: { params: { id: string } }) {
  return [{ id: "card", size: OG_SIZE, contentType: OG_CONTENT_TYPE, alt: `Nerf Chess game ${String(params.id).toUpperCase()}: the players, the board and the result` }];
}

export default async function OgImage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return gameImage(id);
}
