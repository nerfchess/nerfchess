import type { Metadata } from "next";
import { gameMeta } from "@/lib/seoDynamic";

// Metadata only: "white vs black: result" for a finished game, "live now"
// for one in progress, from the archive and the public lobby list. Kept out
// of the index; the preview card is this folder's opengraph-image.
export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await props.params;
  return gameMeta(id);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
