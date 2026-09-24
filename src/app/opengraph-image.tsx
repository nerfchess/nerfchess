// The brand card: the home page's preview, and the image every route falls
// back to when its own card cannot be built (src/lib/og/render.ts).

import { BRAND_IMAGE_ALT } from "@/lib/seo";
import { OG_CONTENT_TYPE, OG_SIZE, siteOgImage } from "@/lib/ogCard";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = BRAND_IMAGE_ALT;

export default function OgImage() {
  return siteOgImage();
}
