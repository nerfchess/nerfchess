// The one loading picture for a player profile (F021).
//
// Used by /u/[username]/loading.tsx, the page's own Suspense fallback and
// in-flight state, and the /profile hand-off that forwards to /u/<name>, so
// every path into a profile shows the same shape. It is built from the real
// shell's containers (the same section grid, the rating rail, the plate with
// its header, stat strip, chart row and box tabs) and each text placeholder
// sits in a line box of the real type size, so the settled page lands where
// the skeleton stood. `data-part` names match the page's so a spec can hold
// the two boxes to each other (e2e/polish/account-routes.spec.ts).

import { MODE_RATING_CATEGORIES } from "@/lib/ratingCategories";

/** A placeholder bar inside a line box of the given text classes, so its row
 *  is exactly as tall as the text that replaces it. */
function Line({ text, width }: { text: string; width: string }) {
  return (
    <span className={"block " + text}>
      <span className={"skeleton inline-block align-middle " + width} style={{ height: "0.8em" }}>
        {" "}
      </span>
    </span>
  );
}

export function ProfileSkeleton({ heading = true }: { heading?: boolean }) {
  return (
    <section
      data-profile-skeleton
      aria-busy="true"
      className="mx-auto w-full max-w-[1300px] px-3 pt-4 sm:px-5 lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-4"
    >
      {/* One sr-only heading while the profile loads, so the route is never
          headingless. loading.tsx passes heading={false}: the page's own
          fallback mounts beside it on arrival and two would be live at once. */}
      {heading && <h1 className="sr-only">Player profile</h1>}

      <aside data-part="rail" className="order-2 mt-4 lg:order-1 lg:mt-0" aria-hidden>
        <ul className="divide-y divide-[color:var(--edge)] border-y border-[color:var(--edge)] lg:border-y-0">
          {MODE_RATING_CATEGORIES.map((c) => (
            <li key={c.id} className="flex w-full items-center gap-3 px-3 py-2.5">
              <span className="skeleton h-[30px] w-[30px] shrink-0" />
              <span className="min-w-0 flex-1">
                <Line text="text-[12px]" width="w-12" />
                <Line text="text-[17px] font-semibold" width="w-24" />
              </span>
            </li>
          ))}
        </ul>
      </aside>

      <div className="order-1 min-w-0 lg:order-2" aria-hidden>
        <div data-part="plate" className="plate">
          <div className="flex items-start gap-4 px-4 pb-4 pt-5 sm:px-5">
            <span className="skeleton h-12 w-12 shrink-0 rounded-full" style={{ borderRadius: "50%" }} />
            <div className="min-w-0 flex-1">
              <Line text="font-display text-[26px] leading-tight" width="w-44 max-w-full" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[color:var(--edge)] px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col items-center">
                  <Line text="text-[15px] font-semibold" width="w-8" />
                  <Line text="text-[12px]" width="w-10" />
                </div>
              ))}
            </div>
            <div className="ml-auto">
              <span className="skeleton block h-[44px] w-28" />
            </div>
          </div>

          <div className="grid border-t border-[color:var(--edge)] lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0 p-3 sm:p-4">
              <span className="skeleton block h-40 w-full" />
            </div>
            <div className="space-y-2.5 border-t border-[color:var(--edge)] p-4 sm:p-5 lg:border-l lg:border-t-0">
              {[0, 1, 2].map((i) => (
                <Line key={i} text="text-[13px] leading-snug" width="w-40 max-w-full" />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-[color:var(--edge)]">
            <span className="min-h-[44px] bg-[color:var(--bg-panel)]" />
            <span className="min-h-[44px] bg-[color:var(--bg-base)]" />
          </div>

          <div className="space-y-3 px-4 py-5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="skeleton block h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
