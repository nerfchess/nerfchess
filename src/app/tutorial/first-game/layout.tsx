import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your first game: a guided Nerf Chess match",
  description: "Play a first guided game of Nerf Chess against the computer with hints on drafting and using cards.",
  alternates: { canonical: "/tutorial/first-game" },
};

export default function FirstGameLayout({ children }: { children: React.ReactNode }) {
  return children;
}
