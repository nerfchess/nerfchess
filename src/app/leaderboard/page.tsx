"use client";

import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useEffect, useState } from "react";
import { PlayerSearch } from "@/components/PlayerSearch";
import { AccountUser, fetchMe } from "@/lib/authClient";

interface Row {
  username: string;
  avatar?: string | null;
  rating: number;
  rd: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  guest?: boolean;
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
      <SiteHeader active="/leaderboard" />

      <section className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="font-display text-4xl sm:text-5xl text-parchment-50">Leaderboard</h1>

        <PlayerSearch className="mt-5 max-w-sm" />

        {error && (
          <div className="mt-6 plate p-3 px-4 border-oxblood-glow/60 bg-oxblood/15 text-parchment">
            {error}
          </div>
        )}

        {!rows && !error && <div className="mt-8 text-parchment-300">Loading...</div>}

        {rows && rows.length === 0 && (
          <div className="mt-8 plate p-6 text-parchment-200">
            No accounts yet.{" "}
            <Link href="/login" className="text-gold-leaf hover:underline">
              Create one
            </Link>{" "}
            to claim the top spot.
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
              const rowClass =
                "grid grid-cols-[3rem_1fr_5rem_4rem_6rem] items-center px-4 py-2.5 border-b border-white/5 text-sm transition hover:bg-white/[0.04] " +
                (isMe ? "bg-gold/10" : i % 2 ? "bg-white/[0.015]" : "");
              const content = (
                <>
                  <span className="font-mono text-parchment-400 tabular-nums">{i + 1}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <PlayerAvatar name={row.username} avatar={row.avatar} size={24} />
                    <span className={"truncate font-medium " + (isMe ? "text-gold-leaf" : "text-parchment-100")}>
                      {row.username}
                    </span>
                    {row.guest && (
                      <span className="shrink-0 border border-white/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-parchment-400">
                        guest
                      </span>
                    )}
                    {isMe && (
                      <span className="shrink-0 border border-gold/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-gold-leaf">
                        you
                      </span>
                    )}
                  </span>
                  <span className="text-right font-mono text-parchment-100 tabular-nums">
                    {Math.round(row.rating)}
                    {row.rd > 150 && (
                      <span className="text-parchment-400" title="Provisional - rating deviation above 150">
                        ?
                      </span>
                    )}
                  </span>
                  <span className="text-right font-mono text-parchment-400 tabular-nums">{row.games}</span>
                  <span className="text-right font-mono text-parchment-400 tabular-nums">
                    {row.wins}/{row.losses}/{row.draws}
                  </span>
                </>
              );

              if (row.guest) {
                return (
                  <div key={`guest:${row.username}`} className={rowClass}>
                    {content}
                  </div>
                );
              }

              return (
                <Link key={row.username} href={`/u/${row.username}`} className={rowClass}>
                  {content}
                </Link>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-xs text-parchment-500">
          Ratings are Glicko-2, updated after every rated game. A{" "}
          <span className="font-mono">?</span> marks a provisional rating (deviation above 150). Guest rows are
          instant accounts with real ratings; registering keeps that name and progress. Your practice ladder against
          the bots is tracked separately. See your{" "}
          <Link href="/profile" className="text-gold-leaf hover:underline">
            local profile
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
