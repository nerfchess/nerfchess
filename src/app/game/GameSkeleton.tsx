// The game frame before a game is on it: the compact site header, a status
// line, then the board column (a player row, the board, a player row) beside
// the move-list column, in the spectator and replay layout's own geometry
// (GameShell in game/[id]/page.tsx: max-w-[1200px], a 720px board cap, a
// 256px rail that is 288px from xl).
//
// One component for every place a game is still being found: the route's
// loading.tsx, the /game/[id] connecting and waiting states, and the bot
// game's first render. The bot game used to show three bouncing dots and
// "Dealing the cards" on an empty page with no header (F020); the connecting
// state and loading.tsx had drifted into two different skeletons with
// retired inline radii.

import { SkeletonCompactHeader } from "@/components/ui/Skeleton";

// A quiet checkered board frame with a shimmer sweep. Same 8x8 grid and
// square colours as the live board so it holds the exact footprint the real
// Board will fill.
export function BoardSkeleton() {
  return (
    <div className="relative aspect-square w-full overflow-hidden border border-[color:var(--edge)]">
      <div className="grid h-full w-full grid-cols-8 grid-rows-8" aria-hidden>
        {Array.from({ length: 64 }).map((_, i) => {
          const isLight = (Math.floor(i / 8) + (i % 8)) % 2 === 0;
          return <div key={i} className={isLight ? "sq-light" : "sq-dark"} />;
        })}
      </div>
      <div className="skeleton absolute inset-0" aria-hidden />
    </div>
  );
}

// BoardPlayerRow's box as GameShell uses it (!px-0 !py-1): 44px on a phone
// (the name line over the material line), 52px from sm (the 32px avatar, the
// name and the material in one row), in the same rem units, so the board
// under it starts where the live row will put it. It was a 24px bar in a
// 28px row, which put the board 15px (phone) and 18px (desktop) too high.
function PlayerRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-h-[2.75rem] min-w-0 flex-1 items-center gap-2 py-1 sm:min-h-[3.25rem] sm:gap-3" aria-hidden>
        <span className="skeleton hidden h-8 w-8 shrink-0 sm:block" />
        <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:gap-3">
          <div className="font-display text-[14px] leading-tight sm:min-w-[7rem] sm:text-sm">
            <span className="skeleton inline-block w-32 align-middle">&nbsp;</span>
          </div>
          <div className="h-5 sm:h-auto" />
        </div>
      </div>
    </div>
  );
}

export function GameFrameSkeleton({
  label,
  gameId,
  children,
}: {
  /** The status line: what the page is waiting for, in plain words. */
  label: string;
  /** The game's id, shown after the status when known. */
  gameId?: string;
  /** Overlays the page adds (the slow-connect note). */
  children?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen" aria-busy="true">
      <SkeletonCompactHeader />
      {/* sr-only: the visible chrome here is a skeleton, and a printed
          heading would be a jump when the board fills in. */}
      <h1 className="sr-only">Game</h1>
      <div className="mx-auto w-full max-w-[1200px] px-3 pb-10 sm:px-6">
        {/* GameShell's meta row, same classes: the players, the state
            badge, the mode chip, the time control and Rated or Casual. Here
            it carries the status and the id, then blocks built like the
            badge and the chip (12px text, a 2px vertical pad, a border) and
            the width of the short labels and the result line, so it wraps
            where the real row wraps for names of a usual length (two lines
            on a phone, one from sm) and the board below starts at the same
            y. Much longer names wrap the real row to a third line. */}
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-parchment-400">
          <span role="status">{label}</span>
          {gameId && <span className="font-mono tracking-[0.2em] text-gold-leaf">{gameId}</span>}
          <span className="skeleton inline-flex w-12 border border-transparent py-0.5" aria-hidden>&nbsp;</span>
          <span className="skeleton inline-flex w-14 border border-transparent py-0.5" aria-hidden>&nbsp;</span>
          <span className="skeleton inline-block w-8" aria-hidden>&nbsp;</span>
          <span className="skeleton inline-block w-12" aria-hidden>&nbsp;</span>
          <span className="skeleton inline-block w-24" aria-hidden>&nbsp;</span>
        </div>
        {children}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <PlayerRowSkeleton />
            <div className="w-full max-w-[720px]">
              <BoardSkeleton />
            </div>
            <PlayerRowSkeleton />
          </div>
          <div className="sm:w-64 sm:shrink-0">
            <div className="skeleton h-64 w-full xl:h-72" aria-hidden />
          </div>
        </div>
      </div>
    </main>
  );
}
