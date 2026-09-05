"use client";

// The info column beside the rating chart, Lichess's: member since, presence,
// time spent playing, and the plain counts. Lines, not tiles.

import type { PlayerStats } from "@/lib/playerStats";
import { relativeTime } from "@/components/profile/relativeTime";

function formatPlayTime(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "less than a minute";
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days} ${days === 1 ? "day" : "days"}, ${hours} ${hours === 1 ? "hour" : "hours"}`;
  if (hours > 0) return `${hours} ${hours === 1 ? "hour" : "hours"}, ${mins} min`;
  return `${mins} min`;
}

export function ProfileInfoBox({
  createdAt,
  lastSeenAt,
  online,
  showPresence,
  stats,
  friendCount,
  role,
}: {
  createdAt: number;
  lastSeenAt: number | null;
  online: boolean;
  showPresence: boolean;
  stats: PlayerStats | null;
  friendCount: number;
  role: "user" | "mod" | "admin";
}) {
  const since = new Date(createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="space-y-2.5 text-[13px] leading-snug text-parchment-200">
      {role !== "user" && (
        <p className="text-brag">{role === "admin" ? "Administrator" : "Moderator"}</p>
      )}
      <p>Member since {since}</p>
      {showPresence && (
        <p>
          {online ? (
            "Active right now"
          ) : lastSeenAt ? (
            <>Last seen {relativeTime(lastSeenAt)}</>
          ) : (
            "Last seen a while ago"
          )}
        </p>
      )}
      {stats && stats.timePlayedMs > 0 && <p>Time spent playing: {formatPlayTime(stats.timePlayedMs)}</p>}
      {stats && stats.avgOpponentRating != null && (
        <p>Average opponent: {Math.round(stats.avgOpponentRating)}</p>
      )}
      <p>
        {friendCount.toLocaleString()} {friendCount === 1 ? "friend" : "friends"}
      </p>
    </div>
  );
}
