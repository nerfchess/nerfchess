// Link preview for /leaderboard: the page card with the current number one,
// read from the same population as the public board. Rendered per request
// (and edge cached for an hour), not frozen at build.

import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/ogCard";
import { leaderboardImage } from "@/lib/og/routes";
import { pageAlt } from "@/lib/og/pageImage";

export const dynamic = "force-dynamic";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = pageAlt("/leaderboard");

export default function OgImage() {
  return leaderboardImage();
}
