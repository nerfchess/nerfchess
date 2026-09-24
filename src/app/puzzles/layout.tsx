import type { Metadata } from "next";
import { staticMeta } from "@/lib/seoPages";

// Full metadata from its row in src/lib/seoPages.ts (self canonical, og and
// twitter tags, the preview from this folder's opengraph-image file).
export const metadata: Metadata = staticMeta("/puzzles", { image: "segment" });

export default function PuzzlesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
