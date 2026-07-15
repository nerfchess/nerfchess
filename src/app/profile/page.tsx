"use client";

import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchMe } from "@/lib/authClient";

// /profile is no longer a page in its own right: the public profile at
// /u/<username> is now THE profile (own and others'). This route just resolves
// "who am I" and forwards signed-in players to their own /u page; signed-out
// visitors get the sign-in prompt that used to live at the top of this page.
export default function ProfilePage() {
  const router = useRouter();
  // undefined = still resolving the session, null = signed out.
  const [account, setAccount] = useState<{ username: string } | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((me) => {
      if (cancelled) return;
      if (me) {
        // replace (not push) so Back doesn't bounce them straight back here.
        router.replace(`/u/${encodeURIComponent(me.username)}`);
        return;
      }
      setAccount(null);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="max-w-3xl mx-auto px-6 py-8">
        {account === null ? (
          <div className="plate p-4 text-sm text-parchment-300">
            <Link href="/login?next=/profile" className="text-gold-leaf hover:underline">
              Sign in
            </Link>{" "}
            to get an online rating and a profile that follows you across devices.
          </div>
        ) : (
          // Redirecting (or still resolving the session): a quiet holding state.
          <div className="plate p-5 text-sm text-parchment-400">Loading your profile…</div>
        )}
      </section>
    </main>
  );
}
