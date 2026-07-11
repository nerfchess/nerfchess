"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { HeroBoard } from "./HeroBoard";
import { PlayerAvatar } from "./PlayerAvatar";
import { replayUci } from "@/lib/gameReview";
import { useLobbySnapshot } from "@/lib/lobbyClient";
import { MPPlayers, MPSession } from "@/lib/multiplayer";
import type { Color } from "@/engine/types";

// The last archived game, fetched once for the no-live-games fallback.
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

// Lichess-TV-style hero: when a real game is being played, the landing board
// streams it live (top game = most watched, then longest running). With no
// live games it shows the most recently finished game; the static demo
// position only appears before anything has ever been played.
export function HeroTv() {
  const router = useRouter();
  const lobby = useLobbySnapshot(10000);
  const topGameId = lobby?.games[0]?.id ?? null;
  const [streamId, setStreamId] = useState<string | null>(null);
  const [moves, setMoves] = useState<string[]>([]);
  const [players, setPlayers] = useState<MPPlayers | null>(null);
  const [over, setOver] = useState(false);
  const [recent, setRecent] = useState<RecentGame | null>(null);

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

  // Keep watching a finished game briefly rather than cutting away mid-frame;
  // the next lobby poll supplies the replacement. Derived during render so no
  // extra cascading render is scheduled.
  const nextStream = topGameId ? topGameId : over || !streamId ? topGameId : streamId;
  if (nextStream !== streamId) setStreamId(nextStream);

  useEffect(() => {
    if (!streamId) return;
    let cancelled = false;
    const session = new MPSession();
    session.persistFriendSession = false;
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
          {p.rating != null && <span className="text-parchment-400 no-underline"> ({p.rating})</span>}
        </span>
      </Link>
    );
  };

  return (
    <div className="w-full max-w-[600px] mx-auto">
      <div className="flex items-center justify-between gap-2 pb-2">
        {seat("b")}
        <span className="flex items-center gap-2 border border-white/10 bg-white/5 px-2.5 py-1 smallcaps text-[10px] text-parchment-200">
          <span
            className={
              "h-2 w-2 " + (live && !over ? "dot-live bg-oxblood-glow" : "bg-parchment-400")
            }
          />
          {live ? (over ? "Top board · just finished" : "Top board · live") : "Latest game"}
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
