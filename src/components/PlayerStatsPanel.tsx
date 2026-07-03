"use client";

import Link from "next/link";
import { RATING_CATEGORIES } from "@/lib/ratingCategories";
import type { PlayerStats, StreakInfo } from "@/lib/playerStats";

// Lichess-style detailed statistics block, shared by the own-profile page and
// public player pages. Everything renders from one PlayerStats payload.

function formatDate(at: number): string {
  return new Date(at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "less than a minute";
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days} day${days === 1 ? "" : "s"}, ${hours} hr${hours === 1 ? "" : "s"}`;
  if (hours > 0) return `${hours} hr${hours === 1 ? "" : "s"}, ${mins} min`;
  return `${mins} min`;
}

function percent(part: number, whole: number): string {
  return whole === 0 ? "-" : `${Math.round((part / whole) * 100)}%`;
}

function StatRow({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "win" | "loss";
}) {
  const valueColor =
    tone === "win" ? "text-verdigris-glow" : tone === "loss" ? "text-oxblood-glow" : "text-parchment-50";
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-parchment-300">{label}</span>
      <span className="text-right">
        <span className={`font-mono text-sm tabular-nums ${valueColor}`}>{value}</span>
        {detail && <span className="ml-2 font-mono text-xs tabular-nums text-parchment-400">{detail}</span>}
      </span>
    </div>
  );
}

function StreakCard({
  title,
  longest,
  current,
  tone,
}: {
  title: string;
  longest: StreakInfo;
  current: number;
  tone: "win" | "loss";
}) {
  const accent = tone === "win" ? "text-verdigris-glow" : "text-oxblood-glow";
  return (
    <div className="plate p-4">
      <div className="smallcaps text-[10px] text-parchment-400">{title}</div>
      {longest.length === 0 ? (
        <div className="mt-2 text-sm text-parchment-400">None yet</div>
      ) : (
        <>
          <div className={`mt-1 font-mono text-2xl tabular-nums ${accent}`}>
            {longest.length} game{longest.length === 1 ? "" : "s"}
          </div>
          {longest.from != null && longest.to != null && (
            <div className="mt-0.5 text-xs text-parchment-400">
              {formatDate(longest.from)}
              {longest.to !== longest.from ? ` - ${formatDate(longest.to)}` : ""}
            </div>
          )}
        </>
      )}
      <div className="mt-2 border-t border-white/10 pt-2 text-xs text-parchment-300">
        Current:{" "}
        {current > 0 ? (
          <span className={`font-mono tabular-nums ${accent}`}>{current} game{current === 1 ? "" : "s"}</span>
        ) : (
          "-"
        )}
      </div>
    </div>
  );
}

export function PlayerStatsPanel({ stats }: { stats: PlayerStats }) {
  const decided = stats.wins + stats.draws + stats.losses;

  if (stats.totalGames === 0) {
    return (
      <div className="plate p-5 text-sm text-parchment-300">
        No online games recorded yet. Win your first game and the numbers start here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview: the Lichess-style two-column count grid. */}
      <div className="plate p-4 sm:p-5 grid gap-x-8 sm:grid-cols-2">
        <div className="divide-y divide-white/5">
          <StatRow label="Total games" value={String(stats.totalGames)} />
          <StatRow
            label="Rated games"
            value={String(stats.ratedGames)}
            detail={percent(stats.ratedGames, stats.totalGames)}
          />
          <StatRow label="Time spent playing" value={formatDuration(stats.timePlayedMs)} />
          <StatRow label="Losses on time" value={String(stats.timeoutLosses)} />
        </div>
        <div className="divide-y divide-white/5">
          <StatRow
            label="Victories"
            value={String(stats.wins)}
            detail={percent(stats.wins, decided)}
            tone="win"
          />
          <StatRow label="Draws" value={String(stats.draws)} detail={percent(stats.draws, decided)} />
          <StatRow
            label="Defeats"
            value={String(stats.losses)}
            detail={percent(stats.losses, decided)}
            tone="loss"
          />
          <StatRow
            label="Average opponent"
            value={stats.avgOpponentRating != null ? String(stats.avgOpponentRating) : "-"}
          />
        </div>
      </div>

      {/* Rating extremes. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="plate p-4">
          <div className="smallcaps text-[10px] text-parchment-400">Highest rating</div>
          {stats.highest ? (
            <>
              <div className="mt-1 font-mono text-2xl tabular-nums text-gold-leaf">
                {Math.round(stats.highest.rating)}
              </div>
              <div className="mt-0.5 text-xs text-parchment-400">{formatDate(stats.highest.at)}</div>
            </>
          ) : (
            <div className="mt-2 text-sm text-parchment-400">No rated games yet</div>
          )}
        </div>
        <div className="plate p-4">
          <div className="smallcaps text-[10px] text-parchment-400">Lowest rating</div>
          {stats.lowest ? (
            <>
              <div className="mt-1 font-mono text-2xl tabular-nums text-parchment-200">
                {Math.round(stats.lowest.rating)}
              </div>
              <div className="mt-0.5 text-xs text-parchment-400">{formatDate(stats.lowest.at)}</div>
            </>
          ) : (
            <div className="mt-2 text-sm text-parchment-400">No rated games yet</div>
          )}
        </div>
      </div>

      {/* Streaks. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <StreakCard
          title="Winning streak"
          longest={stats.winStreak.longest}
          current={stats.winStreak.current}
          tone="win"
        />
        <StreakCard
          title="Losing streak"
          longest={stats.lossStreak.longest}
          current={stats.lossStreak.current}
          tone="loss"
        />
      </div>

      {/* Strongest opponents beaten in rated play. */}
      {stats.bestWins.length > 0 && (
        <div className="plate p-4 sm:p-5">
          <div className="smallcaps text-[10px] text-parchment-400">Best rated victories</div>
          <ul className="mt-2 divide-y divide-white/5">
            {stats.bestWins.map((win) => (
              <li key={win.id} className="flex items-center justify-between gap-3 py-2">
                <Link
                  href={`/u/${encodeURIComponent(win.opponent)}`}
                  className="min-w-0 truncate text-sm text-parchment-100 hover:text-gold-leaf transition-colors"
                >
                  {win.opponent} <span className="font-mono text-xs text-parchment-400">({win.rating})</span>
                </Link>
                <Link
                  href={`/game/${win.id}`}
                  className="shrink-0 text-xs text-parchment-400 hover:text-parchment-100 transition-colors"
                >
                  {formatDate(win.at)} →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Per-speed record. */}
      <div className="plate p-4 sm:p-5 overflow-x-auto">
        <div className="smallcaps text-[10px] text-parchment-400">By speed</div>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="smallcaps text-[9px] text-parchment-400">
              <th className="py-1.5 text-left font-normal">Speed</th>
              <th className="py-1.5 text-right font-normal">Games</th>
              <th className="py-1.5 text-right font-normal">Wins</th>
              <th className="py-1.5 text-right font-normal">Draws</th>
              <th className="py-1.5 text-right font-normal">Losses</th>
              <th className="py-1.5 text-right font-normal">Win rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {RATING_CATEGORIES.map((category) => {
              const s = stats.perSpeed[category.id];
              const speedDecided = s.wins + s.draws + s.losses;
              const Icon = category.icon;
              return (
                <tr key={category.id} className={s.games === 0 ? "opacity-40" : ""}>
                  <td className="py-2">
                    <span className="flex items-center gap-2 text-parchment-100">
                      <Icon size={14} style={{ color: category.accent }} aria-hidden />
                      {category.label}
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums text-parchment-100">{s.games}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-verdigris-glow">{s.wins}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-parchment-200">{s.draws}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-oxblood-glow">{s.losses}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-parchment-100">
                    {speedDecided > 0 ? percent(s.wins, speedDecided) : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
