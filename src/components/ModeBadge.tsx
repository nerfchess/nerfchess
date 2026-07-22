import type { DraftMode } from "@/engine/buff";

// The mode color identity in pill form: Nerf mode reads slightly red, Buff
// mode blue, everywhere a game or seek is listed. Legacy entries without a
// mode render nothing.
export function ModeBadge({ mode, compact }: { mode: DraftMode | undefined; compact?: boolean }) {
  if (mode !== "nerf" && mode !== "buff") return null;
  const identity =
    mode === "nerf"
      ? "border-mode-nerf/40 bg-mode-nerf/10 text-mode-nerfGlow"
      : "border-mode-buff/40 bg-mode-buff/10 text-mode-buffGlow";
  const size = compact ? "px-1.5 py-px text-[8px]" : "px-2 py-0.5 text-[9px]";
  return (
    <span className={`shrink-0 inline-flex items-center rounded-[1px] border smallcaps ${size} ${identity}`}>
      {mode === "nerf" ? "Nerf" : "Buff"}
    </span>
  );
}
