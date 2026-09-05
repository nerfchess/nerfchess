import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Interactive walkthrough: play your first Nerf Chess moves",
  description:
    "A guided board that walks you through capturing the king, drafting a card and using a secret nerf, one move at a time.",
  alternates: { canonical: "/tutorial/walkthrough" },
};

export default function WalkthroughLayout({ children }: { children: React.ReactNode }) {
  return children;
}
