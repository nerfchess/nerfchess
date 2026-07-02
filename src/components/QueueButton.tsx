"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { MPSession, saveOnlineSeat } from "@/lib/multiplayer";

// Rated quick-pairing entry point. Signed-in players join the 3+2 pool and are
// sent to the game URL when paired; signed-out visitors get a sign-in link.
export function QueueButton() {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const [state, setState] = useState<"idle" | "searching" | "paired">("idle");
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<MPSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMe().then((me) => {
      if (!cancelled) setUser(me);
    });
    return () => {
      cancelled = true;
      sessionRef.current?.destroy();
      sessionRef.current = null;
    };
  }, []);

  const startSearch = async () => {
    setError(null);
    setState("searching");
    const session = new MPSession();
    session.persistFriendSession = false;
    sessionRef.current = session;
    try {
      const paired = await session.queue("3+2");
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

  return (
    <div className="plate gilt p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-display text-2xl text-parchment">Play online</div>
          <p className="mt-1 text-sm text-parchment-300">
            Rated 3+2 blitz against a real opponent. Both of you get a secret rule.
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
              Sign in to play rated
            </Link>
          ) : state === "searching" ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-sm text-parchment-200">
                <span className="w-2 h-2 rounded-full bg-verdigris animate-flicker" />
                Finding opponent…
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
              Find opponent · 3+2
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="mt-3 p-3 border border-oxblood-glow/60 bg-oxblood/15 text-parchment text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
