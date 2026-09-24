// Titles and descriptions for the codex card pages (about 1,660 of the 1,700
// sitemap entries), shared by the four card routes, their preview images and
// the uniqueness guard (scripts/check-seo.ts), so what the guard proves is
// exactly what the pages print.
//
// A card title used to be the bare card name, and 27 live names are shared
// between two cards (a buff and a nerf both called Pawn Storm, two buffs both
// called Divine Right), so the sitemap carried duplicate titles. The title
// now names the tier and the family ("Pawn Storm: Severe buff"), and the few
// cards that still collide add their mode, then their tier numeral.
//
// The description reads as prose ("a Trivial (tier I) nerf"), where it used
// to print the tier's display label into the sentence ("a I. Trivial nerf",
// F174).

import { ALL_BUFFS } from "@/engine/buffs/library";
import { ALL_NERFS } from "@/engine/nerfs/library";
import { isRetired } from "@/engine/retired";
import { BUFF_BY_ID, buffModes, buffType, cardPath } from "@/lib/cardCodex";
import type { Metadata } from "next";
import { clampDescription, fullTitle, pageMeta } from "@/lib/seo";
import { TIER_LABEL, TIER_ROMAN } from "@/lib/tiers";

type AnyCard = { id: string; name: string; description: string; tier: number; implemented?: boolean };

export type CardSeo = {
  id: string;
  path: string;
  /** Title without the brand, e.g. "Pawn Storm: Severe buff". */
  pageTitle: string;
  /** Full <title>. */
  title: string;
  description: string;
  /** "Buff", "Nerf", "Hex", "Boon", "Item". */
  family: string;
  tier: number;
  /** "Tier IV, Severe". */
  tierLabel: string;
  mode: "buff" | "nerf" | null;
  /** "Buff mode and Nerf mode" or "Not currently drafted" when mode is null. */
  modeText: string;
  indexable: boolean;
};

const NERF_BY_ID: Record<string, AnyCard> = Object.fromEntries(ALL_NERFS.map((n) => [n.id, n as AnyCard]));

function tierWord(tier: number): string {
  return TIER_LABEL[tier] ?? `Tier ${tier}`;
}

function modesOf(kind: "buff" | "nerf", card: AnyCard): ("buff" | "nerf")[] {
  return kind === "nerf" ? ["nerf"] : buffModes(BUFF_BY_ID[card.id]);
}

function modePhrase(modes: ("buff" | "nerf")[]): string {
  if (modes.length === 2) return "Buff mode and Nerf mode";
  if (modes[0] === "nerf") return "Nerf mode";
  if (modes[0] === "buff") return "Buff mode";
  return "Not currently drafted";
}

function baseTitle(name: string, tier: number, family: string): string {
  return `${name.trim()}: ${tierWord(tier)} ${family.toLowerCase()}`;
}

/** Every card page, with its final (collision-free) title. */
function build(): Map<string, CardSeo> {
  type Row = { key: string; kind: "buff" | "nerf"; card: AnyCard; family: string; path: string; modes: ("buff" | "nerf")[] };
  const rows: Row[] = [];
  for (const b of ALL_BUFFS) {
    const card = b as unknown as AnyCard;
    rows.push({ key: `buff:${b.id}`, kind: "buff", card, family: buffType(b), path: cardPath(b), modes: modesOf("buff", card) });
  }
  for (const n of ALL_NERFS) {
    const card = n as unknown as AnyCard;
    rows.push({ key: `nerf:${n.id}`, kind: "nerf", card, family: "Nerf", path: `/codex/nerf/${n.id}`, modes: ["nerf"] });
  }
  // Resolve title collisions in steps: add the mode, then the tier numeral,
  // then (never needed today, but a new card must not break the guard) the id.
  const titleOf = new Map<string, string>();
  for (const r of rows) titleOf.set(r.key, baseTitle(r.card.name, r.card.tier, r.family));
  const steps: ((r: Row, t: string) => string)[] = [
    (r, t) => `${t}, ${modePhrase(r.modes)}`,
    (r, t) => `${t}, tier ${TIER_ROMAN[r.card.tier] ?? r.card.tier}`,
    // Two definitions of the same card (same name, family, tier and mode):
    // the id is the only difference, so it replaces the steps that failed.
    (r) => `${baseTitle(r.card.name, r.card.tier, r.family)} (${r.card.id})`,
  ];
  for (const step of steps) {
    const count = new Map<string, number>();
    for (const t of titleOf.values()) count.set(t.toLowerCase(), (count.get(t.toLowerCase()) ?? 0) + 1);
    for (const r of rows) {
      const t = titleOf.get(r.key)!;
      if ((count.get(t.toLowerCase()) ?? 0) > 1) titleOf.set(r.key, step(r, t));
    }
  }
  const out = new Map<string, CardSeo>();
  for (const r of rows) {
    const { card, family, modes } = r;
    const tier = card.tier;
    const roman = TIER_ROMAN[tier] ?? String(tier);
    const where =
      family === "Nerf"
        ? "a secret handicap in Nerf mode"
        : family === "Hex"
          ? "cast on your opponent in Nerf mode"
          : modes.length === 0
            ? "not currently drafted"
            : `drafted in ${modePhrase(modes)}`;
    const article = /^[AEIOU]/i.test(tierWord(tier)) ? "an" : "a";
    const lead = `${card.name.trim()} is ${article} ${tierWord(tier)} (tier ${roman}) ${family.toLowerCase()} in Nerf Chess, ${where}.`;
    const pageTitle = titleOf.get(r.key)!;
    out.set(r.key, {
      id: card.id,
      path: r.path,
      pageTitle,
      title: fullTitle(pageTitle),
      description: clampDescription(`${lead} ${card.description}`),
      family,
      tier,
      tierLabel: `Tier ${roman}, ${tierWord(tier)}`,
      mode: modes.length === 1 ? modes[0] : null,
      modeText: modePhrase(modes),
      indexable: card.implemented !== false && !isRetired(card.id),
    });
  }
  return out;
}

let table: Map<string, CardSeo> | null = null;
function seoTable(): Map<string, CardSeo> {
  return (table ??= build());
}

/** A card page's metadata: the collision-free title, the prose description,
 *  its canonical family path, the card preview from the route's
 *  opengraph-image file, and noindex for unimplemented or retired cards (they
 *  render so old links never 404, but stay out of the index and sitemap). */
export function cardPageMeta(seo: CardSeo): Metadata {
  return pageMeta({
    title: seo.pageTitle,
    description: seo.description,
    path: seo.path,
    image: "segment",
    noindex: !seo.indexable,
    type: "article",
  });
}

export function buffSeo(id: string): CardSeo | null {
  return seoTable().get(`buff:${id}`) ?? null;
}

export function nerfSeo(id: string): CardSeo | null {
  return NERF_BY_ID[id] ? seoTable().get(`nerf:${id}`) ?? null : null;
}

/** Every indexable card page (what the sitemap lists), for the guard. */
export function allCardMeta(): { path: string; title: string; description: string }[] {
  return [...seoTable().values()].filter((c) => c.indexable).map(({ path, title, description }) => ({ path, title, description }));
}

/** Live cards (implemented, not retired): the number the codex can honestly
 *  claim. Computed from the libraries, so it can never go stale (F173). */
export function liveCardCount(): number {
  return [...seoTable().values()].filter((c) => c.indexable).length;
}
