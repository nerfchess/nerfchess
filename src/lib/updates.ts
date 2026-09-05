// The site's change log, newest first. The home page shows the latest few in
// a Lichess-style timeline; /updates carries the full write-ups under the
// anchors named here.
export interface UpdateEntry {
  /** ISO date, used for the timeline label and sitemap lastModified. */
  date: string;
  title: string;
  /** One line, plain words, no marketing. */
  summary: string;
  /** Anchor on /updates. */
  anchor: string;
}

export const UPDATES: UpdateEntry[] = [
  {
    date: "2026-09-05",
    title: "A tighter card pool",
    summary: "582 cards that duplicated, dominated or out-talked another card have left the draft pools. They still replay, and the codex shows them under a filter.",
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

export function formatUpdateDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
