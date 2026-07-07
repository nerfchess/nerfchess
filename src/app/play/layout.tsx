import type { Metadata } from "next";

// /play is a client component and cannot export metadata itself, so this
// server layout carries the page's SEO. Same pattern for the other
// interactive pages (lobby, codex, ...). Keyword-rich for "play chess variant"
// and "power-up chess vs computer" style queries.
export const metadata: Metadata = {
  title: "Play Nerf Chess: chess variant vs the bot or a friend",
  description:
    "Start a Nerf Chess game in your browser. Choose Buff mode (draft power-up cards) or Nerf mode (secret handicaps), pick a bot strength or a time control, and play the computer or a friend. Free, no download.",
  keywords: [
    "play nerf chess",
    "chess variant vs computer",
    "power-up chess online",
    "buff chess bot",
    "play chess with power ups",
    "chess variant against bot",
    "free online chess variant",
  ],
  alternates: { canonical: "/play" },
  openGraph: {
    title: "Play Nerf Chess: chess variant vs the bot or a friend",
    description:
      "Start a Nerf Chess game in your browser. Buff mode drafts power-up cards, Nerf mode hides a secret handicap. Play the bot or a friend, free.",
    url: "https://nerfchess.com/play",
  },
};

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
