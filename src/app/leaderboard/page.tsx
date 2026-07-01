"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountChip } from "@/components/AccountChip";
import { Logo } from "@/components/Logo";
import { AccountUser, fetchMe } from "@/lib/authClient";

interface Row {
  username: string;
  rating: number;
  rd: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [me, setMe] = useState<AccountUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/leaderboard");
        if (!res.ok) throw new Error("Could not load the leaderboard.");
        const data = (await res.json()) as { players: Row[] };
        if (!cancelled) setRows(data.players);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load the leaderboard.");
      }
      const user = await fetchMe();
      if (!cancelled) setMe(user);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-5 sm:px-10 py-6 sm:py-7">
        <Logo />
        <div className="flex items-center gap-3 text-sm font-medium">
          <Link href="/play" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Play</Link>
          <Link href="/codex" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Rules</Link>
          <AccountChip />
        </div>
      </nav>

      <section className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-parchment-100">Leaderboard</h1>
        <p className="mt-3 text-parchment-200">
          Ranked by rating from rated online games (3+2 blitz). Bot games are casual and don&apos;t
          count —{" "}
          <Link href="/play" className="text-gold-leaf hover:underline">
            queue up
          </Link>{" "}
          to get on the board.
        </p>

        {error && (
          <div className="mt-6 plate p-3 px-4 border-oxblood-glow/60 bg-oxblood/15 text-parchment">
            {error}
          </div>
        )}

        {!rows && !error && <div className="mt-8 text-parchment-300">Loading…</div>}

        {rows && rows.length === 0 && (
          <div className="mt-8 plate p-6 text-parchment-200">
            Nobody has played a rated game yet. Be the first —{" "}
            <Link href="/play" className="text-gold-leaf hover:underline">
              find an opponent
            </Link>
            .
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="mt-6 plate overflow-hidden">
            <div className="grid grid-cols-[3rem_1fr_5rem_4rem_6rem] items-center px-4 py-3 border-b border-white/8 smallcaps text-[10px] text-parchment-400">
              <span>#</span>
              <span>Player</span>
              <span className="text-right">Rating</span>
              <span className="text-right">Games</span>
              <span className="text-right">W / L / D</span>
            </div>
            {rows.map((row, i) => {
              const isMe = me && row.username.toLowerCase() === me.username.toLowerCase();
              return (
                <Link
                  key={row.username}
                  href={`/u/${row.username}`}
                  className={
                    "grid grid-cols-[3rem_1fr_5rem_4rem_6rem] items-center px-4 py-2.5 border-b border-white/5 text-sm transition hover:bg-white/[0.04] " +
                    (isMe ? "bg-gold/10" : i % 2 ? "bg-white/[0.015]" : "")
                  }
                >
                  <span className="font-mono text-parchment-400 tabular-nums">{i + 1}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={"truncate font-medium " + (isMe ? "text-gold-leaf" : "text-parchment-100")}>
                      {row.username}
                    </span>
                    {isMe && (
                      <span className="shrink-0 border border-gold/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-gold-leaf">
                        you
                      </span>
                    )}
                  </span>
                  <span className="text-right font-mono text-parchment-100 tabular-nums">
                    {Math.round(row.rating)}
                  </span>
                  <span className="text-right font-mono text-parchment-400 tabular-nums">{row.games}</span>
                  <span className="text-right font-mono text-parchment-400 tabular-nums">
                    {row.wins}/{row.losses}/{row.draws}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-xs text-parchment-500">
          Ratings are Glicko-2, updated after every rated game. Your practice ladder against the
          bots stays on your device.
        </p>
      </section>
    </main>
  );
}
