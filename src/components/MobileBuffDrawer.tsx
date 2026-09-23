"use client";

import { ChevronDown, ChevronUp, Layers } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { TABLET_STACK_HIDE } from "./matchLayout";

/**
 * Collapsible bottom drawer for the draft-mode buff dock on tablet widths
 * (sm to lg), which design-system.md section 9 keeps for that range. Phones
 * render the dock inline under the board (MobileMatchStack) and desktop has
 * the side rail. `usable` drives a badge so a buff becoming activatable
 * doesn't go unnoticed while closed.
 *
 * Portrait tablets now render the same inline dock as a phone, so the drawer
 * stands down there rather than showing the hand twice; landscape tablets in
 * the sm..lg range keep it.
 */
export function MobileBuffDrawer({
  held,
  usable,
  autoCloseWhen,
  label = "Buffs",
  preview,
  children,
}: {
  /** Cards you currently hold (spent ones included, they stay on record). */
  held: number;
  /** Activated buffs you could use right now. */
  usable: number;
  /** Collapse the drawer while true (a buff is targeting on the board). */
  autoCloseWhen?: boolean;
  /** Drawer title ("Buffs", or "Boons" in nerf mode). */
  label?: string;
  /** A row of the held cards' faces, shown in the closed bar so the hand is
   *  readable without opening the drawer. */
  preview?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Closed, the hand is parked below the screen edge but still mounted (so
  // opening is instant); inert takes it out of the tab order and the
  // accessibility tree so a keyboard user does not tab through cards they
  // cannot see (F142). Set on the element because React 18 has no inert prop.
  useEffect(() => {
    panelRef.current?.toggleAttribute("inert", !open);
  }, [open]);

  // Escape closes, and focus goes back to the bar that opened it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Collapse the drawer when the parent signals an auto-close (e.g. a buff was
  // used); handled on the transition during render rather than in an effect.
  const [prevAutoClose, setPrevAutoClose] = useState(autoCloseWhen);
  if (prevAutoClose !== autoCloseWhen) {
    setPrevAutoClose(autoCloseWhen);
    if (autoCloseWhen) setOpen(false);
  }

  return (
    <div className={"hidden sm:block lg:hidden " + TABLET_STACK_HIDE}>
      {open && (
        // A pointer target only: keyboard users close with Escape or the bar,
        // so the scrim is not a Tab stop of its own.
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/50"
        />
      )}
      {/* The drawer is drawn only from sm to lg (landscape tablets), where it
          is the bottom-most bar, so it sits on the screen edge and takes the
          home-indicator inset itself. It opens by sliding up (transform on the
          motion tokens), not by growing its height: the bar and the 46dvh
          panel are one block that rests translated down by the panel's height
          when closed (F191). */}
      <div
        className={
          "fixed inset-x-0 bottom-0 z-40 plate overflow-hidden border-t border-[color:var(--edge)] pb-[env(safe-area-inset-bottom)] " +
          "transition-transform duration-[var(--dur-2)] ease-[var(--ease-out)] motion-reduce:transition-none " +
          (open ? "translate-y-0" : "translate-y-[46dvh]")
        }
        // Drawer geometry: rounded top corners, square bottom against the
        // screen edge. Inline so it reliably overrides the plate's 10px.
        style={{ borderRadius: "1px 1px 0 0" }}
      >
        {/* Grab handle: a small pill centered on the top edge, the universal
            "this pulls up" affordance. */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1.5 h-1 w-9 -translate-x-1/2 rounded-full bg-white/15"
        />
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          // 44px in pixels, not `h-11`: this interface roots at 14px, so
          // 2.75rem is 38.5px and the bar was under the 44px hit floor.
          className="flex h-[44px] w-full items-center justify-between px-4 transition-colors duration-150 hover:bg-white/[0.04] active:bg-white/[0.07]"
        >
          <span className="flex items-center gap-2 text-[12px] text-parchment-400">
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
          {preview && !open && <span className="flex min-w-0 flex-1 items-center justify-center gap-1 px-2">{preview}</span>}
          <span className="flex items-center gap-2 font-mono text-xs tabular-nums text-parchment-100">
            {held === 0 ? "None yet" : `${held} held`}
            <span className="text-parchment-400" aria-hidden>
              {open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </span>
          </span>
        </button>
        <div ref={panelRef} id={panelId} aria-hidden={!open} className="h-[46dvh] overflow-hidden">
          {/* The wrapper owns the safe-area inset; here just breathing room. */}
          <div className="h-full overflow-y-auto px-2 pb-2">{children}</div>
        </div>
      </div>
    </div>
  );
}
