// The body of the /clubs/[slug] skeleton: the club identity (icon, name,
// owner and member line) above the members rail beside the activity column.
// Shared by loading.tsx and the page's own in-flight branch (a client
// navigation from /clubs never shows loading.tsx), so both land on the layout
// the club settles into (F022). Only the contents: each caller supplies the
// section.

export function ClubDetailSkeleton() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4">
          <div className="skeleton h-16 w-16 shrink-0" />
          <div className="min-w-0">
            <div className="skeleton h-8 w-56 max-w-full" />
            <div className="skeleton mt-2 h-4 w-72 max-w-full" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="skeleton h-11 w-24 sm:h-10" />
          <div className="skeleton h-11 w-24 sm:h-10" />
        </div>
      </div>
      <div className="skeleton mt-4 h-5 w-full max-w-2xl" />
      <div className="mt-8 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <div className="plate overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-[color:var(--edge)] px-5 py-3">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-4 w-16" />
            </div>
            <div className="divide-y divide-[color:var(--edge)]">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex min-h-[44px] items-center gap-3 px-5 py-2.5">
                  <div className="skeleton h-4 w-4 shrink-0" />
                  <div className="skeleton h-4 w-32 max-w-full" />
                  <div className="skeleton ml-auto h-4 w-10 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="plate overflow-hidden">
          <div className="border-b border-[color:var(--edge)] px-5 py-3">
            <div className="skeleton h-4 w-28" />
          </div>
          <div className="divide-y divide-[color:var(--edge)]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <div className="skeleton h-9 w-9 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="skeleton h-4 w-48 max-w-full" />
                  <div className="skeleton mt-2 h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
