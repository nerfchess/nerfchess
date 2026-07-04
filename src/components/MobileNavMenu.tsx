"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { PlayerAvatar } from "@/components/PlayerAvatar";

// Every top-level destination, so the mobile bar never needs inline links.
const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/play", label: "New game" },
  { href: "/friend", label: "Play a friend" },
  { href: "/lobby", label: "Lobby" },
  { href: "/puzzles", label: "Puzzles" },
  { href: "/tv", label: "Watch TV" },
  { href: "/analysis", label: "Analysis board" },
  { href: "/clubs", label: "Clubs" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/history", label: "Game history" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/codex", label: "Rules" },
  { href: "/tutorial", label: "How to play" },
];

/**
 * Mobile-only (below `sm`) hamburger for the top bar. The per-page navs keep
 * their inline text links on desktop but hide them on phones, where they
 * overflowed narrow screens (the nav row was the site's horizontal-scroll
 * culprit); this puts every destination plus the account entry behind one
 * fixed-width button instead.
 */
export function MobileNavMenu() {
  const [open, setOpen] = useState(false);
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

  return (
    <div className="relative sm:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center btn-ghost"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-black/40"
          />
          {/* !absolute / !z-50: the .plate helper hard-codes position:relative
              and z-index:2 later in the cascade, so plain utilities lose. */}
          <div className="!absolute right-0 top-full !z-50 mt-2 w-56 plate border border-white/10 py-1.5 shadow-xl">
            <Link
              href={user ? `/u/${user.username}` : "/login"}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 font-display text-sm text-gold-leaf hover:bg-white/5"
            >
              {user ? (
                <>
                  <PlayerAvatar name={user.username} avatar={user.avatar} size={22} className="rounded-full" />
                  <span className="min-w-0 truncate">{user.username}</span>
                  <span className="ml-auto shrink-0 font-mono text-xs text-parchment-400">
                    {Math.round(user.rating)}
                  </span>
                </>
              ) : (
                "Sign in"
              )}
            </Link>
            <div className="mx-3 my-1 h-px bg-white/10" />
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-parchment-100 hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <>
                <div className="mx-3 my-1 h-px bg-white/10" />
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 text-sm font-medium text-parchment-100 hover:bg-white/5"
                >
                  Profile &amp; settings
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
