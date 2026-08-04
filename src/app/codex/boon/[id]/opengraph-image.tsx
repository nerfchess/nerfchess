// Per-card social preview for /codex/boon/[id]: boons live in ALL_BUFFS but
// canonicalize to this family path, so the image guards on the family the same
// way the page does. Unknown or mismatched ids fall back to the generic image.

import { BUFF_BY_ID, buffType, tierName } from "@/lib/cardCodex";
import { OG_CONTENT_TYPE, OG_SIZE, cardOgImage, siteOgImage } from "@/lib/ogCard";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Nerf Chess codex card preview";

export default async function OgImage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const buff = BUFF_BY_ID[id];
  if (!buff || buffType(buff) !== "Boon") return siteOgImage();
  return cardOgImage({
    eyebrow: "Nerf Chess codex · Boon",
    title: buff.name,
    meta: `Tier ${tierName(buff.tier)} · Relief card · Nerf mode`,
    body: buff.description,
  });
}
