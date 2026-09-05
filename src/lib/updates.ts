// The site's change log, newest first. The home page shows the latest few in
// a Lichess-style timeline; /updates carries the full write-ups under the
// anchors named here. Two sources feed it: the hand-written entries below
// (the headline changes, each with a write-up on /updates) and the entries
// scripts/gen-updates.ts derives from docs/CHANGELOG.md (src/lib/updates.gen.ts,
// regenerate with `npm run gen:updates`).
import { GENERATED_UPDATES } from "./updates.gen";

export interface UpdateEntry {
  /** ISO date, used for the timeline label and sitemap lastModified. */
  date: string;
  title: string;
  /** One line, plain words, no marketing. */
  summary: string;
  /** Anchor on /updates. */
  anchor: string;
  /** Plain-text points shown under "Read more" on /updates. */
  bullets?: string[];
}

/** One changelog block as emitted by scripts/gen-updates.ts. */
export type GeneratedUpdate = UpdateEntry & { bullets: string[] };

const HAND_WRITTEN: UpdateEntry[] = [
  {
    date: "2026-09-05",
    title: "A tighter card pool",
    summary: "743 cards that duplicated, dominated or out-talked another card have left the draft pools. They still replay, and each keeps its codex page.",
    anchor: "a-tighter-card-pool",
  },
  {
    date: "2026-09-05",
    title: "New look",
    summary: "Flat warm greys, square corners, metal buttons, and a 60px top bar, the way Lichess lays out a page.",
    anchor: "new-look",
  },
  {
    date: "2026-08-20",
    title: "Hundreds of new cards",
    summary: "Elemental, warfare, arcane and chaos sets join the pool, every one tuned to its tier.",
    anchor: "hundreds-of-new-cards",
  },
  {
    date: "2026-08-02",
    title: "Bigger, more distinct animations",
    summary: "Freezes, petrifies, board wipes and meteors each get their own look.",
    anchor: "bigger-more-distinct-animations",
  },
  {
    date: "2026-07-17",
    title: "Balance and clarity",
    summary: "Dozens of tiers corrected and every description rewritten to say exactly what a card does.",
    anchor: "balance-and-clarity",
  },
  {
    date: "2026-07-05",
    title: "Lobby and matches",
    summary: "Quick pairing pools, open challenges, spectators, and a steadier clock.",
    anchor: "lobby-and-matches",
  },
];

// Title similarity for dedupe: the same words in any order, or one title
// contained in the other, after case and punctuation are dropped.
function titleKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function similarTitle(a: string, b: string): boolean {
  const ka = titleKey(a);
  const kb = titleKey(b);
  if (ka === kb || ka.includes(kb) || kb.includes(ka)) return true;
  const wa = new Set(ka.split(" "));
  const wb = new Set(kb.split(" "));
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / Math.max(wa.size, wb.size) >= 0.6;
}

// Hand-written entries win: a generated entry is dropped when it shares an
// anchor with one, or lands on the same date under a similar title. The
// result is newest first; ties keep hand-written entries ahead.
function merge(hand: UpdateEntry[], generated: UpdateEntry[]): UpdateEntry[] {
  const out = [...hand];
  for (const g of generated) {
    const dup = out.some((h) => h.anchor === g.anchor || (h.date === g.date && similarTitle(h.title, g.title)));
    if (!dup) out.push(g);
  }
  return out
    .map((u, i) => ({ u, i }))
    .sort((a, b) => (a.u.date < b.u.date ? 1 : a.u.date > b.u.date ? -1 : a.i - b.i))
    .map(({ u }) => u);
}

export const UPDATES: UpdateEntry[] = merge(HAND_WRITTEN, GENERATED_UPDATES);

export function formatUpdateDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
