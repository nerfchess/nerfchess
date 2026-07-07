// Server-safe metadata layer for the per-card codex pages
// (/codex/buff/[id] and /codex/nerf/[id]). Pure data and lookups over the
// static card libraries: no React, no client APIs, so the card routes can run
// as fully static server components and ship crawlable HTML for every card.
//
// The mode and card-type rules here mirror the authoritative draft filter in
// engine/draft.ts (the `inMode` closure). If that filter changes, update the
// `cardType` / `cardModes` helpers to match so the codex never mislabels where
// a card appears.

import { ALL_BUFFS } from "@/engine/buffs/library";
import { ALL_NERFS } from "@/engine/nerfs/library";
import { isBoon, turnCost, type Buff, type TurnCost } from "@/engine/buff";
import type { Nerf, Tier } from "@/engine/nerf";
import { TIER_LABEL, TIER_ROMAN } from "@/lib/tiers";
import { categoriesOf, getCategoryLabel } from "@/lib/nerfCategories";

// Info cards whose whole effect is reading the opponent's NERF: buff mode has
// no nerfs, so draft.ts filters these out of buff drafts. Re-declared here to
// keep engine/draft.ts (a hot path) untouched; keep the two in sync.
const NERF_REVEAL = new Set(["extra_glance", "watchtower"]);

export type CardKind = "buff" | "nerf";

/** The display family a card belongs to, matching the codex's tabs. */
export type CardType = "Buff" | "Hex" | "Boon" | "Item" | "Nerf";

// --- Lookups ----------------------------------------------------------------

export const BUFF_BY_ID: Record<string, Buff> = Object.fromEntries(
  ALL_BUFFS.map((b) => [b.id, b]),
);
export const NERF_BY_ID: Record<string, Nerf> = Object.fromEntries(
  ALL_NERFS.map((n) => [n.id, n]),
);

export function buffPath(id: string): string {
  return `/codex/buff/${id}`;
}
export function nerfPath(id: string): string {
  return `/codex/nerf/${id}`;
}

// --- Classification ---------------------------------------------------------

/** Which family a buff reads as, following the codex's four tabs plus items.
 * Hex and (nerf-relief / boon) win over the plain "Buff" label. */
export function buffType(b: Buff): CardType {
  if (b.category === "hex") return "Hex";
  if (b.category === "item") return "Item";
  if (isBoon(b)) return "Boon";
  return "Buff";
}

/** Human label for the mode(s) a card can appear in. Mirrors draft.ts inMode:
 * - buff mode offers everything except nerf-relief, hexes, and the two
 *   opponent-nerf reveal cards;
 * - nerf mode offers boons (nerf-relief + boon-flagged), hexes, and items. */
export function buffModes(b: Buff): ("buff" | "nerf")[] {
  const inNerf = isBoon(b) || b.category === "hex" || b.category === "item";
  const inBuff = b.category !== "nerf" && b.category !== "hex" && !NERF_REVEAL.has(b.id);
  const modes: ("buff" | "nerf")[] = [];
  if (inBuff) modes.push("buff");
  if (inNerf) modes.push("nerf");
  return modes;
}

export function modeLabel(modes: ("buff" | "nerf")[]): string {
  if (modes.length === 2) return "Buff mode and Nerf mode";
  if (modes[0] === "nerf") return "Nerf mode";
  if (modes[0] === "buff") return "Buff mode";
  return "Not currently drafted";
}

// --- Tier + category prose --------------------------------------------------

export function tierName(tier: Tier): string {
  return `${TIER_ROMAN[tier]}. ${TIER_LABEL[tier]}`;
}

// One plain sentence per tier, so a card page can explain its own difficulty
// band without the reader having to know the whole ladder.
const TIER_MEANING: Record<number, string> = {
  1: "Trivial: the gentlest band, offered in the earliest drafts.",
  2: "Easy: a small, early effect.",
  3: "Common: the everyday middle of the draft.",
  4: "Severe: a strong swing, offered as games open up.",
  5: "Brutal: a heavy effect that reshapes a position.",
  6: "Cruel: a rare, powerful card from the late draft.",
  7: "Punishing: a top-band blowout, kept rare on purpose.",
  8: "Unhinged: the highest tier, a game-defining moment.",
};
export function tierMeaning(tier: Tier): string {
  return TIER_MEANING[tier] ?? "";
}

// Plain label + one-line meaning for each buff category.
const BUFF_CATEGORY: Record<Buff["category"], { label: string; blurb: string }> = {
  movement: { label: "Movement", blurb: "changes how one of your pieces is allowed to move." },
  pieces: { label: "Pieces", blurb: "summons, revives, promotes, or converts a piece." },
  tempo: { label: "Tempo", blurb: "buys time: an extra move, a skip, or a freeze." },
  protection: { label: "Protection", blurb: "shields a piece or bars squares from the opponent." },
  attack: { label: "Attack", blurb: "removes or detonates a piece directly." },
  info: { label: "Insight", blurb: "reveals hidden information, like a nerf or a draft." },
  draft: { label: "Draft", blurb: "bends one player's draft: the tier, the count, or the pool." },
  nerf: { label: "Nerf-breaker", blurb: "softens or removes your own secret handicap." },
  hex: { label: "Hex", blurb: "a curse cast on the opponent in Nerf mode." },
  item: { label: "Item", blurb: "a one-use consumable, drafted in either mode." },
};
export function buffCategory(b: Buff): { label: string; blurb: string } {
  return BUFF_CATEGORY[b.category];
}

// --- Turn cost prose --------------------------------------------------------

const TURN_COST_MEANING: Record<TurnCost, string> = {
  passive: "Passive: it works on its own the whole time you hold it, with nothing to activate.",
  instant: "Instant: it takes effect the moment you draft it.",
  turn: "Activated: you choose when to use it, and using it is your move for that turn.",
  free: "Free action: you choose when to use it, and it resolves without costing your turn.",
};
export function turnCostMeaning(b: Buff): string {
  return TURN_COST_MEANING[turnCost(b)];
}

// --- Related cards ----------------------------------------------------------

export interface RelatedCard {
  id: string;
  name: string;
  tier: Tier;
  path: string;
  type: CardType;
}

/** Up to `limit` other implemented buffs closest to `b`: same category first,
 * then nearest tier, then name. Powers the cross-links that give every card
 * page outbound depth and keep the set from reading as thin, isolated pages. */
export function relatedBuffs(b: Buff, limit = 6): RelatedCard[] {
  return ALL_BUFFS.filter((x) => x.implemented && x.id !== b.id && x.category === b.category)
    .sort(
      (x, y) =>
        Math.abs(x.tier - b.tier) - Math.abs(y.tier - b.tier) || x.name.localeCompare(y.name),
    )
    .slice(0, limit)
    .map((x) => ({ id: x.id, name: x.name, tier: x.tier, path: buffPath(x.id), type: buffType(x) }));
}

/** Up to `limit` other implemented nerfs sharing a mechanic category with `n`,
 * nearest tier first; falls back to nearest tier when it has no category. */
export function relatedNerfs(n: Nerf, limit = 6): RelatedCard[] {
  const cats = new Set(categoriesOf(n.id));
  const scored = ALL_NERFS.filter((x) => x.implemented && x.id !== n.id).map((x) => {
    const shared = categoriesOf(x.id).some((c) => cats.has(c));
    return { x, shared };
  });
  const shareCats = scored.filter((s) => s.shared).map((s) => s.x);
  const pool = shareCats.length >= limit ? shareCats : ALL_NERFS.filter((x) => x.implemented && x.id !== n.id);
  return pool
    .sort((x, y) => Math.abs(x.tier - n.tier) - Math.abs(y.tier - n.tier) || x.name.localeCompare(y.name))
    .slice(0, limit)
    .map((x) => ({ id: x.id, name: x.name, tier: x.tier, path: nerfPath(x.id), type: "Nerf" as const }));
}

/** The nerf's mechanic categories as human labels (for the "At a glance" row). */
export function nerfCategoryLabels(n: Nerf): string[] {
  return categoriesOf(n.id).map(getCategoryLabel);
}

// --- Meta description --------------------------------------------------------

/** A single search-snippet sentence for a card, clamped near 155 characters so
 * it is not truncated mid-word in results. */
export function metaDescription(name: string, lead: string, description: string): string {
  const full = `${lead} ${description}`.replace(/\s+/g, " ").trim();
  if (full.length <= 155) return full;
  const clipped = full.slice(0, 152);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > 80 ? lastSpace : 152)}...`;
}
