"use client";

// The leaderboard podium: a classic Olympic dais for the top three of the
// active ladder — runner-up left, champion center and elevated, third right,
// stacking to a single column on narrow screens. Purely a highlight above the
// full table; it never replaces a row. Metal identity (gold / silver / bronze)
// marks the places, while the frame wears the active mode's color (Nerf rose,
// Buff blue) so switching tabs re-tints the whole dais.

import Link from "next/link";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { LaurelBadge } from "@/components/LaurelBadge";
import { isProvisionalRd, PROVISIONAL_RD } from "@/lib/ratingDisplay";
import type { RatingCategoryId } from "@/lib/ratingCategories";

export interface PodiumRow {
  username: string;
  avatar?: string | null;
  flair?: string | null;
  rating: number;
  rd: number;
  games: number;
  guest?: boolean;
}

// Fixed metal hues, in the site's medal register (matching LaurelBadge): a
// radiant gold champion, a cool silver runner-up, a warm bronze third. Hex on
// purpose so the medals never shift with the accent-color setting.
const MEDALS: Record<
  1 | 2 | 3,
  { metal: string; label: string; avatar: number; riser: string; wash: string }
> = {
  1: { metal: "#ffd97e", label: "1st", avatar: 72, riser: "h-14 sm:h-20", wash: "bg-sun/[0.06]" },
  2: { metal: "#cac6bd", label: "2nd", avatar: 56, riser: "h-14 sm:h-12", wash: "bg-white/[0.02]" },
  3: { metal: "#c98a5e", label: "3rd", avatar: 56, riser: "h-14 sm:h-7", wash: "bg-white/[0.02]" },
};

// DOM order is [2nd, 1st, 3rd] so the champion sits center on wide screens;
// order-* classes re-sequence to [1st, 2nd, 3rd] when the dais stacks.
const PLACES: { rank: 1 | 2 | 3; mobileOrder: string }[] = [
  { rank: 2, mobileOrder: "order-2" },
  { rank: 1, mobileOrder: "order-1" },
  { rank: 3, mobileOrder: "order-3" },
];

export function Podium({
  rows,
  category,
  isMe,
}: {
  rows: PodiumRow[];
  category: RatingCategoryId;
  /** Highlights the viewer's own card, matching the table below. */
  isMe?: (name: string) => boolean;
}) {
  if (rows.length === 0) return null;

  // Mode identity for the frame + accents, mirroring ModeBadge's tokens so the
  // dais shares the Nerf/Buff color everywhere else in the app uses.
  const accent =
    category === "buff"
      ? { border: "border-mode-buff/30", text: "text-mode-buffGlow", shadow: "shadow-buff", rule: "bg-mode-buff/40" }
      : { border: "border-mode-nerf/30", text: "text-mode-nerfGlow", shadow: "shadow-nerf", rule: "bg-mode-nerf/40" };

  return (
    <section
      aria-label="Podium — top three"
      className={"mt-6 plate " + accent.border + " " + accent.shadow + " px-3 sm:px-6 pt-4 pb-0 overflow-hidden"}
    >
      <div className="flex items-center justify-center gap-2 pb-2">
        <span className={"h-px w-8 " + accent.rule} aria-hidden="true" />
        <span className={"smallcaps text-[10px] " + accent.text}>Podium</span>
        <span className={"h-px w-8 " + accent.rule} aria-hidden="true" />
      </div>

      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end sm:gap-3">
        {PLACES.map(({ rank, mobileOrder }) => {
          const row = rows[rank - 1];
          if (!row) return null;
          const medal = MEDALS[rank];
          const mine = !!isMe && !row.guest && isMe(row.username);

          const card = (
            <div
              className={
                "relative flex flex-col items-center rounded-t-md border border-b-0 px-3 pt-4 pb-3 text-center motion-safe:transition " +
                (mine ? "bg-gold/10 border-gold/40" : medal.wash + " border-white/10")
              }
              style={{ borderTopColor: medal.metal, borderTopWidth: 3 }}
            >
              <span
                className="mb-2 font-mono text-[11px] tabular-nums"
                style={{ color: medal.metal }}
              >
                {medal.label}
              </span>
              <div className="relative">
                <PlayerAvatar
                  name={row.username}
                  avatar={row.avatar}
                  flair={row.flair}
                  size={medal.avatar}
                />
                <span className="absolute -right-1 -top-1">
                  <LaurelBadge rank={rank} size={rank === 1 ? 20 : 16} />
                </span>
              </div>
              <span
                className={
                  "mt-2 max-w-full truncate font-medium " +
                  (mine ? "text-gold-leaf" : rank === 1 ? "text-parchment-50" : "text-parchment-100")
                }
              >
                {row.username}
              </span>
              {row.guest && (
                <span className="mt-1 border border-white/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-parchment-400">
                  guest
                </span>
              )}
              {mine && !row.guest && (
                <span className="mt-1 border border-gold/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-gold-leaf">
                  you
                </span>
              )}
              <span className="mt-1.5 font-mono text-lg tabular-nums text-parchment-50">
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
              <span className="smallcaps text-[10px] text-parchment-400">
                {row.games} {row.games === 1 ? "game" : "games"}
              </span>
              {/* The dais riser: taller under the champion so the center rides
                  high when the three align at their base on wide screens. */}
              <span
                aria-hidden="true"
                className={"mt-3 hidden w-full rounded-t-sm border-x border-t border-white/5 bg-white/[0.02] sm:block " + medal.riser}
              />
            </div>
          );

          const wrapClass = "min-w-0 flex-1 " + mobileOrder + " sm:order-none";

          if (row.guest) {
            return (
              <div key={rank} className={wrapClass}>
                {card}
              </div>
            );
          }
          return (
            <Link
              key={rank}
              href={`/u/${row.username}`}
              className={wrapClass + " motion-safe:transition hover:brightness-110"}
            >
              {card}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
