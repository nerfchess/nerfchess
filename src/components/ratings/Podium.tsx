"use client";

// The leaderboard podium: a treasure-dais for the top three of the active
// ladder — runner-up left, champion center and elevated, third right. On
// phones the dais stacks vertically with the champion first; from `sm` up it
// is the classic three-across arrangement. Purely a highlight above the full
// table; it never replaces a row. Metal identity (gold / silver / bronze)
// marks the places, while the header wears the active mode's color (Nerf
// rose, Buff blue) so switching tabs re-tints the dais. Each riser reads as
// carved stone (the dungeon slab carries the section); the champion's column
// adds a gold rim, a laurel arc behind the avatar, and a few rising gold
// motes — all decoration, all parked under html[data-anim="off"].

import Link from "next/link";
import type { CSSProperties } from "react";
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

// Fixed metal hues, in the site's medal register (matching LaurelBadge): a
// radiant gold champion, a cool silver runner-up, a warm bronze third. Hex on
// purpose so the medals never shift with the accent-color setting. `chip` is
// the rgb triple fed to .rune-badge's --badge-rgb for the place chip.
const MEDALS: Record<
  1 | 2 | 3,
  { metal: string; chip: string; label: string; avatar: number; riser: string; wash: string }
> = {
  1: {
    metal: "#ffd97e",
    chip: "244 196 48",
    label: "1st",
    avatar: 72,
    riser: "sm:min-h-20 md:min-h-24",
    wash: "bg-sun/[0.08]",
  },
  2: {
    metal: "#cac6bd",
    chip: "202 198 189",
    label: "2nd",
    avatar: 56,
    riser: "sm:min-h-12",
    wash: "bg-white/[0.03]",
  },
  3: {
    metal: "#c98a5e",
    chip: "201 138 94",
    label: "3rd",
    avatar: 56,
    riser: "sm:min-h-9",
    wash: "bg-white/[0.02]",
  },
};

// DOM order is [2nd, 1st, 3rd] so the champion sits center on the wide dais;
// the mobile stack reorders the champion first via the order utilities below.
const PLACES: { rank: 1 | 2 | 3 }[] = [{ rank: 2 }, { rank: 1 }, { rank: 3 }];

// Rising gold motes above the champion card: a fixed handful (well under the
// 8-node cap), spread and phased inline so no two climb in step.
const MOTES = [
  { mx: "22%", mdelay: "0s", mdur: "5.2s" },
  { mx: "38%", mdelay: "1.8s", mdur: "6.1s" },
  { mx: "50%", mdelay: "0.7s", mdur: "4.8s" },
  { mx: "63%", mdelay: "2.6s", mdur: "5.7s" },
  { mx: "78%", mdelay: "1.2s", mdur: "6.4s" },
  { mx: "30%", mdelay: "3.4s", mdur: "5.5s" },
  { mx: "70%", mdelay: "4.1s", mdur: "5.9s" },
];

// The laurel arc behind an avatar: the LaurelBadge leaf swept around a wider
// circle, leaving the classical opening at the top. Static tint — the
// champion's is gold and brighter, second and third wear their own metal
// quietly. Decoration only, so it stays aria-hidden.
function WreathArc({ color, size, opacity }: { color: string; size: number; opacity: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ opacity }}
    >
      {[-1, 1].map((side) =>
        [32, 68, 104, 140].map((angle) => (
          <path
            key={`${side}:${angle}`}
            d="M12 22.6c-1.5-1.4-1.7-3.3 0-5 1.7 1.7 1.5 3.6 0 5z"
            transform={`rotate(${side * angle} 12 12.6)`}
          />
        )),
      )}
    </svg>
  );
}

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

  // Mode identity for the header + accents, mirroring ModeBadge's tokens so
  // the dais shares the Nerf/Buff color everywhere else in the app uses. The
  // frame border is set inline because .dgn-slab carries its own brass edge.
  const accent =
    category === "buff"
      ? { text: "text-mode-buffGlow", rule: "bg-mode-buff/40", border: "rgba(91, 155, 212, 0.3)" }
      : { text: "text-mode-nerfGlow", rule: "bg-mode-nerf/40", border: "rgba(196, 120, 95, 0.3)" };

  return (
    <section
      aria-label="Podium: top three"
      className="dgn-slab dgn-rivets relative mt-6 overflow-hidden px-3 pb-0 pt-4 sm:px-6"
      style={{ borderColor: accent.border }}
    >
      {/* A soft gold underglow pool beneath the dais: treasure light rising
          from the vault floor. Material, not state — faint on purpose. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
        style={{
          background:
            "radial-gradient(58% 95% at 50% 100%, rgb(var(--energy-gold-rgb) / 0.1), transparent 70%)",
        }}
      />

      <div className="flex items-center justify-center gap-2 pb-2">
        <span className={"h-px w-8 " + accent.rule} aria-hidden="true" />
        <span className={"smallcaps text-[11px] " + accent.text}>Podium</span>
        <span className={"h-px w-8 " + accent.rule} aria-hidden="true" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
        {PLACES.map(({ rank }) => {
          const row = rows[rank - 1];
          if (!row) return null;
          const medal = MEDALS[rank];
          const champion = rank === 1;
          const mine = !!isMe && !row.guest && isMe(row.username);

          const card = (
            <div
              className={
                "relative flex flex-col items-center rounded-md rounded-b-none border border-b-0 px-2 pt-4 pb-3 text-center motion-safe:transition sm:px-3 " +
                (champion ? "podium-rim-gold " : "") +
                (mine ? "bg-gold/10 border-gold/40" : medal.wash)
              }
              style={{
                // Every place wears its metal: a 3px cap plus a faint tinted
                // frame, so 1 / 2 / 3 each read distinct at a glance.
                borderColor: mine ? undefined : medal.metal + "3d",
                borderTopColor: medal.metal,
                borderTopWidth: 3,
              }}
            >
              {champion && (
                // Rising gold motes over the champion only; the CSS parks them
                // under html[data-anim="off"].
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                  {MOTES.map((m, i) => (
                    <span
                      key={i}
                      className="podium-mote"
                      style={
                        { "--mx": m.mx, "--mdelay": m.mdelay, "--mdur": m.mdur } as CSSProperties
                      }
                    />
                  ))}
                </span>
              )}
              <span
                className="rune-badge mb-2"
                style={{ "--badge-rgb": medal.chip } as CSSProperties}
              >
                {medal.label}
              </span>
              <div className="relative">
                {/* The laurel arc behind the avatar: radiant for the champion,
                    a static metal tint for second and third. */}
                <WreathArc
                  color={medal.metal}
                  size={medal.avatar + 26}
                  opacity={champion ? 0.4 : 0.2}
                />
                <span className="relative inline-block">
                  <PlayerAvatar
                    name={row.username}
                    avatar={row.avatar}
                    flair={row.flair}
                    size={medal.avatar}
                  />
                </span>
                <span className="absolute -right-1 -top-1">
                  <LaurelBadge rank={rank} size={rank === 1 ? 20 : 16} />
                </span>
              </div>
              <span
                className={
                  "mt-2 max-w-full truncate font-medium " +
                  (mine
                    ? "text-gold-leaf"
                    : champion
                      ? "text-sun-glow" // gold-leafed champion name, in the fixed medal gold
                      : "text-parchment-100")
                }
              >
                {row.username}
              </span>
              {row.guest && (
                <span className="mt-1 border border-white/15 px-1.5 py-0.5 text-[12px] uppercase tracking-wider text-parchment-400">
                  guest
                </span>
              )}
              {mine && !row.guest && (
                <span className="mt-1 border border-gold/40 px-1.5 py-0.5 text-[12px] uppercase tracking-wider text-gold-leaf">
                  you
                </span>
              )}
              <span
                className={
                  "mt-1.5 font-mono text-lg tabular-nums " +
                  (champion ? "text-sun" : "text-parchment-50")
                }
              >
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
              <span className="smallcaps text-[11px] text-parchment-400">
                {row.games} {row.games === 1 ? "game" : "games"}
              </span>
              {/* The dais riser: a carved stone block, tallest under the
                  champion so the center rides high when the three align at
                  their base (row layout only). It carries the player's bio
                  when they have one. */}
              <span
                className={
                  "mt-3 flex w-full items-start justify-center rounded-t-sm border-x border-t border-white/5 bg-gradient-to-b from-white/[0.04] via-white/[0.015] to-black/25 px-2 py-1.5 " +
                  medal.riser
                }
                style={{
                  boxShadow: "inset 0 1px 0 " + medal.metal + "1f, inset 0 -10px 16px -12px rgba(0,0,0,0.6)",
                }}
              >
                {row.bio ? (
                  <span className="line-clamp-3 max-w-full text-[12px] leading-snug text-parchment-400">
                    {row.bio}
                  </span>
                ) : null}
              </span>
            </div>
          );

          // Champion first in the mobile stack; DOM order takes over on sm+.
          const wrapClass = "min-w-0 sm:flex-1 " + (champion ? "-order-1 sm:order-none" : "");

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
