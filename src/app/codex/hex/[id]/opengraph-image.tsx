// Per-card preview for /codex/hex/[id]: the card's face icon and name in its
// tier ink, its tier, mode and rule (src/lib/ogCard.tsx codexCard). The alt
// text names the card (F249). An unknown id, or one requested under the wrong
// family path, gets the brand card, never an error.

import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/ogCard";
import { codexAlt, codexImage } from "@/lib/og/codexImage";

// Rendered on request and cached (Cache-Control plus the edge cache in
// src/lib/og/render.ts), not prerendered: the page's generateStaticParams
// would otherwise make the build render one PNG per card id, about 2,500 of
// them, most of which are never shared.
export const dynamic = "force-dynamic";

export async function generateImageMetadata({ params }: { params: { id: string } }) {
  return [{ id: "card", size: OG_SIZE, contentType: OG_CONTENT_TYPE, alt: codexAlt("buff", params.id) }];
}

export default async function OgImage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return codexImage("buff", id, "Hex");
}
