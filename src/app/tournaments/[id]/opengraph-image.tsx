// Preview for /tournaments/[id]: name, status or start time, mode, clock and
// entries.

import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/ogCard";
import { tournamentImage } from "@/lib/og/routes";

// Live data: rendered per request, cached by Cache-Control and the edge cache
// in src/lib/og/render.ts, never frozen at build.
export const dynamic = "force-dynamic";

export async function generateImageMetadata({ params }: { params: { id: string } }) {
  return [{ id: "card", size: OG_SIZE, contentType: OG_CONTENT_TYPE, alt: `A Nerf Chess tournament: its format, clock, start and entries` }];
}

export default async function OgImage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return tournamentImage(id);
}
