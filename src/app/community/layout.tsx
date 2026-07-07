import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community: Nerf Chess players, clubs, and live games",
  description:
    "See who is playing Nerf Chess right now: top-rated players, the busiest members, live games, clubs, and recent results across Buff and Nerf mode.",
  keywords: [
    "nerf chess community",
    "chess variant players",
    "chess variant clubs",
    "online chess variant community",
  ],
  alternates: { canonical: "/community" },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
