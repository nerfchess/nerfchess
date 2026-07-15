"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { HeroBoard } from "./HeroBoard";
import { PlayerAvatar } from "./PlayerAvatar";
import { useLobbySnapshot } from "@/lib/lobbyClient";
import { MPPlayers } from "@/lib/multiplayer";
import { featuredBoard } from "@/lib/spectate/featuredBoard";
import { useFeaturedTune } from "@/lib/spectate/useFeaturedTune";
import type { Color } from "@/engine/types";

// The last archived game, fetched once for the no-live-games fallback.
type RecentGame = {
  id: string;
  white_name: string;
  black_name: string;
  white_rating_before: number | null;
  black_rating_before: number | null;
  moves: string;
  category: string | null;
  white_avatar: string | null;
  black_avatar: string | null;
};

// Lichess-TV-style hero: when a real game is being played, the landing board
// streams it live (top game = most watched, then longest running). With no
// live games it shows the most recently finished game; the static demo
// position only appears before anything has ever been played.
export function HeroTv() {
  const router = useRouter();
  const lobby = useLobbySnapshot(10000);
  const [recent, setRecent] = useState<RecentGame | null>(null);

  // Featured selection + health-checked failover, shared with /tv. The hero has
  // no channel filter and no manual pin, so it simply follows the first HEALTHY
  // live game: a broken candidate is retried with bounded backoff and then
  // skipped in favor of the next one, instead of the old silent infinite
  // re-watch of games[0].
  const candidateIds = useMemo(() => lobby?.games.map((g) => g.id) ?? [], [lobby]);
  const tune = useFeaturedTune(candidateIds, null, "hero");
  const { streamId, moves, players, over, draft } = tune;

  // Pull the latest finished game IMMEDIATELY on mount, in parallel with the
  // lobby poll, so the hero board shows real play right away instead of waiting
  // for the (single global Durable Object, sometimes slow) lobby snapshot. A
  // live game, when one is being played, takes over below; until it does, this
  // recent game keeps the board alive so a visitor never sees a loading gap.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/games/recent")
      .then((res) => (res.ok ? (res.json() as Promise<{ game: RecentGame | null }>) : null))
      .then((data) => {
        if (!cancelled && data?.game) setRecent(data.game);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const live = tune.live;
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
  // The shown game's mode (nerf/buff), when known: labels the seat ratings
  // and feeds the caption below the board.
  const rawMode = live
    ? lobby?.games.find((g) => g.id === streamId)?.mode ?? null
    : recent?.category ?? null;
  const shownMode = rawMode === "nerf" || rawMode === "buff" ? rawMode : null;

  // Warm the route the hero links to so tapping "Watch"/"Replay" navigates
  // instantly instead of paying to load the /game/[id] chunk on click. Kept
  // above the early return so hook order stays stable across renders.
  useEffect(() => {
    if (shownId) router.prefetch(`/game/${shownId}`);
  }, [shownId, router]);

  if (!shownId || !shownPlayers) {
    return (
      <div className="w-full max-w-[600px] mx-auto">
        <div className="tv-frame">
          <HeroBoard />
        </div>
      </div>
    );
  }

  // Each seat is its own link into the player's profile — the board link and
  // the name links sit side by side, never nested.
  const seat = (color: Color) => {
    const p = shownPlayers[color];
    return (
      <Link
        href={`/u/${encodeURIComponent(p.name)}`}
        className="group/seat flex min-w-0 items-center gap-2 no-underline"
        title={`${p.name}'s profile`}
      >
        <PlayerAvatar name={p.name} avatar={p.avatar} size={24} />
        <span className="truncate font-display text-[15px] text-parchment-100 underline-offset-4 transition-colors group-hover/seat:text-gold-leaf group-hover/seat:underline group-hover/seat:decoration-gold/50">
          {p.name}
          {/* The rating wears the mode's color (warm rose for Nerf, sky for
              Buff) instead of spelling the mode out next to the number. */}
          {p.rating != null && (
            <span
              className={
                "no-underline " +
                (shownMode === "nerf"
                  ? "text-mode-nerfGlow"
                  : shownMode === "buff"
                    ? "text-mode-buffGlow"
                    : "text-parchment-400")
              }
            >
              {" "}({p.rating})
            </span>
          )}
        </span>
      </Link>
    );
  };

  return (
    <div className="w-full max-w-[600px] mx-auto">
      <div className="flex items-center justify-between gap-2 pb-2">
        {seat("b")}
        <span className="flex items-center gap-2 border border-oxblood-glow/40 bg-oxblood/10 px-2.5 py-1 smallcaps text-[10px] text-oxblood-glow">
          <span className="dot-live h-2 w-2 bg-oxblood-glow" />
          {live && over ? "Just finished" : "Live game"}
          {shownMode ? (
            <span className={shownMode === "nerf" ? "text-mode-nerfGlow" : "text-mode-buffGlow"}>
              · {shownMode === "nerf" ? "Nerf" : "Buff"}
            </span>
          ) : null}
        </span>
      </div>
      <Link href={`/game/${shownId}`} className="tv-frame group block no-underline" title={live ? "Watch this game" : "Replay this game"}>
        <div className="overflow-hidden">
          <HeroBoard board={board} lastMove={lastMove} />
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 pt-2">
        {seat("w")}
        <Link
          href={`/game/${shownId}`}
          className="smallcaps text-[10px] text-parchment-400 no-underline transition hover:text-gold-leaf"
        >
          {live ? "Watch →" : "Replay →"}
        </Link>
      </div>
    </div>
  );
}
