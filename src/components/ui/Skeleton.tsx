// The top bar every route skeleton opens with: the real site header.
//
// This used to be a stand-in (the logo and a 98x28 block in the header's box),
// on the grounds that the real SiteHeader fetched the session on mount and
// rendering it in a loading fallback would fetch everything twice. Two things
// changed. The session now comes from one shared store seeded by the display
// cookie (slice A), so the header has its final shape from the first render
// and asks for /api/auth/me no more often for being here. And because the root
// layout renders per request, a route's loading.tsx can be what a hard load
// paints first, so the stand-in was swapped for the real header in front of
// the reader: the right cluster grew from 98 to 309px and moved 212px on /play
// and /profile (slice A, evidence/A/section4-after). Rendering the header
// itself removes that swap on every route that uses these. What is left is the
// header's social poll (notifications and challenges) running once more while
// a skeleton is up, which is a request, not a jump.
//
// Game routes compact the nav (design system section 9), so their skeletons
// open with the compact header instead.

import { CompactSiteHeader, SiteHeader } from "@/components/SiteHeader";

export function SkeletonHeader() {
  return <SiteHeader />;
}

export function SkeletonCompactHeader() {
  return <CompactSiteHeader />;
}
