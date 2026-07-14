// Branded route skeleton for /lobby: mirrors the lobby layout (masthead over
// the flat brass hairline, flat bordered rows, sticky player column) so the
// page chunk swaps in without anything jumping.
export default function Loading() {
  return (
    <main className="min-h-screen pb-16">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3 sm:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Loading" width={26} height={26} className="animate-pulse" />
        <div className="skeleton h-8 w-28" />
      </div>
      <section className="mx-auto max-w-7xl px-5 sm:px-6">
        <div className="mt-2 sm:mt-4">
          <div className="skeleton h-3 w-24" />
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div className="skeleton h-12 w-56 sm:h-16 sm:w-72" />
            <div className="flex gap-2">
              <div className="skeleton h-7 w-28" />
              <div className="skeleton hidden h-7 w-24 sm:block" />
            </div>
          </div>
          <div className="hall-hairline mt-4" aria-hidden />
        </div>
        <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="min-w-0 space-y-5">
            <div className="plate p-5">
              <div className="skeleton h-6 w-36" />
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="skeleton h-20" />
                ))}
              </div>
              <div className="skeleton mt-4 h-11 w-full" />
            </div>
            <div className="plate p-5">
              <div className="skeleton h-6 w-44" />
              <ul className="mt-4 space-y-2.5" aria-hidden>
                {Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="hall-row flex items-center justify-between gap-3 p-3 sm:px-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <span className="skeleton block h-3.5 w-1/2" />
                      <span className="skeleton block h-2.5 w-1/3" />
                    </div>
                    <span className="skeleton h-9 w-20 shrink-0" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="plate h-fit p-5">
            <div className="skeleton h-5 w-28" />
            <div className="mt-4 space-y-2.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="skeleton h-8" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
