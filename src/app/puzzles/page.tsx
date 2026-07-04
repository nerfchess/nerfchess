"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Lightbulb, RotateCcw, SkipForward, XCircle } from "lucide-react";
import { Board } from "@/components/Board";
import { SiteHeader } from "@/components/SiteHeader";
import { generateMoves, makeMove, moveToSAN, moveToUCI } from "@/engine/board";
import { isMated } from "@/engine/mate";
import { BoardState, Color, Move, parseSquare } from "@/engine/types";
import { fenToBoard } from "@/lib/fen";
import {
  PuzzleData,
  PuzzleProgress,
  applyPuzzleResult,
  loadPuzzleProgress,
  pickPuzzle,
  ratingDelta,
} from "@/lib/puzzles";

// Lichess-style tactics trainer. Puzzles are mined from engine self-play (see
// scripts/generatePuzzles.ts) and end in mate under the site's king-capture
// rules. The solver plays one side; scripted opponent replies play instantly.

type Status = "solving" | "wrong" | "solved";

const THEME_LABELS: Record<PuzzleData["theme"], string> = {
  mateIn1: "Mate in one",
  mateIn2: "Mate in two",
};

export default function PuzzlesPage() {
  const [progress, setProgress] = useState<PuzzleProgress | null>(null);
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [board, setBoard] = useState<BoardState | null>(null);
  const [ply, setPly] = useState(0); // moves of the solution line played so far
  const [status, setStatus] = useState<Status>("solving");
  const [failedThis, setFailedThis] = useState(false); // rating already docked
  const [lastDelta, setLastDelta] = useState<number | null>(null);
  const [hintLevel, setHintLevel] = useState<0 | 1 | 2>(0);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const timerRef = useRef<number | null>(null);

  // localStorage is unavailable during SSR, so progress loads client-side.
  useEffect(() => {
    const p = loadPuzzleProgress();
    setProgress(p);
    startPuzzle(pickPuzzle(p));
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPuzzle = (z: PuzzleData) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const b = fenToBoard(z.fen);
    if (!b) return; // generated data is verified; this cannot happen
    setPuzzle(z);
    setBoard(b);
    setPly(0);
    setStatus("solving");
    setFailedThis(false);
    setLastDelta(null);
    setHintLevel(0);
    setLastMove(null);
  };

  const solverColor: Color = useMemo(() => {
    if (!puzzle) return "w";
    return fenToBoard(puzzle.fen)?.turn ?? "w";
  }, [puzzle]);

  const legal = useMemo(() => {
    if (!board || status === "solved" || board.turn !== solverColor) return [];
    return generateMoves(board);
  }, [board, status, solverColor]);

  const finishPuzzle = useCallback(
    (won: boolean) => {
      if (!progress || !puzzle) return;
      setLastDelta(ratingDelta(progress.rating, puzzle.rating, won));
      setProgress(applyPuzzleResult(progress, puzzle, won));
    },
    [progress, puzzle],
  );

  const markWrong = useCallback(() => {
    if (!failedThis) {
      setFailedThis(true);
      finishPuzzle(false);
    }
    setStatus("wrong");
  }, [failedThis, finishPuzzle]);

  const onMove = useCallback(
    (move: Move) => {
      if (!board || !puzzle || status === "solved") return;
      const expected = puzzle.line[ply];
      const isLastSolverMove = ply === puzzle.line.length - 1;
      const after = makeMove(board, move);
      // Any mating move counts on the final step, even off the scripted line.
      const correct = moveToUCI(move) === expected || (isLastSolverMove && isMated(after));

      if (!correct) {
        // Show the bad move briefly, then snap back for a retry.
        setBoard(after);
        setLastMove(move);
        markWrong();
        timerRef.current = window.setTimeout(() => {
          setBoard(board);
          setLastMove(ply > 0 ? lastMove : null);
          setStatus((s) => (s === "wrong" ? "solving" : s));
        }, 800);
        return;
      }

      setBoard(after);
      setLastMove(move);
      setHintLevel(0);
      if (isLastSolverMove) {
        setPly(ply + 1);
        setStatus("solved");
        if (!failedThis) finishPuzzle(true);
        return;
      }
      // Scripted opponent reply after a beat, like lichess.
      const replyUci = puzzle.line[ply + 1];
      timerRef.current = window.setTimeout(() => {
        const reply = generateMoves(after).find((m) => moveToUCI(m) === replyUci);
        if (!reply) return;
        setBoard(makeMove(after, reply));
        setLastMove(reply);
        setPly(ply + 2);
      }, 450);
      setPly(ply + 1);
    },
    [board, puzzle, status, ply, failedThis, lastMove, finishPuzzle, markWrong],
  );

  const retry = () => {
    if (!puzzle) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const b = fenToBoard(puzzle.fen);
    if (!b) return;
    setBoard(b);
    setPly(0);
    setStatus("solving");
    setLastMove(null);
    setHintLevel(0);
  };

  const next = () => {
    if (!progress) return;
    startPuzzle(pickPuzzle(progress, puzzle?.id));
  };

  const skip = () => {
    if (status !== "solved" && !failedThis) finishPuzzle(false);
    next();
  };

  const hint = () => {
    if (status === "solved") return;
    setHintLevel((h) => (h >= 2 ? 2 : ((h + 1) as 1 | 2)));
  };

  // Hint highlights: first press marks the piece to move, second the target.
  const hintSquares = useMemo(() => {
    if (!puzzle || hintLevel === 0 || status === "solved") return undefined;
    const uci = puzzle.line[ply];
    if (!uci) return undefined;
    const squares = [parseSquare(uci.slice(0, 2))];
    if (hintLevel === 2) squares.push(parseSquare(uci.slice(2, 4)));
    return { highlightSquares: squares };
  }, [puzzle, hintLevel, ply, status]);

  const expectedSan = useMemo(() => {
    if (!puzzle || !board || status !== "solved") return null;
    return puzzle.line
      .map((uci, i) => {
        const b = fenToBoard(puzzle.fen);
        if (!b) return uci;
        let cur = b;
        for (let j = 0; j < i; j++) {
          const m = generateMoves(cur).find((x) => moveToUCI(x) === puzzle.line[j]);
          if (!m) return uci;
          cur = makeMove(cur, m);
        }
        const m = generateMoves(cur).find((x) => moveToUCI(x) === uci);
        return m ? moveToSAN(m) : uci;
      })
      .join(" ");
  }, [puzzle, board, status]);

  return (
    <main className="min-h-screen">
      <SiteHeader active="/puzzles" />
      <section className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="mx-auto w-full max-w-[600px]">
            {board && puzzle ? (
              <Board
                board={board}
                legalMoves={legal}
                orientation={solverColor}
                onMove={onMove}
                myColor={solverColor}
                lastMove={lastMove}
                visual={hintSquares}
                disabled={status === "solved"}
              />
            ) : (
              <div className="aspect-square w-full plate" />
            )}
          </div>

          <aside className="flex flex-col gap-4">
            <div className="plate p-4">
              <h1 className="font-display text-lg text-parchment-50">Puzzles</h1>
              <p className="mt-1 text-sm text-parchment-400">
                {puzzle ? THEME_LABELS[puzzle.theme] : "Loading…"} ·{" "}
                {solverColor === "w" ? "White" : "Black"} to move
              </p>

              <div className="mt-3 border-t border-white/10 pt-3">
                {status === "solving" && (
                  <p className="text-sm text-parchment-100">
                    Find the best move for {solverColor === "w" ? "white" : "black"}.
                  </p>
                )}
                {status === "wrong" && (
                  <p className="flex items-center gap-2 text-sm text-oxblood-glow">
                    <XCircle size={16} /> That&apos;s not it — try again.
                  </p>
                )}
                {status === "solved" && (
                  <div className="text-sm">
                    <p className="flex items-center gap-2 text-green-400">
                      <CheckCircle2 size={16} /> {failedThis ? "Solved (with a miss)" : "Success!"}
                    </p>
                    {expectedSan && (
                      <p className="mt-1 font-mono text-xs text-parchment-400">{expectedSan}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {status === "solved" ? (
                  <button onClick={next} className="btn-leaf px-4 py-2 font-display text-sm font-semibold">
                    Next puzzle
                  </button>
                ) : (
                  <>
                    <button onClick={hint} className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-sm">
                      <Lightbulb size={14} /> Hint
                    </button>
                    <button onClick={retry} className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-sm">
                      <RotateCcw size={14} /> Restart
                    </button>
                    <button onClick={skip} className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-sm">
                      <SkipForward size={14} /> Skip
                    </button>
                  </>
                )}
              </div>
            </div>

            {progress && (
              <div className="plate p-4">
                <div className="smallcaps text-[10px] text-parchment-400">Your puzzle rating</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-3xl text-parchment-50">{Math.round(progress.rating)}</span>
                  {lastDelta != null && (
                    <span
                      className={
                        "font-mono text-sm " + (lastDelta >= 0 ? "text-green-400" : "text-oxblood-glow")
                      }
                    >
                      {lastDelta >= 0 ? `+${lastDelta}` : lastDelta}
                    </span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="font-mono text-lg text-parchment-100">{progress.streak}</div>
                    <div className="smallcaps text-[9px] text-parchment-400">Streak</div>
                  </div>
                  <div>
                    <div className="font-mono text-lg text-parchment-100">{progress.solved}</div>
                    <div className="smallcaps text-[9px] text-parchment-400">Solved</div>
                  </div>
                  <div>
                    <div className="font-mono text-lg text-parchment-100">{progress.bestStreak}</div>
                    <div className="smallcaps text-[9px] text-parchment-400">Best streak</div>
                  </div>
                </div>
                {status === "solved" && puzzle && (
                  <p className="mt-3 border-t border-white/10 pt-2 text-xs text-parchment-400">
                    Puzzle rating: <span className="font-mono text-parchment-100">{puzzle.rating}</span>
                  </p>
                )}
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
