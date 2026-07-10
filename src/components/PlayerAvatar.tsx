"use client";

import { Piece } from "./Pieces";
import { AVATARS, avatarIdFor, isCustomAvatar } from "@/lib/avatars";
import { isFlairEmoji } from "@/lib/flair";

// A player's profile picture: an uploaded image (stored as a small data URL),
// a preset piece-on-plate, or a deterministic default when the account never
// picked one (and for anonymous players).
//
// An optional emoji flair (Lichess-style) can ride along as a small badge in
// the bottom-right corner, so a player's flair shows anywhere an avatar does
// (leaderboard, lobby, at the board). Only allowlisted emoji render; anything
// else is ignored, so an invalid or retired flair simply shows no badge.
export function PlayerAvatar({
  name,
  avatar,
  flair,
  size = 32,
  className = "",
}: {
  name: string;
  avatar?: string | null;
  flair?: string | null;
  size?: number;
  className?: string;
}) {
  const core = isCustomAvatar(avatar) ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatar}
      alt=""
      className={"shrink-0 overflow-hidden rounded-md border border-white/20 object-cover " + className}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  ) : (
    <PresetAvatar name={name} avatar={avatar} size={size} className={className} />
  );

  if (!isFlairEmoji(flair)) return core;

  // Badge sits over the avatar's bottom-right corner (like Lichess's flair),
  // on a dark ring so the emoji reads on any avatar background.
  const badge = Math.max(13, Math.round(size * 0.46));
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      {core}
      <span
        aria-hidden="true"
        className="absolute grid place-items-center rounded-full bg-ink-900/90 leading-none ring-1 ring-white/15"
        style={{
          width: badge,
          height: badge,
          right: -Math.round(badge * 0.18),
          bottom: -Math.round(badge * 0.18),
          fontSize: Math.round(badge * 0.72),
        }}
      >
        {flair}
      </span>
    </span>
  );
}

// House-player accounts hold "_flower" avatar preset ids (see lib/avatars.ts).
// The flower renders as a very small bloom in the TOP-RIGHT corner of every
// house avatar, so a bot is identifiable at a glance anywhere an avatar shows.
// Owner feedback: the old bloom (bright pink petals, gold heart, 0.85 opacity)
// was a loud emblem that screamed "bot"; it now draws small, ghosted, and in a
// single muted tone — like the legacy star mark — so it reads as quiet plate
// decoration while staying learnable. Human presets never resolve to a
// flowered id, so no human gets one.
function PresetAvatar({
  name,
  avatar,
  size,
  className,
}: {
  name: string;
  avatar?: string | null;
  size: number;
  className: string;
}) {
  const spec = AVATARS[avatarIdFor(name, avatar)];
  const starSize = Math.max(5, Math.round(size * 0.2));
  const flowerSize = Math.max(5, Math.round(size * 0.16));
  return (
    <div
      className={"relative grid shrink-0 place-items-center overflow-hidden rounded-md border border-white/20 " + className}
      style={{ width: size, height: size, background: spec.bg }}
      aria-hidden="true"
    >
      <div style={{ width: "80%", height: "80%" }}>
        <Piece type={spec.piece} color={spec.pieceColor} size="100%" />
      </div>
      {spec.flower && (
        <svg
          viewBox="0 0 24 24"
          style={{
            position: "absolute",
            top: Math.max(1, Math.round(size * 0.05)),
            right: Math.max(1, Math.round(size * 0.05)),
            width: flowerSize,
            height: flowerSize,
            opacity: 0.35,
          }}
        >
          {/* Five ghosted petals in the star mark's parchment tone: one muted
              color, no strokes, no golden heart — quiet plate decoration. */}
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse
              key={a}
              cx="12"
              cy="6.8"
              rx="2.8"
              ry="4.4"
              fill="#f3e9c8"
              transform={`rotate(${a} 12 12)`}
            />
          ))}
          <circle cx="12" cy="12" r="2.4" fill="#f3e9c8" />
        </svg>
      )}
      {spec.star && (
        <svg
          viewBox="0 0 24 24"
          style={{
            position: "absolute",
            top: Math.max(1, Math.round(size * 0.05)),
            right: Math.max(1, Math.round(size * 0.05)),
            width: starSize,
            height: starSize,
            opacity: 0.38,
          }}
          fill="#f3e9c8"
        >
          <path d="M12 2l2.6 6.9 7.4.4-5.8 4.7 1.9 7.2L12 17.1 5.9 21.2l1.9-7.2L2 9.3l7.4-.4z" />
        </svg>
      )}
    </div>
  );
}
