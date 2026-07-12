"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Eye, Radio } from "lucide-react";
import { Board } from "@/components/Board";
import { ModeBadge } from "@/components/ModeBadge";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { SiteHeader } from "@/components/SiteHeader";
import { arenaSocketUrl, isArenaGameId } from "@/lib/arenaLobby";
import { replayUci } from "@/lib/gameReview";
import { useLobbySnapshot } from "@/lib/lobbyClient";
import { MPLobbyGame, MPPlayers, MPSession } from "@/lib/multiplayer";
import type { DraftMode } from "@/engine/buff";
import type { Color } from "@/engine/types";

// Lichess-TV-style watch page: the top live game streams full-size, with the
// other running games listed alongside. Picking a game pins it; otherwise the
// page follows whatever the lobby ranks first. With nothing live it replays
// the most recently finished game. `?mode=nerf|buff` (the nav's Nerf TV and
// Buff TV entries) narrows everything shown to that pool's games.

type RecentGame = {
  id: string;
  white_name: string;
  black_name: string;
  white_rating_before: number | null;
  black_rating_before: number | null;
  moves: string;
  white_avatar: string | null;
  black_avatar: string | null;
};

function clockLabel(timeSec: number, incrementSec: number): string {
  if (timeSec <= 0) return "No clock";
  if (timeSec < 60) return `${timeSec}s+${incrementSec}`;
  return `${Math.round(timeSec / 60)}+${incrementSec}`;
}

// useSearchParams needs a Suspense boundary during prerender, so the page is
// a thin wrapper around the real component.
export default function TvPage() {
  return (
    <Suspense fallback={null}>
      <TvView />
    </Suspense>
  );
}

function TvView() {
  const searchParams = useSearchParams();
  const rawMode = searchParams.get("mode");
  const modeFilter: DraftMode | null =
    rawMode === "nerf" || rawMode === "buff" ? rawMode : null;

  const lobby = useLobbySnapshot(5000);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [moves, setMoves] = useState<string[]>([]);
  const [players, setPlayers] = useState<MPPlayers | null>(null);
  const [over, setOver] = useState(false);
  const [recent, setRecent] = useState<RecentGame | null>(null);

  // Switching channels (All / Nerf / Buff) drops everything shown so nothing
  // from the other pool lingers on screen.
  useEffect(() => {
    setPinnedId(null);
    setStreamId(null);
    setMoves([]);
    setPlayers(null);
    setOver(false);
    setRecent(null);
  }, [modeFilter]);

  const liveGames = useMemo(() => {
    const games = lobby?.games ?? [];
    return modeFilter ? games.filter((g) => g.mode === modeFilter) : games;
  }, [lobby, modeFilter]);
  const pinnedStillLive = pinnedId != null && liveGames.some((g) => g.id === pinnedId);
  const targetId = pinnedStillLive ? pinnedId : liveGames[0]?.id ?? null;

  // With nothing live, pull the latest finished game (of this channel's mode,
  // if one is set) once for a replay.
  useEffect(() => {
    if (!lobby || liveGames.length > 0 || recent) return;
    let cancelled = false;
    fetch(`/api/games/recent${modeFilter ? `?mode=${modeFilter}` : ""}`)
      .then((res) => (res.ok ? (res.json() as Promise<{ game: RecentGame | null }>) : null))
      .then((data) => {
        if (!cancelled && data?.game) setRecent(data.game);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lobby, liveGames.length, recent, modeFilter]);

  // Keep a just-finished game on screen until the lobby offers a replacement.
  useEffect(() => {
    if (targetId) setStreamId(targetId);
    else if (over || !streamId) setStreamId(targetId);
  }, [targetId, over, streamId]);

  useEffect(() => {
    if (!streamId) return;
    let cancelled = false;
    const session = new MPSession();
    session.persistFriendSession = false;
    // Arena-hosted (OCI bot-vs-bot) games stream from the arena's own socket
    // (Tier 3). The lobby snapshot that produced streamId keeps the arena id
    // cache warm, so this check is synchronous.
    if (isArenaGameId(streamId) && arenaSocketUrl()) session.serverUrl = arenaSocketUrl();
    const off = session.on((e) => {
      if (cancelled) return;
      if (e.type === "watch-start") {
        setMoves(e.setup.moves);
        setPlayers(e.setup.players);
        setOver(!!e.setup.result);
      } else if (e.type === "move") {
        setMoves((m) => (e.move.ply === m.length + 1 ? [...m, e.move.u] : m));
      } else if (e.type === "end") {
        setOver(true);
      }
    });
    session.watch(streamId).catch(() => {
      if (!cancelled) {
        setPlayers(null);
        setStreamId(null);
      }
    });
    return () => {
      cancelled = true;
      off();
      session.destroy();
    };
  }, [streamId]);

  const live = !!streamId && !!players;
  const recentPlayers = useMemo<MPPlayers | null>(() => {
    if (!recent) return null;
    return {
      w: {
        name: recent.white_name,
        rating: recent.white_rating_before ? Math.round(recent.white_rating_before) : null,
        avatar: recent.white_avatar,
      },
      b: {
        name: recent.black_name,
        rating: recent.black_rating_before ? Math.round(recent.black_rating_before) : null,
        avatar: recent.black_avatar,
      },
    };
  }, [recent]);

  const shownMoves = useMemo(
    () => (live ? moves : recent?.moves ? recent.moves.split(" ").filter(Boolean) : []),
    [live, moves, recent],
  );
  const { board, history } = useMemo(() => replayUci(shownMoves), [shownMoves]);
  const lastMove = history[history.length - 1] ?? null;

  const shownId = live ? streamId : recent?.id ?? null;
  const shownPlayers = live ? players : recentPlayers;
  const shownLobbyGame = liveGames.find((g) => g.id === shownId);

  const title = modeFilter === "nerf" ? "Nerf TV" : modeFilter === "buff" ? "Buff TV" : "Nerf Chess TV";
  const titleColor =
    modeFilter === "nerf"
      ? "text-mode-nerfGlow"
      : modeFilter === "buff"
        ? "text-mode-buffGlow"
        : "text-oxblood-glow";
  const channels: { href: string; label: string; active: boolean; className: string }[] = [
    { href: "/tv", label: "All", active: modeFilter === null, className: "text-parchment-100" },
    { href: "/tv?mode=nerf", label: "Nerf", active: modeFilter === "nerf", className: "text-mode-nerfGlow" },
    { href: "/tv?mode=buff", label: "Buff", active: modeFilter === "buff", className: "text-mode-buffGlow" },
  ];

  const seat = (color: Color) => {
    if (!shownPlayers) return null;
    const p = shownPlayers[color];
    return (
      <Link
        href={`/u/${encodeURIComponent(p.name)}`}
        className="group flex min-h-[44px] min-w-0 items-center gap-2 py-1.5"
        title={`View ${p.name}'s profile`}
      >
        <PlayerAvatar name={p.name} avatar={p.avatar} size={26} />
        <span className="truncate font-display text-parchment-100 transition-colors group-hover:text-gold-leaf">
          {p.name}
          {p.rating != null && <span className="text-parchment-400"> ({p.rating})</span>}
        </span>
      </Link>
    );
  };

  return (
    <main className="min-h-screen">
      <SiteHeader active="/tv" />
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="mx-auto w-full max-w-[640px]">
            <div className="flex items-center justify-between">
              {seat("b")}
              <span className="flex items-center gap-1.5 smallcaps text-[10px] text-parchment-300">
                <span
                  className={
                    "h-2 w-2 rounded-full " +
                    (live && !over ? "bg-oxblood-glow animate-flicker" : "bg-parchment-400")
                  }
                />
                {live ? (over ? "Just finished" : "Live") : recent ? "Latest game" : title}
                <ModeBadge mode={shownLobbyGame?.mode} compact />
                {shownLobbyGame && shownLobbyGame.watchers > 0 && (
                  <span className="flex items-center gap-1 text-parchment-400">
                    <Eye size={11} /> {shownLobbyGame.watchers}
                  </span>
                )}
              </span>
            </div>
            {shownId && shownPlayers ? (
              <Board
                board={board}
                legalMoves={[]}
                orientation="w"
                onMove={() => {}}
                myColor="w"
                lastMove={lastMove}
                disabled
              />
            ) : !lobby ? (
              /* Tuning in: the first lobby snapshot (and the recent-game
                 fallback) are still loading. A quiet loading state instead of
                 flashing "no games" at every visitor for a second. */
              <div className="grid aspect-square w-full place-items-center plate">
                <div className="flex flex-col items-center gap-3">
                  <Radio size={28} className="animate-flicker text-gold-leaf" aria-hidden />
                  <div className="skeleton h-2 w-32" />
                  <p className="smallcaps text-[10px] text-parchment-400">Tuning in…</p>
                </div>
              </div>
            ) : (
              <div className="grid aspect-square w-full place-items-center plate">
                <p className="max-w-xs px-6 text-center text-sm text-parchment-400">
                  No {modeFilter ? (modeFilter === "nerf" ? "Nerf " : "Buff ") : ""}games are being
                  played right now. Start one from the lobby and it will show up here.
                </p>
              </div>
            )}
            <div className="flex items-center justify-between">
              {seat("w")}
              {shownId && (
                <Link
                  href={`/game/${shownId}`}
                  className="smallcaps text-[11px] text-parchment-300 transition hover:text-gold-leaf"
                >
                  {live && !over ? "Open with chat →" : "Open replay →"}
                </Link>
              )}
            </div>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="plate p-4">
              <h1 className="flex items-center gap-2 font-display text-lg text-parchment-50">
                <Radio size={16} className={titleColor} /> {title}
              </h1>
              <p className="mt-1 text-sm text-parchment-400">
                Follows the most-watched live game
                {modeFilter ? ` in the ${modeFilter === "nerf" ? "Nerf" : "Buff"} pool` : ""}. Pick
                any game below to pin it.
              </p>
              <div className="mt-3 flex gap-1.5">
                {channels.map((channel) => (
                  <Link
                    key={channel.href}
                    href={channel.href}
                    aria-current={channel.active ? "page" : undefined}
                    className={
                      "border px-3 py-1 smallcaps text-[10px] transition-colors " +
                      channel.className +
                      (channel.active
                        ? " border-white/30 bg-white/10"
                        : " border-white/10 hover:border-white/25 hover:bg-white/5")
                    }
                  >
                    {channel.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="plate">
              <div className="border-b border-white/10 px-4 py-2.5 smallcaps text-[10px] text-parchment-400">
                Live games {liveGames.length > 0 && `(${liveGames.length})`}
              </div>
              {!lobby ? (
                /* First snapshot still loading: shimmer instead of a premature
                   "nothing live" that flashes and then fills in. */
                <div className="space-y-2 px-4 py-3" aria-label="Loading live games">
                  <div className="skeleton h-9 w-full" />
                  <div className="skeleton h-9 w-full" />
                  <div className="skeleton h-9 w-3/4" />
                </div>
              ) : liveGames.length === 0 ? (
                <p className="px-4 py-4 text-sm text-parchment-400">Nothing live right now.</p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {liveGames.map((g: MPLobbyGame) => (
                    <li key={g.id}>
                      <button
                        onClick={() => setPinnedId(g.id)}
                        className={
                          "block w-full px-4 py-2.5 text-left transition-colors hover:bg-white/5 " +
                          (g.id === shownId ? "bg-white/5" : "")
                        }
                      >
                        <div className="truncate text-sm text-parchment-100">
                          {g.players.w.name}
                          {g.players.w.rating != null && (
                            <span className="text-parchment-400"> ({g.players.w.rating})</span>
                          )}
                          <span className="text-parchment-500"> vs </span>
                          {g.players.b.name}
                          {g.players.b.rating != null && (
                            <span className="text-parchment-400"> ({g.players.b.rating})</span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 smallcaps text-[9px] text-parchment-400">
                          <ModeBadge mode={g.mode} compact />
                          {clockLabel(g.timeSec, g.incrementSec)}
                          {g.rated ? " · rated" : " · casual"}
                          <span className="flex items-center gap-1">
                            <Eye size={10} /> {g.watchers}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
