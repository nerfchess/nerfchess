# Technical SEO implementation

Status of the technical SEO wave (2026-08-04). This documents what is in place
after the wave, which parts already existed, and what remains. Content strategy
(new guide pages, link building, and so on) is out of scope here.

## Root metadata (src/app/layout.tsx)

- `metadataBase` is `https://nerfchess.com`, so every relative canonical and
  OG url resolves absolute.
- Default title targets the head phrase:
  "Nerf Chess · chess with power-ups, a free online chess variant", with the
  title template `%s · Nerf Chess` for every child page.
- Site description leads with "chess with power-ups: a free online chess
  variant" and still covers both modes and capture-the-king.
- Open Graph and Twitter defaults match the title/description. The explicit
  `images` entries were removed: the file-based `src/app/opengraph-image.tsx`
  now supplies a proper 1200x630 preview site-wide, and Twitter card is
  `summary_large_image` (Twitter falls back to og:image).
- Favicon set (48/192/512 PNG plus SVG and apple icon) was already in place.

## Homepage H1 (src/app/page.tsx)

The hero eyebrow is now the page's `<h1>` (visually identical, restyled span
to h1) with an `sr-only` tail: "chess with power-ups, a free online chess
variant". The visible hero was not redesigned.

## robots.ts (src/app/robots.ts)

Already existed with a permissive policy (named search and AI crawlers plus
`*`) and the sitemap reference. This wave added `/dev` and `/profile/edit` to
the disallow list, alongside the existing `/api/`, `/game`, `/inbox`, `/mod`,
and `/friend`.

## sitemap.ts (src/app/sitemap.ts)

Already existed and needed no changes: one generated sitemap at /sitemap.xml
covering the static pages (home, play, lobby, codex, guides, faq, about,
tutorial, leaderboard, tv, community, and the rest) plus one entry per
implemented card via `cardPath` from `src/lib/cardCodex.ts` (hexes and boons
list their canonical family paths). Roughly 2.5k URLs total, well under the
50k per-file limit, so no sitemap index is needed.

## Structured data (JSON-LD)

Already in place before this wave; verified, not duplicated:

- Root layout: one `@graph` with `Organization`, `WebSite` (with a
  `SearchAction` into the codex search), and `VideoGame` co-typed with
  `WebApplication` (`applicationCategory: "GameApplication"`, offers price 0,
  `playMode` MultiPlayer and SinglePlayer, `isAccessibleForFree`). Because it
  lives in the root layout it is served on the homepage.
- FAQ page (src/app/faq/page.tsx): `FAQPage` schema backed by the same
  questions rendered on the page.
- Guide pages: `BreadcrumbList` plus per-page `FAQPage` sections
  (src/app/guide/shared.tsx); the glossary carries a `DefinedTermSet`.
- Card pages: `BreadcrumbList` via `CardBreadcrumbJsonLd` in
  src/components/codex/CardDetail.tsx.
- Tutorial: `HowTo` schema.

## Per-card OG images (new in this wave)

`next/og` `ImageResponse` images on the house palette (ink #191713 background,
parchment #c2bcaf text, gold #f4c430 accent), no external fonts:

- `src/lib/ogCard.tsx`: shared renderer with two layouts, the generic site
  card and the per-card codex card (name, tier, family, mode, rule text,
  clamped so long texts never overflow).
- `src/app/opengraph-image.tsx`: site-wide default (1200x630).
- `src/app/codex/{buff,nerf,hex,boon}/[id]/opengraph-image.tsx`: per-card
  images. Unknown or family-mismatched ids fall back to the generic site image
  instead of erroring. Hex and boon files guard on `buffType` exactly like
  their pages do.

## Canonicals

- Codex card pages already set `alternates.canonical` to the card's canonical
  path (`cardPath` sends hexes and boons to their family namespaces), made
  absolute by `metadataBase`. Unimplemented cards render but carry noindex.
- Fixed this wave: client pages with no metadata of their own (/analysis,
  /login, /stats, /history) inherited the root layout's canonical "/" and read
  as duplicates of the homepage. Each now has a small server layout with its
  own title and self-canonical; the user-specific surfaces (/stats, /history,
  and by inheritance /history/[id]) are noindex, follow.

## What remains (technical, not content)

- Real screenshot or board-art OG imagery could replace the typographic
  cards later; the current images are deliberately simple and font-safe.
- `twitter-image.tsx` files are not duplicated per route; Twitter/X falls
  back to og:image, which is standard, but explicit files would remove the
  dependency on that fallback.
- A few remaining client pages of low search value (e.g. /friend, blocked in
  robots) still inherit root metadata; none of them inherit a wrong canonical
  that matters, but a pass adding thin layouts could tidy them.
- hreflang/alternate locales: single-locale site today, nothing to do until
  translations exist.
- Verify rich results in Search Console after deploy (VideoGame, FAQ,
  Breadcrumb, HowTo) and confirm the sitemap is fetched.
