"use client";

import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useEffect, useState } from "react";
import { PlayerSearch } from "@/components/PlayerSearch";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { CategoryTabs } from "@/components/ratings/CategoryTabs";
import { DEFAULT_CATEGORY, getCategory, type RatingCategoryId } from "@/lib/ratingCategories";

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

type MeRow = Row & { rank: number };

export default function LeaderboardPage() {
  const [category, setCategory] = useState<RatingCategoryId>(DEFAULT_CATEGORY);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [meRow, setMeRow] = useState<MeRow | null>(null);
  const [me, setMe] = useState<AccountUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setMeRow(null);
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/leaderboard?category=${category}`);
        if (!res.ok) throw new Error("Could not load the leaderboard.");
        const data = (await res.json()) as { players: Row[]; me: MeRow | null };
        if (!cancelled) {
          setRows(data.players);
          setMeRow(data.me ?? null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load the leaderboard.");
      }
      const user = await fetchMe();
      if (!cancelled) setMe(user);
    })();
    return () => {
      cancelled = true;
    };
  }, [category]);

  const isMeName = (name: string) => !!me && name.toLowerCase() === me.username.toLowerCase();
  const meInList = !!rows?.some((row) => isMeName(row.username));
  const active = getCategory(category);

  const renderRow = (row: Row, rank: number, key: string) => {
    const mine = isMeName(row.username);
    const rowClass =
      "grid grid-cols-[3rem_1fr_5rem_4rem_6rem] items-center px-4 py-2.5 border-b border-white/5 text-sm transition hover:bg-white/[0.04] " +
      (mine ? "bg-gold/10" : rank % 2 === 0 ? "bg-white/[0.015]" : "");
    const content = (
      <>
        <span className="font-mono text-parchment-400 tabular-nums">{rank}</span>
        <span className="flex min-w-0 items-center gap-2">
          <PlayerAvatar name={row.username} avatar={row.avatar} size={24} />
          <span className={"truncate font-medium " + (mine ? "text-gold-leaf" : "text-parchment-100")}>
            {row.username}
          </span>
          {row.guest && (
            <span className="shrink-0 border border-white/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-parchment-400">
              guest
            </span>
          )}
          {mine && (
            <span className="shrink-0 border border-gold/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-gold-leaf">
              you
            </span>
          )}
        </span>
        <span className="text-right font-mono text-parchment-100 tabular-nums">
          {Math.round(row.rating)}
          {row.rd > 150 && (
            <span className="text-parchment-400" title="Provisional: rating deviation above 150">
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
        <div key={key} className={rowClass}>
          {content}
        </div>
      );
    }
    return (
      <Link key={key} href={`/u/${row.username}`} className={rowClass}>
        {content}
      </Link>
    );
  };

  return (
    <main className="min-h-screen">
      <SiteHeader active="/leaderboard" />

      <section className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="font-display text-4xl sm:text-5xl text-parchment-50">Leaderboard</h1>

        {/* One independent ladder per time control. */}
        <CategoryTabs value={category} onChange={setCategory} className="mt-5" />

        <PlayerSearch className="mt-4 max-w-sm" />

        {error && (
          <div className="mt-6 plate p-3 px-4 border-oxblood-glow/60 bg-oxblood/15 text-parchment">
            {error}
          </div>
        )}

        {!rows && !error && <div className="mt-8 text-parchment-300">Loading...</div>}

        {rows && rows.length === 0 && (
          <div className="mt-8 plate p-6 text-parchment-200">
            Nobody has a {active.label} rating yet.{" "}
            <Link href="/lobby" className="text-gold-leaf hover:underline">
              Play a rated {active.label} game
            </Link>{" "}
            to claim the top spot.
          </div>
        )}

        {rows && rows.length > 0 && (
          <div className="mt-6 plate overflow-hidden">
            <div className="grid grid-cols-[3rem_1fr_5rem_4rem_6rem] items-center px-4 py-3 border-b border-white/8 smallcaps text-[10px] text-parchment-400">
              <span>#</span>
              <span>Player</span>
              <span className="text-right">{active.label} rating</span>
              <span className="text-right">Games</span>
              <span className="text-right">W / L / D</span>
            </div>
            {rows.map((row, i) => renderRow(row, i + 1, row.guest ? `guest:${row.username}` : row.username))}
            {/* Signed-in viewer outside the top 100: pin their true rank. */}
            {meRow && !meInList && (
              <>
                <div className="px-4 py-1 text-center font-mono text-[10px] text-parchment-500">···</div>
                {renderRow(meRow, meRow.rank, `me:${meRow.username}`)}
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
