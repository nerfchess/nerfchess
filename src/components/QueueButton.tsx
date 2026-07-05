"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { MPSession, saveOnlineSeat } from "@/lib/multiplayer";
import { getCategory, type RatingCategoryId } from "@/lib/ratingCategories";

// Wire names must match QUEUE_POOLS in worker.ts.
const QUEUE_POOL_OPTIONS: { pool: string; label: string; speed: RatingCategoryId }[] = [
  { pool: "1+0", label: "1+0", speed: "bullet" },
  { pool: "2+1", label: "2+1", speed: "bullet" },
  { pool: "3+0", label: "3+0", speed: "blitz" },
  { pool: "3+2", label: "3+2", speed: "blitz" },
  { pool: "5+0", label: "5+0", speed: "blitz" },
  { pool: "5+3", label: "5+3", speed: "blitz" },
  { pool: "10+0", label: "10+0", speed: "rapid" },
  { pool: "10+5", label: "10+5", speed: "rapid" },
  { pool: "15+10", label: "15+10", speed: "rapid" },
];

const LAST_POOL_KEY = "dc:last-pool";

// Quick-pairing entry point for casual Draft games. Signed-in players pick a
// time control and are sent to the game URL when paired; signed-out visitors
// get a sign-in link.
export function QueueButton() {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const [state, setState] = useState<"idle" | "searching" | "paired">("idle");
  const [pool, setPool] = useState("3+2");
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<MPSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((me) => {
      if (!cancelled) setUser(me);
    });
    try {
      const saved = window.localStorage.getItem(LAST_POOL_KEY);
      if (saved && QUEUE_POOL_OPTIONS.some((o) => o.pool === saved)) setPool(saved);
    } catch {}
    return () => {
      cancelled = true;
      sessionRef.current?.destroy();
      sessionRef.current = null;
    };
  }, []);

  const pickPool = (p: string) => {
    setPool(p);
    try {
      window.localStorage.setItem(LAST_POOL_KEY, p);
    } catch {}
  };

  const startSearch = async () => {
    setError(null);
    setState("searching");
    const session = new MPSession();
    session.persistFriendSession = false;
    sessionRef.current = session;
    try {
      const paired = await session.queue(pool);
      if (sessionRef.current !== session) return;
      setState("paired");
      saveOnlineSeat(paired.id, { color: paired.color, token: paired.token });
      session.destroy();
      sessionRef.current = null;
      router.push(`/game/${paired.id}`);
    } catch (e) {
      if (sessionRef.current !== session) return;
      session.destroy();
      sessionRef.current = null;
      setState("idle");
      setError(e instanceof Error ? e.message : "Could not reach the game server.");
    }
  };

  const cancelSearch = () => {
    sessionRef.current?.cancelQueue();
    sessionRef.current?.destroy();
    sessionRef.current = null;
    setState("idle");
  };

  const selected = QUEUE_POOL_OPTIONS.find((o) => o.pool === pool) ?? QUEUE_POOL_OPTIONS[4];

  return (
    <div className="plate gilt p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-display text-2xl text-parchment">Play online</div>
          <p className="mt-1 text-sm text-parchment-300">
            Draft games against a real opponent. Casual for now while Draft is balanced.
          </p>
          {user && (
            <p className="mt-1 text-xs text-parchment-400">
              Playing as <span className="text-gold-leaf">{user.username}</span> ·{" "}
              {Math.round(user.rating)}
            </p>
          )}
        </div>
        <div className="shrink-0">
          {user === undefined ? (
            <div className="px-6 py-3 text-parchment-400 text-sm">…</div>
          ) : !user ? (
            <Link
              href="/login?next=/play"
              className="inline-block px-6 py-3 rounded-full btn-leaf font-display text-base"
            >
              Sign in to play online
            </Link>
          ) : state === "searching" ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-sm text-parchment-200">
                <span className="w-2 h-2 rounded-full bg-verdigris animate-flicker" />
                Finding opponent… ({selected.label})
              </span>
              <button onClick={cancelSearch} className="px-4 py-2 rounded-full btn-ghost text-sm font-display">
                Cancel
              </button>
            </div>
          ) : state === "paired" ? (
            <span className="text-sm text-gold-leaf">Opponent found. Starting…</span>
          ) : (
            <button
              onClick={startSearch}
              className="px-6 py-3 rounded-full btn-leaf font-display text-base"
            >
              Find opponent · {selected.label}
            </button>
          )}
        </div>
      </div>

      {user && state === "idle" && (
        <div className="mt-4 grid grid-cols-5 gap-1.5">
          {QUEUE_POOL_OPTIONS.map((option) => {
            const category = getCategory(option.speed);
            const Icon = category.icon;
            const isSelected = option.pool === pool;
            return (
              <button
                key={option.pool}
                type="button"
                onClick={() => pickPool(option.pool)}
                title={`${category.label} · ${option.label}`}
                aria-pressed={isSelected}
                className={
                  "flex flex-col items-center gap-0.5 border px-1 py-2 transition " +
                  (isSelected
                    ? "border-gold bg-gold/15 text-gold-leaf"
                    : "border-white/10 text-parchment-200 hover:border-white/30 hover:bg-white/5")
                }
              >
                <Icon size={14} style={{ color: category.accent }} aria-hidden />
                <span className="font-mono text-sm tabular-nums">{option.label}</span>
                <span className="smallcaps text-[8px] text-parchment-400">{category.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 border border-oxblood-glow/60 bg-oxblood/15 text-parchment text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
