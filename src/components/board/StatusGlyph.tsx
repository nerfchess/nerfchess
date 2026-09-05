"use client";

// Single-weight glyphs for the eleven board status classes (lib/boardStatus).
// Strokes only, 24-unit grid, drawn to stay legible at 11px on a board square
// and at 16px in the key. Colour comes from `currentColor`.

import type { SVGProps } from "react";
import { BOARD_STATUS, type BoardStatus } from "@/lib/boardStatus";

const BASE: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export function StatusGlyph({ status, size = 12, className }: { status: BoardStatus; size?: number | string; className?: string }) {
  const p = { ...BASE, width: size, height: size, className };
  switch (status) {
    case "frozen":
      return (
        <svg {...p}>
          <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
          <path d="M12 3l-2.5 2.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5" />
        </svg>
      );
    case "restricted":
      return (
        <svg {...p}>
          <rect x="3" y="9" width="8" height="6" rx="3" />
          <rect x="13" y="9" width="8" height="6" rx="3" />
          <path d="M11 12h2" />
        </svg>
      );
    case "muzzled":
      return (
        <svg {...p}>
          <path d="M5 19l14-14M5 5l3 3M19 19l-3-3" />
          <path d="M3 21L21 3" opacity="0" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case "blind":
      return (
        <svg {...p}>
          <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
          <path d="M4 4l16 16" />
        </svg>
      );
    case "slowed":
      return (
        <svg {...p}>
          <path d="M7 3h10M7 21h10M8 3c0 5 4 6 4 9s-4 4-4 9M16 3c0 5-4 6-4 9s4 4 4 9" />
        </svg>
      );
    case "shielded":
      return (
        <svg {...p}>
          <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" />
        </svg>
      );
    case "empowered":
      return (
        <svg {...p}>
          <path d="M12 3l2.2 5.4 5.8.5-4.4 3.8 1.3 5.7L12 15.4l-4.9 3 1.3-5.7L4 8.9l5.8-.5L12 3Z" />
        </svg>
      );
    case "warded":
      return (
        <svg {...p}>
          <path d="M4 20V9M12 20V9M20 20V9M3 13h18M3 17h18" />
        </svg>
      );
    case "barred":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M5.6 5.6l12.8 12.8" />
        </svg>
      );
    case "doomed":
      return (
        <svg {...p}>
          <path d="M12 3a8 8 0 0 1 8 8v3l-2 1v3a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-3l-2-1v-3a8 8 0 0 1 8-8Z" />
          <circle cx="9" cy="11" r="1.2" fill="currentColor" />
          <circle cx="15" cy="11" r="1.2" fill="currentColor" />
        </svg>
      );
    case "trap":
      return (
        <svg {...p}>
          <path d="M12 3l10 18H2L12 3Z" />
          <path d="M12 10v5M12 18v.5" />
        </svg>
      );
  }
}

/** The corner chip: class colour plate, dark glyph, optional turn count.
 *  Sized as a fraction of the square so it scales with the board. */
export function StatusChip({
  status,
  turns,
  className,
}: {
  status: BoardStatus;
  turns?: number | null;
  className?: string;
}) {
  const def = BOARD_STATUS[status];
  return (
    <span
      aria-hidden
      title={def.label}
      className={"sq-status-chip pointer-events-none z-30 " + (className ?? "")}
      style={{ ["--st" as string]: def.color }}
    >
      <StatusGlyph status={status} size="62%" />
      {turns != null && <b className="sq-status-chip__n">{turns}</b>}
    </span>
  );
}

/** The inset frame that marks a whole square as carrying a status. */
export function StatusFrame({ status, className }: { status: BoardStatus; className?: string }) {
  return (
    <span
      aria-hidden
      className={"sq-status-frame pointer-events-none " + (className ?? "")}
      style={{ ["--st" as string]: BOARD_STATUS[status].color }}
    />
  );
}
