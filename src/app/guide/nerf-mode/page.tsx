import type { Metadata } from "next";
import Link from "next/link";
import { GlossaryText } from "@/components/GlossaryText";
import { KeyTerms } from "@/components/guide/KeyTerms";
import { InfoPageLayout, InfoSection } from "@/components/InfoPageLayout";
import { BreadcrumbJsonLd, FaqSection, GuideFooter } from "../shared";

export const metadata: Metadata = {
  title: "Nerf mode: chess with secret handicaps",
  description:
    "Nerf mode is chess where every player carries a hidden handicap. Pick one of two secret rules, deduce your opponent's, and draft hexes to curse them along the way. How it works and how to win.",
  alternates: { canonical: "/guide/nerf-mode" },
};

export default function NerfModePage() {
  return (
    <InfoPageLayout
      eyebrow="guide"
      title="Nerf mode: chess with secret handicaps"
      intro="Nerf mode is the mode that gives Nerf Chess its name. Both players start with a hidden rule that weakens them, and neither knows the other's. Every move you make is strategy; every move they make is evidence."
    >
      <BreadcrumbJsonLd title="Nerf mode" path="/guide/nerf-mode" />

      <InfoSection title="How a Nerf mode game starts">
        <p>
          <GlossaryText text="Before the first move, each player is shown two nerf cards and picks one in secret, inside a 20-second lock-in window while the clocks wait (stall past it and the first card is picked for you). A nerf is a handicap: it restricts how you are allowed to play (&quot;you can't capture queens&quot;), or creates a brand-new way for you to lose. You carry your chosen rule for the whole game. Both players' two options are public: it is the pick that stays secret. Only when the game ends are both rules revealed." />
        </p>
        <p>
          <GlossaryText text="The board enforces your rule for you: moves your nerf forbids are simply never offered, so you cannot break it by accident. What you can do is leak it. Every capture you decline and every square you avoid tells a story, and a sharp opponent reads that story fast, knowing which two cards you chose between, they only have to tell the two apart." />
        </p>
      </InfoSection>

      <InfoSection title="The hex draft">
        <p>
          <GlossaryText text="Nerf mode is not only about the opening handicaps. Every 5 of your own moves you draft a card, and about 60% of draws are" />{" "}
          <strong>hexes</strong>: curses cast on your opponent, like{" "}
          <Link href="/codex/buff/cold_feet" className="underline">Cold Feet</Link>{" "}
          <GlossaryText text="(their pawns cannot capture for their next 3 turns), a freeze that roots a piece in place, or a walnut hex that petrifies a piece so it can only shuffle one square at a time. Kings are safe from the worst of it: no hex can freeze or petrify a king." />{" "}
          The rest are <strong>boons</strong> that soften your own nerf (
          <Link href="/codex/buff/reprieve" className="underline">Reprieve</Link>{" "}
          <GlossaryText text="suspends it for your next 2 turns" />) and one-use{" "}
          <strong>items</strong>.
        </p>
        <p>
          <GlossaryText text="Your opponent's picks stay hidden while the game runs: you learn that they drafted and the card's tier, nothing more, until an effect shows up on your board. You can also skip a draft to bank it, making your next offer one tier stronger, or spend your reroll for a fresh pair at the same tiers. And if you keep declining the boons that ease your nerf, the game notices: after two ignored relief offers they stop appearing." />{" "}
          The full card pool is browsable in the{" "}
          <Link href="/codex" className="underline">codex</Link>.
        </p>
      </InfoSection>

      <InfoSection title="How to win: play the player">
        <p>
          Three habits win Nerf mode games. First, <strong>probe early</strong>: cheap moves
          that force your opponent to reveal what they cannot do are worth more than small
          material gains. Second, <strong>protect your secret</strong>: if your nerf forbids
          something, avoid positions where declining it is conspicuous. Third,{" "}
          <strong>remember the real goal</strong>: the game ends by{" "}
          <Link href="/guide/how-to-play" className="underline">capturing the king</Link>, so
          king safety matters even more than in standard chess, because there is no check
          warning you before the axe falls.
        </p>
      </InfoSection>

      <KeyTerms
        slugs={[
          "nerf",
          "hex",
          "boon",
          "item",
          "suspend",
          "draft",
          "bank",
          "walnut",
          "freeze",
          "lock-in-window",
        ]}
      />

      <FaqSection
        items={[
          {
            question: "Can I see my opponent's nerf?",
            answer:
              "Not during the game. You see the two cards they chose between, but not which one they took. Their rule is revealed when the game ends; until then you deduce it from their play.",
          },
          {
            question: "What happens if my nerf makes a move illegal?",
            answer:
              "The board pre-filters your moves, so anything your nerf forbids is never offered. Nerfs with lose conditions still trigger on their own terms.",
          },
          {
            question: "Are Nerf mode games rated?",
            answer:
              "Queue games are rated, and Nerf mode keeps its own rating pool separate from Buff mode. Friend games are casual.",
          },
          {
            question: "How strong are the hexes I draft?",
            answer:
              "Cards carry difficulty tiers from I (Trivial) to VIII (Unhinged). Offers start mild and grow stronger as the game goes on, and skipping a draft banks a one-tier-stronger offer next time.",
          },
        ]}
      />

      <GuideFooter current="/guide/nerf-mode" />
    </InfoPageLayout>
  );
}
