import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageLayout, InfoSection } from "@/components/InfoPageLayout";
import { BreadcrumbJsonLd, FaqSection, GuideFooter } from "../shared";

export const metadata: Metadata = {
  title: "Chess with power-ups: yes, it exists, and it is free",
  description:
    "Looking for a chess game with power-ups? Nerf Chess is a free online chess variant where you draft power-up cards every 5 moves. Learn how power-up chess works and how to start playing in your browser.",
  keywords: [
    "chess with power ups",
    "power up chess",
    "chess game with power ups",
    "is there a chess game with power ups",
    "chess power ups online",
    "buff chess",
    "chess with special abilities",
    "chess with cards and power ups",
  ],
  alternates: { canonical: "/guide/chess-with-power-ups" },
};

export default function ChessWithPowerUpsPage() {
  return (
    <InfoPageLayout
      eyebrow="guide"
      title="Chess with power-ups"
      intro="If you have ever wished chess had power-ups, this is the game. Nerf Chess is a free chess variant where, on top of the normal board and pieces, both players draft power-up cards as they play. Here is how power-up chess works and where to try it."
    >
      <BreadcrumbJsonLd title="Chess with power-ups" path="/guide/chess-with-power-ups" />

      <InfoSection title="Is there a chess game with power-ups?">
        <p>
          Yes. Nerf Chess is a browser-based chess variant built around power-ups. Its{" "}
          <Link href="/guide/buff-mode" className="underline">Buff mode</Link> is chess plus a
          card draft: nobody is handicapped, and every 5 moves both players are offered two
          power-up cards and keep one. The cards range from small conveniences, like a pawn that
          can step sideways, up to game-warping effects, like freezing an enemy piece or granting
          a knight an extra leap. It is free, needs no download, and runs in any browser.
        </p>
      </InfoSection>

      <InfoSection title="How the power-ups work">
        <p>
          A power-up in Nerf Chess is called a <strong>buff</strong>. Buffs come in three shapes.{" "}
          <strong>Passive</strong> buffs work quietly while you hold them, changing how a piece
          moves or defends. <strong>Instant</strong> buffs fire the moment you pick them, like a
          freeze or a board reveal. <strong>Activated</strong> buffs wait in your hand until you
          choose to spend them, which usually costs your turn.
        </p>
        <p>
          Power-ups get stronger as the game goes on. Every card carries a difficulty{" "}
          <Link href="/guide/glossary" className="underline">tier</Link> from I (Trivial) to VIII
          (Unhinged), and the draft climbs that ladder over the course of a game. You can also
          skip a draft to bank it, so your next offer rolls one tier higher: a small gamble on
          timing. The whole power-up library, 400+ cards and rules, lives in the{" "}
          <Link href="/codex" className="underline">codex</Link>.
        </p>
      </InfoSection>

      <InfoSection title="Two ways to play with power-ups">
        <p>
          There are two modes.{" "}
          <Link href="/guide/buff-mode" className="underline">Buff mode</Link> is pure power-up
          chess: no handicaps, just an arms race of drafted cards.{" "}
          <Link href="/guide/nerf-mode" className="underline">Nerf mode</Link> mixes power-ups
          with secret handicaps: each player starts with a hidden weakness, then drafts hexes to
          curse the opponent and boons to relieve their own rule. Both modes share the same
          twist: there is no checkmate, and you win by{" "}
          <Link href="/guide/capture-the-king" className="underline">capturing the king</Link>.
        </p>
      </InfoSection>

      <InfoSection title="Start a power-up chess game">
        <p>
          You can play the bot at <Link href="/play" className="underline">/play</Link>, get
          matched against a real opponent in the{" "}
          <Link href="/lobby" className="underline">lobby</Link>, or send a friend a
          five-character code with no account required. Pick Buff mode if you want power-ups with
          no strings attached.
        </p>
      </InfoSection>

      <FaqSection
        items={[
          {
            question: "Is there a chess game with power-ups?",
            answer:
              "Yes. Nerf Chess is a free online chess variant with power-ups. In Buff mode both players draft a power-up card every 5 moves and build the stronger army, on a standard chess board, in the browser.",
          },
          {
            question: "What kind of power-ups are in Nerf Chess?",
            answer:
              "Power-ups (called buffs) can be passive, instant, or activated. They do things like give a piece a new way to move, freeze an enemy piece, grant an extra move, or shield a piece from capture. There are over 400 cards and rules in total.",
          },
          {
            question: "Is power-up chess free to play?",
            answer:
              "Yes. Nerf Chess is completely free, runs in any browser with no download, and needs no account for bot games or friend games.",
          },
          {
            question: "Do power-ups make it less like chess?",
            answer:
              "The board, the pieces, and their moves are all standard chess. Power-ups add choices on top; engine rules (like freezes never affecting kings) keep games a fair contest rather than pure chaos.",
          },
        ]}
      />

      <GuideFooter current="/guide/chess-with-power-ups" />
    </InfoPageLayout>
  );
}
