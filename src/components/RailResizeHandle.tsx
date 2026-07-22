"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// The desktop command rail (left column of the match screens) can be dragged
// wider or narrower by its right edge. The chosen width is shared between the
// online and vs-bot screens and persisted per browser (like dc:rail-collapsed).
export const RAIL_WIDTH_MIN = 240;
export const RAIL_WIDTH_MAX = 440;
export const RAIL_WIDTH_DEFAULT = 320;
const RAIL_WIDTH_KEY = "dc:rail-width";

const clampRailWidth = (w: number) =>
  Math.min(RAIL_WIDTH_MAX, Math.max(RAIL_WIDTH_MIN, Math.round(w)));

/** The rail's current width plus the style that carries it to the match grid:
 * --match-rail-w drives both the grid's rail column and the board-width math,
 * so the board gives back exactly what the rail takes. Storage is read after
 * mount so SSR markup and first paint stay deterministic. */
export function useRailWidth() {
  const [railWidth, setRailWidth] = useState(RAIL_WIDTH_DEFAULT);
  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(RAIL_WIDTH_KEY));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Number.isFinite(saved) && saved > 0) setRailWidth(clampRailWidth(saved));
    } catch {}
  }, []);
  const resizeRail = (w: number, commit: boolean) => {
    const next = clampRailWidth(w);
    setRailWidth(next);
    // Live drag frames skip storage; only the released width is written.
    if (commit) {
      try {
        window.localStorage.setItem(RAIL_WIDTH_KEY, String(next));
      } catch {}
    }
  };
  const railWidthStyle = { "--match-rail-w": `${railWidth}px` } as CSSProperties;
  return { railWidth, resizeRail, railWidthStyle };
}

/** The draggable gutter between the command rail and the board: its own grid
 * column, with the visible grip pinned to its LEFT edge so it reads as the
 * sidebar's own resize edge (hugging the rail, not floating out by the board),
 * and an oversized invisible hit area so it's easy to grab. Also a keyboard
 * separator — arrows nudge, Home/End jump, Enter or double-click resets to the
 * default width. */
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
      className="group relative hidden w-full cursor-col-resize touch-none outline-none lg:block"
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
      <span aria-hidden className="absolute inset-y-0 -left-2 right-0" />
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-0.5 rounded-full bg-gold/25 transition-colors group-hover:bg-gold/70 group-focus-visible:bg-gold/70"
      />
    </div>
  );
}
