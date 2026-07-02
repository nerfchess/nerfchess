"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { Board } from "@/components/Board";
import { cloneBoard, generateMoves, initialBoard, makeMove, moveToUCI } from "@/engine/board";
import { IMPLEMENTED_BY_ID } from "@/engine/nerfs/library";
import type { BoardState, Color, Move } from "@/engine/types";
import { MPGameSummary, MPSession, MPWatch } from "@/lib/multiplayer";

type EndResult = { winner: Color | "draw" | null; reason: string };

function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSec = Math.ceil(clamped / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTC(timeSec: number, incrementSec: number): string {
  if (!timeSec) return "Unlimited";
  const base = timeSec % 60 === 0 ? String(timeSec / 60) : (timeSec / 60).toFixed(1);
  return `${base}+${incrementSec}`;
}

// Replay a server move list onto a board. Moves were validated server-side, so
// matching against the unfiltered move generator is enough.
function applyUci(board: BoardState, uci: string): BoardState | null {
  const move = generateMoves(board).find((candidate) => moveToUCI(candidate) === uci);
  if (!move) return null;
  return makeMove(cloneBoard(board), move);
}

export default function WatchPage() {
  const [games, setGames] = useState<MPGameSummary[] | null>(null);
  const [watch, setWatch] = useState<MPWatch | null>(null);
  const [board, setBoard] = useState<BoardState | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [wc, setWc] = useState(0);
  const [bc, setBc] = useState(0);
  const [spectators, setSpectators] = useState(0);
  const [result, setResult] = useState<EndResult | null>(null);
  const [nerfs, setNerfs] = useState<Record<Color, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<MPSession | null>(null);
  const watchingRef = useRef(false);

  useEffect(() => {
    const sess = new MPSession();
    sessionRef.current = sess;
    sess.on((e) => {
      if (e.type === "games") {
        setGames(e.games);
      } else if (e.type === "watch") {
        watchingRef.current = true;
        let replayed = initialBoard();
        for (const uci of e.watch.moves) {
          const next = applyUci(replayed, uci);
          if (!next) break;
          replayed = next;
        }
        setWatch(e.watch);
        setBoard(replayed);
        setLastMove(replayed.history[replayed.history.length - 1] ?? null);
        setWc(e.watch.wc);
        setBc(e.watch.bc);
        setSpectators(e.watch.spectators);
        setResult(null);
        setNerfs(null);
        setError(null);
      } else if (e.type === "move") {
        setBoard((current) => {
          if (!current) return current;
          const next = applyUci(current, e.move.u);
          if (!next) return current;
          setLastMove(next.history[next.history.length - 1] ?? null);
          return next;
        });
        setWc(e.move.wc);
        setBc(e.move.bc);
      } else if (e.type === "spectators") {
        setSpectators(e.n);
      } else if (e.type === "end") {
        setResult(e.end.result);
        setWc(e.end.wc);
        setBc(e.end.bc);
        setNerfs(e.end.nerfs ?? null);
      } else if (e.type === "error") {
        setError(e.message);
      } else if (e.type === "disconnected") {
        setError("Disconnected from the game server.");
      }
    });
    sess.listGames().catch((err: unknown) => {
      setError(String((err as Error)?.message || err) || "Could not reach the game server.");
      setGames([]);
    });
    const interval = window.setInterval(() => {
      if (!watchingRef.current) sess.listGames().catch(() => {});
    }, 4000);
    return () => {
      window.clearInterval(interval);
      sess.destroy();
      sessionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick the active side's clock between server updates.
  useEffect(() => {
    if (!watch || !watch.timeSec || result || !board) return;
    const id = window.setInterval(() => {
      const dec = (t: number) => Math.max(0, t - 100);
      if (board.turn === "w") setWc(dec);
      else setBc(dec);
    }, 100);
    return () => window.clearInterval(id);
  }, [watch, result, board]);

  const handleWatch = (id: string) => {
    setError(null);
    sessionRef.current?.spectate(id).catch((err: unknown) => {
      setError(String((err as Error)?.message || err) || "Could not reach the game server.");
    });
  };

  const handleBack = () => {
    watchingRef.current = false;
    sessionRef.current?.leaveSpectate();
    setWatch(null);
    setBoard(null);
    setResult(null);
    setNerfs(null);
    sessionRef.current?.listGames().catch(() => {});
  };

  // -------- Watching a game --------
  if (watch && board) {
    const nerfName = (color: Color) =>
      nerfs ? IMPLEMENTED_BY_ID[nerfs[color]]?.name ?? "Unknown" : null;
    return (
      <main className="min-h-screen pb-10">
        <nav className="flex items-center justify-between px-5 sm:px-10 py-6">
          <Logo />
          <button onClick={handleBack} className="btn-ghost px-4 py-1.5 text-sm font-display">
            All games
          </button>
        </nav>
        <section className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="smallcaps text-[11px] text-parchment-400">
              Watching game {watch.id} · {formatTC(watch.timeSec, watch.incrementSec)}
            </div>
            <div className="flex items-center gap-1.5 smallcaps text-[11px] text-parchment-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {spectators} watching
            </div>
          </div>

          {result && (
            <div className="plate mb-3 border-gold/40 bg-gold/10 p-3 px-4">
              <div className="font-display text-parchment">
                {result.winner === "draw"
                  ? "Draw"
                  : result.winner === "w"
                  ? "White wins"
                  : "Black wins"}
                <span className="text-parchment-300"> · {result.reason}</span>
              </div>
              {nerfs && (
                <div className="mt-1 text-sm text-parchment-300">
                  White&apos;s rule: {nerfName("w")} · Black&apos;s rule: {nerfName("b")}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="w-[min(92vw,600px)] max-w-full">
              <Board
                board={board}
                legalMoves={[]}
                orientation="w"
                onMove={() => {}}
                myColor="w"
                lastMove={lastMove}
                disabled
              />
            </div>
            {watch.timeSec > 0 && (
              <div className="flex gap-3 sm:w-40 sm:flex-col">
                <SpectatorClock label="Black" ms={bc} active={!result && board.turn === "b"} />
                <SpectatorClock label="White" ms={wc} active={!result && board.turn === "w"} />
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-parchment-500">
            Both players' secret rules stay hidden until the game ends.
          </p>
        </section>
      </main>
    );
  }

  // -------- Game browser --------
  return (
    <main className="min-h-screen pb-16">
      <nav className="flex items-center justify-between px-5 sm:px-10 py-6 sm:py-7">
        <Logo />
        <div className="flex items-center gap-3 text-sm font-medium">
          <Link href="/play" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Play</Link>
          <Link href="/leaderboard" className="px-3 py-1.5 hover:bg-white/5 text-parchment-100">Leaderboard</Link>
        </div>
      </nav>

      <section className="mx-auto max-w-3xl px-6 py-4">
        <h1 className="font-display text-4xl font-bold text-parchment-100 sm:text-5xl">Watch live games</h1>
        <p className="mt-3 text-parchment-200">
          Browse the games being played right now and watch any of them live.
        </p>

        {error && (
          <div className="mt-5 plate p-3 px-4 border-oxblood-glow/60 bg-oxblood/15 text-parchment">
            {error}
          </div>
        )}

        <div className="mt-6 plate overflow-hidden">
          <div className="grid grid-cols-[1fr_5rem_5rem_5.5rem] items-center border-b border-white/8 px-4 py-3 smallcaps text-[10px] text-parchment-400">
            <span>Game</span>
            <span className="text-right">Time</span>
            <span className="text-right">Moves</span>
            <span className="text-right">Watching</span>
          </div>
          {games === null ? (
            <p className="px-4 py-6 text-sm text-parchment-400">Loading live games…</p>
          ) : games.length === 0 ? (
            <p className="px-4 py-6 text-sm text-parchment-400">
              No games are being played right now.{" "}
              <Link href="/friend" className="text-gold-leaf hover:underline">Start one</Link>{" "}
              and it will show up here.
            </p>
          ) : (
            games.map((g, i) => (
              <button
                key={g.id}
                onClick={() => handleWatch(g.id)}
                className={
                  "grid w-full grid-cols-[1fr_5rem_5rem_5.5rem] items-center border-b border-white/5 px-4 py-2.5 text-left text-sm transition hover:bg-white/[0.04] " +
                  (i % 2 ? "bg-white/[0.015]" : "")
                }
              >
                <span className="font-mono text-parchment-100">{g.id}</span>
                <span className="text-right font-mono text-parchment-300 tabular-nums">
                  {formatTC(g.timeSec, g.incrementSec)}
                </span>
                <span className="text-right font-mono text-parchment-300 tabular-nums">
                  {Math.ceil(g.moves / 2)}
                </span>
                <span className="text-right font-mono text-parchment-300 tabular-nums">{g.spectators}</span>
              </button>
            ))
          )}
        </div>
        <p className="mt-4 text-xs text-parchment-500">
          The list refreshes automatically. Spectator counts update live while you watch.
        </p>
      </section>
    </main>
  );
}

function SpectatorClock({ label, ms, active }: { label: string; ms: number; active: boolean }) {
  return (
    <div
      className={
        "plate flex flex-1 items-center justify-between gap-3 p-3 transition sm:flex-none " +
        (active ? "border-gold/60 bg-gold/10" : "opacity-60")
      }
    >
      <span className="smallcaps text-[10px] text-parchment-400">{label}</span>
      <span className="font-mono text-2xl font-bold tabular-nums text-parchment">{formatClock(ms)}</span>
    </div>
  );
}
