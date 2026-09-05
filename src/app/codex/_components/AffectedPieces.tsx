import type { Buff } from "@/engine/buff";
import type { Nerf } from "@/engine/nerf";
import { affectedLine } from "./affected";

// Server-rendered "affected pieces" strip for the card detail pages. Renders
// only when the line is derivable from the card's own data, so it never pads a
// page with an empty label. Passed to the detail's InfoPageLayout `extra` slot
// so it sits inside the same reading column as the detail body (never below the
// site footer), matching the InfoSection plates above it.
export function AffectedPieces({ kind, card }: { kind: "buff" | "nerf"; card: Buff | Nerf }) {
  const line = affectedLine(kind, card);
  if (!line) return null;
  return (
    <div className="plate flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
      <span className="text-[12px] text-parchment-400 sm:w-32 sm:shrink-0">
        Affected pieces
      </span>
      <p className="text-[14px] text-parchment-100">{line}</p>
    </div>
  );
}
