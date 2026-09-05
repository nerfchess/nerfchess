import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageLayout, InfoSection } from "@/components/InfoPageLayout";
import { BreadcrumbJsonLd } from "../guide/shared";

export const metadata: Metadata = {
  title: "Updates: what's new in Nerf Chess",
  description:
    "The latest additions to Nerf Chess: hundreds of new buff and nerf cards, bigger card animations, rebalanced tiers, clearer card wording, spectators, and more. A running log of what changed.",
  alternates: { canonical: "/updates" },
};

export default function UpdatesPage() {
  return (
    <InfoPageLayout
      eyebrow="updates"
      title="What's new in Nerf Chess"
      intro="A running log of the biggest changes to the game. Nerf Chess is under active development, so the card pool, the animations, and the balance keep growing."
    >
      <BreadcrumbJsonLd title="Updates" path="/updates" />

      <InfoSection title="New look">
        <p>
          The whole site now sits on flat warm greys with square corners, metal buttons and a
          60px top bar, laid out the way Lichess lays out a page. Boxes are boxes, links are
          blue, dates and ranks are brass, and nothing glows.
        </p>
      </InfoSection>

      <InfoSection title="Hundreds of new cards">
        <p>
          The card pool grew a lot. There are now well over six hundred buff cards and more than
          three hundred nerfs, including four fresh themed sets: elemental (fire, ice, storm,
          earth, tide, growth), warfare (charges, sieges, formations, reinforcements), arcane
          (teleports, time-stops, transmutation, meta effects), and chaos (slapstick and curses
          with a real bite). Every one reuses the engine&apos;s existing mechanics, so they all
          actually work, and each is tuned to a tier that matches its real power. Browse the
          whole library in the <Link href="/codex" className="underline">codex</Link>.
        </p>
        <p>
          One favorite from the new batch: <strong>Computer Virus</strong>, which uploads a
          virus to your opponent&apos;s clock and drains their time a little at the end of each
          of their next few turns.
        </p>
      </InfoSection>

      <InfoSection title="Bigger, more distinct animations">
        <p>
          Cards that used to share one look now each get their own. Freezes split into an
          ice-shatter, a chain-freeze, a deep glacier, and a snap-frost; the petrify family got
          its own gorgon and stone looks; and the marquee cards, board-wipes, sieges, meteors,
          and transforms, all got dedicated signature spectacles. Every animation plays for both
          players and stays smooth, with reduced-motion respected.
        </p>
      </InfoSection>

      <InfoSection title="Balance and clarity">
        <p>
          A full re-audit corrected dozens of card tiers so that cards doing the same thing sit
          at the same tier, and card descriptions were rewritten to say exactly what a card does,
          to whom, and for how long, instead of hiding the effect behind flavor. Protection cards
          now state clearly whether your king is covered, and an uncapturable piece can no longer
          be the one that captures the enemy king, so being untouchable is never a free win.
        </p>
      </InfoSection>

      <InfoSection title="Lobby and matches">
        <p>
          The lobby feels more alive, with house players matched against each other, and you can
          now see who is spectating your game. A handful of match bugs were fixed along the way,
          including a rare case where a house opponent could concede for no reason.
        </p>
        <p>
          New here? Start with <Link href="/guide/how-to-play" className="underline">how to
          play</Link>, or jump straight into a game.
        </p>
      </InfoSection>
    </InfoPageLayout>
  );
}
