import type { Metadata } from "next";
import { puzzleMeta } from "@/lib/seoPuzzles";

// One puzzle, one URL, one canonical, and a title that names the puzzle
// (src/lib/seoPuzzles.ts reads the same corpus the page fetches). An id that
// is not in the corpus is noindex.
export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  return puzzleMeta(id);
}

export default function PuzzleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
