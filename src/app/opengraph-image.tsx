// The site-wide 1200x630 social preview, served for every route that has no
// closer opengraph-image of its own (the codex card routes each render a
// per-card image). Generated with next/og on the house palette.

import { OG_CONTENT_TYPE, OG_SIZE, siteOgImage } from "@/lib/ogCard";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Nerf Chess: chess with power-ups, a free online chess variant";

export default function OgImage() {
  return siteOgImage();
}
