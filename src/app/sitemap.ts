import type { MetadataRoute } from "next";
import { utcDateKey } from "@/lib/puzzles/daily";
import { SITE_URL } from "@/lib/seo";
import { allCardMeta } from "@/lib/seoCards";
import { ROUTE_DATES } from "@/lib/sitemapDates.gen";
import { STATIC_ROUTES } from "@/lib/sitemapRoutes";
import { UPDATES } from "@/lib/updates";

// Served at /sitemap.xml: every indexable static route (src/lib/sitemapRoutes.ts)
// plus one entry per live codex card (implemented and not retired, at its
// canonical family path). Per-user and per-game pages are left out, as are
// noindex surfaces; profiles wait on owner question Q34.
//
// <lastmod> is real or absent, never the time of the request (F247): static
// routes carry the newest commit of their source files (generated into
// sitemapDates.gen.ts by scripts/gen-sitemap-dates.ts), /updates the date of
// its newest entry, /puzzles today (a new puzzle every UTC day), and card
// pages none, since a card has no date of its own.

// Rebuilt once a day so the /puzzles date moves with the daily puzzle.
export const revalidate = 86400;

function newestUpdate(): string | undefined {
  let best: string | undefined;
  for (const u of UPDATES) if (/^\d{4}-\d{2}-\d{2}/.test(u.date) && (!best || u.date > best)) best = u.date.slice(0, 10);
  return best;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const updates = newestUpdate();
  const today = utcDateKey();
  const statics: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => {
    const date = r.path === "/updates" ? updates : r.path === "/puzzles" ? today : ROUTE_DATES[r.path];
    return {
      url: r.path === "/" ? SITE_URL : `${SITE_URL}${r.path}`,
      ...(date ? { lastModified: date } : {}),
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    };
  });
  const cards: MetadataRoute.Sitemap = allCardMeta().map((c) => ({
    url: `${SITE_URL}${c.path}`,
    changeFrequency: "monthly",
    priority: 0.4,
  }));
  return [...statics, ...cards];
}
