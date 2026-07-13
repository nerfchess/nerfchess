import type { Metadata } from "next";
import Link from "next/link";
import { GlossaryText } from "@/components/GlossaryText";
import { KeyTerms } from "@/components/guide/KeyTerms";
import { InfoPageLayout, InfoSection } from "@/components/InfoPageLayout";
import { BreadcrumbJsonLd, FaqSection, GuideFooter } from "../shared";

export const metadata: Metadata = {
  title: "How to play Nerf Chess: rules and card types",
  description:
    "Learn the Nerf Chess rules in five minutes: win by capturing the king, no checkmate or stalemate, secret handicaps, and the five card types (nerf, buff, hex, boon, item).",
  alternates: { canonical: "/guide/how-to-play" },
};

export default function HowToPlayPage() {
  return (
    <InfoPageLayout
      eyebrow="guide"
      title="How to play Nerf Chess"
      intro="If you know how the chess pieces move, you already know 90% of Nerf Chess. This page covers the rest: the house rules every game follows, and the card types that make each game unique."
    >
      <BreadcrumbJsonLd title="How to play" path="/guide/how-to-play" />

      <InfoSection title="The house rules">
        <p>
          <strong>1. No checkmate, no stalemate.</strong>{" "}
          <GlossaryText text="A game ends only when a king is physically captured, a nerf triggers a loss condition, or a player resigns. There is no obligation to answer check." />
        </p>
        <p>
          <strong>2. The king is a real piece.</strong>{" "}
          <GlossaryText text="It can be captured like anything else, it can move into attacked squares, and it can castle through, into, or out of check. Leaving your king en prise loses on the spot, so vigilance replaces the check rule." />
        </p>
        <p>
          <strong>3. Nerfs are secret.</strong>{" "}
          <GlossaryText text="In Nerf mode you always see your own handicap but never your opponent's; you infer it from how they play. Buff mode has no nerfs at all." />
        </p>
        <p>
          <strong>4. Illegal-by-nerf moves are pre-filtered.</strong>{" "}
          <GlossaryText text="The board only offers moves your rule actually allows, so you cannot accidentally break your own nerf. Lose-condition nerfs still trigger on their own terms." />
        </p>
        <p>
          <strong>5. Distances are Chebyshev.</strong>{" "}
          <GlossaryText text="When a card talks about distance, count the larger of the file difference and the rank difference, the way a king walks, not straight-line Euclidean distance." />
        </p>
        <p>
          <strong>6. No king capture on a free move.</strong>{" "}
          <GlossaryText text="Some buffs hand you an extra move or make your opponent skip a turn. You can chain those, but you cannot capture the enemy king on a bonus move: your opponent always gets one reply first, so a king is never snatched while they have no chance to answer." />
        </p>
      </InfoSection>

      <InfoSection title="The five card types">
        <p>
          <strong>Nerf</strong>:{" "}
          <GlossaryText text="your secret handicap in Nerf mode, chosen from two cards before the first move (a 20-second lock-in window; stall and the first card is picked for you). It restricts how you play or invents a new way for you to lose." />{" "}
          Example: &quot;You can&apos;t capture queens.&quot;
        </p>
        <p>
          <strong>Buff</strong>:{" "}
          <GlossaryText text="a straight power-up and the whole of Buff mode. Passive buffs work while held, instant buffs fire the moment they are picked, and activated buffs wait until you use them — which costs your turn, unless the card is a free action." />
        </p>
        <p>
          <strong>Hex</strong>:{" "}
          <GlossaryText text="a curse you cast on your opponent, the most common card in Nerf mode's draft (about 60% of draws)." />{" "}
          Example:{" "}
          <Link href="/codex/buff/cold_feet" className="underline">Cold Feet</Link> stops your
          opponent&apos;s pawns from capturing for their next 3 turns.
        </p>
        <p>
          <strong>Boon</strong>:{" "}
          <GlossaryText text="relief from your own nerf, or a light supportive effect." />{" "}
          <Link href="/codex/buff/reprieve" className="underline">Reprieve</Link> suspends your
          handicap for two turns;{" "}
          <Link href="/codex/buff/small_mercies" className="underline">Small Mercies</Link> waits
          until you lose pieces, then lifts your rule while you recover.
        </p>
        <p>
          <strong>Item</strong>:{" "}
          <GlossaryText text="a playful one-use consumable that appears in both modes." />
        </p>
      </InfoSection>

      <InfoSection title="Drafting and banking">
        <p>
          <GlossaryText text="Every 5 of your own moves, the game deals you a draft: two cards, pick one. Both players draft at the same time, and in online games each offer has a 20-second lock-in window while the clocks stay paused (dawdle past it and your own clock restarts)." />{" "}
          Offers grow stronger over time through the card{" "}
          <Link href="/guide/glossary#tier" className="underline">tier system</Link>
          <GlossaryText text=", which runs from tier I (Trivial) to tier VIII (Unhinged). You can also skip a draft to bank it: your next offer then rolls one tier higher. Banking does not stack, so the skill is picking the right moment to be patient — with one famous exception: banking an offer that contained a tier-8 card earns a guaranteed apex (tier 9) offer, with a small chance of a tier-10 mythic." />
        </p>
        <p>
          <GlossaryText text="Not feeling either card? Every player also starts with one reroll: it discards the offer on the table and deals a fresh, guaranteed-different pair at the same tiers." />
        </p>
        <p>
          For mode-specific strategy, read the{" "}
          <Link href="/guide/nerf-mode" className="underline">Nerf mode guide</Link> and the{" "}
          <Link href="/guide/buff-mode" className="underline">Buff mode guide</Link>, or jump
          straight into a game against the bot at{" "}
          <Link href="/play" className="underline">/play</Link>.
        </p>
      </InfoSection>

      <KeyTerms
        slugs={[
          "capture-the-king",
          "check",
          "chebyshev-distance",
          "extra-move",
          "draft",
          "bank",
          "reroll",
          "tier",
          "lock-in-window",
          "turn-cost",
        ]}
      />

      <FaqSection
        items={[
          {
            question: "How do you win at Nerf Chess?",
            answer:
              "Capture the enemy king. There is no checkmate: the game continues until a king is taken, a nerf's lose condition fires, or someone resigns. The first king captured ends the game on the spot: the capturer wins even if their own king was hanging.",
          },
          {
            question: "Can the king move into check in Nerf Chess?",
            answer:
              "Yes. Since only capture ends the game, the king may move into attacked squares and castle through, into, or out of check. It is legal, just usually fatal.",
          },
          {
            question: "How often do you draft cards?",
            answer:
              "Every 5 of your own moves you receive an offer of two cards and pick one, or skip it to bank a one-tier-stronger offer next time.",
          },
          {
            question: "What is the difference between a nerf and a hex?",
            answer:
              "A nerf is the permanent secret handicap you choose for yourself at the start. A hex is a temporary curse you draft and inflict on your opponent during the game.",
          },
        ]}
      />

      <GuideFooter current="/guide/how-to-play" />
    </InfoPageLayout>
  );
}
