// Per-card social preview for /codex/nerf/[id]: the nerf's name, tier, and
// rule text on the house dark background. Unknown ids fall back to the generic
// site image instead of erroring.

import { NERF_BY_ID, tierName } from "@/lib/cardCodex";
import { OG_CONTENT_TYPE, OG_SIZE, cardOgImage, siteOgImage } from "@/lib/ogCard";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Nerf Chess codex card preview";

export default async function OgImage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const nerf = NERF_BY_ID[id];
  if (!nerf) return siteOgImage();
  return cardOgImage({
    eyebrow: "Nerf Chess codex · Nerf",
    title: nerf.name,
    meta: `Tier ${tierName(nerf.tier)} · Secret handicap · Nerf mode`,
    body: nerf.description,
  });
}
