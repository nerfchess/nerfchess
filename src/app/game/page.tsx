"use client";

import { Board } from "@/components/Board";
import { BoardPlayerRow } from "@/components/BoardPlayerRow";
import { GameOver } from "@/components/GameOver";
import { MobileMoveDrawer } from "@/components/MobileMoveDrawer";
import { MoveList } from "@/components/MoveList";
import { PlayerNerfCard } from "@/components/PlayerNerfCard";
import { AILevel, pickAIMove } from "@/engine/ai";
import { Nerf, type GameContext } from "@/engine/nerf";
import { IMPLEMENTED_BY_ID, PLAYABLE_NERFS } from "@/engine/nerfs/library";
import {
  applyTurnStart,
  currentHint,
  NerfGame,
  legalMoves,
  makeContext,
  newGame,
  playMove,
  resign,
} from "@/engine/game";
import { makeSeed } from "@/engine/rng";
import { BoardState, Color, Move } from "@/engine/types";
import { cloneBoard, isInCheck, makeMove } from "@/engine/board";
import { computeMoveRisks } from "@/engine/moveSafety";
import { loadSettings } from "@/lib/settings";
import type { QueuedPremove } from "@/components/Board";
import { buildCustomNerf, CustomNerf } from "@/engine/nerfs/custom";
import { isMuted, playCapture, playCheck, playNerf, playMove as playMoveSfx, setMuted } from "@/lib/sounds";
import { applyResult, loadRating, saveRating } from "@/lib/rating";
import { SettingsPanel } from "@/components/SettingsPanel";
import { loadSavedAiGame, restoreSavedAiGame, saveAiGame } from "@/lib/gamePersistence";
import { boardAtPly } from "@/lib/gameReview";
import { premoveOptionsFor } from "@/lib/premoves";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  // Under 10s, show 1 decimal so the user can feel the rush.
  if (clamped < 10000) {
    return `0:${(clamped / 1000).toFixed(1).padStart(4, "0")}`;
  }
  const totalSec = Math.ceil(clamped / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pickRandomNerf(): Nerf {
  const playable = PLAYABLE_NERFS.filter((d) => d.id !== "lucky");
  return playable[Math.floor(Math.random() * playable.length)];
}

const BOT_ELO: Record<AILevel, number> = {
  easy: 1100,
  medium: 1500,
  hard: 1900,
};

export default function GamePageWrapper() {
  return (
    <Suspense fallback={<LoadingPanel />}>
      <GamePage />
    </Suspense>
  );
}

function LoadingPanel() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="relative flex flex-col items-center">
        <div className="flex gap-1.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-gold-leaf animate-bob" />
          <span className="w-2 h-2 rounded-full bg-verdigris-glow animate-bob" style={{ animationDelay: "0.15s" }} />
          <span className="w-2 h-2 rounded-full bg-bruise-glow animate-bob" style={{ animationDelay: "0.3s" }} />
        </div>
        <div className="font-display text-xl text-parchment animate-flicker">
          Dealing the cards
        </div>
      </div>
    </main>
  );
}

function GamePage() {
  const router = useRouter();
  const params = useSearchParams();
  const querySignature = params.toString();
  const difficulty = (params.get("difficulty") ?? "medium") as AILevel;
  const myColorParam = params.get("color") ?? "random";
  const myNerfId = params.get("nerf") ?? "random";
  // Games vs bots are casual by default; only rated games touch your rating.
  const rated = params.get("rated") === "1";
  // t = seconds per side; 0 (or missing) disables the clock entirely.
  const initialTimeMs = useMemo(() => {
    const t = parseInt(params.get("t") ?? "0", 10);
    return Number.isFinite(t) && t > 0 ? t * 1000 : 0;
  }, [params]);
  const incrementMs = useMemo(() => {
    const inc = parseInt(params.get("inc") ?? "0", 10);
    return Number.isFinite(inc) && inc > 0 ? inc * 1000 : 0;
  }, [params]);
  const clockEnabled = initialTimeMs > 0;

  const [myColor, setMyColor] = useState<Color>(() => {
    if (myColorParam === "w") return "w";
    if (myColorParam === "b") return "b";
    return Math.random() < 0.5 ? "w" : "b";
  });

  const [game, setGame] = useState<NerfGame | null>(null);
  const [, force] = useState(0);
  const [muted, setMutedState] = useState(false);
  const [premoves, setPremoves] = useState<QueuedPremove[]>([]);
  const [confirmingResign, setConfirmingResign] = useState(false);
  const [drawOfferStatus, setDrawOfferStatus] = useState<"idle" | "offering" | "declined">("idle");
  const [whiteMs, setWhiteMs] = useState(initialTimeMs);
  const [blackMs, setBlackMs] = useState(initialTimeMs);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uiSettings, setUiSettings] = useState(() => loadSettings());
  const [historyPly, setHistoryPly] = useState<number | null>(null);
  const [boardHeight, setBoardHeight] = useState<number | null>(null);
  const [playerElo, setPlayerElo] = useState<number | null>(null);
  // Reveal controls: peek at the opponent's rule mid-game, and offer to show
  // your own rule to the opponent.
  const [oppPeek, setOppPeek] = useState(false);
  const [sharedMine, setSharedMine] = useState(false);
  const aiThinking = useRef(false);
  const boardShellRef = useRef<HTMLDivElement | null>(null);
  const whiteCustomSpec = useRef<CustomNerf | null>(null);
  const blackCustomSpec = useRef<CustomNerf | null>(null);

  const addIncrement = (color: Color) => {
    if (!clockEnabled || incrementMs <= 0) return;
    if (color === "w") setWhiteMs((t) => t + incrementMs);
    else setBlackMs((t) => t + incrementMs);
  };

  useEffect(() => {
    setMutedState(isMuted());
    setPlayerElo(loadRating().rating);
  }, []);

  useEffect(() => {
    try {
      const saved = loadSavedAiGame(querySignature);
      if (saved) {
        const restored = restoreSavedAiGame(saved);
        if (restored) {
          setMyColor(saved.myColor);
          setGame(restored);
          setWhiteMs(saved.whiteMs);
          setBlackMs(saved.blackMs);
          setPremoves([]);
          whiteCustomSpec.current =
            saved.game.white.nerf.kind === "custom" ? saved.game.white.nerf.spec : null;
          blackCustomSpec.current =
            saved.game.black.nerf.kind === "custom" ? saved.game.black.nerf.spec : null;
          lastSeenMoveCount.current = restored.board.history.length;
          sawResult.current = !!restored.result;
          return;
        }
      }
    } catch {
      // Ignore incompatible saved games and deal a fresh one below.
    }

    let myDb: Nerf;
    let myCustomSpec: CustomNerf | null = null;
    if (myNerfId === "__custom__") {
      try {
        const raw = sessionStorage.getItem("dc:active-custom");
        const spec = raw ? (JSON.parse(raw) as CustomNerf) : null;
        myCustomSpec = spec;
        myDb = spec ? buildCustomNerf(spec) : pickRandomNerf();
      } catch {
        myDb = pickRandomNerf();
      }
    } else if (myNerfId === "random") {
      myDb = pickRandomNerf();
    } else {
      myDb = IMPLEMENTED_BY_ID[myNerfId] ?? pickRandomNerf();
    }
    const aiDb = pickRandomNerf();
    const wDb = myColor === "w" ? myDb : aiDb;
    const bDb = myColor === "w" ? aiDb : myDb;
    whiteCustomSpec.current = myColor === "w" ? myCustomSpec : null;
    blackCustomSpec.current = myColor === "w" ? null : myCustomSpec;
    setHistoryPly(null);
    setGame(newGame(wDb, bDb, makeSeed()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!game) return;
    saveAiGame({
      query: querySignature,
      myColor,
      game,
      whiteMs,
      blackMs,
      premoves,
      whiteCustomSpec: whiteCustomSpec.current,
      blackCustomSpec: blackCustomSpec.current,
    });
  }, [game, querySignature, myColor, whiteMs, blackMs, premoves]);

  useEffect(() => {
    if (!game || historyPly == null) return;
    if (historyPly > game.board.history.length) {
      setHistoryPly(game.board.history.length);
    }
  }, [game, historyPly]);

  const moves = useMemo(() => (game ? legalMoves(game) : []), [game]);
  const moveRisks = useMemo(
    () =>
      uiSettings.moveRiskWarnings && game && game.board.turn === myColor
        ? computeMoveRisks(game, moves)
        : undefined,
    [game, moves, myColor, uiSettings.moveRiskWarnings]
  );

  useEffect(() => {
    if (!game) return;
    const shell = boardShellRef.current;
    const boardEl = shell?.querySelector("[data-board-measure]");
    if (!boardEl) return;
    const syncHeight = () => setBoardHeight(boardEl.getBoundingClientRect().height);
    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(boardEl);
    return () => observer.disconnect();
  }, [game]);

  // Build a "virtual" board that reflects the current actual board with every
  // queued premove applied in sequence. Pseudo-legal options for further
  // premoves are generated against this virtual board, so chained premoves
  // (move A then move B with A already applied) work naturally.
  //
  // We also synthesize "friendly-target" moves: moves that would land on one
  // of our own pieces. The user can premove these in anticipation of the
  // opponent capturing first; at execute time, if the friendly piece is still
  // there the real legal-move list won't include the move and the premove is
  // discarded.
  const myNerfForPremove = game ? (myColor === "w" ? game.white.nerf : game.black.nerf) : null;
  const myStateForPremove = game ? (myColor === "w" ? game.white.state : game.black.state) : null;

  const { virtualBoard, validPremoves } = useMemo(() => {
    if (!game || game.result || (game.board.turn === myColor && premoves.length === 0)) {
      return { virtualBoard: null as BoardState | null, validPremoves: [] as QueuedPremove[] };
    }
    let board = cloneBoard(game.board);
    board.turn = myColor;
    board.epTarget = null;
    const valid: QueuedPremove[] = [];
    for (const pm of premoves) {
      const ctx: GameContext = {
        board,
        me: myColor,
        opponentLastMove: [...board.history].reverse().find((m) => m.color !== myColor) ?? null,
        myLastMove: [...board.history].reverse().find((m) => m.color === myColor) ?? null,
        moveNumber: board.history.filter((m) => m.color === myColor).length,
        capturedByMe: game.captured[myColor],
        capturedFromMe: game.captured[myColor === "w" ? "b" : "w"],
      };
      const options = premoveOptionsFor(board, myColor, myNerfForPremove, myStateForPremove, ctx);
      const match = options.find(
        (c) =>
          c.from === pm.from &&
          c.to === pm.to &&
          (c.promotion ?? undefined) === (pm.promotion ?? undefined) &&
          (!pm.capture || !!c.captured),
      );
      if (!match) break;
      board = makeMove(board, match);
      board.turn = myColor;
      board.epTarget = null;
      valid.push(pm);
    }
    return { virtualBoard: board, validPremoves: valid };
  }, [game, myColor, premoves, myNerfForPremove, myStateForPremove]);

  const premoveOptions = useMemo<Move[]>(() => {
    if (!virtualBoard || !game) return [];
    const ctx: GameContext = {
      board: virtualBoard,
      me: myColor,
      opponentLastMove: [...virtualBoard.history].reverse().find((m) => m.color !== myColor) ?? null,
      myLastMove: [...virtualBoard.history].reverse().find((m) => m.color === myColor) ?? null,
      moveNumber: virtualBoard.history.filter((m) => m.color === myColor).length,
      capturedByMe: game.captured[myColor],
      capturedFromMe: game.captured[myColor === "w" ? "b" : "w"],
    };
    return premoveOptionsFor(virtualBoard, myColor, myNerfForPremove, myStateForPremove, ctx);
  }, [virtualBoard, myColor, game, myNerfForPremove, myStateForPremove]);

  // The board is in true premove mode only when it's the opponent's turn. When
  // it's our turn and premoves are still pending, the head is about to commit;
  // we keep showing the virtual board so the piece doesn't flicker back to its
  // original square between the AI move landing and our queued move firing.
  const premoveMode = !!game && !game.result && game.board.turn !== myColor && !!virtualBoard;
  const premovePending = !!game && !game.result && game.board.turn === myColor && validPremoves.length > 0;

  // Played-move sound effects: react to history change.
  const lastSeenMoveCount = useRef(0);
  useEffect(() => {
    if (!game) return;
    const hist = game.board.history;
    if (hist.length === lastSeenMoveCount.current) return;
    const last = hist[hist.length - 1];
    if (last) {
      if (last.captured) playCapture();
      else playMoveSfx();
      if (isInCheck(game.board, game.board.turn)) {
        setTimeout(playCheck, 80);
      }
    }
    lastSeenMoveCount.current = hist.length;
  }, [game]);

  // Nerf-triggered loss sound when game ends with a non-mundane reason.
  const sawResult = useRef(false);
  const [ratingChange, setRatingChange] = useState<{ before: number; after: number } | null>(null);
  useEffect(() => {
    if (!game?.result || sawResult.current) return;
    sawResult.current = true;
    if (game.result.reason && game.result.reason.includes(":")) {
      playNerf();
    }
    // Casual games don't affect your rating.
    if (!rated) return;
    const before = loadRating();
    const score: 0 | 0.5 | 1 =
      game.result.winner === "draw" ? 0.5 : game.result.winner === myColor ? 1 : 0;
    const after = applyResult(before, difficulty, score);
    saveRating(after);
    setPlayerElo(after.rating);
    setRatingChange({ before: before.rating, after: after.rating });
  }, [game?.result, myColor, difficulty, rated]);

  // Execute the head of the premove queue when our turn returns. If the head
  // is no longer playable (target ran away, piece pinned, friendly target
  // still standing) we clear the whole queue (subsequent links assumed the
  // head would land, so they can't be salvaged.
  useEffect(() => {
    if (premoves.length === 0 || !game || game.result) return;
    if (game.board.turn !== myColor) return;
    const head = premoves[0];
    const m = moves.find(
      (lm) =>
        lm.from === head.from &&
        lm.to === head.to &&
        (lm.promotion ?? undefined) === (head.promotion ?? undefined) &&
        // If the user premoved a capture (real or friendly-target), the
        // matching legal move must also be a capture, otherwise a planned
        // Nxe5 silently downgrades to a quiet Ne5 when the target ran away,
        // and a friendly-target premove fires only when the opponent
        // actually took our piece.
        (!head.capture || !!lm.captured),
    );
    if (!m) {
      setPremoves([]);
      return;
    }
    const tid = setTimeout(() => {
      const next = playMove(game, m);
      setGame({ ...next });
      addIncrement(myColor);
      // If makeMove rejected the move (no-op: turn didn't flip), cancel the
      // entire queue (subsequent premoves assumed this one landed).
      if (next.board.turn === myColor) {
        setPremoves([]);
      } else {
        setPremoves((q) => q.slice(1));
      }
    }, 90);
    return () => clearTimeout(tid);
  }, [game, premoves, moves, myColor, clockEnabled, incrementMs]);

  // Clock tick: decrement the active side's clock at 100ms intervals while the
  // game is live. The actual loss check is in a separate effect so we don't
  // schedule state updates inside the tick callback.
  useEffect(() => {
    if (!clockEnabled || !game || game.result) return;
    const id = setInterval(() => {
      const dec = (t: number) => Math.max(0, t - 100);
      if (game.board.turn === "w") setWhiteMs(dec);
      else setBlackMs(dec);
    }, 100);
    return () => clearInterval(id);
  }, [game, clockEnabled]);

  // Timeout: when a clock hits 0, the side whose clock ran out loses.
  useEffect(() => {
    if (!clockEnabled || !game || game.result) return;
    if (whiteMs <= 0) {
      game.result = { winner: "b", reason: "white ran out of time" };
      setGame({ ...game });
    } else if (blackMs <= 0) {
      game.result = { winner: "w", reason: "black ran out of time" };
      setGame({ ...game });
    }
  }, [whiteMs, blackMs, clockEnabled, game]);

  // AI move
  useEffect(() => {
    if (!game || game.result) return;
    if (game.board.turn === myColor) return;
    if (aiThinking.current) return;
    aiThinking.current = true;
    // Visual minimum wait; the engine's iterative-deepening search budget runs
    // inside this window, so the move appears deliberate even when the search
    // finishes early.
    const delay = difficulty === "easy" ? 600 : difficulty === "medium" ? 1200 : 2000;
    const tid = setTimeout(() => {
      const m = pickAIMove(game, difficulty);
      if (m) {
        const mover = game.board.turn;
        const next = playMove(game, m);
        setGame({ ...next });
        addIncrement(mover);
      } else {
        game.result = { winner: myColor, reason: "AI has no legal moves" };
        setGame({ ...game });
      }
      aiThinking.current = false;
      force((x) => x + 1);
    }, delay);
    return () => {
      clearTimeout(tid);
      aiThinking.current = false;
    };
  }, [game, myColor, difficulty, clockEnabled, incrementMs]);

  const reviewBoard = useMemo(() => {
    if (!game || historyPly == null) return null;
    return boardAtPly(game.board.history, historyPly);
  }, [game, historyPly]);
  const currentHistoryPly = historyPly ?? game?.board.history.length ?? 0;
  const isReviewingHistory = historyPly != null;
  const handleHistoryPlyChange = (ply: number) => {
    const max = game?.board.history.length ?? 0;
    if (ply >= max) {
      setHistoryPly(null);
    } else {
      setHistoryPly(Math.max(0, ply));
      setPremoves([]);
    }
  };

  if (!game) {
    return <LoadingPanel />;
  }

  const myNerf = myColor === "w" ? game.white.nerf : game.black.nerf;
  const myState = myColor === "w" ? game.white.state : game.black.state;
  const myCtx = makeContext(game, myColor);
  const visual = myNerf.visual?.(myState, myCtx);
  const opponentNerf = myColor === "w" ? game.black.nerf : game.white.nerf;
  // The opponent's rule shows if you peeked, or once the game ends, unless you
  // opted to keep it hidden entirely.
  const oppRevealed = !uiSettings.hideOpponentReveal && (oppPeek || !!game.result);
  const lastMove = game.board.history[game.board.history.length - 1] ?? null;
  const boardForDisplay = reviewBoard ?? virtualBoard ?? game.board;
  const lastMoveForDisplay = isReviewingHistory
    ? game.board.history[currentHistoryPly - 1] ?? null
    : lastMove;
  const hint = currentHint(game, myColor);
  const forcedSquares = hint?.squares ?? [];
  const railHeightStyle = boardHeight
    ? ({ "--board-height": `${boardHeight}px` } as CSSProperties)
    : undefined;
  const boardFitClass = hint
    ? "w-[min(92vw,720px,calc(100dvh-11rem))] max-w-full"
    : "w-[min(92vw,720px,calc(100dvh-8rem))] max-w-full";

  const handleMove = (m: Move) => {
    if (game.result || isReviewingHistory) return;
    if (game.board.turn !== myColor) {
      // append to the premove queue; chained premoves are evaluated against
      // the virtual board derived from any prior queued moves
      setPremoves((q) => [
        ...q,
        { from: m.from, to: m.to, promotion: m.promotion, capture: !!m.captured },
      ]);
      return;
    }
    const next = playMove(game, m);
    setGame({ ...next });
    addIncrement(myColor);
  };

  const cancelPremove = () => setPremoves([]);

  const handleRematch = () => router.push("/play");

  const onResign = () => {
    if (!game.result) {
      resign(game, myColor);
      setGame({ ...game });
      setPremoves([]);
    }
  };

  const onOfferDraw = () => {
    if (game.result || drawOfferStatus !== "idle") return;
    setDrawOfferStatus("offering");
    // Simple AI policy: accept if its material isn't ahead. Otherwise decline.
    const vals: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    let mine = 0, theirs = 0;
    for (const p of game.board.pieces) {
      if (!p) continue;
      const v = vals[p.type] ?? 0;
      if (p.color === myColor) mine += v;
      else theirs += v;
    }
    // AI accepts if it isn't ahead by more than 2.
    const aiAhead = theirs - mine;
    window.setTimeout(() => {
      if (aiAhead <= 2) {
        game.result = { winner: "draw", reason: "draw by agreement" };
        setGame({ ...game });
        setPremoves([]);
        setDrawOfferStatus("idle");
      } else {
        setDrawOfferStatus("declined");
        window.setTimeout(() => setDrawOfferStatus("idle"), 2500);
      }
    }, 800);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  const historyActions = game.result ? null : confirmingResign ? (
    <div className="space-y-2">
      <div className="smallcaps text-[10px] text-parchment-300">Resign the game?</div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => { onResign(); setConfirmingResign(false); }}
          className="min-w-0 px-3 py-2 border border-oxblood/70 bg-oxblood/25 text-oxblood-glow hover:bg-oxblood/40 transition text-xs font-display font-semibold tracking-wide"
        >
          Yes
        </button>
        <button
          onClick={() => setConfirmingResign(false)}
          className="min-w-0 px-3 py-2 btn-ghost text-xs font-display tracking-wide"
        >
          Cancel
        </button>
      </div>
    </div>
  ) : (
    <div className="space-y-2">
      {drawOfferStatus === "declined" && (
        <div className="smallcaps text-[10px] text-parchment-300">Draw declined.</div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onOfferDraw}
          disabled={drawOfferStatus !== "idle"}
          title="Offer a draw"
          aria-label="Offer a draw"
          className="min-w-0 px-3 py-2 border border-gold/40 bg-gold/10 text-gold-leaf hover:bg-gold/20 hover:border-gold/70 transition text-xs font-display font-semibold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {drawOfferStatus === "offering" ? "Offering..." : "Draw"}
        </button>
        <button
          onClick={() => setConfirmingResign(true)}
          title="Resign the game"
          aria-label="Resign the game"
          className="min-w-0 px-3 py-2 border border-oxblood/40 bg-oxblood/10 text-oxblood-glow hover:bg-oxblood/20 hover:border-oxblood/70 transition text-xs font-display font-semibold tracking-wide"
        >
          Resign
        </button>
      </div>
    </div>
  );

  return (
    <main className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <nav className="sticky top-0 z-20 flex w-full shrink-0 items-center justify-between px-5 py-3">
        <Link href="/" className="font-display text-2xl tracking-tight">
          nerf<span className="text-gold-leaf">chess</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="smallcaps text-[11px] text-parchment-400 hidden sm:block">
            playing {myColor === "w" ? "White" : "Black"} · bot on {difficulty} · {rated ? "rated" : "casual"}
          </div>
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            title={muted ? "Sound off" : "Sound on"}
            className="w-9 h-9 inline-flex items-center justify-center rounded-full btn-ghost"
          >
            {muted ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="22" y1="9" x2="16" y2="15" />
                <line x1="16" y1="9" x2="22" y2="15" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            title="Settings"
            className="w-9 h-9 inline-flex items-center justify-center rounded-full btn-ghost"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </nav>

      <div className="mx-auto flex w-full max-w-[1280px] flex-1 min-h-0 flex-col gap-2 overflow-hidden px-3 pb-14 sm:px-6 sm:pb-6">
        {hint && (
          <div
            role="status"
            aria-live="polite"
            className={
              "plate shrink-0 p-2 px-3 flex items-center gap-2 " +
              (hint.tone === "warn"
                ? "border-oxblood-glow/60 bg-oxblood/15"
                : "border-gold/40 bg-gold/10")
            }
          >
            <span aria-hidden="true" className="text-gold-leaf font-display font-bold text-lg leading-none">!</span>
            <span className="font-display text-sm text-parchment">
              {hint.text}
            </span>
          </div>
        )}
        <div
          className="grid min-h-0 flex-1 gap-y-2 lg:grid-cols-[280px_auto] lg:justify-center lg:gap-x-3"
          style={railHeightStyle}
        >
          <aside className="hidden min-h-0 gap-3 overflow-hidden lg:grid lg:h-[var(--board-height)] lg:grid-rows-[auto_minmax(0,1fr)_auto] lg:self-start">
            <PlayerNerfCard
              board={boardForDisplay}
              playerColor={myColor === "w" ? "b" : "w"}
              myColor={myColor}
              name={`${difficulty[0].toUpperCase()}${difficulty.slice(1)} Bot`}
              elo={BOT_ELO[difficulty]}
              nerf={opponentNerf}
              revealed={oppRevealed}
              ownerLabel=""
              action={
                !oppRevealed && !uiSettings.hideOpponentReveal ? (
                  <button
                    onClick={() => setOppPeek(true)}
                    className="w-full px-3 py-2 border border-white/15 bg-white/[0.03] text-parchment-200 hover:border-white/30 hover:bg-white/[0.06] transition text-xs font-semibold"
                  >
                    Reveal their rule
                  </button>
                ) : null
              }
            />
            <div className="hidden lg:block" />
            <PlayerNerfCard
              board={boardForDisplay}
              playerColor={myColor}
              myColor={myColor}
              name="You"
              elo={playerElo}
              nerf={myNerf}
              ownerLabel=""
              progress={myNerf.progress?.(myState, myCtx) ?? null}
              action={
                <button
                  onClick={() => setSharedMine((v) => !v)}
                  className={
                    "w-full px-3 py-2 border transition text-xs font-semibold " +
                    (sharedMine
                      ? "border-gold/50 bg-gold/10 text-gold-leaf"
                      : "border-white/15 bg-white/[0.03] text-parchment-200 hover:border-white/30 hover:bg-white/[0.06]")
                  }
                >
                  {sharedMine ? "Rule shared with opponent" : "Reveal my rule to opponent"}
                </button>
              }
            />
          </aside>
          <div className="flex min-h-0 flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-start">
            <div ref={boardShellRef} className="min-h-0 min-w-0 sm:flex-none">
              {/* Mobile-only player strips: the side rails (clocks, cards,
                  actions) are hidden below the sm breakpoint. */}
              <div className="flex items-center justify-between gap-2 sm:hidden">
                <BoardPlayerRow
                  board={boardForDisplay}
                  playerColor={myColor === "w" ? "b" : "w"}
                  myColor={myColor}
                  name={`${difficulty[0].toUpperCase()}${difficulty.slice(1)} Bot`}
                  elo={BOT_ELO[difficulty]}
                  className="min-w-0 flex-1 !px-0 !py-1"
                />
                {clockEnabled && (
                  <ClockPill
                    ms={myColor === "w" ? blackMs : whiteMs}
                    active={!game.result && game.board.turn !== myColor}
                    compact
                  />
                )}
              </div>
              <div data-board-measure className={`mx-auto sm:mx-0 ${boardFitClass}`}>
                <Board
                  board={boardForDisplay}
                  legalMoves={
                    isReviewingHistory
                      ? []
                      : game.board.turn === myColor && !premovePending
                      ? moves
                      : premoveOptions
                  }
                  orientation={myColor}
                  onMove={handleMove}
                  myColor={myColor}
                  visual={isReviewingHistory ? undefined : { ...(visual ?? {}), highlightSquares: forcedSquares }}
                  lastMove={lastMoveForDisplay}
                  disabled={!!game.result || premovePending || isReviewingHistory}
                  premoveMode={!isReviewingHistory && premoveMode}
                  premoves={isReviewingHistory ? [] : validPremoves}
                  onCancelPremove={cancelPremove}
                  moveRisks={isReviewingHistory || premovePending ? undefined : moveRisks}
                  autoQueen={uiSettings.autoQueen}
                />
              </div>
              <div className="flex items-center justify-between gap-2 sm:hidden">
                <BoardPlayerRow
                  board={boardForDisplay}
                  playerColor={myColor}
                  myColor={myColor}
                  name="You"
                  elo={playerElo}
                  className="min-w-0 flex-1 !px-0 !py-1"
                />
                {clockEnabled && (
                  <ClockPill
                    ms={myColor === "w" ? whiteMs : blackMs}
                    active={!game.result && game.board.turn === myColor}
                    compact
                  />
                )}
              </div>
              <div className="plate mt-1 p-2 px-3 sm:hidden">
                <span className={`font-display text-sm font-semibold tier-${myNerf.tier}`}>
                  {myNerf.name}
                </span>
                <span className="text-xs leading-snug text-parchment-300"> — {myNerf.description}</span>
              </div>
              {historyActions && <div className="mt-1 sm:hidden">{historyActions}</div>}
            </div>
            <div
              className={
                "hidden min-h-0 overflow-hidden gap-3 sm:grid sm:h-[var(--board-height)] sm:w-52 sm:shrink-0 " +
                (clockEnabled ? "sm:grid-rows-[auto_minmax(0,1fr)_auto]" : "sm:grid-rows-[minmax(0,1fr)]")
              }
              style={railHeightStyle}
            >
              {clockEnabled && (
                <ClockPill
                  ms={myColor === "w" ? blackMs : whiteMs}
                  active={!game.result && game.board.turn !== myColor}
                />
              )}
              <MoveList
                moves={game.board.history}
                currentPly={currentHistoryPly}
                onPlyChange={handleHistoryPlyChange}
                compact
                showHeader={false}
                footer={historyActions}
              />
              {clockEnabled && (
                <ClockPill
                  ms={myColor === "w" ? whiteMs : blackMs}
                  active={!game.result && game.board.turn === myColor}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <MobileMoveDrawer
        moves={game.board.history}
        currentPly={currentHistoryPly}
        onPlyChange={handleHistoryPlyChange}
        footer={historyActions}
      />

      {game.result && (
        <GameOver
          result={game.result}
          myColor={myColor}
          myNerf={myNerf}
          opponentNerf={opponentNerf}
          ratingChange={ratingChange}
          onRematch={handleRematch}
          onNewGame={handleRematch}
          onReview={() => setHistoryPly(0)}
        />
      )}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => {
          setSettingsOpen(false);
          setUiSettings(loadSettings());
        }}
      />
    </main>
  );
}

function ClockPill({ ms, active, compact = false }: { ms: number; active: boolean; compact?: boolean }) {
  const low = ms < 30000;
  const critical = ms < 10000;
  return (
    <div
      className={
        "plate flex items-center justify-center transition " +
        (compact ? "shrink-0 px-3 py-1.5 " : "p-4 ") +
        (active
          ? "border-2 border-gold bg-gold/15 shadow-leaf ring-1 ring-gold/40"
          : "opacity-60")
      }
    >
      <span
        className={
          "font-mono tabular-nums font-bold tracking-wide " +
          (compact ? "text-xl " : "text-4xl ") +
          (critical
            ? "text-oxblood-glow"
            : low
            ? "text-gold-leaf"
            : "text-parchment")
        }
      >
        {formatClock(ms)}
      </span>
    </div>
  );
}
