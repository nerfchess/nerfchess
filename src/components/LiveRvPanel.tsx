"use client";

// Live RV: the compact "what is happening right now" panel for the mobile
// home stack. Sits directly under the hero board, stays low, and shows the
// top live games from the shared lobby snapshot with a strong LIVE marker.
// Styled as a cosmic dungeon panel (plate + energy edge); rows link straight
// into spectating. Empty and loading states stay compact so the Open Lobby
// panel below never gets pushed down.

import Link from "next/link";
import { useLobbySnapshot } from "@/lib/lobbyClient";
import { ModeBadge } from "@/components/ModeBadge";

export function LiveRvPanel({ className = "" }: { className?: string }) {
  const lobby = useLobbySnapshot(10000);
  const games = lobby ? lobby.games.slice(0, 3) : null;

  return (
    <section className={"plate energy-edge p-3 " + className} aria-label="Live games">
      <div className="flex items-center justify-between gap-2">
        <span className="rune-badge" style={{ ["--badge-rgb" as string]: "224 82 82" }}>
          <span aria-hidden className="dot-live h-1.5 w-1.5 shrink-0 bg-current" />
          Live
        </span>
        <Link
          href="/tv"
          className="text-[12px] text-parchment-400 no-underline transition-colors hover:text-gold-leaf"
        >
          Watch TV &rarr;
        </Link>
      </div>
      {games === null ? (
        <div className="mt-2 space-y-1.5" aria-hidden>
          <div className="skeleton h-8 w-full" />
          <div className="skeleton h-8 w-full" />
        </div>
      ) : games.length === 0 ? (
        <p className="mt-2 text-[13px] text-parchment-400">
          No games running right now. Start one below.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-white/5">
          {games.map((g) => (
            <li key={g.id}>
              <Link
                href={`/game/${g.id}`}
                className="flex min-h-[40px] items-center justify-between gap-2 py-1.5 no-underline transition-colors hover:bg-white/5"
              >
                <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-parchment-100">
                  <span className="truncate">{g.players.w.name}</span>
                  <span className="shrink-0 text-parchment-500">vs</span>
                  <span className="truncate">{g.players.b.name}</span>
                  <ModeBadge mode={g.mode} compact />
                </span>
                <span className="flex shrink-0 items-center gap-2 text-[12px] text-parchment-400">
                  <span className="font-mono tabular-nums">
                    {Math.round(g.timeSec / 60)}+{g.incrementSec}
                  </span>
                  {g.watchers > 0 && <span title="Spectators">{g.watchers} watching</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
