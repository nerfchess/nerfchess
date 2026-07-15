"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Maximize2, Radio, X } from "lucide-react";
// TV is a read-only browsing/preview surface (the full interactive + card-VFX
// experience lives on the spectate page /game/[id]). Rendering the lightweight
// HeroBoard here instead of the full Board keeps the ENTIRE effects/animation
// stack and card database (~26k lines + framer-motion + the VFX engine) out of
// the /tv route bundle, the dominant cause of slow TV load (~1.6MB to a fraction).
import { ClockPill } from "@/components/ClockPill";
import { HeroBoard } from "@/components/HeroBoard";
import { ModeBadge } from "@/components/ModeBadge";
import { Piece } from "@/components/Pieces";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { SiteHeader } from "@/components/SiteHeader";
import { useLobbySnapshotStatus } from "@/lib/lobbyClient";
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

// The shared player-identity unit (design system 7): avatar + linked name +
// rating (+ provisional "?"). Every name on this surface links to the profile.
function PlayerIdentity({
  name,
  rating,
  avatar,
  provisional,
  size = 28,
  strong = false,
}: {
  name: string;
  rating: number | null;
  avatar?: string | null;
  provisional?: boolean;
  size?: number;
  strong?: boolean;
}) {
  return (
    <Link
      href={`/u/${encodeURIComponent(name)}`}
      className="group flex min-h-[44px] min-w-0 items-center gap-2 sm:min-h-0"
      title={`View ${name}'s profile`}
    >
      <PlayerAvatar name={name} avatar={avatar} size={size} />
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span
          className={
            "truncate font-display font-semibold text-parchment-100 transition-colors group-hover:text-gold-leaf " +
            (strong ? "text-[15px]" : "text-[13px]")
          }
        >
          {name}
          {provisional && <span className="text-parchment-400">?</span>}
        </span>
        {rating != null && (
          <span className="shrink-0 font-mono text-[12px] tabular-nums text-parchment-400">
            {rating}
          </span>
        )}
      </span>
    </Link>
  );
}

// A checkered board-shaped skeleton with a shimmer sweep, so a tuning/failover
// transition holds the board's exact footprint instead of a spinner page.
function TvBoardSkeleton({ status }: { status: string }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden border border-[color:var(--edge)]">
      <div className="grid h-full w-full grid-cols-8 grid-rows-8" aria-hidden>
        {Array.from({ length: 64 }).map((_, i) => {
          const isLight = (Math.floor(i / 8) + (i % 8)) % 2 === 0;
          return <div key={i} className={isLight ? "sq-light" : "sq-dark"} />;
        })}
      </div>
      <div className="skeleton absolute inset-0" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-ink-900/70 px-3 py-2">
        <Radio size={14} className="animate-flicker text-gold-leaf" aria-hidden />
        <p role="status" aria-live="polite" className="text-[12px] text-parchment-200">
          {status}
        </p>
      </div>
    </div>
  );
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

  const { lobby, failed: lobbyFailed, reload: reloadLobby } = useLobbySnapshotStatus(5000);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentGame | null>(null);
  // null = fallback not answered yet; the empty state must not show before this
  // lookup has resolved ("no games are being played" used to flash while the
  // replay was still loading). Deliberately NOT gated on the lobby snapshot, so
  // Buff TV never sits on a spinner while the directory is already available.
  const [recentChecked, setRecentChecked] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

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
  const isFinal = !live || over || showRecentFallback;
  const moveNumber = Math.max(1, Math.ceil(shownMoves.length / 2));
  // Live clocks beside each player, only once the stream has delivered an
  // authoritative value (clocks stays null until then; never a fake 0:00) and
  // only for the live stream, never the recent-replay fallback.
  const headerClocks = live ? tune.clocks : null;
  const clockTurn: Color | null = live && !over ? board.turn : null;
  // Show a small, nonblocking failover notice: the current candidate failed its
  // health check but the directory is still updating and we are moving on.
  const failoverNotice = tuneState === "failed" || (tuneState === "tuning" && slowTune && !shownPlayers);

  const title = modeFilter === "nerf" ? "Nerf TV" : modeFilter === "buff" ? "Buff TV" : "Nerf Chess TV";
  const channels: { href: string; label: string; active: boolean }[] = [
    { href: "/tv", label: "All", active: modeFilter === null },
    { href: "/tv?mode=nerf", label: "Nerf", active: modeFilter === "nerf" },
    { href: "/tv?mode=buff", label: "Buff", active: modeFilter === "buff" },
  ];

  // Prev / next healthy game: navigate the ranked live list, skipping any
  // candidate currently marked unhealthy, wrapping around. A manual pick clears
  // that game's stale "unhealthy" mark so it gets a fresh set of health-check
  // retries (identical to a list click).
  const healthyIds = useMemo(
    () => candidateIds.filter((id) => !tune.failedIds.has(id)),
    [candidateIds, tune.failedIds],
  );
  const canNavigate = healthyIds.length > 1;
  const pickGame = (id: string) => {
    tune.clearFailed(id);
    setPinnedId(id);
  };
  const stepGame = (dir: 1 | -1) => {
    if (healthyIds.length === 0) return;
    const cur = shownId && healthyIds.includes(shownId) ? healthyIds.indexOf(shownId) : -1;
    const next = healthyIds[(cur + dir + healthyIds.length) % healthyIds.length];
    if (next) pickGame(next);
  };

  // Escape / disappearance exits fullscreen. Clamped during render so the
  // overlay never lingers over an absent board.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);
  const hasBoard = !!(shownId && shownPlayers);
  if (fullscreen && !hasBoard) setFullscreen(false);

  const liveBadge = (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--pos-rgb)/0.4)] bg-[rgb(var(--pos-rgb)/0.12)] px-2 py-0.5 text-[12px] font-semibold text-[rgb(var(--pos-rgb))]">
      <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--pos-rgb))] animate-flicker" aria-hidden />
      Live
    </span>
  );
  const finalBadge = (
    <span className="inline-flex items-center rounded-full border border-[color:var(--edge-strong)] bg-white/[0.04] px-2 py-0.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-parchment-300">
      Final
    </span>
  );

  const metaChips = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-parchment-400">
      {hasBoard && (isFinal ? finalBadge : liveBadge)}
      <ModeBadge mode={shownLobbyGame?.mode} />
      {shownLobbyGame && (
        <span className="tabular-nums">{clockLabel(shownLobbyGame.timeSec, shownLobbyGame.incrementSec)}</span>
      )}
      {shownLobbyGame && <span>{shownLobbyGame.rated ? "Rated" : "Casual"}</span>}
      {hasBoard && <span className="tabular-nums">Move {moveNumber}</span>}
      {shownLobbyGame && shownLobbyGame.watchers > 0 && (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <Eye size={13} aria-hidden /> {shownLobbyGame.watchers}
        </span>
      )}
    </div>
  );

  // The board region, always in the same aspect-square footprint: the live/replay
  // board, the designed empty state, or a board-shaped skeleton with a status
  // line (never a spinner page).
  let boardRegion: React.ReactNode;
  if (hasBoard) {
    boardRegion = (
      <div className="relative">
        <HeroBoard board={board} lastMove={lastMove} />
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          aria-label="Watch fullscreen"
          className="press absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-sm border border-[color:var(--edge-strong)] bg-ink-900/70 text-parchment-200 transition-colors hover:border-gold/50 hover:text-gold-leaf"
        >
          <Maximize2 size={16} aria-hidden />
        </button>
        {failoverNotice && (
          <p
            role="status"
            aria-live="polite"
            className="absolute inset-x-0 top-0 bg-ink-900/75 px-3 py-1.5 text-center text-[12px] text-parchment-200"
          >
            Couldn&apos;t tune in to that game. Showing another; the list keeps updating.
          </p>
        )}
      </div>
    );
  } else if (lobbyFailed) {
    // The lobby poller is in its failed state: the featured panel shows the
    // SAME unreachable-error framing as the rail (never a false "no games are
    // live" claim), with a Retry that reuses the rail's reload. The empty state
    // below is reserved for a HEALTHY poller that returned zero games.
    boardRegion = (
      <div role="alert" className="grid aspect-square w-full place-items-center plate p-6">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full border border-[color:var(--edge-strong)] bg-white/[0.03]">
            <Radio size={40} className="text-parchment-400" aria-hidden />
          </div>
          <p className="mt-4 text-[15px] font-display font-semibold text-parchment-100">
            Can&apos;t reach the game server, so the live game can&apos;t load.
          </p>
          <button
            type="button"
            onClick={reloadLobby}
            className="press mt-5 inline-flex min-h-[44px] items-center rounded-sm border border-[color:var(--edge)] bg-white/[0.03] px-4 py-2 font-display text-[13px] font-medium text-parchment-200 transition-colors hover:bg-white/[0.07] hover:text-parchment-100 sm:min-h-[36px]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  } else if (tuneState === "empty" && recentChecked && !recent) {
    boardRegion = (
      <div className="grid aspect-square w-full place-items-center plate p-6">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full border border-[color:var(--edge-strong)] bg-white/[0.03]">
            <Piece type="n" color="w" size={44} />
          </div>
          <p className="mt-4 text-[15px] font-display font-semibold text-parchment-100">
            No {modeFilter ? (modeFilter === "nerf" ? "Nerf " : "Buff ") : ""}games are live right now.
          </p>
          <p className="mt-1 text-[13px] text-parchment-400">
            Start one and it shows up here for everyone to watch.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/lobby"
              className="press btn-leaf inline-flex min-h-[44px] items-center rounded-sm px-4 py-2 font-display text-[13px] font-semibold sm:min-h-[36px]"
            >
              Find a match
            </Link>
            <Link
              href="/play"
              className="press btn-ghost inline-flex min-h-[44px] items-center rounded-sm px-4 py-2 font-display text-[13px] sm:min-h-[36px]"
            >
              Play a bot
            </Link>
          </div>
        </div>
      </div>
    );
  } else if (failoverNotice || (tuneState === "tuning" && slowTune)) {
    boardRegion = (
      <TvBoardSkeleton status="Couldn't tune in. Trying the next healthy game automatically…" />
    );
  } else {
    boardRegion = <TvBoardSkeleton status="Tuning in…" />;
  }

  return (
    <main className="min-h-screen">
      <SiteHeader active="/tv" />
      <section className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,592px)_320px] lg:justify-center">
          {/* Featured game */}
          <div className="min-w-0">
            <div className="plate p-3 sm:p-4">
              {/* Header row: identity units + controls */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-col gap-2">
                  {shownPlayers ? (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/40 bg-[#e8e6e1]"
                          aria-hidden
                        />
                        <PlayerIdentity
                          name={shownPlayers.w.name}
                          rating={shownPlayers.w.rating}
                          avatar={shownPlayers.w.avatar}
                          provisional={shownPlayers.w.provisional}
                          strong
                        />
                        {headerClocks && (
                          <ClockPill ms={headerClocks.w} active={clockTurn === "w"} compact />
                        )}
                      </span>
                      <span className="text-[12px] text-parchment-500">vs</span>
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/30 bg-[#1a1a22]"
                          aria-hidden
                        />
                        <PlayerIdentity
                          name={shownPlayers.b.name}
                          rating={shownPlayers.b.rating}
                          avatar={shownPlayers.b.avatar}
                          provisional={shownPlayers.b.provisional}
                          strong
                        />
                        {headerClocks && (
                          <ClockPill ms={headerClocks.b} active={clockTurn === "b"} compact />
                        )}
                      </span>
                    </div>
                  ) : (
                    <h1 className="flex items-center gap-2 font-display text-[15px] font-semibold text-parchment-50">
                      <Radio size={16} className="text-gold-leaf" aria-hidden /> {title}
                    </h1>
                  )}
                  {metaChips}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => stepGame(-1)}
                    disabled={!canNavigate}
                    aria-label="Previous live game"
                    className="press grid h-9 w-9 place-items-center rounded-sm border border-[color:var(--edge)] text-parchment-200 transition-colors hover:border-gold/50 hover:text-gold-leaf disabled:opacity-35 disabled:hover:border-[color:var(--edge)] disabled:hover:text-parchment-200"
                  >
                    <ChevronLeft size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => stepGame(1)}
                    disabled={!canNavigate}
                    aria-label="Next live game"
                    className="press grid h-9 w-9 place-items-center rounded-sm border border-[color:var(--edge)] text-parchment-200 transition-colors hover:border-gold/50 hover:text-gold-leaf disabled:opacity-35 disabled:hover:border-[color:var(--edge)] disabled:hover:text-parchment-200"
                  >
                    <ChevronRight size={18} aria-hidden />
                  </button>
                </div>
              </div>

              {/* Board */}
              <div className="mx-auto mt-3 w-full max-w-[560px]">{boardRegion}</div>

              {/* Below-board bar: only rendered when a board is actually
                  showing. The "Featuring the most-watched live game" caption
                  must never sit under an empty or error state (it would make a
                  false "there is a game" claim). */}
              {hasBoard && (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-[12px] text-parchment-400">
                    {pinnedStillLive && streamId === pinnedId
                      ? "You pinned this game."
                      : live
                        ? `Featuring ${activeSort.reason}.`
                        : "Latest finished game."}
                  </span>
                  {shownId && (
                    <Link
                      href={`/game/${shownId}`}
                      className="shrink-0 font-display text-[13px] text-gold-leaf transition hover:underline"
                    >
                      {live && !over ? "Open with chat →" : "Open replay →"}
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Rail */}
          <aside className="flex flex-col gap-4">
            {/* Channel segmented control */}
            <div
              role="group"
              aria-label="TV channel"
              className="flex items-stretch gap-1 rounded-sm border border-[color:var(--edge)] bg-ink-900/40 p-1"
            >
              {channels.map((channel) => (
                <Link
                  key={channel.href}
                  href={channel.href}
                  aria-current={channel.active ? "page" : undefined}
                  className={
                    "flex-1 rounded-[2px] px-3 py-1.5 text-center font-display text-[13px] font-semibold transition-colors " +
                    (channel.active
                      ? "bg-[rgb(var(--accent-rgb)/0.16)] text-gold-leaf"
                      : "text-parchment-400 hover:bg-white/[0.05] hover:text-parchment-100")
                  }
                >
                  {channel.label}
                </Link>
              ))}
            </div>

            {/* Live game list */}
            <div className="plate">
              <div className="flex items-center justify-between border-b border-[color:var(--edge)] px-3 py-2.5">
                <span className="eyebrow text-parchment-400">Live games</span>
                {liveGames.length > 0 && (
                  <span className="font-mono text-[12px] tabular-nums text-parchment-400">
                    {liveGames.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 border-b border-[color:var(--edge)] px-3 py-2.5">
                <label htmlFor="tv-sort" className="shrink-0 text-[12px] text-parchment-400">
                  Sort
                </label>
                <div
                  id="tv-sort"
                  role="group"
                  aria-label="Sort live games"
                  className="flex min-w-0 flex-1 flex-wrap gap-1"
                >
                  {TV_SORTS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={sort === s.id}
                      onClick={() => setSort(s.id)}
                      className={
                        "shrink-0 rounded-sm border px-2.5 py-1 text-[12px] font-medium transition-colors " +
                        (sort === s.id
                          ? "border-gold/50 bg-[rgb(var(--accent-rgb)/0.12)] text-gold-leaf"
                          : "border-[color:var(--edge)] text-parchment-400 hover:border-[color:var(--edge-strong)] hover:text-parchment-200")
                      }
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              {!lobby ? (
                lobbyFailed ? (
                  /* Server unreachable and nothing cached: a plain error with a
                     Retry, never a skeleton that spins forever. */
                  <div role="alert" className="space-y-2 p-3">
                    <p className="text-[13px] text-parchment-300">
                      Can&apos;t reach the game server, so the live list isn&apos;t available.
                    </p>
                    <button
                      type="button"
                      onClick={reloadLobby}
                      className="rounded-sm border border-[color:var(--edge)] bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-parchment-200 transition-colors hover:bg-white/[0.07] hover:text-parchment-100"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  /* First snapshot still loading: shimmer instead of a premature
                     "nothing live" that flashes and then fills in. */
                  <div className="space-y-2 p-3" aria-label="Loading live games">
                    <div className="skeleton h-12 w-full" />
                    <div className="skeleton h-12 w-full" />
                    <div className="skeleton h-12 w-3/4" />
                  </div>
                )
              ) : liveGames.length === 0 ? (
                <p className="px-3 py-4 text-[13px] text-parchment-400">
                  Nothing live in this channel right now.
                </p>
              ) : (
                <ul className="divide-y divide-[color:var(--edge)]">
                  {liveGames.map((g: MPLobbyGame) => {
                    const selected = g.id === shownId;
                    return (
                      <li key={g.id} className="relative">
                        {selected && (
                          <span
                            className="absolute inset-y-0 left-0 w-0.5 bg-gold-leaf"
                            aria-hidden
                          />
                        )}
                        <button
                          onClick={() => pickGame(g.id)}
                          aria-current={selected ? "true" : undefined}
                          className={
                            "block w-full px-3 py-2.5 text-left transition-colors " +
                            (selected
                              ? "bg-[var(--surface-raise)]"
                              : "hover:bg-[var(--surface-hover)]")
                          }
                        >
                          <div className="flex items-center gap-2">
                            <PlayerIdentity
                              name={g.players.w.name}
                              rating={g.players.w.rating}
                              avatar={g.players.w.avatar}
                              provisional={g.players.w.provisional}
                              size={22}
                            />
                            <span className="shrink-0 text-[12px] text-parchment-500">vs</span>
                            <PlayerIdentity
                              name={g.players.b.name}
                              rating={g.players.b.rating}
                              avatar={g.players.b.avatar}
                              provisional={g.players.b.provisional}
                              size={22}
                            />
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 pl-[30px] text-[12px] text-parchment-400">
                            <ModeBadge mode={g.mode} />
                            <span className="tabular-nums">{clockLabel(g.timeSec, g.incrementSec)}</span>
                            <span className="tabular-nums">move {Math.max(1, Math.ceil(g.moves / 2))}</span>
                            <span className="inline-flex items-center gap-1 tabular-nums">
                              <Eye size={12} aria-hidden /> {g.watchers}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* Fullscreen overlay: the board scaled to the viewport. Escape or the
          button exits. A CSS fixed overlay (no backdrop-blur, per the system). */}
      {fullscreen && hasBoard && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/95 p-4">
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            aria-label="Exit fullscreen"
            className="press absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-sm border border-[color:var(--edge-strong)] bg-ink-900/70 text-parchment-100 transition-colors hover:border-gold/50 hover:text-gold-leaf"
          >
            <X size={20} aria-hidden />
          </button>
          <div className="flex w-full max-w-[min(92vw,88vh)] flex-col gap-3">
            {shownPlayers && (
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                <PlayerIdentity
                  name={shownPlayers.w.name}
                  rating={shownPlayers.w.rating}
                  avatar={shownPlayers.w.avatar}
                  provisional={shownPlayers.w.provisional}
                  strong
                />
                {headerClocks && <ClockPill ms={headerClocks.w} active={clockTurn === "w"} compact />}
                <span className="text-[12px] text-parchment-500">vs</span>
                <PlayerIdentity
                  name={shownPlayers.b.name}
                  rating={shownPlayers.b.rating}
                  avatar={shownPlayers.b.avatar}
                  provisional={shownPlayers.b.provisional}
                  strong
                />
                {headerClocks && <ClockPill ms={headerClocks.b} active={clockTurn === "b"} compact />}
              </div>
            )}
            <div className="w-full">
              <HeroBoard board={board} lastMove={lastMove} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
