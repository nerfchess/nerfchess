"use client";

import { Buff } from "@/engine/buff";
import { Tier } from "@/engine/nerf";
import { TIER_LABEL, TIER_ROMAN } from "@/lib/tiers";
import { GlossaryText } from "@/components/GlossaryText";

const CATEGORY_LABEL: Record<Buff["category"], string> = {
  movement: "Movement",
  pieces: "Pieces",
  tempo: "Tempo",
  protection: "Protection",
  attack: "Attack",
  info: "Insight",
  draft: "Draft",
  nerf: "Nerf-breaker",
  hex: "Hex",
  item: "Item",
};

interface Props {
  buff: Buff;
  /** Tier the card rolled at (may differ from the library tier). */
  tier?: Tier;
  status?: string | null;
  spent?: boolean;
  nullified?: boolean;
  onClick?: () => void;
  compact?: boolean;
  /** Soft accent glow: this buff can be used right now. */
  glow?: boolean;
}

export function BuffCard({ buff, tier, status, spent, nullified, onClick, compact, glow }: Props) {
  const t = tier ?? buff.tier;
  const dead = spent || nullified;
  const body = (
    <div
      className={
        `relative plate overflow-hidden border tier-bg-${t} ` +
        (compact ? "p-3 " : "p-4 ") +
        (dead ? "opacity-45 " : "") +
        (glow && !dead ? "ring-1 ring-gold/40 shadow-leaf " : "") +
        (onClick && !dead
          ? "cursor-pointer transition hover:border-gold/60 hover:-translate-y-0.5"
          : "")
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`font-display leading-tight tier-${t} ${compact ? "text-sm" : "text-lg"}`}>
            {buff.name}
          </div>
          <div className="smallcaps text-[10px] text-parchment-400">
            {CATEGORY_LABEL[buff.category]}
          </div>
        </div>
        <span
          className={`shrink-0 font-display font-bold px-2 py-0.5 rounded-full border tier-bg-${t} tier-${t} ${compact ? "text-[10px]" : "text-xs"}`}
          title={`Tier ${t}: ${TIER_LABEL[t]}`}
        >
          {TIER_ROMAN[t]}
        </span>
      </div>
      <p className={`mt-1.5 leading-snug text-parchment/90 ${compact ? "text-[11px]" : "text-[13px]"}`}>
        <GlossaryText text={buff.description} />
      </p>
      {status && !dead && (
        <div className="mt-1.5 smallcaps text-[10px] text-gold/80">{status}</div>
      )}
      {nullified && (
        <div className="mt-1.5 smallcaps text-[10px] text-oxblood-glow">Nullified</div>
      )}
      {spent && !nullified && (
        <div className="mt-1.5 smallcaps text-[10px] text-parchment-400">Used</div>
      )}
    </div>
  );

  if (!onClick || dead) return body;
  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      {body}
    </button>
  );
}
