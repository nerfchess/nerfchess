"use client";

import { Buff, turnCost } from "@/engine/buff";
import { Tier } from "@/engine/nerf";
import { TIER_LABEL, TIER_ROMAN } from "@/lib/tiers";
import { GlossaryText } from "@/components/GlossaryText";
import { TurnCostBadge } from "@/components/TurnCostBadge";
import {
  Castle,
  Eye,
  icons as LucideIcons,
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

/** Resolve a per-card lucide icon NAME to its component. Accepts both the
 * PascalCase export key ("Bomb") and lucide's kebab-case id ("shield-alert"),
 * so buff (PascalCase) and nerf (kebab) naming both resolve. Unknown or
 * misspelled names return undefined, so the caller falls back to a glyph and
 * a bad name can never crash the card. */
function resolveLucideIcon(name: string | undefined): LucideIcon | undefined {
  if (!name) return undefined;
  const direct = LucideIcons[name as keyof typeof LucideIcons];
  if (direct) return direct as LucideIcon;
  const pascal = name.replace(/(^|[-_ ])(\w)/g, (_m: string, _s: string, c: string) =>
    c.toUpperCase(),
  );
  return LucideIcons[pascal as keyof typeof LucideIcons] as LucideIcon | undefined;
}

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
  // Per-card icon (a lucide-react name on the buff) wins over the shared
  // category glyph, so cards that share a category can each look distinct.
  // Unknown / misspelled names fall back to the category glyph, never crash.
  const CatIcon = resolveLucideIcon(buff.icon) ?? CATEGORY_ICON[buff.category];
  const body = (
    <div
      style={enterDelayMs != null ? { animationDelay: `${enterDelayMs}ms` } : undefined}
      className={
        `relative plate draft-face overflow-hidden border tier-bg-${t} ` +
        (enterDelayMs != null ? "draft-in " : "") +
        // Full-size cards fill their grid cell as a column so every card in
        // one draft offer lands the same height (description stretches, tier
        // rows and bottoms align). Compact rows keep their natural height.
        (compact ? "p-3 " : "flex h-full flex-col p-4 ") +
        (dead ? "opacity-45 " : "") +
        (glow && !dead ? "ring-1 ring-gold/40 shadow-leaf " : "") +
        (onClick && !dead
          ? compact
            ? "cursor-pointer hover:border-gold/60 hover:-translate-y-0.5"
            : // Pickable full-size cards are candy: pop on hover, squash on
              // press, tier-colored ring (all from .card-juicy, 14px corners).
              "card-juicy"
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
              <CatIcon
                aria-hidden
                size={compact ? 11 : 12}
                strokeWidth={compact ? 2 : 2.5}
                className={compact ? "opacity-70" : "opacity-95"}
              />
              {CATEGORY_LABEL[buff.category]}
            </span>
            <TurnCostBadge cost={turnCost(buff)} />
          </div>
        </div>
        <span
          className={`shrink-0 font-display font-bold px-2 py-0.5 rounded-[1px] tier-bg-${t} tier-${t} ${compact ? "border text-[10px]" : "border-[1.5px] text-[13px]"}`}
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
      {/* flex-1 on full cards: the description absorbs the height difference,
          so flavor/status footers pin to the aligned card bottoms. */}
      <p className={`leading-snug text-parchment/90 ${compact ? "mt-1.5 text-[11px]" : "flex-1 text-[13px]"}`}>
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
    <button type="button" onClick={onClick} className="block h-full w-full text-left">
      {body}
    </button>
  );
}
