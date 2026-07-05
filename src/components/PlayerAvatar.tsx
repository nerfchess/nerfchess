"use client";

import { Piece } from "./Pieces";
import { AVATARS, avatarIdFor, isCustomAvatar } from "@/lib/avatars";

// A player's profile picture: an uploaded image (stored as a small data URL),
// a preset piece-on-plate, or a deterministic default when the account never
// picked one (and for anonymous players).
export function PlayerAvatar({
  name,
  avatar,
  size = 32,
  className = "",
}: {
  name: string;
  avatar?: string | null;
  size?: number;
  className?: string;
}) {
  if (isCustomAvatar(avatar)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatar}
        alt=""
        className={"shrink-0 overflow-hidden rounded-md border border-white/20 object-cover " + className}
        style={{ width: size, height: size }}
        aria-hidden="true"
      />
    );
  }
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
        <span
          style={{
            position: "absolute",
            bottom: Math.max(0, Math.round(size * 0.02)),
            left: Math.max(1, Math.round(size * 0.05)),
            fontSize: Math.max(7, Math.round(size * 0.28)),
            lineHeight: 1,
            opacity: 0.85,
          }}
        >
          {"\u{1F33C}"}
        </span>
      )}
    </div>
  );
}
