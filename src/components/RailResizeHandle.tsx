"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  RAIL_WIDTH_DEFAULT,
  RAIL_WIDTH_KEY,
  RAIL_WIDTH_MAX,
  RAIL_WIDTH_MIN,
  clampRailWidth,
} from "@/lib/session/railWidth";

// The desktop command rail (left column of the match screens) can be dragged
// wider or narrower by its right edge. The chosen width is shared between the
// online and vs-bot screens and persisted per browser (like dc:rail-collapsed).

function stampedRailWidth(): number {
  const v = parseFloat(document.documentElement.style.getPropertyValue("--match-rail-w"));
  return Number.isFinite(v) && v > 0 ? clampRailWidth(v) : RAIL_WIDTH_DEFAULT;
}

/** The rail's current width plus the style that carries it to the match grid.
 * --match-rail-w drives both the grid's rail column and the board-width math,
 * so the board gives back exactly what the rail takes.
 *
 * The width lives on <html>, not on the grid: the pre-paint stamp in the root
 * layout (src/lib/session/prePaint.ts) writes the saved width there before
 * the first paint, and every CSS reader falls back to 320px when it is
 * absent. Reading storage after mount and then setting an inline width on the
 * grid made the board and rail jump on every load for anyone who had dragged
 * the rail (F008). A drag writes the same property, so there is one source.
 * railWidthStyle stays for the callers that spread it, and is empty. */
export function useRailWidth() {
  const [railWidth, setRailWidth] = useState(RAIL_WIDTH_DEFAULT);
  useEffect(() => {
    // Only the separator's aria-valuenow reads this state; the layout already
    // has the stamped width, so syncing it after mount moves nothing.
    queueMicrotask(() => setRailWidth(stampedRailWidth()));
  }, []);
  const resizeRail = (w: number, commit: boolean) => {
    const next = clampRailWidth(w);
    setRailWidth(next);
    document.documentElement.style.setProperty("--match-rail-w", `${next}px`);
    // Live drag frames skip storage; only the released width is written.
    if (commit) {
      try {
        window.localStorage.setItem(RAIL_WIDTH_KEY, String(next));
      } catch {}
    }
  };
  const railWidthStyle = EMPTY_STYLE;
  return { railWidth, resizeRail, railWidthStyle };
}

const EMPTY_STYLE: CSSProperties = {};

/** The draggable gutter between the command rail and the board: its own thin
 * grid column, with an oversized invisible hit area so it's easy to grab. Also
 * a keyboard separator: arrows nudge, Home/End jump, Enter or double-click
 * resets to the default width. */
export function RailResizeHandle({
  railWidth,
  resizeRail,
}: {
  railWidth: number;
  resizeRail: (w: number, commit: boolean) => void;
}) {
  const dragRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null);
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize side panel"
      aria-valuemin={RAIL_WIDTH_MIN}
      aria-valuemax={RAIL_WIDTH_MAX}
      aria-valuenow={railWidth}
      tabIndex={0}
      title="Drag to resize the side panel · double-click to reset"
      className="group relative hidden w-1 cursor-col-resize touch-none outline-none lg:block"
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startWidth: railWidth };
      }}
      onPointerMove={(e) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== e.pointerId) return;
        resizeRail(drag.startWidth + (e.clientX - drag.startX), false);
      }}
      onPointerUp={(e) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== e.pointerId) return;
        dragRef.current = null;
        resizeRail(drag.startWidth + (e.clientX - drag.startX), true);
      }}
      onPointerCancel={() => {
        dragRef.current = null;
        resizeRail(railWidth, true);
      }}
      onDoubleClick={() => resizeRail(RAIL_WIDTH_DEFAULT, true)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") resizeRail(railWidth - 16, true);
        else if (e.key === "ArrowRight") resizeRail(railWidth + 16, true);
        else if (e.key === "Home") resizeRail(RAIL_WIDTH_MIN, true);
        else if (e.key === "End") resizeRail(RAIL_WIDTH_MAX, true);
        else if (e.key === "Enter") resizeRail(RAIL_WIDTH_DEFAULT, true);
        else return;
        e.preventDefault();
      }}
    >
      <span aria-hidden className="absolute inset-y-0 -left-1.5 -right-1.5" />
      <span
        aria-hidden
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[color:var(--bg-raised)] transition-colors group-hover:bg-gold/60 group-focus-visible:bg-gold/60"
      />
    </div>
  );
}
