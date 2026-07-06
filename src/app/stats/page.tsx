"use client";

// /stats no longer hosts the site-wide numbers (those moved to the moderation
// area at /mod/stats). It now sends players to their own numbers: signed-in
// visitors land on their profile (ratings, record, statistics, achievements),
// signed-out visitors land on the achievements wall.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchMe } from "@/lib/authClient";

export default function StatsRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((me) => {
      if (cancelled) return;
      router.replace(me ? `/u/${encodeURIComponent(me.username)}` : "/achievements");
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="min-h-screen grid place-items-center">
      <p className="text-parchment-300/60">Redirecting…</p>
    </main>
  );
}
