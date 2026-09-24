// Link preview for /codex: the page card with the live card count, computed
// from the card libraries at build time (F173).

import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/ogCard";
import { codexIndexImage } from "@/lib/og/codexImage";
import { pageAlt } from "@/lib/og/pageImage";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = pageAlt("/codex");

export default function OgImage() {
  return codexIndexImage();
}
