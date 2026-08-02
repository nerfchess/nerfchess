// Branded route skeleton for /lobby: mirrors the lobby layout (masthead over
// the flat brass hairline, flat bordered rows, sticky player column) so the
// page chunk swaps in without anything jumping.
import "@/components/dungeon/dungeon-lobby.css";

export default function Loading() {
  return (
    <main className="min-h-screen pb-16">
      {/* Same fixed torchlit wash as the loaded page, so the backdrop doesn't
          jump from flat black to warm stone when the chunk swaps in. */}
      <div className="dgn-hall-ambience" aria-hidden />
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3 sm:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Loading" width={26} height={26} className="animate-pulse" />
        <div className="skeleton h-8 w-28" />
      </div>
      <section className="mx-auto max-w-7xl px-5 sm:px-6">
        {/* Masthead: on phones it is one compact row (small title beside the
            status pill) so the skeleton matches the page and nothing jumps;
            desktop keeps the eyebrow + monumental headline. */}
        <div className="mt-2 sm:mt-4">
          <div className="skeleton hidden h-3 w-24 sm:block" />
          <div className="flex flex-wrap items-center justify-between gap-3 sm:mt-2 sm:items-end">
            <div className="skeleton h-8 w-36 sm:h-16 sm:w-72" />
            <div className="flex gap-2">
              <div className="skeleton h-7 w-28" />
              <div className="skeleton hidden h-7 w-24 sm:block" />
            </div>
          </div>
          <div className="hall-hairline mt-2 sm:mt-4" aria-hidden />
        </div>
        {/* Tab bar (Play / Watch & Friends). */}
        <div className="mt-6 flex flex-wrap gap-1.5 border-b border-white/10 pb-px" aria-hidden>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton h-10 w-20 sm:w-28" />
          ))}
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="min-w-0 space-y-5">
            {/* Quick Match chamber: mode doors, the three primary time-control
                tokens (the rest fold behind "More time controls"), one gate
                button. */}
            <div className="dgn-slab dgn-hallpanel dgn-rivets p-5">
              <div className="skeleton h-6 w-36" />
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="skeleton h-28" />
                <div className="skeleton h-28" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-1.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton h-16" />
                ))}
              </div>
              <div className="skeleton mt-4 h-14 w-full" />
            </div>
            {/* Secondary play-mode cards. */}
            <div className="grid gap-2.5 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-20" />
              ))}
            </div>
          </div>
          <div className="h-fit space-y-5">
            <div className="dgn-slab dgn-hallpanel dgn-rivets p-5">
              <div className="skeleton h-5 w-28" />
              <div className="mt-4 space-y-2.5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="skeleton h-8" />
                ))}
              </div>
            </div>
            <div className="dgn-slab dgn-hallpanel dgn-rivets p-5">
              <div className="skeleton h-5 w-32" />
              <div className="mt-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton h-12" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
