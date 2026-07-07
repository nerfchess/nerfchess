"use client";

import { Nerf } from "@/engine/nerf";
import { motion } from "framer-motion";
import { GlossaryText } from "@/components/GlossaryText";
import { NERF_TURN_COST } from "@/engine/buff";
import { TurnCostBadge } from "@/components/TurnCostBadge";
import { icons as LucideIcons, type LucideIcon, Unlink } from "lucide-react";

/** Resolve a nerf's per-card lucide icon NAME to its component. Accepts both
 * the PascalCase export key ("Skull") and lucide's kebab-case id ("shield-alert",
 * "cloud-fog"), which is the form the nerf library uses. Unknown or misspelled
 * names return undefined so the caller falls back to a glyph, never crashing. */
function resolveLucideIcon(name: string | undefined): LucideIcon | undefined {
  if (!name) return undefined;
  const direct = LucideIcons[name as keyof typeof LucideIcons];
  if (direct) return direct as LucideIcon;
  const pascal = name.replace(/(^|[-_ ])(\w)/g, (_m: string, _s: string, c: string) =>
    c.toUpperCase(),
  );
  return LucideIcons[pascal as keyof typeof LucideIcons] as LucideIcon | undefined;
}

interface Props {
  nerf: Nerf;
  revealed?: boolean;
  compact?: boolean;
  ownerLabel?: string;
  progress?: { value: number; max: number; label: string } | null;
}

import { TIER_LABEL, TIER_ROMAN } from "@/lib/tiers";

export function NerfCard({ nerf, revealed = true, compact = false, ownerLabel, progress }: Props) {
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

  // Per-card icon (a lucide-react name on the nerf) draws a faint watermark so
  // each rule reads distinct. Unknown / misspelled names fall back to the
  // shared nerf glyph, so a bad name can never crash the card.
  const FaceIcon: LucideIcon = resolveLucideIcon(nerf.icon) ?? Unlink;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative plate draft-face p-5 overflow-hidden tier-bg-${nerf.tier} border`}
    >
      <FaceIcon
        aria-hidden
        className={`pointer-events-none absolute -bottom-3 -right-2 tier-${nerf.tier}`}
        size={92}
        strokeWidth={1.2}
        style={{ opacity: 0.08 }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="smallcaps text-[11px] text-parchment-400">
              {ownerLabel ?? "Your nerf"}
            </span>
            <TurnCostBadge cost={NERF_TURN_COST} />
          </div>
          <div className={`font-display text-2xl leading-tight tier-${nerf.tier}`}>
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
      <div className="rule-ornament my-3 text-[10px]">
        <span className="font-display">{TIER_LABEL[nerf.tier]}</span>
      </div>
      <p className="text-[15px] leading-relaxed text-parchment/95">
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
        <p className="mt-3 text-[13px] text-parchment-300/85 font-display border-l-2 border-white/15 pl-3">
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
