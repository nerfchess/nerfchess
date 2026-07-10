import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageLayout, InfoSection } from "@/components/InfoPageLayout";

export const metadata: Metadata = {
  title: "Contact | Nerf Chess",
};

export default function ContactPage() {
  return (
    <InfoPageLayout
      eyebrow="contact"
      title="Get in touch"
      intro="Have a rule idea, found a confusing position, or spotted something that needs fixing? Feedback is welcome as Nerf Chess develops."
    >
      <InfoSection title="Contact channel">
        <p>
          The best place to share feedback, report bugs, or talk strategy is the
          Nerf Chess Discord server. You can also find updates on Instagram.
        </p>
        <div className="pt-2 flex flex-wrap gap-3">
          <a
            href="https://discord.gg/a5bJYFrTx"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-sm btn-leaf font-display"
          >
            Join the Discord
          </a>
          <a
            href="https://www.instagram.com/officialnerfchess"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-sm btn-ghost font-display"
          >
            @nerfchess on Instagram
          </a>
        </div>
      </InfoSection>

      <InfoSection title="Looking for help playing?">
        <p>
          The tutorial explains the changed win conditions and hidden-rule format, while
          the FAQ answers the most common first-game questions.
        </p>
        <div className="pt-2 flex flex-wrap gap-3">
          <Link href="/tutorial" className="px-5 py-2.5 rounded-sm btn-leaf font-display">
            How to play
          </Link>
          <Link href="/faq" className="px-5 py-2.5 rounded-sm btn-ghost font-display">
            Read the FAQ
          </Link>
        </div>
      </InfoSection>
    </InfoPageLayout>
  );
}
