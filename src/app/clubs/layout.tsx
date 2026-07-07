import type { Metadata } from "next";

// Applies to /clubs and /clubs/[slug]; no canonical is set because it would
// wrongly point every club page at the index.
export const metadata: Metadata = {
  title: "Clubs: Nerf Chess teams and communities",
  description:
    "Find and join Nerf Chess clubs: player-run communities for the chess variant with power-up cards and secret handicaps. Post, organize games, and play with your team.",
  keywords: [
    "nerf chess clubs",
    "chess variant teams",
    "chess variant community groups",
    "chess with power ups clubs",
  ],
};

export default function ClubsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
