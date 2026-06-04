"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { GameResult } from "@/engine/game";
import { Color } from "@/engine/types";
import { playGameOver } from "@/lib/sounds";

interface Props {
  result: GameResult;
  myColor: Color;
  ratingChange?: { before: number; after: number } | null;
  onRematch: () => void;
  onNewGame: () => void;
}

function splitReason(reason: string) {
  const marker = reason.indexOf(":");
  if (marker < 0) return { nerfName: "", cause: reason };
  return {
    nerfName: reason.slice(0, marker).trim(),
    cause: reason.slice(marker + 1).trim(),
  };
}

export function GameOver({ result, myColor, ratingChange, onRematch, onNewGame }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const reduceMotion = useReducedMotion();
  const draw = result.winner === "draw";
  const won = result.winner === myColor;
  const outcome = draw ? "Draw" : won ? "Victory" : "Defeat";
  const headline = draw ? "Draw by agreement" : result.winner === "w" ? "White wins" : "Black wins";
  const tone = draw ? "text-bruise-glow" : won ? "text-gold-leaf" : "text-oxblood-glow";
  const accent = draw
    ? "border-bruise-glow/40 bg-bruise/10 text-bruise-glow"
    : won
    ? "border-gold/50 bg-gold/10 text-gold-leaf"
    : "border-oxblood-glow/50 bg-oxblood/15 text-oxblood-glow";
  const { nerfName, cause } = useMemo(() => splitReason(result.reason), [result.reason]);
  const ratingDelta = ratingChange ? Math.round(ratingChange.after - ratingChange.before) : 0;

  useEffect(() => {
    playGameOver();
  }, []);

  useEffect(() => {
    if (dismissed) return;
    primaryRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDismissed(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismissed]);

  if (dismissed) return null;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
      aria-describedby="game-over-reason"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 grid place-items-center bg-[#0a111e]/65 px-4 py-6 backdrop-blur-sm"
      onMouseDown={() => setDismissed(true)}
    >
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { y: 16, scale: 0.96, opacity: 0 }}
        animate={reduceMotion ? { opacity: 1 } : { y: 0, scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="plate gilt relative w-[min(92vw,28rem)] overflow-hidden p-6 text-center shadow-2xl sm:p-7"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="card-corner tl" />
        <span className="card-corner tr" />
        <span className="card-corner bl" />
        <span className="card-corner br" />
        {!reduceMotion && (
          <motion.div
            aria-hidden="true"
            className={
              "pointer-events-none absolute inset-x-0 top-0 h-px " +
              (draw ? "bg-bruise-glow/60" : won ? "bg-gold-leaf/80" : "bg-oxblood-glow/80")
            }
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: [0, 1, 0.45], scaleX: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        )}

        <p className="smallcaps text-[10px] text-parchment-400">Game over</p>
        <h2 id="game-over-title" className={`mt-1 font-display text-5xl font-bold leading-none ${tone}`}>
          {outcome}
        </h2>
        <p className="mt-2 text-sm text-parchment-300">{headline}</p>

        <div id="game-over-reason" className="mt-5 flex flex-col items-center gap-2">
          {nerfName && (
            <span className={`max-w-full truncate rounded-sm border px-3 py-1 font-display text-xs font-semibold ${accent}`}>
              {nerfName}
            </span>
          )}
          <p className="max-w-sm text-balance text-base leading-relaxed text-parchment">
            {nerfName ? `Lost: ${cause}.` : cause}
          </p>
        </div>

        {ratingChange && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-sm border border-gold/25 bg-gold/5 px-3 py-2 font-mono text-sm">
            <span className="smallcaps text-[10px] text-parchment-400">Rating</span>
            <span className="text-parchment">{Math.round(ratingChange.after)}</span>
            <span
              className={
                ratingDelta >= 0 ? "text-gold-leaf" : "text-oxblood-glow"
              }
            >
              {ratingDelta >= 0 ? "+" : ""}
              {ratingDelta}
            </span>
          </div>
        )}

        <div className="mt-6 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <button
            ref={primaryRef}
            type="button"
            onClick={onRematch}
            className="rounded-sm px-5 py-2.5 btn-leaf font-display"
          >
            Rematch
          </button>
          <button
            type="button"
            onClick={onNewGame}
            className="rounded-sm px-5 py-2.5 btn-ghost font-display"
          >
            New Game
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-sm px-3 py-2.5 btn-ghost font-display text-sm opacity-85"
          >
            Review board
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
