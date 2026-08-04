"use client";

import { type ReactNode, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * Compact mobile-only dropdown for the in-game actions (Draw / Resign, and
 * their confirm flows). On small screens the buttons were rendered inline
 * below the board and pushed the layout off-screen on shorter devices; this
 * tucks them behind a single slim trigger that pops the actions up on demand.
 * Desktop keeps the always-visible buttons in the side rail, so this is only
 * mounted inside `sm:hidden` wrappers.
 */
export function MobileActionsMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative w-full">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Game actions"
        onClick={() => setOpen((v) => !v)}
        // min-h-[44px], like every other primary control: this is the ONLY route to
        // Draw / Resign / Takeback on a phone, and it was a 36px target.
        className="flex min-h-[44px] w-full items-center justify-center gap-1.5 plate text-[14px] sm:text-[13px] font-display font-semibold tracking-wide text-parchment-200 transition-colors active:bg-white/[0.06]"
      >
        Game actions
        <span className="text-parchment-400" aria-hidden>
          {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </span>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          {/* !absolute / !z-40: .plate hard-codes position:relative and
              z-index:2 later in the cascade, so plain utilities lose. The
              `dropdown` rung gives the menu the opaque raised surface — a bare
              plate's translucent sheen made the actions hard to read over the
              board. */}
          <div className="!absolute bottom-full left-0 right-0 !z-40 mb-1 plate dropdown p-2">
            {children}
          </div>
        </>
      )}
    </div>
  );
}
