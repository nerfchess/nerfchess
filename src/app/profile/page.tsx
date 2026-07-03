"use client";

import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PlayerStatsPanel } from "@/components/PlayerStatsPanel";
import type { PlayerStats } from "@/lib/playerStats";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { AVATAR_PICKER_IDS, avatarIdFor, CUSTOM_AVATAR_MAX_CHARS, isCustomAvatar } from "@/lib/avatars";

// Center-crop to a square and downscale to 96px, returning a compact JPEG
// data URL small enough to store inline in the avatar column.
async function fileToAvatarDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That file doesn't look like an image."));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) throw new Error("That file doesn't look like an image.");
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process the image.");
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      96,
      96,
    );
    for (const quality of [0.82, 0.6, 0.4]) {
      const data = canvas.toDataURL("image/jpeg", quality);
      if (data.length <= CUSTOM_AVATAR_MAX_CHARS) return data;
    }
    throw new Error("Could not compress the image enough.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ProfilePage() {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [account, setAccount] = useState<AccountUser | null | undefined>(undefined);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const uploadAvatar = async (file: File | null | undefined) => {
    if (!file || !account) return;
    setAvatarError(null);
    try {
      const data = await fileToAvatarDataUrl(file);
      await pickAvatar(data);
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Could not read that image.");
    }
  };

  const pickAvatar = async (id: string) => {
    if (!account) return;
    setSavingAvatar(true);
    setAvatarError(null);
    const previous = account.avatar;
    setAccount({ ...account, avatar: id });
    try {
      const res = await fetch("/api/auth/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: id }),
      });
      if (!res.ok) throw new Error("Could not save your avatar.");
    } catch {
      setAccount((a) => (a ? { ...a, avatar: previous } : a));
      setAvatarError("Could not save. Try again.");
    } finally {
      setSavingAvatar(false);
    }
  };

  // The online rating lives on the account (server-side) and moves after every
  // rated game, so fetch it fresh on mount and again whenever the tab regains
  // focus — e.g. right after finishing a game in another tab.
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      fetchMe().then((me) => {
        if (cancelled) return;
        setAccount(me);
        if (!me) return;
        fetch(`/api/users/${encodeURIComponent(me.username)}/stats`)
          .then((res) => (res.ok ? (res.json() as Promise<{ stats: PlayerStats }>) : null))
          .then((data) => {
            if (!cancelled && data) setStats(data.stats);
          })
          .catch(() => {});
      });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <section className="max-w-3xl mx-auto px-6 py-8">
        {/* Identity header — the signed-in account, or the local player. */}
        <div className="flex items-center gap-4">
          {account ? (
            <PlayerAvatar name={account.username} avatar={account.avatar} size={56} />
          ) : (
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-gold/40 bg-gold/10 font-display text-2xl text-gold-leaf">
              Y
            </span>
          )}
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-parchment-50">
              {account ? account.username : "You"}
            </h1>
            <p className="text-sm text-parchment-400">
              {account
                ? "Your online rating updates after every rated game."
                : "Sign in to build a rating and record that follow you everywhere."}
            </p>
          </div>
        </div>

        {/* Profile picture picker */}
        {account && (
          <div className="mt-8">
            <div className="rule-ornament mb-4">
              <span className="font-display">Profile picture</span>
            </div>
            <div className="plate p-4 sm:p-5">
              <div className="flex flex-wrap gap-2">
                <label
                  className={
                    "grid h-[46px] w-[46px] cursor-pointer place-items-center rounded-lg p-0.5 text-center transition " +
                    (isCustomAvatar(account.avatar)
                      ? "ring-2 ring-gold-leaf"
                      : "ring-1 ring-white/10 hover:ring-white/40")
                  }
                  title="Upload your own picture"
                >
                  {isCustomAvatar(account.avatar) ? (
                    <PlayerAvatar name={account.username} avatar={account.avatar} size={44} />
                  ) : (
                    <span className="font-display text-xl text-parchment-300 leading-none">+</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={savingAvatar}
                    onChange={(e) => {
                      uploadAvatar(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                {(AVATAR_PICKER_IDS.includes(avatarIdFor(account.username, account.avatar)) ||
                isCustomAvatar(account.avatar)
                  ? AVATAR_PICKER_IDS
                  : // Keep a retired preset visible (and selectable back) for
                    // accounts that picked it before the catalog was trimmed.
                    [...AVATAR_PICKER_IDS, avatarIdFor(account.username, account.avatar)]
                ).map((id) => {
                  const selected =
                    !isCustomAvatar(account.avatar) && avatarIdFor(account.username, account.avatar) === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => pickAvatar(id)}
                      disabled={savingAvatar}
                      aria-label={`Avatar ${id.replace("_", " ")}`}
                      aria-pressed={selected}
                      className={
                        "rounded-lg p-0.5 transition " +
                        (selected
                          ? "ring-2 ring-gold-leaf"
                          : "ring-1 ring-white/10 hover:ring-white/40")
                      }
                    >
                      <PlayerAvatar name={account.username} avatar={id} size={44} />
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-parchment-400">
                Shown in the lobby, on leaderboards, and at the board. Use the + tile to upload
                your own picture (cropped square, scaled down automatically).
                {avatarError && <span className="ml-2 text-oxblood-glow">{avatarError}</span>}
              </p>
            </div>
          </div>
        )}

        {/* Online (account) rating: the number that moves in rated games. */}
        {account && (
          <div className="mt-8">
            <div className="rule-ornament mb-4">
              <span className="font-display">Online rating</span>
            </div>
            <div className="plate gilt p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-mono text-4xl text-parchment-50 tabular-nums">
                  {Math.round(account.rating)}
                </div>
                <div className="mt-1 smallcaps text-[10px] text-parchment-400">
                  {account.games} rated game{account.games === 1 ? "" : "s"}
                  {stats?.highest && <span className="ml-2">peak {Math.round(stats.highest.rating)}</span>}
                </div>
              </div>
              <div className="flex gap-5 text-center">
                <div>
                  <div className="font-mono text-xl text-verdigris-glow tabular-nums">{account.wins}</div>
                  <div className="smallcaps text-[9px] text-parchment-400">Wins</div>
                </div>
                <div>
                  <div className="font-mono text-xl text-parchment-200 tabular-nums">{account.draws}</div>
                  <div className="smallcaps text-[9px] text-parchment-400">Draws</div>
                </div>
                <div>
                  <div className="font-mono text-xl text-oxblood-glow tabular-nums">{account.losses}</div>
                  <div className="smallcaps text-[9px] text-parchment-400">Losses</div>
                </div>
              </div>
            </div>
          </div>
        )}
        {account === null && (
          <div className="mt-6 plate p-4 text-sm text-parchment-300">
            <Link href="/login?next=/profile" className="text-gold-leaf hover:underline">Sign in</Link>{" "}
            to get an online rating that follows you across devices.
          </div>
        )}

        {/* Detailed statistics, computed from every recorded online game. */}
        <div className="mt-8">
          <div className="rule-ornament mb-4">
            <span className="font-display">Statistics</span>
          </div>
          {account === undefined ? (
            <div className="plate p-5 text-sm text-parchment-400">Loading…</div>
          ) : !account ? (
            <div className="plate p-5 text-sm text-parchment-300">
              <Link href="/login?next=/profile" className="text-gold-leaf hover:underline">
                Sign in
              </Link>{" "}
              to track detailed statistics: streaks, best victories, time played, and more.
            </div>
          ) : !stats ? (
            <div className="plate p-5 text-sm text-parchment-400">Crunching your games…</div>
          ) : (
            <PlayerStatsPanel stats={stats} />
          )}
        </div>
      </section>
    </main>
  );
}
