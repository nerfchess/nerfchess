// Route skeleton for /tournaments/[id]: breadcrumb, event name and its chip
// row, then standings beside the info rail.
//
// The page's own in-flight state was a centred "Loading..." line inside a
// py-16 block, which is the wrong height and the wrong shape for the two
// columns that replace it. This is the layout the event settles into.

import { SkeletonHeader } from "@/components/ui/Skeleton";
import { TournamentDetailSkeleton } from "./DetailSkeleton";

export default function Loading() {
  return (
    <main className="min-h-screen pb-16">
      {/* A skeleton with no h1 leaves the route headingless for the whole
          load, which is when someone arriving by screen reader most needs to
          know where they are. Generic because the real name has not arrived
          yet; the loaded page replaces it with the actual one. */}
      <h1 className="sr-only">Tournament</h1>
      <SkeletonHeader />
      <section className="mx-auto max-w-6xl px-5 pt-6 sm:px-6">
        <TournamentDetailSkeleton />
      </section>
    </main>
  );
}
