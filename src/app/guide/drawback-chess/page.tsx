import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageLayout, InfoSection } from "@/components/InfoPageLayout";
import { BreadcrumbJsonLd, FaqSection, GuideFooter } from "../shared";

export const metadata: Metadata = {
  title: "Drawback chess: the idea behind Nerf mode",
  description:
    "Drawback chess is a chess variant where each player has a secret rule handicapping them. Learn how the concept works and how Nerf Chess extends it with card drafting, hexes, and king capture.",
  alternates: { canonical: "/guide/drawback-chess" },
};

export default function DrawbackChessPage() {
  return (
    <InfoPageLayout
      eyebrow="guide"
      title="Drawback chess and Nerf Chess"
      intro="Drawback chess is the name the chess community uses for a simple, brilliant idea: play normal chess, except each player secretly carries a rule that handicaps them. Nerf Chess is built on that idea, and this page explains where the two overlap and where they part ways."
    >
      <BreadcrumbJsonLd title="Drawback chess" path="/guide/drawback-chess" />

      <InfoSection title="The drawback idea">
        <p>
          In a drawback-style game, both players are dealt a secret restriction before the
          game: perhaps you cannot capture with pawns, cannot move to certain squares, or lose
          if a condition is ever met. Neither player knows the other&apos;s rule. The result is
          a double game: you play chess with one hand tied, while running a detective story
          about which hand your opponent has tied.
        </p>
        <p>
          The concept became popular online in recent years through streamers and dedicated
          implementations, because it fixes something interesting: at every level of skill, the
          hidden rule levels the field and forces even strong players to reason under
          uncertainty. A grandmaster who cannot deduce your drawback is playing blindfolded in
          a way ratings never trained them for.
        </p>
      </InfoSection>

      <InfoSection title="What Nerf mode keeps">
        <p>
          <Link href="/guide/nerf-mode" className="underline">Nerf mode</Link> keeps the heart
          of drawback chess intact. Each player picks one secret handicap (a nerf) from two
          cards before the first move, carries it all game, and reveals it only at the end. The
          deduction loop is the same: probe, observe what your opponent declines to do, and
          narrow down their rule while hiding yours.
        </p>
      </InfoSection>

      <InfoSection title="What Nerf Chess adds">
        <p>
          <strong>A card draft on top.</strong> Every 5 moves each player drafts a card:
          mostly hexes that curse the opponent, plus boons that soften your own nerf and
          one-use items. The handicaps stay secret, but the war around them escalates.
        </p>
        <p>
          <strong>King capture instead of checkmate.</strong> Nerf Chess games end when a king
          is taken, not mated. Kings can step into attacked squares and castle through check,
          which changes endgame technique and makes blunders lethal and spectacular.
        </p>
        <p>
          <strong>A tiered library.</strong> The <Link href="/codex" className="underline">
          codex</Link> holds over 400 cards and rules, each graded from tier I (Trivial) to
          tier VIII (Unhinged), so games can be as mild or as absurd as the draft decides.
        </p>
        <p>
          <strong>A second mode.</strong>{" "}
          <Link href="/guide/buff-mode" className="underline">Buff mode</Link> inverts the
          premise: no handicaps at all, only drafted power-ups. If drawback chess asks
          &quot;what can&apos;t they do?&quot;, Buff mode asks &quot;what can they do
          now?&quot;.
        </p>
      </InfoSection>

      <FaqSection
        items={[
          {
            question: "What is drawback chess?",
            answer:
              "A chess variant where each player is secretly assigned a rule that handicaps them, such as being unable to make certain captures. Deducing your opponent's drawback while hiding your own is the core of the game.",
          },
          {
            question: "Where can I play drawback-style chess online for free?",
            answer:
              "Nerf Chess at nerfchess.com implements the secret-handicap idea as Nerf mode. It is free, runs in the browser, and needs no account for bot or friend games.",
          },
          {
            question: "Is Nerf Chess a copy of drawback chess?",
            answer:
              "No. It shares the secret-handicap premise but is its own game: a hex-and-boon draft every 5 moves, win by king capture rather than checkmate, an eight-tier card system, and a second mode (Buff) with no handicaps at all.",
          },
          {
            question: "Does the secret rule make the game unfair?",
            answer:
              "Both players carry one, and the draft offers boons that soften your own rule, so the asymmetry cuts both ways. Reading your opponent is a skill you can improve like any other.",
          },
        ]}
      />

      <GuideFooter current="/guide/drawback-chess" />
    </InfoPageLayout>
  );
}
