// Link previews for the codex: the index card with the live card count, and
// one card per nerf, buff, hex and boon with its face icon, tier and rule.

import { ALL_NERFS } from "@/engine/nerfs/library";
import { BUFF_BY_ID } from "@/lib/cardCodex";
import { GEN_ICON_COMPONENTS } from "@/lib/cardIconComponents.gen";
import { CARD_ICON_NAMES } from "@/lib/cardIconNames.gen";
import { OG_CACHE, brandCard, codexCard, ogImage, type CodexCardProps } from "@/lib/ogCard";
import { buffSeo, liveCardCount, nerfSeo } from "@/lib/seoCards";
import { staticPageImage } from "./pageImage";
import { formatCount } from "./text";

export function codexIndexImage() {
  return staticPageImage("/codex", {
    stat: { value: formatCount(liveCardCount()), label: "cards and rules" },
  });
}

const NERF_BY_ID = Object.fromEntries(ALL_NERFS.map((n) => [n.id, n]));

function faceIcon(id: string): CodexCardProps["Icon"] {
  const name = CARD_ICON_NAMES[id];
  return name ? (GEN_ICON_COMPONENTS[name] as unknown as CodexCardProps["Icon"]) : undefined;
}

/** The codex card preview, or the brand card for an unknown id or an id
 *  requested under the wrong family path (the page 404s there too). */
export function codexImage(kind: "buff" | "nerf", id: string, family?: "Hex" | "Boon") {
  const seo = kind === "nerf" ? nerfSeo(id) : buffSeo(id);
  const card = kind === "nerf" ? NERF_BY_ID[id] : BUFF_BY_ID[id];
  if (!seo || !card || (family && seo.family !== family)) {
    return ogImage(brandCard, OG_CACHE.static);
  }
  return ogImage(
    () =>
      codexCard({
        family: seo.family,
        name: card.name,
        tier: seo.tier,
        tierLabel: seo.tierLabel,
        mode: seo.mode,
        modeText: seo.modeText,
        rule: card.description,
        Icon: faceIcon(id),
      }),
    OG_CACHE.static,
    // Content-addressed: a retier or a rewording is a new key, so a deploy
    // never serves last week's card from the edge cache.
    `codex/${kind}/${id}/${fnv(`${card.name}|${seo.tierLabel}|${seo.modeText}|${card.description}`)}`,
  );
}

/** FNV-1a, 32 bit, as 8 hex digits. */
function fnv(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function codexAlt(kind: "buff" | "nerf", id: string): string {
  const seo = kind === "nerf" ? nerfSeo(id) : buffSeo(id);
  return seo ? `${seo.pageTitle}: the card's tier, mode and rule on Nerf Chess` : "A Nerf Chess card";
}
