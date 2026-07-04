"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { Board, QueuedPremove } from "@/components/Board";
import { BoardPlayerRow } from "@/components/BoardPlayerRow";
import { ChatPanel } from "@/components/ChatPanel";
import { ClockPill } from "@/components/ClockPill";
import { GameOver } from "@/components/GameOver";
import { MobileActionsMenu } from "@/components/MobileActionsMenu";
import { MobileMoveDrawer } from "@/components/MobileMoveDrawer";
import { MoveList } from "@/components/MoveList";
import { PlayerNerfCard } from "@/components/PlayerNerfCard";
import { SettingsPanel } from "@/components/SettingsPanel";
import { TIER_LABEL, TIER_ROMAN } from "@/lib/tiers";
import { cloneBoard, findKing, isInCheck, makeMove, moveToUCI } from "@/engine/board";
import { computeMoveRisks } from "@/engine/moveSafety";
import { loadSettings } from "@/lib/settings";
import type { GameContext, Nerf } from "@/engine/nerf";
import { IMPLEMENTED_BY_ID, PLAYABLE_NERFS } from "@/engine/nerfs/library";
import {
  currentHint,
  NerfGame,
  legalMoves,
  makeContext,
  newGameAsColor,
  playMove,
} from "@/engine/game";
import { BoardState, Color, Move } from "@/engine/types";
import { nerfSummary, outcomeFor, recordCompletedGame } from "@/lib/gameHistory";
import { boardAtPly } from "@/lib/gameReview";
import {
  clearActiveGame,
  MPChatMessage,
  MPSession,
  MPStart,
  saveActiveGame,
  saveOnlineSeat,
} from "@/lib/multiplayer";
import { premoveOptionsFor } from "@/lib/premoves";
import { isMuted, playCapture, playCheck, playCountdownTick, playLowTime, playMove as playMoveSfx, playNerf, setMuted } from "@/lib/sounds";

// Mirrors the server's start-of-game grace: each side's first move gets this
// many free milliseconds before their clock starts charging.
const FIRST_MOVE_GRACE_MS = 10_000;

type PendingPremoveSend = { uci: string; ply: number };
type PendingLocalMove = { uci: string; ply: number; move: Move };

function moveKey(move: Move): string {
  return `${move.from}:${move.to}:${move.promotion ?? ""}:${move.captured ?? ""}`;
}

function pickRandomNerf(): Nerf {
  const pool = PLAYABLE_NERFS.filter((d) => d.id !== "lucky");
  return pool[Math.floor(Math.random() * pool.length)];
}

// Rebuild the authoritative game state from a server `start` payload. Used on
// mount and again whenever a reconnect replays the game.
function buildGameFromStart(start: MPStart): NerfGame {
  const myNerf = IMPLEMENTED_BY_ID[start.nerfId] ?? pickRandomNerf();
  let next = newGameAsColor(myNerf, start.color, start.nerfSeed);
  for (const uci of start.moves ?? []) {
    const move = legalMoves(next).find((candidate) => moveToUCI(candidate) === uci);
    if (!move) return next;
    next = playMove(next, move);
  }
  return next;
}

interface Props {
  session: MPSession;
  start: MPStart;
  subtitle: string;
  onExit: () => void;
}

// What this rated game is worth: the projected rating change for each result.
function RatingStakes({ stakes }: { stakes: { win: number; draw: number; loss: number } }) {
  const fmt = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
  return (
    <div className="plate flex items-center justify-between gap-2 p-2 px-3">
      <span className="smallcaps text-[9px] text-parchment-400">Rating at stake</span>
      <span className="font-mono text-[11px] tabular-nums">
        <span className="text-verdigris">W {fmt(stakes.win)}</span>
        <span className="text-parchment-400"> · D {fmt(stakes.draw)} · </span>
        <span className="text-oxblood-glow">L {fmt(stakes.loss)}</span>
      </span>
    </div>
  );
}

// The in-game view for any server-authoritative online game (friend games and
// rated matchmade games). The parent owns the connection and lobby flow; this
// component takes over once the server has sent `start`.
export function OnlineMatch({ session, start, subtitle, onExit }: Props) {
  const myColor = start.color;
  const clockEnabled = start.timeSec > 0;
  const myName = start.players?.[myColor]?.name ?? "You";
  const myRating = start.players?.[myColor]?.rating ?? null;
  const oppColor: Color = myColor === "w" ? "b" : "w";
  const oppName = start.players?.[oppColor]?.name ?? "Opponent";
  const oppRating = start.players?.[oppColor]?.rating ?? null;

  const [game, setGame] = useState<NerfGame | null>(() => buildGameFromStart(start));
  const [error, setError] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uiSettings, setUiSettings] = useState(() => loadSettings());
  const [confirmingResign, setConfirmingResign] = useState(false);
  const [confirmingDraw, setConfirmingDraw] = useState(false);
  // A move held for confirmation (Settings > Gameplay > Move confirmation).
  const [confirmMovePending, setConfirmMovePending] = useState<Move | null>(null);
  const [drawOfferBy, setDrawOfferBy] = useState<Color | null>(null);
  const [drawOfferStatus, setDrawOfferStatus] = useState<"idle" | "offering" | "declined">("idle");
  const [takebackOfferBy, setTakebackOfferBy] = useState<Color | null>(null);
  const [takebackStatus, setTakebackStatus] = useState<"idle" | "offering" | "declined">("idle");
  const [whiteMs, setWhiteMs] = useState(start.wc);
  const [blackMs, setBlackMs] = useState(start.bc);
  const [premoves, setPremoves] = useState<QueuedPremove[]>([]);
  const [pendingLocalMove, setPendingLocalMoveState] = useState<PendingLocalMove | null>(null);
  const [awaitingPremoveAck, setAwaitingPremoveAckState] = useState(false);
  const [historyPly, setHistoryPly] = useState<number | null>(null);
  const [boardHeight, setBoardHeight] = useState<number | null>(null);
  const [revealedOppNerf, setRevealedOppNerf] = useState<Nerf | null>(() => {
    const oppId = start.revealed?.[start.color === "w" ? "b" : "w"];
    return oppId ? IMPLEMENTED_BY_ID[oppId] ?? null : null;
  });
  const [ratingChange, setRatingChange] = useState<{ before: number; after: number } | null>(null);
  const [chatMessages, setChatMessages] = useState<MPChatMessage[]>(() => start.chat ?? []);
  const [rematchStatus, setRematchStatus] = useState<"none" | "offered" | "incoming">("none");
  // Seconds left on my first-move grace window (null = not in the window).
  const [graceSecondsLeft, setGraceSecondsLeft] = useState<number | null>(null);
  const lastGraceBeepRef = useRef<number | null>(null);
  // Voluntary rule reveals: mine (button flow) and the opponent's (event).
  const [myRevealState, setMyRevealState] = useState<"hidden" | "confirm" | "revealed">(() =>
    start.revealed?.[start.color] ? "revealed" : "hidden",
  );
  const [liveOppReveal, setLiveOppReveal] = useState(() => !!start.revealed?.[start.color === "w" ? "b" : "w"]);
  // The end screen can be dismissed and brought back.
  const [showResult, setShowResult] = useState(true);

  const boardShellRef = useRef<HTMLDivElement | null>(null);
  const recordedResult = useRef(false);
  // The authoritative game, mirrored in a ref so websocket events can read
  // and advance it synchronously (several frames can arrive in one tick).
  // Server events must never do their work inside a setState updater: React
  // may invoke updaters more than once, which would double-fire side effects
  // like shifting the premove queue.
  const gameRef = useRef<NerfGame | null>(game);
  const awaitingPremoveAckRef = useRef(false);
  const pendingPremoveRef = useRef<PendingPremoveSend | null>(null);
  const pendingLocalMoveRef = useRef<PendingLocalMove | null>(null);
  const premovesRef = useRef<QueuedPremove[]>([]);

  const applyGame = (next: NerfGame | null) => {
    gameRef.current = next;
    setGame(next);
  };

  const setAwaitingPremoveAck = (value: boolean, pending: PendingPremoveSend | null = null) => {
    awaitingPremoveAckRef.current = value;
    pendingPremoveRef.current = value ? pending : null;
    setAwaitingPremoveAckState(value);
  };

  const setPendingLocalMove = (pending: PendingLocalMove | null) => {
    pendingLocalMoveRef.current = pending;
    setPendingLocalMoveState(pending);
  };

  useEffect(() => setMutedState(isMuted()), []);

  // Remember that this device is mid-game so the home page can offer a
  // "rejoin" shortcut if the tab is closed; forget it once the game ends.
  useEffect(() => {
    saveActiveGame(start.id);
  }, [start.id]);
  useEffect(() => {
    if (game?.result) clearActiveGame(start.id);
  }, [game?.result, start.id]);

  // The queue ref is always updated synchronously alongside the state, so
  // websocket handlers can trust it without waiting for a render.
  const setPremoveQueue = (next: QueuedPremove[]) => {
    premovesRef.current = next;
    setPremoves(next);
  };

  const clearPremoves = () => setPremoveQueue([]);

  const enqueuePremove = (move: Move) => {
    setPremoveQueue([
      ...premovesRef.current,
      { from: move.from, to: move.to, promotion: move.promotion, capture: !!move.captured },
    ]);
  };

  const shiftPremove = () => setPremoveQueue(premovesRef.current.slice(1));

  // Matches a queued premove against a concrete legal move. A premove queued
  // as a capture only fires as a capture; a quiet premove may still fire as a
  // capture if the destination got occupied in the meantime.
  const premoveMatches = (head: QueuedPremove) => (candidate: Move) =>
    candidate.from === head.from &&
    candidate.to === head.to &&
    (candidate.promotion ?? undefined) === (head.promotion ?? undefined) &&
    (!head.capture || !!candidate.captured);

  // Fire the queued premove the instant it becomes our turn. No artificial
  // delay: the board already shows the premoved position, so the accepted
  // move landing is visually a no-op (Lichess-style).
  function queuePremoveSend(snapshot: NerfGame) {
    if (awaitingPremoveAckRef.current || pendingLocalMoveRef.current) return;
    if (snapshot.result || snapshot.board.turn !== myColor) return;
    const head = premovesRef.current[0];
    if (!head) return;
    const move = legalMoves(snapshot).find(premoveMatches(head));
    if (!move) {
      // The premove became illegal: cancel the queue cleanly.
      clearPremoves();
      return;
    }

    const uci = moveToUCI(move);
    const ply = snapshot.board.history.length;
    setAwaitingPremoveAck(true, { uci, ply });
    if (!session.sendMove(uci, ply)) {
      setAwaitingPremoveAck(false);
      clearPremoves();
      setError("Disconnected from the game server.");
    }
  }

  // Server events. The server is authoritative: local moves are not applied
  // until the websocket sends back an accepted move.
  useEffect(() => {
    const off = session.on((e) => {
      if (e.type === "error") {
        setError(e.message);
        setPendingLocalMove(null);
        setAwaitingPremoveAck(false);
        clearPremoves();
      } else if (e.type === "disconnected") {
        setError("Connection lost, reconnecting…");
        setPendingLocalMove(null);
        setAwaitingPremoveAck(false);
      } else if (e.type === "reconnecting") {
        setError("Connection lost, reconnecting…");
      } else if (e.type === "start") {
        // Reconnected: the server replayed the full game (moves, clocks,
        // chat, and a trailing `end` frame if it finished while we were away).
        setError(null);
        setPendingLocalMove(null);
        setAwaitingPremoveAck(false);
        clearPremoves();
        setWhiteMs(e.setup.wc);
        setBlackMs(e.setup.bc);
        setChatMessages(e.setup.chat ?? []);
        const oppRevealId = e.setup.revealed?.[oppColor];
        if (oppRevealId && IMPLEMENTED_BY_ID[oppRevealId]) {
          setRevealedOppNerf(IMPLEMENTED_BY_ID[oppRevealId]);
          setLiveOppReveal(true);
        }
        if (e.setup.revealed?.[myColor]) setMyRevealState("revealed");
        applyGame(buildGameFromStart(e.setup));
      } else if (e.type === "opponent-gone") {
        setError("Opponent disconnected.");
        setPendingLocalMove(null);
        setAwaitingPremoveAck(false);
      } else if (e.type === "clocks") {
        setWhiteMs(e.wc);
        setBlackMs(e.bc);
      } else if (e.type === "move") {
        setDrawOfferBy(null);
        setDrawOfferStatus("idle");
        const g = gameRef.current;
        if (!g) return;
        const lm = legalMoves(g).find((x) => moveToUCI(x) === e.move.u);
        const wasAwaitingPremove = awaitingPremoveAckRef.current;
        const pendingPremove = pendingPremoveRef.current;
        if (!lm) {
          setPendingLocalMove(null);
          if (wasAwaitingPremove) {
            setAwaitingPremoveAck(false);
            clearPremoves();
          }
          return;
        }
        const next = playMove(g, lm);
        applyGame({ ...next });
        setConfirmMovePending(null);
        setWhiteMs(e.move.wc);
        setBlackMs(e.move.bc);
        if (pendingLocalMoveRef.current) {
          setPendingLocalMove(null);
        }
        if (wasAwaitingPremove) {
          setAwaitingPremoveAck(false);
          if (
            pendingPremove &&
            lm.color === myColor &&
            e.move.u === pendingPremove.uci &&
            e.move.ply === pendingPremove.ply + 1
          ) {
            shiftPremove();
          } else {
            clearPremoves();
          }
        }
        if (lm.captured) playCapture();
        else playMoveSfx();
        if (isInCheck(next.board, next.board.turn)) setTimeout(playCheck, 80);
        // Our turn again (opponent moved, or our premove landed and the next
        // queued one already applies): fire the queued premove immediately.
        if (next.board.turn === myColor) queuePremoveSend(next);
      } else if (e.type === "end") {
        setConfirmMovePending(null);
        setConfirmingDraw(false);
        setShowResult(true);
        setWhiteMs(e.end.wc);
        setBlackMs(e.end.bc);
        setPendingLocalMove(null);
        setAwaitingPremoveAck(false);
        setDrawOfferBy(null);
        setDrawOfferStatus("idle");
        clearPremoves();
        const oppNerfId = e.end.nerfs?.[oppColor];
        if (oppNerfId && IMPLEMENTED_BY_ID[oppNerfId]) {
          setRevealedOppNerf(IMPLEMENTED_BY_ID[oppNerfId]);
        }
        const change = e.end.ratings?.[myColor];
        if (change) setRatingChange({ before: change.before, after: change.after });
        const finished = gameRef.current;
        if (finished) applyGame({ ...finished, result: e.end.result });
      } else if (e.type === "draw-offer") {
        setError(null);
        setDrawOfferBy(e.color);
        setDrawOfferStatus(e.color === myColor ? "offering" : "idle");
      } else if (e.type === "draw-declined") {
        setDrawOfferBy(null);
        setDrawOfferStatus(e.color === myColor ? "idle" : "declined");
        if (e.color !== myColor) {
          window.setTimeout(() => setDrawOfferStatus("idle"), 2500);
        }
      } else if (e.type === "takeback-offer") {
        setError(null);
        setTakebackOfferBy(e.color);
        setTakebackStatus(e.color === myColor ? "offering" : "idle");
      } else if (e.type === "takeback-declined") {
        setTakebackOfferBy(null);
        setTakebackStatus(e.color === myColor ? "idle" : "declined");
        if (e.color !== myColor) {
          window.setTimeout(() => setTakebackStatus("idle"), 2500);
        }
      } else if (e.type === "takeback") {
        // The server rewound the move list — rebuild the whole game from it,
        // exactly like a reconnect replay.
        setError(null);
        setPendingLocalMove(null);
        setAwaitingPremoveAck(false);
        clearPremoves();
        setHistoryPly(null);
        setConfirmMovePending(null);
        setTakebackOfferBy(null);
        setTakebackStatus("idle");
        setDrawOfferBy(null);
        setWhiteMs(e.wc);
        setBlackMs(e.bc);
        applyGame(buildGameFromStart({ ...start, moves: e.moves }));
        playMoveSfx();
      } else if (e.type === "chat") {
        setChatMessages((msgs) => [...msgs, e.message].slice(-50));
      } else if (e.type === "rule-revealed") {
        if (e.color === myColor) {
          setMyRevealState("revealed");
        } else if (IMPLEMENTED_BY_ID[e.nerfId]) {
          setRevealedOppNerf(IMPLEMENTED_BY_ID[e.nerfId]);
          setLiveOppReveal(true);
          playNerf();
        }
      } else if (e.type === "rematch-offer") {
        setRematchStatus(e.color === myColor ? "offered" : "incoming");
      } else if (e.type === "rematched") {
        // Take the new seat and load the fresh game with a clean slate.
        saveOnlineSeat(e.id, { color: e.color, token: e.token });
        window.location.href = `/game/${e.id}`;
      }
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, myColor]);

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

  useEffect(() => {
    if (!game || historyPly == null) return;
    if (historyPly > game.board.history.length) {
      setHistoryPly(game.board.history.length);
    }
  }, [game, historyPly]);

  // Game-ended hook: write the finished game into the local history, once.
  // A restored session may already carry a finished game; never re-record it.
  useEffect(() => {
    if (!game?.result) return;
    if (!recordedResult.current && game.board.history.length === (start.moves?.length ?? 0)) {
      // Result present on first render (restored finished game) — skip.
      recordedResult.current = true;
      return;
    }
    if (recordedResult.current) return;
    recordedResult.current = true;
    recordCompletedGame({
      mode: start.rated ? "online" : "friend",
      opponent: oppName,
      myColor,
      outcome: outcomeFor(game.result.winner, myColor),
      reason: game.result.reason,
      rated: !!start.rated,
      moveCount: game.board.history.length,
      baseSec: start.timeSec,
      incSec: start.incrementSec,
      ratingChange,
      myNerf: nerfSummary(myColor === "w" ? game.white.nerf : game.black.nerf),
      opponentNerf: nerfSummary(revealedOppNerf),
      moves: game.board.history.map(moveToUCI),
      serverGameId: start.id,
    });
  }, [game, myColor, oppName, ratingChange, revealedOppNerf, start]);

  const reviewBoard = useMemo(() => {
    if (!game || historyPly == null) return null;
    return boardAtPly(game.board.history, historyPly);
  }, [game, historyPly]);
  const pendingLocalBoard = useMemo(() => {
    if (!game || !pendingLocalMove || pendingLocalMove.ply !== game.board.history.length) return null;
    return makeMove(cloneBoard(game.board), pendingLocalMove.move);
  }, [game, pendingLocalMove]);
  const currentHistoryPly = historyPly ?? game?.board.history.length ?? 0;
  const isReviewingHistory = historyPly != null;
  const handleHistoryPlyChange = (ply: number) => {
    const max = game?.board.history.length ?? 0;
    if (ply >= max) {
      setHistoryPly(null);
    } else {
      setHistoryPly(Math.max(0, ply));
      clearPremoves();
    }
  };

  const myNerfForPremove = game ? (myColor === "w" ? game.white.nerf : game.black.nerf) : null;
  const myStateForPremove = game ? (myColor === "w" ? game.white.state : game.black.state) : null;

  // The board shown while premoves are queued: the current position (plus my
  // own not-yet-acknowledged move, if any) with every still-plausible queued
  // premove applied. Premoved pieces stay visually "held" on their destination
  // squares through opponent moves until the premove executes or is cancelled.
  const { virtualBoard, validPremoves } = useMemo(() => {
    if (
      !game ||
      game.result ||
      (game.board.turn === myColor && !pendingLocalMove && premoves.length === 0)
    ) {
      return { virtualBoard: null as BoardState | null, validPremoves: [] as QueuedPremove[] };
    }
    let board = cloneBoard(pendingLocalBoard ?? game.board);
    board.turn = myColor;
    board.epTarget = null;
    // When it's actually my turn (no local move in flight), the head premove
    // is about to be sent: validate it against the same legal-move list
    // queuePremoveSend uses, so the display never disagrees with execution.
    const executingHead = game.board.turn === myColor && !pendingLocalBoard;
    const valid: QueuedPremove[] = [];
    for (const [index, pm] of premoves.entries()) {
      let match: Move | undefined;
      if (index === 0 && executingHead) {
        match = legalMoves(game).find(premoveMatches(pm));
      } else {
        const ctx: GameContext = {
          board,
          me: myColor,
          opponentLastMove: [...board.history].reverse().find((m) => m.color !== myColor) ?? null,
          myLastMove: [...board.history].reverse().find((m) => m.color === myColor) ?? null,
          moveNumber: board.history.filter((m) => m.color === myColor).length,
          capturedByMe: game.captured[myColor],
          capturedFromMe: game.captured[myColor === "w" ? "b" : "w"],
        };
        const strictOptions = premoveOptionsFor(board, myColor, myNerfForPremove, myStateForPremove, ctx);
        const fallbackOptions = premoveOptionsFor(board, myColor, null, null, null);
        const options = [
          ...strictOptions,
          ...fallbackOptions.filter((m) => !strictOptions.some((s) => moveKey(s) === moveKey(m))),
        ];
        match = options.find(premoveMatches(pm));
      }
      if (!match) break;
      board = makeMove(board, match);
      board.turn = myColor;
      board.epTarget = null;
      valid.push(pm);
    }
    return { virtualBoard: board, validPremoves: valid };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, myColor, premoves, pendingLocalBoard, myNerfForPremove, myStateForPremove]);

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
    // Strict (nerf-filtered) options only, so the dots shown during the
    // opponent's turn already reflect where your rule forbids you to move.
    // Queued premoves are still re-validated with a lenient fallback when the
    // turn actually arrives (context-dependent rules can change by then).
    return premoveOptionsFor(virtualBoard, myColor, myNerfForPremove, myStateForPremove, ctx);
  }, [virtualBoard, myColor, game, myNerfForPremove, myStateForPremove]);

  // Any time it is not strictly "my turn with nothing in flight" — opponent
  // thinking, my own move awaiting its ack, or a queued premove being sent —
  // board input queues premoves instead of being dropped, so fast players
  // never hit a dead input window between moves.
  const premoveMode =
    uiSettings.premovesEnabled &&
    !!game &&
    !game.result &&
    !!virtualBoard &&
    (game.board.turn !== myColor || !!pendingLocalMove || awaitingPremoveAck || premoves.length > 0);

  const handleLocalMove = (m: Move) => {
    if (!game || game.result || isReviewingHistory) return;
    if (premoveMode) {
      enqueuePremove(m);
      return;
    }
    if (game.board.turn !== myColor) return;
    if (awaitingPremoveAck || pendingLocalMove) return;
    const lm = moves.find(
      (x) => x.from === m.from && x.to === m.to && (x.promotion ?? null) === (m.promotion ?? null),
    );
    if (!lm) return;
    if (uiSettings.confirmMove) {
      // Hold the move for an explicit confirm tap; the board previews it.
      setConfirmMovePending(lm);
      return;
    }
    sendMoveNow(lm);
  };

  const sendMoveNow = (lm: Move) => {
    if (!game) return;
    clearPremoves();
    setAwaitingPremoveAck(false);
    const uci = moveToUCI(lm);
    const ply = game.board.history.length;
    if (!session.sendMove(uci, ply)) {
      setPendingLocalMove(null);
      setError("Disconnected from the game server.");
      return;
    }
    setPendingLocalMove({ uci, ply, move: lm });
  };

  const confirmHeldMove = () => {
    const held = confirmMovePending;
    setConfirmMovePending(null);
    if (held) sendMoveNow(held);
  };

  // Execute queued premove when our turn comes
  useEffect(() => {
    if (!game || game.result || premoves.length === 0) return;
    queuePremoveSend(game);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, premoves, moves, myColor, awaitingPremoveAck]);

  useEffect(() => {
    if (!awaitingPremoveAck) return;
    const id = window.setTimeout(() => {
      setAwaitingPremoveAck(false);
      setPendingLocalMove(null);
      clearPremoves();
      setError("The premove did not reach the game server. Try the move again.");
    }, 5000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingPremoveAck]);

  useEffect(() => {
    if (!pendingLocalMove) return;
    const id = window.setTimeout(() => {
      setPendingLocalMove(null);
      setError("The move did not reach the game server. Try the move again.");
    }, 5000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingLocalMove]);

  // Low-time alarm: one warning sound the moment my clock first drops under
  // 15 seconds. Re-arms if increment lifts the clock clearly back above it.
  const lowTimeArmedRef = useRef(true);
  const myMs = myColor === "w" ? whiteMs : blackMs;
  const turnStartedAtRef = useRef(Date.now());
  useEffect(() => {
    turnStartedAtRef.current = Date.now();
  }, [game?.board.history.length]);

  const clockStartDelay = (color: Color) => {
    if (!game || game.result || game.board.turn !== color) return 0;
    const activeMoves = game.board.history.filter((m) => m.color === color).length;
    if (activeMoves > 0) return 0;
    return Math.max(0, FIRST_MOVE_GRACE_MS - (Date.now() - turnStartedAtRef.current));
  };

  // Server-authoritative timeout: the moment the active side's clock reads
  // zero locally, ask the server for clocks — it runs its flag check before
  // answering and broadcasts the end frame, so the game finishes promptly
  // even if neither player sends another move. Keep nudging until the end
  // arrives (covers clock drift and dropped frames); the server remains the
  // sole judge of whether anyone actually flagged.
  useEffect(() => {
    if (!clockEnabled || !game || game.result) return;
    const active = game.board.turn;
    const activeMs = active === "w" ? whiteMs : blackMs;
    let interval: number | undefined;
    const timer = window.setTimeout(() => {
      session.requestClocks();
      interval = window.setInterval(() => session.requestClocks(), 500);
    }, Math.max(0, clockStartDelay(active) + activeMs) + 200);
    return () => {
      window.clearTimeout(timer);
      if (interval !== undefined) window.clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, whiteMs, blackMs, clockEnabled, session]);

  useEffect(() => {
    if (!clockEnabled || !game || game.result) {
      setGraceSecondsLeft(null);
      return;
    }
    const syncGrace = () => {
      const active = game.board.turn;
      const activeMoves = game.board.history.filter((m) => m.color === active).length;
      const graceLeft = FIRST_MOVE_GRACE_MS - (Date.now() - turnStartedAtRef.current);
      if (activeMoves === 0 && graceLeft > 0) {
        if (active === myColor) {
          const seconds = Math.ceil(graceLeft / 1000);
          setGraceSecondsLeft((prev) => (prev === seconds ? prev : seconds));
          if (seconds <= 5 && lastGraceBeepRef.current !== seconds) {
            lastGraceBeepRef.current = seconds;
            playCountdownTick();
          }
        } else {
          setGraceSecondsLeft(null);
        }
        return;
      }
      setGraceSecondsLeft(null);
      lastGraceBeepRef.current = null;
    };
    syncGrace();
    const id = window.setInterval(syncGrace, 250);
    return () => window.clearInterval(id);
  }, [game, clockEnabled, myColor]);

  // ClockPill owns the visible countdown, so the whole match surface does not
  // re-render ten times a second during bullet games.
  useEffect(() => {
    if (!clockEnabled || !game || game.result || !uiSettings.lowTimeWarning) return;
    if (myMs >= 20000) {
      lowTimeArmedRef.current = true;
    }
    if (game.board.turn !== myColor || !lowTimeArmedRef.current) return;
    const delay = clockStartDelay(myColor) + myMs - 15000;
    if (delay <= 0) {
      lowTimeArmedRef.current = false;
      playLowTime();
      return;
    }
    const id = window.setTimeout(() => {
      lowTimeArmedRef.current = false;
      playLowTime();
    }, delay);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myMs, clockEnabled, game, myColor, uiSettings.lowTimeWarning]);

  const onResign = () => {
    if (!game || game.result) return;
    session.resign();
  };

  const requestResign = () => {
    if (uiSettings.confirmResign) setConfirmingResign(true);
    else onResign();
  };

  const onOfferDraw = () => {
    if (!game || game.result || drawOfferStatus === "offering") return;
    if (uiSettings.confirmDrawOffer && !confirmingDraw) {
      setConfirmingDraw(true);
      return;
    }
    setConfirmingDraw(false);
    setError(null);
    if (!session.offerDraw()) {
      setError("Disconnected from the game server.");
    }
  };

  const onAcceptDraw = () => {
    if (!game || game.result) return;
    setError(null);
    if (!session.acceptDraw()) {
      setError("Disconnected from the game server.");
    }
  };

  const onDeclineDraw = () => {
    if (!game || game.result) return;
    setError(null);
    setDrawOfferBy(null);
    if (!session.declineDraw()) {
      setError("Disconnected from the game server.");
    }
  };

  const onOfferTakeback = () => {
    if (!game || game.result || takebackStatus === "offering") return;
    setError(null);
    if (!session.offerTakeback()) {
      setError("Disconnected from the game server.");
    }
  };

  const onAcceptTakeback = () => {
    if (!game || game.result) return;
    setError(null);
    if (!session.acceptTakeback()) {
      setError("Disconnected from the game server.");
    }
  };

  const onDeclineTakeback = () => {
    if (!game || game.result) return;
    setError(null);
    setTakebackOfferBy(null);
    if (!session.declineTakeback()) {
      setError("Disconnected from the game server.");
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  // No optimistic echo: the server broadcasts chat back to both players,
  // including the sender.
  const handleSendChat = (text: string) => {
    if (!session.sendChat(text)) {
      setError("Disconnected from the game server.");
    }
  };

  const handleRematch = () => {
    if (rematchStatus === "offered") return;
    if (!session.requestRematch()) {
      setError("Disconnected from the game server.");
      return;
    }
    if (rematchStatus !== "incoming") setRematchStatus("offered");
  };

  if (!game) return null;
  const ratingStakes = start.rated && !game.result ? start.preview?.[myColor] ?? null : null;
  const myNerf = myColor === "w" ? game.white.nerf : game.black.nerf;
  const myState = myColor === "w" ? game.white.state : game.black.state;
  const myCtx = makeContext(game, myColor);
  const visual = myNerf.visual?.(myState, myCtx);
  const opponentNerf = revealedOppNerf ?? (myColor === "w" ? game.black.nerf : game.white.nerf);
  const lastMove = game.board.history[game.board.history.length - 1] ?? null;
  // A held move (confirmation setting) previews on the board before sending.
  const confirmPreviewBoard = confirmMovePending
    ? makeMove(cloneBoard(game.board), confirmMovePending)
    : null;
  // virtualBoard already includes the pending local move (it builds on
  // pendingLocalBoard), so it wins while premoves are queued.
  const boardForDisplay =
    reviewBoard ?? confirmPreviewBoard ?? virtualBoard ?? pendingLocalBoard ?? game.board;
  const orientation: Color = uiSettings.flipBoard ? oppColor : myColor;
  const checkedBoard = reviewBoard ?? game.board;
  const checkSquare =
    uiSettings.checkHighlight && isInCheck(checkedBoard, checkedBoard.turn)
      ? findKing(checkedBoard, checkedBoard.turn)
      : null;
  const lastMoveForDisplay = isReviewingHistory
    ? game.board.history[currentHistoryPly - 1] ?? null
    : confirmMovePending ?? pendingLocalMove?.move ?? lastMove;
  const hint = currentHint(game, myColor);
  const forcedSquares = hint?.squares ?? [];
  const railHeightStyle = boardHeight
    ? ({ "--board-height": `${boardHeight}px` } as CSSProperties)
    : undefined;
  const boardFitClass = hint
    ? "w-[min(92vw,var(--board-cap,720px),calc(100dvh-11rem))] max-w-full"
    : "w-[min(92vw,var(--board-cap,720px),calc(100dvh-8rem))] max-w-full";
  // Takebacks are casual-only and need a move of mine on the board.
  const takebackAvailable =
    !start.rated && game.board.history.some((m) => m.color === myColor);
  const revealControl = game.result ? null : myRevealState === "revealed" ? (
    <div className="plate flex items-center gap-2 p-2 px-3 text-xs text-parchment-300">
      <span aria-hidden className="text-verdigris-glow">✓</span>
      Your rule is visible to your opponent.
    </div>
  ) : myRevealState === "confirm" ? (
    <div className="plate space-y-2 p-2 px-3">
      <div className="smallcaps text-[10px] text-parchment-300">
        Show your secret rule to your opponent? This can&apos;t be undone.
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            if (!session.revealRule()) setError("Disconnected from the game server.");
          }}
          className="min-w-0 px-3 py-2 border border-gold/40 bg-gold/10 text-gold-leaf hover:bg-gold/20 hover:border-gold/70 transition text-xs font-display font-semibold tracking-wide"
        >
          Reveal
        </button>
        <button
          onClick={() => setMyRevealState("hidden")}
          className="min-w-0 px-3 py-2 btn-ghost text-xs font-display tracking-wide"
        >
          Cancel
        </button>
      </div>
    </div>
  ) : (
    <button
      onClick={() => setMyRevealState("confirm")}
      className="plate w-full p-2 px-3 text-left text-xs text-parchment-300 transition hover:border-gold/40 hover:text-gold-leaf"
    >
      Reveal my rule to my opponent…
    </button>
  );

  const historyActions = game.result ? null : confirmMovePending ? (
    <div className="space-y-2">
      <div className="smallcaps text-[10px] text-parchment-300">Play this move?</div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={confirmHeldMove}
          className="min-w-0 px-3 py-2 border border-gold/40 bg-gold/10 text-gold-leaf hover:bg-gold/20 hover:border-gold/70 transition text-xs font-display font-semibold tracking-wide"
        >
          Confirm
        </button>
        <button
          onClick={() => setConfirmMovePending(null)}
          className="min-w-0 px-3 py-2 btn-ghost text-xs font-display tracking-wide"
        >
          Cancel
        </button>
      </div>
    </div>
  ) : confirmingDraw ? (
    <div className="space-y-2">
      <div className="smallcaps text-[10px] text-parchment-300">Offer a draw?</div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onOfferDraw}
          className="min-w-0 px-3 py-2 border border-gold/40 bg-gold/10 text-gold-leaf hover:bg-gold/20 hover:border-gold/70 transition text-xs font-display font-semibold tracking-wide"
        >
          Offer draw
        </button>
        <button
          onClick={() => setConfirmingDraw(false)}
          className="min-w-0 px-3 py-2 btn-ghost text-xs font-display tracking-wide"
        >
          Cancel
        </button>
      </div>
    </div>
  ) : confirmingResign ? (
    <div className="space-y-2">
      <div className="smallcaps text-[10px] text-parchment-300">Resign the game?</div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => {
            onResign();
            setConfirmingResign(false);
          }}
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
  ) : takebackOfferBy && takebackOfferBy !== myColor ? (
    <div className="space-y-2">
      <div className="smallcaps text-[10px] text-parchment-300">Opponent asks for a takeback.</div>
      {error && <div className="text-xs text-oxblood-glow leading-snug">{error}</div>}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onAcceptTakeback}
          className="min-w-0 px-3 py-2 border border-gold/40 bg-gold/10 text-gold-leaf hover:bg-gold/20 hover:border-gold/70 transition text-xs font-display font-semibold tracking-wide"
        >
          Allow
        </button>
        <button
          onClick={onDeclineTakeback}
          className="min-w-0 px-3 py-2 btn-ghost text-xs font-display font-semibold tracking-wide"
        >
          Decline
        </button>
      </div>
    </div>
  ) : drawOfferBy && drawOfferBy !== myColor ? (
    <div className="space-y-2">
      <div className="smallcaps text-[10px] text-parchment-300">Opponent offered a draw.</div>
      {error && <div className="text-xs text-oxblood-glow leading-snug">{error}</div>}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onAcceptDraw}
          className="min-w-0 px-3 py-2 border border-gold/40 bg-gold/10 text-gold-leaf hover:bg-gold/20 hover:border-gold/70 transition text-xs font-display font-semibold tracking-wide"
        >
          Accept
        </button>
        <button
          onClick={onDeclineDraw}
          className="min-w-0 px-3 py-2 btn-ghost text-xs font-display font-semibold tracking-wide"
        >
          Decline
        </button>
      </div>
      <button
        onClick={requestResign}
        className="w-full min-w-0 px-3 py-2 border border-oxblood/40 bg-oxblood/10 text-oxblood-glow hover:bg-oxblood/20 hover:border-oxblood/70 transition text-xs font-display font-semibold tracking-wide"
      >
        Resign
      </button>
    </div>
  ) : (
    <div className="space-y-2">
      {drawOfferStatus === "declined" && (
        <div className="smallcaps text-[10px] text-parchment-300">Draw declined.</div>
      )}
      {takebackStatus === "declined" && (
        <div className="smallcaps text-[10px] text-parchment-300">Takeback declined.</div>
      )}
      {error && <div className="text-xs text-oxblood-glow leading-snug">{error}</div>}
      <div className={"grid gap-2 " + (takebackAvailable ? "grid-cols-3" : "grid-cols-2")}>
        <button
          onClick={onOfferDraw}
          disabled={drawOfferStatus === "offering"}
          className="min-w-0 px-3 py-2 border border-gold/40 bg-gold/10 text-gold-leaf hover:bg-gold/20 hover:border-gold/70 transition text-xs font-display font-semibold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {drawOfferStatus === "offering" ? "Offered" : "Draw"}
        </button>
        {takebackAvailable && (
          <button
            onClick={onOfferTakeback}
            disabled={takebackStatus === "offering"}
            title="Ask your opponent to let you take your last move back"
            className="min-w-0 px-3 py-2 border border-bruise-glow/40 bg-bruise/10 text-bruise-glow hover:bg-bruise/20 hover:border-bruise-glow/70 transition text-xs font-display font-semibold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {takebackStatus === "offering" ? "Asked" : "Takeback"}
          </button>
        )}
        <button
          onClick={requestResign}
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
          <div className="smallcaps hidden text-[11px] text-parchment-400 sm:block">
            playing {myColor === "w" ? "White" : "Black"} · {subtitle}
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
        {graceSecondsLeft != null && (
          <div
            role="status"
            aria-live="polite"
            className={
              "plate shrink-0 flex items-center gap-2 p-2 px-3 " +
              (graceSecondsLeft <= 5 ? "border-oxblood-glow/60 bg-oxblood/15" : "border-gold/40 bg-gold/10")
            }
          >
            <span
              className={
                "font-mono text-lg font-bold tabular-nums " +
                (graceSecondsLeft <= 5 ? "text-oxblood-glow" : "text-gold-leaf")
              }
            >
              {graceSecondsLeft}
            </span>
            <span className="font-display text-sm text-parchment">
              Free time. Your clock starts when this hits zero.
            </span>
          </div>
        )}
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
          <aside className="hidden min-h-0 gap-2 overflow-y-auto lg:grid lg:h-[var(--board-height)] lg:grid-rows-[auto_minmax(6rem,1fr)_auto] lg:self-start">
            <PlayerNerfCard
              board={boardForDisplay}
              playerColor={oppColor}
              myColor={myColor}
              name={oppName}
              elo={oppRating}
              avatar={start.players?.[oppColor]?.avatar}
              nerf={opponentNerf}
              revealed={!!revealedOppNerf && (liveOppReveal || !uiSettings.hideOpponentReveal)}
              ownerLabel=""
              compact
            />
            <div className="hidden min-h-0 lg:block">
              <ChatPanel
                messages={chatMessages}
                myColor={myColor}
                onSend={handleSendChat}
                className="h-full"
              />
            </div>
            <div className="space-y-2">
              <PlayerNerfCard
                board={boardForDisplay}
                playerColor={myColor}
                myColor={myColor}
                name={myName}
                elo={myRating}
                avatar={start.players?.[myColor]?.avatar}
                nerf={myNerf}
                ownerLabel=""
                progress={myNerf.progress?.(myState, myCtx) ?? null}
                compact
              />
              {revealControl}
              {ratingStakes && <RatingStakes stakes={ratingStakes} />}
            </div>
          </aside>
          <div className="flex min-h-0 flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-start">
            <div ref={boardShellRef} className="min-h-0 min-w-0 sm:flex-none">
              {/* Mobile-only player strips: the side rails (clocks, cards,
                  actions) are hidden below the sm breakpoint. */}
              <div className="flex items-center justify-between gap-2 sm:hidden">
                <BoardPlayerRow
                  board={boardForDisplay}
                  playerColor={oppColor}
                  myColor={myColor}
                  name={oppName}
                  elo={oppRating}
                  avatar={start.players?.[oppColor]?.avatar}
                  className="min-w-0 flex-1 !px-0 !py-1"
                />
                {clockEnabled && (
                  <ClockPill
                    ms={myColor === "w" ? blackMs : whiteMs}
                    active={!game.result && game.board.turn !== myColor}
                    startDelayMs={clockStartDelay(oppColor)}
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
                      : premoveMode
                      ? premoveOptions
                      : game.board.turn === myColor
                      ? moves
                      : []
                  }
                  orientation={orientation}
                  onMove={handleLocalMove}
                  myColor={myColor}
                  visual={isReviewingHistory ? undefined : { ...(visual ?? {}), highlightSquares: forcedSquares }}
                  lastMove={lastMoveForDisplay}
                  disabled={
                    !!game.result ||
                    isReviewingHistory ||
                    !!confirmMovePending ||
                    (!uiSettings.premovesEnabled && (awaitingPremoveAck || !!pendingLocalMove))
                  }
                  premoveMode={!isReviewingHistory && premoveMode}
                  premoves={isReviewingHistory ? [] : validPremoves}
                  onCancelPremove={clearPremoves}
                  moveRisks={isReviewingHistory || premoveMode ? undefined : moveRisks}
                  autoQueen={uiSettings.autoQueen}
                  showCoordinates={uiSettings.showCoordinates}
                  highlightLastMove={uiSettings.highlightLastMove}
                  showLegalMoves={uiSettings.showLegalMoves}
                  checkSquare={isReviewingHistory ? null : checkSquare}
                />
              </div>
              <div className="flex items-center justify-between gap-2 sm:hidden">
                <BoardPlayerRow
                  board={boardForDisplay}
                  playerColor={myColor}
                  myColor={myColor}
                  name={myName}
                  elo={myRating}
                  avatar={start.players?.[myColor]?.avatar}
                  className="min-w-0 flex-1 !px-0 !py-1"
                />
                {clockEnabled && (
                  <ClockPill
                    ms={myColor === "w" ? whiteMs : blackMs}
                    active={!game.result && game.board.turn === myColor}
                    startDelayMs={clockStartDelay(myColor)}
                    compact
                  />
                )}
              </div>
              <div className="plate mt-1 p-2 px-3 sm:hidden">
                <div className="flex items-center gap-2">
                  <span className={`min-w-0 truncate font-display text-sm font-semibold tier-${myNerf.tier}`}>
                    {myNerf.name}
                  </span>
                  <span
                    className={`ml-auto shrink-0 rounded-full border px-2 py-0.5 font-display text-[10px] font-bold tier-bg-${myNerf.tier} tier-${myNerf.tier}`}
                    title={`Tier ${myNerf.tier}: ${TIER_LABEL[myNerf.tier]}`}
                  >
                    {TIER_ROMAN[myNerf.tier]} · {TIER_LABEL[myNerf.tier]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-snug text-parchment-300">{myNerf.description}</p>
              </div>
              {ratingStakes && (
                <div className="mt-1 sm:hidden">
                  <RatingStakes stakes={ratingStakes} />
                </div>
              )}
              {historyActions && (
                <div className="mt-1 sm:hidden">
                  <MobileActionsMenu>{historyActions}</MobileActionsMenu>
                </div>
              )}
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
                  startDelayMs={clockStartDelay(oppColor)}
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
                  startDelayMs={clockStartDelay(myColor)}
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
        chatCount={chatMessages.length}
        footer={
          <div className="space-y-2">
            {historyActions}
            <ChatPanel
              messages={chatMessages}
              myColor={myColor}
              onSend={handleSendChat}
              className="h-40"
            />
          </div>
        }
      />

      {game.result && !showResult && (
        <button
          type="button"
          onClick={() => setShowResult(true)}
          className="btn-leaf fixed bottom-14 right-3 z-40 px-4 py-2 font-display text-sm font-semibold shadow-xl sm:bottom-4"
        >
          Show result
        </button>
      )}
      {game.result && showResult && (
        <GameOver
          onDismiss={() => setShowResult(false)}
          result={game.result}
          myColor={myColor}
          myNerf={myNerf}
          opponentNerf={revealedOppNerf ?? undefined}
          opponentHidden={uiSettings.hideOpponentReveal}
          ratingChange={ratingChange}
          rematchStatus={rematchStatus}
          onRematch={handleRematch}
          onNewGame={onExit}
          onReview={() => setHistoryPly(0)}
          moves={game.board.history}
          playerNames={{
            w: myColor === "w" ? myName : oppName,
            b: myColor === "b" ? myName : oppName,
          }}
          startedAt={game.startedAt}
          gameId={start.id}
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
