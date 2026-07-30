// Geometry of the fixed bottom chrome on the match surfaces, in one place.
//
// Both match views (OnlineMatch and the local /game page) render up to two
// stacked, position:fixed drawer bars below the board:
//
//   MobileMoveDrawer   `sm:hidden`  — bottom: 0,        bar 2.75rem + safe area
//   MobileBuffDrawer   `lg:hidden`  — stacked above it, bar 2.75rem
//                                     (drops to the edge from sm up, where the
//                                      move drawer is gone, and takes the inset)
//
// The match column is `h-dvh` + `overflow-hidden`, so anything it fails to
// reserve room for is not scrollable-to — it is simply hidden behind the bars.
// It used to hardcode `pb-14` (56px) against as much as 88px of chrome, which
// buried the bottom player row, the rating strip, and the MobileActionsMenu
// trigger — the only route to Draw/Resign/Takeback on a phone.
//
// The class strings below are written out IN FULL, never assembled from parts:
// Tailwind's JIT scans source text for literal class names, so an interpolated
// arbitrary value would simply never be generated.

/**
 * Bottom padding for the match column.
 *
 * @param hasBuffDrawer whether MobileBuffDrawer is mounted (draft games only).
 *
 * Breakpoints mirror the drawers' own visibility:
 *   <sm  move bar (2.75rem) + inset, plus a second bar when the buff drawer is up
 *   sm   move bar hidden; buff bar (if present) sits on the edge and takes the inset
 *   lg   both hidden — ordinary page padding
 */
export function bottomChromePadClass(hasBuffDrawer: boolean): string {
  return hasBuffDrawer
    ? "pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:pb-[calc(2.75rem+env(safe-area-inset-bottom))] lg:pb-6"
    : "pb-[calc(2.75rem+env(safe-area-inset-bottom))] sm:pb-6 lg:pb-6";
}
