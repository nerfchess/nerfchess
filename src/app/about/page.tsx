import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageLayout, InfoSection } from "@/components/InfoPageLayout";

export const metadata: Metadata = {
  title: "About | Nerf Chess",
};

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

      <InfoSection title="Play your way">
        <p>
          Practice against the computer, create a private game for a friend, or browse the
          rule library before you sit down at the board.
        </p>
        <div className="pt-2 flex flex-wrap gap-3">
          <Link href="/play" className="px-5 py-2.5 rounded-sm btn-leaf font-display">
            Start a game
          </Link>
          <Link href="/tutorial" className="px-5 py-2.5 rounded-sm btn-ghost font-display">
            Read the rules
          </Link>
        </div>
      </InfoSection>
    </InfoPageLayout>
  );
}
