import type { CSSProperties, ReactNode } from "react";
import {
  Anchor, Bird, Castle, Cat, Crown, Dice5, Dog, Fish, Flame, Gem, Ghost,
  Moon, Mountain, Rabbit, Rocket, Shield, Skull, Star, Sun, Swords, Trees,
  Trophy, Turtle, Zap, type LucideIcon,
} from "lucide-react";
import { isUploadedClubIcon, parseClubIcon } from "@/lib/clubIcons";

// The club's identity tile: its curated lucide icon on an accent-tinted
// plate, or a warm monogram of the club name when no icon has been chosen
// yet (including any legacy emoji value, which no longer parses). Used on
// the clubs directory, the club page header, and anywhere a club is listed.

const ICON_COMPONENTS: Record<string, LucideIcon> = {
  Swords, Crown, Castle, Shield, Rocket, Flame,
  Anchor, Star, Zap, Trophy, Gem, Skull,
  Cat, Dog, Bird, Fish, Rabbit, Turtle,
  Ghost, Sun, Moon, Mountain, Trees, Dice5,
};

/** Render a curated club icon glyph by name (for the picker grid and any
 *  other place that shows the catalog outside the tinted tile). Returns null
 *  for names outside the curated set. */
export function renderClubIconGlyph(name: string, size = 18): ReactNode {
  const Icon = ICON_COMPONENTS[name];
  return Icon ? <Icon size={size} aria-hidden /> : null;
}

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
  // A custom uploaded icon (data-URL image) renders as a plain square <img>.
  if (isUploadedClubIcon(icon)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon}
        alt=""
        aria-hidden
        className={`shrink-0 select-none border border-[color:var(--edge)] object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  const parsed = parseClubIcon(icon);
  const Icon = parsed ? ICON_COMPONENTS[parsed.name] : undefined;
  const style: CSSProperties = parsed
    ? {
        width: size,
        height: size,
        color: parsed.color.hex,
        background: `${parsed.color.hex}24`,
        borderColor: `${parsed.color.hex}59`,
      }
    : { width: size, height: size, fontSize: Math.round(size * 0.44) };
  return (
    <span
      aria-hidden
      className={`grid shrink-0 select-none place-items-center border leading-none ${
        Icon ? "" : "border-[color:var(--edge)] bg-[color:var(--bg-base)] font-display text-parchment-200"
      } ${className}`}
      style={style}
    >
      {Icon ? (
        <Icon size={Math.round(size * 0.5)} />
      ) : (
        name.trim().charAt(0).toUpperCase() || "?"
      )}
    </span>
  );
}
