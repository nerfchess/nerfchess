import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Achievements: Nerf Chess badges and milestones",
  description:
    "Every Nerf Chess achievement in one place. Unlock badges for winning with power-up cards, surviving brutal nerfs, capturing kings, and mastering both Buff and Nerf mode.",
  keywords: [
    "nerf chess achievements",
    "chess variant badges",
    "chess with power ups achievements",
  ],
  alternates: { canonical: "/achievements" },
};

export default function AchievementsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
