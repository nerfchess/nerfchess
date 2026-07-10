"use client";

import { Nerf } from "@/engine/nerf";
import { motion } from "framer-motion";
import { GlossaryText } from "@/components/GlossaryText";
import { NERF_TURN_COST } from "@/engine/buff";
import { TurnCostBadge } from "@/components/TurnCostBadge";
import { type LucideIcon, Unlink } from "lucide-react";
import { nerfFaceIcon } from "@/lib/cardIcon";

interface Props {
  nerf: Nerf;
  revealed?: boolean;
  compact?: boolean;
  /** Codex grid: match BuffCard's proportions (p-4, text-lg name, equal-height
   * flex column) so nerf and buff cards read the same size side by side. The
   * in-game full card keeps its larger type. */
  dense?: boolean;
  ownerLabel?: string;
  progress?: { value: number; max: number; label: string } | null;
}

import { TIER_LABEL, TIER_ROMAN } from "@/lib/tiers";

export function NerfCard({ nerf, revealed = true, compact = false, dense = false, ownerLabel, progress }: Props) {
  if (!revealed) {
    return (
      <div className="relative plate p-5 overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full border border-gold/40 bg-gold/10 flex items-center justify-center font-display text-2xl text-gold/80 font-bold">?</div>
          <div>
            <div className="smallcaps text-[11px] text-parchment-400">{ownerLabel ?? "Opponent"}</div>
            <div className="font-display text-xl text-parchment/80">Hidden rule</div>
          </div>
        </div>
        <p className="mt-3 text-sm text-parchment-300/80 leading-relaxed">
          You&apos;ll see their rule when the game ends.
        </p>
      </div>
    );
  }

  // Per-card face icon from the shared globally-unique assignment (see
  // src/lib/cardIcon.ts): every nerf in the library wears a face no other
  // card in the game uses. Unlink survives only as the truly-last-resort
  // fallback for an id outside the shipped library, so nothing can crash.
  const FaceIcon: LucideIcon = nerfFaceIcon(nerf.id, nerf.icon) ?? Unlink;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group/card relative plate draft-face overflow-hidden tier-bg-${nerf.tier} border ${
        dense ? "flex h-full flex-col p-4" : "p-5"
      }`}
    >
      {/* Watermark: faint by default; hovering the card brightens it in the
          card's tier (severity) color and nudges the scale. Transitions only
          (no keyframes), so prefers-reduced-motion users just see the state
          change; the scale nudge is additionally gated behind motion-safe. */}
      <FaceIcon
        aria-hidden
        className={`pointer-events-none absolute -bottom-3 -right-2 tier-${nerf.tier} opacity-[0.08] transition-all duration-200 group-hover/card:opacity-[0.18] motion-safe:group-hover/card:scale-105`}
        size={dense ? 84 : 92}
        strokeWidth={1.2}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="smallcaps text-[11px] text-parchment-400">
              {ownerLabel ?? "Your nerf"}
            </span>
            <TurnCostBadge cost={NERF_TURN_COST} />
          </div>
          <div className={`font-display leading-tight tier-${nerf.tier} ${dense ? "text-lg" : "text-2xl"}`}>
            {nerf.name}
          </div>
        </div>
        <span
          className={`font-display font-bold text-sm px-2.5 py-0.5 rounded-full border tier-bg-${nerf.tier} tier-${nerf.tier}`}
          title={`Tier ${nerf.tier}: ${TIER_LABEL[nerf.tier]}`}
        >
          {TIER_ROMAN[nerf.tier]}
        </span>
      </div>
      <div className={`rule-ornament text-[10px] ${dense ? "my-2.5" : "my-3"}`}>
        <span className="font-display">{TIER_LABEL[nerf.tier]}</span>
      </div>
      <p className={dense ? "flex-1 text-[13px] leading-snug text-parchment/90" : "text-[15px] leading-relaxed text-parchment/95"}>
        <GlossaryText text={nerf.description} />
      </p>
      {progress && progress.max > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="smallcaps text-[10px] text-parchment-400">Progress</span>
            <span className="font-mono text-[10px] text-parchment-300">{progress.label}</span>
          </div>
          <div className="h-1.5 bg-white/5 overflow-hidden">
            <div
              className={`h-full tier-bg-${nerf.tier}`}
              style={{ width: `${Math.min(100, (progress.value / progress.max) * 100)}%` }}
            />
          </div>
        </div>
      )}
      {!compact && nerf.flavor && (
        <p className={`font-display border-l-2 border-white/15 pl-3 text-parchment-300/85 ${dense ? "mt-2 text-[11px] italic" : "mt-3 text-[13px]"}`}>
          &ldquo;{nerf.flavor}&rdquo;
        </p>
      )}
      {!nerf.implemented && (
        <div className="mt-3 smallcaps text-[10px] text-gold/80">
          Engine implementation pending
        </div>
      )}
    </motion.div>
  );
}
