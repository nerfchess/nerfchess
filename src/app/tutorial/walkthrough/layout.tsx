import type { Metadata } from "next";
import { staticMeta } from "@/lib/seoPages";

// Full metadata from its row in src/lib/seoPages.ts (self canonical, og and
// twitter tags, the preview from this folder's opengraph-image file).
export const metadata: Metadata = staticMeta("/tutorial/walkthrough", { image: "segment" });

export default function WalkthroughLayout({ children }: { children: React.ReactNode }) {
  return children;
}
