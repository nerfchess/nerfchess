"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { loadProfile } from "@/lib/profile";
import { loadRating } from "@/lib/rating";
import { BOT_DIFFICULTY, SEED_PLAYERS, type DirectoryPlayer } from "@/lib/players";

interface Row extends DirectoryPlayer {
  avatarId?: string | null;
}

export default function PlayersPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    const profile = loadProfile();
    const rating = loadRating();
    const me: Row = {
      name: profile.username ?? "You",
      rating: Math.round(rating.rating),
      games: rating.games,
      tag: "you",
      avatarId: profile.avatarId,
    };
    setRows([...SEED_PLAYERS, me].sort((a, b) => b.rating - a.rating));
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(needle));
  }, [rows, q]);

  return (
    <main className="min-h-screen pb-16">
      <nav className="flex items-center justify-between px-5 sm:px-10 py-6 sm:py-7">
        <Logo />
        <div className="flex items-center gap-3 text-sm font-medium">
          <Link href="/play" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Play</Link>
          <Link href="/leaderboard" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Leaderboard</Link>
        </div>
      </nav>

      <section className="mx-auto max-w-3xl px-6 py-4">
        <h1 className="font-display text-4xl font-bold text-parchment-100 sm:text-5xl">Players</h1>
        <p className="mt-3 text-parchment-200">
          Browse the ladder or search for a player.
        </p>

        <Link
          href="/friend"
          className="group mt-6 plate flex items-center justify-between gap-4 p-4 transition hover:border-gold/50"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center border border-gold/40 bg-gold/10 text-gold-leaf">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
            </span>
            <div>
              <div className="font-display text-lg font-semibold text-parchment-50">Challenge a friend</div>
              <div className="text-sm text-parchment-300">
                Create a private game and send them the invite link
              </div>
            </div>
          </div>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden
            className="shrink-0 text-parchment-400 transition group-hover:translate-x-0.5 group-hover:text-gold-leaf"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>

        <label className="relative mt-6 block">
          <span className="sr-only">Search players</span>
          <svg
            width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-parchment-400"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search players"
            className="w-full rounded-sm border border-white/15 bg-ink-900/60 py-2.5 pl-9 pr-4 text-sm text-parchment placeholder:text-parchment-400/60 focus:border-gold/60 focus:outline-none"
          />
        </label>

        <div className="mt-4 plate overflow-hidden">
          <div className="grid grid-cols-[1fr_5rem_6.5rem] items-center border-b border-white/8 px-4 py-3 smallcaps text-[10px] text-parchment-400 sm:grid-cols-[1fr_5rem_4rem_6.5rem]">
            <span>Player</span>
            <span className="text-right">Rating</span>
            <span className="hidden text-right sm:block">Games</span>
            <span />
          </div>
          {filtered?.map((row, i) => (
            <div
              key={`${row.name}-${i}`}
              className={
                "grid grid-cols-[1fr_5rem_6.5rem] items-center border-b border-white/5 px-4 py-2.5 text-sm sm:grid-cols-[1fr_5rem_4rem_6.5rem] " +
                (row.tag === "you" ? "bg-gold/10" : i % 2 ? "bg-white/[0.015]" : "")
              }
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <Avatar avatarId={row.avatarId} name={row.name} size={26} />
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
              <span className="hidden text-right font-mono text-parchment-400 tabular-nums sm:block">
                {row.games >= 9999 ? "∞" : row.games}
              </span>
              <span className="text-right">
                {row.tag === "you" ? (
                  <Link href="/stats" className="text-xs text-parchment-300 hover:text-parchment-100">
                    Your stats
                  </Link>
                ) : row.tag === "bot" ? (
                  <Link
                    href={`/game?mode=ai&difficulty=${BOT_DIFFICULTY[row.name] ?? "medium"}`}
                    className="inline-block border border-white/15 bg-white/[0.03] px-2.5 py-1 text-xs font-semibold text-parchment-200 transition hover:border-gold/50 hover:text-gold-leaf"
                  >
                    Play
                  </Link>
                ) : (
                  <Link
                    href="/friend"
                    title="Create a private game and send them the link"
                    className="inline-block border border-white/15 bg-white/[0.03] px-2.5 py-1 text-xs font-semibold text-parchment-200 transition hover:border-gold/50 hover:text-gold-leaf"
                  >
                    Challenge
                  </Link>
                )}
              </span>
            </div>
          ))}
          {filtered && filtered.length === 0 && (
            <p className="px-4 py-6 text-sm text-parchment-400">
              No players match your search.
            </p>
          )}
        </div>

        <p className="mt-4 text-xs text-parchment-500">
          Challenges create a private game link the other player can open on any device.
        </p>
      </section>
    </main>
  );
}
