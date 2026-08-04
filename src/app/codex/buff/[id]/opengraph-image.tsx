// Per-card social preview for /codex/buff/[id]: the card's name, tier, family,
// and rule text on the house dark background. Unknown ids fall back to the
// generic site image instead of erroring.

import { BUFF_BY_ID, buffModes, buffType, modeLabel, tierName } from "@/lib/cardCodex";
import { OG_CONTENT_TYPE, OG_SIZE, cardOgImage, siteOgImage } from "@/lib/ogCard";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Nerf Chess codex card preview";

export default async function OgImage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const buff = BUFF_BY_ID[id];
  if (!buff) return siteOgImage();
  return cardOgImage({
    eyebrow: `Nerf Chess codex · ${buffType(buff)}`,
    title: buff.name,
    meta: `Tier ${tierName(buff.tier)} · ${modeLabel(buffModes(buff))}`,
    body: buff.description,
  });
}
