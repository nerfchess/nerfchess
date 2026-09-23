// Route skeleton for /history, in the page's own geometry: the same 3xl column,
// the real title, the four filter chips (44px on touch, 36px on a fine
// pointer) and the shared row skeleton the page itself shows while it reads
// the stored games. It used to be a 5xl column of list rows under a 40px title
// block, so a client navigation landed in one shape and settled in another
// (F024). /history/[id] has its own loading.tsx.

import { SkeletonHeader } from "@/components/ui/Skeleton";
import { HistoryRowsSkeleton } from "./_components/HistoryRowsSkeleton";

export default function Loading() {
  return (
    <main className="min-h-screen">
      <SkeletonHeader />
      <section className="max-w-3xl mx-auto px-5 sm:px-6 py-6 sm:py-8">
        <h1 className="page-title">Game history</h1>
        <div className="mt-6 flex flex-wrap gap-2" aria-hidden>
          {[112, 84, 96, 84].map((w, i) => (
            <span
              key={i}
              className="skeleton inline-block h-[44px] [@media(pointer:fine)]:h-9"
              style={{ width: w }}
            />
          ))}
        </div>
        <HistoryRowsSkeleton />
      </section>
    </main>
  );
}
