"use client";

import { Buff, turnCost } from "@/engine/buff";
import { Tier } from "@/engine/nerf";
import { TIER_LABEL, TIER_ROMAN } from "@/lib/tiers";
import { GlossaryText } from "@/components/GlossaryText";
import { TurnCostBadge } from "@/components/TurnCostBadge";
import {
  Castle,
  Eye,
  Layers,
  type LucideIcon,
  Package,
  Shield,
  Skull,
  Swords,
  Timer,
  Unlink,
  Wind,
} from "lucide-react";

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

// One glyph per category: it labels the small chip AND repeats as a large,
// barely-there watermark on the card face, so a hand of cards can be told
// apart at a glance the way suits are.
const CATEGORY_ICON: Record<Buff["category"], LucideIcon> = {
  movement: Wind,
  pieces: Castle,
  tempo: Timer,
  protection: Shield,
  attack: Swords,
  info: Eye,
  draft: Layers,
  nerf: Unlink,
  hex: Skull,
  item: Package,
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
  /** Draft picker only: stagger this card's entrance by the given delay (ms).
   * Omit to skip the entrance animation (dock / modal contexts). */
  enterDelayMs?: number;
}

export function BuffCard({ buff, tier, status, spent, nullified, onClick, compact, glow, enterDelayMs }: Props) {
  const t = tier ?? buff.tier;
  const dead = spent || nullified;
  const CatIcon = CATEGORY_ICON[buff.category];
  const body = (
    <div
      style={enterDelayMs != null ? { animationDelay: `${enterDelayMs}ms` } : undefined}
      className={
        `relative plate draft-face overflow-hidden border tier-bg-${t} ` +
        (enterDelayMs != null ? "draft-in " : "") +
        (compact ? "p-3 " : "p-4 ") +
        (dead ? "opacity-45 " : "") +
        (glow && !dead ? "ring-1 ring-gold/40 shadow-leaf " : "") +
        (onClick && !dead
          ? "cursor-pointer hover:border-gold/60 hover:-translate-y-0.5"
          : "")
      }
    >
      {/* Category watermark: a large, faint suit glyph anchored bottom-right,
          behind the text. Skipped on compact rows where it would just smear. */}
      {!compact && (
        <CatIcon
          aria-hidden
          className={`pointer-events-none absolute -bottom-3 -right-2 tier-${t}`}
          size={84}
          strokeWidth={1.2}
          style={{ opacity: 0.08 }}
        />
      )}
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={`font-display leading-tight tier-${t} ${compact ? "text-sm" : "text-lg"}`}>
            {buff.name}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 smallcaps text-[10px] text-parchment-400">
              <CatIcon aria-hidden size={11} strokeWidth={2} className="opacity-70" />
              {CATEGORY_LABEL[buff.category]}
            </span>
            <TurnCostBadge cost={turnCost(buff)} />
          </div>
        </div>
        <span
          className={`shrink-0 font-display font-bold px-2 py-0.5 rounded-full border tier-bg-${t} tier-${t} ${compact ? "text-[10px]" : "text-xs"}`}
          title={`Tier ${t}: ${TIER_LABEL[t]}`}
        >
          {TIER_ROMAN[t]}
        </span>
      </div>
      {/* Difficulty ornament: the tier label between hairline rules, the same
          severity treatment nerf cards wear, so both libraries read alike.
          Dropped in the compact draft/dock cards where space is tight. */}
      {!compact && (
        <div className="rule-ornament my-2.5 text-[10px]">
          <span className="font-display">{TIER_LABEL[t]}</span>
        </div>
      )}
      <p className={`leading-snug text-parchment/90 ${compact ? "mt-1.5 text-[11px]" : "text-[13px]"}`}>
        <GlossaryText text={buff.description} />
      </p>
      {/* Flavor line: the card's voice, quoted and dim, TCG-style. Full cards
          only; dock rows and compact picks stay all-business. */}
      {!compact && buff.flavor && (
        <p className="relative mt-2 text-[11px] italic leading-snug text-parchment-400">
          &ldquo;{buff.flavor}&rdquo;
        </p>
      )}
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
