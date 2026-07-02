"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
import { CategoryTabs } from "@/components/ratings/CategoryTabs";
import { RatingCard } from "@/components/ratings/RatingCard";
import { StatGrid } from "@/components/ratings/StatGrid";
import {
  DEFAULT_CATEGORY,
  RATING_CATEGORIES,
  getCategory,
  type RatingCategoryId,
} from "@/lib/ratingCategories";
import { DEFAULT_STATS, loadRatings, type Ratings } from "@/lib/ratings";
import { AccountUser, fetchMe, updateAvatar } from "@/lib/authClient";
import { fileToAvatarDataUrl } from "@/lib/avatar";

export default function ProfilePage() {
  const [ratings, setRatings] = useState<Ratings | null>(null);
  const [active, setActive] = useState<RatingCategoryId>(DEFAULT_CATEGORY);
  const [account, setAccount] = useState<AccountUser | null | undefined>(undefined);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRatings(loadRatings());
  }, []);

  // The online rating lives on the account (server-side) and moves after every
  // rated game, so fetch it fresh on mount and again whenever the tab regains
  // focus — e.g. right after finishing a game in another tab.
  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      fetchMe().then((me) => {
        if (!cancelled) setAccount(me);
      });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
    };
  }, []);

  // Downscale the chosen file locally, push it to the account, and reflect it
  // in the header immediately. `next = null` removes the current picture.
  const changeAvatar = async (next: File | null) => {
    if (!account) return;
    setAvatarError(null);
    setAvatarBusy(true);
    try {
      const dataUrl = next ? await fileToAvatarDataUrl(next) : null;
      await updateAvatar(dataUrl);
      setAccount({ ...account, avatar: dataUrl });
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Could not update your profile picture.");
    } finally {
      setAvatarBusy(false);
    }
  };

  const activeCategory = getCategory(active);

  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-5 sm:px-10 py-6 sm:py-7">
        <Logo />
        <div className="flex items-center gap-1 sm:gap-2 text-sm font-medium">
          <Link href="/play" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Play</Link>
          <Link href="/leaderboard" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Leaderboard</Link>
          <Link href="/codex" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Rules</Link>
        </div>
      </nav>

      <section className="max-w-3xl mx-auto px-6 py-8">
        {/* Identity header — the signed-in account, or the local player. */}
        <div className="flex items-center gap-4">
          {account ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarBusy}
              className="group relative shrink-0 rounded-full disabled:cursor-wait"
              title="Change profile picture"
              aria-label="Change profile picture"
            >
              <Avatar name={account.username} src={account.avatar} className="h-16 w-16 text-2xl" />
              <span
                className={
                  "absolute inset-0 grid place-items-center rounded-full bg-black/55 text-parchment transition-opacity " +
                  (avatarBusy ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100")
                }
              >
                <Camera className="h-5 w-5" />
              </span>
            </button>
          ) : (
            <Avatar name="You" className="h-16 w-16 text-2xl" />
          )}
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-parchment-50">
              {account ? account.username : "You"}
            </h1>
            <p className="text-sm text-parchment-400">
              {account
                ? "Your online rating updates after every rated game."
                : "Your ratings and record, stored on this device."}
            </p>
            {account && (
              <p className="mt-1 text-xs text-parchment-500">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarBusy}
                  className="text-gold-leaf hover:underline disabled:opacity-50"
                >
                  {account.avatar ? "Change photo" : "Add a profile picture"}
                </button>
                {account.avatar && (
                  <>
                    {" · "}
                    <button
                      onClick={() => changeAvatar(null)}
                      disabled={avatarBusy}
                      className="hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </>
                )}
              </p>
            )}
            {avatarError && <p className="mt-1 text-xs text-oxblood-glow">{avatarError}</p>}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              e.target.value = ""; // allow re-picking the same file
              if (file) changeAvatar(file);
            }}
          />
        </div>

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
                  Rated 3+2 · {account.games} game{account.games === 1 ? "" : "s"}
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

        {/* Ratings section */}
        <div className="mt-8">
          <div className="rule-ornament mb-4">
            <span className="font-display">Ratings</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {RATING_CATEGORIES.map((c) => (
              <RatingCard
                key={c.id}
                categoryId={c.id}
                stats={ratings ? ratings[c.id] : DEFAULT_STATS}
                variant="large"
              />
            ))}
          </div>
        </div>

        {/* Detailed statistics, per category */}
        <div className="mt-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="rule-ornament flex-1">
              <span className="font-display">Statistics</span>
            </div>
          </div>

          <CategoryTabs value={active} onChange={setActive} className="mb-4" />

          <div className="plate p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <activeCategory.icon className="h-4 w-4" style={{ color: activeCategory.accent }} strokeWidth={2.2} />
              <span className="font-display text-lg text-parchment-50">{activeCategory.label}</span>
              <span className="text-xs text-parchment-400">· {activeCategory.blurb}</span>
            </div>
            {ratings && <StatGrid categoryId={active} stats={ratings[active]} />}
          </div>
        </div>

        <p className="mt-6 text-xs text-parchment-500">
          Separate ratings per category are ready for upcoming rated queues. For now only your
          Blitz rating updates from games; Bullet and Rapid start at their defaults.
        </p>
      </section>
    </main>
  );
}
