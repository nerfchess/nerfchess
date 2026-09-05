import type { Metadata } from "next";

// /login is a client component; this server layout supplies its metadata.
// Without it the page would inherit the root layout's canonical "/" and read
// as a duplicate of the homepage to crawlers.
export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Nerf Chess to play rated games, track your Buff and Nerf ratings, and keep your game history. Accounts are free, and friend games need no account at all.",
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
