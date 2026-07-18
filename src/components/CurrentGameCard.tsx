"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { HeroBoard } from "./HeroBoard";
import { PlayerAvatar } from "./PlayerAvatar";
import { featuredBoard } from "@/lib/spectate/featuredBoard";
import { useFeaturedTune } from "@/lib/spectate/useFeaturedTune";
import { emitTv } from "@/lib/telemetry/tv";
import type { Color } from "@/engine/types";

// The profile "Playing Right Now" card. It is a THIN wrapper over the exact
// same featured-tune pipeline the landing hero uses (useFeaturedTune ->
// featuredBoard -> HeroBoard), pointed at the single game id the profile API
// resolved from the authoritative live-seat index. It therefore inherits every
// snapshot/version/health-check/failover fix for free, and it can NEVER paint a
// false starting board:
//   - It renders the mini-board only when the watch is genuinely live AND the
//     profiled player actually occupies a seat in the watch-start players
//     payload (the stale-index guard).
//   - While the tune is still connecting, or after it has failed its bounded
//     health check, it shows verified metadata (the player's name + a Watch
//     action that opens the full, self-healing spectator view) instead of a
//     board.
//   - When the player is not in a live game (no id) it renders nothing.
export function CurrentGameCard({
  username,
  gameId,
  mode,
}: {
  username: string;
  gameId: string | null;
  mode?: "nerf" | "buff" | null;
}) {
  // Single-candidate tune: the profile card follows exactly one known game, so
  // it passes that id as both the sole candidate and the pin. The hook still
  // runs the identical health check + bounded backoff; there is simply nothing
  // to fail over TO, which the card surfaces as "temporarily unavailable".
  const candidates = useMemo(() => (gameId ? [gameId] : []), [gameId]);
  const tune = useFeaturedTune(candidates, gameId, `profile:${username}:${gameId ?? ""}`, {
    surface: "profile",
    filter: mode ?? "unknown",
  });
  const { live, players, moves, draft, over, tuneState } = tune;

  // Seat guard: the live index can lag by a poll, so confirm the watch-start
  // players payload really seats this player before trusting the stream. A
  // mismatch means the id was stale; render nothing rather than someone else's
  // board.
  const seatOk =
    !!players &&
    (players.w.name.toLowerCase() === username.toLowerCase() ||
      players.b.name.toLowerCase() === username.toLowerCase());

  const showBoard = live && seatOk;

  const { board, history } = useMemo(
    () => featuredBoard(showBoard, showBoard ? moves : [], draft),
    [showBoard, moves, draft],
  );
  const lastMove = history[history.length - 1] ?? null;

  // Report the live-preview OUTCOME exactly once per game. The tune hook already
  // emits tv_tune_started / _succeeded / _failed for the "profile" surface; the
  // card adds the profile-specific verdict (a seated live board, a stale-seat
  // drop, or a failed health check) so the two together tell the whole story.
  const reported = useRef<string | null>(null);
  useEffect(() => {
    if (!gameId) reported.current = null;
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    if (showBoard) {
      if (reported.current !== `ok:${gameId}`) {
        reported.current = `ok:${gameId}`;
        emitTv("profile_live_preview_succeeded", "profile", { gameId, mode: mode ?? null });
      }
      return;
    }
    // Distinguish a stale-seat drop from a failed health check so the beacon
    // names the real reason.
    if (live && !seatOk && reported.current !== `noseat:${gameId}`) {
      reported.current = `noseat:${gameId}`;
      emitTv("profile_live_preview_failed", "profile", { gameId, mode: mode ?? null, reason: "no_seat" });
    } else if (tuneState === "failed" && reported.current !== `failed:${gameId}`) {
      reported.current = `failed:${gameId}`;
      emitTv("profile_live_preview_failed", "profile", { gameId, mode: mode ?? null, reason: "unhealthy" });
    }
  }, [gameId, showBoard, live, seatOk, tuneState, mode]);

  // Not in a live game, or the watched game does not actually seat this player:
  // render nothing at all (never a false board, never a stray card).
  if (!gameId) return null;
  if (live && !seatOk) return null;

  const modeLabel = mode === "nerf" ? "Nerf" : mode === "buff" ? "Buff" : null;
  const modeColor = mode === "nerf" ? "text-mode-nerfGlow" : mode === "buff" ? "text-mode-buffGlow" : "";

  const seat = (color: Color) => {
    if (!players) return null;
    const p = players[color];
    return (
      <Link
        href={`/u/${encodeURIComponent(p.name)}`}
        className="group flex min-w-0 items-center gap-2 no-underline"
        title={`${p.name}'s profile`}
      >
        <PlayerAvatar name={p.name} avatar={p.avatar} size={22} />
        <span className="truncate font-display text-sm text-parchment-100 transition-colors group-hover:text-gold-leaf">
          {p.name}
          {p.rating != null && <span className="text-parchment-400"> ({p.rating})</span>}
        </span>
      </Link>
    );
  };

  return (
    <div className="mt-6 plate p-4" data-testid="current-game-card">
      <div className="flex items-center justify-between gap-2 pb-2">
        <span className="flex items-center gap-2 smallcaps text-[10px] text-verdigris-glow">
          <span className="h-2 w-2 rounded-full bg-verdigris-glow animate-flicker" />
          {over ? "Just finished" : "Playing right now"}
          {modeLabel && <span className={modeColor}>· {modeLabel}</span>}
        </span>
        <Link
          href={`/game/${gameId}`}
          className="smallcaps text-[10px] text-parchment-300 no-underline transition hover:text-gold-leaf"
        >
          {showBoard ? "Watch →" : "Open →"}
        </Link>
      </div>

      {showBoard ? (
        <>
          <div className="flex items-center justify-between gap-2 pb-1.5">{seat("b")}</div>
          <Link href={`/game/${gameId}`} className="block no-underline" title="Watch this game">
            <div className="overflow-hidden rounded-sm">
              <HeroBoard board={board} lastMove={lastMove} />
            </div>
          </Link>
          <div className="flex items-center justify-between gap-2 pt-1.5">{seat("w")}</div>
        </>
      ) : (
        // Temporarily unavailable (still tuning, or the bounded health check
        // failed): verified metadata + a Watch action that opens the full,
        // self-healing spectator view. Deliberately NOT a board.
        <Link
          href={`/game/${gameId}`}
          className="flex items-center justify-between gap-3 rounded-sm border border-white/10 px-3 py-3 no-underline transition hover:border-gold/40"
        >
          <span className="min-w-0 text-sm text-parchment-200">
            <span className="font-display text-parchment-100">{username}</span> is in a live{" "}
            {modeLabel ? `${modeLabel} ` : ""}game.
            <span className="block text-xs text-parchment-400">
              {tuneState === "failed"
                ? "The preview couldn't load right now. Open the game to watch."
                : "Tuning in…"}
            </span>
          </span>
          <span className="shrink-0 smallcaps text-[10px] text-gold-leaf">Watch →</span>
        </Link>
      )}
    </div>
  );
}
