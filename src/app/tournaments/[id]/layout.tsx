import type { Metadata } from "next";
import { tournamentMeta } from "@/lib/seoDynamic";

// Metadata only: the event's own title, description and canonical. An
// unknown id is noindex.
export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  return tournamentMeta(id);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
