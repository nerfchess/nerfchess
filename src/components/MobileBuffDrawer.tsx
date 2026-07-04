"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { type ReactNode, useState } from "react";

/**
 * Collapsible bottom drawer for the draft-mode buff dock below the lg
 * breakpoint (the desktop side rail is the only other place it renders).
 * Sits above the MobileMoveDrawer bar on phones; on sm–lg widths the move
 * drawer is hidden and this bar drops to the bottom edge. `usable` drives a
 * badge so a buff becoming activatable doesn't go unnoticed while closed.
 */
export function MobileBuffDrawer({
  held,
  usable,
  children,
}: {
  /** Cards you currently hold (spent ones included — they stay on record). */
  held: number;
  /** Activated buffs you could use right now. */
  usable: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      {open && (
        <button
          type="button"
          aria-label="Close buffs"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/50"
        />
      )}
      <div className="fixed inset-x-0 bottom-11 z-40 plate border-t border-white/10 sm:bottom-0">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 w-full items-center justify-between px-4 transition-colors duration-150 hover:bg-white/[0.04] active:bg-white/[0.07]"
        >
          <span className="flex items-center gap-2 smallcaps text-[10px] text-parchment-400">
            Buffs
            {usable > 0 && (
              <span className="grid h-4 min-w-[1rem] place-items-center rounded-full bg-gold px-1 font-mono text-[9px] font-bold text-ink-950">
                {usable}
              </span>
            )}
          </span>
          <span className="flex items-center gap-2 font-mono text-xs tabular-nums text-parchment-100">
            {held === 0 ? "None yet" : `${held} held`}
            <span className="text-parchment-400" aria-hidden>
              {open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </span>
          </span>
        </button>
        <div
          className={
            "overflow-hidden transition-[height] duration-200 ease-out " + (open ? "h-[46dvh]" : "h-0")
          }
        >
          <div className="h-full overflow-y-auto px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
