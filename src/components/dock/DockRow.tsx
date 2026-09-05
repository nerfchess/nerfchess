"use client";

// One card row, shared by both hands. Collapsed to a single line (chevron,
// name, state chips, tier numeral); tap to open the detail body with the full
// rule text and — for your own activatable cards — the one Use button. The old
// dock rendered your rows and the opponent's from two near-identical inline
// closures; this is that pair merged, with `owner` driving the differences
// (Use affordances for yours, a notch larger name for theirs).

import { BuffInstance, turnCost } from "@/engine/buff";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { TIER_ROMAN } from "@/lib/tiers";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TurnCostBadge } from "../TurnCostBadge";
import { PassiveChip, StatusChip, UsedBadge, pliesTitle } from "./bits";

export function DockRow({
  inst,
  index,
  count,
  owner,
  open,
  onToggle,
  usable,
  onStartUse,
  finePointer,
  reduceMotion,
  flash,
}: {
  inst: BuffInstance;
  index: number;
  count: number;
  owner: "mine" | "opp";
  open: boolean;
  onToggle: () => void;
  /** Mine only: this activated card can fire right now. */
  usable?: boolean;
  onStartUse?: (index: number) => void;
  finePointer?: boolean;
  reduceMotion?: boolean;
  /** The newest card in the hand wears the pocket flash once as it lands. */
  flash?: boolean;
}) {
  const def = BUFF_BY_ID[inst.id];
  if (!def) return null;
  // usedActivation retires an activated card the same as spent for the Use
  // button and the "Used" stamp, but a spendOnUse:false card is NOT spent, so
  // it stays in the list running its rider. Keep its live status line visible
  // (only spent/nullified cards truly go silent).
  const dead = !!(inst.spent || inst.nullified || inst.usedActivation);
  const activatable = owner === "mine" && def.kind === "activated" && !dead;
  const canUse = !!usable && activatable;
  const status = inst.spent || inst.nullified ? null : def.status?.(inst) ?? null;

  return (
    <motion.div
      // Gated: ungated, every dock row slid in from x:-20 under OS reduced
      // motion (and under Settings > Animations: Off).
      initial={reduceMotion ? false : { opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25 }}
      className={
        "dock-card relative w-full overflow-hidden rounded-[1px] border transition-transform duration-100 " +
        (flash ? "dock-pocket-flash " : "") +
        (dead
          ? "border-[color:var(--edge)] bg-white/[0.012] "
          : canUse
            ? "border-verdigris-glow/40 bg-verdigris/[0.06] "
            : "border-[color:var(--edge)] bg-white/[0.02] ")
      }
    >
      {/* Usable accent: a solid left edge marks the rows you can act on right
          now; spent rows a muted grey edge; live-but-not-usable rows wear
          their tier color on the same anchor. */}
      {canUse && <span aria-hidden className="absolute inset-y-1 left-0 w-[3px] bg-verdigris-glow/80" />}
      {dead && <span aria-hidden className="absolute inset-y-1 left-0 w-[3px] bg-white/15" />}
      {!canUse && !dead && <span aria-hidden className={`dock-tier-edge tier-bg-${inst.tier}`} />}
      {/* Idle foil shimmer on high-tier holdings (tier 6+), the dock's quiet
          echo of the draft cards' holo finish. */}
      {!dead && inst.tier >= 6 && <span aria-hidden className="dock-shimmer" />}
      {/* Collapsed header: one line, click to toggle. The Use button and
          description live in the detail body, so a button never nests inside
          this toggle button. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        title={open ? undefined : def.description}
        className={"flex w-full items-center gap-1.5 px-2 py-1.5 text-left " + (canUse ? "pl-3" : "")}
      >
        <ChevronRight
          aria-hidden
          size={12}
          strokeWidth={2.4}
          className={"shrink-0 text-parchment-400 transition-transform duration-150 " + (open ? "rotate-90" : "")}
        />
        <span
          className={
            "min-w-[3.5rem] flex-1 truncate font-display font-semibold leading-tight " +
            // The opponent's held cards read a notch LARGER than your own:
            // what threatens you is the thing worth seeing clearly at a glance.
            (owner === "opp" ? "text-[13px] " : "text-[12px] ") +
            (dead
              ? "text-parchment-200 line-through decoration-1 decoration-parchment-400/70"
              : `tier-${inst.tier}`)
          }
        >
          {def.name}
        </span>
        {count > 1 && (
          <span
            title={`${count} copies, same state`}
            className="shrink-0 rounded-[1px] border border-[color:var(--edge-strong)] bg-white/[0.08] px-1 py-px font-mono text-[11px] tabular-nums text-parchment-200"
          >
            ×{count}
          </span>
        )}
        {def.kind === "passive" && !dead && <PassiveChip />}
        {/* Collapsed rows carry the live countdown/status right on the
            one-liner; the detail body repeats it in full. */}
        {!open && status && <StatusChip status={status} />}
        <TurnCostBadge cost={turnCost(def)} short />
        {canUse && (
          <span className="shrink-0 rounded-[1px] border border-verdigris-glow/50 bg-verdigris/15 px-1 py-px text-[12px] font-semibold text-verdigris-glow">
            Usable
          </span>
        )}
        {dead && <UsedBadge nullified={!!inst.nullified} />}
        <span
          className={`shrink-0 rounded-[1px] border px-1.5 py-px font-display text-[12px] font-bold tier-bg-${inst.tier} tier-${inst.tier}`}
        >
          {TIER_ROMAN[inst.tier]}
        </span>
      </button>
      {open && (
        <div className="px-2 pb-1.5">
          {count > 1 && (
            <div className="mb-1 text-[11px] text-parchment-400">
              {count} identical copies{owner === "mine" ? " · Use plays one at a time" : ""}
            </div>
          )}
          {status && (
            <div title={pliesTitle(status)} className="mb-1 truncate text-[12px] text-gold/80">
              {status}
            </div>
          )}
          {/* Full description, always readable without hovering. */}
          <p className="text-[12px] leading-snug text-parchment-300">{def.description}</p>
          {activatable &&
            (canUse ? (
              <Button
                tone="leaf"
                size="xs"
                // Second input path (additive): drag the usable card onto a
                // highlighted board square to pick it. Native HTML5 drag is
                // separate from the board's pointer-drag, so the click flow is
                // untouched. Drag-to-board is a desktop affordance: on touch
                // browsers a draggable element swallows taps (held as a
                // potential drag), which blocked this button on mobile.
                draggable={finePointer}
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-nerf-card", String(index));
                  e.dataTransfer.effectAllowed = "move";
                  onStartUse?.(index);
                }}
                onClick={() => onStartUse?.(index)}
                // Thumb-sized below sm (44px is the touch floor); compact on
                // desktop where the pointer is precise. btn-leaf, not the
                // frosted btn-glass: this Use control rests in the dock for the
                // whole game, and resting glass is reserved for the draft
                // lock-in peak only (design system §5).
                className="mt-1.5 touch-manipulation px-2.5 py-1 text-[13px] font-semibold tracking-wide max-sm:min-h-[44px] max-sm:w-full max-sm:px-4 max-sm:text-[14px] sm:cursor-grab sm:active:cursor-grabbing"
              >
                Use
              </Button>
            ) : (
              <button
                type="button"
                disabled
                title="Your turn only"
                className="mt-1.5 cursor-not-allowed rounded-[1px] border border-[color:var(--edge)] bg-white/[0.03] px-2.5 py-1 font-display text-[13px] tracking-wide text-parchment-400 max-sm:min-h-[44px] max-sm:w-full max-sm:px-4 max-sm:text-[14px]"
              >
                Use
              </button>
            ))}
        </div>
      )}
    </motion.div>
  );
}
