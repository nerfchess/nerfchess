// Branded route skeleton for /tv, built from the page's own grid (F023): the
// same 1200px section, the 592px featured column beside the 320px rail, the
// plate around the board with its header row and seat rows, the channel
// switcher and the live list. So the page lands on the skeleton's geometry
// instead of shifting from a different layout.

import { SkeletonHeader } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen">
      <SkeletonHeader />
      <h1 className="sr-only">Nerf Chess TV</h1>
      <section className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6" aria-busy="true">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,592px)_320px] lg:justify-center">
          <div className="min-w-0">
            <div className="plate p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="skeleton h-5 w-36" />
                  <div className="skeleton h-4 w-48" />
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <div className="skeleton h-[44px] w-[44px] [@media(pointer:fine)]:h-9 [@media(pointer:fine)]:w-9" />
                  <div className="skeleton h-[44px] w-[44px] [@media(pointer:fine)]:h-9 [@media(pointer:fine)]:w-9" />
                </div>
              </div>
              <div className="mx-auto mt-3 w-full max-w-[560px]">
                <div className="flex items-center gap-2 py-1">
                  <div className="skeleton h-7 w-7 rounded-full" />
                  <div className="skeleton h-4 w-32" />
                </div>
                <div className="skeleton aspect-square w-full" />
                <div className="flex items-center gap-2 py-1">
                  <div className="skeleton h-7 w-7 rounded-full" />
                  <div className="skeleton h-4 w-32" />
                </div>
              </div>
            </div>
          </div>
          <aside className="flex flex-col gap-4">
            <div className="skeleton h-[52px] w-full [@media(pointer:fine)]:h-[38px]" />
            <div className="plate">
              <div className="border-b border-[color:var(--edge)] px-3 py-2.5">
                <div className="skeleton h-5 w-24" />
              </div>
              <div className="space-y-2 p-3">
                <div className="skeleton h-12 w-full" />
                <div className="skeleton h-12 w-full" />
                <div className="skeleton h-12 w-3/4" />
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
