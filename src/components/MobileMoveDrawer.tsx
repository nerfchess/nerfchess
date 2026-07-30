"use client";

import { sanLabels } from "@/engine/board";
import { Move } from "@/engine/types";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { MoveList } from "./MoveList";

/**
 * Collapsible bottom drawer for move history on mobile. Desktop keeps the
 * sidebar MoveList; this renders the same list (plus the game actions and
 * chat passed as `footer`) behind a slim always-visible bar showing the
 * latest move. `chatCount` drives an unread-messages badge so chat arriving
 * while the drawer is closed doesn't go unnoticed.
 */
export function MobileMoveDrawer({
  moves,
  currentPly,
  onPlyChange,
  minPly = 0,
  footer,
  chatCount = 0,
}: {
  moves: Move[];
  currentPly: number;
  onPlyChange: (ply: number) => void;
  /** Earliest reviewable ply (see MoveList.minPly). */
  minPly?: number;
  footer?: ReactNode;
  chatCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const [seenChat, setSeenChat] = useState(0);
  // Height of the on-screen keyboard when it overlaps the layout viewport
  // (iOS Safari doesn't shrink the layout viewport, so a bottom-fixed drawer
  // would otherwise sit underneath it while typing in chat).
  const [keyboardInset, setKeyboardInset] = useState(0);
  // While the drawer is open, chat is considered read up to the latest count;
  // tracked during render so the unread badge clears without an extra render.
  if (open && seenChat !== chatCount) setSeenChat(chatCount);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!open || !vv) return;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(Math.round(inset));
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setKeyboardInset(0);
    };
  }, [open]);
  const unreadChat = open ? 0 : Math.max(0, chatCount - seenChat);
  // Numbering comes from the shared labeller rather than the ply index: an
  // extra-move card lets one side move twice in a row, which shifts every later
  // number off if you just halve the ply count.
  const labels = useMemo(() => sanLabels(moves), [moves]);
  const lastLabel = labels.length ? labels[labels.length - 1] : "No moves yet";

  return (
    <div className="sm:hidden">
      {open && (
        <button
          type="button"
          aria-label="Close move history"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/50"
        />
      )}
      {/* The bar itself carries the home-indicator inset as PADDING, so the
          44px tap target sits fully above it. The safe-area padding further
          down is inside the collapsible body, which is `h-0 overflow-hidden`
          while closed and therefore contributed nothing — on a notched iPhone
          roughly three quarters of the closed bar sat inside the home-indicator
          zone, colliding with the swipe gesture. --drawer-bar-h publishes the
          real height (bar + inset) so the buff drawer can stack on top of it
          and the match column can reserve the right amount of room. */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 plate border-t border-[color:var(--edge)] pb-[env(safe-area-inset-bottom)]"
        style={keyboardInset > 0 ? { bottom: keyboardInset } : undefined}
      >
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 w-full items-center justify-between px-4 transition-colors duration-150 hover:bg-white/[0.04] active:bg-white/[0.07]"
        >
          <span className="flex items-center gap-2 smallcaps text-[12px] text-parchment-400">
            Moves &amp; chat
            {unreadChat > 0 && (
              <span className="grid h-4 min-w-[1rem] place-items-center rounded-[1px] bg-gold px-1 font-mono text-[12px] font-bold text-ink-950">
                {unreadChat}
              </span>
            )}
          </span>
          <span className="flex items-center gap-2 font-mono text-xs tabular-nums text-parchment-100">
            {lastLabel}
            <span className="text-parchment-400" aria-hidden>
              {open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </span>
          </span>
        </button>
        <div
          className={
            "overflow-hidden transition-[height] duration-200 ease-out " +
            (open ? (keyboardInset > 0 ? "h-[30dvh]" : "h-[46dvh]") : "h-0")
          }
        >
          {/* The wrapper above now owns the safe-area inset, so this only needs
              ordinary breathing room. */}
          <div className="h-full px-2 pb-2">
            <MoveList
              moves={moves}
              currentPly={currentPly}
              onPlyChange={onPlyChange}
              minPly={minPly}
              compact
              showHeader={false}
              footer={footer}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
