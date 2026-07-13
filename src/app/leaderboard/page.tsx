"use client";

import { SiteHeader } from "@/components/SiteHeader";
import Link from "next/link";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { useEffect, useState } from "react";
import { PlayerSearch } from "@/components/PlayerSearch";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { CategoryTabs } from "@/components/ratings/CategoryTabs";
import { DEFAULT_CATEGORY, getCategory, type RatingCategoryId } from "@/lib/ratingCategories";
import { isProvisionalRd, PROVISIONAL_RD } from "@/lib/ratingDisplay";
import { laurelTier } from "@/lib/laurels";
import { LaurelBadge } from "@/components/LaurelBadge";

interface Row {
  username: string;
  avatar?: string | null;
  flair?: string | null;
  rating: number;
  rd: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  guest?: boolean;
  bot?: boolean;
}

type MeRow = Row & { rank: number };

export default function LeaderboardPage() {
  const [category, setCategory] = useState<RatingCategoryId>(DEFAULT_CATEGORY);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [meRow, setMeRow] = useState<MeRow | null>(null);
  const [me, setMe] = useState<AccountUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Clear stale rows the instant the query changes (React's sanctioned
  // adjust-state-on-change pattern) so the effect below only fetches.
  const [prevQuery, setPrevQuery] = useState({ category });
  if (prevQuery.category !== category) {
    setPrevQuery({ category });
    setRows(null);
    setMeRow(null);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
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
    // Top-10 medal styling: the laurelled rows get a faint gold wash (subtly
    // brighter for the champion and the gold pair) and a metal-toned rank.
    const tier = laurelTier(rank);
    const tierWash =
      tier === "champion" ? "bg-sun/[0.07]" : tier === "gold" ? "bg-sun/[0.04]" : "";
    const rankTone =
      tier === "champion"
        ? "text-sun-glow"
        : tier === "gold"
          ? "text-sun"
          : tier === "silver"
            ? "text-parchment-200"
            : "text-parchment-400";
    const rowClass =
      "grid grid-cols-[2rem_1fr_4.5rem_5.25rem] sm:grid-cols-[3rem_1fr_5rem_4rem_6rem] items-center px-3 sm:px-4 py-2.5 border-b border-white/5 text-sm transition hover:bg-white/[0.04] " +
      (mine ? "bg-gold/10" : tierWash || (rank % 2 === 0 ? "bg-white/[0.015]" : ""));
    const content = (
      <>
        <span className={"font-mono tabular-nums " + rankTone}>{rank}</span>
        <span className="flex min-w-0 items-center gap-2">
          <PlayerAvatar name={row.username} avatar={row.avatar} flair={row.flair} size={24} />
          <span className={"truncate font-medium " + (mine ? "text-gold-leaf" : "text-parchment-100")}>
            {row.username}
          </span>
          {tier && (
            <LaurelBadge
              rank={rank}
              title={`#${rank} · ${active.label} leaderboard`}
              size={14}
              className="shrink-0"
            />
          )}
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
          {isProvisionalRd(row.rd) && (
            <span
              className="text-parchment-400"
              title={`Provisional: rating deviation above ${PROVISIONAL_RD}`}
            >
              ?
            </span>
          )}
        </span>
        <span className="hidden text-right font-mono text-parchment-400 tabular-nums sm:block">{row.games}</span>
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

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="font-display text-4xl sm:text-5xl text-parchment-50">Leaderboard</h1>

        {/* Exactly two boards: the Nerf and Buff mode ladders. */}
        <CategoryTabs value={category} onChange={setCategory} className="mt-5" />

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <PlayerSearch className="max-w-sm flex-1" />
        </div>

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
            <div className="grid grid-cols-[2rem_1fr_4.5rem_5.25rem] sm:grid-cols-[3rem_1fr_5rem_4rem_6rem] items-center px-3 sm:px-4 py-3 border-b border-white/8 smallcaps text-[10px] text-parchment-400">
              <span>#</span>
              <span>Player</span>
              <span className="text-right">{active.label} rating</span>
              <span className="hidden text-right sm:block">Games</span>
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

        {/* The reward rules, plainly stated. */}
        {rows && rows.length > 0 && (
          <p className="mt-3 text-xs text-parchment-400">
            <LaurelBadge rank={1} size={13} title="Top-10 honors" className="mr-1.5" />
            Top 10 wear the laurel — a radiant crown for the champion, gold for second and
            third, silver-brass to tenth. Laurelled players may also claim the exclusive 🏵️
            flair from their profile settings, for as long as their place holds.
          </p>
        )}
      </section>
    </main>
  );
}
