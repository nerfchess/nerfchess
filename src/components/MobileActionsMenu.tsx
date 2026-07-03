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
        className="flex h-9 w-full items-center justify-center gap-1.5 plate text-xs font-display font-semibold tracking-wide text-parchment-200 transition-colors active:bg-white/[0.06]"
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
          <div className="absolute bottom-full left-0 right-0 z-40 mb-1 plate p-2">
            {children}
          </div>
        </>
      )}
    </div>
  );
}
