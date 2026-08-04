import type { Metadata } from "next";

// /analysis is a client component; this server layout supplies its metadata.
// Without it the page would inherit the root layout's canonical "/" and read
// as a duplicate of the homepage to crawlers.
export const metadata: Metadata = {
  title: "Analysis board",
  description:
    "Set up any Nerf Chess position on a free analysis board. Replay games, test buff and hex lines, and explore the variant's capture-the-king rules move by move.",
  alternates: { canonical: "/analysis" },
};

export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
