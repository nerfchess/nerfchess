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
import { ModShell } from "@/components/mod/ModShell";

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
    <ModShell title={title} isAdmin={me?.role === "admin"}>
      {me === undefined ? (
        <p className="text-sm text-parchment-400">Loading…</p>
      ) : !isMod ? (
        <p className="text-parchment-200">
          This page is for moderators.{" "}
          {!me && (
            <Link href="/login" className="text-parchment-50 hover:underline">
              Sign in
            </Link>
          )}
        </p>
      ) : (
        <>
          <p className="text-[13px] text-parchment-400">{subtitle}</p>
          {children}
        </>
      )}
    </ModShell>
  );
}
