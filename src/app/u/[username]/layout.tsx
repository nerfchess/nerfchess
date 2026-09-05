import type { Metadata } from "next";

// Public profile pages are client-rendered; this server layout gives each one
// its own title and a self-canonical so it does not inherit the root "/".
export async function generateMetadata(props: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await props.params;
  const name = decodeURIComponent(username).trim();
  return {
    title: `${name}: profile, rating and games`,
    description: `${name} on Nerf Chess: rating history in Buff and Nerf mode, recent games, cards drafted, friends and achievements.`,
    alternates: { canonical: `/u/${encodeURIComponent(name.toLowerCase())}` },
    openGraph: { title: `${name} on Nerf Chess`, url: `/u/${encodeURIComponent(name.toLowerCase())}` },
  };
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return children;
}
