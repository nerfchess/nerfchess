import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageLayout } from "@/components/InfoPageLayout";

export const metadata: Metadata = {
  title: "Community Guidelines · Nerf Chess",
  description:
    "The house rules for behavior on Nerf Chess: play fair, keep chat friendly, pick a reasonable name, and use the report tools when something is off.",
};

// The community guidelines: short, concrete, and linked from chat reports and
// the moderation flow. Rules-of-play live in the codex; this page is about
// behavior.
export default function GuidelinesPage() {
  return (
    <InfoPageLayout
      eyebrow="Community"
      title="Community guidelines"
      intro="Nerf Chess is a place to play strange, wonderful chess with strangers and friends. These are the house rules that keep it fun. Breaking them can get a name flagged, chat muted, or an account banned."
    >
      <Section title="Play fair">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>No engines, bots, or outside assistance in rated games.</li>
          <li>No rating manipulation: sandbagging, boosting, or farming a friend.</li>
          <li>Do not abuse disconnects or stalling to steal games on the clock.</li>
        </ul>
      </Section>
      <Section title="Keep chat friendly">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>No harassment, hate speech, threats, or sexual content. Ever.</li>
          <li>No spam or flooding; chat is rate-limited and filtered, but do not test it.</li>
          <li>
            You can hide chat entirely, mute individual spectators, and report any message
            from the chat panel.
          </li>
        </ul>
      </Section>
      <Section title="Pick a reasonable name">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Usernames must not be sexual, hateful, threatening, or impersonate others.</li>
          <li>
            Names that slip past the filter can be reported from any profile. A flagged name
            must be changed; the account, its ratings, games, and achievements are kept.
          </li>
        </ul>
      </Section>
      <Section title="Report, don't retaliate">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Use the Report button on profiles and chat messages. Reports go to human
            moderators; false reports in good faith carry no penalty.
          </li>
          <li>
            Moderators review before acting, so a mistaken flag can always be reversed.
            If you believe an action against you was wrong, reply from the{" "}
            <Link href="/contact" className="text-gold-leaf hover:underline">
              contact page
            </Link>
            .
          </li>
        </ul>
      </Section>
    </InfoPageLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="plate p-5">
      <h2 className="font-display text-2xl text-parchment-50">{title}</h2>
      <div className="mt-3 text-[15px] leading-relaxed text-parchment-200">{children}</div>
    </section>
  );
}
