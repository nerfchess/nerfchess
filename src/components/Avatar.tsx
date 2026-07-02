"use client";

import { avatarById, avatarForName } from "@/lib/profile";

// Player avatar: a chosen preset picture, or a deterministic one derived from
// the name when the player never picked (bots, seeded ladder names). Falls
// back to an initial letter when there is no name at all.
export function Avatar({
  avatarId,
  name,
  size = 32,
  className = "",
}: {
  avatarId?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  const spec = avatarById(avatarId) ?? (name ? avatarForName(name) : null);

  if (spec) {
    return (
      <span
        aria-hidden
        className={"grid shrink-0 place-items-center rounded-full border " + className}
        style={{
          width: size,
          height: size,
          color: spec.fg,
          background: spec.bg,
          borderColor: spec.border,
          fontSize: Math.round(size * 0.62),
          lineHeight: 1,
        }}
      >
        {spec.glyph}
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={
        "grid shrink-0 place-items-center rounded-full border border-gold/60 bg-gold/20 font-display font-semibold text-gold-leaf " +
        className
      }
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
    >
      <svg
        width={Math.round(size * 0.5)}
        height={Math.round(size * 0.5)}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </span>
  );
}
