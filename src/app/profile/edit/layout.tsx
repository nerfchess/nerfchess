import type { Metadata } from "next";

// Sibling client pages (achievements, tournaments, ...) keep their document
// title / SEO in a tiny server layout so the "use client" page can stay lean.
export const metadata: Metadata = {
  title: "Edit profile: picture, flair, bio, and privacy",
  description:
    "Customize your Nerf Chess profile: choose a picture or upload your own, pick a flair, write a bio, and control who can see your friends list and online status.",
  robots: { index: false },
  alternates: { canonical: "/profile/edit" },
};

export default function EditProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
