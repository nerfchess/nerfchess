"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Board } from "./Board";
import { HeroBoard } from "./HeroBoard";
import { PlayerAvatar } from "./PlayerAvatar";
import { replayUci } from "@/lib/gameReview";
import { useLobbySnapshot } from "@/lib/lobbyClient";
import { MPPlayers, MPSession } from "@/lib/multiplayer";
import type { Color } from "@/engine/types";

// Lichess-TV-style hero: when a real game is being played, the landing board
// streams it live (top game = most watched, then longest running). With no
// live games it falls back to the static demo position.
export function HeroTv() {
  const lobby = useLobbySnapshot(10000);
  const topGameId = lobby?.games[0]?.id ?? null;
  const [streamId, setStreamId] = useState<string | null>(null);
  const [moves, setMoves] = useState<string[]>([]);
  const [players, setPlayers] = useState<MPPlayers | null>(null);
  const [over, setOver] = useState(false);

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

  const { board, history } = useMemo(() => replayUci(moves), [moves]);
  const lastMove = history[history.length - 1] ?? null;

  if (!streamId || !players) return <HeroBoard />;

  const seat = (color: Color) => {
    const p = players[color];
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
    <Link href={`/game/${streamId}`} className="block w-full max-w-[560px] mx-auto no-underline group">
      <div className="flex items-center justify-between gap-2 pb-1.5">
        {seat("b")}
        <span className="flex items-center gap-1.5 smallcaps text-[10px] text-parchment-300">
          <span className={"h-2 w-2 rounded-full " + (over ? "bg-parchment-400" : "bg-oxblood-glow animate-flicker")} />
          {over ? "Just finished" : "Live"}
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
          Watch →
        </span>
      </div>
    </Link>
  );
}
