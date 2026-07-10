"use client";

import { Eye, EyeOff } from "lucide-react";
import { setFxHidden, useFxHidden } from "@/lib/fxToggle";

/** The small eye button beside the board: hides/unhides the decorative
 * effect layers (animations, hover effect cards, motif badges). Functional
 * board reads always stay visible. */
export function FxToggleButton({ className = "" }: { className?: string }) {
  const hidden = useFxHidden();
  return (
    <button
      type="button"
      onClick={() => setFxHidden(!hidden)}
      aria-pressed={hidden}
      title={hidden ? "Show effects and animations" : "Hide effects and animations"}
      className={
        "flex items-center gap-1.5 border px-2.5 py-1.5 smallcaps text-[9px] transition-colors " +
        (hidden
          ? "border-white/20 bg-white/[0.06] text-parchment-200 hover:border-white/35"
          : "border-white/10 bg-white/[0.02] text-parchment-400 hover:border-white/25 hover:text-parchment-200") +
        " " +
        className
      }
    >
      {hidden ? <EyeOff size={12} strokeWidth={2.2} /> : <Eye size={12} strokeWidth={2.2} />}
      {hidden ? "Effects off" : "Effects on"}
    </button>
  );
}
