"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, LogOut, Mail, Search, Settings, Shield, Swords, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { PlayerSearch } from "@/components/PlayerSearch";
import { SettingsPanel } from "@/components/SettingsPanel";
import { AccountUser, fetchMe, logout } from "@/lib/authClient";

// Site-wide header, Lichess-style: main nav on the left; on the right a user
// search, incoming challenges, notifications, and the account menu.

type HeaderNotification = {
  id: string;
  type: string;
  actorName: string | null;
  text: string;
  href: string | null;
  at: number;
  read: boolean;
};

type HeaderChallenge = {
  id: string;
  from: string;
  timeSec: number;
  incrementSec: number;
  at: number;
};

type Menu = "search" | "challenges" | "bell" | "profile" | null;

const NAV_LINKS = [
  { href: "/lobby", label: "Play" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/history", label: "History" },
  { href: "/codex", label: "Rules" },
];

function clockLabel(timeSec: number, incrementSec: number): string {
  if (timeSec <= 0) return "No clock";
  if (timeSec < 60) return `${timeSec}s+${incrementSec}`;
  return `${Math.round(timeSec / 60)}+${incrementSec}`;
}

function timeAgo(at: number): string {
  const s = Math.max(1, Math.floor((Date.now() - at) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 grid min-w-[15px] place-items-center rounded-full bg-oxblood-glow px-1 font-mono text-[9px] leading-[15px] text-white">
      {n > 9 ? "9+" : n}
    </span>
  );
}

export function SiteHeader({ active }: { active?: string }) {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const [menu, setMenu] = useState<Menu>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [challenges, setChallenges] = useState<HeaderChallenge[]>([]);
  const rightRef = useRef<HTMLDivElement | null>(null);

  const refreshSocial = useCallback(async () => {
    try {
      const [notifRes, chalRes] = await Promise.all([fetch("/api/notifications"), fetch("/api/challenges")]);
      if (notifRes.ok) {
        const data = (await notifRes.json()) as { notifications: HeaderNotification[]; unread: number };
        setNotifications(data.notifications);
        setUnread(data.unread);
      }
      if (chalRes.ok) {
        const data = (await chalRes.json()) as { challenges: HeaderChallenge[] };
        setChallenges(data.challenges);
      }
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    let interval: number | null = null;
    fetchMe().then((me) => {
      if (cancelled) return;
      setUser(me);
      if (me) {
        refreshSocial();
        interval = window.setInterval(refreshSocial, 30000);
      }
    });
    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
    };
  }, [refreshSocial]);

  // Any click outside the right-hand cluster closes whichever menu is open.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!rightRef.current?.contains(e.target as Node)) setMenu(null);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const toggle = (m: Exclude<Menu, null>) => {
    setMenu((cur) => (cur === m ? null : m));
    if ((m === "bell" || m === "challenges") && user) refreshSocial();
  };

  const openNotification = async (n: HeaderNotification) => {
    setMenu(null);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      });
    } catch {}
    setNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setUnread((c) => Math.max(0, c - (n.read ? 0 : 1)));
    if (n.href) router.push(n.href);
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {}
    setNotifications((list) => list.map((x) => ({ ...x, read: true })));
    setUnread(0);
  };

  const respondChallenge = async (challenge: HeaderChallenge, action: "accepted" | "declined") => {
    try {
      await fetch(`/api/challenges/${encodeURIComponent(challenge.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } catch {}
    setChallenges((list) => list.filter((c) => c.id !== challenge.id));
    if (action === "accepted") {
      setMenu(null);
      router.push(`/friend?code=${encodeURIComponent(challenge.id)}`);
    }
  };

  const handleSignOut = async () => {
    setMenu(null);
    await logout();
    window.location.assign("/");
  };

  const iconButton =
    "relative grid h-9 w-9 place-items-center text-parchment-300 transition-colors hover:bg-white/5 hover:text-parchment-50";

  return (
    <nav className="flex items-center justify-between gap-3 px-5 sm:px-10 py-5 sm:py-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-5">
        <Logo />
        <div className="hidden items-center gap-1 text-sm font-body font-medium md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                "px-3 py-1.5 transition-colors hover:bg-white/5 " +
                (active === link.href ? "text-gold-leaf" : "text-parchment-100")
              }
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div ref={rightRef} className="relative flex items-center gap-0.5 sm:gap-1">
        {/* Search */}
        <button type="button" aria-label="Search players" title="Search players" className={iconButton} onClick={() => toggle("search")}>
          <Search size={17} />
        </button>
        {menu === "search" && (
          <div className="absolute right-0 top-full z-40 mt-2 w-72 plate p-3 shadow-2xl">
            <PlayerSearch />
            <p className="mt-2 text-[11px] text-parchment-400">
              Open a player&apos;s page to message or challenge them.
            </p>
          </div>
        )}

        {user && (
          <>
            {/* Incoming challenges */}
            <button
              type="button"
              aria-label="Incoming challenges"
              title="Incoming challenges"
              className={iconButton}
              onClick={() => toggle("challenges")}
            >
              <Swords size={17} />
              <Badge n={challenges.length} />
            </button>
            {menu === "challenges" && (
              <div className="absolute right-0 top-full z-40 mt-2 w-80 plate shadow-2xl">
                <div className="border-b border-white/10 px-4 py-2.5 smallcaps text-[10px] text-parchment-400">
                  Challenges
                </div>
                {challenges.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-parchment-400">No incoming challenges right now.</p>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {challenges.map((challenge) => (
                      <li key={challenge.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                        <div className="min-w-0">
                          <div className="truncate text-sm text-parchment-100">{challenge.from}</div>
                          <div className="smallcaps text-[9px] text-parchment-400">
                            Casual · {clockLabel(challenge.timeSec, challenge.incrementSec)} · {timeAgo(challenge.at)}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <button
                            onClick={() => respondChallenge(challenge, "accepted")}
                            className="btn-leaf px-3 py-1.5 font-display text-xs font-semibold"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => respondChallenge(challenge, "declined")}
                            className="btn-ghost px-3 py-1.5 font-display text-xs"
                          >
                            Decline
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Notifications */}
            <button type="button" aria-label="Notifications" title="Notifications" className={iconButton} onClick={() => toggle("bell")}>
              <Bell size={17} />
              <Badge n={unread} />
            </button>
            {menu === "bell" && (
              <div className="absolute right-0 top-full z-40 mt-2 w-80 plate shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                  <span className="smallcaps text-[10px] text-parchment-400">Notifications</span>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-[11px] text-parchment-400 hover:text-parchment-100">
                      Mark all read
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-parchment-400">Nothing here yet.</p>
                ) : (
                  <ul className="max-h-96 divide-y divide-white/5 overflow-y-auto">
                    {notifications.map((n) => (
                      <li key={n.id}>
                        <button
                          onClick={() => openNotification(n)}
                          className={
                            "block w-full px-4 py-2.5 text-left transition-colors hover:bg-white/5 " +
                            (n.read ? "opacity-60" : "")
                          }
                        >
                          <div className="text-sm leading-snug text-parchment-100">{n.text}</div>
                          <div className="mt-0.5 smallcaps text-[9px] text-parchment-400">{timeAgo(n.at)}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}

        {/* Account */}
        {user === undefined ? (
          <span className="h-9 w-24" />
        ) : !user ? (
          <Link
            href="/login"
            className="ml-1 rounded-full border border-gold/40 px-3 py-1.5 font-display text-sm text-gold-leaf transition hover:bg-gold/10"
          >
            Sign in
          </Link>
        ) : (
          <>
            <button
              type="button"
              onClick={() => toggle("profile")}
              className="ml-1 inline-flex items-center gap-2 px-2 py-1.5 font-display text-sm text-parchment transition-colors hover:bg-white/5"
              aria-haspopup="menu"
              aria-expanded={menu === "profile"}
            >
              {user.username}
              <PlayerAvatar name={user.username} avatar={user.avatar} size={24} className="rounded-full" />
            </button>
            {menu === "profile" && (
              <div className="absolute right-0 top-full z-40 mt-2 w-56 plate py-1 shadow-2xl">
                <MenuItem
                  icon={<User size={14} />}
                  label="Profile"
                  onClick={() => {
                    setMenu(null);
                    router.push(`/u/${encodeURIComponent(user.username)}`);
                  }}
                />
                <MenuItem
                  icon={<Mail size={14} />}
                  label="Inbox"
                  onClick={() => {
                    setMenu(null);
                    router.push("/inbox");
                  }}
                />
                <MenuItem
                  icon={<Settings size={14} />}
                  label="Preferences"
                  onClick={() => {
                    setMenu(null);
                    setSettingsOpen(true);
                  }}
                />
                {(user.role === "mod" || user.role === "admin") && (
                  <MenuItem
                    icon={<Shield size={14} />}
                    label="Moderation"
                    onClick={() => {
                      setMenu(null);
                      router.push("/mod");
                    }}
                  />
                )}
                <div className="my-1 border-t border-white/10" />
                <MenuItem icon={<LogOut size={14} />} label="Sign out" onClick={handleSignOut} />
              </div>
            )}
          </>
        )}
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </nav>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-parchment-100 transition-colors hover:bg-white/5 hover:text-parchment-50"
    >
      <span className="text-parchment-400">{icon}</span>
      {label}
    </button>
  );
}
