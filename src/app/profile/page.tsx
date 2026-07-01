"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

export default function ProfilePage() {
  const [ratings, setRatings] = useState<Ratings | null>(null);
  const [active, setActive] = useState<RatingCategoryId>(DEFAULT_CATEGORY);

  useEffect(() => {
    setRatings(loadRatings());
  }, []);

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
        {/* Identity header — there are no accounts yet, so this is the local player. */}
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-gold/40 bg-gold/10 font-display text-2xl text-gold-leaf">
            Y
          </span>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl text-parchment-50">You</h1>
            <p className="text-sm text-parchment-400">Your ratings and record, stored on this device.</p>
          </div>
        </div>

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
