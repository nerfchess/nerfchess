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
      intro="This page describes what information Nerf Chess collects and how it is used. Last updated: July 3, 2026."
    >
      <InfoSection title="Accounts">
        <p>
          Creating an account stores your username, a hashed version of your password
          (never the password itself), and the date the account was created. No email
          address or other contact information is required or collected.
        </p>
        <p>
          Signing in sets a session cookie so you stay logged in. Sessions expire on
          their own, and signing out removes the session immediately.
        </p>
      </InfoSection>

      <InfoSection title="Profile information">
        <p>
          Anything you add to your profile is optional and visible to other players:
          your profile picture (a preset, or an image you upload, which is cropped and
          scaled down before it is stored) and your bio. You can change or replace
          these at any time from your profile page.
        </p>
      </InfoSection>

      <InfoSection title="Games and ratings">
        <p>
          Finished online games are stored on the server: the players, moves, secret
          rules, result, clock settings, and, for rated games, the rating change. This
          record powers game history, player profiles, the leaderboard, and site-wide
          statistics. Ratings and win/loss/draw counts are public.
        </p>
        <p>
          Games played against the bots, along with your practice rating, are stored
          only in your browser and never leave your device.
        </p>
      </InfoSection>

      <InfoSection title="Chat, messages, and moderation">
        <p>
          In-game chat is delivered live to the players and spectators in that game.
          Messages that trip the profanity filter are kept for moderator review.
        </p>
        <p>
          Direct messages sent through the inbox are stored so both players can read
          the conversation. Player reports and the actions moderators take on them are
          also stored, so moderation decisions can be audited.
        </p>
      </InfoSection>

      <InfoSection title="Stored on your device">
        <p>
          Preferences such as board and piece themes, sound volume, and other settings
          are saved in your browser&apos;s local storage so they persist between visits.
          You can remove this information by clearing site data in your browser.
        </p>
      </InfoSection>

      <InfoSection title="Analytics">
        <p>
          The site uses Vercel Analytics to understand basic usage and performance.
          This data is aggregated and processed by Vercel according to its service
          practices. Nerf Chess does not run ads or sell data to anyone.
        </p>
      </InfoSection>

      <InfoSection title="Questions">
        <p>
          If you have questions about this policy or want content associated with your
          account removed, reach out through the contact page.
        </p>
      </InfoSection>
    </InfoPageLayout>
  );
}
