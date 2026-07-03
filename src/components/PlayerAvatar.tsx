"use client";

import { Piece } from "./Pieces";
import { AVATARS, avatarIdFor } from "@/lib/avatars";

// A player's profile picture: preset piece-on-plate, deterministic default
// when the account never picked one (or for anonymous players).
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
