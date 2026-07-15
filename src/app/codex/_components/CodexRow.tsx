"use client";

import Link from "next/link";
import { createElement, type CSSProperties, type MouseEvent } from "react";
import { ChevronRight, Link2, Sparkles, type LucideIcon } from "lucide-react";
import { cardFaceIcon, nerfFaceIcon } from "@/lib/cardIcon";
import { TIER_LABEL, TIER_ROMAN } from "@/lib/tiers";
import { entryPath, type CodexEntry } from "./codexData";

function entryIcon(e: CodexEntry): LucideIcon {
  const ic =
    e.kind === "nerf"
      ? nerfFaceIcon(e.card.id, e.card.icon)
      : cardFaceIcon(e.card.id, e.card.category, e.card.icon);
  return ic ?? Sparkles;
}

// A compact 44px list row: face icon, name, tier chip (via the shared .tier-*
// classes), and a one-line description ellipsis. The whole row is a real link
// to the card's detail page, so a modified click (or middle click) opens the
// page in the usual way; a plain click expands the full card in place instead.
// content-visibility + contain-intrinsic-size keep off-screen rows out of
// layout and paint so the page stays cheap even with hundreds of rows mounted.
export function CodexRow({
  entry,
  expanded,
  copied,
  onToggle,
  onCopy,
}: {
  entry: CodexEntry;
  expanded: boolean;
  copied: boolean;
  onToggle: () => void;
  onCopy: () => void;
}) {
  const { card } = entry;
  const tier = card.tier;
  const Icon = entryIcon(entry);
  const path = entryPath(entry);

  const onRowClick = (e: MouseEvent) => {
    // Let modified / non-primary clicks navigate to the stable URL as normal
    // (new tab, background, etc.); a plain click expands the row in place.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onToggle();
  };

  const rowStyle: CSSProperties = { contentVisibility: "auto", containIntrinsicSize: "auto 48px" };

  return (
    <div style={rowStyle}>
      <Link
        href={path}
        onClick={onRowClick}
        aria-expanded={expanded}
        className={`group flex min-h-[44px] items-center gap-2.5 rounded-sm border px-2.5 py-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] ${
          expanded
            ? "border-[color:var(--edge-strong)] bg-white/[0.04]"
            : "border-[color:var(--edge)] bg-white/[0.015] hover:bg-[color:var(--surface-hover)]"
        }`}
      >
        <span
          aria-hidden
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-sm border tier-bg-${tier} tier-${tier}`}
        >
          {createElement(Icon, { size: 15, strokeWidth: 1.8 })}
        </span>

        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-display text-[14px] leading-tight text-parchment-100 sm:flex-none sm:max-w-[16rem]">
            {card.name}
          </span>
          <span
            className={`shrink-0 rounded-[1px] border px-1.5 py-px font-display text-[12px] font-bold tier-bg-${tier} tier-${tier}`}
            title={`Tier ${TIER_ROMAN[tier]} of 8: ${TIER_LABEL[tier]}`}
          >
            {TIER_ROMAN[tier]}
          </span>
          <span className="hidden min-w-0 flex-1 truncate text-[12px] text-parchment-400 sm:block">
            {card.description}
          </span>
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCopy();
          }}
          aria-label={`Copy link to ${card.name}`}
          className="hidden h-8 shrink-0 items-center gap-1 rounded-sm px-2 text-[12px] text-parchment-400 hover:bg-white/5 hover:text-parchment-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] sm:inline-flex"
        >
          <Link2 size={14} aria-hidden />
          {copied ? "Copied" : "Copy"}
        </button>
        <ChevronRight
          size={16}
          aria-hidden
          className={`shrink-0 text-parchment-400 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
        />
      </Link>
    </div>
  );
}
