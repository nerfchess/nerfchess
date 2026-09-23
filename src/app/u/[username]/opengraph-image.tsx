// Preview for /u/[username]: avatar (preset pieces only; an uploaded picture
// is not put in a preview), name, rating per mode, games played and the cards
// the player picks most.

import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/ogCard";
import { profileImage } from "@/lib/og/routes";

// Live data: rendered per request, cached by Cache-Control and the edge cache
// in src/lib/og/render.ts, never frozen at build.
export const dynamic = "force-dynamic";

export async function generateImageMetadata({ params }: { params: { username: string } }) {
  return [{ id: "card", size: OG_SIZE, contentType: OG_CONTENT_TYPE, alt: `${decodeURIComponent(String(params.username))} on Nerf Chess: ratings in each mode, games played and favourite cards` }];
}

export default async function OgImage(props: { params: Promise<{ username: string }> }) {
  const { username } = await props.params;
  return profileImage(username);
}
