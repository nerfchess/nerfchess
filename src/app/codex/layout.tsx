import type { Metadata } from "next";

// /codex (and its /codex/suggest, /codex/build children) are client
// components; this server layout supplies the section metadata. No canonical
// is set here because it would incorrectly apply to the child routes.
// Targets "chess card list" and "chess power-up list" queries.
export const metadata: Metadata = {
  title: "Codex: every Nerf Chess card and rule",
  description:
    "Browse the full Nerf Chess library: 400+ power-up cards, secret handicap nerfs, hexes, boons, and items, each with a difficulty tier from Trivial to Unhinged. Search and filter the complete card and rule list.",
  keywords: [
    "nerf chess cards",
    "chess power up list",
    "chess card list",
    "buff chess cards",
    "chess with cards rules",
    "power up chess cards",
    "chess variant card library",
  ],
  openGraph: {
    title: "Codex: every Nerf Chess card and rule",
    description:
      "Browse 400+ Nerf Chess cards and rules: power-up buffs, secret nerfs, hexes, and boons, each graded by difficulty tier.",
    url: "https://nerfchess.com/codex",
  },
};

export default function CodexLayout({ children }: { children: React.ReactNode }) {
  return children;
}
