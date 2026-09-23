import type { Metadata } from "next";
import { staticMeta } from "@/lib/seoPages";

// /login is a client component; this server layout supplies its metadata
// (src/lib/seoPages.ts), with its own canonical and the brand card preview.
export const metadata: Metadata = staticMeta("/login");

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
