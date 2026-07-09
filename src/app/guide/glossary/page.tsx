import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageLayout, InfoSection } from "@/components/InfoPageLayout";
import { BreadcrumbJsonLd, GuideFooter } from "../shared";

export const metadata: Metadata = {
  title: "Glossary: nerf, buff, hex, boon, bank, and more",
  description:
    "Every Nerf Chess term defined in one place: nerf, buff, hex, boon, item, bank, tier, walnut, freeze, shield, take-both, Chebyshev distance, and the rest of the card vocabulary.",
  alternates: { canonical: "/guide/glossary" },
};

// Terms mirror src/lib/glossary.ts (the in-game tooltip glossary) plus the
// draft-flag vocabulary from the engine, so this page and the game agree.
const GROUPS: { title: string; terms: { term: string; def: string }[] }[] = [
  {
    title: "Card types",
    terms: [
      {
        term: "Nerf",
        def: "A secret handicap rule that weakens one player for the whole game. Chosen from two cards before the first move in Nerf mode; revealed when the game ends.",
      },
      {
        term: "Buff",
        def: "A helpful power-up a player drafts to gain an edge. Buffs are passive (work while held), instant (fire when picked), or activated (used on your turn, usually at the cost of that turn).",
      },
      {
        term: "Hex",
        def: "A curse-style card that hampers your opponent, the most common draft in Nerf mode. Example: Cold Feet stops enemy pawns from capturing for 3 turns.",
      },
      {
        term: "Boon",
        def: "A beneficial card that softens or suspends your own nerf, or otherwise helps you. Example: Reprieve suspends your nerf for your next 2 turns.",
      },
      {
        term: "Item",
        def: "A playful one-use consumable card, drafted in both modes.",
      },
    ],
  },
  {
    title: "Drafting",
    terms: [
      {
        term: "Draft",
        def: "The pick-and-choose moment that fires every 5 of your own moves: you are offered two cards and pick one (or bank).",
      },
      {
        term: "Bank",
        def: "Skipping a draft to save its value: your next offer rolls one tier higher. Banking never stacks past +1.",
      },
      {
        term: "Tier",
        def: "A card's power or difficulty level, from I (Trivial) up to VIII (Unhinged). The full ladder: Trivial, Easy, Common, Severe, Brutal, Cruel, Punishing, Unhinged. Offers climb in tier as the game goes on, and tiers above VI are deliberately rare.",
      },
      {
        term: "Take-both",
        def: "An effect that lets you take every card in your next offer instead of choosing just one.",
      },
      {
        term: "Prep",
        def: "An effect that makes your next draft offer three cards instead of two.",
      },
    ],
  },
  {
    title: "Effects on the board",
    terms: [
      {
        term: "Freeze",
        def: "An effect that locks a piece in place so it cannot move for a time. Freezes never affect kings.",
      },
      {
        term: "Walnut",
        def: "A hexed piece that is sealed inside a walnut and cannot move for a set number of turns, then frees itself. Kings are never turned into walnuts.",
      },
      {
        term: "Shield",
        def: "A protection that blocks one of your pieces (or squares) from being captured, sometimes for a limited number of turns.",
      },
      {
        term: "Barred",
        def: "Blocked from doing something: a square or move that is off-limits to you while the effect lasts.",
      },
      {
        term: "Suspend",
        def: "To temporarily pause a nerf's effect, usually via a boon, so you can make moves your rule normally forbids.",
      },
      {
        term: "King-only",
        def: "A restriction under which you may only move your king until it expires.",
      },
      {
        term: "Forced pass",
        def: "When effects leave a player with no legal move, their turn passes automatically instead of losing the game. Mutual paralysis is a draw.",
      },
    ],
  },
  {
    title: "Board vocabulary",
    terms: [
      {
        term: "Chebyshev distance",
        def: "How Nerf Chess measures distance: the larger of the file difference and the rank difference, i.e. how many king steps it takes. Used whenever a card says 'within N squares'.",
      },
      {
        term: "Rim",
        def: "The outer edge of the board: the a- and h-files and the 1st and 8th ranks.",
      },
      {
        term: "King capture",
        def: "The win condition. There is no checkmate or stalemate; the game ends the instant a king is physically taken — the first capture wins, even if the capturer's own king was hanging — or when a nerf's lose condition fires, or a player resigns.",
      },
    ],
  },
];

const definedTermSetJsonLd = {
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  name: "Nerf Chess glossary",
  url: "https://nerfchess.com/guide/glossary",
  hasDefinedTerm: GROUPS.flatMap((g) =>
    g.terms.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      description: t.def,
    })),
  ),
};

export default function GlossaryPage() {
  return (
    <InfoPageLayout
      eyebrow="guide"
      title="The Nerf Chess glossary"
      intro="Card text is short on purpose, so it leans on a shared vocabulary. Here is every recurring term, from the five card types to the effects they leave on the board. The same definitions appear as tooltips inside the game."
    >
      <BreadcrumbJsonLd title="Glossary" path="/guide/glossary" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermSetJsonLd) }}
      />

      {GROUPS.map((group) => (
        <InfoSection key={group.title} title={group.title}>
          <dl className="space-y-3">
            {group.terms.map((t) => (
              <div key={t.term}>
                <dt className="font-display text-lg text-parchment">{t.term}</dt>
                <dd className="mt-0.5">{t.def}</dd>
              </div>
            ))}
          </dl>
        </InfoSection>
      ))}

      <InfoSection title="See the terms in action">
        <p>
          The <Link href="/codex" className="underline">codex</Link> lists every card and rule
          with these terms highlighted, and the{" "}
          <Link href="/guide/how-to-play" className="underline">how-to-play guide</Link> shows
          how they fit together in a real game.
        </p>
      </InfoSection>

      <GuideFooter current="/guide/glossary" />
    </InfoPageLayout>
  );
}
