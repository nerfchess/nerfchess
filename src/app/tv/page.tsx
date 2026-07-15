"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Eye, Radio } from "lucide-react";
// TV is a read-only browsing/preview surface (the full interactive + card-VFX
// experience lives on the spectate page /game/[id]). Rendering the lightweight
// HeroBoard here instead of the full Board keeps the ENTIRE effects/animation
// stack and card database (~26k lines + framer-motion + the VFX engine) out of
// the /tv route bundle — the dominant cause of slow TV load (~1.6MB → a fraction).
import { HeroBoard } from "@/components/HeroBoard";
import { ModeBadge } from "@/components/ModeBadge";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { SiteHeader } from "@/components/SiteHeader";
import { useLobbySnapshot } from "@/lib/lobbyClient";
import { MPLobbyGame, MPPlayers } from "@/lib/multiplayer";
import { featuredBoard } from "@/lib/spectate/featuredBoard";
import { useFeaturedTune } from "@/lib/spectate/useFeaturedTune";
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

// Live-game list ordering. The first game under the active sort is the
// featured board (unless the viewer pinned one).
type TvSort = "watched" | "rated" | "newest" | "closest";
const TV_SORTS: { id: TvSort; label: string; reason: string }[] = [
  { id: "watched", label: "Most watched", reason: "the most-watched live game" },
  { id: "rated", label: "Highest rated", reason: "the highest-rated live game" },
  { id: "newest", label: "Newest", reason: "the freshest live game" },
  { id: "closest", label: "Closest game", reason: "the closest rating matchup" },
];

function sortLiveGames(games: MPLobbyGame[], sort: TvSort): MPLobbyGame[] {
  const best = (g: MPLobbyGame) =>
    Math.max(g.players.w.rating ?? 0, g.players.b.rating ?? 0);
  const gap = (g: MPLobbyGame) =>
    g.players.w.rating != null && g.players.b.rating != null
      ? Math.abs(g.players.w.rating - g.players.b.rating)
      : Number.POSITIVE_INFINITY;
  const arr = [...games];
  switch (sort) {
    case "watched":
      arr.sort((a, b) => b.watchers - a.watchers || best(b) - best(a));
      break;
    case "rated":
      arr.sort((a, b) => best(b) - best(a) || b.watchers - a.watchers);
      break;
    case "newest":
      arr.sort((a, b) => a.moves - b.moves || b.watchers - a.watchers);
      break;
    case "closest":
      arr.sort((a, b) => gap(a) - gap(b) || b.watchers - a.watchers);
      break;
  }
  return arr;
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
  const [recent, setRecent] = useState<RecentGame | null>(null);
  // null = fallback not answered yet; the empty state must not show before this
  // lookup has resolved ("no games are being played" used to flash while the
  // replay was still loading). Deliberately NOT gated on the lobby snapshot, so
  // Buff TV never sits on a spinner while the directory is already available.
  const [recentChecked, setRecentChecked] = useState(false);

  // Switching channels (All / Nerf / Buff) drops the recent fallback so nothing
  // from the other pool lingers. The featured-tune hook resets its own selection
  // + retry state off the same `resetKey`. Done on the change during render.
  const channelKey = modeFilter ?? "all";
  const [prevMode, setPrevMode] = useState(modeFilter);
  if (prevMode !== modeFilter) {
    setPrevMode(modeFilter);
    setPinnedId(null);
    setRecent(null);
    setRecentChecked(false);
  }

  const [sort, setSort] = useState<TvSort>("watched");
  const liveGames = useMemo(() => {
    const games = lobby?.games ?? [];
    const filtered = modeFilter ? games.filter((g) => g.mode === modeFilter) : games;
    return sortLiveGames(filtered, sort);
  }, [lobby, modeFilter, sort]);
  // Eligible candidate ids in ranked order. A lobby game is listed only once it
  // is a watchable started game with both seats, so mode + rank is all the
  // directory-level filtering needed; the deeper "snapshot available + supported
  // version + subscribable" check happens as a real health check inside the tune.
  const candidateIds = useMemo(() => liveGames.map((g) => g.id), [liveGames]);
  const activeSort = TV_SORTS.find((s) => s.id === sort) ?? TV_SORTS[0];

  // Featured selection + health-checked failover (shared with HeroTv). A pinned
  // pick is honored while eligible + healthy; anything that fails its health
  // check is retried with bounded backoff and then skipped in favor of the next
  // healthy game. `channelKey` fully resets it on a channel switch.
  const tune = useFeaturedTune(candidateIds, pinnedId, channelKey, {
    surface: "tv",
    filter: channelKey,
  });
  const { streamId, live, tuneState, slowTune } = tune;
  const pinnedStillLive = pinnedId != null && liveGames.some((g) => g.id === pinnedId);

  // Pull the latest finished game (of this channel's mode, if one is set) once
  // for the no-live-games fallback. Runs regardless of the lobby snapshot so the
  // fallback board is ready fast and the empty state never blocks on the lobby.
  useEffect(() => {
    if (recent) return;
    let cancelled = false;
    fetch(`/api/games/recent${modeFilter ? `?mode=${modeFilter}` : ""}`)
      .then((res) => (res.ok ? (res.json() as Promise<{ game: RecentGame | null }>) : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.game) setRecent(data.game);
        setRecentChecked(true);
      })
      .catch(() => {
        if (!cancelled) setRecentChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [recent, modeFilter]);

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

  // Fall back to the recent replay once a live tune has genuinely failed OR is
  // taking too long (past the short slow-tune threshold) -- not during the first
  // healthy second of connecting, so a good tune-in doesn't flash the archive.
  const showRecentFallback = !live && !!recent && (tuneState !== "tuning" || slowTune);

  const shownMoves = useMemo(
    () => (live ? tune.moves : showRecentFallback && recent ? recent.moves.split(" ").filter(Boolean) : []),
    [live, tune.moves, showRecentFallback, recent],
  );
  const { board, history } = useMemo(
    () => featuredBoard(live, shownMoves, tune.draft),
    [live, shownMoves, tune.draft],
  );
  const lastMove = history[history.length - 1] ?? null;

  const shownId = live ? streamId : showRecentFallback ? recent?.id ?? null : null;
  const shownPlayers = live ? tune.players : showRecentFallback ? recentPlayers : null;
  const shownLobbyGame = liveGames.find((g) => g.id === shownId);
  const over = tune.over;
  // Show a small, nonblocking failover notice: the current candidate failed its
  // health check but the directory is still updating and we are moving on.
  const failoverNotice = tuneState === "failed" || (tuneState === "tuning" && slowTune && !shownPlayers);

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
                {live && !over && (
                  <span
                    className="border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-gold-leaf"
                    title={
                      pinnedStillLive && streamId === pinnedId
                        ? "You pinned this game from the list"
                        : `Featured: ${activeSort.reason}`
                    }
                  >
                    {pinnedStillLive && streamId === pinnedId ? "Pinned" : "Featured"}
                  </span>
                )}
                <ModeBadge mode={shownLobbyGame?.mode} compact />
                {shownLobbyGame && shownLobbyGame.watchers > 0 && (
                  <span className="flex items-center gap-1 text-parchment-400">
                    <Eye size={11} /> {shownLobbyGame.watchers}
                  </span>
                )}
              </span>
            </div>
            {shownId && shownPlayers ? (
              <div className="relative">
                <HeroBoard board={board} lastMove={lastMove} />
                {failoverNotice && (
                  /* Nonblocking: the live candidate failed its health check, so
                     we fell back / are moving on. The board stays visible and the
                     directory keeps updating. */
                  <p className="absolute inset-x-0 top-0 bg-black/60 px-3 py-1 text-center smallcaps text-[10px] text-parchment-200">
                    Couldn&apos;t tune in to a live game. Showing another; the list keeps updating.
                  </p>
                )}
              </div>
            ) : tuneState === "empty" && recentChecked && !recent ? (
              <div className="grid aspect-square w-full place-items-center plate">
                <p className="max-w-xs px-6 text-center text-sm text-parchment-400">
                  No {modeFilter ? (modeFilter === "nerf" ? "Nerf " : "Buff ") : ""}games are being
                  played right now. Start one from the lobby and it will show up here.
                </p>
              </div>
            ) : failoverNotice || (tuneState === "tuning" && slowTune) ? (
              /* Health check failed (or is taking too long) with no fallback to
                 show: a brief notice instead of an eternal "Tuning in…" spinner.
                 Selection auto-advances to the next healthy game on its own. */
              <div className="grid aspect-square w-full place-items-center plate">
                <p className="max-w-xs px-6 text-center text-sm text-parchment-400">
                  Couldn&apos;t tune in to a live game right now. Trying the next one
                  automatically. You can also pick a game from the list.
                </p>
              </div>
            ) : (
              /* Genuine initial load, before the first snapshot / recent lookup
                 has answered. Bounded by the short slow-tune threshold above so
                 it can never spin forever. */
              <div className="grid aspect-square w-full place-items-center plate">
                <div className="relative flex flex-col items-center gap-3">
                  <span className="tv-tuning-ring" aria-hidden />
                  <Radio size={28} className="animate-flicker text-gold-leaf" aria-hidden />
                  <div className="skeleton h-2 w-32" />
                  <div className="skeleton h-2 w-20" />
                  <p className="smallcaps text-[10px] text-parchment-400">Tuning in…</p>
                </div>
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
                Features {activeSort.reason}
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
              <div
                role="group"
                aria-label="Sort live games"
                className="flex flex-wrap gap-1.5 border-b border-white/10 px-4 py-2.5"
              >
                {TV_SORTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={sort === s.id}
                    onClick={() => setSort(s.id)}
                    className={
                      "border px-2 py-1 smallcaps text-[9px] transition-colors " +
                      (sort === s.id
                        ? "border-gold/50 bg-gold/10 text-gold-leaf"
                        : "border-white/10 text-parchment-400 hover:border-white/25 hover:text-parchment-200")
                    }
                  >
                    {s.label}
                  </button>
                ))}
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
                        onClick={() => {
                          // Manual selection uses the identical validation +
                          // recovery path: give a re-picked game a fresh set of
                          // health-check retries rather than honoring a stale
                          // "unhealthy" mark.
                          tune.clearFailed(g.id);
                          setPinnedId(g.id);
                        }}
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
                          <span>move {Math.max(1, Math.ceil(g.moves / 2))}</span>
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
