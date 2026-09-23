// Link preview for /tv: the page card from its row in src/lib/seoPages.ts.

import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/ogCard";
import { pageAlt, staticPageImage } from "@/lib/og/pageImage";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = pageAlt("/tv");

export default function OgImage() {
  return staticPageImage("/tv");
}
