"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { PlayerAvatar } from "@/components/PlayerAvatar";

type MobileNavItem = { href: string; label: string; className?: string };
type MobileNavGroup = { header: string; items: MobileNavItem[] };

// Grouped destinations mirror the desktop header sections (Play / Watch /
// Community) plus a "You" group for personal pages. Every destination the old
// flat list reached stays reachable; friend challenges now route through the
// lobby friends tab, matching the desktop Play menu.
function buildGroups(user: AccountUser | null | undefined): MobileNavGroup[] {
  return [
    {
      header: "Play",
      items: [
        { href: "/lobby", label: "New game" },
        { href: "/play", label: "Practice vs computer" },
        { href: "/lobby?tab=friends", label: "Challenge a friend" },
        { href: "/tournaments", label: "Tournaments" },
      ],
    },
    {
      header: "Watch",
      items: [
        { href: "/tv?mode=nerf", label: "Nerf TV", className: "text-mode-nerfGlow" },
        { href: "/tv?mode=buff", label: "Buff TV", className: "text-mode-buffGlow" },
      ],
    },
    {
      header: "Community",
      items: [
        { href: "/community", label: "Community hub" },
        { href: "/clubs", label: "Clubs" },
        { href: "/leaderboard", label: "Leaderboard" },
      ],
    },
    {
      header: "You",
      items: [
        { href: user ? `/u/${encodeURIComponent(user.username)}` : "/login", label: "Profile" },
        { href: "/history", label: "Game history" },
        { href: "/achievements", label: "Achievements" },
        { href: "/analysis", label: "Analysis board" },
        { href: "/codex", label: "Rules" },
        { href: "/tutorial", label: "How to play" },
      ],
    },
  ];
}

// An item highlights when the current path matches its base path (or a subpath
// of it). Query-variant entries (e.g. the two TV modes) share a base path, so
// pathname alone cannot tell them apart; they never self-highlight rather than
// lighting up together and reading as ambiguous.
function itemActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  const [path, query] = href.split("?");
  if (query) return false;
  return pathname === path || pathname.startsWith(path + "/");
}

/**
 * Mobile-only (below `sm`) hamburger for the top bar. The per-page navs keep
 * their inline text links on desktop but hide them on phones, where they
 * overflowed narrow screens (the nav row was the site's horizontal-scroll
 * culprit); this puts every destination plus the account entry behind one
 * fixed-width button instead.
 */
export function MobileNavMenu({
  align = "right",
  hideAt = "sm",
}: {
  // Which edge the dropdown anchors to. Use "left" when the button sits at the
  // far left of the bar (e.g. left of the logo) so the panel opens on-screen.
  align?: "left" | "right";
  // Hide the hamburger at and above this breakpoint. Match it to the sibling
  // desktop nav's breakpoint so there is never a width with neither visible.
  hideAt?: "sm" | "md";
} = {}) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((me) => {
      if (!cancelled) setUser(me);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Static class strings (Tailwind cannot see interpolated class names).
  const hideClass = hideAt === "md" ? "md:hidden" : "sm:hidden";
  const anchorClass = align === "left" ? "left-0" : "right-0";

  const groups = buildGroups(user);

  return (
    <div className={"relative " + hideClass}>
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-11 w-11 items-center justify-center btn-ghost"
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
              and z-index:2 later in the cascade, so plain utilities lose.
              `dropdown` lifts the panel onto the opaque raised surface so the
              page content underneath can never bleed through the menu. */}
          {/* max-h + internal scroll so a short landscape viewport (height <
              480px) never traps the lower destinations off-screen. */}
          <div className={"!absolute " + anchorClass + " top-full !z-50 mt-2 max-h-[calc(100dvh-4.5rem)] w-60 max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain plate dropdown border border-white/10 py-1.5 shadow-xl"}>
            <Link
              href={user ? `/u/${encodeURIComponent(user.username)}` : "/login"}
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center gap-2.5 px-4 py-2.5 font-display text-sm text-gold-leaf hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/60"
            >
              {user ? (
                <>
                  <PlayerAvatar name={user.username} avatar={user.avatar} size={22} className="rounded-full" />
                  <span className="min-w-0 truncate">{user.username}</span>
                  {/* Live displayed rating (best mode bucket), matching the
                      header chip and profile — not the frozen legacy column. */}
                  <span className="ml-auto shrink-0 font-mono text-xs text-parchment-400">
                    {Math.round(user.displayRating ?? user.rating)}
                  </span>
                </>
              ) : (
                "Sign in"
              )}
            </Link>
            {groups.map((group) => (
              <div key={group.header}>
                <div className="mx-3 mb-1 mt-2 h-px bg-white/10" />
                <div className="smallcaps px-4 pb-1 pt-0.5 text-[10px] text-parchment-400">{group.header}</div>
                {group.items.map((item) => {
                  const activeItem = itemActive(item.href, pathname);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={activeItem ? "page" : undefined}
                      className={
                        "flex min-h-[44px] items-center border-l-2 py-2.5 pr-4 text-sm font-medium hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/60 " +
                        (activeItem ? "border-gold-leaf bg-white/5 pl-[calc(1rem-2px)] font-semibold " : "border-transparent pl-[calc(1rem-2px)] ") +
                        (activeItem ? "text-gold-leaf" : item.className ?? "text-parchment-100")
                      }
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
