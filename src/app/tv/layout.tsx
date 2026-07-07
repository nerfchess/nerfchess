import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nerf Chess TV: watch live chess-variant games",
  description:
    "Watch live Nerf Chess games as they happen. See secret handicaps and drafted power-up cards play out in real time in Buff and Nerf mode. Free to spectate in your browser.",
  keywords: [
    "watch chess variant",
    "nerf chess tv",
    "live chess variant games",
    "spectate chess with power ups",
  ],
  alternates: { canonical: "/tv" },
};

export default function TvLayout({ children }: { children: React.ReactNode }) {
  return children;
}
