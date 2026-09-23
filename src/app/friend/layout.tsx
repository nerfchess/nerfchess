import type { Metadata } from "next";
import { staticMeta } from "@/lib/seoPages";

// A per-viewer surface: its own title and canonical, kept out of the index,
// the brand card as its preview (src/lib/seoPages.ts).
export const metadata: Metadata = staticMeta("/friend");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
