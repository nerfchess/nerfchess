"use client";

// The leaderboard podium, second coronation: a full ceremony dais for the top
// three of the active ladder — runner-up left, champion center and elevated,
// third right. Retired once after playtest feedback, rebuilt grander by owner
// request: every place stands in its metal spotlight under a strung laurel
// garland, flower petals drift down the whole dais, bouquets rest on the
// stone, the champion wears a hovering crown, rising motes, and camera-flash
// glints. The dais keeps the same three-across silhouette on every screen —
// on phones the columns simply tighten. Purely a highlight above the full
// table; it never replaces a row. Metal identity (gold / silver / bronze)
// marks the places while the header wears the active mode's color, so
// switching tabs re-tints the ceremony. All decoration is transform/opacity,
// node-capped, and parked under html[data-anim="off"] (static lighting stays).

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { LaurelBadge } from "@/components/LaurelBadge";
import { isProvisionalRd, PROVISIONAL_RD } from "@/lib/ratingDisplay";
import { censorText } from "@/lib/profanity";
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
  {
    metal: string;
    chip: string;
    label: string;
    /** Ceremony epithet under the place chip: each step gets its own word. */
    epithet: string;
    avatar: number;
    avatarNarrow: number;
    riser: string;
    wash: string;
    /** How many rising motes this place burns (champion the most). */
    motes: number;
    /** How many camera-flash glints twinkle over this place. */
    glints: number;
    /** Spotlight strength for .podium-beam (--beam-a). */
    beamA: number;
    /** Petal hues for the ceremony bouquet laid at this place. */
    petals: [string, string];
  }
> = {
  1: {
    metal: "#ffd97e",
    chip: "244 196 48",
    label: "1st",
    epithet: "Champion",
    avatar: 72,
    avatarNarrow: 52,
    riser: "sm:min-h-12 md:min-h-14",
    wash: "bg-sun/[0.08]",
    motes: 7,
    glints: 3,
    beamA: 0.18,
    petals: ["#ffd97e", "#e4674f"],
  },
  2: {
    metal: "#cac6bd",
    chip: "202 198 189",
    label: "2nd",
    epithet: "Runner-up",
    avatar: 56,
    avatarNarrow: 42,
    riser: "sm:min-h-9",
    wash: "bg-white/[0.03]",
    motes: 3,
    glints: 1,
    beamA: 0.11,
    petals: ["#e8e4da", "#9fb4cf"],
  },
  3: {
    metal: "#c98a5e",
    chip: "201 138 94",
    label: "3rd",
    epithet: "Third place",
    avatar: 56,
    avatarNarrow: 42,
    riser: "sm:min-h-7",
    wash: "bg-white/[0.02]",
    motes: 2,
    glints: 1,
    beamA: 0.1,
    petals: ["#e0a06a", "#b8653e"],
  },
};

/** The metal's rgb triple (for --rim-rgb / --mote-rgb / --beam-rgb). */
function metalRgb(rank: 1 | 2 | 3): string {
  return MEDALS[rank].chip;
}

// DOM order is [2nd, 1st, 3rd] so the champion sits center on the dais at
// every width — the phone keeps the same silhouette instead of restacking.
const PLACES: { rank: 1 | 2 | 3 }[] = [{ rank: 2 }, { rank: 1 }, { rank: 3 }];

// One shared narrow-viewport signal (below Tailwind's `sm`), used to hand the
// avatars a smaller pixel size on phones so the three columns never squish.
// Starts false on both server and first client render, so hydration matches;
// the flip to true on a phone happens in the effect, before paint settles.
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return narrow;
}

// Rising metal motes above the champion card: a fixed handful, spread and
// phased inline so no two climb in step.
const MOTES = [
  { mx: "22%", mdelay: "0s", mdur: "5.2s" },
  { mx: "38%", mdelay: "1.8s", mdur: "6.1s" },
  { mx: "50%", mdelay: "0.7s", mdur: "4.8s" },
  { mx: "63%", mdelay: "2.6s", mdur: "5.7s" },
  { mx: "78%", mdelay: "1.2s", mdur: "6.4s" },
  { mx: "30%", mdelay: "3.4s", mdur: "5.5s" },
  { mx: "70%", mdelay: "4.1s", mdur: "5.9s" },
];

// Four-point camera-flash glints near the avatars (see .podium-glint), phased
// far apart so they read as ceremony sparkle rather than confetti.
const GLINTS = [
  { gx: "16%", gy: "24%", gdelay: "0s" },
  { gx: "78%", gy: "36%", gdelay: "2.3s" },
  { gx: "48%", gy: "14%", gdelay: "3.7s" },
];

// The dais-wide petal drift: ten petals loosed across the whole ceremony,
// phased and colored from the three places' bouquet hues. Ten spans total for
// the entire section — well within budget — and the CSS parks them all under
// html[data-anim="off"].
const DRIFT: { px: string; pdelay: string; pdur: string; rgb: string }[] = [
  { px: "6%", pdelay: "0s", pdur: "9.5s", rgb: "255 217 126" },
  { px: "16%", pdelay: "3.2s", pdur: "11s", rgb: "228 103 79" },
  { px: "27%", pdelay: "6.1s", pdur: "10s", rgb: "232 228 218" },
  { px: "38%", pdelay: "1.4s", pdur: "9s", rgb: "255 217 126" },
  { px: "49%", pdelay: "4.8s", pdur: "12s", rgb: "224 160 106" },
  { px: "58%", pdelay: "7.6s", pdur: "9.8s", rgb: "255 217 126" },
  { px: "68%", pdelay: "2.3s", pdur: "10.7s", rgb: "159 180 207" },
  { px: "78%", pdelay: "5.5s", pdur: "9.2s", rgb: "228 103 79" },
  { px: "88%", pdelay: "0.9s", pdur: "11.4s", rgb: "255 217 126" },
  { px: "95%", pdelay: "8.4s", pdur: "10.2s", rgb: "184 101 62" },
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

// The garland strung across the top of the dais: two laurel swags meeting at
// a center rosette, the way a ceremony stage is dressed. Static SVG, tinted
// by the active mode's accent at low opacity so it reads as set dressing.
function GarlandSwag({ tint }: { tint: string }) {
  return (
    <svg
      viewBox="0 0 400 34"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-2 top-0 h-8 w-[calc(100%-1rem)]"
      style={{ opacity: 0.5 }}
    >
      <path d="M2 4 Q100 34 198 6" fill="none" stroke="#5f7a4a" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M202 6 Q300 34 398 4" fill="none" stroke="#5f7a4a" strokeWidth="2.4" strokeLinecap="round" />
      {[
        [30, 13], [62, 20], [96, 25], [130, 25], [164, 18],
        [236, 18], [270, 25], [304, 25], [338, 20], [370, 13],
      ].map(([x, y], i) => (
        <path
          key={i}
          d={`M${x} ${y} c-3.4 -1 -4.4 -3.6 -2.6 -6 2.8 0.6 4 3.2 2.6 6z`}
          fill="#6d8a54"
          transform={i % 2 ? `scale(-1,1) translate(${-2 * x},0)` : undefined}
        />
      ))}
      {[52, 118, 282, 348].map((x, i) => (
        <circle key={`b${i}`} cx={x} cy={i % 2 ? 22 : 17} r="2.6" fill={tint} opacity="0.8" />
      ))}
      <g transform="translate(200 6)">
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <ellipse key={deg} cx="0" cy="-4" rx="2.6" ry="4" fill={tint} transform={`rotate(${deg})`} />
        ))}
        <circle r="2.6" fill="#f4e8c8" />
      </g>
    </svg>
  );
}

// The champion's crown, hovering just over the avatar with the sanctioned
// ambient bob (.podium-crown). One small SVG; decoration only.
function ChampionCrown({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 34 20"
      width={size}
      height={Math.round((size * 20) / 34)}
      aria-hidden="true"
      className="podium-crown pointer-events-none absolute left-1/2 -translate-x-1/2"
      style={{ top: -Math.round((size * 20) / 34) - 2 }}
    >
      <path
        d="M3 16 L1.6 5.5 L9 10.5 L17 2.5 L25 10.5 L32.4 5.5 L31 16 Z"
        fill="#ffd97e"
        stroke="#b8892e"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M3 16 H31 V18.4 H3 Z" fill="#e6bf6a" stroke="#b8892e" strokeWidth="0.9" />
      <circle cx="9" cy="13" r="1.3" fill="#e4674f" />
      <circle cx="17" cy="12.4" r="1.5" fill="#7eb59a" />
      <circle cx="25" cy="13" r="1.3" fill="#9fb4cf" />
    </svg>
  );
}

// The ceremony bouquet: a small bunch of flowers laid at the front of each
// riser, the kind handed out on a track-and-field podium — three stems fanned
// out of a paper wrap, blossoms in the place's petal hues. Decoration only.
function CeremonyBouquet({ petals, size }: { petals: [string, string]; size: number }) {
  const [a, b] = petals;
  const blossoms = [
    { x: 14, y: 11, c: a },
    { x: 24, y: 7, c: b },
    { x: 34, y: 11, c: a },
  ];
  return (
    <svg
      viewBox="0 0 48 34"
      width={size}
      height={Math.round((size * 34) / 48)}
      aria-hidden="true"
      className="pointer-events-none"
    >
      <g stroke="#5f7a4a" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <path d="M24 32 L14 13" />
        <path d="M24 32 L24 9" />
        <path d="M24 32 L34 13" />
      </g>
      <path d="M20 23 q-6 -2 -8 3 q6 2 8 -3z" fill="#6d8a54" />
      <path d="M28 21 q6 -2 8 3 q-6 2 -8 -3z" fill="#6d8a54" />
      {blossoms.map((f, i) => (
        <g key={i}>
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse
              key={deg}
              cx={f.x}
              cy={f.y - 3.2}
              rx="2.4"
              ry="3.4"
              fill={f.c}
              transform={`rotate(${deg} ${f.x} ${f.y})`}
            />
          ))}
          <circle cx={f.x} cy={f.y} r="2.1" fill="#f4e8c8" />
        </g>
      ))}
      <path d="M18.5 24 L29.5 24 L26 33 L22 33 Z" fill="#d9c9a8" stroke="#b9a67f" strokeWidth="0.8" />
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
  const narrow = useNarrow();
  if (rows.length === 0) return null;

  // Mode identity for the header + accents, mirroring ModeBadge's tokens so
  // the dais shares the Nerf/Buff color everywhere else in the app uses. The
  // frame border is set inline because .dgn-slab carries its own brass edge.
  const accent =
    category === "buff"
      ? {
          text: "text-mode-buffGlow",
          rule: "bg-mode-buff/40",
          border: "rgb(var(--accent-buff-rgb) / 0.3)",
          garland: "#8fb8d8",
        }
      : {
          text: "text-mode-nerfGlow",
          rule: "bg-mode-nerf/40",
          border: "rgb(var(--accent-nerf-rgb) / 0.3)",
          garland: "#e08a8a",
        };

  return (
    <section
      aria-label="Podium: top three"
      className="dgn-slab dgn-rivets relative mt-6 overflow-hidden px-3 pb-0 pt-5 sm:px-6"
      style={{ borderColor: accent.border }}
    >
      {/* The gold underglow pool beneath the dais: treasure light rising from
          the vault floor, turned up for the ceremony so the whole dais reads
          lit from below as well as from the beams above. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
        style={{
          background:
            "radial-gradient(58% 95% at 50% 100%, rgb(var(--energy-gold-rgb) / 0.18), transparent 72%)",
        }}
      />
      {/* The garland strung over the whole stage. */}
      <GarlandSwag tint={accent.garland} />
      {/* The dais-wide petal drift: the ceremony's falling flowers. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {DRIFT.map((petal, i) => (
          <span
            key={i}
            className="podium-petal"
            style={
              {
                "--px": petal.px,
                "--pdelay": petal.pdelay,
                "--pdur": petal.pdur,
                "--petal-rgb": petal.rgb,
              } as CSSProperties
            }
          />
        ))}
      </span>

      <div className="relative flex items-center justify-center gap-2 pb-2 pt-2">
        <span className={"h-px w-8 " + accent.rule} aria-hidden="true" />
        <span className={"smallcaps text-[11px] " + accent.text}>Podium</span>
        <span className={"h-px w-8 " + accent.rule} aria-hidden="true" />
      </div>

      <div className="flex flex-row items-end gap-1.5 sm:gap-3">
        {PLACES.map(({ rank }) => {
          const row = rows[rank - 1];
          if (!row) return null;
          const medal = MEDALS[rank];
          const champion = rank === 1;
          const mine = !!isMe && !row.guest && isMe(row.username);
          const avatarSize = narrow ? medal.avatarNarrow : medal.avatar;
          const provisional = isProvisionalRd(row.rd);
          // Display-time defense: bios are censored at write time, but run
          // them through the shared filter again so any pre-existing rows
          // that slipped past still render clean on the podium.
          const bio = row.bio ? censorText(row.bio).trim() : "";

          const card = (
            <div
              className={
                "relative flex flex-col items-center rounded-md rounded-b-none border border-b-0 px-1 pt-3 pb-2 text-center motion-safe:transition sm:px-3 sm:pt-4 sm:pb-3 podium-rim-gold " +
                (mine ? "bg-gold/10 border-gold/40" : medal.wash)
              }
              style={
                {
                  // Every place wears its metal: a 3px cap plus a faint tinted
                  // frame and a masked metal rim (tinted via --rim-rgb), so
                  // 1 / 2 / 3 each read distinct at a glance.
                  borderColor: mine ? undefined : medal.metal + "3d",
                  borderTopColor: medal.metal,
                  borderTopWidth: 3,
                  "--rim-rgb": metalRgb(rank),
                } as CSSProperties
              }
            >
              {/* The ceremony spotlight: every place stands in its own cone of
                  light, tinted to its metal and strongest over the champion. */}
              <span
                aria-hidden="true"
                className="podium-beam"
                style={
                  { "--beam-rgb": metalRgb(rank), "--beam-a": medal.beamA } as CSSProperties
                }
              />
              {/* Rising metal motes over every place — a full handful of gold
                  for the champion, a quieter few in silver and bronze — and
                  camera-flash glints for all three, most over the champion. */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                {MOTES.slice(0, medal.motes).map((m, i) => (
                  <span
                    key={i}
                    className="podium-mote"
                    style={
                      {
                        "--mx": m.mx,
                        "--mdelay": m.mdelay,
                        "--mdur": m.mdur,
                        "--mote-rgb": metalRgb(rank),
                      } as CSSProperties
                    }
                  />
                ))}
                {GLINTS.slice(0, medal.glints).map((g, i) => (
                  <span
                    key={`g${i}`}
                    className="podium-glint"
                    style={
                      { "--gx": g.gx, "--gy": g.gy, "--gdelay": g.gdelay } as CSSProperties
                    }
                  />
                ))}
              </span>
              <span
                className="rune-badge"
                style={{ "--badge-rgb": medal.chip } as CSSProperties}
              >
                {medal.label}
              </span>
              {/* Each step's own word, in its metal: unique recognition per
                  placement, like the announcer's call at a medal ceremony. */}
              <span
                className="smallcaps mb-2 mt-1 text-[10px] tracking-widest"
                style={{ color: medal.metal }}
              >
                {medal.epithet}
              </span>
              <div className="relative">
                {/* The champion's crown hovers over the avatar; the laurel arc
                    behind it is radiant for the champion, a static metal tint
                    for second and third. */}
                {champion && <ChampionCrown size={narrow ? 26 : 34} />}
                <WreathArc
                  color={medal.metal}
                  size={avatarSize + 26}
                  opacity={champion ? 0.45 : 0.22}
                />
                <span className="relative inline-block">
                  <PlayerAvatar
                    name={row.username}
                    avatar={row.avatar}
                    flair={row.flair}
                    size={avatarSize}
                  />
                </span>
                <span className="absolute -right-1 -top-1">
                  <LaurelBadge rank={rank} size={rank === 1 ? 20 : 16} />
                </span>
              </div>
              <span
                className={
                  // Wraps rather than truncates, and breaks inside a long
                  // handle if it has to: the whole point of a podium is
                  // knowing WHO is on it. Two tighter lines fit comfortably.
                  "mt-2 line-clamp-2 max-w-full break-words text-center text-[12px] " +
                  "font-medium leading-tight tracking-tight sm:text-base sm:tracking-normal " +
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
              {/* Provisional ratings render dimmed with the site-wide "?"
                  marker and a hover explanation, matching the table below, so
                  a two-game 2894 reads as "still settling", not a glitch. */}
              <span
                className={
                  "mt-1.5 font-mono text-base tabular-nums sm:text-lg " +
                  (provisional
                    ? "text-parchment-400"
                    : champion
                      ? "text-sun"
                      : "text-parchment-50")
                }
                title={
                  provisional
                    ? `Provisional: rating deviation above ${PROVISIONAL_RD}`
                    : undefined
                }
              >
                {Math.round(row.rating)}
                {provisional && <span>?</span>}
              </span>
              <span className="smallcaps whitespace-nowrap text-[11px] text-parchment-400">
                {row.games} {row.games === 1 ? "game" : "games"}
              </span>
              {/* The ceremony bouquets on the front edge of the riser — the
                  champion's place is laid with a pair. */}
              <span aria-hidden="true" className="relative z-[1] -mb-3 mt-1.5 flex items-end gap-1">
                <CeremonyBouquet petals={medal.petals} size={narrow ? 30 : 40} />
                {champion && !narrow && (
                  <CeremonyBouquet petals={[medal.petals[1], medal.petals[0]]} size={32} />
                )}
              </span>
              {/* The dais riser: a carved stone block carrying the player's
                  bio. Bios only fit from `sm` up, so the riser renders only
                  when there is a bio to show and only at those widths —
                  otherwise it would just be an empty grey slab. */}
              {bio ? (
                <span
                  className={
                    "mt-3 hidden w-full items-start justify-center rounded-t-sm border-x border-t border-white/5 bg-gradient-to-b from-white/[0.04] via-white/[0.015] to-black/25 px-2 py-1.5 sm:flex " +
                    medal.riser
                  }
                  style={{
                    boxShadow: "inset 0 1px 0 " + medal.metal + "1f, inset 0 -10px 16px -12px rgba(0,0,0,0.6)",
                  }}
                >
                  <span className="max-w-full text-[12px] leading-snug text-parchment-400 line-clamp-3">
                    {bio}
                  </span>
                </span>
              ) : null}
            </div>
          );

          // Same three-across order at every width; the champion holds center.
          const wrapClass = "min-w-0 flex-1";

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
