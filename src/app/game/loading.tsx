// Branded route skeleton for /game and /game/[id]: a board-shaped shimmer
// with player rows and a side panel, shown while the game page chunk loads.
export default function Loading() {
  return (
    <main className="min-h-screen pb-16">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3 sm:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Loading" width={26} height={26} className="animate-pulse" />
        <div className="skeleton h-8 w-28 rounded-[2px]" style={{ borderRadius: 2 }} />
      </div>
      <section className="mx-auto max-w-6xl px-5 py-6 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="mx-auto w-full max-w-2xl">
            <div className="flex items-center gap-2.5">
              <div className="skeleton h-9 w-9 rounded-full" style={{ borderRadius: "50%" }} />
              <div className="skeleton h-5 w-32 rounded-[2px]" style={{ borderRadius: 2 }} />
              <div className="skeleton ml-auto h-8 w-20 rounded-[2px]" style={{ borderRadius: 2 }} />
            </div>
            <div className="skeleton mt-3 aspect-square w-full rounded-[2px]" style={{ borderRadius: 2 }} />
            <div className="mt-3 flex items-center gap-2.5">
              <div className="skeleton h-9 w-9 rounded-full" style={{ borderRadius: "50%" }} />
              <div className="skeleton h-5 w-32 rounded-[2px]" style={{ borderRadius: 2 }} />
              <div className="skeleton ml-auto h-8 w-20 rounded-[2px]" style={{ borderRadius: 2 }} />
            </div>
          </div>
          <div className="plate hidden h-fit p-5 lg:block">
            <div className="skeleton h-5 w-24 rounded-[2px]" style={{ borderRadius: 2 }} />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="skeleton h-6 rounded-[2px]" style={{ borderRadius: 2 }} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
