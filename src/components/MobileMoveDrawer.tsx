"use client";

import { moveToSAN } from "@/engine/board";
import { Move } from "@/engine/types";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
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
  footer,
  chatCount = 0,
}: {
  moves: Move[];
  currentPly: number;
  onPlyChange: (ply: number) => void;
  footer?: ReactNode;
  chatCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const [seenChat, setSeenChat] = useState(0);
  // Height of the on-screen keyboard when it overlaps the layout viewport
  // (iOS Safari doesn't shrink the layout viewport, so a bottom-fixed drawer
  // would otherwise sit underneath it while typing in chat).
  const [keyboardInset, setKeyboardInset] = useState(0);
  useEffect(() => {
    if (open) setSeenChat(chatCount);
  }, [open, chatCount]);

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
  const lastMove = moves[moves.length - 1] ?? null;
  const lastLabel = lastMove
    ? `${Math.ceil(moves.length / 2)}${moves.length % 2 === 1 ? "." : "…"} ${moveToSAN(lastMove)}`
    : "No moves yet";

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
      <div
        className="fixed inset-x-0 bottom-0 z-40 plate border-t border-white/10"
        style={keyboardInset > 0 ? { bottom: keyboardInset } : undefined}
      >
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 w-full items-center justify-between px-4 transition-colors duration-150 hover:bg-white/[0.04] active:bg-white/[0.07]"
        >
          <span className="flex items-center gap-2 smallcaps text-[10px] text-parchment-400">
            Moves &amp; chat
            {unreadChat > 0 && (
              <span className="grid h-4 min-w-[1rem] place-items-center rounded-full bg-gold px-1 font-mono text-[9px] font-bold text-ink-950">
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
          <div className="h-full px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
            <MoveList
              moves={moves}
              currentPly={currentPly}
              onPlyChange={onPlyChange}
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
