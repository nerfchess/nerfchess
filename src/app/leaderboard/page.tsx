"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { loadRating } from "@/lib/rating";
import { loadProfile } from "@/lib/profile";
import { Avatar } from "@/components/Avatar";
import { SEED_PLAYERS } from "@/lib/players";

interface Row {
  name: string;
  rating: number;
  games: number;
  tag?: "you" | "bot";
  avatarId?: string | null;
}

// A seeded ladder of notable drawback players plus the three bots. Rated games
// move your own rating, which slots you into the board on load.
const SEED: Row[] = SEED_PLAYERS;

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [you, setYou] = useState<Row | null>(null);

  useEffect(() => {
    const r = loadRating();
    const profile = loadProfile();
    const me: Row = {
      name: profile.username ?? "You",
      rating: Math.round(r.rating),
      games: r.games,
      tag: "you",
      avatarId: profile.avatarId,
    };
    setYou(me);
    const merged = [...SEED, me].sort((a, b) => b.rating - a.rating);
    setRows(merged);
  }, []);

  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-5 sm:px-10 py-6 sm:py-7">
        <Logo />
        <div className="flex items-center gap-3 text-sm font-medium">
          <Link href="/play" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Play</Link>
          <Link href="/codex" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Rules</Link>
        </div>
      </nav>

      <section className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-parchment-100">Leaderboard</h1>
        <p className="mt-3 text-parchment-200">
          Win{" "}
          <Link href="/play" className="text-gold-leaf hover:underline">rated games</Link>{" "}
          to climb the ladder.
        </p>

        {you && (
          <div className="mt-6 plate p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="smallcaps text-[10px] text-parchment-400">Your rating</span>
              <span className="font-mono text-2xl text-gold-leaf tabular-nums">{you.rating}</span>
            </div>
            <span className="text-xs text-parchment-400">
              {you.games === 0 ? "No rated games yet" : `${you.games} rated ${you.games === 1 ? "game" : "games"}`}
            </span>
          </div>
        )}

        <div className="mt-6 plate overflow-hidden">
          <div className="grid grid-cols-[3rem_1fr_5rem_4rem] items-center px-4 py-3 border-b border-white/8 smallcaps text-[10px] text-parchment-400">
            <span>#</span>
            <span>Player</span>
            <span className="text-right">Rating</span>
            <span className="text-right">Games</span>
          </div>
          {rows?.map((row, i) => (
            <div
              key={`${row.name}-${i}`}
              className={
                "grid grid-cols-[3rem_1fr_5rem_4rem] items-center px-4 py-2.5 border-b border-white/5 text-sm " +
                (row.tag === "you" ? "bg-gold/10" : i % 2 ? "bg-white/[0.015]" : "")
              }
            >
              <span className="font-mono text-parchment-400 tabular-nums">{i + 1}</span>
              <span className="flex items-center gap-2 min-w-0">
                <Avatar avatarId={row.avatarId} name={row.name} size={22} />
                <span
                  className={
                    "truncate font-medium " +
                    (row.tag === "you" ? "text-gold-leaf" : "text-parchment-100")
                  }
                >
                  {row.name}
                </span>
                {row.tag === "bot" && (
                  <span className="shrink-0 border border-white/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-parchment-400">
                    bot
                  </span>
                )}
              </span>
              <span className="text-right font-mono text-parchment-100 tabular-nums">{row.rating}</span>
              <span className="text-right font-mono text-parchment-400 tabular-nums">
                {row.games >= 9999 ? "∞" : row.games}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-parchment-500">
          Bots hold fixed reference ratings.
        </p>
      </section>
    </main>
  );
}
