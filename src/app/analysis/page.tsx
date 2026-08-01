"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Download,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { Board } from "@/components/Board";
import { SiteHeader } from "@/components/SiteHeader";
import { BoardAnalysis, analyzeBoard } from "@/engine/ai";
import { generateMoves, makeMove, moveToSAN, movesToSAN, moveToUCI } from "@/engine/board";
import { initialBoard } from "@/engine/board";
import { BoardState, Color, Move } from "@/engine/types";
import { START_FEN, boardToFen, fenToBoard } from "@/lib/fen";
import { gameToPGN } from "@/lib/pgn";
import { Button } from "@/components/ui/Button";

// Lichess-style analysis board: move pieces for both sides, navigate the
// line, and read the engine's eval bar and best move. Accepts ?fen=... or
// ?moves=e2e4,e7e5,... so other pages can deep-link a position.

function replayFrom(start: BoardState, moves: Move[], ply: number): BoardState {
  let b = start;
  for (let i = 0; i < Math.min(ply, moves.length); i++) b = makeMove(b, moves[i]);
  return b;
}

function evalPercent(cpWhite: number): number {
  // Sigmoid squash: 0cp = 50%, +400cp ≈ 73%, mate scores pin to the edge.
  if (cpWhite >= 90000) return 100;
  if (cpWhite <= -90000) return 0;
  return 50 + 50 * (2 / (1 + Math.exp(-cpWhite / 400)) - 1);
}

function evalLabel(cpWhite: number): string {
  if (cpWhite >= 90000) return "#";
  if (cpWhite <= -90000) return "#";
  const pawns = cpWhite / 100;
  return (pawns > 0 ? "+" : "") + pawns.toFixed(1);
}

function AnalysisInner() {
  const params = useSearchParams();
  const [startBoard, setStartBoard] = useState<BoardState>(() => initialBoard());
  const [customStart, setCustomStart] = useState(false);
  const [moves, setMoves] = useState<Move[]>([]);
  const [viewPly, setViewPly] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [engineOn, setEngineOn] = useState(true);
  const [analysis, setAnalysis] = useState<BoardAnalysis | null>(null);
  const [fenInput, setFenInput] = useState("");
  const [fenError, setFenError] = useState(false);
  const analysisTimer = useRef<number | null>(null);

  // Deep links: ?fen= loads a position, ?moves= replays a UCI list.
  useEffect(() => {
    // Deferred off the synchronous effect body so the deep-link parse doesn't
    // cascade a render inline; runs on the same tick, before paint.
    queueMicrotask(() => {
      const fen = params.get("fen");
      const uciList = params.get("moves");
      if (fen) {
        const b = fenToBoard(fen);
        if (b) {
          setStartBoard(b);
          setCustomStart(boardToFen(b) !== START_FEN);
          setMoves([]);
          setViewPly(0);
          if (b.turn === "b") setFlipped(true);
          return;
        }
      }
      if (uciList) {
        let b = initialBoard();
        const parsed: Move[] = [];
        for (const uci of uciList.split(/[,\s]+/).filter(Boolean)) {
          const m = generateMoves(b).find((x) => moveToUCI(x) === uci);
          if (!m) break;
          parsed.push(m);
          b = makeMove(b, m);
        }
        setMoves(parsed);
        setViewPly(parsed.length);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const board = useMemo(() => replayFrom(startBoard, moves, viewPly), [startBoard, moves, viewPly]);
  const legal = useMemo(() => generateMoves(board), [board]);
  const lastMove = viewPly > 0 ? moves[viewPly - 1] : null;

  // SANs for the move list, computed once per line change.
  const sans = useMemo(() => movesToSAN(moves, startBoard), [moves, startBoard]);

  // Move numbers run off the starting position's counter, not the ply index: a
  // FEN with black to move opens on a black half-move, so index parity would
  // number every move in the line wrong.
  const moveNums = useMemo(() => {
    let num = startBoard.fullmove;
    return moves.map((m) => {
      const at = num;
      if (m.color === "b") num++;
      return at;
    });
  }, [moves, startBoard]);

  const onMove = useCallback(
    (m: Move) => {
      // Playing from an earlier position discards the rest of the line, like
      // lichess's analysis board without variation trees.
      const kept = moves.slice(0, viewPly);
      setMoves([...kept, m]);
      setViewPly(viewPly + 1);
    },
    [moves, viewPly],
  );

  // Turning the engine off clears any shown line; adjusted during render so the
  // effect below only schedules searches.
  if (!engineOn && analysis !== null) setAnalysis(null);

  // The engine runs synchronously on the main thread; the timeout lets the
  // board paint the new move before the ~300ms search blocks.
  useEffect(() => {
    if (analysisTimer.current) window.clearTimeout(analysisTimer.current);
    if (!engineOn) {
      return;
    }
    analysisTimer.current = window.setTimeout(() => {
      setAnalysis(analyzeBoard(board, 300));
    }, 120);
    return () => {
      if (analysisTimer.current) window.clearTimeout(analysisTimer.current);
    };
  }, [board, engineOn]);

  // Arrow-key navigation through the line.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") setViewPly((p) => Math.max(0, p - 1));
      else if (e.key === "ArrowRight") setViewPly((p) => Math.min(moves.length, p + 1));
      else if (e.key === "ArrowUp") setViewPly(0);
      else if (e.key === "ArrowDown") setViewPly(moves.length);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moves.length]);

  const cpWhite = analysis ? analysis.scoreCp * (board.turn === "w" ? 1 : -1) : 0;
  const bestSan = analysis?.move ? moveToSAN(analysis.move, board) : null;

  const orientation: Color = flipped ? "b" : "w";
  const fen = boardToFen(board);

  const loadFen = () => {
    const b = fenToBoard(fenInput);
    if (!b) {
      setFenError(true);
      return;
    }
    setFenError(false);
    setStartBoard(b);
    setCustomStart(boardToFen(b) !== START_FEN);
    setMoves([]);
    setViewPly(0);
    setAnalysis(null);
  };

  const reset = () => {
    setStartBoard(initialBoard());
    setCustomStart(false);
    setMoves([]);
    setViewPly(0);
    setFenInput("");
    setFenError(false);
  };

  const downloadPgn = () => {
    const pgn = gameToPGN({ moves, result: null, startBoard });
    const blob = new Blob([pgn], { type: "application/x-chess-pgn" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analysis.pgn";
    a.click();
    URL.revokeObjectURL(url);
  };

  const navBtn = "btn-ghost press grid h-9 w-9 place-items-center disabled:opacity-30";

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="mx-auto flex w-full max-w-[640px] gap-3">
          {/* Eval bar */}
          <div className="relative hidden w-6 shrink-0 overflow-hidden border border-white/10 bg-[#1a1917] sm:block">
            <div
              className="absolute inset-x-0 bottom-0 bg-parchment-100 transition-[height] duration-300"
              style={{ height: `${engineOn && analysis ? evalPercent(cpWhite) : 50}%` }}
            />
            {engineOn && analysis && (
              <span
                className={
                  "absolute inset-x-0 text-center font-mono text-[12px] leading-4 " +
                  (cpWhite >= 0 ? "bottom-0 text-black" : "top-0 text-parchment-100")
                }
              >
                {evalLabel(cpWhite).replace(/^[+-]/, "")}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <Board
              board={board}
              legalMoves={legal}
              orientation={orientation}
              onMove={onMove}
              myColor={board.turn}
              lastMove={lastMove}
              visual={
                engineOn && analysis?.move
                  ? { highlightSquares: [analysis.move.from, analysis.move.to] }
                  : undefined
              }
            />
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <button className={navBtn} onClick={() => setViewPly(0)} disabled={viewPly === 0} aria-label="First move">
                <ChevronFirst size={16} />
              </button>
              <button className={navBtn} onClick={() => setViewPly((p) => Math.max(0, p - 1))} disabled={viewPly === 0} aria-label="Previous move">
                <ChevronLeft size={16} />
              </button>
              <button
                className={navBtn}
                onClick={() => setViewPly((p) => Math.min(moves.length, p + 1))}
                disabled={viewPly >= moves.length}
                aria-label="Next move"
              >
                <ChevronRight size={16} />
              </button>
              <button className={navBtn} onClick={() => setViewPly(moves.length)} disabled={viewPly >= moves.length} aria-label="Last move">
                <ChevronLast size={16} />
              </button>
              <button className={navBtn} onClick={() => setFlipped((f) => !f)} aria-label="Flip board" title="Flip board">
                <RefreshCw size={15} />
              </button>
              <button className={navBtn} onClick={reset} aria-label="Reset board" title="Reset board">
                <RotateCcw size={15} />
              </button>
              <Button
                tone={engineOn ? "quiet" : "ghost"}
                size="sm"
                onClick={() => setEngineOn((v) => !v)}
                className={
                  "ml-auto " + (engineOn ? "bg-white/10 text-gold-leaf" : "text-parchment-300")
                }
                title="Toggle engine"
              >
                <Cpu size={14} /> Engine
              </Button>
            </div>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <div className="plate p-4">
            <h1 className="font-display text-lg text-parchment-50">Analysis board</h1>
            {engineOn ? (
              <p className="mt-1 text-sm text-parchment-300">
                <span className="font-mono text-parchment-50">{analysis ? evalLabel(cpWhite) : "…"}</span>
                {bestSan && (
                  <span className="text-parchment-400">
                    {" "}
                    · best {bestSan} · depth {analysis?.depth}
                  </span>
                )}
              </p>
            ) : (
              <p className="mt-1 text-sm text-parchment-400">Engine off.</p>
            )}
          </div>

          <div className="plate min-h-[120px] p-4">
            <div className="smallcaps text-[11px] tracking-[0.14em] text-parchment-400">Moves</div>
            {moves.length === 0 ? (
              <p className="mt-2 text-sm text-parchment-400">
                Play moves for either side, or load a FEN below.
              </p>
            ) : (
              <div className="mt-2 max-h-64 overflow-y-auto font-mono text-sm leading-7">
                {sans.map((san, i) => {
                  const isWhiteMove = moves[i].color === "w";
                  return (
                    <span key={i}>
                      {(isWhiteMove || i === 0) && (
                        <span className="mr-1 text-parchment-500">
                          {moveNums[i]}
                          {isWhiteMove ? "." : "..."}
                        </span>
                      )}
                      <button
                        onClick={() => setViewPly(i + 1)}
                        className={
                          "mr-2 px-1 transition-colors hover:bg-white/10 " +
                          (viewPly === i + 1 ? "bg-white/10 text-gold-leaf" : "text-parchment-100")
                        }
                      >
                        {san}
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="plate p-4">
            <div className="smallcaps text-[11px] tracking-[0.14em] text-parchment-400">FEN</div>
            <input
              readOnly
              value={fen}
              onFocus={(e) => e.currentTarget.select()}
              className="mt-1.5 w-full border border-white/10 bg-black/20 px-2 py-1.5 font-mono text-[12px] text-parchment-300"
            />
            <div className="mt-2 flex gap-2">
              <input
                value={fenInput}
                onChange={(e) => {
                  setFenInput(e.target.value);
                  setFenError(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && loadFen()}
                placeholder="Paste a FEN to set up a position"
                className={
                  "min-w-0 flex-1 border bg-black/20 px-2 py-1.5 font-mono text-[12px] text-parchment-100 " +
                  (fenError ? "border-oxblood-glow" : "border-white/10")
                }
              />
              <Button tone="ghost" onClick={loadFen} className="shrink-0 px-3 py-1.5 text-sm">
                Load
              </Button>
            </div>
            {fenError && <p className="mt-1 text-xs text-oxblood-glow">Couldn&apos;t parse that FEN.</p>}
            {!customStart && moves.length > 0 && (
              <Button tone="ghost"
                onClick={downloadPgn}
                className="mt-3 flex px-3 py-1.5 text-sm">
                <Download size={14} /> Download PGN
              </Button>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}

export default function AnalysisPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader active="/analysis" />
      <Suspense>
        <AnalysisInner />
      </Suspense>
    </main>
  );
}
