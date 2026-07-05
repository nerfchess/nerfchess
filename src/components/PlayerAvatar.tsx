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
  return (
    <div
      className={"relative grid shrink-0 place-items-center overflow-hidden rounded-md border border-white/20 " + className}
      style={{ width: size, height: size, background: spec.bg }}
      aria-hidden="true"
    >
      <div style={{ width: "80%", height: "80%" }}>
        <Piece type={spec.piece} color={spec.pieceColor} size="100%" />
      </div>
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
      {spec.flower && (
        // House players carry a small flower, kept as muted as the star above
        // (cream petals, low opacity) so it reads as a quiet mark, not a badge.
        <svg
          viewBox="0 0 24 24"
          style={{
            position: "absolute",
            bottom: Math.max(1, Math.round(size * 0.05)),
            left: Math.max(1, Math.round(size * 0.05)),
            width: starSize,
            height: starSize,
            opacity: 0.4,
          }}
          fill="#f3e9c8"
        >
          <circle cx="12" cy="6" r="3.1" />
          <circle cx="17.2" cy="9.8" r="3.1" />
          <circle cx="15.2" cy="15.8" r="3.1" />
          <circle cx="8.8" cy="15.8" r="3.1" />
          <circle cx="6.8" cy="9.8" r="3.1" />
          <circle cx="12" cy="11.4" r="2.4" fill="#caa94a" />
        </svg>
      )}
    </div>
  );
}
