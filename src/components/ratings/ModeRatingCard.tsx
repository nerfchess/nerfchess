// Compact per-mode rating card, shared by /u profiles and anywhere else the
// Nerf / Buff ratings render (spec 2.4). One card per mode, wearing that
// mode's icon and accent color. Everything reads from a single CategoryRatingRow
// so a mode with no rated games degrades to a quiet placeholder instead of
// crashing. All numerics use tabular-nums so stacked cards line up column-wise.

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { RatingCategory } from "@/lib/ratingCategories";
import { isProvisionalRd } from "@/lib/ratingDisplay";

// The stats a mode bucket carries. Mirrors the profile payload's
// `ratings[category]` shape (CategoryRatingRow) without importing the page.
export interface ModeRatingRow {
  rating: number;
  rd: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  peak: number;
}

export interface ModeRatingCardProps {
  /** The mode this card describes (a member of ACTIVE_RATING_CATEGORIES). */
  category: RatingCategory;
  /** The player's stats in this mode, or null/undefined when they have never
   *  played a rated game here (renders the "no rated games" placeholder). */
  row?: ModeRatingRow | null;
  /** Rating change over the trailing 7 days (see recentRatingDelta). A number
   *  renders a movement chip; null omits it entirely (no games in the window). */
  recentDelta?: number | null;
  /** Top-100 standings rank, when the player is currently ranked in this mode;
   *  null/undefined omits the "#N" chip. */
  rank?: number | null;
  className?: string;
}

// Win rate over DECIDED games only (draws excluded from the denominator, so a
// drawish player is not punished for splitting points). "-" when nothing is
// decided yet, matching the stats panel's percent() convention.
function winRate(wins: number, losses: number): string {
  const decided = wins + losses;
  return decided === 0 ? "-" : `${Math.round((wins / decided) * 100)}%`;
}

// Movement chip: signed delta over the trailing window. Gold for a gain,
// oxblood for a loss, muted for flat. The sign/word is always in the text so
// the chip is never color-only (accessibility rule).
function MovementChip({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-[11px] font-semibold tabular-nums text-gold-leaf">
        <TrendingUp className="h-3 w-3" strokeWidth={2.4} aria-hidden />+{delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-[11px] font-semibold tabular-nums text-oxblood-glow">
        <TrendingDown className="h-3 w-3" strokeWidth={2.4} aria-hidden />
        {delta}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-[11px] font-medium tabular-nums text-parchment-400">
      <Minus className="h-3 w-3" strokeWidth={2.4} aria-hidden />
      flat
    </span>
  );
}

export function ModeRatingCard({ category, row, recentDelta, rank, className = "" }: ModeRatingCardProps) {
  const Icon = category.icon;
  const provisional = row ? isProvisionalRd(row.rd) : false;

  return (
    <div className={"plate p-3 " + className}>
      {/* Header: mode identity on the left, rank chip on the right. */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 smallcaps text-[10px] text-parchment-400">
          <Icon className="h-3 w-3" style={{ color: category.accent }} strokeWidth={2.2} aria-hidden />
          {category.label}
        </span>
        {rank != null && (
          <span
            className="rounded-sm border border-gold/25 bg-gold/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-gold-leaf"
            title={`Ranked #${rank} in ${category.label}`}
          >
            #{rank}
          </span>
        )}
      </div>

      {/* Current rating + provisional marker + recent movement. */}
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-mono text-xl tabular-nums text-parchment-100">
          {row ? (
            <>
              {Math.round(row.rating)}
              {provisional && (
                <span className="text-parchment-400" title="Provisional rating">
                  ?
                </span>
              )}
            </>
          ) : (
            <span className="text-parchment-500">-</span>
          )}
        </span>
        {recentDelta != null && <MovementChip delta={recentDelta} />}
      </div>

      {/* Peak + games, then the colored W/D/L record and win rate. Each record
          figure keeps its W/D/L letter, so the color pairing is never the only
          signal. */}
      {row ? (
        <>
          <div className="mt-1 font-mono text-[10px] tabular-nums text-parchment-400">
            peak {Math.round(row.peak)} · {row.games} {row.games === 1 ? "game" : "games"}
          </div>
          <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] tabular-nums">
            <span className="text-verdigris-glow">{row.wins}W</span>
            <span className="text-parchment-400">{row.draws}D</span>
            <span className="text-oxblood-glow">{row.losses}L</span>
            <span className="ml-auto text-parchment-300">{winRate(row.wins, row.losses)} win</span>
          </div>
        </>
      ) : (
        <div className="mt-1 font-mono text-[10px] text-parchment-400">no rated games</div>
      )}
    </div>
  );
}
