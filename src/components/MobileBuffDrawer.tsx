"use client";

import { ChevronDown, ChevronUp, Layers } from "lucide-react";
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
  autoCloseWhen,
  label = "Buffs",
  children,
}: {
  /** Cards you currently hold (spent ones included — they stay on record). */
  held: number;
  /** Activated buffs you could use right now. */
  usable: number;
  /** Collapse the drawer while true (a buff is targeting on the board). */
  autoCloseWhen?: boolean;
  /** Drawer title ("Buffs", or "Boons" in nerf mode). */
  label?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Collapse the drawer when the parent signals an auto-close (e.g. a buff was
  // used); handled on the transition during render rather than in an effect.
  const [prevAutoClose, setPrevAutoClose] = useState(autoCloseWhen);
  if (prevAutoClose !== autoCloseWhen) {
    setPrevAutoClose(autoCloseWhen);
    if (autoCloseWhen) setOpen(false);
  }

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
      <div
        className="fixed inset-x-0 bottom-11 z-40 plate overflow-hidden border-t border-[color:var(--edge)] sm:bottom-0"
        // Drawer geometry: rounded top corners, square bottom against the
        // screen edge. Inline so it reliably overrides the plate's 10px.
        style={{ borderRadius: "2px 2px 0 0" }}
      >
        {/* Grab handle: a small pill centered on the top edge, the universal
            "this pulls up" affordance. */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1.5 h-1 w-9 -translate-x-1/2 rounded-full bg-white/15"
        />
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 w-full items-center justify-between px-4 transition-colors duration-150 hover:bg-white/[0.04] active:bg-white/[0.07]"
        >
          <span className="flex items-center gap-2 smallcaps text-[12px] text-parchment-400">
            {/* Mint icon chip echoes the desktop dock's "your buffs" hero so the
                drawer reads as the same colored surface. */}
            <span
              aria-hidden
              className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[1px] border border-mint/45 bg-mint/10 text-mint-glow"
            >
              <Layers size={11} strokeWidth={2.4} />
            </span>
            {label}
            {usable > 0 && (
              <span className="grid h-4 min-w-[1rem] place-items-center rounded-[1px] bg-gold px-1 font-mono text-[12px] font-bold text-ink-950">
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
