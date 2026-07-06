import type { CSSProperties } from "react";
import { parseClubIcon } from "@/lib/clubIcons";

// The club's identity tile: its curated emoji on an accent-tinted plate, or a
// warm monogram of the club name when no icon has been chosen yet. Used on
// the clubs directory, the club page header, and anywhere a club is listed.

export function ClubIcon({
  icon,
  name,
  size = 44,
  className = "",
}: {
  icon?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const parsed = parseClubIcon(icon);
  const style: CSSProperties = parsed
    ? {
        width: size,
        height: size,
        fontSize: Math.round(size * 0.52),
        background: `${parsed.color.hex}24`,
        borderColor: `${parsed.color.hex}59`,
      }
    : { width: size, height: size, fontSize: Math.round(size * 0.44) };
  return (
    <span
      aria-hidden
      className={`grid shrink-0 select-none place-items-center rounded-[10px] border leading-none ${
        parsed ? "" : "border-white/10 bg-ink-900/60 font-display text-parchment-200"
      } ${className}`}
      style={style}
    >
      {parsed ? parsed.emoji : name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
