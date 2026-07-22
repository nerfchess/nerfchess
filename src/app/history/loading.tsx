// Branded route skeleton for /history and /history/[id]: a stack of
// game-row shimmer blocks while the archive page chunk loads.
export default function Loading() {
  return (
    <main className="min-h-screen pb-16">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3 sm:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Loading" width={26} height={26} className="animate-pulse" />
        <div className="skeleton h-8 w-28 rounded-[1px]" style={{ borderRadius: 1 }} />
      </div>
      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-6">
        <div className="skeleton h-10 w-44 rounded-[1px]" style={{ borderRadius: 1 }} />
        <div className="skeleton mt-2 h-4 w-64 max-w-full rounded-[1px]" style={{ borderRadius: 1 }} />
        <div className="plate mt-6 overflow-hidden">
          <div className="divide-y divide-white/5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="skeleton h-9 w-9 shrink-0 rounded-[1px]" style={{ borderRadius: 1 }} />
                <div className="min-w-0 flex-1">
                  <div className="skeleton h-4 w-52 max-w-full rounded-[1px]" style={{ borderRadius: 1 }} />
                  <div className="skeleton mt-2 h-3 w-32 rounded-[1px]" style={{ borderRadius: 1 }} />
                </div>
                <div className="skeleton h-4 w-12 shrink-0 rounded-[1px]" style={{ borderRadius: 1 }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
