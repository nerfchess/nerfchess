import type { Metadata } from "next";
import { InfoPageLayout, InfoSection } from "@/components/InfoPageLayout";

export const metadata: Metadata = {
  title: "Privacy Policy | Nerf Chess",
};

export default function PrivacyPolicyPage() {
  return (
    <InfoPageLayout
      eyebrow="privacy policy"
      title="Privacy policy"
      intro="This page describes what information Nerf Chess stores and how it is used. Last updated: July 3, 2026."
    >
      <InfoSection title="Your account">
        <p>
          Creating an account stores your username, a hashed password (never the password
          itself), your account creation date, and your rating data. Signing in sets an
          httpOnly session cookie so you stay signed in; signing out removes it. Optional
          profile content you add, such as a bio or an uploaded profile picture, is stored
          with your account and shown publicly on your player page.
        </p>
      </InfoSection>

      <InfoSection title="Games and ratings">
        <p>
          Finished online games are recorded: the players, moves, time control, result, and
          rating changes. This powers game history, replays, profile statistics, and the
          leaderboard. Your username, rating, game record, and statistics are publicly
          visible on your player page.
        </p>
      </InfoSection>

      <InfoSection title="Messages, challenges, and notifications">
        <p>
          Direct messages you send to other players are stored so both participants can read
          the conversation, along with read status. Challenges you send and notifications
          addressed to you (new messages, challenges, and moderation notices) are also
          stored. In-game chat is relayed live; messages that trip the profanity filter are
          kept for moderator review.
        </p>
      </InfoSection>

      <InfoSection title="Moderation">
        <p>
          Player reports, moderation actions (warnings, mutes, bans), and their audit trail
          are stored to keep the site playable and fair. Moderators can see reported content
          and account standing, but not your password or private data beyond what is
          described above.
        </p>
      </InfoSection>

      <InfoSection title="Stored on your device">
        <p>
          Board appearance, sound preferences, custom rules, and your practice rating
          against the bots are saved in your browser&apos;s local storage so those features
          work without an account. You can remove this information by clearing site data in
          your browser.
        </p>
      </InfoSection>

      <InfoSection title="Removing your data">
        <p>
          To have your account or its content removed, reach out via the contact page and
          we will handle it.
        </p>
      </InfoSection>
    </InfoPageLayout>
  );
}
