"use client";

// The leaderboard podium: the active ladder's top three as three plain plates,
// runner-up left, champion centre and a step taller, third right. Each card is
// the same identity unit the table uses (avatar, name, rating, games); the
// place is carried by a metal-coloured rank chip and the laurel sitting INLINE
// after the name, never over it. No garland, beams, petals or crown: those
// hid the one thing a podium is for, reading who is on it.

import Link from "next/link";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { LaurelBadge } from "@/components/LaurelBadge";
import { isProvisionalRd, PROVISIONAL_RD } from "@/lib/ratingDisplay";
import type { RatingCategoryId } from "@/lib/ratingCategories";

export interface PodiumRow {
  username: string;
  avatar?: string | null;
  flair?: string | null;
  bio?: string | null;
  rating: number;
  rd: number;
  games: number;
  guest?: boolean;
}

// Fixed metal hues, matching LaurelBadge. Hex on purpose so the medals never
// shift with the accent.
const MEDALS: Record<1 | 2 | 3, { metal: string; label: string }> = {
  1: { metal: "#ffd97e", label: "1st" },
  2: { metal: "#cac6bd", label: "2nd" },
  3: { metal: "#c98a5e", label: "3rd" },
};

// DOM order is [2nd, 1st, 3rd] so the champion sits centre at every width.
const PLACES: (1 | 2 | 3)[] = [2, 1, 3];

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
  const modeText = category === "buff" ? "text-mode-buffGlow" : "text-mode-nerfGlow";

  return (
    <section aria-label="Podium: top three" className="mt-6">
      <div className="grid grid-cols-3 items-end gap-2 sm:gap-3">
        {PLACES.map((rank) => {
          const row = rows[rank - 1];
          if (!row) return <div key={rank} />;
          const medal = MEDALS[rank];
          const champion = rank === 1;
          const mine = !!isMe && !row.guest && isMe(row.username);
          const provisional = isProvisionalRd(row.rd);

          const card = (
            <div
              className={
                "plate plate-hover flex h-full flex-col items-center px-2 text-center sm:px-4 " +
                (champion ? "py-5 sm:py-6" : "py-4 sm:py-5") +
                (mine ? " border-[color:var(--edge-strong)]" : "")
              }
              style={{ borderTopColor: medal.metal, borderTopWidth: 3 }}
            >
              <span
                className="font-display text-[11px] font-bold uppercase tracking-[0.12em]"
                style={{ color: medal.metal }}
              >
                {medal.label}
              </span>
              <PlayerAvatar
                name={row.username}
                avatar={row.avatar}
                flair={row.flair}
                size={champion ? 56 : 44}
              />
              {/* The name owns its line; the laurel follows it inline so
                  nothing ever sits on top of the handle. */}
              <span className="mt-2 flex max-w-full items-center justify-center gap-1.5">
                <span
                  className={
                    "min-w-0 truncate text-[13px] font-semibold sm:text-[15px] " +
                    (mine ? "text-gold-leaf" : "text-parchment-50")
                  }
                >
                  {row.username}
                </span>
                <LaurelBadge rank={rank} size={champion ? 16 : 14} className="shrink-0" />
              </span>
              {(row.guest || mine) && (
                <span className="mt-1 border border-[color:var(--edge)] px-1.5 py-0.5 text-[11px] uppercase tracking-wider text-parchment-400">
                  {row.guest ? "guest" : "you"}
                </span>
              )}
              <span
                className={
                  "mt-1.5 font-mono text-[15px] tabular-nums sm:text-lg " +
                  (provisional ? "text-parchment-400" : modeText)
                }
                title={provisional ? `Provisional: rating deviation above ${PROVISIONAL_RD}` : undefined}
              >
                {Math.round(row.rating)}
                {provisional && <span>?</span>}
              </span>
              <span className="text-[11px] text-parchment-400">
                {row.games} {row.games === 1 ? "game" : "games"}
              </span>
            </div>
          );

          if (row.guest) {
            return (
              <div key={rank} className="min-w-0">
                {card}
              </div>
            );
          }
          return (
            <Link
              key={rank}
              href={`/u/${row.username}`}
              className="min-w-0 no-underline"
              style={{ display: "block", height: "100%" }}
            >
              {card}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
