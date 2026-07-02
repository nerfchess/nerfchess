"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { loadHistory, type GameRecord } from "@/lib/history";
import { loadProfile } from "@/lib/profile";
import { loadRating } from "@/lib/rating";

interface Computed {
  rating: number;
  ratedGames: number;
  total: number;
  wins: number;
  losses: number;
  draws: number;
  winPct: number | null;
  favoriteTimeControl: string | null;
  avgMoves: number | null;
  avgDurationSec: number | null;
  bestWinStreak: number;
  ratingTrace: number[];
  recent: GameRecord[];
}

function compute(history: GameRecord[], rating: number, ratedGames: number): Computed {
  const wins = history.filter((g) => g.outcome === "win").length;
  const losses = history.filter((g) => g.outcome === "loss").length;
  const draws = history.filter((g) => g.outcome === "draw").length;
  const total = history.length;

  const tcCounts = new Map<string, number>();
  for (const g of history) tcCounts.set(g.timeControl, (tcCounts.get(g.timeControl) ?? 0) + 1);
  const favoriteTimeControl =
    [...tcCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const durations = history.map((g) => g.durationSec).filter((d): d is number => d != null && d > 0);
  const avgDurationSec = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;
  const avgMoves = total
    ? Math.round(history.reduce((a, g) => a + g.moves, 0) / total)
    : null;

  let bestWinStreak = 0;
  let streak = 0;
  for (const g of history) {
    streak = g.outcome === "win" ? streak + 1 : 0;
    bestWinStreak = Math.max(bestWinStreak, streak);
  }

  const ratingTrace = history
    .filter((g) => g.rated && g.ratingAfter != null)
    .map((g) => Math.round(g.ratingAfter as number));

  return {
    rating: Math.round(rating),
    ratedGames,
    total,
    wins,
    losses,
    draws,
    winPct: total ? Math.round((wins / total) * 100) : null,
    favoriteTimeControl,
    avgMoves,
    avgDurationSec,
    bestWinStreak,
    ratingTrace,
    recent: [...history].reverse().slice(0, 10),
  };
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

function formatWhen(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function StatsPage() {
  const [history, setHistory] = useState<GameRecord[] | null>(null);
  const [rating, setRating] = useState(1500);
  const [ratedGames, setRatedGames] = useState(0);
  const [profile, setProfile] = useState<{ username: string | null; avatarId: string | null }>({
    username: null,
    avatarId: null,
  });

  useEffect(() => {
    setHistory(loadHistory());
    const r = loadRating();
    setRating(r.rating);
    setRatedGames(r.games);
    setProfile(loadProfile());
  }, []);

  const stats = useMemo(
    () => (history ? compute(history, rating, ratedGames) : null),
    [history, rating, ratedGames]
  );

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
        <div className="flex items-center gap-4">
          <Avatar avatarId={profile.avatarId} name={profile.username} size={56} />
          <div>
            <h1 className="font-display text-4xl font-bold text-parchment-100 sm:text-5xl">
              {profile.username ?? "Your stats"}
            </h1>
            <p className="mt-1 text-parchment-300">
              {profile.username ? "Player statistics" : "Set a username in Settings to personalize this page."}
            </p>
          </div>
        </div>

        {stats && (
          <>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile label="Rating" value={String(stats.rating)} accent />
              <StatTile label="Games played" value={String(stats.total)} />
              <StatTile
                label="Win rate"
                value={stats.winPct == null ? "-" : `${stats.winPct}%`}
              />
              <StatTile label="Best win streak" value={String(stats.bestWinStreak)} />
            </div>

            <div className="mt-3 plate grid grid-cols-3 divide-x divide-white/10 p-4">
              <Outcome label="Wins" value={stats.wins} className="text-gold-leaf" />
              <Outcome label="Losses" value={stats.losses} className="text-oxblood-glow" />
              <Outcome label="Draws" value={stats.draws} className="text-bruise-glow" />
            </div>

            <div className="mt-6 plate p-5">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-lg font-semibold text-parchment-100">
                  Rating history
                </h2>
                <span className="smallcaps text-[10px] text-parchment-400">
                  {stats.ratingTrace.length} rated {stats.ratingTrace.length === 1 ? "game" : "games"}
                </span>
              </div>
              {stats.ratingTrace.length >= 2 ? (
                <RatingGraph trace={stats.ratingTrace} />
              ) : (
                <p className="mt-3 text-sm text-parchment-400">
                  Play at least two{" "}
                  <Link href="/play" className="text-gold-leaf hover:underline">rated games</Link>{" "}
                  to see your rating over time.
                </p>
              )}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <StatTile
                label="Favorite time control"
                value={stats.favoriteTimeControl ?? "-"}
              />
              <StatTile
                label="Average game length"
                value={stats.avgMoves == null ? "-" : `${stats.avgMoves} moves`}
              />
              <StatTile
                label="Average duration"
                value={stats.avgDurationSec == null ? "-" : formatDuration(stats.avgDurationSec)}
              />
            </div>

            <div className="mt-6 plate overflow-hidden">
              <div className="border-b border-white/8 px-4 py-3 font-display text-lg font-semibold text-parchment-100">
                Recent games
              </div>
              {stats.recent.length === 0 ? (
                <p className="px-4 py-6 text-sm text-parchment-400">
                  No games yet.{" "}
                  <Link href="/play" className="text-gold-leaf hover:underline">Play one</Link>{" "}
                  and it will show up here.
                </p>
              ) : (
                stats.recent.map((g, i) => (
                  <div
                    key={`${g.ts}-${i}`}
                    className={
                      "grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-white/5 px-4 py-2.5 text-sm " +
                      (i % 2 ? "bg-white/[0.015]" : "")
                    }
                  >
                    <span
                      className={
                        "font-display text-xs font-bold uppercase " +
                        (g.outcome === "win"
                          ? "text-gold-leaf"
                          : g.outcome === "loss"
                          ? "text-oxblood-glow"
                          : "text-bruise-glow")
                      }
                    >
                      {g.outcome === "win" ? "Win" : g.outcome === "loss" ? "Loss" : "Draw"}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-parchment-100">
                        vs {g.opponent} · {g.timeControl}
                        {g.rated ? " · rated" : ""}
                      </span>
                      <span className="block truncate text-xs text-parchment-400">
                        {g.myNerf ? `Your rule: ${g.myNerf}` : ""}
                        {g.myNerf && g.opponentNerf ? " · " : ""}
                        {g.opponentNerf ? `Theirs: ${g.opponentNerf}` : ""}
                      </span>
                    </span>
                    <span className="text-right font-mono text-xs text-parchment-400 tabular-nums">
                      {Math.ceil(g.moves / 2)} moves
                      <span className="block">{formatWhen(g.ts)}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function StatTile({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={"plate p-4 " + (accent ? "border-gold/40" : "")}>
      <div
        className={
          "font-display text-2xl font-bold tabular-nums sm:text-3xl " +
          (accent ? "text-gold-leaf" : "text-parchment-50")
        }
      >
        {value}
      </div>
      <div className="mt-1 smallcaps text-[9px] text-parchment-400 sm:text-[10px]">{label}</div>
    </div>
  );
}

function Outcome({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="px-3 text-center">
      <div className={`font-display text-2xl font-bold tabular-nums ${className}`}>{value}</div>
      <div className="mt-0.5 smallcaps text-[9px] text-parchment-400">{label}</div>
    </div>
  );
}

/** Minimal line graph of the rating after each rated game. */
function RatingGraph({ trace }: { trace: number[] }) {
  const w = 640;
  const h = 160;
  const pad = 8;
  const min = Math.min(...trace);
  const max = Math.max(...trace);
  const span = Math.max(20, max - min);
  const x = (i: number) => pad + (i / (trace.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - (min + max) / 2 + span / 2) / span) * (h - pad * 2);
  const points = trace.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  return (
    <div className="mt-3">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full" role="img" aria-label="Rating history graph">
        <polyline
          points={points}
          fill="none"
          stroke="var(--accent-hi)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {trace.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill="var(--accent-hi)" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-parchment-400 tabular-nums">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
