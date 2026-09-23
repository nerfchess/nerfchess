// Route skeleton for /clubs/[slug]: the club identity (icon, name, owner and
// member line) above the members rail beside the activity column.
//
// Without this the route inherited /clubs/loading.tsx, which draws the
// create-club form next to the club directory: the wrong two columns, in the
// wrong order, at the wrong widths. The page's own in-flight state is a
// centred "Loading…" line, which is a third geometry again.

import { SkeletonHeader } from "@/components/ui/Skeleton";
import { ClubDetailSkeleton } from "./DetailSkeleton";

export default function Loading() {
  return (
    <main className="min-h-screen pb-16">
      {/* A skeleton with no h1 leaves the route headingless for the whole
          load, which is when someone arriving by screen reader most needs to
          know where they are. Generic because the real name has not arrived
          yet; the loaded page replaces it with the actual one. */}
      <h1 className="sr-only">Club</h1>
      <SkeletonHeader />
      <section className="mx-auto max-w-6xl px-5 pt-6 sm:px-6 sm:pt-8">
        <ClubDetailSkeleton />
      </section>
    </main>
  );
}
