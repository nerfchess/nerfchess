// The lobby before it can render: the /lobby Suspense fallback (a hard load
// paints it, under the real site header, until the page's ?tab= and ?mode=
// reads resolve) and the body of the route's loading.tsx.
//
// It is the lobby's first client render with the data taken out: the same
// section, header row, tab row, grid and panels with the same class strings,
// so the page swaps in over it without anything moving. The page title and
// the tab labels are real text (they never change); only data-bearing parts
// are skeleton blocks, and the static button row is the real one. The Online now and Games to watch panels are drawn
// exactly as the page draws them while its first snapshot is in flight.
//
// The old loading.tsx approximated this with generic bars (a 2-tab row of
// 40px blocks where the tabs are 44px, 20px segmented buttons, no header
// counters), and the Suspense fallback was an empty <main> (F019).

import { LobbyWaysIn } from "./LobbyWaysIn";

// The same tab labels the page renders, so the row has the same widths.
const TAB_LABELS = ["Play", "Watch & Friends"];

export function LobbySkeletonBody() {
  return (
    <section
      className="max-w-7xl mx-auto px-5 sm:px-6"
      aria-busy="true"
      aria-label="Loading the lobby"
    >
      <header className="mt-3 sm:mt-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <h1 className="font-display text-xl font-bold text-parchment-50 sm:text-2xl">Lobby</h1>
          <div className="flex flex-wrap items-center gap-2 pb-0.5">
            {/* The connection pill, in the Connecting state the page opens in. */}
            <span className="flex items-center gap-2 border border-[color:var(--edge)] bg-[color:var(--bg-zebra)] px-3 py-1.5 text-xs font-medium tabular-nums text-parchment-200">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-parchment-400" />
              Connecting…
            </span>
            <span className="hidden sm:contents">
              <HallStatSlot dotClass="bg-sun/80" label="waiting" />
              <HallStatSlot dotClass="bg-coral/80" label="in play" />
            </span>
          </div>
        </div>
      </header>

      <div
        aria-hidden
        className="mt-4 flex items-stretch gap-4 overflow-x-auto border-b border-[color:var(--edge)] sm:gap-6"
      >
        {TAB_LABELS.map((label, i) => (
          <span
            key={label}
            className={
              "-mb-px flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-1 pb-2.5 pt-1 font-display text-sm font-semibold [@media(pointer:fine)]:min-w-0 sm:text-base " +
              (i === 0 ? "border-[color:var(--accent)] text-gold-leaf" : "border-transparent text-parchment-300")
            }
          >
            {label}
          </span>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-5 min-w-0">
          <div className="space-y-5">
            {/* Quick pairing: the title and the two mode segments, the nine
                56px time tiles, and the Find button (desktop only; phones get
                the sticky bar). */}
            <div className="plate p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-[15px] font-bold text-parchment-50">Quick pairing</h2>
                <div className="flex items-stretch gap-1">
                  <span className="skeleton block min-h-[44px] w-[4.5rem] [@media(pointer:fine)]:min-h-[36px]" />
                  <span className="skeleton block min-h-[44px] w-[4.5rem] [@media(pointer:fine)]:min-h-[36px]" />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={i} className="skeleton block min-h-[56px]" />
                ))}
              </div>
              <span className="skeleton mt-3 hidden min-h-[52px] w-full sm:block" />
            </div>
            {/* The three other ways in: the real row, its two in-page
                buttons disabled until the lobby is live. */}
            <LobbyWaysIn />
            {/* Open challenges, folded to its 44px header. */}
            <div className="plate p-5 sm:p-6">
              <span className="skeleton block min-h-[44px]" />
            </div>
          </div>
        </div>

        <aside className="h-fit space-y-5 lg:sticky lg:top-6">
          <div className="plate p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="font-display text-[15px] font-bold text-parchment-50">Online now</div>
            </div>
            <SkeletonPlayerRows count={5} />
            <p className="mt-3 text-sm text-parchment-400">Seeing who&apos;s online…</p>
          </div>
          <div className="plate p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="font-display text-[15px] font-bold text-parchment-50">Games to watch</div>
            </div>
            <ul className="mt-3 space-y-2" aria-hidden>
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="skeleton h-12" />
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}

// A header counter chip before the first snapshot: the real chip with its
// number held by a skeleton block, so the header row does not grow when the
// counts arrive.
export function HallStatSlot({ dotClass, label }: { dotClass: string; label: string }) {
  return (
    <span className="flex items-center gap-2 border border-[color:var(--edge)] bg-[color:var(--bg-zebra)] px-3 py-1.5 text-xs tabular-nums text-parchment-300">
      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 ${dotClass}`} />
      <span aria-hidden className="skeleton inline-block h-[1em] w-[2ch] align-middle" />
      {label}
    </span>
  );
}

// Online now rows before the first snapshot: a name bar and a status chip per
// row, the page's own loading state for that panel.
export function SkeletonPlayerRows({ count }: { count: number }) {
  return (
    <ul className="mt-3 space-y-2" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex items-center justify-between gap-2">
          <span className="skeleton block h-3 w-2/5" />
          <span className="skeleton h-4 w-14 shrink-0" />
        </li>
      ))}
    </ul>
  );
}
