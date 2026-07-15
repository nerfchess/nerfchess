// Compact per-mode rating card, shared by /u profiles and anywhere else the
// Nerf / Buff ratings render (spec 2.4). One card per mode, wearing that mode's
// hue on a left edge and its icon. A mode with no rated games degrades to a
// quiet "Unrated" state (no em dash, no bare hyphen) rather than a dash. The
// whole card is capped under 96px tall so a row of two never grows into a
// column. All numerics use tabular-nums so stacked cards line up.

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
   *  played a rated game here (renders the "Unrated" placeholder). */
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
// drawish player is not punished for splitting points). Null when nothing is
// decided yet, so the caller can omit it rather than print a placeholder.
function winRate(wins: number, losses: number): number | null {
  const decided = wins + losses;
  return decided === 0 ? null : Math.round((wins / decided) * 100);
}

// Movement chip: signed delta over the trailing window. Positive reads verdigris,
// a loss oxblood, flat muted. The sign/word is always in the text so the chip is
// never color-only (accessibility rule).
function MovementChip({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-[12px] font-semibold tabular-nums text-verdigris-glow">
        <TrendingUp className="h-3 w-3" strokeWidth={2.4} aria-hidden />+{delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-[12px] font-semibold tabular-nums text-oxblood-glow">
        <TrendingDown className="h-3 w-3" strokeWidth={2.4} aria-hidden />
        {delta}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-[12px] font-medium tabular-nums text-parchment-400">
      <Minus className="h-3 w-3" strokeWidth={2.4} aria-hidden />
      flat
    </span>
  );
}

// The W / D / L micro-bar: a single thin track split by proportion. Win segment
// reads verdigris, draws muted, losses oxblood. Purely decorative (aria-hidden);
// the exact counts sit beside it in text so the record is never color-only.
function RecordBar({ wins, draws, losses }: { wins: number; draws: number; losses: number }) {
  const total = wins + draws + losses;
  if (total === 0) return null;
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <span
      aria-hidden
      className="flex h-1.5 w-full overflow-hidden rounded-full"
      style={{ background: "var(--edge)" }}
    >
      {wins > 0 && <span className="h-full bg-verdigris-glow" style={{ width: pct(wins) }} />}
      {draws > 0 && <span className="h-full bg-parchment-500" style={{ width: pct(draws) }} />}
      {losses > 0 && <span className="h-full bg-oxblood-glow" style={{ width: pct(losses) }} />}
    </span>
  );
}

export function ModeRatingCard({ category, row, recentDelta, rank, className = "" }: ModeRatingCardProps) {
  const Icon = category.icon;
  const provisional = row ? isProvisionalRd(row.rd) : false;
  const wr = row ? winRate(row.wins, row.losses) : null;

  return (
    <div
      className={"plate relative max-h-24 overflow-hidden py-3 pl-4 pr-3 " + className}
    >
      {/* Mode-hue edge down the left rim. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: category.accent }}
      />

      {/* Header: mode identity on the left, rank chip on the right. */}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-parchment-300">
          <Icon className="h-3.5 w-3.5" style={{ color: category.accent }} strokeWidth={2.2} aria-hidden />
          {category.label}
        </span>
        {rank != null && (
          <span
            className="rounded-sm border border-gold/25 bg-gold/10 px-1.5 py-0.5 font-mono text-[12px] font-semibold leading-none tabular-nums text-gold-leaf"
            title={`Ranked #${rank} in ${category.label}`}
          >
            #{rank}
          </span>
        )}
      </div>

      {row ? (
        <>
          {/* Current rating + provisional marker + recent movement. */}
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-[26px] font-semibold leading-none tabular-nums text-parchment-50">
              {Math.round(row.rating)}
              {provisional && (
                <span className="align-top text-base text-parchment-400" title="Provisional rating">
                  ?
                </span>
              )}
            </span>
            {recentDelta != null && <MovementChip delta={recentDelta} />}
            <span className="ml-auto self-end font-mono text-[12px] tabular-nums text-parchment-400">
              {row.games} {row.games === 1 ? "game" : "games"}
            </span>
          </div>

          {/* W / D / L record: micro-bar plus explicit counts (never color-only). */}
          <div className="mt-2 flex items-center gap-2">
            <span className="flex shrink-0 items-center gap-1.5 font-mono text-[12px] tabular-nums">
              <span className="text-verdigris-glow">{row.wins}W</span>
              <span className="text-parchment-400">{row.draws}D</span>
              <span className="text-oxblood-glow">{row.losses}L</span>
            </span>
            <span className="min-w-0 flex-1">
              <RecordBar wins={row.wins} draws={row.draws} losses={row.losses} />
            </span>
            {wr != null && (
              <span className="shrink-0 font-mono text-[12px] tabular-nums text-parchment-300">{wr}% win</span>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mt-1 font-display text-[22px] font-semibold leading-none text-parchment-400">
            Unrated
          </div>
          <div className="mt-2 text-[12px] text-parchment-400">No rated games in this mode yet.</div>
        </>
      )}
    </div>
  );
}
