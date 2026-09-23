import type { Metadata } from "next";
import { InfoPageLayout, InfoSection } from "@/components/InfoPageLayout";
import { LinkButton } from "@/components/ui/Button";
import { SOCIAL_LINKS } from "@/components/SocialsRow";
import { staticMeta } from "@/lib/seoPages";

export const metadata: Metadata = staticMeta("/contact");

/** "Join the Discord" for the server invite, "@handle on Instagram" for the
 *  accounts, with the handle read from the shared link so it cannot drift. */
function socialCta(href: string, label: string): string {
  if (label === "Discord") return "Join the Discord";
  const last = new URL(href).pathname.split("/").filter(Boolean).pop() ?? "";
  return last ? `${last.startsWith("@") ? last : `@${last}`} on ${label}` : label;
}

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
          Nerf Chess Discord server. You can also find updates and clips on
          Instagram, TikTok, and YouTube.
        </p>
        <div className="pt-2 flex flex-wrap gap-3">
          {SOCIAL_LINKS.map(({ href, label }) => (
            <LinkButton
              key={href}
              tone={label === "Discord" ? "leaf" : "ghost"}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5"
            >
              {socialCta(href, label)}
            </LinkButton>
          ))}
        </div>
      </InfoSection>

      <InfoSection title="Looking for help playing?">
        <p>
          The tutorial explains the changed win conditions and hidden-rule format, while
          the FAQ answers the most common first-game questions.
        </p>
        <div className="pt-2 flex flex-wrap gap-3">
          <LinkButton tone="leaf" href="/tutorial" className="px-5 py-2.5">
            How to play
          </LinkButton>
          <LinkButton tone="ghost" href="/faq" className="px-5 py-2.5">
            Read the FAQ
          </LinkButton>
        </div>
      </InfoSection>
    </InfoPageLayout>
  );
}
