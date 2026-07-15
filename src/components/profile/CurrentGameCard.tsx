"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { HeroBoard } from "../HeroBoard";
import { PlayerAvatar } from "../PlayerAvatar";
import { PlayerLink } from "../PlayerLink";
import { formatClock } from "../ClockPill";
import { arenaSocketUrl, isArenaGameId } from "@/lib/arenaLobby";
import { MPPlayers, MPSession, type MPLobbyGame } from "@/lib/multiplayer";
import {
  appendFeaturedDraftAction,
  featuredBoard,
  featuredDraftFromWatchStart,
  FeaturedDraft,
  NOT_A_DRAFT,
  withFeaturedDraftState,
} from "@/lib/spectate/featuredBoard";
import { clockLabel } from "@/lib/tournaments";
import type { Color, Move } from "@/engine/types";
import type { DraftMode } from "@/engine/buff";

// "Playing right now": the profile's live-game plate. It streams the player's
// current game the exact way the landing hero (HeroTv) does — its own MPSession,
// watch(id), the featuredBoard engine reconstruction (so buff-card board
// rewrites reproduce faithfully), arena routing for OCI bot games, and full
// cleanup on unmount — but compact, sized for a profile column.
//
// The lobby game entry (MPLobbyGame) supplies the seed identity: seats, mode,
// time control, rated/casual, and watcher count. The live watch feed refines
// seats + clocks and, when the game ends mid-view, flips this module to "Final"
// in place (label swap, result text, replay link kept) and calls onEnded so the
// parent can swap in the recent-game module without a reload.
//
// Clocks: the spectator feed DOES carry clock data — the watch-start payload
// seeds wc/bc and every `move` frame carries fresh authoritative wc/bc — so a
// timed game shows live clocks (ticked locally between moves, re-synced on each
// move frame). Untimed games (timeSec 0) have no meaningful clock, so those show
// side to move + move number instead.
export function CurrentGameCard({
  username,
  game,
  onEnded,
}: {
  username: string;
  game: MPLobbyGame;
  onEnded?: () => void;
}) {
  const router = useRouter();
  const id = game.id;

  const [moves, setMoves] = useState<string[]>([]);
  const [players, setPlayers] = useState<MPPlayers | null>(null);
  const [over, setOver] = useState(false);
  const [result, setResult] = useState<{ winner: Color | "draw" | null; reason: string } | null>(null);
  const [draft, setDraft] = useState<FeaturedDraft>(NOT_A_DRAFT);
  // Authoritative clocks (ms), seeded from watch-start and refreshed on every
  // move / clocks frame; the per-seat MiniClock ticks these down locally.
  const [whiteMs, setWhiteMs] = useState<number | null>(null);
  const [blackMs, setBlackMs] = useState<number | null>(null);
  const [watchers, setWatchers] = useState<number | null>(game.watchers ?? null);
  // Watch feed mode (falls back the lobby entry's mode below).
  const [feedMode, setFeedMode] = useState<DraftMode | undefined>(game.mode);

  // Synchronous mirror of the accepted-move count so a live draft action is
  // tagged with the ply it fired at (the engine interleaves it there on
  // reconstruction) — same mechanism HeroTv uses.
  const movesLenRef = useRef(0);
  // onEnded must fire exactly once even though a result can arrive both on a
  // late watch-start (game already finished) and on the `end` frame.
  const endedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const session = new MPSession();
    session.persistFriendSession = false;
    // Arena-hosted (OCI bot-vs-bot) games stream from the arena's own socket;
    // the lobby snapshot that produced this id keeps the arena id cache warm, so
    // this check is synchronous — identical to HeroTv.
    if (isArenaGameId(id) && arenaSocketUrl()) session.serverUrl = arenaSocketUrl();

    const fireEnded = () => {
      if (endedRef.current) return;
      endedRef.current = true;
      onEnded?.();
    };

    const off = session.on((e) => {
      if (cancelled) return;
      if (e.type === "watch-start") {
        movesLenRef.current = e.setup.moves.length;
        setMoves(e.setup.moves);
        setPlayers(e.setup.players);
        setDraft(featuredDraftFromWatchStart(e.setup));
        if (e.setup.mode) setFeedMode(e.setup.mode);
        if (e.setup.timeSec > 0) {
          setWhiteMs(e.setup.wc);
          setBlackMs(e.setup.bc);
        }
        if (typeof e.setup.watchers === "number") setWatchers(e.setup.watchers);
        if (e.setup.result) {
          setOver(true);
          setResult(e.setup.result);
          fireEnded();
        }
      } else if (e.type === "move") {
        movesLenRef.current = e.move.ply;
        setMoves((m) => (e.move.ply === m.length + 1 ? [...m, e.move.u] : m));
        setWhiteMs(e.move.wc);
        setBlackMs(e.move.bc);
      } else if (e.type === "clocks") {
        setWhiteMs(e.wc);
        setBlackMs(e.bc);
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
      } else if (e.type === "watchers") {
        setWatchers(e.n);
      } else if (e.type === "end") {
        setOver(true);
        setResult(e.end.result);
        if (e.end.wc != null) setWhiteMs(e.end.wc);
        if (e.end.bc != null) setBlackMs(e.end.bc);
        fireEnded();
      }
    });

    session.watch(id).catch(() => {
      // Tune-in failed (game gone, stuck arena replica): leave seats null so the
      // module renders its quiet "connecting" state rather than a broken shell.
      if (!cancelled) setPlayers(null);
    });

    return () => {
      cancelled = true;
      off();
      session.destroy();
    };
    // onEnded intentionally excluded: a fresh callback identity must not tear
    // down and re-open the live socket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Warm the spectator route so "Watch live" / the card click navigate instantly.
  useEffect(() => {
    router.prefetch(`/game/${id}`);
  }, [id, router]);

  // Live reconstruction: draft games rebuild through the engine (board rewrites
  // reproduced), plain games replay the move list.
  const live = !!players;
  const { board, history } = useMemo(
    () => featuredBoard(live && draft.draft, moves, draft),
    [live, moves, draft],
  );
  const lastMove: Move | null = history[history.length - 1] ?? null;

  // Seats: the live watch payload is authoritative; before it lands, fall back
  // to the lobby entry so the seats never flash empty.
  const shownPlayers = players ?? game.players;
  const mode: DraftMode | undefined = game.mode ?? feedMode;
  const timed = game.timeSec > 0;

  const ratingClass =
    mode === "nerf" ? "text-mode-nerfGlow" : mode === "buff" ? "text-mode-buffGlow" : "text-parchment-400";

  // Side to move / move number, for the untimed caption and the live label.
  const sideToMove: Color = moves.length % 2 === 0 ? "w" : "b";
  const moveNumber = Math.floor(moves.length / 2) + 1;

  const winnerName =
    result && (result.winner === "w" || result.winner === "b")
      ? shownPlayers[result.winner]?.name ?? (result.winner === "w" ? "White" : "Black")
      : null;
  const resultText = result
    ? result.winner === "draw"
      ? "Draw"
      : winnerName
        ? `${winnerName} won`
        : "Game over"
    : null;

  const seat = (color: Color) => {
    const p = shownPlayers[color];
    const clockMs = color === "w" ? whiteMs : blackMs;
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
        {/* Live clock for timed games; ticks down for the side to move and
            re-syncs from each authoritative move/clocks frame. */}
        {timed && clockMs != null && (
          <MiniClock ms={clockMs} active={!over && sideToMove === color} />
        )}
      </div>
    );
  };

  const edgeClass = mode === "nerf" ? "bg-mode-nerfGlow" : mode === "buff" ? "bg-mode-buffGlow" : "bg-gold";

  return (
    <div className="relative plate overflow-hidden border-gold/30 p-4">
      {/* Gilt mode-colored edge accent down the left rim. */}
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${edgeClass}`} />

      {/* Stretched primary link: the whole card navigates to the spectator view.
          It is a SIBLING of the inner PlayerLink / Watch-live anchors (all raised
          above it with z-10), so no anchors nest. */}
      <Link
        href={`/game/${id}`}
        aria-label={over ? "Open this finished game" : `Watch ${username}'s live game`}
        className="absolute inset-0 z-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
      />

      <div className="relative z-10 flex items-center justify-between gap-2 pointer-events-none">
        <span className="flex items-center gap-2 smallcaps text-[10px]">
          {over ? (
            <span className="text-parchment-300">Final</span>
          ) : (
            <>
              <span aria-hidden className="dot-live h-2 w-2 rounded-full bg-oxblood-glow" />
              <span className="text-oxblood-glow">Playing right now</span>
            </>
          )}
          {mode ? (
            <span className={mode === "nerf" ? "text-mode-nerfGlow" : "text-mode-buffGlow"}>
              · {mode === "nerf" ? "Nerf" : "Buff"}
            </span>
          ) : null}
        </span>
        <span className="flex items-center gap-2 smallcaps text-[10px] text-parchment-400">
          <span>{game.rated ? "Rated" : "Casual"}</span>
          <span aria-hidden>·</span>
          <span className="font-mono">{clockLabel(game.timeSec, game.incrementSec)}</span>
        </span>
      </div>

      <div className="relative z-10 mt-3 flex flex-col gap-2">
        {/* Black seat on top (board is white-at-bottom), then board, then white. */}
        {seat("b")}
        <div className="pointer-events-none mx-auto w-full max-w-[300px]">
          <HeroBoard board={board} lastMove={lastMove} />
        </div>
        {seat("w")}
      </div>

      <div className="relative z-10 mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="smallcaps text-[10px] text-parchment-400">
          {over ? (
            resultText ? (
              <span className={result?.winner === "draw" ? "text-bruise-glow" : "text-gold-leaf"}>
                {resultText}
                {result?.reason ? <span className="text-parchment-400"> · {result.reason}</span> : null}
              </span>
            ) : (
              <span className="text-parchment-300">Game over</span>
            )
          ) : (
            <span>
              {sideToMove === "w" ? "White" : "Black"} to move · move {moveNumber}
              {watchers != null && watchers > 0 ? (
                <span className="text-parchment-500"> · {watchers} watching</span>
              ) : null}
            </span>
          )}
        </span>
        <Link
          href={`/game/${id}`}
          className="relative z-10 btn-leaf inline-flex min-h-[44px] items-center px-4 font-display text-sm font-semibold"
        >
          {over ? "View replay" : "Watch live"}
        </Link>
      </div>
    </div>
  );
}

// A compact live clock: shows authoritative `ms`, and while `active` ticks it
// down locally from a performance.now anchor, snapping back whenever a fresh
// authoritative value arrives. A lighter sibling of ClockPill (no sounds, no
// grace timer) for the spectator context, reusing its formatClock output.
function MiniClock({ ms, active }: { ms: number; active: boolean }) {
  const [display, setDisplay] = useState(ms);
  // Snap the display to a new authoritative value during render (React's
  // sanctioned adjust-on-prop-change), leaving the effect to run the tick loop.
  const [sync, setSync] = useState(ms);
  if (sync !== ms) {
    setSync(ms);
    setDisplay(ms);
  }

  useEffect(() => {
    if (!active) {
      // Resync the display to the authoritative value whenever the clock stops
      // ticking (opponent's move, game over). A deliberate reset, not a cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplay(ms);
      return;
    }
    const startedAt = performance.now();
    let timer = 0;
    const tick = () => {
      const remaining = Math.max(0, ms - (performance.now() - startedAt));
      setDisplay(remaining);
      timer = window.setTimeout(tick, remaining < 10000 ? 100 : 250);
    };
    timer = window.setTimeout(tick, 100);
    return () => window.clearTimeout(timer);
  }, [ms, active]);

  const low = display < 30000;
  return (
    <span
      className={
        "shrink-0 font-mono text-sm tabular-nums " +
        (active ? (low ? "text-oxblood-glow" : "text-parchment-100") : "text-parchment-400")
      }
    >
      {formatClock(display)}
    </span>
  );
}
