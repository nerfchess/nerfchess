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

  // A guest is a throwaway account: it has a name and a live rating but no way
  // to sign back in, so the chip must never behave like a real account. It
  // never offers "sign out" (which would silently discard the identity):
  // instead it marks the name as a guest and leads to registration, which
  // upgrades this same account and keeps the name and rating.
  if (user.isGuest) {
    return (
      <Link
        href="/login?upgrade=1"
        title="Sign in or register to keep this name and rating"
        className="inline-flex min-h-[40px] max-w-full items-center gap-2 px-2 py-1 pr-3 rounded-full text-sm font-display border border-gold/40 text-parchment hover:bg-gold/10 hover:border-gold/60 hover:text-gold-leaf transition"
      >
        <PlayerAvatar name={user.username} avatar={user.avatar} size={22} className="rounded-full" />
        <span className="max-w-[6.5rem] truncate">{user.username}</span>
        <span className="shrink-0 border border-white/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-parchment-400">
          guest
        </span>
        <span className="shrink-0 text-gold-leaf">Save rating</span>
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
      {/* The live displayed rating (shared rule: best mode bucket), never the
          frozen legacy column, so the chip agrees with profile/leaderboard. */}
      <span className="text-parchment-400"> · {Math.round(user.displayRating ?? user.rating)}</span>
    </Link>
  );
}
