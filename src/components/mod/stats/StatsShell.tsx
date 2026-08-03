"use client";

// Shared frame for the mod stats pages: top nav, the moderator gate, and the
// page heading. Gated the same way as /mod: these pages hide themselves from
// non-mods (the numbers come from /api/stats, which has always been public
// data; regular players see their own numbers on their profile instead).
//
// Children render only once the mod check passes, so anything they fetch
// (the stats payload, the lazy nerf library chunk) waits for the gate too.

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AccountUser, fetchMe } from "@/lib/authClient";

export function StatsShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  const [me, setMe] = useState<AccountUser | null | undefined>(undefined);

  useEffect(() => {
    fetchMe().then(setMe);
  }, []);

  const isMod = me && (me.role === "mod" || me.role === "admin");

  return (
    <main className="min-h-screen pb-16">
      <nav className="flex items-center justify-between px-5 sm:px-10 py-6">
        <Link href="/" className="font-display text-2xl tracking-tight">
          nerf<span className="text-gold-leaf">chess</span>
        </Link>
        <div className="flex items-center gap-3 text-sm font-medium">
          <Link href="/mod" className="px-3 py-1.5 text-parchment-100 hover:text-gold-leaf">Moderation</Link>
          <Link href="/lobby" className="px-3 py-1.5 text-parchment-100 hover:text-gold-leaf">Play</Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 py-8">
        {me === undefined ? (
          <div className="text-parchment-300">Loading…</div>
        ) : !isMod ? (
          <>
            <h1 className="font-display text-4xl">{title}</h1>
            <p className="mt-3 text-parchment-200">
              This page is for moderators.{" "}
              {!me && (
                <Link href="/login" className="text-gold-leaf hover:underline">Sign in</Link>
              )}
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl sm:text-5xl">{title}</h1>
            <p className="mt-3 text-parchment-200">{subtitle}</p>
            {children}
          </>
        )}
      </section>
    </main>
  );
}
