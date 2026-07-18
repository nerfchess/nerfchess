"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { HeroBoard } from "../HeroBoard";
import { PlayerAvatar } from "../PlayerAvatar";
import { PlayerLink } from "../PlayerLink";
import { type MPLobbyGame } from "@/lib/multiplayer";
import { featuredBoard } from "@/lib/spectate/featuredBoard";
import { useFeaturedTune } from "@/lib/spectate/useFeaturedTune";
import { emitTv } from "@/lib/telemetry/tv";
import { clockLabel } from "@/lib/tournaments";
import type { Color, Move } from "@/engine/types";
import type { DraftMode } from "@/engine/buff";

// "Playing right now": the profile's live-game plate. It is a THIN wrapper over
// the exact same featured-tune pipeline the TV surfaces use (useFeaturedTune ->
// featuredBoard -> HeroBoard), pointed at the single game id the profile API
// resolved from the authoritative live-seat index (with the lobby feed as the
// fallback signal). It therefore inherits the pipeline's snapshot validation,
// health-checked bounded backoff, and ordered event sync, and it can NEVER
// paint a false starting board:
//   - The mini-board renders only when the watch is genuinely live AND the
//     profiled player actually occupies a seat in the watch-start players
//     payload (the stale-index guard).
//   - While the tune is still connecting, or after it failed its bounded health
//     check, it shows verified metadata plus a Watch action that opens the
//     full, self-healing spectator view - deliberately NOT a board.
//   - A live watch that seats someone else means the id was stale: render
//     nothing rather than someone else's board.
//
// The optional lobby game entry (MPLobbyGame) supplies presentation metadata
// the tune does not carry: time control, rated/casual, and the watcher count.
// When the game ends mid-view the module flips to "Final" in place (label swap,
// replay link kept) and fires onEnded once so the parent can swap in the
// recent-game module without a reload.
export function CurrentGameCard({
  username,
  gameId,
  mode,
  game,
  onEnded,
}: {
  username: string;
  gameId: string;
  /** The game's section from the profile payload (falls back to the lobby entry). */
  mode?: DraftMode | null;
  /** The lobby feed's entry for this game, when available (metadata only). */
  game?: MPLobbyGame | null;
  onEnded?: () => void;
}) {
  const router = useRouter();

  // Single-candidate tune: the profile card follows exactly one known game, so
  // it passes that id as both the sole candidate and the pin. The hook still
  // runs the identical health check + bounded backoff; there is simply nothing
  // to fail over TO, which the card surfaces as its metadata fallback.
  const candidates = useMemo(() => [gameId], [gameId]);
  const tune = useFeaturedTune(candidates, gameId, `profile:${username}:${gameId}`, {
    surface: "profile",
    filter: mode ?? "unknown",
  });
  const { live, players, moves, draft, over, tuneState } = tune;

  // Seat guard: the live index (or the lobby feed) can lag by a poll, so
  // confirm the watch-start players payload really seats this player before
  // trusting the stream. A mismatch means the id was stale; render nothing
  // rather than someone else's board.
  const seatOk =
    !!players &&
    (players.w.name.toLowerCase() === username.toLowerCase() ||
      players.b.name.toLowerCase() === username.toLowerCase());

  const showBoard = live && seatOk;

  // onEnded must fire exactly once even though `over` can flip on a late
  // watch-start (game already finished) or the live end frame.
  const endedRef = useRef(false);
  useEffect(() => {
    endedRef.current = false;
  }, [gameId]);
  useEffect(() => {
    if (!over || endedRef.current) return;
    endedRef.current = true;
    onEnded?.();
    // onEnded intentionally excluded: a fresh callback identity must not
    // re-fire the one-shot end notification.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over]);

  // Report the live-preview OUTCOME exactly once per game. The tune hook
  // already emits tv_tune_started / _succeeded / _failed for the "profile"
  // surface; the card adds the profile-specific verdict (a seated live board,
  // a stale-seat drop, or a failed health check).
  const reported = useRef<string | null>(null);
  useEffect(() => {
    reported.current = null;
  }, [gameId]);
  useEffect(() => {
    if (showBoard) {
      if (reported.current !== `ok:${gameId}`) {
        reported.current = `ok:${gameId}`;
        emitTv("profile_live_preview_succeeded", "profile", { gameId, mode: mode ?? null });
      }
      return;
    }
    if (live && !seatOk && reported.current !== `noseat:${gameId}`) {
      reported.current = `noseat:${gameId}`;
      emitTv("profile_live_preview_failed", "profile", { gameId, mode: mode ?? null, reason: "no_seat" });
    } else if (tuneState === "failed" && reported.current !== `failed:${gameId}`) {
      reported.current = `failed:${gameId}`;
      emitTv("profile_live_preview_failed", "profile", { gameId, mode: mode ?? null, reason: "unhealthy" });
    }
  }, [gameId, showBoard, live, seatOk, tuneState, mode]);

  // Warm the spectator route so "Watch live" / the card click navigate instantly.
  useEffect(() => {
    router.prefetch(`/game/${gameId}`);
  }, [gameId, router]);

  // Live reconstruction: draft games rebuild through the engine (board rewrites
  // reproduced), plain games replay the move list. Board state is only built
  // while genuinely live + seated, so a stale/unhealthy id shows no position.
  const { board, history } = useMemo(
    () => featuredBoard(showBoard, showBoard ? moves : [], draft),
    [showBoard, moves, draft],
  );
  const lastMove: Move | null = history[history.length - 1] ?? null;

  // The watched game seats someone else: stale id, render nothing at all
  // (never a false board, never a stray card).
  if (live && !seatOk) return null;

  // Seats: the live watch payload is authoritative; before it lands, fall back
  // to the lobby entry so the seats never flash empty.
  const shownPlayers = players ?? game?.players ?? null;
  const shownMode: DraftMode | undefined = mode ?? game?.mode;
  const timed = game ? game.timeSec > 0 : false;
  const watchers = game?.watchers ?? null;

  const ratingClass =
    shownMode === "nerf"
      ? "text-mode-nerfGlow"
      : shownMode === "buff"
        ? "text-mode-buffGlow"
        : "text-parchment-400";

  // Side to move / move number, for the live caption.
  const sideToMove: Color = moves.length % 2 === 0 ? "w" : "b";
  const moveNumber = Math.floor(moves.length / 2) + 1;

  const seat = (color: Color) => {
    const p = shownPlayers?.[color];
    if (!p) return null;
    return (
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <PlayerAvatar name={p.name} avatar={p.avatar} size={24} />
          <span className="flex min-w-0 items-baseline gap-1.5">
            <PlayerLink
              name={p.name}
              className="relative z-10 truncate font-display text-[15px] text-parchment-100"
            />
            {p.rating != null && (
              <span className={`font-mono text-xs tabular-nums ${ratingClass}`}>({p.rating})</span>
            )}
          </span>
        </span>
      </div>
    );
  };

  const edgeClass =
    shownMode === "nerf" ? "bg-mode-nerfGlow" : shownMode === "buff" ? "bg-mode-buffGlow" : "bg-gold";

  return (
    <div
      className="relative plate overflow-hidden border-gold/30 p-4"
      data-testid="current-game-card"
    >
      {/* Gilt mode-colored edge accent down the left rim. */}
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${edgeClass}`} />

      {/* Stretched primary link: the whole card navigates to the spectator view.
          It is a SIBLING of the inner PlayerLink / Watch-live anchors (all raised
          above it with z-10), so no anchors nest. */}
      <Link
        href={`/game/${gameId}`}
        aria-label={over ? "Open this finished game" : `Watch ${username}'s live game`}
        className="absolute inset-0 z-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
      />

      <div className="relative z-10 flex items-center justify-between gap-2 pointer-events-none">
        <span className="flex items-center gap-2 smallcaps text-[12px]">
          {over ? (
            <span className="text-parchment-300">Final</span>
          ) : (
            <>
              <span aria-hidden className="dot-live h-2 w-2 rounded-full bg-verdigris-glow" />
              <span className="text-verdigris-glow">Playing right now</span>
            </>
          )}
          {shownMode ? (
            <span className={shownMode === "nerf" ? "text-mode-nerfGlow" : "text-mode-buffGlow"}>
              · {shownMode === "nerf" ? "Nerf" : "Buff"}
            </span>
          ) : null}
        </span>
        {game && (
          <span className="flex items-center gap-2 smallcaps text-[12px] text-parchment-400">
            <span>{game.rated ? "Rated" : "Casual"}</span>
            {timed && (
              <>
                <span aria-hidden>·</span>
                <span className="font-mono">{clockLabel(game.timeSec, game.incrementSec)}</span>
              </>
            )}
          </span>
        )}
      </div>

      {showBoard ? (
        <>
          <div className="relative z-10 mt-3 flex flex-col gap-2">
            {/* Black seat on top (board is white-at-bottom), then board, then white. */}
            {seat("b")}
            <div className="pointer-events-none mx-auto w-full max-w-[300px]" data-board-grid>
              <HeroBoard board={board} lastMove={lastMove} />
            </div>
            {seat("w")}
          </div>

          <div className="relative z-10 mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="smallcaps text-[12px] text-parchment-400">
              {over ? (
                <span className="text-parchment-300">Game over</span>
              ) : (
                <span>
                  {sideToMove === "w" ? "White" : "Black"} to move · move {moveNumber}
                  {watchers != null && watchers > 0 ? (
                    <span className="text-parchment-400"> · {watchers} watching</span>
                  ) : null}
                </span>
              )}
            </span>
            <Link
              href={`/game/${gameId}`}
              className="relative z-10 btn-leaf inline-flex min-h-[44px] items-center px-4 font-display text-sm font-semibold"
            >
              {over ? "View replay" : "Watch live"}
            </Link>
          </div>
        </>
      ) : (
        // Temporarily unavailable (still tuning, or the bounded health check
        // failed): verified metadata plus a Watch action that opens the full,
        // self-healing spectator view. Deliberately NOT a board.
        <div className="relative z-10 mt-3 flex items-center justify-between gap-3 rounded-sm border border-white/10 px-3 py-3">
          <span className="min-w-0 text-sm text-parchment-200">
            <span className="font-display text-parchment-100">{username}</span> is in a live{" "}
            {shownMode ? `${shownMode === "nerf" ? "Nerf" : "Buff"} ` : ""}game.
            <span className="block text-xs text-parchment-400">
              {tuneState === "failed"
                ? "The preview could not load right now. Open the game to watch."
                : "Tuning in..."}
            </span>
          </span>
          <Link
            href={`/game/${gameId}`}
            className="relative z-10 btn-leaf inline-flex min-h-[44px] shrink-0 items-center px-4 font-display text-sm font-semibold"
          >
            Watch live
          </Link>
        </div>
      )}
    </div>
  );
}
