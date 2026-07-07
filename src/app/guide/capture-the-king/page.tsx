import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageLayout, InfoSection } from "@/components/InfoPageLayout";
import { BreadcrumbJsonLd, FaqSection, GuideFooter } from "../shared";

export const metadata: Metadata = {
  title: "Capture the king: chess with no checkmate",
  description:
    "Capture-the-king chess replaces checkmate with a simpler rule: you win by actually taking the enemy king. Learn how no-checkmate chess works in Nerf Chess, why the king becomes a real piece, and how it changes play.",
  keywords: [
    "capture the king chess",
    "chess capture the king",
    "no checkmate chess",
    "chess win by capturing king",
    "chess without checkmate",
    "king capture chess variant",
    "chess no stalemate",
  ],
  alternates: { canonical: "/guide/capture-the-king" },
};

export default function CaptureTheKingPage() {
  return (
    <InfoPageLayout
      eyebrow="guide"
      title="Capture the king"
      intro="Nerf Chess drops the most abstract rule in chess. There is no checkmate and no stalemate: you win by physically capturing the enemy king. It sounds like a small change, but it reshapes the whole endgame."
    >
      <BreadcrumbJsonLd title="Capture the king" path="/guide/capture-the-king" />

      <InfoSection title="What capture-the-king means">
        <p>
          In standard chess the game ends at checkmate, an abstraction: the king is never
          actually taken, it is merely proven that it could be. Nerf Chess removes the
          abstraction. The game ends only when a king is genuinely captured, when a{" "}
          <Link href="/guide/nerf-mode" className="underline">nerf</Link> triggers a lose
          condition, or when a player resigns. There is no check to announce, no mate to declare,
          and no stalemate to draw.
        </p>
      </InfoSection>

      <InfoSection title="The king becomes a real piece">
        <p>
          Because only capture ends the game, the king stops being a protected abstraction and
          becomes a piece like any other. It can move into attacked squares. It can castle
          through, into, or out of check. You are never forced to answer a threat to it. All of
          that is legal, and all of it is usually fatal: leaving your king where it can be taken
          loses on the spot, so vigilance replaces the check rule entirely.
        </p>
      </InfoSection>

      <InfoSection title="Why it changes how you play">
        <p>
          Capture-the-king rules make blunders lethal and endgames sharper. There is no safety
          net: a king walk that would be illegal in normal chess is available here, which opens up
          daring escapes and brutal punishments alike. It also simplifies the rulebook, since
          check, checkmate, and stalemate all disappear, which is part of why Nerf Chess can
          layer power-up cards and secret handicaps on top without the rules collapsing.
        </p>
        <p>
          The same win condition holds in both modes:{" "}
          <Link href="/guide/nerf-mode" className="underline">Nerf mode</Link> with its secret
          handicaps and <Link href="/guide/buff-mode" className="underline">Buff mode</Link> with
          its <Link href="/guide/chess-with-power-ups" className="underline">power-up cards</Link>.
          Buff-granted moves can race toward the king but never dodge the goal.
        </p>
      </InfoSection>

      <InfoSection title="Try it">
        <p>
          See how differently a game plays when the king can be taken: play the bot at{" "}
          <Link href="/play" className="underline">/play</Link> or a real opponent in the{" "}
          <Link href="/lobby" className="underline">lobby</Link>. The full house rules are in the{" "}
          <Link href="/guide/how-to-play" className="underline">how-to-play guide</Link>.
        </p>
      </InfoSection>

      <FaqSection
        items={[
          {
            question: "What is capture-the-king chess?",
            answer:
              "A chess variant where you win by actually capturing the enemy king instead of by checkmate. Nerf Chess uses this rule: there is no checkmate and no stalemate, and the game ends when a king is taken.",
          },
          {
            question: "Can the king move into check if there is no checkmate?",
            answer:
              "Yes. Since only capture ends the game, the king may move into attacked squares and castle through, into, or out of check. It is legal, just usually fatal.",
          },
          {
            question: "Is there stalemate in capture-the-king chess?",
            answer:
              "No. There is no stalemate. If effects ever leave a player with no legal move their turn passes automatically, and mutual paralysis is a draw, but a lack of moves never ends the game the way stalemate does.",
          },
          {
            question: "Where can I play capture-the-king chess?",
            answer:
              "Nerf Chess at nerfchess.com uses capture-the-king rules in both of its modes. It is free, runs in the browser, and needs no account for bot or friend games.",
          },
        ]}
      />

      <GuideFooter current="/guide/capture-the-king" />
    </InfoPageLayout>
  );
}
