import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suggest a rule: propose a nerf, buff, hex or boon",
  description:
    "Have an idea for a Nerf Chess card? Suggest a new nerf, buff, hex or boon and the team will review it for the codex.",
  alternates: { canonical: "/codex/suggest" },
};

export default function SuggestLayout({ children }: { children: React.ReactNode }) {
  return children;
}
