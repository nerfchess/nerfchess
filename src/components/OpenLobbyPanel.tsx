"use client";

// Open Lobby: the mobile home stack's way in, kept directly under Live RV.
// The primary Open Lobby slab leads; beneath it, open seeks and challenges
// from the shared lobby snapshot show who is waiting right now (host, mode,
// time control, rated flag), each row deep-linking into the lobby to answer.
// Empty state keeps the next actions obvious instead of going quiet.

import Link from "next/link";
import { useLobbySnapshot } from "@/lib/lobbyClient";
import { ModeBadge } from "@/components/ModeBadge";

type OpenRow = {
  key: string;
  name: string;
  rating: number | null;
  mode?: "nerf" | "buff";
  timeSec: number;
  incrementSec: number;
  rated: boolean;
};

export function OpenLobbyPanel({ className = "" }: { className?: string }) {
  const lobby = useLobbySnapshot(10000);
  const rows: OpenRow[] | null = lobby
    ? [
        ...(lobby.seeks ?? []).map((s) => ({
          key: `seek:${s.pool}:${s.name}:${s.at}`,
          name: s.name,
          rating: s.rating,
          mode: s.mode,
          timeSec: s.timeSec,
          incrementSec: s.incrementSec,
          rated: true,
        })),
        ...(lobby.challenges ?? []).map((c) => ({
          key: `chal:${c.id}`,
          name: c.host.name,
          rating: c.host.rating,
          mode: c.mode,
          timeSec: c.timeSec,
          incrementSec: c.incrementSec,
          rated: !!c.rated,
        })),
      ].slice(0, 4)
    : null;
  const online = lobby ? lobby.players.length + lobby.anonymous : null;

  return (
    <section className={"plate energy-edge p-3 " + className} aria-label="Open lobby">
      <div className="flex items-center justify-between gap-2">
        <span className="rune-badge" style={{ ["--badge-rgb" as string]: "244 196 48" }}>
          Open lobby
        </span>
        {online !== null && (
          <span className="text-[12px] text-parchment-400">
            <span className="font-display font-bold tabular-nums text-parchment-100">{online}</span>{" "}
            online
          </span>
        )}
      </div>
      <Link
        href="/lobby"
        className="btn-leaf btn-cta press mt-2.5 flex w-full items-center justify-center gap-2.5 px-5 py-4 font-display text-2xl font-bold no-underline"
      >
        Enter the lobby
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      </Link>
      {rows === null ? (
        <div className="mt-2 space-y-1.5" aria-hidden>
          <div className="skeleton h-8 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-vault !py-3">
          <p className="text-[13px] leading-snug">
            No open tables right now. Enter the lobby to queue, or play a bot.
          </p>
        </div>
      ) : (
        <ul className="mt-2 divide-y divide-white/5">
          {rows.map((r) => (
            <li key={r.key}>
              <Link
                href="/lobby"
                className="flex min-h-[40px] items-center justify-between gap-2 py-1.5 no-underline transition-colors hover:bg-white/5"
              >
                <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-parchment-100">
                  <span className="truncate">{r.name}</span>
                  {r.rating != null && (
                    <span className="shrink-0 font-mono text-[12px] tabular-nums text-parchment-400">
                      {Math.round(r.rating)}
                    </span>
                  )}
                  <ModeBadge mode={r.mode} compact />
                </span>
                <span className="flex shrink-0 items-center gap-2 text-[12px] text-parchment-400">
                  <span className="font-mono tabular-nums">
                    {Math.round(r.timeSec / 60)}+{r.incrementSec}
                  </span>
                  <span>{r.rated ? "Rated" : "Casual"}</span>
                  <span className="font-display text-[12px] font-semibold text-gold-leaf">Join &rarr;</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Link
          href="/lobby?tab=friends"
          className="btn-ghost press flex items-center justify-center px-3 py-2 font-display text-[13px] font-medium no-underline"
        >
          Play a friend
        </Link>
        <Link
          href="/play"
          className="btn-ghost press flex items-center justify-center px-3 py-2 font-display text-[13px] font-medium no-underline"
        >
          Play a bot
        </Link>
      </div>
    </section>
  );
}
