import type { Metadata } from "next";
import { historyMeta } from "@/lib/seoDynamic";

// Metadata only: a local replay has its own canonical and title instead of
// inheriting /history's, and stays out of the index.
export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  return historyMeta(id);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
