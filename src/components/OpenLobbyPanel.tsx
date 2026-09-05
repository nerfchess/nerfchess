"use client";

// Open Lobby: the mobile home stack's way in, kept directly under Live RV.
// The primary Open Lobby button leads; beneath it, open seeks and challenges
// from the shared lobby snapshot show who is waiting right now (host, mode,
// time control, rated flag), each row deep-linking into the lobby to answer.
// Empty state keeps the next actions obvious instead of going quiet.

import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";
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
    <section className={"plate p-3 " + className} aria-label="Open lobby">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-[13px] font-bold text-parchment-50">Open lobby</span>
        {online !== null && (
          <span className="text-[12px] text-parchment-400">
            <span className="font-display font-bold tabular-nums text-parchment-100">{online}</span>{" "}
            online
          </span>
        )}
      </div>
      <LinkButton tone="primary" size="lg" block href="/lobby" className="mt-2.5">
        Enter the lobby
      </LinkButton>
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
                  <span className="font-display text-[12px] font-semibold text-gold-leaf">Join</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2">
        <LinkButton tone="default" size="sm" block href="/lobby?tab=friends">
          Play a friend
        </LinkButton>
        <LinkButton tone="default" size="sm" block href="/play">
          Play a bot
        </LinkButton>
      </div>
    </section>
  );
}
