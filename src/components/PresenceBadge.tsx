import type { DraftMode } from "@/engine/buff";
import type { PresenceState } from "@/lib/presence";

// Relative "last seen" copy, self-contained so the badge can render anywhere.
function lastSeen(at: number): string {
  const s = Math.max(1, Math.floor((Date.now() - at) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export interface PresenceBadgeProps {
  state: PresenceState;
  /** The game's mode when in-game, so the dot reads Nerf coral or Buff blue. */
  mode?: DraftMode | null;
  /** For the offline label ("Last seen <relative>"); null/absent shows "Offline". */
  lastSeenAt?: number | null;
  className?: string;
}

// Presence chip: a status dot plus an ALWAYS-present text label (never
// color-only, per the accessibility rules). In-game dots take the mode color;
// searching pulses gold (static under reduced motion); online is verdigris;
// offline is a quiet gray with the last-seen time when known.
export function PresenceBadge({ state, mode, lastSeenAt, className }: PresenceBadgeProps) {
  let dotClass = "bg-parchment-400";
  let pulse = false;
  let label: string;

  switch (state) {
    case "in-game":
      dotClass =
        mode === "nerf" ? "bg-mode-nerfGlow" : mode === "buff" ? "bg-mode-buffGlow" : "bg-parchment-200";
      label = "Playing right now";
      break;
    case "searching":
      dotClass = "bg-gold-leaf";
      pulse = true;
      label = "Looking for a game";
      break;
    case "online":
      dotClass = "bg-verdigris-glow";
      label = "Online";
      break;
    default:
      dotClass = "bg-parchment-500";
      label = lastSeenAt ? `Last seen ${lastSeen(lastSeenAt)}` : "Offline";
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-parchment-300 ${className ?? ""}`}>
      <span
        aria-hidden
        className={`h-2 w-2 shrink-0 rounded-full ${dotClass}${
          pulse ? " animate-pulse motion-reduce:animate-none" : ""
        }`}
      />
      {/* Sentence-case 12px label: the smallcaps micro-label pattern is
          retired sitewide (12px caption floor). */}
      <span className="text-[12px]">{label}</span>
    </span>
  );
}
