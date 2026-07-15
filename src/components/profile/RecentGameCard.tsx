"use client";

import Link from "next/link";
import { ModeBadge } from "../ModeBadge";
import { PlayerAvatar } from "../PlayerAvatar";
import { PlayerLink } from "../PlayerLink";
import { relativeTime } from "./relativeTime";
import { clockLabel } from "@/lib/tournaments";
import type { DraftMode } from "@/engine/buff";

// One finished-game row as served by GET /api/users/[username]/games (and the
// same shape the profile payload's recentGames carries). Only the fields this
// module renders are declared. NOTE: the games contract does NOT include a move
// list, so this module deliberately renders NO board - a final-position preview
// would require replaying moves the payload never carries, and the spec says to
// omit the board rather than fake it.
export interface RecentGameRow {
  id: string;
  white_name: string;
  black_name: string;
  winner: "w" | "b" | "draw" | null;
  reason: string;
  rated: number;
  white_rating_before: number | null;
  white_rating_after: number | null;
  black_rating_before: number | null;
  black_rating_after: number | null;
  time_sec: number;
  increment_sec: number;
  completed_at: number;
  mode: DraftMode | null;
}

// "Recent game": the most recent finished game on a profile, or a fallback when
// the player is not live. Result (text + color, never color-only), the opponent
// (avatar + clickable name + rating), the viewer's rating change as an explicit
// chip, mode badge when known, time control, rated/casual, end reason, and
// relative time. "View replay" opens the game.
export function RecentGameCard({ game, viewer }: { game: RecentGameRow; viewer: string }) {
  const viewerIsWhite = game.white_name.toLowerCase() === viewer.toLowerCase();
  const myColor: "w" | "b" = viewerIsWhite ? "w" : "b";
  const opponent = viewerIsWhite ? game.black_name : game.white_name;
  const oppRating = viewerIsWhite ? game.black_rating_before : game.white_rating_before;

  const outcome = game.winner === "draw" ? "Draw" : game.winner === myColor ? "Won" : "Lost";
  const tone =
    outcome === "Won" ? "text-gold-leaf" : outcome === "Lost" ? "text-oxblood-glow" : "text-bruise-glow";

  const before = viewerIsWhite ? game.white_rating_before : game.black_rating_before;
  const after = viewerIsWhite ? game.white_rating_after : game.black_rating_after;
  const delta = before != null && after != null ? Math.round(after) - Math.round(before) : null;

  return (
    <div className="relative plate overflow-hidden p-4">
      {/* Stretched primary link opening the replay; a SIBLING of the inner
          opponent PlayerLink and the explicit button (all raised with z-10), so
          no anchors nest. */}
      <Link
        href={`/game/${game.id}`}
        aria-label={`View replay of the game vs ${opponent}`}
        className="absolute inset-0 z-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
      />

      <div className="relative z-10 flex items-center justify-between gap-2 pointer-events-none">
        <span className="smallcaps text-[12px] text-parchment-400">Recent game</span>
        <span className="flex items-center gap-2 smallcaps text-[12px] text-parchment-400">
          <span>{game.rated ? "Rated" : "Casual"}</span>
          <span aria-hidden>·</span>
          <span className="font-mono">{clockLabel(game.time_sec, game.increment_sec)}</span>
        </span>
      </div>

      <div className="relative z-10 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`font-display text-lg font-semibold ${tone}`}>{outcome}</span>
        <span className="flex items-center gap-1 text-parchment-300">
          <span className="text-parchment-400">vs</span>
          <span className="flex items-center gap-1.5">
            <PlayerAvatar name={opponent} avatar={null} size={22} />
            <PlayerLink
              name={opponent}
              className="relative z-10 font-display text-parchment-100"
            />
            {oppRating != null && (
              <span className="font-mono text-xs tabular-nums text-parchment-400">
                ({Math.round(oppRating)})
              </span>
            )}
          </span>
        </span>
        {game.mode ? <ModeBadge mode={game.mode} /> : null}
      </div>

      <div className="relative z-10 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {/* Rating change as its own chip, with an explicit " · " separator, so
            the delta can never run together with the date (the old
            "-27/14/2026" bug). Text sign, never color-only. */}
        {delta != null && (
          <span
            className={
              "inline-flex items-center rounded-sm border px-1.5 py-px font-mono text-xs tabular-nums " +
              (delta > 0
                ? "border-gold/40 bg-gold/10 text-gold-leaf"
                : delta < 0
                  ? "border-oxblood-glow/40 bg-oxblood/10 text-oxblood-glow"
                  : "border-white/15 bg-white/[0.03] text-parchment-400")
            }
          >
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        )}
        {delta != null && <span aria-hidden className="text-parchment-500">·</span>}
        <span className="text-parchment-400">{game.reason}</span>
        <span aria-hidden className="text-parchment-500">·</span>
        <span className="text-parchment-400">{relativeTime(game.completed_at)}</span>
      </div>

      <div className="relative z-10 mt-3">
        <Link
          href={`/game/${game.id}`}
          className="relative z-10 btn-leaf inline-flex min-h-[44px] items-center px-4 font-display text-sm font-semibold"
        >
          View replay
        </Link>
      </div>
    </div>
  );
}
