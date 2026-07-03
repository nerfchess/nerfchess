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
  return (
    <div
      className={"grid shrink-0 place-items-center overflow-hidden rounded-md border border-white/20 " + className}
      style={{ width: size, height: size, background: spec.bg }}
      aria-hidden="true"
    >
      <div style={{ width: "80%", height: "80%" }}>
        <Piece type={spec.piece} color={spec.pieceColor} size="100%" />
      </div>
    </div>
  );
}
