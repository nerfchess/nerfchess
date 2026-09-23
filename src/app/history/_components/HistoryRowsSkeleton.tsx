// Shared by the /history page (while the stored list is read) and its
// loading.tsx (while the route chunk loads), so both draw one geometry.

/** The list's geometry while the stored games are read: the same plate, the
 *  same 40px outcome badge and two text lines as a GameRow, so the list does
 *  not reflow when the rows arrive. Also the body of the route's loading.tsx. */
export function HistoryRowsSkeleton() {
  return (
    <ul className="mt-6 space-y-2" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="plate flex items-center gap-3 border-l-2 border-l-[color:var(--edge)] p-3 sm:gap-4 sm:p-4">
          <span className="skeleton h-10 w-10 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="skeleton block h-5 w-40 max-w-full" />
            <span className="skeleton mt-1.5 block h-3 w-32" />
          </span>
          <span className="skeleton h-4 w-12 shrink-0" />
        </li>
      ))}
    </ul>
  );
}
