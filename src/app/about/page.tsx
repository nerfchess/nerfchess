import type { Metadata } from "next";
import { InfoPageLayout, InfoSection } from "@/components/InfoPageLayout";
import { LinkButton } from "@/components/ui/Button";
import { TeamSection } from "@/components/TeamSection";
import { staticMeta } from "@/lib/seoPages";

export const metadata: Metadata = staticMeta("/about", { image: "segment" });

export default function AboutPage() {
  return (
    <InfoPageLayout
      eyebrow="about"
      title="Chess, with secrets."
      intro="Nerf Chess keeps the familiar board and offers two ways to bend it. In Nerf mode every player carries a secret rule, so every move becomes both strategy and investigation. In Buff mode nobody is handicapped and the deck deals power instead."
    >
      <InfoSection title="The idea">
        <p>
          Standard chess rewards calculation. Nerf Chess adds deduction: a move your
          opponent avoids may reveal as much as the move they choose.
        </p>
        <p>
          Kings can be captured, checkmate is not the ending, and unusual rules can turn
          ordinary positions into puzzles that only exist for one game.
        </p>
        <p>
          The two modes split the idea in half. In Nerf mode you pick your secret handicap
          from two cards, your opponent&apos;s stays hidden until the game ends, and a draft
          every 5 moves deals hexes to curse your opponent (plus the odd boon or item for
          yourself); the curse war is the game. In Buff mode nobody is handicapped: both
          players draft buffs every 5 moves and race to build the strongest army.
        </p>
      </InfoSection>

      <TeamSection />

      <InfoSection title="Play your way">
        <p>
          Practice against the computer, create a private game for a friend, or browse the
          rule library before you sit down at the board.
        </p>
        <div className="pt-2 flex flex-wrap gap-3">
          <LinkButton tone="leaf" href="/play" className="px-5 py-2.5">
            Start a game
          </LinkButton>
          <LinkButton tone="ghost" href="/tutorial" className="px-5 py-2.5">
            Read the rules
          </LinkButton>
        </div>
      </InfoSection>
    </InfoPageLayout>
  );
}
