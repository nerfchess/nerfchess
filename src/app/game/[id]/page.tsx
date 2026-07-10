"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Board } from "@/components/Board";
import { BoardPlayerRow } from "@/components/BoardPlayerRow";
import { ClockPill } from "@/components/ClockPill";
import { GameOver } from "@/components/GameOver";
import { MoveList } from "@/components/MoveList";
import { OnlineMatch } from "@/components/OnlineMatch";
import { moveFromUCI, moveToUCI } from "@/engine/board";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { NerfGame, legalMoves } from "@/engine/game";
import { Nerf } from "@/engine/nerf";
import { IMPLEMENTED_BY_ID } from "@/engine/nerfs/library";
import { Color } from "@/engine/types";
import {
  applyDraftAction,
  buildSpectatorDraftGame,
  draftZones,
  mergeDraftState,
  playReplicaMove,
  revealHeldBuffs,
} from "@/lib/draftOnline";
import { TIER_ROMAN } from "@/lib/tiers";
import { boardAtPly, replayUci } from "@/lib/gameReview";
import { timeControlLabel } from "@/lib/gameHistory";
import { gameToPGN } from "@/lib/pgn";
import {
  clearActiveGame,
  clearOnlineSeat,
  loadOnlineSeat,
  loadSavedFriendSession,
  MPPlayers,
  MPSession,
  MPSpectatorChatMessage,
  MPStart,
  MPWatchStart,
  saveOnlineSeat,
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
  started_at: number;
  completed_at: number;
}

function withResponseTimeout<T>(promise: Promise<T>, message: string, ms = 10000): Promise<T> {
  let timeoutId = 0;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

// How long a viewer lingers on the "this game is over" screen before being
// eased back to the lobby automatically.
const REDIRECT_SECONDS = 6;

// Lichess-style game URL: the player who owns a seat token plays here; anyone
// else watches live, or gets the stored replay once the game has been archived.
export default function OnlineGamePage() {
  const params = useParams<{ id: string }>();
  const gameId = String(params.id ?? "").toUpperCase();
  const [mode, setMode] = useState<Mode>({ kind: "loading" });
  // Bumped whenever a reconnect replays the spectator state, so the viewer
  // remounts with the fresh payload.
  const [watchGen, setWatchGen] = useState(0);
  // Seconds left before a viewer stranded on a game that has ended / gone dark
  // is eased back to the lobby (see the `missing` effect + view below).
  const [redirectIn, setRedirectIn] = useState(REDIRECT_SECONDS);
  const sessionRef = useRef<MPSession | null>(null);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;
    const session = new MPSession();
    session.persistFriendSession = false;
    sessionRef.current = session;

    // Fetch the archived game once, returning it (or null if it is not stored).
    // Kept separate from rendering so the request can be kicked off in parallel
    // with the live-watch attempt and awaited later.
    const fetchReplay = async (): Promise<ReplayGame | null> => {
      try {
        const res = await fetch(`/api/games/${gameId}`);
        if (res.ok) return ((await res.json()) as { game: ReplayGame }).game ?? null;
      } catch {}
      return null;
    };

    // Render the stored replay, reusing a fetch already in flight when one was
    // started in parallel with the watch attempt.
    const showReplay = async (pending?: Promise<ReplayGame | null>) => {
      let game = await (pending ?? fetchReplay());
      if (cancelled) return;
      // A game that has only just ended (the common reason a live watch drops
      // to "not_found") may not be archived for a second or two. Rather than
      // flash "not found" at the viewer, give the write a brief beat and look
      // once more before deciding the game is truly gone.
      if (!game) {
        await new Promise((r) => window.setTimeout(r, 2500));
        if (cancelled) return;
        game = await fetchReplay();
        if (cancelled) return;
      }
      setMode(game ? { kind: "replay", game } : { kind: "missing" });
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

    const spectate = async (pendingReplay?: Promise<ReplayGame | null>) => {
      try {
        await withResponseTimeout(session.watch(gameId), "watch_timeout", 15000);
      } catch (e) {
        if (e instanceof Error && e.message === "not_found") {
          session.destroy();
          await showReplay(pendingReplay);
        } else if (e instanceof Error && e.message === "watch_timeout") {
          await showReplay(pendingReplay);
        } else if (!cancelled) {
          setMode({ kind: "error", message: e instanceof Error ? e.message : String(e) });
        }
      }
    };

    // Friend games persist their credentials under the friend-session key;
    // accept those too so a seat holder always reclaims their seat here.
    const friendSaved = loadSavedFriendSession();
    const seat =
      loadOnlineSeat(gameId) ??
      (friendSaved?.id === gameId ? { color: friendSaved.color, token: friendSaved.token } : null);
    if (seat) {
      const off = session.on((e) => {
        if (cancelled) return;
        if (e.type === "start") {
          setMode({ kind: "player", start: e.setup });
        } else if (e.type === "open") {
          setMode({ kind: "waiting" });
        } else if (e.type === "rematched") {
          // The server re-delivers the rematch seat on resume (e.g. after a
          // refresh mid-rematch). Handle it here too: the frame can arrive
          // before OnlineMatch has mounted and subscribed.
          saveOnlineSeat(e.id, { color: e.color, token: e.token });
          window.location.href = `/game/${e.id}`;
        }
      });
      // Resume the seat; transient connection failures retry with backoff,
      // and only a server-side refusal downgrades us to spectating. We hold a
      // valid seat token, so keep retrying persistently: a downgrade to
      // spectating our OWN game strands us watching a board we should be
      // playing (and, in a bot game, leaves the bot guard-held/frozen because
      // our seat reads as disconnected). The game server can briefly reject or
      // time out a resume during a load spike / reset, so give it several
      // chances (capped backoff) before giving up; only an explicit
      // reconnect_failed (seat truly gone/archived) downgrades immediately.
      const MAX_RESUME_ATTEMPTS = 6;
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
            if (attempt < MAX_RESUME_ATTEMPTS) {
              // Backoff ~1.2s, 2.4s, 3.6s… capped at 5s.
              const delay = Math.min(5000, 1200 * (attempt + 1));
              window.setTimeout(() => {
                if (!cancelled) tryResume(attempt + 1);
              }, delay);
            } else {
              off();
              spectate();
            }
          });
      };
      tryResume(0);
    } else {
      // Not our seat: watch the live game, but start the archived-replay fetch
      // in parallel. A finished game (the common case for links from history,
      // the hero "Replay", or a lobby row of a game that just ended) then
      // renders the moment the server answers "not_found", instead of waiting
      // for a second, serial HTTP round-trip afterward. For a live game the
      // extra request just resolves to null and is discarded.
      spectate(fetchReplay());
    }

    return () => {
      cancelled = true;
      offWatch();
      session.destroy();
      sessionRef.current = null;
    };
  }, [gameId]);

  // When a spectated game turns out to be over (or its live broadcast dropped
  // and it was never saved), don't leave the viewer staring at a dead end —
  // count down and gently send them to the lobby, with manual buttons meanwhile
  // for anyone who wants to go home or jump straight to another game.
  useEffect(() => {
    if (mode.kind !== "missing") return;
    setRedirectIn(REDIRECT_SECONDS);
    const tick = window.setInterval(() => {
      setRedirectIn((s) => {
        if (s <= 1) {
          window.clearInterval(tick);
          window.location.href = "/play";
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [mode.kind]);

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

  if (mode.kind === "loading" || mode.kind === "waiting") {
    // Paint the real board frame straight away so connecting reads as "the
    // game is loading", not a frozen page. The skeleton mirrors GameShell's
    // layout so the swap to the live board when `start`/`watch-start` arrives
    // is a fill-in, not a jump.
    return (
      <main className="min-h-screen">
        <SiteNav />
        <div className="mx-auto w-full max-w-[1200px] px-3 pb-10 sm:px-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="smallcaps text-[11px] text-parchment-400">
              {mode.kind === "waiting" ? "Waiting for your opponent…" : "Connecting…"}
            </div>
            <div className="font-mono text-[11px] tracking-[0.2em] text-gold-leaf">{gameId}</div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 py-1">
                <span className="skeleton h-6 w-40" aria-hidden />
                <span className="skeleton h-6 w-14" aria-hidden />
              </div>
              <div className="w-full max-w-[720px]">
                <BoardSkeleton />
              </div>
              <div className="flex items-center justify-between gap-2 py-1">
                <span className="skeleton h-6 w-40" aria-hidden />
                <span className="skeleton h-6 w-14" aria-hidden />
              </div>
            </div>
            <div className="sm:w-64 sm:shrink-0">
              <div className="skeleton h-64 w-full xl:h-72" aria-hidden />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (mode.kind === "missing") {
    return (
      <main className="min-h-screen">
        <SiteNav />
        <section className="max-w-xl mx-auto px-6 py-16 text-center">
          <h1 className="font-display text-4xl">That game has wrapped up</h1>
          <p className="mt-3 text-parchment-200">
            It&apos;s no longer live and we couldn&apos;t find a saved copy: the
            match likely just finished, or the broadcast ended. Taking you back
            to the lobby in {redirectIn}s&hellip;
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/play" className="inline-block px-5 py-2 rounded-sm btn-leaf font-body">
              Watch another game
            </Link>
            <Link
              href="/"
              className="inline-block px-5 py-2 rounded-sm border border-parchment-700 font-body text-parchment-200 hover:text-parchment-50"
            >
              Home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <SiteNav />
      <section className="max-w-xl mx-auto px-6 py-16 text-center">
        <h1 className="font-display text-4xl">Something interrupted the game</h1>
        <p className="mt-3 text-parchment-200">
          {mode.kind === "error"
            ? mode.message
            : "This game doesn't exist, or it hasn't been played yet."}
        </p>
        <Link href="/play" className="inline-block mt-8 px-5 py-2 rounded-sm btn-leaf font-body">
          Back to the lobby
        </Link>
      </section>
    </main>
  );
}

// A quiet checkered board frame with a shimmer sweep, shown while a game
// connects. Same 8x8 grid and square colors as the live board so it holds the
// exact footprint the real Board will fill.
function BoardSkeleton() {
  return (
    <div className="relative aspect-square w-full overflow-hidden border border-black/50 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.85)]">
      <div className="grid h-full w-full grid-cols-8 grid-rows-8" aria-hidden>
        {Array.from({ length: 64 }).map((_, i) => {
          const isLight = (Math.floor(i / 8) + (i % 8)) % 2 === 0;
          return <div key={i} className={isLight ? "sq-light" : "sq-dark"} />;
        })}
      </div>
      <div className="skeleton absolute inset-0" aria-hidden />
    </div>
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
  // Once the game is over, watchers get the same result panel the players do
  // (in neutral spectator mode); dismissing it drops back to the live board,
  // with a "Show result" button to bring it back.
  const [showResult, setShowResult] = useState(true);
  // Draft games keep an engine replica so buff board mutations (summons,
  // removals) and zone effects render correctly. The wstart payload is
  // spectator-safe: held buffs and effects only, never pending offers.
  const isDraft = !!setup.draft;
  const draftGameRef = useRef<NerfGame | null>(null);
  const [draftGame, setDraftGame] = useState<NerfGame | null>(() => {
    if (!isDraft) return null;
    const game = buildSpectatorDraftGame(setup.moves, setup.dtActions ?? [], setup.dtState, setup.mode);
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
          // Same fallback OnlineMatch uses: a server-accepted move this
          // replica cannot regenerate (a hidden nerf/buff effect) is applied
          // raw instead of silently dropped — a skipped move froze the
          // spectator's draft board for the rest of the game (dtState frames
          // never carry the board, so nothing else could repair it).
          const move =
            legalMoves(g).find((candidate) => moveToUCI(candidate) === e.move.u) ??
            moveFromUCI(g.board, e.move.u);
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
                  card: e.used.card,
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
      } else if (e.type === "draft-state") {
        // Spectator-filtered re-sync (identity reveals, effect timers).
        const g = draftGameRef.current;
        if (g?.buffs) {
          mergeDraftState(g.buffs, e.state, null);
          setDraftGame({ ...g });
        }
      } else if (e.type === "end") {
        setResult(e.end.result);
        setWhiteMs(e.end.wc);
        setBlackMs(e.end.bc);
        if (e.end.nerfs) setNerfs(e.end.nerfs);
        // Game over: both sides' held buffs go public, like the nerfs.
        const g = draftGameRef.current;
        if (g?.buffs && e.end.draftBuffs) {
          revealHeldBuffs(g.buffs, e.end.draftBuffs);
          setDraftGame({ ...g });
        }
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

  // Draft games can scrub history while the move list still reproduces the
  // board. Once a card rewrites it outside move history (summons, removals,
  // teleports set buffs.historyDiverged) earlier positions cannot be rebuilt
  // from the moves alone, so review locks — the MoveList disables its
  // controls and says why, instead of leaving live-looking buttons and arrow
  // keys that silently do nothing.
  const scrubbing = !isDraft || !draftGame?.buffs?.historyDiverged;
  const currentPly = scrubbing ? historyPly ?? history.length : history.length;
  const displayBoard =
    !scrubbing || historyPly == null ? board : boardAtPly(history, historyPly);
  const lastMove = displayBoard.history[displayBoard.history.length - 1] ?? null;
  const zones = isDraft && draftGame ? draftZones(draftGame, "w") : null;

  // The result panel wants Nerf objects and both sides' cards. Rules only exist
  // in nerf/nerf-buff modes; the draft replica holds the (now-revealed) buffs.
  const whiteNerf = nerfs?.w ? IMPLEMENTED_BY_ID[nerfs.w] : undefined;
  const blackNerf = nerfs?.b ? IMPLEMENTED_BY_ID[nerfs.b] : undefined;

  return (
    <>
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
      // Review locked (a card rewrote the board): disable the nav controls
      // and show the notice instead of swallowing clicks and arrow keys.
      minPly={scrubbing ? 0 : history.length}
      clockEnabled={clockEnabled}
      whiteMs={whiteMs}
      blackMs={blackMs}
      activeColor={result ? null : board.turn}
      statusLabel={
        <>
          {reconnecting ? "Reconnecting… · " : ""}
          {isDraft && (
            <>
              {setup.mode === "buff" ? (
                <span className="text-mode-buffGlow">Buff mode</span>
              ) : setup.mode === "nerf" ? (
                <span className="text-mode-nerfGlow">Nerf mode</span>
              ) : (
                "Draft"
              )}
              {" · "}
            </>
          )}
          {result ? describeResult(result) : setup.started ? "Live game" : "Waiting for players"}
          {watchers > 0 ? ` · ${watchers} watching` : ""}
        </>
      }
      nerfs={nerfs}
      visual={
        zones
          ? {
              bannedSquares: zones.barred,
              frozenSquares: zones.frozen,
              frozenSkins: zones.frozenSkin,
              effectTurns: zones.turns,
              shieldedSquares: zones.shielded,
              wardSquares: zones.ward,
              strikeSquares: zones.strike,
              walnutSquares: zones.walnut,
              bananaSquares: zones.banana,
              trapSquares: zones.traps,
              doomSquares: zones.doom,
              lockedSquares: zones.locked,
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
    {result && showResult && (
      <GameOver
        spectator
        result={result}
        myColor="w"
        myNerf={whiteNerf}
        opponentNerf={blackNerf}
        playerNames={{ w: setup.players.w.name, b: setup.players.b.name }}
        moves={history}
        myBuffs={draftGame?.buffs?.players.w.buffs}
        opponentBuffs={draftGame?.buffs?.players.b.buffs}
        onRematch={() => {}}
        onNewGame={() => {
          window.location.href = "/play";
        }}
        onDismiss={() => setShowResult(false)}
      />
    )}
    {result && !showResult && (
      <button
        type="button"
        onClick={() => setShowResult(true)}
        className="btn-leaf fixed bottom-14 right-3 z-40 px-4 py-2 font-display text-sm font-semibold shadow-xl sm:bottom-4"
      >
        Show result
      </button>
    )}
    </>
  );
}

// Spectators only learn THAT cards are held, never which, until a card's
// identity shows on the table (instant effect, activation, a granted move)
// or the game ends. Hidden cards render as face-down minis with their tier.
// Pending offers and reveal snapshots never reach this view.
// One player per TAB: spectators flip between the two hands instead of
// scrolling one long stack, and each tab wears its player's name.
function SpectatorBuffsPanel({ game, players }: { game: NerfGame; players: MPPlayers }) {
  const [tab, setTab] = useState<Color>("w");
  // Per-row expand state for the condensed card list, keyed by tab + index.
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const bs = game.buffs;
  if (!bs) return null;
  const tabButton = (color: Color) => {
    const held = bs.players[color].buffs;
    const active = tab === color;
    return (
      <button
        type="button"
        onClick={() => setTab(color)}
        aria-pressed={active}
        className={
          "flex min-w-0 flex-1 items-center justify-center gap-1.5 border px-2 py-1.5 font-display text-[11px] font-semibold transition-colors " +
          (active
            ? "border-gold/60 bg-gold/10 text-gold-leaf"
            : "border-white/10 bg-white/[0.02] text-parchment-300 hover:bg-white/5")
        }
      >
        <span
          aria-hidden
          className={
            "h-2 w-2 shrink-0 rounded-full border " +
            (color === "w" ? "border-black/40 bg-[#e8e6e1]" : "border-white/30 bg-[#1a1a22]")
          }
        />
        <span className="min-w-0 truncate">{players[color].name}</span>
        <span className="shrink-0 font-mono text-[9px] tabular-nums text-parchment-400">
          {held.length}
        </span>
      </button>
    );
  };
  const side = (color: Color) => {
    const held = bs.players[color].buffs;
    const hiddenOnes = held.filter((inst) => !BUFF_BY_ID[inst.id]);
    return (
      <div>
        {held.length === 0 ? (
          <p className="text-[11px] text-parchment-400">No buffs drafted yet.</p>
        ) : (
          <div className="mt-1 space-y-1">
            {hiddenOnes.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {hiddenOnes.map((inst, i) => (
                  <span
                    key={i}
                    title={`Hidden buff · tier ${inst.tier}`}
                    className={
                      "relative flex h-9 w-7 items-center justify-center rounded-[3px] border border-gold/35 " +
                      "bg-[linear-gradient(135deg,rgba(216,181,110,0.14),rgba(14,12,9,0.95))] " +
                      (inst.spent || inst.nullified ? "opacity-40" : "")
                    }
                  >
                    <span className={`font-display text-[10px] font-bold tier-${inst.tier}`}>
                      {TIER_ROMAN[inst.tier]}
                    </span>
                  </span>
                ))}
              </div>
            )}
            {held.map((inst, i) => {
              const def = BUFF_BY_ID[inst.id];
              if (!def) return null;
              // Condensed one-line rows (name + tier), rule text one tap away:
              // spectators scan a hand, they don't study every card at once.
              const key = `${tab}-${i}`;
              const open = !!expandedRows[key];
              const dead = inst.spent || inst.nullified;
              return (
                <div key={i} className="rounded-[1px] border border-white/10 bg-white/[0.02]">
                  <button
                    type="button"
                    onClick={() => setExpandedRows((prev) => ({ ...prev, [key]: !open }))}
                    aria-expanded={open}
                    className="flex w-full items-center gap-1.5 px-2 py-1 text-left"
                  >
                    <span
                      className={
                        "min-w-0 flex-1 truncate font-display text-[11px] font-semibold " +
                        (dead
                          ? "text-parchment-200 line-through decoration-1 decoration-parchment-400/70"
                          : `tier-${inst.tier}`)
                      }
                    >
                      {def.name}
                    </span>
                    <span
                      className={`shrink-0 rounded-[1px] border px-1.5 py-px font-display text-[9px] font-bold tier-bg-${inst.tier} tier-${inst.tier}`}
                    >
                      {TIER_ROMAN[inst.tier]}
                    </span>
                  </button>
                  {open && (
                    <p className="px-2 pb-1 text-[10px] leading-snug text-parchment-300">
                      {def.description}
                    </p>
                  )}
                </div>
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
      <div className="flex gap-1">
        {tabButton("w")}
        {tabButton("b")}
      </div>
      {side(tab)}
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
  const [pgnCopied, setPgnCopied] = useState(false);
  // Same neutral result panel as the live spectator, shown over the replay.
  const [showResult, setShowResult] = useState(true);
  const displayBoard = useMemo(() => boardAtPly(history, historyPly), [history, historyPly]);
  const lastMove = displayBoard.history[displayBoard.history.length - 1] ?? null;

  const players: MPPlayers = {
    w: { name: game.white_name, rating: game.white_rating_before ? Math.round(game.white_rating_before) : null },
    b: { name: game.black_name, rating: game.black_rating_before ? Math.round(game.black_rating_before) : null },
  };
  const whiteNerf = IMPLEMENTED_BY_ID[game.white_nerf_id];
  const blackNerf = IMPLEMENTED_BY_ID[game.black_nerf_id];

  // Same export as the post-game screen; the archive already has both rules
  // revealed, so they always go into the tags.
  const handleCopyPGN = async () => {
    const pgn = gameToPGN({
      moves: history,
      result: { winner: game.winner, reason: game.reason },
      white: game.white_name,
      black: game.black_name,
      whiteNerf: IMPLEMENTED_BY_ID[game.white_nerf_id]?.name ?? null,
      blackNerf: IMPLEMENTED_BY_ID[game.black_nerf_id]?.name ?? null,
      startedAt: game.started_at,
    });
    try {
      await navigator.clipboard.writeText(pgn);
      setPgnCopied(true);
      window.setTimeout(() => setPgnCopied(false), 2000);
    } catch {
      // Clipboard blocked; ignore.
    }
  };

  return (
    <>
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
      rail={
        <button
          type="button"
          onClick={handleCopyPGN}
          className="mt-3 w-full rounded-sm px-4 py-2 btn-ghost font-display text-sm inline-flex items-center justify-center gap-2"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {pgnCopied ? "Copied" : "Copy PGN"}
        </button>
      }
    />
    {game.winner != null && showResult && (
      <GameOver
        spectator
        result={{ winner: game.winner, reason: game.reason }}
        myColor="w"
        myNerf={whiteNerf}
        opponentNerf={blackNerf}
        playerNames={{ w: game.white_name, b: game.black_name }}
        moves={history}
        startedAt={game.started_at}
        gameId={game.id}
        onRematch={() => {}}
        onNewGame={() => {
          window.location.href = "/play";
        }}
        onDismiss={() => setShowResult(false)}
      />
    )}
    {game.winner != null && !showResult && (
      <button
        type="button"
        onClick={() => setShowResult(true)}
        className="btn-leaf fixed bottom-14 right-3 z-40 px-4 py-2 font-display text-sm font-semibold shadow-xl sm:bottom-4"
      >
        Show result
      </button>
    )}
    </>
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
  minPly = 0,
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
  /** Earliest reviewable ply (see MoveList.minPly). */
  minPly?: number;
  clockEnabled: boolean;
  whiteMs: number;
  blackMs: number;
  activeColor: Color | null;
  statusLabel: React.ReactNode;
  nerfs: Partial<Record<Color, string>> | null;
  // Draft spectating: public zone effects painted on the board.
  visual?: React.ComponentProps<typeof Board>["visual"];
  rail?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <SiteNav />
      <div className="mx-auto w-full max-w-[1200px] px-3 pb-10 sm:px-6">
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
                name={players.b.name}
                elo={players.b.rating}
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
                fxTimePressure={clockEnabled && activeColor != null && (whiteMs < 15_000 || blackMs < 15_000)}
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
                name={players.w.name}
                elo={players.w.rating}
                avatar={players.w.avatar}
                className="min-w-0 flex-1 !px-0 !py-1"
              />
              {clockEnabled && <ClockPill ms={whiteMs} active={activeColor === "w"} compact />}
            </div>
            {/* Rules show only once known (end of game or a voluntary
                reveal); until then no placeholder plates take up space.
                Buff mode games carry the "none" rule, which never shows. */}
            {nerfs && (IMPLEMENTED_BY_ID[nerfs.w ?? ""] || IMPLEMENTED_BY_ID[nerfs.b ?? ""]) && (
              <div className="mt-2 space-y-1.5">
                {nerfs.w && <NerfLine label={`${players.w.name} (White)`} nerfId={nerfs.w} />}
                {nerfs.b && <NerfLine label={`${players.b.name} (Black)`} nerfId={nerfs.b} />}
              </div>
            )}
          </div>
          <div className="sm:w-64 sm:shrink-0">
            {/* Fixed-height wrapper: the compact MoveList fills it and
                scrolls internally, so long games never push the rail (or
                the page) past the viewport. */}
            <div className="h-64 xl:h-72">
              <MoveList
                moves={history}
                currentPly={currentPly}
                onPlyChange={onPlyChange}
                minPly={minPly}
                compact
              />
            </div>
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
