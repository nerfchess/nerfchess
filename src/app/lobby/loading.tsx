// Branded route skeleton for /lobby: pulsing mark plus shimmer blocks that
// mirror the queue panel and player list while the page chunk loads.
export default function Loading() {
  return (
    <main className="min-h-screen pb-16">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3 sm:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Loading" width={26} height={26} className="animate-pulse" />
        <div className="skeleton h-8 w-28 rounded-[10px]" style={{ borderRadius: 10 }} />
      </div>
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6">
        <div className="skeleton h-10 w-44 rounded-[10px]" style={{ borderRadius: 10 }} />
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="plate p-5">
            <div className="skeleton h-6 w-36 rounded-[10px]" style={{ borderRadius: 10 }} />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-[10px]" style={{ borderRadius: 10 }} />
              ))}
            </div>
            <div className="skeleton mt-4 h-11 w-full rounded-[10px]" style={{ borderRadius: 10 }} />
          </div>
          <div className="plate p-5">
            <div className="skeleton h-5 w-28 rounded-[10px]" style={{ borderRadius: 10 }} />
            <div className="mt-4 space-y-2.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="skeleton h-8 rounded-[10px]" style={{ borderRadius: 10 }} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
