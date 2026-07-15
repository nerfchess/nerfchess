"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
import { arenaSocketUrl, isArenaGameId, isArenaGameLive } from "@/lib/arenaLobby";
import { useLobbySnapshot } from "@/lib/lobbyClient";
import { MPLobbyGame, MPPlayers, MPSession } from "@/lib/multiplayer";
import {
  appendFeaturedDraftAction,
  featuredBoard,
  featuredDraftFromWatchStart,
  FeaturedDraft,
  NOT_A_DRAFT,
  withFeaturedDraftState,
} from "@/lib/spectate/featuredBoard";
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
  const [streamId, setStreamId] = useState<string | null>(null);
  const [moves, setMoves] = useState<string[]>([]);
  const [players, setPlayers] = useState<MPPlayers | null>(null);
  const [over, setOver] = useState(false);
  // Public draft-action record for draft (buff) games, so the featured board is
  // rebuilt through the engine — reproducing board rewrites move-replay can't.
  const [draft, setDraft] = useState<FeaturedDraft>(NOT_A_DRAFT);
  // Synchronous mirror of the accepted-move count, so a draft action is tagged
  // with the ply it fired at (the engine interleaves it there on reconstruction).
  const movesLenRef = useRef(0);
  // The stream id whose tune-in failed even after a retry, so the board area
  // shows a brief notice instead of an eternal "Tuning in…" spinner. Keyed by
  // id (not a boolean) so switching to another game clears it for free, with
  // no synchronous reset needed inside the watch effect.
  const [failedStreamId, setFailedStreamId] = useState<string | null>(null);
  // Bumped on a timer after a tune-in failure so the watch effect re-runs and
  // tries again on its own — the viewer never has to wait for the featured
  // game to change.
  const [retryTick, setRetryTick] = useState(0);
  const [recent, setRecent] = useState<RecentGame | null>(null);
  // null = fallback not answered yet; the empty state must not show before
  // BOTH the lobby snapshot and this lookup have resolved ("no games are
  // being played" used to flash while the replay was still loading).
  const [recentChecked, setRecentChecked] = useState(false);

  // Switching channels (All / Nerf / Buff) drops everything shown so nothing
  // from the other pool lingers on screen. Reset on the change during render.
  const [prevMode, setPrevMode] = useState(modeFilter);
  if (prevMode !== modeFilter) {
    setPrevMode(modeFilter);
    setPinnedId(null);
    setStreamId(null);
    setMoves([]);
    setPlayers(null);
    setOver(false);
    setDraft(NOT_A_DRAFT);
    setFailedStreamId(null);
    setRecent(null);
    setRecentChecked(false);
  }

  const [sort, setSort] = useState<TvSort>("watched");
  const liveGames = useMemo(() => {
    const games = lobby?.games ?? [];
    const filtered = modeFilter ? games.filter((g) => g.mode === modeFilter) : games;
    return sortLiveGames(filtered, sort);
  }, [lobby, modeFilter, sort]);
  const pinnedStillLive = pinnedId != null && liveGames.some((g) => g.id === pinnedId);
  // A featured game whose tune-in failed is skipped in favor of the next live
  // board (a pinned pick is honored — the viewer chose it on purpose).
  const firstWatchableId =
    liveGames.find((g) => g.id !== failedStreamId)?.id ?? liveGames[0]?.id ?? null;
  const targetId = pinnedStillLive ? pinnedId : firstWatchableId;
  const activeSort = TV_SORTS.find((s) => s.id === sort) ?? TV_SORTS[0];

  // With nothing live, pull the latest finished game (of this channel's mode,
  // if one is set) once for a replay.
  useEffect(() => {
    if (!lobby || liveGames.length > 0 || recent) return;
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
  }, [lobby, liveGames.length, recent, modeFilter]);

  // Keep a just-finished game on screen until the lobby offers a replacement.
  // Derived during render so no extra cascading render is scheduled.
  const nextStream = targetId ? targetId : over || !streamId ? targetId : streamId;
  if (nextStream !== streamId) setStreamId(nextStream);

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
        movesLenRef.current = e.setup.moves.length;
        setMoves(e.setup.moves);
        setPlayers(e.setup.players);
        setOver(!!e.setup.result);
        setDraft(featuredDraftFromWatchStart(e.setup));
      } else if (e.type === "move") {
        movesLenRef.current = e.move.ply;
        setMoves((m) => (e.move.ply === m.length + 1 ? [...m, e.move.u] : m));
      } else if (e.type === "draft-used") {
        setDraft((d) =>
          appendFeaturedDraftAction(d, movesLenRef.current, {
            kind: "used",
            color: e.used.color,
            buffIndex: e.used.buffIndex,
            picks: e.used.picks,
            card: e.used.card,
          }),
        );
      } else if (e.type === "draft-resolved") {
        setDraft((d) =>
          appendFeaturedDraftAction(d, movesLenRef.current, {
            kind: "resolved",
            color: e.resolved.color,
            picked: e.resolved.kind === "picked",
            cards: e.resolved.cards,
          }),
        );
      } else if (e.type === "draft-state") {
        setDraft((d) => withFeaturedDraftState(d, e.state));
      } else if (e.type === "end") {
        setOver(true);
      }
    });
    // Tune in with a single retry: watch() now rejects on a ~10s timeout or a
    // disconnect (rather than hanging forever), so one clean retry recovers
    // from a transient miss. Before the retry, re-check where the game lives
    // with a fresh arena snapshot — a cold or stale arena cache can point the
    // first attempt at the wrong socket (main DO vs arena), which used to fail
    // both attempts and strand the page on the "couldn't tune in" notice. If
    // it still fails, show the notice briefly and re-try on a timer instead of
    // waiting for the featured game to change.
    let retryTimer: number | undefined;
    const tuneIn = (retriesLeft: number) => {
      session.watch(streamId).catch(async () => {
        if (cancelled) return;
        if (retriesLeft > 0) {
          const arenaHosted = await isArenaGameLive(streamId).catch(() => false);
          if (cancelled) return;
          // setServerUrl (not a bare field write): it drops the socket to the
          // wrong server, so the retry actually dials the right one.
          session.setServerUrl(arenaHosted && arenaSocketUrl() ? arenaSocketUrl() : null);
          tuneIn(retriesLeft - 1);
        } else {
          setPlayers(null);
          setFailedStreamId(streamId);
          retryTimer = window.setTimeout(() => {
            if (!cancelled) setRetryTick((t) => t + 1);
          }, 8000);
        }
      });
    };
    tuneIn(1);
    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      off();
      session.destroy();
    };
  }, [streamId, retryTick]);

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
  const { board, history } = useMemo(
    () => featuredBoard(live, shownMoves, draft),
    [live, shownMoves, draft],
  );
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
              <HeroBoard board={board} lastMove={lastMove} />
            ) : streamId && failedStreamId === streamId ? (
              /* Tune-in failed after a retry: don't spin forever. The featured
                 game stays selected (the lobby may recover it, or the viewer can
                 pick another), but the board area shows a brief notice. */
              <div className="grid aspect-square w-full place-items-center plate">
                <p className="max-w-xs px-6 text-center text-sm text-parchment-400">
                  Couldn&apos;t tune in to that game. Retrying automatically. You can
                  also pick another game from the list.
                </p>
              </div>
            ) : !lobby || !recentChecked ? (
              /* Tuning in: covers BOTH the first lobby snapshot AND the
                 recent-game fallback lookup. The empty state only ever shows
                 once both have answered and there is genuinely nothing to
                 screen — no more "no games" flashing before a replay loads. */
              <div className="grid aspect-square w-full place-items-center plate">
                <div className="relative flex flex-col items-center gap-3">
                  <span className="tv-tuning-ring" aria-hidden />
                  <Radio size={28} className="animate-flicker text-gold-leaf" aria-hidden />
                  <div className="skeleton h-2 w-32" />
                  <div className="skeleton h-2 w-20" />
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
