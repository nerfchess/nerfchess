// Branded route skeleton for /community: three door cards over the top-player
// and recent-game lists, mirroring the hub while the page chunk loads.
export default function Loading() {
  return (
    <main className="min-h-screen pb-16">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3 sm:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Loading" width={26} height={26} className="animate-pulse" />
        <div className="skeleton h-8 w-28 rounded-[10px]" style={{ borderRadius: 10 }} />
      </div>
      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-6">
        <div className="skeleton h-10 w-52 rounded-[10px]" style={{ borderRadius: 10 }} />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="plate flex items-center gap-3.5 p-4">
              <div className="skeleton h-11 w-11 shrink-0 rounded-[10px]" style={{ borderRadius: 10 }} />
              <div className="min-w-0 flex-1">
                <div className="skeleton h-5 w-24 rounded-[10px]" style={{ borderRadius: 10 }} />
                <div className="skeleton mt-2 h-3.5 w-full rounded-[10px]" style={{ borderRadius: 10 }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="plate p-5 sm:p-6">
            <div className="skeleton h-6 w-32 rounded-[10px]" style={{ borderRadius: 10 }} />
            <div className="mt-4 space-y-2.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton h-8 rounded-[10px]" style={{ borderRadius: 10 }} />
              ))}
            </div>
          </div>
          <div className="plate h-fit p-5">
            <div className="skeleton h-5 w-24 rounded-[10px]" style={{ borderRadius: 10 }} />
            <div className="mt-4 space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-7 rounded-[10px]" style={{ borderRadius: 10 }} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
