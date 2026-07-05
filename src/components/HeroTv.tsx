"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Board } from "./Board";
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
  // the next lobby poll supplies the replacement.
  useEffect(() => {
    if (topGameId) setStreamId(topGameId);
    else if (over || !streamId) setStreamId(topGameId);
  }, [topGameId, over, streamId]);

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

  if (!shownId || !shownPlayers) return <HeroBoard />;

  const seat = (color: Color) => {
    const p = shownPlayers[color];
    return (
      <span className="flex min-w-0 items-center gap-2">
        <PlayerAvatar name={p.name} avatar={p.avatar} size={22} />
        <span className="truncate font-display text-sm text-parchment-100">
          {p.name}
          {p.rating != null && <span className="text-parchment-400"> ({p.rating})</span>}
        </span>
      </span>
    );
  };

  return (
    <Link href={`/game/${shownId}`} className="block w-full max-w-[560px] mx-auto no-underline group">
      <div className="flex items-center justify-between gap-2 pb-1.5">
        {seat("b")}
        <span className="flex items-center gap-1.5 smallcaps text-[10px] text-parchment-300">
          <span className={"h-2 w-2 rounded-full " + (live && !over ? "bg-oxblood-glow animate-flicker" : "bg-parchment-400")} />
          {live ? (over ? "Just finished" : "Live") : "Latest game"}
        </span>
      </div>
      <div className="border border-black/50 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.85)] transition group-hover:border-gold/40">
        <Board
          board={board}
          legalMoves={[]}
          orientation="w"
          onMove={() => {}}
          myColor="w"
          lastMove={lastMove}
          disabled
          showCoordinates={false}
        />
      </div>
      <div className="flex items-center justify-between gap-2 pt-1.5">
        {seat("w")}
        <span className="smallcaps text-[10px] text-parchment-400 transition group-hover:text-gold-leaf">
          {live ? "Watch →" : "Replay →"}
        </span>
      </div>
    </Link>
  );
}
