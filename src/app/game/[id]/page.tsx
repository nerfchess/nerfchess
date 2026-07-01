"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Board } from "@/components/Board";
import { BoardPlayerRow } from "@/components/BoardPlayerRow";
import { ClockPill } from "@/components/ClockPill";
import { MoveList } from "@/components/MoveList";
import { OnlineMatch } from "@/components/OnlineMatch";
import { Nerf } from "@/engine/nerf";
import { IMPLEMENTED_BY_ID } from "@/engine/nerfs/library";
import { Color } from "@/engine/types";
import { boardAtPly, replayUci } from "@/lib/gameReview";
import {
  clearOnlineSeat,
  loadOnlineSeat,
  MPPlayers,
  MPSession,
  MPStart,
  MPWatchStart,
} from "@/lib/multiplayer";

type Mode =
  | { kind: "loading" }
  | { kind: "waiting" } // seated, opponent hasn't arrived yet
  | { kind: "player"; start: MPStart }
  | { kind: "spectator"; setup: MPWatchStart }
  | { kind: "replay"; game: ReplayGame }
  | { kind: "missing" }
  | { kind: "error"; message: string };

interface ReplayGame {
  id: string;
  white_name: string;
  black_name: string;
  white_nerf_id: string;
  black_nerf_id: string;
  time_sec: number;
  increment_sec: number;
  moves: string;
  winner: Color | "draw" | null;
  reason: string;
  rated: number;
  white_rating_before: number | null;
  white_rating_after: number | null;
  black_rating_before: number | null;
  black_rating_after: number | null;
  completed_at: number;
}

// Lichess-style game URL: the player who owns a seat token plays here; anyone
// else watches live, or gets the stored replay once the game has been archived.
export default function OnlineGamePage() {
  const params = useParams<{ id: string }>();
  const gameId = String(params.id ?? "").toUpperCase();
  const [mode, setMode] = useState<Mode>({ kind: "loading" });
  const sessionRef = useRef<MPSession | null>(null);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    const session = new MPSession();
    session.persistFriendSession = false;
    sessionRef.current = session;

    const loadReplay = async () => {
      try {
        const res = await fetch(`/api/games/${gameId}`);
        if (res.ok) {
          const data = (await res.json()) as { game: ReplayGame };
          if (!cancelled) setMode({ kind: "replay", game: data.game });
          return;
        }
      } catch {}
      if (!cancelled) setMode({ kind: "missing" });
    };

    const spectate = async () => {
      try {
        const setup = await session.watch(gameId);
        if (!cancelled) setMode({ kind: "spectator", setup });
      } catch (e) {
        session.destroy();
        if (e instanceof Error && e.message === "not_found") {
          await loadReplay();
        } else if (!cancelled) {
          setMode({ kind: "error", message: e instanceof Error ? e.message : String(e) });
        }
      }
    };

    const seat = loadOnlineSeat(gameId);
    if (seat) {
      const off = session.on((e) => {
        if (cancelled) return;
        if (e.type === "start") {
          off();
          setMode({ kind: "player", start: e.setup });
        } else if (e.type === "open") {
          setMode({ kind: "waiting" });
        }
      });
      session
        .resume({ id: gameId, color: seat.color, token: seat.token })
        .catch(() => {
          if (cancelled) return;
          // Seat expired (game archived or gone) — fall back to watching.
          off();
          clearOnlineSeat(gameId);
          spectate();
        });
    } else {
      spectate();
    }

    return () => {
      cancelled = true;
      session.destroy();
      sessionRef.current = null;
    };
  }, [gameId]);

  if (mode.kind === "player" && sessionRef.current) {
    return (
      <OnlineMatch
        session={sessionRef.current}
        start={mode.start}
        subtitle={mode.start.rated ? "rated 3+2" : `game ${gameId}`}
        onExit={() => {
          clearOnlineSeat(gameId);
          window.location.href = "/play";
        }}
      />
    );
  }

  if (mode.kind === "spectator" && sessionRef.current) {
    return <SpectatorView session={sessionRef.current} setup={mode.setup} />;
  }

  if (mode.kind === "replay") {
    return <ReplayView game={mode.game} />;
  }

  return (
    <main className="min-h-screen">
      <SiteNav />
      <section className="max-w-xl mx-auto px-6 py-16 text-center">
        {mode.kind === "loading" || mode.kind === "waiting" ? (
          <>
            <div className="smallcaps text-[11px] text-parchment-400">
              {mode.kind === "waiting" ? "Waiting for your opponent…" : "Connecting…"}
            </div>
            <div className="mt-3 font-mono text-4xl tracking-[0.2em] text-gold-leaf">{gameId}</div>
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl">Game not found</h1>
            <p className="mt-3 text-parchment-200">
              {mode.kind === "error"
                ? mode.message
                : "This game doesn't exist, or it hasn't been played yet."}
            </p>
            <Link href="/play" className="inline-block mt-8 px-5 py-2 rounded-sm btn-leaf font-body">
              Play a game
            </Link>
          </>
        )}
      </section>
    </main>
  );
}

// ---------------- live spectator ----------------

function SpectatorView({ session, setup }: { session: MPSession; setup: MPWatchStart }) {
  const [uciMoves, setUciMoves] = useState<string[]>(setup.moves);
  const [whiteMs, setWhiteMs] = useState(setup.wc);
  const [blackMs, setBlackMs] = useState(setup.bc);
  const [result, setResult] = useState(setup.result);
  const [nerfs, setNerfs] = useState(setup.nerfs ?? null);
  const [historyPly, setHistoryPly] = useState<number | null>(null);

  useEffect(() => {
    const off = session.on((e) => {
      if (e.type === "move") {
        setUciMoves((m) => (e.move.ply === m.length + 1 ? [...m, e.move.u] : m));
        setWhiteMs(e.move.wc);
        setBlackMs(e.move.bc);
      } else if (e.type === "end") {
        setResult(e.end.result);
        setWhiteMs(e.end.wc);
        setBlackMs(e.end.bc);
        if (e.end.nerfs) setNerfs(e.end.nerfs);
      } else if (e.type === "clocks") {
        setWhiteMs(e.wc);
        setBlackMs(e.bc);
      }
    });
    return off;
  }, [session]);

  const { board, history } = useMemo(() => replayUci(uciMoves), [uciMoves]);
  const clockEnabled = setup.timeSec > 0;

  // Local clock tick between server updates.
  useEffect(() => {
    if (!clockEnabled || result || !setup.started) return;
    const id = setInterval(() => {
      const dec = (t: number) => Math.max(0, t - 100);
      if (board.turn === "w") setWhiteMs(dec);
      else setBlackMs(dec);
    }, 100);
    return () => clearInterval(id);
  }, [board.turn, clockEnabled, result, setup.started]);

  const currentPly = historyPly ?? history.length;
  const displayBoard = historyPly == null ? board : boardAtPly(history, historyPly);
  const lastMove = displayBoard.history[displayBoard.history.length - 1] ?? null;

  return (
    <GameShell
      players={setup.players}
      rated={setup.rated}
      board={displayBoard}
      lastMove={lastMove}
      history={history}
      currentPly={currentPly}
      onPlyChange={(ply) => setHistoryPly(ply >= history.length ? null : Math.max(0, ply))}
      clockEnabled={clockEnabled}
      whiteMs={whiteMs}
      blackMs={blackMs}
      activeColor={result ? null : board.turn}
      statusLabel={result ? describeResult(result) : setup.started ? "Live game" : "Waiting for players"}
      nerfs={nerfs}
    />
  );
}

// ---------------- archived replay ----------------

function ReplayView({ game }: { game: ReplayGame }) {
  const uciMoves = useMemo(() => (game.moves ? game.moves.split(" ").filter(Boolean) : []), [game.moves]);
  const { history } = useMemo(() => replayUci(uciMoves), [uciMoves]);
  const [historyPly, setHistoryPly] = useState<number>(history.length);
  const displayBoard = useMemo(() => boardAtPly(history, historyPly), [history, historyPly]);
  const lastMove = displayBoard.history[displayBoard.history.length - 1] ?? null;

  const players: MPPlayers = {
    w: { name: game.white_name, rating: game.white_rating_before ? Math.round(game.white_rating_before) : null },
    b: { name: game.black_name, rating: game.black_rating_before ? Math.round(game.black_rating_before) : null },
  };

  return (
    <GameShell
      players={players}
      rated={!!game.rated}
      board={displayBoard}
      lastMove={lastMove}
      history={history}
      currentPly={historyPly}
      onPlyChange={(ply) => setHistoryPly(Math.max(0, Math.min(ply, history.length)))}
      clockEnabled={false}
      whiteMs={0}
      blackMs={0}
      activeColor={null}
      statusLabel={describeResult({ winner: game.winner, reason: game.reason })}
      nerfs={{ w: game.white_nerf_id, b: game.black_nerf_id }}
    />
  );
}

// ---------------- shared read-only layout ----------------

function describeResult(result: { winner: Color | "draw" | null; reason: string }): string {
  const head =
    result.winner === "draw" ? "Draw" : result.winner === "w" ? "White wins" : result.winner === "b" ? "Black wins" : "Over";
  return `${head} · ${result.reason}`;
}

function NerfLine({ label, nerfId }: { label: string; nerfId: string }) {
  const nerf: Nerf | undefined = IMPLEMENTED_BY_ID[nerfId];
  if (!nerf) return null;
  return (
    <div className="plate p-2 px-3">
      <span className="smallcaps text-[10px] text-parchment-400">{label} </span>
      <span className={`font-display text-sm font-semibold tier-${nerf.tier}`}>{nerf.name}</span>
      <span className="text-xs leading-snug text-parchment-300"> — {nerf.description}</span>
    </div>
  );
}

function GameShell({
  players,
  rated,
  board,
  lastMove,
  history,
  currentPly,
  onPlyChange,
  clockEnabled,
  whiteMs,
  blackMs,
  activeColor,
  statusLabel,
  nerfs,
}: {
  players: MPPlayers;
  rated: boolean;
  board: ReturnType<typeof replayUci>["board"];
  lastMove: ReturnType<typeof replayUci>["history"][number] | null;
  history: ReturnType<typeof replayUci>["history"];
  currentPly: number;
  onPlyChange: (ply: number) => void;
  clockEnabled: boolean;
  whiteMs: number;
  blackMs: number;
  activeColor: Color | null;
  statusLabel: string;
  nerfs: Record<Color, string> | null;
}) {
  const nameOf = (color: Color) => {
    const p = players[color];
    return p.rating != null ? `${p.name} (${p.rating})` : p.name;
  };

  return (
    <main className="min-h-screen">
      <SiteNav />
      <div className="mx-auto w-full max-w-[1100px] px-3 pb-10 sm:px-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="smallcaps text-[11px] text-parchment-400">
            {rated ? "Rated 3+2 · " : ""}
            {statusLabel}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <BoardPlayerRow
                board={board}
                playerColor="b"
                myColor="w"
                name={nameOf("b")}
                className="min-w-0 flex-1 !px-0 !py-1"
              />
              {clockEnabled && <ClockPill ms={blackMs} active={activeColor === "b"} compact />}
            </div>
            <div className="w-full max-w-[720px]">
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
            <div className="flex items-center justify-between gap-2">
              <BoardPlayerRow
                board={board}
                playerColor="w"
                myColor="w"
                name={nameOf("w")}
                className="min-w-0 flex-1 !px-0 !py-1"
              />
              {clockEnabled && <ClockPill ms={whiteMs} active={activeColor === "w"} compact />}
            </div>
            {nerfs ? (
              <div className="mt-2 space-y-1.5">
                <NerfLine label={`${players.w.name} (White)`} nerfId={nerfs.w} />
                <NerfLine label={`${players.b.name} (Black)`} nerfId={nerfs.b} />
              </div>
            ) : (
              <div className="plate mt-2 p-2 px-3 text-xs text-parchment-300">
                Both players have secret rules — revealed when the game ends.
              </div>
            )}
          </div>
          <div className="sm:w-56 sm:shrink-0">
            <MoveList
              moves={history}
              currentPly={currentPly}
              onPlyChange={onPlyChange}
              compact
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function SiteNav() {
  return (
    <nav className="flex items-center justify-between px-5 sm:px-10 py-5">
      <Link href="/" className="font-display text-2xl tracking-tight">
        nerf<span className="text-gold-leaf">chess</span>
      </Link>
      <Link href="/play" className="px-3 py-1.5 rounded-full text-sm font-display hover:bg-white/5 text-parchment">
        Play
      </Link>
    </nav>
  );
}
