"use client";

// Site-wide statistics, moved into the moderation area: how much nerfchess is
// being played and which secret rules show up (and win) the most. Gated the
// same way as /mod: this page hides itself from non-mods (the numbers come
// from /api/stats, which has always been public data; regular players now see
// their own numbers on their profile instead).

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountUser, fetchMe } from "@/lib/authClient";
import { getNerf } from "@/engine/nerfs/library";
import { TIER_LABEL, TIER_ROMAN } from "@/lib/tiers";

interface SiteStats {
  games: {
    total: number;
    vsBots?: number;
    rated: number;
    today: number;
    whiteWins: number;
    blackWins: number;
    draws: number;
    averageMoves: number;
  };
  players: { total: number; withGames: number };
  topNerfs: { id: string; dealt: number; wins: number }[];
}

export default function ModStatsPage() {
  const [me, setMe] = useState<AccountUser | null | undefined>(undefined);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetchMe().then(setMe);
  }, []);

  const isMod = me && (me.role === "mod" || me.role === "admin");

  useEffect(() => {
    if (!isMod) return;
    let cancelled = false;
    fetch("/api/stats")
      .then((res) => (res.ok ? (res.json() as Promise<SiteStats>) : Promise.reject()))
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isMod]);

  const decided = stats ? stats.games.whiteWins + stats.games.blackWins + stats.games.draws : 0;
  const pct = (n: number) => (decided > 0 ? `${Math.round((n / decided) * 100)}%` : "-");

  return (
    <main className="min-h-screen pb-16">
      <nav className="flex items-center justify-between px-5 sm:px-10 py-6">
        <Link href="/" className="font-display text-2xl tracking-tight">
          nerf<span className="text-gold-leaf">chess</span>
        </Link>
        <div className="flex items-center gap-3 text-sm font-medium">
          <Link href="/mod" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Moderation</Link>
          <Link href="/lobby" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Play</Link>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 py-8">
        {me === undefined ? (
          <div className="text-parchment-300">Loading…</div>
        ) : !isMod ? (
          <>
            <h1 className="font-display text-4xl">Site statistics</h1>
            <p className="mt-3 text-parchment-200">
              This page is for moderators.{" "}
              {!me && (
                <Link href="/login" className="text-gold-leaf hover:underline">Sign in</Link>
              )}
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl sm:text-5xl">Site statistics</h1>
            <p className="mt-3 text-parchment-200">
              Every online game played on nerfchess, counted.
            </p>

            {failed ? (
              <div className="mt-8 plate p-6 text-parchment-300">
                Stats are unavailable right now. Try again in a minute.
              </div>
            ) : !stats ? (
              <div className="mt-8 text-parchment-300/60">Loading…</div>
            ) : (
              <>
                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard label="Games played" value={stats.games.total + (stats.games.vsBots ?? 0)} />
                  <StatCard label="Games vs bots" value={stats.games.vsBots ?? 0} />
                  <StatCard label="Games today" value={stats.games.today} />
                  <StatCard label="Rated games" value={stats.games.rated} />
                  <StatCard label="Avg. game length" value={stats.games.averageMoves} suffix=" moves" />
                  <StatCard label="Players" value={stats.players.total} />
                  <StatCard label="Players with a game" value={stats.players.withGames} />
                  <StatCard label="White wins" value={stats.games.whiteWins} suffix={` · ${pct(stats.games.whiteWins)}`} />
                  <StatCard label="Black wins" value={stats.games.blackWins} suffix={` · ${pct(stats.games.blackWins)}`} />
                </div>

                <div className="mt-10">
                  <div className="rule-ornament mb-4">
                    <span className="font-display">Most dealt rules</span>
                  </div>
                  {stats.topNerfs.length === 0 ? (
                    <p className="text-sm text-parchment-400">No games recorded yet.</p>
                  ) : (
                    <div className="plate overflow-hidden">
                      <div className="grid grid-cols-[1fr_5rem_5rem_5rem] items-center border-b border-white/8 px-4 py-3 smallcaps text-[10px] text-parchment-400">
                        <span>Rule</span>
                        <span className="text-right">Dealt</span>
                        <span className="text-right">Wins</span>
                        <span className="text-right">Win rate</span>
                      </div>
                      {stats.topNerfs.map((row, i) => {
                        const nerf = getNerf(row.id);
                        return (
                          <div
                            key={row.id}
                            className={
                              "grid grid-cols-[1fr_5rem_5rem_5rem] items-center border-b border-white/5 px-4 py-2.5 text-sm " +
                              (i % 2 ? "bg-white/[0.015]" : "")
                            }
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              {nerf ? (
                                <>
                                  <span className={`truncate font-display font-semibold tier-${nerf.tier}`}>
                                    {nerf.name}
                                  </span>
                                  <span
                                    className="smallcaps shrink-0 text-[9px] text-parchment-400"
                                    title={`Difficulty ${nerf.tier}: ${TIER_LABEL[nerf.tier]}`}
                                  >
                                    {TIER_ROMAN[nerf.tier]}
                                  </span>
                                </>
                              ) : (
                                <span className="truncate font-mono text-parchment-300">{row.id}</span>
                              )}
                            </span>
                            <span className="text-right font-mono text-parchment-100 tabular-nums">{row.dealt}</span>
                            <span className="text-right font-mono text-parchment-300 tabular-nums">{row.wins}</span>
                            <span className="text-right font-mono text-parchment-100 tabular-nums">
                              {row.dealt > 0 ? `${Math.round((row.wins / row.dealt) * 100)}%` : "-"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-parchment-400">
                    Win rate is how often the player holding that rule won the game. Curious what a
                    rule does? Look it up in the <Link href="/codex" className="text-gold-leaf hover:underline">Codex</Link>.
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="plate p-4">
      <div className="font-mono text-2xl text-parchment-50 tabular-nums">
        {value.toLocaleString()}
        {suffix && <span className="text-sm text-parchment-400">{suffix}</span>}
      </div>
      <div className="mt-1 smallcaps text-[10px] text-parchment-400">{label}</div>
    </div>
  );
}
