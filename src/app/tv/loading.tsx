// Branded route skeleton for /tv: the featured board beside its game panel,
// shown as shimmer blocks while the Nerf TV page chunk loads.
export default function Loading() {
  return (
    <main className="min-h-screen pb-16">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3 sm:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Loading" width={26} height={26} className="animate-pulse" />
        <div className="skeleton h-8 w-28 rounded-[10px]" style={{ borderRadius: 10 }} />
      </div>
      <section className="mx-auto max-w-6xl px-5 py-6 sm:px-6">
        <div className="skeleton h-10 w-40 rounded-[10px]" style={{ borderRadius: 10 }} />
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="mx-auto w-full max-w-2xl">
            <div className="flex items-center gap-2.5">
              <div className="skeleton h-9 w-9 rounded-full" style={{ borderRadius: "50%" }} />
              <div className="skeleton h-5 w-36 rounded-[10px]" style={{ borderRadius: 10 }} />
            </div>
            <div className="skeleton mt-3 aspect-square w-full rounded-[10px]" style={{ borderRadius: 10 }} />
            <div className="mt-3 flex items-center gap-2.5">
              <div className="skeleton h-9 w-9 rounded-full" style={{ borderRadius: "50%" }} />
              <div className="skeleton h-5 w-36 rounded-[10px]" style={{ borderRadius: 10 }} />
            </div>
          </div>
          <div className="plate h-fit p-5">
            <div className="skeleton h-5 w-24 rounded-[10px]" style={{ borderRadius: 10 }} />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton h-6 rounded-[10px]" style={{ borderRadius: 10 }} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
