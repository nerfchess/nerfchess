"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { GameResult } from "@/engine/game";
import { Color } from "@/engine/types";
import { playGameOver } from "@/lib/sounds";

interface Props {
  result: GameResult;
  myColor: Color;
  ratingChange?: { before: number; after: number } | null;
}

export function GameOver({ result, myColor, ratingChange }: Props) {
  const draw = result.winner === "draw";
  const won = result.winner === myColor;
  const headline = draw ? "Draw" : result.winner === "w" ? "White wins" : "Black wins";
  const tone = draw ? "text-bruise-glow" : won ? "text-gold-leaf" : "text-oxblood-glow";

  useEffect(() => {
    playGameOver();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed left-1/2 top-16 z-40 w-[min(92vw,24rem)] -translate-x-1/2"
    >
      <motion.div
        initial={{ scale: 0.96, y: -8, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 22 }}
        className="plate gilt relative overflow-hidden p-4 shadow-2xl"
      >
        <div className="smallcaps text-[10px] text-parchment-400">Game over</div>
        <div className={`mt-1 font-display text-3xl font-bold leading-tight ${tone}`}>
          {headline}
        </div>
        <div className="mt-2 text-sm leading-snug text-parchment-300">{result.reason}</div>
        {ratingChange && (
          <div className="mt-3 inline-flex items-center gap-3 rounded-full border border-gold/30 bg-gold/5 px-3 py-1.5">
            <span className="smallcaps text-[10px] text-parchment-400">Your rating</span>
            <span className="font-mono text-sm text-parchment">{Math.round(ratingChange.after)}</span>
            {(() => {
              const delta = Math.round(ratingChange.after - ratingChange.before);
              if (delta === 0) return <span className="font-mono text-xs text-parchment-400">+0</span>;
              const sign = delta > 0 ? "+" : "";
              const deltaTone = delta > 0 ? "text-gold-leaf" : "text-oxblood-glow";
              return <span className={`font-mono text-xs ${deltaTone}`}>{sign}{delta}</span>;
            })()}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
