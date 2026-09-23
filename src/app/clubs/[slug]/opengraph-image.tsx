// Preview for /clubs/[slug]: the club's name, description and member count.

import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/ogCard";
import { clubImage } from "@/lib/og/routes";

// Live data: rendered per request, cached by Cache-Control and the edge cache
// in src/lib/og/render.ts, never frozen at build.
export const dynamic = "force-dynamic";

export async function generateImageMetadata({ params }: { params: { slug: string } }) {
  return [{ id: "card", size: OG_SIZE, contentType: OG_CONTENT_TYPE, alt: `A Nerf Chess club and how many members it has` }];
}

export default async function OgImage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  return clubImage(slug);
}
