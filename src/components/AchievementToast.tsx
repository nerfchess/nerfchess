"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, X } from "lucide-react";
import { fetchMe } from "@/lib/authClient";
import type { AchievementRarity } from "@/lib/achievements";

// Desktop-only unlock toast: when an achievement lands (they are awarded
// server-side after a game archives, silently), a small card slides into the
// bottom-right corner. Click anywhere on it to dismiss; the small control
// underneath turns these off for good (re-enable from /achievements).
//
// Detection is client-side: the full achievement list is cheap and indexed,
// so we snapshot the unlocked id set per user in localStorage and diff it on
// a slow poll + window focus. The FIRST sighting for a user only seeds the
// snapshot (no toast storm for a veteran's back catalog).

const OFF_KEY = "nc-achievement-toasts-off";
const SEEN_KEY = (u: string) => `nc-achievements-seen:${u.toLowerCase()}`;
const POLL_MS = 90_000;
const SHOW_MS = 9_000;

type Unlock = {
  id: string;
  name: string;
  description: string;
  rarity: AchievementRarity;
};

export function achievementToastsDisabled(): boolean {
  try {
    return window.localStorage.getItem(OFF_KEY) === "1";
  } catch {
    return true;
  }
}

export function setAchievementToastsDisabled(off: boolean) {
  try {
    if (off) window.localStorage.setItem(OFF_KEY, "1");
    else window.localStorage.removeItem(OFF_KEY);
  } catch {}
}

const RARITY_TONE: Record<AchievementRarity, string> = {
  common: "text-parchment-100 border-white/20",
  rare: "text-gold-leaf border-gold/50",
  epic: "text-[#a877d8] border-[#a877d8]/50",
  legendary: "text-sun-glow border-sun/60",
};

export function AchievementToast() {
  const [queue, setQueue] = useState<Unlock[]>([]);
  const [disabled, setDisabled] = useState(true);

  useEffect(() => {
    queueMicrotask(() => setDisabled(achievementToastsDisabled()));
    let cancelled = false;
    let timer: number | null = null;
    let username: string | null = null;

    const check = async () => {
      if (!username || achievementToastsDisabled()) return;
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(username)}/achievements`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          achievements: (Unlock & { unlocked: boolean })[];
        };
        const unlocked = (data.achievements ?? []).filter((a) => a.unlocked);
        const key = SEEN_KEY(username);
        let seen: Set<string> | null = null;
        try {
          const raw = window.localStorage.getItem(key);
          seen = raw ? new Set(JSON.parse(raw) as string[]) : null;
        } catch {}
        try {
          window.localStorage.setItem(key, JSON.stringify(unlocked.map((a) => a.id)));
        } catch {}
        // First sighting for this user seeds silently.
        if (!seen || cancelled) return;
        const fresh = unlocked.filter((a) => !seen!.has(a.id));
        if (fresh.length > 0) {
          setQueue((q) => [
            ...q,
            ...fresh.map(({ id, name, description, rarity }) => ({ id, name, description, rarity })),
          ]);
        }
      } catch {}
    };

    fetchMe().then((me) => {
      if (cancelled || !me) return;
      username = me.username;
      check();
      timer = window.setInterval(check, POLL_MS);
    });
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const current = queue[0] ?? null;
  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(() => setQueue((q) => q.slice(1)), SHOW_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (disabled || !current) return null;
  const tone = RARITY_TONE[current.rarity] ?? RARITY_TONE.common;
  return (
    // Desktop only (hidden below sm): on phones this corner is busy with
    // drawers and the moment can wait for the achievements page.
    <div className="fixed bottom-4 right-4 z-40 hidden w-72 sm:block">
      <button
        type="button"
        onClick={() => setQueue((q) => q.slice(1))}
        className={`plate animate-rise block w-full border p-3 text-left shadow-plate ${tone.split(" ")[1]}`}
        title="Dismiss"
      >
        <span className="flex items-center gap-2.5">
          <span className={`grid h-9 w-9 shrink-0 place-items-center border border-white/15 bg-white/[0.05] ${tone.split(" ")[0]}`}>
            <Trophy size={17} strokeWidth={2} />
          </span>
          <span className="min-w-0">
            <span className="smallcaps block text-[9px] text-parchment-400">
              Achievement unlocked · {current.rarity}
            </span>
            <span className={`block truncate font-display text-sm font-bold ${tone.split(" ")[0]}`}>
              {current.name}
            </span>
          </span>
          <X size={13} className="ml-auto shrink-0 text-parchment-500" aria-hidden />
        </span>
        <span className="mt-1.5 block text-[11px] leading-snug text-parchment-300">
          {current.description}
        </span>
      </button>
      <div className="mt-1 flex justify-end gap-3">
        <Link
          href="/achievements"
          className="smallcaps text-[9px] text-parchment-400 transition-colors hover:text-parchment-100"
        >
          View all
        </Link>
        <button
          type="button"
          onClick={() => {
            setAchievementToastsDisabled(true);
            setDisabled(true);
            setQueue([]);
          }}
          className="smallcaps text-[9px] text-parchment-500 underline decoration-dotted underline-offset-2 transition-colors hover:text-parchment-200"
        >
          Disable these popups
        </button>
      </div>
    </div>
  );
}
