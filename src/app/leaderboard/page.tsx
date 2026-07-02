"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { CategoryTabs } from "@/components/ratings/CategoryTabs";
import {
  DEFAULT_CATEGORY,
  getCategory,
  type RatingCategoryId,
} from "@/lib/ratingCategories";
import { formatWinRate, loadRatings, type CategoryStats } from "@/lib/ratings";

interface Row {
  name: string;
  rating: number;
  games: number;
  wins: number;
  losses: number;
  you?: boolean;
}

// A seeded ladder of notable drawback players. Placeholder data shared across
// categories until real per-queue results exist — the spec explicitly allows
// identical seeds for now. Only the player's own row reflects real per-category
// stats. Winrate is derived from wins / (wins + losses).
const SEED: Omit<Row, "you">[] = [
  { name: "en_prise_enjoyer", rating: 2418, games: 1204, wins: 812, losses: 392 },
  { name: "FogWalker", rating: 2291, games: 863, wins: 549, losses: 314 },
  { name: "queenless_wonder", rating: 2183, games: 651, wins: 398, losses: 253 },
  { name: "castle_through_check", rating: 1846, games: 412, wins: 231, losses: 181 },
  { name: "h_file_hermit", rating: 1712, games: 289, wins: 151, losses: 138 },
  { name: "en_passant_only", rating: 1655, games: 233, wins: 118, losses: 115 },
  { name: "pawn_stormer", rating: 1433, games: 176, wins: 82, losses: 94 },
  { name: "blunderful", rating: 1264, games: 98, wins: 40, losses: 58 },
  { name: "still_learning", rating: 1015, games: 41, wins: 14, losses: 27 },
];

function winRateOf(row: Row): string {
  const decided = row.wins + row.losses;
  return decided === 0 ? "—" : `${Math.round((row.wins / decided) * 100)}%`;
}

export default function LeaderboardPage() {
  const [category, setCategory] = useState<RatingCategoryId>(DEFAULT_CATEGORY);
  const [me, setMe] = useState<CategoryStats | null>(null);

  useEffect(() => {
    setMe(loadRatings()[category]);
  }, [category]);

  const rows = useMemo<Row[]>(() => {
    const you: Row = {
      name: "You",
      rating: me ? Math.round(me.rating) : 1500,
      games: me?.games ?? 0,
      wins: me?.wins ?? 0,
      losses: me?.losses ?? 0,
      you: true,
    };
    return [...SEED.map((r) => ({ ...r })), you].sort((a, b) => b.rating - a.rating);
  }, [me]);

  const c = getCategory(category);
  const youRow = rows.find((r) => r.you);

  return (
    <main className="min-h-screen">
      <nav className="flex items-center justify-between px-5 sm:px-10 py-6 sm:py-7">
        <Logo />
        <div className="flex items-center gap-1 sm:gap-2 text-sm font-medium">
          <Link href="/play" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Play</Link>
          <Link href="/profile" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Profile</Link>
          <Link href="/codex" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Rules</Link>
        </div>
      </nav>

      <section className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="font-display text-4xl sm:text-5xl text-parchment-50">Leaderboard</h1>
        <p className="mt-3 text-parchment-200">
          Independent ladders for each category. Climb by winning rated games.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <CategoryTabs value={category} onChange={setCategory} />
          {youRow && (
            <div className="flex items-center gap-2 text-sm">
              <span className="smallcaps text-[10px] text-parchment-400">Your {c.label}</span>
              <span className="font-mono text-lg tabular-nums" style={{ color: c.accent }}>
                {youRow.rating}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 plate overflow-hidden">
          <HeaderRow />
          {rows.map((row, i) => (
            <div
              key={`${row.name}-${i}`}
              className={
                "grid grid-cols-[2.5rem_1fr_4rem_3.5rem] sm:grid-cols-[2.5rem_1fr_4.5rem_4rem_3rem_3rem_3.5rem] items-center px-4 py-2.5 border-b border-white/5 text-sm " +
                (row.you ? "" : i % 2 ? "bg-white/[0.015]" : "")
              }
              style={row.you ? { background: c.accent + "1a" } : undefined}
            >
              <span className="font-mono text-parchment-400 tabular-nums">{i + 1}</span>
              <span
                className={"truncate font-medium " + (row.you ? "" : "text-parchment-100")}
                style={row.you ? { color: c.accent } : undefined}
              >
                {row.name}
              </span>
              <span className="text-right font-mono text-parchment-100 tabular-nums">{row.rating}</span>
              <span className="hidden sm:block text-right font-mono text-parchment-400 tabular-nums">{row.games}</span>
              <span className="hidden sm:block text-right font-mono text-verdigris-glow/80 tabular-nums">{row.wins}</span>
              <span className="hidden sm:block text-right font-mono text-oxblood-glow/80 tabular-nums">{row.losses}</span>
              <span className="text-right font-mono text-parchment-300 tabular-nums">{winRateOf(row)}</span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-parchment-500">
          Ladders are stored on your device. Opponent rows are placeholder data until rated queues launch.
        </p>
      </section>
    </main>
  );
}

function HeaderRow() {
  return (
    <div className="grid grid-cols-[2.5rem_1fr_4rem_3.5rem] sm:grid-cols-[2.5rem_1fr_4.5rem_4rem_3rem_3rem_3.5rem] items-center px-4 py-3 border-b border-white/8 smallcaps text-[10px] text-parchment-400">
      <span>#</span>
      <span>Player</span>
      <span className="text-right">Rating</span>
      <span className="hidden sm:block text-right">Games</span>
      <span className="hidden sm:block text-right">W</span>
      <span className="hidden sm:block text-right">L</span>
      <span className="text-right">Win%</span>
    </div>
  );
}
