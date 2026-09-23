import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageLayout, InfoSection } from "@/components/InfoPageLayout";
import { staticMeta } from "@/lib/seoPages";

export const metadata: Metadata = staticMeta("/privacy-policy");

function ContactLink({ children }: { children: React.ReactNode }) {
  return (
    <Link href="/contact" className="text-gold-leaf hover:underline">
      {children}
    </Link>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <InfoPageLayout
      eyebrow="privacy policy"
      title="Privacy policy"
      intro={
        <>
          This Privacy Policy explains how Nerf Chess (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects, uses, and protects your
          information when you use nerfchess.com and its related services (the
          &ldquo;Service&rdquo;). By using the Service, you agree to the practices
          described in this policy. Last updated: September 23, 2026.
        </>
      }
    >
      <InfoSection title="Information we collect">
        <p>
          We collect only the information needed to operate the Service. When you
          create an account, we store your username, a cryptographically hashed
          version of your password (we never store or have access to your password
          itself), the date the account was created and registered, and your
          rating data.
        </p>
        <p>
          Depending on how you use the Service, we may also store:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-parchment">Your email address</strong>, if you
            add one when you register or sign in with Google. It is optional, it is
            never shown to other players, and we use it only for the emails
            described below. When you sign in with Google we also store your Google
            account ID so the same Google account signs you in next time.
          </li>
          <li>
            <strong className="text-parchment">Guest accounts.</strong> If you play
            without signing in, we create a guest account with a generated name so
            your games and ratings work. It holds the same gameplay data as any
            account and becomes your account if you register later.
          </li>
          <li>
            <strong className="text-parchment">Profile content</strong> you choose
            to add, such as a bio or profile picture. This content is displayed
            publicly on your player page.
          </li>
          <li>
            <strong className="text-parchment">Gameplay data</strong>, including
            the moves, participants, cards, time control, result, and rating
            changes of finished online games. This powers game history, replays,
            statistics, and the leaderboard.
          </li>
          <li>
            <strong className="text-parchment">Communications</strong>, including
            direct messages you exchange with other players (along with read
            status), club posts, challenges you send, and notifications addressed
            to you. In-game chat is relayed live and is not generally retained;
            messages flagged by our automated profanity filter are kept for
            moderator review.
          </li>
          <li>
            <strong className="text-parchment">Settings and activity.</strong> When
            you are signed in, your site settings are saved to your account so they
            follow you between devices, and we record when you were last online
            (you can hide your online status from other players when you edit your profile).
          </li>
          <li>
            <strong className="text-parchment">Card suggestions</strong> you send
            through the suggestion form, with any contact detail you choose to
            include.
          </li>
          <li>
            <strong className="text-parchment">Moderation records</strong>, such
            as player reports you submit or that are submitted about you, and any
            resulting moderation actions.
          </li>
          <li>
            <strong className="text-parchment">Your IP address</strong>, used to
            limit repeated sign-in attempts, guest account creation, and some
            forms. It is stored with an attempt counter for that purpose only and
            is not attached to your profile.
          </li>
        </ul>
        <p>
          We do not collect real names, phone numbers, payment information, or
          precise location data.
        </p>
      </InfoSection>

      <InfoSection title="How we use your information">
        <p>We use the information described above to:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Provide, maintain, and improve the Service;</li>
          <li>
            Operate matchmaking, calculate ratings, and display game history,
            statistics, and leaderboards;
          </li>
          <li>
            Enforce our community standards, investigate reports, and keep the
            Service safe and fair through moderation and abuse limits;
          </li>
          <li>Send the emails described in the next section;</li>
          <li>Respond to inquiries and requests you send us.</li>
        </ul>
        <p>
          We do not use your information for advertising, and we do not build
          marketing profiles of our users.
        </p>
      </InfoSection>

      <InfoSection title="Emails we send">
        <p>
          If your account has an email address, we send you one welcome email
          shortly after you register, with how to play your first game. We do not
          send newsletters or marketing email, and we do not share your address
          with anyone else.
        </p>
        <p>
          Every email we send says who it is from, gives our mailing address and
          contact details, and has a one-click unsubscribe link. You can also turn
          email off, or back on, at any time under &ldquo;Emails from Nerf
          Chess&rdquo; in <Link href="/settings" className="text-gold-leaf hover:underline">settings</Link>.
          Once you unsubscribe we do not email you again.
        </p>
        <p>
          Two internal emails also carry player information. When you send a card
          suggestion, it is emailed to our team with your username and any contact
          detail you added. Our founders receive a daily summary that lists the
          usernames of new sign-ups alongside site-wide totals.
        </p>
      </InfoSection>

      <InfoSection title="Cookies and local storage">
        <p>
          We use only essential cookies, and no tracking, advertising, or
          third-party analytics cookies:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-parchment">dc_session</strong>, an httpOnly
            cookie that keeps you signed in (including as a guest) for up to 90
            days. It is removed when you sign out.
          </li>
          <li>
            <strong className="text-parchment">dc_oauth_state</strong>, set only
            for the few minutes of a Google sign-in to protect it against forgery.
          </li>
          <li>
            <strong className="text-parchment">nc_who</strong>, which holds your
            username, avatar, role, and whether you are a guest, so pages can show
            the right header before they finish loading. It grants no access.
          </li>
          <li>
            <strong className="text-parchment">nc_mode</strong>, which remembers
            the game mode you picked last.
          </li>
        </ul>
        <p>
          We also use your browser&apos;s local storage to save preferences on
          your device, such as board appearance, sound settings, custom rules, and
          your practice rating against the bots. When you are signed in, your
          settings are also saved to your account. A background image you upload
          stays on your device only. You can remove local data at any time by
          clearing site data in your browser.
        </p>
      </InfoSection>

      <InfoSection title="How we share information">
        <p>
          We do not sell your personal information, and we do not share it with
          advertisers or third-party analytics providers. Information is shared
          only in the following limited circumstances:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-parchment">Publicly, by design.</strong> Your
            username, rating, game record, statistics, and any optional profile
            content are visible to other users of the Service.
          </li>
          <li>
            <strong className="text-parchment">Service providers.</strong> These
            process data on our behalf solely to run the Service: Cloudflare
            (hosting, our main database, and the Turnstile check on the sign-up
            form), Oracle Cloud (the archive of finished games and our game-engine
            servers), Resend (delivering our emails, so it receives the recipient
            address and the message), and Google (only if you choose Continue with
            Google, to confirm your Google account and email address). When
            enabled, moderator actions, including the usernames involved, are also
            logged to a private Google Sheet our moderators use.
          </li>
          <li>
            <strong className="text-parchment">Images you link.</strong> If you set
            a background image by URL, your browser loads it directly from that
            website, which can see your IP address like any site you visit.
          </li>
          <li>
            <strong className="text-parchment">Legal requirements.</strong> We may
            disclose information if required to do so by law or in response to a
            valid legal request.
          </li>
        </ul>
      </InfoSection>

      <InfoSection title="Data retention">
        <p>
          We retain your information for as long as your account is active or as
          needed to provide the Service. Completed game records are retained to
          preserve the integrity of ratings, statistics, and opponents&apos; game
          histories. We keep a record of which emails were sent to which account
          so that no email is sent twice. Moderation records may be retained after
          account closure where necessary to keep the platform safe, such as to
          enforce bans.
        </p>
      </InfoSection>

      <InfoSection title="Security">
        <p>
          We take reasonable measures to protect your information. Passwords are
          stored only in hashed form, and connections to the Service are encrypted
          in transit using HTTPS. However, no method of transmission or storage is
          completely secure, and we cannot guarantee absolute security. Please use
          a strong, unique password for your account.
        </p>
      </InfoSection>

      <InfoSection title="Your rights and choices">
        <p>
          You can view the information shown publicly about you on your player
          page, and you can edit or remove your optional profile content at any
          time from your profile settings. You can stop our emails with the
          unsubscribe link in any email or in settings.
        </p>
        <p>
          To request deletion of your account or the personal information
          associated with it, contact us via the{" "}
          <ContactLink>contact page</ContactLink> and we will process your request.
          Depending on where you live, you may have additional rights under
          applicable data protection law, such as the right to access, correct, or
          delete your personal information; you can exercise these rights the same
          way.
        </p>
      </InfoSection>

      <InfoSection title="Children's privacy">
        <p>
          The Service is not directed at children under the age of 13, and we do
          not knowingly collect personal information from them. An account needs
          only a username and password, and an email address is optional. If you
          believe a child under 13 has provided us with personal information,
          please contact us and we will remove it.
        </p>
      </InfoSection>

      <InfoSection title="Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. When we do, we will
          post the revised version on this page and update the &ldquo;Last
          updated&rdquo; date above. Your continued use of the Service after
          changes take effect constitutes acceptance of the updated policy.
        </p>
      </InfoSection>

      <InfoSection title="Contact us">
        <p>
          If you have questions about this Privacy Policy or how your information
          is handled, please reach out through our{" "}
          <ContactLink>contact page</ContactLink>.
        </p>
      </InfoSection>
    </InfoPageLayout>
  );
}
