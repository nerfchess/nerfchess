import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageLayout, InfoSection } from "@/components/InfoPageLayout";
import { BreadcrumbJsonLd, FaqSection, GuideFooter } from "../shared";

export const metadata: Metadata = {
  title: "Chess variants: where Nerf Chess fits",
  description:
    "A tour of popular chess variants (Chess960, Crazyhouse, Atomic, Fog of War, Duck Chess) and where Nerf Chess fits: hidden information plus card drafting on a standard board.",
  alternates: { canonical: "/guide/chess-variants" },
};

export default function ChessVariantsPage() {
  return (
    <InfoPageLayout
      eyebrow="guide"
      title="Chess variants, and where Nerf Chess fits"
      intro="Chess has spawned hundreds of variants, each bending one pillar of the classical game. Here is a quick map of the popular families, and where a hidden-rule, card-drafting game like Nerf Chess sits among them."
    >
      <BreadcrumbJsonLd title="Chess variants" path="/guide/chess-variants" />

      <InfoSection title="The main families of chess variants">
        <p>
          <strong>Setup shufflers.</strong> Chess960 (Fischer Random) keeps every rule of
          chess and only randomizes the starting back rank, killing memorized opening theory.
          The game itself is untouched.
        </p>
        <p>
          <strong>Piece-economy benders.</strong> Crazyhouse lets you drop captured pieces
          back onto the board as your own; Horde gives one side a wall of pawns; Three-check
          rewires the win condition to checking three times. These change what material and
          initiative are worth.
        </p>
        <p>
          <strong>Physics changers.</strong> Atomic chess makes every capture an explosion
          that clears the surrounding squares. King of the Hill wins by walking your king to
          the center. The board is the same; the consequences are not.
        </p>
        <p>
          <strong>Hidden-information games.</strong> Fog of War (Dark Chess) hides squares you
          cannot move to; Kriegspiel hides the opponent&apos;s army entirely. Here chess stops
          being a perfect-information game and starts rewarding inference.
        </p>
        <p>
          <strong>Outside elements.</strong> Duck Chess adds a rubber duck both players move
          to block squares; four-player chess adds two more armies. Something that is not a
          chess piece now shapes the game.
        </p>
      </InfoSection>

      <InfoSection title="Where Nerf Chess sits">
        <p>
          Nerf Chess belongs to the hidden-information family, but hides something different.
          Fog of War hides the <em>board</em>; Nerf Chess hides the <em>rules</em>. In{" "}
          <Link href="/guide/nerf-mode" className="underline">Nerf mode</Link> each player
          carries a secret handicap (the{" "}
          <Link href="/guide/drawback-chess" className="underline">drawback chess</Link>{" "}
          idea), so you see the whole board perfectly and still have to reason under
          uncertainty about what your opponent is allowed to do.
        </p>
        <p>
          It also borrows from card games: every 5 moves both players draft from a tiered pool
          of over 400 cards, hexes, boons, and buffs, which puts{" "}
          <Link href="/guide/buff-mode" className="underline">Buff mode</Link> closer to a
          deck-drafting game played with chess pieces. And like several modern variants it
          drops checkmate entirely: you win by{" "}
          <Link href="/guide/how-to-play" className="underline">capturing the king</Link>,
          which makes the rules simpler, not wilder, since check, mate, and stalemate all
          disappear.
        </p>
      </InfoSection>

      <InfoSection title="Which variant should you try?">
        <p>
          If you want pure chess without theory, play Chess960. If you want tactics chaos, try
          Crazyhouse or Atomic. If you want bluffing, deduction, and a different game every
          time, that is exactly the niche Nerf Chess was built for: play it free in your
          browser at <Link href="/lobby" className="underline">nerfchess.com/lobby</Link>, or
          against the bot at <Link href="/play" className="underline">/play</Link>.
        </p>
      </InfoSection>

      <FaqSection
        items={[
          {
            question: "What kind of chess variant is Nerf Chess?",
            answer:
              "A hidden-information variant crossed with a card game: standard board and pieces, secret handicap rules in Nerf mode, drafted power-up cards in Buff mode, and victory by capturing the king instead of checkmate.",
          },
          {
            question: "Is Nerf Chess closer to Fog of War or to Chess960?",
            answer:
              "Neither exactly. Fog of War hides parts of the board and Chess960 shuffles the setup; Nerf Chess shows you everything except the rules your opponent is playing under.",
          },
          {
            question: "Do chess skills transfer to Nerf Chess?",
            answer:
              "Yes. Piece movement, tactics, and endgame instincts all carry over. What is new is deduction about your opponent's hidden rule and judgment about which cards to draft.",
          },
        ]}
      />

      <GuideFooter current="/guide/chess-variants" />
    </InfoPageLayout>
  );
}
