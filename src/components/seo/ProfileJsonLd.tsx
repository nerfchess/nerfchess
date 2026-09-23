import { profileSummary } from "@/lib/server/ogData";
import { ProfilePageJsonLd } from "./JsonLd";

// Streams the ProfilePage structured data for /u/[username] (rendered inside a
// Suspense boundary by the route layout, so the account read never delays the
// page shell). Unknown, banned and guest accounts get none: they are noindex.
export async function ProfileJsonLd({ username }: { username: string }) {
  let raw = username;
  try {
    raw = decodeURIComponent(username);
  } catch {}
  const p = await profileSummary(raw, { cards: false });
  if (!p || p.guest) return null;
  return <ProfilePageJsonLd username={p.username} games={p.games} ratings={p.ratings} />;
}
