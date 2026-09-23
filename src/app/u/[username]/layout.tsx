import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileJsonLd } from "@/components/seo/ProfileJsonLd";
import { profileMeta } from "@/lib/seoDynamic";

// Public profiles are client-rendered; this server layout gives each one its
// own title (from the account: ratings per mode, games played), a canonical
// on the lowercase name, and noindex for unknown names and guest accounts, so
// /u/<anything> is no longer an indexable page for a player who does not
// exist (F237). The preview is this folder's opengraph-image.
export async function generateMetadata(props: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await props.params;
  return profileMeta(username);
}

export default async function UserLayout(props: { children: React.ReactNode; params: Promise<{ username: string }> }) {
  const { username } = await props.params;
  return (
    <>
      <Suspense fallback={null}>
        <ProfileJsonLd username={username} />
      </Suspense>
      {props.children}
    </>
  );
}
