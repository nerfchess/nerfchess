import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageLayout, InfoSection } from "@/components/InfoPageLayout";
import { FaqSection, GuideFooter } from "./shared";

export const metadata: Metadata = {
  title: "What is Nerf Chess? The complete guide",
  description:
    "Nerf Chess is a free online chess variant where every player carries a secret handicap (Nerf mode) or drafts power-up cards (Buff mode), and the game ends by capturing the king. Start here.",
  alternates: { canonical: "/guide" },
};

export default function GuideIndexPage() {
  return (
    <InfoPageLayout
      eyebrow="guide"
      title="What is Nerf Chess?"
      intro="Nerf Chess is a free chess variant you play in your browser. It keeps the normal board and pieces, then changes one thing per mode: in Nerf mode every player carries a secret handicap, and in Buff mode both players draft power-up cards. In both, the game only ends when a king is actually captured."
    >
      <InfoSection title="The short answer">
        <p>
          Nerf Chess is an online chess variant with two game modes and a shared twist: there
          is no checkmate and no stalemate. You win by physically capturing the enemy king,
          which means the king can walk into attacked squares, castle through check, and
          generally live dangerously in ways standard chess forbids.
        </p>
        <p>
          <strong>Nerf mode</strong> is chess with secret rules. Before the first move, each
          player picks one hidden handicap (a &quot;nerf&quot;) from two cards. You always know
          your own rule; you never see your opponent&apos;s until the game ends. Every few moves
          a draft deals extra cards: usually a hex that curses your opponent, sometimes a boon
          or item that helps you. If you have heard of{" "}
          <Link href="/guide/drawback-chess" className="underline">drawback chess</Link>, this
          is that idea, extended with a card draft.
        </p>
        <p>
          <strong>Buff mode</strong> flips the formula. Nobody is handicapped: every 5 moves,
          both players draft a power-up card and race to build the stronger army. Cards climb
          in strength as the game goes on, from small conveniences up to game-warping effects.
        </p>
      </InfoSection>

      <InfoSection title="Why it plays differently from chess">
        <p>
          Standard chess is a game of pure calculation: both players see everything. Nerf mode
          adds hidden information, so it is also a game of deduction. A move your opponent
          keeps avoiding can reveal as much as the moves they play, and figuring out their
          secret rule is half the battle.
        </p>
        <p>
          Buff mode keeps perfect information about the board but adds drafting, the kind of
          decision you would find in a card game: take the safe card now, or skip the draft to
          bank a stronger offer later. Over 400 cards and rules live in the{" "}
          <Link href="/codex" className="underline">codex</Link>, each with a difficulty tier
          from I (Trivial) to VIII (Unhinged).
        </p>
      </InfoSection>

      <InfoSection title="Where to start">
        <p>
          Read <Link href="/guide/how-to-play" className="underline">how to play</Link> for
          the five house rules, then pick a mode:{" "}
          <Link href="/guide/nerf-mode" className="underline">Nerf mode</Link> if you like
          bluffing and deduction, <Link href="/guide/buff-mode" className="underline">Buff
          mode</Link> if you like drafting and power. You can play against the bot at{" "}
          <Link href="/play" className="underline">/play</Link>, jump into online games at{" "}
          <Link href="/lobby" className="underline">/lobby</Link>, or challenge a friend with
          a five-character code, no account required.
        </p>
      </InfoSection>

      <FaqSection
        items={[
          {
            question: "Is Nerf Chess free?",
            answer:
              "Yes. Nerf Chess is completely free to play in your browser at nerfchess.com, with no download and no payment.",
          },
          {
            question: "Do I need an account to play?",
            answer:
              "No. You can play the bot and friend games without an account; friend games link two browsers with a short five-character code. An account adds ratings, history, and a profile.",
          },
          {
            question: "Is Nerf Chess the same as drawback chess?",
            answer:
              "They share the core idea: each player has a secret drawback. Nerf mode builds on it with a card draft (hexes, boons, and items), difficulty tiers, and king-capture rules, and Buff mode drops handicaps entirely in favor of power-up drafting.",
          },
          {
            question: "Can I play Nerf Chess against a computer?",
            answer:
              "Yes. The bot plays both modes, including drafting cards and using its buffs, at nerfchess.com/play.",
          },
        ]}
      />

      <GuideFooter current="/guide" />
    </InfoPageLayout>
  );
}
