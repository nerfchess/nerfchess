import type { Metadata } from "next";
import { clubMeta } from "@/lib/seoDynamic";

// Metadata only: the club's own title, description and canonical (it used to
// inherit the clubs index and the site canonical, F231 and F237). An unknown
// slug is noindex.
export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  return clubMeta(slug);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
