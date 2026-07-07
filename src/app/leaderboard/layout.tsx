import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard: the top Nerf Chess players",
  description:
    "The Nerf Chess leaderboard ranks the strongest players in each rated pool. Buff mode and Nerf mode keep separate ratings, so climb the board in the mode you play best.",
  keywords: [
    "nerf chess leaderboard",
    "chess variant rankings",
    "chess variant ratings",
    "top chess variant players",
  ],
  alternates: { canonical: "/leaderboard" },
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
