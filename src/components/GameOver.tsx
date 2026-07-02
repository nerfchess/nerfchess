"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { GameResult } from "@/engine/game";
import { Color } from "@/engine/types";
import { Nerf } from "@/engine/nerf";
import { playGameOver } from "@/lib/sounds";

const TIER_LABEL = ["", "Trivial", "Easy", "Common", "Severe", "Brutal"];
const TIER_ROMAN = ["", "I", "II", "III", "IV", "V"];

interface Props {
  result: GameResult;
  myColor: Color;
  myNerf?: Nerf;
  opponentNerf?: Nerf;
  ratingChange?: { before: number; after: number } | null;
  onRematch: () => void;
  onNewGame: () => void;
  onReview?: () => void;
  // Online games negotiate rematches over the wire: "offered" = waiting for
  // the opponent, "incoming" = the opponent wants one.
  rematchStatus?: "none" | "offered" | "incoming";
  // When true (the "keep opponent rules hidden" setting), the opponent's rule
  // starts face-down behind a "Reveal opponent's nerf" button.
  opponentHidden?: boolean;
}

// A single revealed rule row for the post game summary. Both players' rules are
// shown once the game is over, so the "secret" finally pays off.
function RuleReveal({ label, nerf }: { label: string; nerf: Nerf }) {
  return (
    <div className={`border p-3 text-left tier-bg-${nerf.tier}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="smallcaps text-[9px] text-parchment-400">{label}</span>
        <span
          className={`inline-flex items-center gap-1 border px-1.5 py-0.5 font-display text-[10px] font-bold tier-bg-${nerf.tier} tier-${nerf.tier}`}
          title={`Difficulty ${nerf.tier}: ${TIER_LABEL[nerf.tier]}`}
        >
          <span aria-hidden>{TIER_ROMAN[nerf.tier]}</span>
          <span>{TIER_LABEL[nerf.tier]}</span>
        </span>
      </div>
      <div className={`mt-1 font-display text-base font-semibold leading-tight tier-${nerf.tier}`}>
        {nerf.name}
      </div>
      <p className="mt-1 text-xs leading-snug text-parchment-200">{nerf.description}</p>
    </div>
  );
}

function splitReason(reason: string) {
  const marker = reason.indexOf(":");
  if (marker < 0) return { nerfName: "", cause: reason };
  return {
    nerfName: reason.slice(0, marker).trim(),
    cause: reason.slice(marker + 1).trim(),
  };
}

export function GameOver({
  result,
  myColor,
  myNerf,
  opponentNerf,
  ratingChange,
  onRematch,
  onNewGame,
  onReview,
  rematchStatus = "none",
  opponentHidden = false,
}: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [shared, setShared] = useState(false);
  const [oppRevealed, setOppRevealed] = useState(!opponentHidden);
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

  // Share copies a short text summary of the game (result plus both rules) to
  // the clipboard. It works client side today; a hosted replay link can be
  // dropped in later without changing the button.
  const handleShare = async () => {
    const lines = [
      `Nerf Chess: ${outcome}`,
      myNerf ? `My rule: ${myNerf.name} (${myNerf.description})` : null,
      opponentNerf && oppRevealed
        ? `Opponent rule: ${opponentNerf.name} (${opponentNerf.description})`
        : null,
      typeof window !== "undefined" ? window.location.origin : "https://nerfchess.com",
    ].filter(Boolean);
    const text = lines.join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setShared(true);
      window.setTimeout(() => setShared(false), 2000);
    } catch {
      // User dismissed the share sheet or clipboard was blocked; ignore.
    }
  };

  const handleReview = () => {
    onReview?.();
    setDismissed(true);
  };

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

        {(myNerf || opponentNerf) && (
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {myNerf && <RuleReveal label="Your rule" nerf={myNerf} />}
            {opponentNerf &&
              (oppRevealed ? (
                <RuleReveal label="Opponent rule" nerf={opponentNerf} />
              ) : (
                <button
                  type="button"
                  onClick={() => setOppRevealed(true)}
                  className="flex min-h-[6.5rem] flex-col items-center justify-center gap-2 border border-white/15 bg-white/[0.03] p-3 text-parchment-200 transition hover:border-gold/50 hover:bg-gold/10 hover:text-gold-leaf"
                >
                  <span
                    aria-hidden
                    className="grid h-8 w-8 place-items-center rounded-full border border-gold/40 bg-gold/10 font-display text-lg font-bold text-gold/80"
                  >
                    ?
                  </span>
                  <span className="font-display text-sm font-semibold">
                    Reveal opponent&apos;s nerf
                  </span>
                </button>
              ))}
          </div>
        )}

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button
            ref={primaryRef}
            type="button"
            onClick={onRematch}
            disabled={rematchStatus === "offered"}
            className={
              "rounded-sm px-5 py-2.5 font-display " +
              (rematchStatus === "offered"
                ? "btn-ghost opacity-70 cursor-default"
                : "btn-leaf" + (rematchStatus === "incoming" ? " animate-flicker" : ""))
            }
          >
            {rematchStatus === "offered"
              ? "Rematch offered…"
              : rematchStatus === "incoming"
              ? "Accept rematch"
              : "Rematch"}
          </button>
          <button
            type="button"
            onClick={onNewGame}
            className="rounded-sm px-5 py-2.5 btn-ghost font-display"
          >
            New game
          </button>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleShare}
            className="rounded-sm px-4 py-2 btn-ghost font-display text-sm inline-flex items-center justify-center gap-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            {shared ? "Copied" : "Share game"}
          </button>
          <button
            type="button"
            onClick={handleReview}
            className="rounded-sm px-4 py-2 btn-ghost font-display text-sm inline-flex items-center justify-center gap-2"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            Replay
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
