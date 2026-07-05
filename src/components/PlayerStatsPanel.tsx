"use client";

import Link from "next/link";
import { getNerf } from "@/engine/nerfs/library";
import { MODE_RATING_CATEGORIES } from "@/lib/ratingCategories";
import { TIER_LABEL, TIER_ROMAN } from "@/lib/tiers";
import type { DailyBucket, PlayerStats, StreakInfo } from "@/lib/playerStats";

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

// Compact duration for single games and sessions, where minute resolution
// would round a bullet game down to nothing.
function formatShortDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec} sec`;
  const minutes = Math.floor(totalSec / 60);
  if (minutes >= 60) return formatDuration(ms);
  const sec = totalSec % 60;
  return sec > 0 ? `${minutes} min ${sec} sec` : `${minutes} min`;
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

function ExtremeCard({
  title,
  point,
  valueClass,
}: {
  title: string;
  point: { rating: number; at: number; gameId: string } | null;
  valueClass: string;
}) {
  if (!point) {
    return (
      <div className="plate p-4">
        <div className="smallcaps text-[10px] text-parchment-400">{title}</div>
        <div className="mt-2 text-sm text-parchment-400">No rated games yet</div>
      </div>
    );
  }
  return (
    <Link
      href={`/game/${point.gameId}`}
      title="View the game"
      className="plate block p-4 no-underline transition-colors hover:border-gold/40"
    >
      <div className="smallcaps text-[10px] text-parchment-400">{title}</div>
      <div className={`mt-1 font-mono text-2xl tabular-nums ${valueClass}`}>{Math.round(point.rating)}</div>
      <div className="mt-0.5 text-xs text-parchment-400">{formatDate(point.at)}</div>
    </Link>
  );
}

// One stacked bar per day: wins on top, then draws, losses at the bottom.
// Hover (or long-press) a bar for the date and exact counts.
function DailyStrip({ daily }: { daily: DailyBucket[] }) {
  const max = daily.reduce((m, d) => Math.max(m, d.wins + d.losses + d.draws), 0);
  return (
    <div className="plate p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="smallcaps text-[10px] text-parchment-400">Last 30 days</div>
        <span className="text-[10px] text-parchment-400">
          <span className="text-verdigris-glow">wins</span> · draws ·{" "}
          <span className="text-oxblood-glow">losses</span>
        </span>
      </div>
      {max === 0 ? (
        <div className="mt-2 text-sm text-parchment-400">No games in the last 30 days</div>
      ) : (
        <div className="mt-3 flex h-16 items-end gap-[3px]">
          {daily.map((d) => {
            const total = d.wins + d.losses + d.draws;
            return (
              <div
                key={d.date}
                title={`${d.date}: ${d.wins} won, ${d.losses} lost, ${d.draws} drawn`}
                className="flex flex-1 flex-col justify-end self-stretch"
              >
                {total === 0 ? (
                  <div className="h-[2px] bg-white/10" />
                ) : (
                  <>
                    {d.wins > 0 && (
                      <div className="bg-verdigris-glow/80" style={{ height: `${(d.wins / max) * 100}%` }} />
                    )}
                    {d.draws > 0 && (
                      <div className="bg-parchment-400/60" style={{ height: `${(d.draws / max) * 100}%` }} />
                    )}
                    {d.losses > 0 && (
                      <div className="bg-oxblood-glow/80" style={{ height: `${(d.losses / max) * 100}%` }} />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
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

      {/* Daily results, one stacked bar per day. */}
      <DailyStrip daily={stats.daily} />

      {/* Rating extremes, each linking to the game that set it. */}
      <div className="grid gap-3 sm:grid-cols-2">
        <ExtremeCard title="Highest rating" point={stats.highest} valueClass="text-gold-leaf" />
        <ExtremeCard title="Lowest rating" point={stats.lowest} valueClass="text-parchment-200" />
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

      {/* The opponents faced the most, with the record against each. */}
      {stats.headToHead.length > 0 && (
        <div className="plate p-4 sm:p-5 overflow-x-auto">
          <div className="smallcaps text-[10px] text-parchment-400">Head to head</div>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="smallcaps text-[9px] text-parchment-400">
                <th className="py-1.5 text-left font-normal">Opponent</th>
                <th className="py-1.5 text-right font-normal">Games</th>
                <th className="py-1.5 text-right font-normal">W / L / D</th>
                <th className="py-1.5 text-right font-normal">Last played</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.headToHead.map((entry) => (
                <tr key={entry.opponent.toLowerCase()}>
                  <td className="py-2">
                    <Link
                      href={`/u/${encodeURIComponent(entry.opponent)}`}
                      className="text-parchment-100 hover:text-gold-leaf transition-colors"
                    >
                      {entry.opponent}
                    </Link>
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums text-parchment-100">{entry.games}</td>
                  <td className="py-2 text-right font-mono tabular-nums">
                    <span className="text-verdigris-glow">{entry.wins}</span>
                    <span className="text-parchment-400"> / </span>
                    <span className="text-oxblood-glow">{entry.losses}</span>
                    <span className="text-parchment-400"> / </span>
                    <span className="text-parchment-200">{entry.draws}</span>
                  </td>
                  <td className="py-2 text-right text-xs text-parchment-400">{formatDate(entry.lastPlayed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* The secret rules this player is dealt the most. */}
      {stats.favoriteNerfs.length > 0 && (
        <div className="plate p-4 sm:p-5 overflow-x-auto">
          <div className="smallcaps text-[10px] text-parchment-400">Favorite rules</div>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="smallcaps text-[9px] text-parchment-400">
                <th className="py-1.5 text-left font-normal">Rule</th>
                <th className="py-1.5 text-right font-normal">Dealt</th>
                <th className="py-1.5 text-right font-normal">Wins</th>
                <th className="py-1.5 text-right font-normal">Win rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.favoriteNerfs.map((fav) => {
                const nerf = getNerf(fav.nerfId);
                return (
                  <tr key={fav.nerfId}>
                    <td className="py-2">
                      {nerf ? (
                        <span className="flex min-w-0 items-center gap-2">
                          <span className={`truncate font-display font-semibold tier-${nerf.tier}`}>
                            {nerf.name}
                          </span>
                          <span
                            className="smallcaps shrink-0 text-[9px] text-parchment-400"
                            title={`Difficulty ${nerf.tier}: ${TIER_LABEL[nerf.tier]}`}
                          >
                            {TIER_ROMAN[nerf.tier]}
                          </span>
                        </span>
                      ) : (
                        <span className="font-mono text-parchment-300">{fav.nerfId}</span>
                      )}
                    </td>
                    <td className="py-2 text-right font-mono tabular-nums text-parchment-100">{fav.dealt}</td>
                    <td className="py-2 text-right font-mono tabular-nums text-verdigris-glow">{fav.wins}</td>
                    <td className="py-2 text-right font-mono tabular-nums text-parchment-100">
                      {Math.round(fav.winRate * 100)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* How long this player's games run. */}
      <div className="plate p-4 sm:p-5">
        <div className="smallcaps text-[10px] text-parchment-400">Game length</div>
        <div className="mt-1 divide-y divide-white/5">
          <StatRow
            label="Average moves"
            value={stats.gameLength.avgPlies != null ? String(Math.round(stats.gameLength.avgPlies / 2)) : "-"}
          />
          <StatRow
            label="Average duration"
            value={
              stats.gameLength.avgDurationMs != null
                ? formatShortDuration(stats.gameLength.avgDurationMs)
                : "-"
            }
          />
        </div>
      </div>

      {/* Play sessions: runs of games less than an hour apart. */}
      {stats.sessions.recent.length > 0 && (
        <div className="plate p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <div className="smallcaps text-[10px] text-parchment-400">Recent sessions</div>
            <span className="text-[10px] text-parchment-400">
              longest {stats.sessions.longestGames} game{stats.sessions.longestGames === 1 ? "" : "s"} ·{" "}
              {stats.sessions.avgGames} per session
            </span>
          </div>
          <ul className="mt-2 divide-y divide-white/5">
            {stats.sessions.recent.map((session) => (
              <li key={session.startedAt} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate text-parchment-100">
                  {formatDate(session.startedAt)}
                  <span className="ml-2 text-xs text-parchment-400">
                    {session.games} game{session.games === 1 ? "" : "s"} ·{" "}
                    {formatShortDuration(session.durationMs)}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-sm tabular-nums">
                  <span className="text-verdigris-glow">{session.wins}</span>
                  <span className="text-parchment-400"> / </span>
                  <span className="text-oxblood-glow">{session.losses}</span>
                  <span className="text-parchment-400"> / </span>
                  <span className="text-parchment-200">{session.draws}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Per-mode record: Nerf and Buff, the only two rated buckets. */}
      <div className="plate p-4 sm:p-5 overflow-x-auto">
        <div className="smallcaps text-[10px] text-parchment-400">By mode</div>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="smallcaps text-[9px] text-parchment-400">
              <th className="py-1.5 text-left font-normal">Mode</th>
              <th className="py-1.5 text-right font-normal">Games</th>
              <th className="py-1.5 text-right font-normal">Wins</th>
              <th className="py-1.5 text-right font-normal">Draws</th>
              <th className="py-1.5 text-right font-normal">Losses</th>
              <th className="py-1.5 text-right font-normal">Win rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {MODE_RATING_CATEGORIES.map((category) => {
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
