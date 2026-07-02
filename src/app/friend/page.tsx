"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { Board, QueuedPremove } from "@/components/Board";
import { GameOver } from "@/components/GameOver";
import { MoveList } from "@/components/MoveList";
import { PlayerNerfCard } from "@/components/PlayerNerfCard";
import { SettingsPanel } from "@/components/SettingsPanel";
import { cloneBoard, isInCheck, makeMove, moveToUCI } from "@/engine/board";
import { computeMoveRisks } from "@/engine/moveSafety";
import { loadSettings } from "@/lib/settings";
import { loadProfile } from "@/lib/profile";
import type { GameContext } from "@/engine/nerf";
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
import { boardAtPly } from "@/lib/gameReview";
import { clearSavedFriendSession, loadSavedFriendSession, MPSession, MPStart } from "@/lib/multiplayer";
import { premoveOptionsFor } from "@/lib/premoves";
import { formatTimeControl as formatTC, recordGame } from "@/lib/history";
import { isMuted, playCapture, playCheck, playMove as playMoveSfx, setMuted } from "@/lib/sounds";

type View = "setup" | "lobby" | "joining" | "game";
type PendingPremoveSend = { uci: string; ply: number };
type PendingLocalMove = { uci: string; ply: number; move: Move };

const TIME_STEPS_SEC = [
  5,
  10,
  15,
  20,
  30,
  45,
  60,
  90,
  120,
  150,
  180,
  ...range(5 * 60, 10 * 60, 60),
  ...range(12 * 60, 30 * 60, 2 * 60),
  ...range(35 * 60, 2 * 60 * 60, 5 * 60),
];

function pickRandomNerf() {
  const pool = PLAYABLE_NERFS.filter((d) => d.id !== "lucky");
  return pool[Math.floor(Math.random() * pool.length)];
}

function formatClock(ms: number): string {
  const clamped = Math.max(0, ms);
  if (clamped < 10000) return `0:0${(clamped / 1000).toFixed(1)}`;
  const totalSec = Math.ceil(clamped / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function moveKey(move: Move): string {
  return `${move.from}:${move.to}:${move.promotion ?? ""}:${move.captured ?? ""}`;
}

export default function FriendPageWrapper() {
  return (
    <Suspense fallback={null}>
      <FriendPage />
    </Suspense>
  );
}

function FriendPage() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("code");
  const [view, setView] = useState<View>("setup");
  const [code, setCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [baseSec, setBaseSec] = useState(600);
  const [incrementSec, setIncrementSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [uiSettings, setUiSettings] = useState(() => loadSettings());
  const [confirmingResign, setConfirmingResign] = useState(false);
  const [drawOfferBy, setDrawOfferBy] = useState<Color | null>(null);
  const [drawOfferStatus, setDrawOfferStatus] = useState<"idle" | "offering" | "declined">("idle");
  const [rematchOfferBy, setRematchOfferBy] = useState<Color | null>(null);
  const [rematchStatus, setRematchStatus] = useState<"idle" | "declined">("idle");
  const [inviteCopied, setInviteCopied] = useState(false);

  const [game, setGame] = useState<NerfGame | null>(null);
  const [myColor, setMyColor] = useState<Color>("w");
  const [whiteMs, setWhiteMs] = useState(0);
  const [blackMs, setBlackMs] = useState(0);
  const [premoves, setPremoves] = useState<QueuedPremove[]>([]);
  const [pendingLocalMove, setPendingLocalMoveState] = useState<PendingLocalMove | null>(null);
  const [awaitingPremoveAck, setAwaitingPremoveAckState] = useState(false);
  const [historyPly, setHistoryPly] = useState<number | null>(null);
  const [boardHeight, setBoardHeight] = useState<number | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarId, setAvatarId] = useState<string | null>(null);

  const sessionRef = useRef<MPSession | null>(null);
  const boardShellRef = useRef<HTMLDivElement | null>(null);
  const clockEnabledRef = useRef(false);
  const awaitingPremoveAckRef = useRef(false);
  const pendingPremoveRef = useRef<PendingPremoveSend | null>(null);
  const pendingLocalMoveRef = useRef<PendingLocalMove | null>(null);
  const premovesRef = useRef<QueuedPremove[]>([]);
  const premoveTimerRef = useRef<number | null>(null);
  const myColorRef = useRef<Color>("w");
  const timeControlRef = useRef("unlimited");
  const recordedEndRef = useRef(false);
  // True while restoring a saved session; if the restored game turns out to be
  // finished we drop it and return to setup instead of reopening it.
  const resumingRef = useRef(false);

  const setAwaitingPremoveAck = (value: boolean, pending: PendingPremoveSend | null = null) => {
    awaitingPremoveAckRef.current = value;
    pendingPremoveRef.current = value ? pending : null;
    setAwaitingPremoveAckState(value);
  };

  const setPendingLocalMove = (pending: PendingLocalMove | null) => {
    pendingLocalMoveRef.current = pending;
    setPendingLocalMoveState(pending);
  };

  useEffect(() => {
    setMutedState(isMuted());
    const profile = loadProfile();
    setUsername(profile.username);
    setAvatarId(profile.avatarId);
  }, []);

  useEffect(() => {
    myColorRef.current = myColor;
  }, [myColor]);

  useEffect(() => {
    premovesRef.current = premoves;
  }, [premoves]);

  const clearPremoves = () => {
    if (premoveTimerRef.current != null) {
      window.clearTimeout(premoveTimerRef.current);
      premoveTimerRef.current = null;
    }
    premovesRef.current = [];
    setPremoves([]);
  };

  const enqueuePremove = (move: Move) => {
    setPremoves((queue) => {
      const next = [
        ...queue,
        { from: move.from, to: move.to, promotion: move.promotion, capture: !!move.captured },
      ];
      premovesRef.current = next;
      return next;
    });
  };

  const shiftPremove = () => {
    setPremoves((queue) => {
      const next = queue.slice(1);
      premovesRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (premoveTimerRef.current != null) {
        window.clearTimeout(premoveTimerRef.current);
        premoveTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current?.destroy();
      sessionRef.current = null;
    };
  }, []);

  const startGameFromSetup = (msg: MPStart) => {
    const myNerf = IMPLEMENTED_BY_ID[msg.nerfId] ?? pickRandomNerf();
    let nextGame = newGameAsColor(myNerf, msg.color, msg.nerfSeed);
    for (const uci of msg.moves ?? []) {
      const move = legalMoves(nextGame).find((candidate) => moveToUCI(candidate) === uci);
      if (!move) {
        setError("Could not restore the saved game position.");
        break;
      }
      nextGame = playMove(nextGame, move);
    }
    setGame(nextGame);
    setMyColor(msg.color);
    setCode(msg.id);
    setWhiteMs(msg.wc);
    setBlackMs(msg.bc);
    setHistoryPly(null);
    clockEnabledRef.current = msg.timeSec > 0;
    timeControlRef.current = formatTC(msg.timeSec, msg.incrementSec);
    recordedEndRef.current = !!nextGame.result;
    clearPremoves();
    setPendingLocalMove(null);
    setAwaitingPremoveAck(false);
    setDrawOfferBy(null);
    setDrawOfferStatus("idle");
    setRematchOfferBy(null);
    setRematchStatus("idle");
    setView("game");
  };

  function queuePremoveSend(snapshot: NerfGame) {
    if (premoveTimerRef.current != null) return;
    if (awaitingPremoveAckRef.current || snapshot.result || snapshot.board.turn !== myColorRef.current) return;
    const head = premovesRef.current[0];
    if (!head) return;
    const move = legalMoves(snapshot).find(
      (candidate) =>
        candidate.from === head.from &&
        candidate.to === head.to &&
        (candidate.promotion ?? undefined) === (head.promotion ?? undefined) &&
        (!head.capture || !!candidate.captured),
    );
    if (!move) {
      clearPremoves();
      return;
    }

    const uci = moveToUCI(move);
    const ply = snapshot.board.history.length;
    premoveTimerRef.current = window.setTimeout(() => {
      premoveTimerRef.current = null;
      if (awaitingPremoveAckRef.current) return;
      setAwaitingPremoveAck(true, { uci, ply });
      if (!sessionRef.current?.sendMove(uci, ply)) {
        setAwaitingPremoveAck(false);
        clearPremoves();
        setError("Disconnected from the game server.");
      }
    }, 90);
  }

  // Set up the session event handler. The server is authoritative: local moves
  // are not applied until the websocket sends back an accepted move.
  const wireSession = (sess: MPSession) => {
    sess.on((e) => {
      if (e.type === "error") {
        setError(e.message);
        setPendingLocalMove(null);
        setAwaitingPremoveAck(false);
        clearPremoves();
      } else if (e.type === "disconnected") {
        setError("Disconnected from the game server.");
        setPendingLocalMove(null);
        setAwaitingPremoveAck(false);
      } else if (e.type === "opponent-gone") {
        setError("Opponent disconnected.");
        setPendingLocalMove(null);
        setAwaitingPremoveAck(false);
      } else if (e.type === "open") {
        setCode(e.code);
        setView("lobby");
      } else if (e.type === "start") {
        startGameFromSetup(e.setup);
      } else if (e.type === "clocks") {
        setWhiteMs(e.wc);
        setBlackMs(e.bc);
      } else if (e.type === "move") {
        setDrawOfferBy(null);
        setDrawOfferStatus("idle");
        setGame((g) => {
          if (!g) return g;
          const lm = legalMoves(g).find((x) => moveToUCI(x) === e.move.u);
          const pendingLocal = pendingLocalMoveRef.current;
          const wasAwaitingPremove = awaitingPremoveAckRef.current;
          const pendingPremove = pendingPremoveRef.current;
          if (!lm) {
            setPendingLocalMove(null);
            if (wasAwaitingPremove) {
              setAwaitingPremoveAck(false);
              clearPremoves();
            }
            return g;
          }
          const next = playMove(g, lm);
          setWhiteMs(e.move.wc);
          setBlackMs(e.move.bc);
          if (pendingLocal) {
            setPendingLocalMove(null);
          }
          if (wasAwaitingPremove) {
            setAwaitingPremoveAck(false);
            if (
              pendingPremove &&
              lm.color === myColorRef.current &&
              e.move.u === pendingPremove.uci &&
              e.move.ply === pendingPremove.ply + 1
            ) {
              shiftPremove();
            } else {
              clearPremoves();
            }
          } else if (next.board.turn === myColorRef.current) {
            window.setTimeout(() => queuePremoveSend(next), 0);
          }
          if (lm.captured) playCapture();
          else playMoveSfx();
          if (isInCheck(next.board, next.board.turn)) setTimeout(playCheck, 80);
          return { ...next };
        });
      } else if (e.type === "end") {
        // Never reopen a finished game: if this end frame arrived while
        // restoring a saved session, drop the session and start fresh.
        if (resumingRef.current) {
          resumingRef.current = false;
          clearSavedFriendSession();
          sessionRef.current?.destroy();
          sessionRef.current = null;
          setGame(null);
          setView("setup");
          return;
        }
        // The game is over; a page refresh should not reconnect to it. The
        // live socket stays open so rematch offers still work.
        clearSavedFriendSession();
        setWhiteMs(e.end.wc);
        setBlackMs(e.end.bc);
        setPendingLocalMove(null);
        setAwaitingPremoveAck(false);
        setDrawOfferBy(null);
        setDrawOfferStatus("idle");
        clearPremoves();
        setGame((g) => {
          if (!g) return g;
          g.result = e.end.result;
          // The end frame carries both nerf ids: swap the opponent's
          // placeholder "Unknown" nerf for their real rule so the post-game
          // reveal always works.
          const oppColor: Color = myColorRef.current === "w" ? "b" : "w";
          const oppNerfId = e.end.nerfs?.[oppColor];
          const oppNerf = oppNerfId ? IMPLEMENTED_BY_ID[oppNerfId] : undefined;
          if (oppNerf) {
            const slot = oppColor === "w" ? g.white : g.black;
            slot.nerf = oppNerf;
          }
          if (!recordedEndRef.current && g.result) {
            recordedEndRef.current = true;
            const me = myColorRef.current;
            recordGame({
              ts: Date.now(),
              mode: "friend",
              outcome:
                g.result.winner === "draw" ? "draw" : g.result.winner === me ? "win" : "loss",
              reason: g.result.reason,
              rated: false,
              opponent: "Friend",
              myNerf: (me === "w" ? g.white.nerf : g.black.nerf).name,
              opponentNerf: oppNerf?.name ?? null,
              moves: g.board.history.length,
              durationSec: Math.max(0, Math.round((Date.now() - g.startedAt) / 1000)),
              timeControl: timeControlRef.current,
              ratingAfter: null,
            });
          }
          return { ...g };
        });
      } else if (e.type === "draw-offer") {
        setError(null);
        setDrawOfferBy(e.color);
        setDrawOfferStatus(e.color === myColorRef.current ? "offering" : "idle");
      } else if (e.type === "draw-declined") {
        setDrawOfferBy(null);
        setDrawOfferStatus(e.color === myColorRef.current ? "idle" : "declined");
        if (e.color !== myColorRef.current) {
          window.setTimeout(() => setDrawOfferStatus("idle"), 2500);
        }
      } else if (e.type === "rematch-offer") {
        setError(null);
        setRematchOfferBy(e.color);
        setRematchStatus("idle");
      } else if (e.type === "rematch-declined") {
        setRematchOfferBy(null);
        if (e.color !== myColorRef.current) {
          setRematchStatus("declined");
          window.setTimeout(() => setRematchStatus("idle"), 2500);
        }
      }
    });
  };

  useEffect(() => {
    if (sessionRef.current) return;
    // An invite link takes priority over any leftover session.
    if (codeParam) return;
    const saved = loadSavedFriendSession();
    if (!saved) return;
    const sess = new MPSession();
    sessionRef.current = sess;
    wireSession(sess);
    setCode(saved.id);
    setView("joining");
    resumingRef.current = true;
    sess
      .resume(saved)
      .then(() => {
        // The server replays "start" (and "end", if the game finished) right
        // after the resume resolves; give those frames a moment to land.
        window.setTimeout(() => {
          resumingRef.current = false;
        }, 1000);
      })
      .catch(() => {
        resumingRef.current = false;
        if (sessionRef.current !== sess) return;
        clearSavedFriendSession();
        sessionRef.current = null;
        setView("setup");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Invite links (/friend?code=XYZ) join the game directly.
  useEffect(() => {
    if (!codeParam || sessionRef.current) return;
    const trimmed = codeParam.trim().toUpperCase();
    if (!trimmed) return;
    setJoinCode(trimmed);
    void joinWithCode(trimmed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeParam]);

  const handleCreate = async () => {
    setError(null);
    clearSavedFriendSession();
    const sess = new MPSession();
    sessionRef.current = sess;
    wireSession(sess);
    try {
      const c = await sess.host(baseSec, incrementSec);
      if (sessionRef.current !== sess) return;
      setCode(c);
      setView("lobby");
    } catch (e: any) {
      if (sessionRef.current !== sess) return;
      setError(String(e?.message || e));
    }
  };

  const joinWithCode = async (trimmed: string) => {
    setError(null);
    clearSavedFriendSession();
    const sess = new MPSession();
    sessionRef.current = sess;
    wireSession(sess);
    setView("joining");
    try {
      await sess.join(trimmed);
      // The game starts on receipt of the server `start` frame.
    } catch (e: any) {
      if (sessionRef.current !== sess) return;
      sessionRef.current = null;
      setError(String(e?.message || e) || "Failed to connect. Check the code.");
      setView("setup");
    }
  };

  const handleJoin = async () => {
    const trimmed = joinCode.trim().toUpperCase();
    if (!trimmed) {
      setError("Enter a code.");
      return;
    }
    await joinWithCode(trimmed);
  };

  const moves = useMemo(() => (game ? legalMoves(game) : []), [game]);
  const moveRisks = useMemo(
    () =>
      uiSettings.moveRiskWarnings && game && game.board.turn === myColor
        ? computeMoveRisks(game, moves)
        : undefined,
    [game, moves, myColor, uiSettings.moveRiskWarnings]
  );

  useEffect(() => {
    if (!game || !clockEnabledRef.current) return;
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
      const strictOptions = premoveOptionsFor(board, myColor, myNerfForPremove, myStateForPremove, ctx);
      const fallbackOptions = premoveOptionsFor(board, myColor, null, null, null);
      const options =
        game.board.turn === myColor
          ? strictOptions
          : [
              ...strictOptions,
              ...fallbackOptions.filter((m) => !strictOptions.some((s) => moveKey(s) === moveKey(m))),
            ];
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
    const strictOptions = premoveOptionsFor(virtualBoard, myColor, myNerfForPremove, myStateForPremove, ctx);
    const fallbackOptions = premoveOptionsFor(virtualBoard, myColor, null, null, null);
    return [...strictOptions, ...fallbackOptions.filter((m) => !strictOptions.some((s) => moveKey(s) === moveKey(m)))];
  }, [virtualBoard, myColor, game, myNerfForPremove, myStateForPremove]);

  const premoveMode = !!game && !game.result && game.board.turn !== myColor && !!virtualBoard;
  const premovePending = !!game && !game.result && game.board.turn === myColor && validPremoves.length > 0;

  const handleLocalMove = (m: Move) => {
    if (!game || game.result || isReviewingHistory) return;
    if (game.board.turn !== myColor) {
      enqueuePremove(m);
      return;
    }
    if (premovePending) return;
    const lm = moves.find(
      (x) => x.from === m.from && x.to === m.to && (x.promotion ?? null) === (m.promotion ?? null),
    );
    if (!lm) return;
    clearPremoves();
    setAwaitingPremoveAck(false);
    const uci = moveToUCI(lm);
    const ply = game.board.history.length;
    if (!sessionRef.current?.sendMove(uci, ply)) {
      setPendingLocalMove(null);
      setError("Disconnected from the game server.");
      return;
    }
    setPendingLocalMove({ uci, ply, move: lm });
  };

  // Execute queued premove when our turn comes
  useEffect(() => {
    if (!game || game.result || premoves.length === 0) return;
    queuePremoveSend(game);
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
  }, [awaitingPremoveAck]);

  useEffect(() => {
    if (!pendingLocalMove) return;
    const id = window.setTimeout(() => {
      setPendingLocalMove(null);
      setError("The move did not reach the game server. Try the move again.");
    }, 5000);
    return () => window.clearTimeout(id);
  }, [pendingLocalMove]);

  // Clock tick
  useEffect(() => {
    if (!clockEnabledRef.current || !game || game.result) return;
    const id = setInterval(() => {
      const dec = (t: number) => Math.max(0, t - 100);
      if (game.board.turn === "w") setWhiteMs(dec);
      else setBlackMs(dec);
    }, 100);
    return () => clearInterval(id);
  }, [game]);

  const onResign = () => {
    if (!game || game.result) return;
    sessionRef.current?.resign();
  };

  const requestResign = () => {
    if (uiSettings.confirmResign) setConfirmingResign(true);
    else onResign();
  };

  const onOfferDraw = () => {
    if (!game || game.result || drawOfferStatus === "offering") return;
    setError(null);
    if (!sessionRef.current?.offerDraw()) {
      setError("Disconnected from the game server.");
    }
  };

  const onAcceptDraw = () => {
    if (!game || game.result) return;
    setError(null);
    if (!sessionRef.current?.acceptDraw()) {
      setError("Disconnected from the game server.");
    }
  };

  const onDeclineDraw = () => {
    if (!game || game.result) return;
    setError(null);
    setDrawOfferBy(null);
    if (!sessionRef.current?.declineDraw()) {
      setError("Disconnected from the game server.");
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  // Offer (or accept) a rematch over the live socket. The server starts the
  // new game as soon as both players have offered.
  const onOfferRematch = () => {
    if (!game?.result) return;
    setError(null);
    setRematchStatus("idle");
    if (!sessionRef.current?.offerRematch()) {
      setError("Disconnected from the game server.");
      return;
    }
    setRematchOfferBy((current) => current ?? myColor);
  };

  const onDeclineRematch = () => {
    setRematchOfferBy(null);
    sessionRef.current?.declineRematch();
  };

  const rematchState: "idle" | "offering" | "incoming" | "declined" =
    rematchOfferBy && rematchOfferBy !== myColor
      ? "incoming"
      : rematchOfferBy === myColor
      ? "offering"
      : rematchStatus;

  const handleNewGame = () => {
    clearSavedFriendSession();
    sessionRef.current?.destroy();
    sessionRef.current = null;
    setGame(null);
    clearPremoves();
    setPendingLocalMove(null);
    setAwaitingPremoveAck(false);
    setDrawOfferBy(null);
    setDrawOfferStatus("idle");
    setRematchOfferBy(null);
    setRematchStatus("idle");
    setHistoryPly(null);
    setView("setup");
    setCode("");
    setJoinCode("");
    setError(null);
  };

  // -------- Setup view --------
  if (view === "setup") {
    return (
      <main className="min-h-screen">
        <SiteNav />
        <section className="max-w-2xl mx-auto px-6 py-8">
          <h1 className="font-display text-5xl">Play online</h1>
          <p className="mt-3 text-parchment-200">
            Create a game and share the invite link, or join with a code.
            Both players get a random secret rule.
          </p>

          {error && (
            <div className="mt-5 plate p-3 px-4 border-oxblood-glow/60 bg-oxblood/15 text-parchment">
              {error}
            </div>
          )}

          <div className="mt-8 plate p-6 sm:p-7 space-y-6">
            <div className="space-y-4">
              <TimeSlider
                label="Time per Side"
                value={baseSec}
                values={[0, ...TIME_STEPS_SEC]}
                display={baseSec === 0 ? "Unlimited" : formatTimeControl(baseSec)}
                formatEdgeLabel={formatTimeControl}
                onChange={setBaseSec}
              />
              <TimeSlider
                label="Increment (Seconds)"
                value={incrementSec}
                values={range(0, 30, 1)}
                display={String(incrementSec)}
                disabled={baseSec === 0}
                onChange={setIncrementSec}
              />
            </div>

            <button
              onClick={handleCreate}
              className="w-full py-3.5 rounded-sm btn-leaf font-body text-lg"
            >
              Create game
            </button>

            <div className="rule-ornament">
              <span>or</span>
            </div>

            <div>
              <div className="smallcaps text-[11px] text-parchment-400 mb-2">Join with a code</div>
              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABCDE"
                  maxLength={6}
                  className="flex-1 bg-ink-900/60 border border-white/15 rounded-sm px-4 py-3 text-lg font-mono tracking-widest uppercase focus:outline-none focus:border-gold/60 text-parchment placeholder:text-parchment-400/40"
                />
                <button
                  onClick={handleJoin}
                  disabled={!joinCode.trim()}
                  className="px-5 rounded-sm btn-ghost font-body disabled:opacity-50"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // -------- Lobby (host waiting) --------
  if (view === "lobby") {
    return (
      <main className="min-h-screen">
        <SiteNav />
        <section className="max-w-xl mx-auto px-6 py-12 text-center">
          <div className="smallcaps text-[11px] text-parchment-400">Share this code</div>
          <div className="mt-3 font-mono text-5xl tracking-[0.2em] text-gold-leaf">{code}</div>
          <p className="mt-6 text-parchment-200">
            Send the code or the invite link to anyone. The game starts as soon as they join.
          </p>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${window.location.origin}/friend?code=${code}`);
                setInviteCopied(true);
                window.setTimeout(() => setInviteCopied(false), 2000);
              } catch {}
            }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-sm btn-ghost font-body text-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            {inviteCopied ? "Link copied" : "Copy invite link"}
          </button>
          <div className="mt-8 flex items-center justify-center gap-2 smallcaps text-[11px] text-parchment-400">
            <span className="w-1.5 h-1.5 rounded-full bg-verdigris animate-flicker" />
            Waiting for opponent…
          </div>
          {error && (
            <div className="mt-6 plate p-3 px-4 border-oxblood-glow/60 bg-oxblood/15 text-parchment">
              {error}
            </div>
          )}
          <button
            onClick={handleNewGame}
            className="mt-8 px-5 py-2 rounded-sm btn-ghost font-body"
          >
            Cancel
          </button>
        </section>
      </main>
    );
  }

  // -------- Joining (guest connecting) --------
  if (view === "joining") {
    return (
      <main className="min-h-screen">
        <SiteNav />
        <section className="max-w-xl mx-auto px-6 py-12 text-center">
          <div className="smallcaps text-[11px] text-parchment-400">Connecting…</div>
          <div className="mt-3 font-mono text-4xl tracking-[0.2em] text-gold-leaf">{joinCode}</div>
          {error && (
            <div className="mt-6 plate p-3 px-4 border-oxblood-glow/60 bg-oxblood/15 text-parchment">
              {error}
            </div>
          )}
        </section>
      </main>
    );
  }

  // -------- Game view --------
  if (!game) return null;
  const myNerf = myColor === "w" ? game.white.nerf : game.black.nerf;
  const myState = myColor === "w" ? game.white.state : game.black.state;
  const myCtx = makeContext(game, myColor);
  const visual = myNerf.visual?.(myState, myCtx);
  const opponentNerf = myColor === "w" ? game.black.nerf : game.white.nerf;
  // Until the server's end frame arrives the opponent slot holds the "noop"
  // placeholder; only a real rule can be revealed.
  const opponentNerfKnown = opponentNerf.id !== "noop" ? opponentNerf : undefined;
  const lastMove = game.board.history[game.board.history.length - 1] ?? null;
  const boardForDisplay = reviewBoard ?? pendingLocalBoard ?? virtualBoard ?? game.board;
  const lastMoveForDisplay = isReviewingHistory
    ? game.board.history[currentHistoryPly - 1] ?? null
    : pendingLocalMove?.move ?? lastMove;
  const hint = currentHint(game, myColor);
  const forcedSquares = hint?.squares ?? [];
  const railHeightStyle = boardHeight
    ? ({ "--board-height": `${boardHeight}px` } as CSSProperties)
    : undefined;
  const boardFitClass = hint
    ? "w-[min(92vw,720px,calc(100dvh-11rem))] max-w-full"
    : "w-[min(92vw,720px,calc(100dvh-8rem))] max-w-full";
  // After the game ends the sidebar keeps rematch controls available even if
  // the summary modal was dismissed.
  const postGameActions = (
    <div className="space-y-2">
      {rematchState === "incoming" ? (
        <>
          <div className="smallcaps text-[10px] text-parchment-300">Opponent wants a rematch.</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onOfferRematch}
              className="min-w-0 px-3 py-2 border border-gold/40 bg-gold/10 text-gold-leaf hover:bg-gold/20 hover:border-gold/70 transition text-xs font-display font-semibold tracking-wide"
            >
              Accept
            </button>
            <button
              onClick={onDeclineRematch}
              className="min-w-0 px-3 py-2 btn-ghost text-xs font-display font-semibold tracking-wide"
            >
              Decline
            </button>
          </div>
        </>
      ) : (
        <>
          {rematchState === "declined" && (
            <div className="smallcaps text-[10px] text-parchment-300">Rematch declined.</div>
          )}
          <button
            onClick={onOfferRematch}
            disabled={rematchState === "offering"}
            className="w-full min-w-0 px-3 py-2 border border-gold/40 bg-gold/10 text-gold-leaf hover:bg-gold/20 hover:border-gold/70 transition text-xs font-display font-semibold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {rematchState === "offering" ? "Rematch offered..." : "Rematch"}
          </button>
        </>
      )}
      <button
        onClick={handleNewGame}
        className="w-full min-w-0 px-3 py-2 btn-ghost text-xs font-display tracking-wide"
      >
        New game
      </button>
    </div>
  );

  const historyActions = game.result ? postGameActions : confirmingResign ? (
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
  ) : drawOfferBy && drawOfferBy !== myColor ? (
    <div className="space-y-2">
      <div className="smallcaps text-[10px] text-parchment-300">Opponent offered a draw.</div>
      {error && (
        <div className="text-xs text-oxblood-glow leading-snug">
          {error}
        </div>
      )}
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
      {error && (
        <div className="text-xs text-oxblood-glow leading-snug">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onOfferDraw}
          disabled={drawOfferStatus === "offering"}
          className="min-w-0 px-3 py-2 border border-gold/40 bg-gold/10 text-gold-leaf hover:bg-gold/20 hover:border-gold/70 transition text-xs font-display font-semibold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {drawOfferStatus === "offering" ? "Offered" : "Draw"}
        </button>
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
            playing {myColor === "w" ? "White" : "Black"} · code {code || joinCode}
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

      <div className="mx-auto flex w-full max-w-[1280px] flex-1 min-h-0 flex-col gap-2 overflow-hidden px-3 pb-6 sm:px-6">
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
              name="Opponent"
              nerf={opponentNerf}
              revealed={!!game.result && !!opponentNerfKnown && !uiSettings.hideOpponentReveal}
              ownerLabel=""
            />
            <div className="hidden lg:block" />
            <PlayerNerfCard
              board={boardForDisplay}
              playerColor={myColor}
              myColor={myColor}
              name={username ?? "You"}
              avatarId={avatarId}
              nerf={myNerf}
              ownerLabel=""
              progress={myNerf.progress?.(myState, myCtx) ?? null}
            />
          </aside>
          <div className="flex min-h-0 flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-start">
            <div ref={boardShellRef} className="min-h-0 min-w-0 sm:flex-none">
              <div data-board-measure className={`mx-auto sm:mx-0 ${boardFitClass}`}>
                <Board
                  board={boardForDisplay}
                  legalMoves={
                    isReviewingHistory
                      ? []
                      : game.board.turn === myColor
                      ? moves
                      : premoveOptions
                  }
                  orientation={myColor}
                  onMove={handleLocalMove}
                  myColor={myColor}
                  visual={isReviewingHistory ? undefined : { ...(visual ?? {}), highlightSquares: forcedSquares }}
                  lastMove={lastMoveForDisplay}
                  disabled={!!game.result || isReviewingHistory || premovePending || awaitingPremoveAck || !!pendingLocalMove}
                  premoveMode={!isReviewingHistory && premoveMode}
                  premoves={isReviewingHistory ? [] : validPremoves}
                  onCancelPremove={clearPremoves}
                  moveRisks={isReviewingHistory || premovePending ? undefined : moveRisks}
                  autoQueen={uiSettings.autoQueen}
                  showCoordinates={uiSettings.showCoordinates}
                  highlightLastMove={uiSettings.highlightLastMove}
                />
              </div>
            </div>
            <div
              className={
                "hidden min-h-0 overflow-hidden gap-3 sm:grid sm:h-[var(--board-height)] sm:w-52 sm:shrink-0 " +
                (clockEnabledRef.current ? "sm:grid-rows-[auto_minmax(0,1fr)_auto]" : "sm:grid-rows-[minmax(0,1fr)]")
              }
              style={railHeightStyle}
            >
              {clockEnabledRef.current && (
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
              {clockEnabledRef.current && (
                <ClockPill
                  ms={myColor === "w" ? whiteMs : blackMs}
                  active={!game.result && game.board.turn === myColor}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {game.result && (
        <GameOver
          result={game.result}
          myColor={myColor}
          myNerf={myNerf}
          opponentNerf={opponentNerfKnown}
          opponentHidden={uiSettings.hideOpponentReveal}
          onRematch={onOfferRematch}
          onNewGame={handleNewGame}
          rematchState={rematchState}
          onAcceptRematch={onOfferRematch}
          onDeclineRematch={onDeclineRematch}
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

function range(start: number, end: number, step: number) {
  const values: number[] = [];
  for (let value = start; value <= end; value += step) {
    values.push(value);
  }
  return values;
}

function formatTimeControl(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  return `${minutes}:${remainingSec.toString().padStart(2, "0")}`;
}

function TimeSlider({
  label,
  value,
  values,
  display,
  disabled = false,
  formatEdgeLabel = String,
  onChange,
}: {
  label: string;
  value: number;
  values: number[];
  display: string;
  disabled?: boolean;
  formatEdgeLabel?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const index = Math.max(0, values.indexOf(value));

  return (
    <div className={disabled ? "opacity-50" : ""}>
      <div className="flex items-center justify-between mb-2">
        <div className="smallcaps text-[11px] text-parchment-400">{label}</div>
        <div className="font-mono text-sm text-gold-leaf tabular-nums">{display}</div>
      </div>
      <input
        type="range"
        min={0}
        max={values.length - 1}
        step={1}
        value={index}
        disabled={disabled}
        onChange={(e) => onChange(values[Number(e.target.value)])}
        className="w-full accent-gold-leaf disabled:cursor-not-allowed"
      />
      <div className="mt-1 flex justify-between font-mono text-[10px] text-parchment-400">
        <span>{formatEdgeLabel(values[0])}</span>
        <span>{formatEdgeLabel(values[values.length - 1])}</span>
      </div>
    </div>
  );
}

function SiteNav() {
  return (
    <nav className="flex items-center justify-between px-10 py-7">
      <Link href="/" className="font-display text-2xl tracking-tight">
        nerf<span className="text-gold-leaf">chess</span>
      </Link>
      <Link href="/play" className="px-3 py-1.5 rounded-full text-sm font-display hover:bg-white/5 text-parchment">
        vs Bot
      </Link>
    </nav>
  );
}

function ClockPill({ ms, active }: { ms: number; active: boolean }) {
  const low = ms < 30000;
  const critical = ms < 10000;
  return (
    <div
      className={
        "plate p-4 flex items-center justify-center transition " +
        (active ? "border-2 border-gold bg-gold/15 shadow-leaf ring-1 ring-gold/40" : "opacity-60")
      }
    >
      <span
        className={
          "font-mono text-4xl tabular-nums font-bold tracking-wide " +
          (critical ? "text-oxblood-glow" : low ? "text-gold-leaf" : "text-parchment")
        }
      >
        {formatClock(ms)}
      </span>
    </div>
  );
}
