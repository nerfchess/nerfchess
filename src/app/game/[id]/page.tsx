"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Board } from "@/components/Board";
import { BoardPlayerRow } from "@/components/BoardPlayerRow";
import { BuffCard } from "@/components/BuffCard";
import { ClockPill } from "@/components/ClockPill";
import { MoveList } from "@/components/MoveList";
import { OnlineMatch } from "@/components/OnlineMatch";
import { moveToUCI } from "@/engine/board";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { NerfGame, legalMoves } from "@/engine/game";
import { Nerf } from "@/engine/nerf";
import { IMPLEMENTED_BY_ID } from "@/engine/nerfs/library";
import { Color } from "@/engine/types";
import {
  applyDraftAction,
  buildSpectatorDraftGame,
  draftZones,
  playReplicaMove,
} from "@/lib/draftOnline";
import { boardAtPly, replayUci } from "@/lib/gameReview";
import { timeControlLabel } from "@/lib/gameHistory";
import {
  clearActiveGame,
  clearOnlineSeat,
  loadOnlineSeat,
  MPPlayers,
  MPSession,
  MPSpectatorChatMessage,
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

function withResponseTimeout<T>(promise: Promise<T>, message: string, ms = 10000): Promise<T> {
  let timeoutId = 0;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

// Lichess-style game URL: the player who owns a seat token plays here; anyone
// else watches live, or gets the stored replay once the game has been archived.
export default function OnlineGamePage() {
  const params = useParams<{ id: string }>();
  const gameId = String(params.id ?? "").toUpperCase();
  const [mode, setMode] = useState<Mode>({ kind: "loading" });
  // Bumped whenever a reconnect replays the spectator state, so the viewer
  // remounts with the fresh payload.
  const [watchGen, setWatchGen] = useState(0);
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

    // Any watch payload (initial or after an automatic reconnect) refreshes
    // the spectator view with the server's replayed state.
    const offWatch = session.on((e) => {
      if (cancelled) return;
      if (e.type === "watch-start") {
        setWatchGen((g) => g + 1);
        setMode({ kind: "spectator", setup: e.setup });
      }
    });

    const spectate = async () => {
      try {
        await withResponseTimeout(session.watch(gameId), "watch_timeout", 15000);
      } catch (e) {
        if (e instanceof Error && e.message === "not_found") {
          session.destroy();
          await loadReplay();
        } else if (e instanceof Error && e.message === "watch_timeout") {
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
          setMode({ kind: "player", start: e.setup });
        } else if (e.type === "open") {
          setMode({ kind: "waiting" });
        }
      });
      // Resume the seat; transient connection failures retry with backoff,
      // and only a server-side refusal downgrades us to spectating.
      const tryResume = (attempt: number) => {
        withResponseTimeout(
          session.resume({ id: gameId, color: seat.color, token: seat.token }),
          "resume_timeout",
          9000,
        )
          .catch((err) => {
            if (cancelled) return;
            if (err instanceof Error && err.message === "reconnect_failed") {
              // Seat expired (game archived or gone) — fall back to watching.
              off();
              clearOnlineSeat(gameId);
              spectate();
              return;
            }
            if (attempt < 1) {
              window.setTimeout(() => {
                if (!cancelled) tryResume(attempt + 1);
              }, 1200);
            } else {
              off();
              spectate();
            }
          });
      };
      tryResume(0);
    } else {
      spectate();
    }

    return () => {
      cancelled = true;
      offWatch();
      session.destroy();
      sessionRef.current = null;
    };
  }, [gameId]);

  if (mode.kind === "player" && sessionRef.current) {
    return (
      <OnlineMatch
        session={sessionRef.current}
        start={mode.start}
        subtitle={
          mode.start.rated
            ? `rated ${timeControlLabel(mode.start.timeSec, mode.start.incrementSec)}`
            : `game ${gameId}`
        }
        onExit={() => {
          clearOnlineSeat(gameId);
          clearActiveGame(gameId);
          window.location.href = "/play";
        }}
      />
    );
  }

  if (mode.kind === "spectator" && sessionRef.current) {
    return <SpectatorView key={watchGen} session={sessionRef.current} setup={mode.setup} />;
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
  const [nerfs, setNerfs] = useState<Partial<Record<Color, string>> | null>(setup.nerfs ?? null);
  const [watchers, setWatchers] = useState(setup.watchers ?? 1);
  const [watcherNames, setWatcherNames] = useState<string[]>(setup.watcherNames ?? []);
  const [spectatorChat, setSpectatorChat] = useState<MPSpectatorChatMessage[]>(setup.spectatorChat ?? []);
  const [reconnecting, setReconnecting] = useState(false);
  const [historyPly, setHistoryPly] = useState<number | null>(null);
  // Draft games keep an engine replica so buff board mutations (summons,
  // removals) and zone effects render correctly. The wstart payload is
  // spectator-safe: held buffs and effects only, never pending offers.
  const isDraft = !!setup.draft;
  const draftGameRef = useRef<NerfGame | null>(null);
  const [draftGame, setDraftGame] = useState<NerfGame | null>(() => {
    if (!isDraft) return null;
    const game = buildSpectatorDraftGame(setup.moves, setup.dtActions ?? [], setup.dtState);
    draftGameRef.current = game;
    return game;
  });

  useEffect(() => {
    const off = session.on((e) => {
      if (e.type === "move") {
        setUciMoves((m) => (e.move.ply === m.length + 1 ? [...m, e.move.u] : m));
        setWhiteMs(e.move.wc);
        setBlackMs(e.move.bc);
        const g = draftGameRef.current;
        if (g && !g.result) {
          const move = legalMoves(g).find((candidate) => moveToUCI(candidate) === e.move.u);
          if (move) {
            const next = playReplicaMove(g, move);
            draftGameRef.current = next;
            setDraftGame({ ...next });
          }
        }
      } else if (e.type === "draft-resolved" || e.type === "draft-used") {
        const g = draftGameRef.current;
        if (g?.buffs) {
          applyDraftAction(
            g,
            e.type === "draft-used"
              ? {
                  ply: g.board.history.length,
                  color: e.used.color,
                  a: "use",
                  buffIndex: e.used.buffIndex,
                  picks: e.used.picks,
                }
              : e.resolved.kind === "picked"
                ? {
                    ply: g.board.history.length,
                    color: e.resolved.color,
                    a: "pick",
                    cards: e.resolved.cards ?? [],
                  }
                : { ply: g.board.history.length, color: e.resolved.color, a: "bank" },
          );
          setDraftGame({ ...g });
        }
      } else if (e.type === "end") {
        setResult(e.end.result);
        setWhiteMs(e.end.wc);
        setBlackMs(e.end.bc);
        if (e.end.nerfs) setNerfs(e.end.nerfs);
      } else if (e.type === "clocks") {
        setWhiteMs(e.wc);
        setBlackMs(e.bc);
      } else if (e.type === "takeback") {
        setUciMoves(e.moves);
        setWhiteMs(e.wc);
        setBlackMs(e.bc);
        setHistoryPly(null);
      } else if (e.type === "watchers") {
        setWatchers(e.n);
        if (e.names) setWatcherNames(e.names);
      } else if (e.type === "spectator-chat") {
        setSpectatorChat((msgs) => [...msgs, e.message].slice(-50));
      } else if (e.type === "rule-revealed") {
        // A player voluntarily showed their rule mid-game.
        setNerfs((prev) => ({ ...(prev ?? {}), [e.color]: e.nerfId }));
      } else if (e.type === "disconnected" || e.type === "reconnecting") {
        setReconnecting(true);
      } else if (e.type === "watch-start") {
        setReconnecting(false);
      }
    });
    return off;
  }, [session]);

  const replayed = useMemo(() => replayUci(uciMoves), [uciMoves]);
  // Draft boards can diverge from plain move replay (buffs mutate the board
  // outside move history), so the engine replica is authoritative there.
  const board = isDraft && draftGame ? draftGame.board : replayed.board;
  const history = isDraft && draftGame ? draftGame.board.history : replayed.history;
  const clockEnabled = setup.timeSec > 0;

  // Local clock tick between server updates. The side to move gets a 10s
  // grace before its first move, so hold the display still until then.
  useEffect(() => {
    if (!clockEnabled || result || !setup.started) return;
    const id = setInterval(() => {
      // Grace window: the side to move hasn't played yet (w before ply 1,
      // b before ply 2). Server clock frames stay authoritative regardless.
      if (board.turn === "w" && uciMoves.length === 0) return;
      if (board.turn === "b" && uciMoves.length === 1) return;
      const dec = (t: number) => Math.max(0, t - 100);
      if (board.turn === "w") setWhiteMs(dec);
      else setBlackMs(dec);
    }, 100);
    return () => clearInterval(id);
  }, [board.turn, clockEnabled, result, setup.started, uciMoves.length]);

  // Draft games disable history scrubbing: positions between buff mutations
  // cannot be rebuilt from the move list alone.
  const scrubbing = !isDraft;
  const currentPly = scrubbing ? historyPly ?? history.length : history.length;
  const displayBoard =
    !scrubbing || historyPly == null ? board : boardAtPly(history, historyPly);
  const lastMove = displayBoard.history[displayBoard.history.length - 1] ?? null;
  const zones = isDraft && draftGame ? draftZones(draftGame, "w") : null;

  return (
    <GameShell
      players={setup.players}
      rated={setup.rated}
      timeControl={timeControlLabel(setup.timeSec, setup.incrementSec)}
      board={displayBoard}
      lastMove={lastMove}
      history={history}
      currentPly={currentPly}
      onPlyChange={(ply) => {
        if (!scrubbing) return;
        setHistoryPly(ply >= history.length ? null : Math.max(0, ply));
      }}
      clockEnabled={clockEnabled}
      whiteMs={whiteMs}
      blackMs={blackMs}
      activeColor={result ? null : board.turn}
      statusLabel={
        (reconnecting
          ? "Reconnecting… · "
          : "") +
        (isDraft ? "Draft · " : "") +
        (result ? describeResult(result) : setup.started ? "Live game" : "Waiting for players") +
        (watchers > 0 ? ` · ${watchers} watching` : "")
      }
      nerfs={nerfs}
      visual={
        zones
          ? {
              bannedSquares: zones.barred,
              frozenSquares: zones.frozen,
              shieldedSquares: zones.shielded,
              wardSquares: zones.ward,
            }
          : undefined
      }
      rail={
        <div className="mt-3 space-y-3">
          {isDraft && draftGame && <SpectatorBuffsPanel game={draftGame} players={setup.players} />}
          <WatchersPanel count={watchers} names={watcherNames} />
          <SpectatorChat
            messages={spectatorChat}
            onSend={(text) => session.sendSpectatorChat(text)}
          />
        </div>
      }
    />
  );
}

// Held buffs are public in draft games, so spectators see both docks.
// Pending offers and reveal snapshots never reach this view.
function SpectatorBuffsPanel({ game, players }: { game: NerfGame; players: MPPlayers }) {
  const bs = game.buffs;
  if (!bs) return null;
  const side = (color: Color) => {
    const held = bs.players[color].buffs;
    return (
      <div>
        <div className="smallcaps text-[9px] text-parchment-400">
          {players[color].name} ({color === "w" ? "White" : "Black"})
        </div>
        {held.length === 0 ? (
          <p className="text-[11px] text-parchment-400">No buffs drafted yet.</p>
        ) : (
          <div className="mt-1 space-y-1">
            {held.map((inst, i) => {
              const def = BUFF_BY_ID[inst.id];
              if (!def) return null;
              return (
                <BuffCard
                  key={i}
                  buff={def}
                  tier={inst.tier}
                  compact
                  spent={inst.spent}
                  nullified={inst.nullified}
                  status={def.status?.(inst) ?? null}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="plate max-h-72 space-y-2 overflow-y-auto p-2 px-3">
      <div className="smallcaps text-[9px] text-parchment-400">Drafted buffs</div>
      {side("w")}
      {side("b")}
    </div>
  );
}

// Who is on the rail with you. Signed-in watchers by name; the rest counted.
function WatchersPanel({ count, names }: { count: number; names: string[] }) {
  const anonymous = Math.max(0, count - names.length);
  return (
    <div className="plate p-2 px-3">
      <div className="flex items-center justify-between">
        <span className="smallcaps text-[9px] text-parchment-400">Spectators</span>
        <span className="font-mono text-[11px] tabular-nums text-parchment-200">{count}</span>
      </div>
      {(names.length > 0 || anonymous > 0) && (
        <p className="mt-1 text-[11px] leading-snug text-parchment-300 break-words">
          {names.join(", ")}
          {anonymous > 0 && (
            <span className="text-parchment-400">
              {names.length > 0 ? " + " : ""}
              {anonymous} anonymous
            </span>
          )}
        </p>
      )}
    </div>
  );
}

// Chat between spectators only — the players never see this room.
function SpectatorChat({
  messages,
  onSend,
}: {
  messages: MPSpectatorChatMessage[];
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  return (
    <div className="plate flex h-56 flex-col p-2">
      <div className="shrink-0 px-1 pb-1 smallcaps text-[9px] text-parchment-400">
        Spectator chat
      </div>
      <div ref={listRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-1 text-[12px] leading-snug">
        {messages.length === 0 && (
          <div className="text-parchment-400/60">
            Chat with the other spectators. The players can&apos;t see this.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={`${m.at}-${i}`} className="break-words">
            <span className="font-display font-semibold text-bruise-glow">{m.name}</span>
            <span className="text-parchment-200"> {m.text}</span>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="mt-2 flex shrink-0 gap-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={200}
          placeholder="Message…"
          aria-label="Spectator chat message"
          className="min-w-0 flex-1 rounded-sm border border-white/15 bg-ink-900/60 px-2 py-1.5 text-base sm:text-[12px] text-parchment placeholder:text-parchment-400/40 focus:border-gold/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="btn-ghost shrink-0 rounded-sm px-2.5 py-1.5 font-display text-[11px] disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
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
      timeControl={timeControlLabel(game.time_sec, game.increment_sec)}
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
      <span className="text-xs leading-snug text-parchment-300">: {nerf.description}</span>
    </div>
  );
}

function GameShell({
  players,
  rated,
  timeControl,
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
  visual,
  rail,
}: {
  players: MPPlayers;
  rated: boolean;
  timeControl?: string;
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
  nerfs: Partial<Record<Color, string>> | null;
  // Draft spectating: public zone effects painted on the board.
  visual?: React.ComponentProps<typeof Board>["visual"];
  rail?: React.ReactNode;
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
            {rated ? `Rated ${timeControl ? `${timeControl} · ` : ""}` : ""}
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
                avatar={players.b.avatar}
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
                visual={visual}
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
                avatar={players.w.avatar}
                className="min-w-0 flex-1 !px-0 !py-1"
              />
              {clockEnabled && <ClockPill ms={whiteMs} active={activeColor === "w"} compact />}
            </div>
            {nerfs && (nerfs.w || nerfs.b) ? (
              <div className="mt-2 space-y-1.5">
                {nerfs.w ? (
                  <NerfLine label={`${players.w.name} (White)`} nerfId={nerfs.w} />
                ) : (
                  <div className="plate p-2 px-3 text-xs text-parchment-300">
                    {players.w.name} (White) keeps their rule secret until the end.
                  </div>
                )}
                {nerfs.b ? (
                  <NerfLine label={`${players.b.name} (Black)`} nerfId={nerfs.b} />
                ) : (
                  <div className="plate p-2 px-3 text-xs text-parchment-300">
                    {players.b.name} (Black) keeps their rule secret until the end.
                  </div>
                )}
              </div>
            ) : (
              <div className="plate mt-2 p-2 px-3 text-xs text-parchment-300">
                Both players have secret rules, revealed when the game ends.
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
            {rail}
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
