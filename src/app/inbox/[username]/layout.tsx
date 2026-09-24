import type { Metadata } from "next";
import { inboxMeta } from "@/lib/seoDynamic";

// Metadata only: a conversation has its own canonical (it inherited /inbox's)
// and stays out of the index.
export async function generateMetadata(props: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await props.params;
  return inboxMeta(username);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
