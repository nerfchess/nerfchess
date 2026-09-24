// The Quick pairing time tiles, shared by QuickMatch and the lobby skeleton so
// a hard load paints the real nine tiles at once instead of nine grey blocks
// that repaint into tiles on hydration.

import { getCategory, type RatingCategoryId } from "@/lib/ratingCategories";
import { Button } from "@/components/ui/Button";

// Wire names must match QUEUE_POOLS in worker.ts. Nine pools lay out as a clean
// 3x3 grid (no orphaned final row).
export const QUEUE_POOL_OPTIONS: { pool: string; label: string; speed: RatingCategoryId }[] = [
  { pool: "1+0", label: "1+0", speed: "bullet" },
  { pool: "2+1", label: "2+1", speed: "bullet" },
  { pool: "3+0", label: "3+0", speed: "blitz" },
  { pool: "3+2", label: "3+2", speed: "blitz" },
  { pool: "5+0", label: "5+0", speed: "blitz" },
  { pool: "5+3", label: "5+3", speed: "blitz" },
  { pool: "10+0", label: "10+0", speed: "rapid" },
  { pool: "10+5", label: "10+5", speed: "rapid" },
  { pool: "15+10", label: "15+10", speed: "rapid" },
];

// One time-control tile: the big time in the middle, the speed name beneath.
// The shared <Button> primitive carries the material, so a selected tile is the
// accent fill and an unselected one the default box. Accessible name resolves
// to "3+2 blitz" (label + category), which the mode-defaults e2e spec relies on.
export function TimeCell({
  option,
  selected,
  placeholder,
  onClick,
}: {
  option: { pool: string; label: string; speed: RatingCategoryId };
  selected: boolean;
  /** The lobby skeleton draws the real tiles at full strength (a disabled
   *  tile would fade in on hydration) but out of the tab order; its grid is
   *  aria-hidden and ignores the pointer. */
  placeholder?: boolean;
  onClick?: () => void;
}) {
  const category = getCategory(option.speed);
  return (
    <Button
      tone="default"
      onClick={onClick}
      tabIndex={placeholder ? -1 : undefined}
      aria-pressed={selected}
      // Selected reads as a lit tile with a blue edge, not a second primary
      // button: the one blue fill on this panel is the Find-a-game button.
      className={
        "!min-h-[56px] flex-col !gap-0.5 !px-1 !py-2" +
        (selected ? " !border-2 !border-solid !border-[color:var(--accent)] text-[color:var(--accent)]" : "")
      }
    >
      <span className="font-mono text-lg leading-none tabular-nums">{option.label}</span>
      <span className={"text-[13px] " + (selected ? "opacity-90" : "text-parchment-400")}>
        {category.label}
      </span>
    </Button>
  );
}
