// Link previews for the static routes: the page card from the route's row in
// src/lib/seoPages.ts. Kept apart from the data-backed previews (routes.tsx),
// because every page with its own opengraph-image file loads that file's
// module to read its size and alt, so a static page should pull in only this
// and the card renderer, not the card libraries or the database layer.

import { OG_CACHE, ogImage, pageCard, type PageCardProps } from "@/lib/ogCard";
import { PAGES, type StaticPath } from "@/lib/seoPages";

export function pageAlt(path: StaticPath): string {
  const p = PAGES[path] as { cardTitle?: string; title: string };
  return `${p.cardTitle ?? p.title}, on Nerf Chess`;
}

export function staticPageImage(path: StaticPath, extra: Partial<PageCardProps> = {}) {
  const p = PAGES[path] as { kicker: string; title: string; cardTitle?: string; cardSubtitle?: string; mode?: "buff" | "nerf" };
  return ogImage(
    () => pageCard({ kicker: p.kicker, title: p.cardTitle ?? p.title, subtitle: p.cardSubtitle, mode: p.mode, ...extra }),
    OG_CACHE.static,
  );
}
