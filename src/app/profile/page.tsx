"use client";

import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PlayerStatsPanel } from "@/components/PlayerStatsPanel";
import type { PlayerStats } from "@/lib/playerStats";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { AVATAR_PICKER_IDS, avatarIdFor, CUSTOM_AVATAR_MAX_CHARS, isCustomAvatar } from "@/lib/avatars";
import { FLAIR_EMOJI } from "@/lib/flair";
import { MODE_RATING_CATEGORIES } from "@/lib/ratingCategories";
import { Trophy } from "lucide-react";

// One user_ratings row (per mode bucket), as returned by /api/users/[username].
interface CategoryRatingRow {
  rating: number;
  rd: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  peak: number;
}

// The formats a browser canvas can reliably decode + re-encode. Anything else
// (HEIC, TIFF, PDF, a mislabeled file) is rejected up front with a clear
// message rather than failing silently mid-process.
const ACCEPTED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
// Cap on the raw file the picker will read. We downscale to 96px regardless,
// so this only guards against loading an enormous original into memory.
const MAX_AVATAR_UPLOAD_BYTES = 8 * 1024 * 1024;

// Center-crop to a square and downscale to 96px, returning a compact JPEG
// data URL small enough to store inline in the avatar column. Throws Errors
// whose messages are shown verbatim to the user, so each one explains WHY the
// picture was rejected (wrong type, too large, undecodable, too detailed).
async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (file.type && !ACCEPTED_AVATAR_TYPES.includes(file.type)) {
    throw new Error("That file is not a supported image. Use a PNG, JPG, WebP, or GIF.");
  }
  if (file.size > MAX_AVATAR_UPLOAD_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(`That image is too large (${mb} MB). Keep it under 8 MB.`);
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That image could not be read. It may be corrupt or an unsupported format."));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) throw new Error("That image could not be read. It may be corrupt or an unsupported format.");
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser could not process the image. Try a different one.");
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
    throw new Error("That image has too much fine detail to shrink under the size limit. Try a simpler or more tightly cropped picture.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ProfilePage() {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [ratings, setRatings] = useState<Record<string, CategoryRatingRow> | null>(null);
  const [account, setAccount] = useState<AccountUser | null | undefined>(undefined);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [savingFlair, setSavingFlair] = useState(false);
  const [flairError, setFlairError] = useState<string | null>(null);

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
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Could not save your avatar.");
      }
    } catch (e) {
      setAccount((a) => (a ? { ...a, avatar: previous } : a));
      setAvatarError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const pickFlair = async (flair: string | null) => {
    if (!account) return;
    setSavingFlair(true);
    setFlairError(null);
    const previous = account.flair;
    setAccount({ ...account, flair });
    try {
      const res = await fetch("/api/auth/flair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flair }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Could not save your flair.");
      }
    } catch (e) {
      setAccount((a) => (a ? { ...a, flair: previous } : a));
      setFlairError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setSavingFlair(false);
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
        // The two mode ratings (Nerf and Buff) live in per-category rows.
        fetch(`/api/users/${encodeURIComponent(me.username)}`)
          .then((res) =>
            res.ok ? (res.json() as Promise<{ ratings?: Record<string, CategoryRatingRow> }>) : null,
          )
          .then((data) => {
            if (!cancelled && data) setRatings(data.ratings ?? {});
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
              {account?.flair && (
                <span className="ml-2 align-middle text-2xl" aria-hidden="true">
                  {account.flair}
                </span>
              )}
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
                your own picture (PNG, JPG, WebP, or GIF, under 8 MB, cropped square and scaled
                down automatically).
                {avatarError && <span className="ml-2 text-oxblood-glow">{avatarError}</span>}
              </p>
            </div>
          </div>
        )}

        {/* Flair picker: an emoji shown next to the username, Lichess-style. */}
        {account && (
          <div className="mt-8">
            <div className="rule-ornament mb-4">
              <span className="font-display">Flair</span>
            </div>
            <div className="plate p-4 sm:p-5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => pickFlair(null)}
                  disabled={savingFlair}
                  aria-label="No flair"
                  aria-pressed={!account.flair}
                  className={
                    "grid h-[46px] w-[46px] place-items-center rounded-lg text-xs text-parchment-300 transition " +
                    (!account.flair ? "ring-2 ring-gold-leaf" : "ring-1 ring-white/10 hover:ring-white/40")
                  }
                >
                  none
                </button>
                {FLAIR_EMOJI.map((emoji) => {
                  const selected = account.flair === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => pickFlair(emoji)}
                      disabled={savingFlair}
                      aria-label={`Flair ${emoji}`}
                      aria-pressed={selected}
                      className={
                        "grid h-[46px] w-[46px] place-items-center rounded-lg text-2xl transition " +
                        (selected ? "ring-2 ring-gold-leaf" : "ring-1 ring-white/10 hover:ring-white/40")
                      }
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-parchment-400">
                An emoji shown next to your name on your profile and on your avatar around the
                site. Pick one from the set above.
                {flairError && <span className="ml-2 text-oxblood-glow">{flairError}</span>}
              </p>
            </div>
          </div>
        )}

        {/* The two online ratings, one per mode: Nerf and Buff. */}
        {account && (
          <div className="mt-8">
            <div className="rule-ornament mb-4">
              <span className="font-display">Online ratings</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MODE_RATING_CATEGORIES.map((c) => {
                const r = ratings?.[c.id];
                const Icon = c.icon;
                return (
                  <div key={c.id} className="plate gilt p-5 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-1.5 smallcaps text-[10px] text-parchment-400">
                        <Icon className="h-3.5 w-3.5" style={{ color: c.accent }} strokeWidth={2.2} />
                        {c.label}
                      </div>
                      <div className="mt-1 font-mono text-4xl text-parchment-50 tabular-nums">
                        {r ? (
                          <>
                            {Math.round(r.rating)}
                            {r.rd > 150 && <span className="text-parchment-400">?</span>}
                          </>
                        ) : (
                          <span className="text-parchment-500">-</span>
                        )}
                      </div>
                      <div className="mt-1 smallcaps text-[10px] text-parchment-400">
                        {r ? (
                          <>
                            {r.games} rated game{r.games === 1 ? "" : "s"}
                            <span className="ml-2">peak {Math.round(r.peak)}</span>
                          </>
                        ) : (
                          "no rated games yet"
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4 text-center">
                      <div>
                        <div className="font-mono text-xl text-verdigris-glow tabular-nums">{r?.wins ?? 0}</div>
                        <div className="smallcaps text-[9px] text-parchment-400">Wins</div>
                      </div>
                      <div>
                        <div className="font-mono text-xl text-parchment-200 tabular-nums">{r?.draws ?? 0}</div>
                        <div className="smallcaps text-[9px] text-parchment-400">Draws</div>
                      </div>
                      <div>
                        <div className="font-mono text-xl text-oxblood-glow tabular-nums">{r?.losses ?? 0}</div>
                        <div className="smallcaps text-[9px] text-parchment-400">Losses</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {account === null && (
          <div className="mt-6 plate p-4 text-sm text-parchment-300">
            <Link href="/login?next=/profile" className="text-gold-leaf hover:underline">Sign in</Link>{" "}
            to get an online rating that follows you across devices.
          </div>
        )}

        {/* Quick link into the achievements gallery. */}
        {account && (
          <div className="mt-8">
            <Link
              href="/achievements"
              className="plate p-4 flex items-center justify-between gap-3 hover:border-gold/40 transition"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg border border-gold/40 bg-gold/10">
                  <Trophy className="h-5 w-5 text-gold-leaf" strokeWidth={2} />
                </span>
                <div>
                  <div className="font-display text-lg text-parchment-50">Achievements</div>
                  <div className="smallcaps text-[10px] text-parchment-400">
                    Feats you have unlocked across Nerf and Buff
                  </div>
                </div>
              </div>
              <span className="smallcaps text-[10px] text-gold-leaf">View</span>
            </Link>
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
