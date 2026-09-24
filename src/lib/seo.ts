// One place that turns a page's title, description and path into the full
// metadata a search engine and a chat unfurler need (brief sections 18, 19).
//
// Why a helper and not per-page objects: Next replaces `openGraph` and
// `twitter` wholesale per segment and never merges them, so a page that set
// only openGraph.title silently lost og:image, og:site_name and og:type, and a
// page that set nothing inherited the home page's canonical, og:url and
// og:title (F231 to F236). pageMeta() always emits the complete set, so no
// field can fall through to the root layout:
//
//   - <title> with the brand suffix exactly once, as an absolute title that
//     also re-arms the "%s · Nerf Chess" template for child segments;
//   - a self canonical, and og:url equal to it;
//   - og:title, og:description, og:type, og:site_name, og:locale;
//   - og:image with width, height and alt (the brand card unless the segment
//     has its own opengraph-image file, which Next then prefers);
//   - twitter:card summary_large_image with the same title and description
//     (Next copies the og image into twitter:image);
//   - robots: explicit index or noindex, so a child never inherits a parent's.
//
// scripts/check-seo.ts (npm run test:seo-dupes) crawls the site and fails on
// any page that breaks one of these, or on a duplicate title or description.

import type { Metadata } from "next";

export const SITE_URL = "https://nerfchess.com";
export const SITE_NAME = "Nerf Chess";
export const TITLE_TEMPLATE = "%s · Nerf Chess";

/** The home page's title (the root layout's default title). */
export const HOME_TITLE = "Nerf Chess · chess with power-ups, a free online chess variant";
/** The home page's description, short enough for a search snippet and a chat
 *  preview (the old one ran to 290 characters). */
export const HOME_DESCRIPTION =
  "Nerf Chess is chess with power-ups, free in your browser. Draft a power-up every 5 moves or play with a secret handicap, and capture the king to win.";
/** The page background of the default (dark) theme, --bg-base, for the
 *  browser chrome (theme-color). */
export const THEME_COLOR = "#161512";

/** The site-wide brand card, rendered by src/app/opengraph-image.tsx. */
export const BRAND_IMAGE_ALT = "Nerf Chess: chess with power-ups, a free online chess variant";
const BRAND_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: BRAND_IMAGE_ALT, type: "image/png" };

/** Descriptions longer than this truncate in search results and in chat
 *  previews (iMessage shows about two lines). The guard enforces it. */
export const DESCRIPTION_MAX = 160;

export type PageMetaInput = {
  /** The page's own title, without the brand (added once, automatically). */
  title: string;
  /** One or two plain sentences, at most 160 characters. */
  description: string;
  /** The canonical path, e.g. "/guide/nerf-mode". */
  path: string;
  /**
   * The preview image. Omit for the brand card. Pass "segment" when this
   * route segment has its own opengraph-image file (Next adds it, with its
   * size and alt, and a value here would be ignored anyway), or an explicit
   * { url, alt } for an image served elsewhere.
   */
  image?: "segment" | { url: string; alt: string };
  /** Keep out of the index (the page still links onward). */
  noindex?: boolean;
  type?: "website" | "article" | "profile";
  keywords?: string[];
};

/** "Leaderboard" -> "Leaderboard · Nerf Chess"; a title that already names
 *  the game keeps it once ("Nerf mode: ..." is not "Nerf mode ... Nerf Chess"
 *  twice). */
export function fullTitle(title: string): string {
  const t = title.trim();
  return /nerf ?chess/i.test(t) ? t : `${t} · ${SITE_NAME}`;
}

/** Clamp a description to DESCRIPTION_MAX on a word boundary. */
export function clampDescription(text: string, max = DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 3);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > max / 2 ? space : cut.length).replace(/[\s,.;:]+$/, "")}...`;
}

export function absoluteUrl(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageMeta(input: PageMetaInput): Metadata {
  const title = fullTitle(input.title);
  const description = clampDescription(input.description);
  const images =
    input.image === "segment"
      ? undefined
      : input.image
        ? [{ url: input.image.url, width: 1200, height: 630, alt: input.image.alt, type: "image/png" }]
        : [BRAND_IMAGE];
  return {
    title: { absolute: title, template: TITLE_TEMPLATE },
    description,
    ...(input.keywords?.length ? { keywords: input.keywords } : {}),
    alternates: { canonical: input.path },
    robots: input.noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: input.type ?? "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: input.path,
      title,
      description,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(images ? { images } : {}),
    },
  };
}

/** Metadata for a private or per-viewer surface (settings, inbox, a redirect
 *  shim): its own title and canonical, noindex, the brand preview. */
export function privateMeta(title: string, path: string, description: string): Metadata {
  return pageMeta({ title, path, description, noindex: true });
}
