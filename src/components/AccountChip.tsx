"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { PlayerAvatar } from "@/components/PlayerAvatar";

// Small nav element: "Sign in" when logged out, username + rating when
// logged in (links to the profile page).
export function AccountChip() {
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((me) => {
      if (!cancelled) setUser(me);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (user === undefined) return <span className="px-3 py-1.5 text-sm">&nbsp;</span>;

  if (!user) {
    return (
      <Link
        href="/login"
        className="px-3 py-1.5 rounded-full text-sm font-display border border-gold/40 text-gold-leaf hover:bg-gold/10 transition"
      >
        Sign in
      </Link>
    );
  }

  return (
    <Link
      href={`/u/${user.username}`}
      className="inline-flex items-center gap-2 px-2 py-1 pr-3 rounded-full text-sm font-display border border-white/15 text-parchment hover:border-gold/50 hover:text-gold-leaf transition"
      title="Your profile"
    >
      <PlayerAvatar name={user.username} avatar={user.avatar} size={22} className="rounded-full" />
      {user.username}
      <span className="text-parchment-400"> · {Math.round(user.rating)}</span>
    </Link>
  );
}
