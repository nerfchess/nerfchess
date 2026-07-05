"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { GameResult } from "@/engine/game";
import { Color, Move } from "@/engine/types";
import { Nerf } from "@/engine/nerf";
import { BuffInstance } from "@/engine/buff";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { gameToPGN } from "@/lib/pgn";
import { playGameOver } from "@/lib/sounds";
import { ThumbsDown, ThumbsUp } from "lucide-react";

import { TIER_LABEL, TIER_ROMAN } from "@/lib/tiers";

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
  // When provided, a "Copy PGN" button exports the move list.
  moves?: Move[];
  playerNames?: Record<Color, string>;
  startedAt?: number;
  // When provided, dismissal is delegated to the parent (which can re-show
  // the screen later); otherwise the component hides itself permanently.
  onDismiss?: () => void;
  // Server game id, attached to rule feedback votes.
  gameId?: string;
  // Draft games: the buffs I held during the game, offered for balance votes.
  myBuffs?: BuffInstance[];
}

// The shared compact thumbs pair. One vote per item; re-clicking replaces it
// (optimistically here, INSERT OR REPLACE server side).
function VoteThumbs({ vote, onVote }: { vote: 1 | -1 | null; onVote: (value: 1 | -1) => void }) {
  return (
    <span className="flex gap-1">
      <button
        type="button"
        aria-label="Thumbs up"
        onClick={() => onVote(1)}
        className={
          "grid h-7 w-7 place-items-center border transition " +
          (vote === 1
            ? "border-verdigris/60 bg-verdigris/20 text-verdigris-glow"
            : "border-white/15 text-parchment-300 hover:border-verdigris/50 hover:text-verdigris-glow")
        }
      >
        <ThumbsUp size={13} />
      </button>
      <button
        type="button"
        aria-label="Thumbs down"
        onClick={() => onVote(-1)}
        className={
          "grid h-7 w-7 place-items-center border transition " +
          (vote === -1
            ? "border-oxblood-glow/60 bg-oxblood/20 text-oxblood-glow"
            : "border-white/15 text-parchment-300 hover:border-oxblood-glow/50 hover:text-oxblood-glow")
        }
      >
        <ThumbsDown size={13} />
      </button>
    </span>
  );
}

// One-tap verdict on the rule you were dealt; lands in the moderators' rule
// feedback queue so unpopular rules get rebalanced.
function RuleFeedback({ nerfId, gameId }: { nerfId: string; gameId?: string }) {
  const [vote, setVote] = useState<1 | -1 | null>(null);

  const cast = async (value: 1 | -1) => {
    setVote(value);
    try {
      await fetch("/api/nerf-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nerfId, vote: value, ...(gameId ? { gameId } : {}) }),
      });
    } catch {}
  };

  return (
    <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/10 pt-2">
      <span className="text-[11px] text-parchment-400">
        {vote ? "Thanks for the feedback" : "Like this rule?"}
      </span>
      <VoteThumbs vote={vote} onVote={cast} />
    </div>
  );
}

// Same one-tap verdict for a buff drafted during the game; lands in the
// moderators' buff feedback queue.
function BuffFeedbackRow({ buff, gameId }: { buff: BuffInstance; gameId?: string }) {
  const def = BUFF_BY_ID[buff.id];
  const [vote, setVote] = useState<1 | -1 | null>(null);

  const cast = async (value: 1 | -1) => {
    setVote(value);
    try {
      await fetch("/api/buff-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buffId: buff.id, vote: value, ...(gameId ? { gameId } : {}) }),
      });
    } catch {}
  };

  if (!def) return null;
  return (
    <li className="py-1">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={`shrink-0 border px-1 font-display text-[10px] font-bold tier-bg-${buff.tier} tier-${buff.tier}`}
            title={`Tier ${buff.tier}: ${TIER_LABEL[buff.tier]}`}
            aria-hidden
          >
            {TIER_ROMAN[buff.tier]}
          </span>
          <span className="min-w-0 truncate text-xs text-parchment-200">{def.name}</span>
        </span>
        <VoteThumbs vote={vote} onVote={cast} />
      </div>
      {/* The rule text always shows — a card's effect should never hide
          behind a hover tooltip. */}
      <p className="mt-0.5 text-left text-[10px] leading-snug text-parchment-400">
        {def.description}
      </p>
    </li>
  );
}

// A single revealed rule row for the post game summary. Both players' rules are
// shown once the game is over, so the "secret" finally pays off.
function RuleReveal({ label, nerf, children }: { label: string; nerf: Nerf; children?: ReactNode }) {
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
      {children}
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

// The game-over chime fires once per finished game, not once per mount:
// dismissing and reopening the result screen, or a reconnect replaying the
// end frame, remounts this component and must stay silent.
const playedGameOverKeys = new Set<string>();

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
  moves,
  playerNames,
  startedAt,
  onDismiss,
  gameId,
  myBuffs,
}: Props) {
  const [dismissed, setDismissed] = useState(false);
  const dismiss = useCallback(() => {
    if (onDismiss) onDismiss();
    else setDismissed(true);
  }, [onDismiss]);
  const [shared, setShared] = useState(false);
  const [pgnCopied, setPgnCopied] = useState(false);
  const [oppRevealed, setOppRevealed] = useState(!opponentHidden);
  const primaryRef = useRef<HTMLButtonElement | null>(null);
  const reduceMotion = useReducedMotion();
  const draw = result.winner === "draw";
  const won = result.winner === myColor;
  const outcome = draw ? "Draw" : won ? "Victory" : "Defeat";
  // Draws carry their cause in the reason ("draw by agreement", "draw by
  // threefold repetition", ...); surface it instead of assuming agreement.
  const headline = draw
    ? result.reason.charAt(0).toUpperCase() + result.reason.slice(1)
    : result.winner === "w"
    ? "White wins"
    : "Black wins";
  const tone = draw ? "text-bruise-glow" : won ? "text-gold-leaf" : "text-oxblood-glow";
  const accent = draw
    ? "border-bruise-glow/40 bg-bruise/10 text-bruise-glow"
    : won
    ? "border-gold/50 bg-gold/10 text-gold-leaf"
    : "border-oxblood-glow/50 bg-oxblood/15 text-oxblood-glow";
  const { nerfName, cause } = useMemo(() => splitReason(result.reason), [result.reason]);
  const ratingDelta = ratingChange ? Math.round(ratingChange.after - ratingChange.before) : 0;
  // One feedback row per buff id, even if copies were drafted (Mirror etc.);
  // the server keys votes per player per buff anyway.
  const ratableBuffs = useMemo(() => {
    const seen = new Set<string>();
    return (myBuffs ?? []).filter((b) => {
      if (seen.has(b.id) || !BUFF_BY_ID[b.id]) return false;
      seen.add(b.id);
      return true;
    });
  }, [myBuffs]);

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
    dismiss();
  };

  // Copy PGN honors the hidden-rule setting: the opponent's nerf appears in
  // the export only once it has been revealed on screen.
  const handleCopyPGN = async () => {
    if (!moves) return;
    const myNerfName = myNerf?.name ?? null;
    const oppNerfName = oppRevealed ? opponentNerf?.name ?? null : null;
    const pgn = gameToPGN({
      moves,
      result,
      white: playerNames?.w,
      black: playerNames?.b,
      whiteNerf: myColor === "w" ? myNerfName : oppNerfName,
      blackNerf: myColor === "b" ? myNerfName : oppNerfName,
      startedAt,
    });
    try {
      await navigator.clipboard.writeText(pgn);
      setPgnCopied(true);
      window.setTimeout(() => setPgnCopied(false), 2000);
    } catch {
      // Clipboard blocked; ignore.
    }
  };

  useEffect(() => {
    const key = gameId ?? (startedAt != null ? `local:${startedAt}` : null);
    if (key) {
      if (playedGameOverKeys.has(key)) return;
      playedGameOverKeys.add(key);
    }
    playGameOver();
    // Mount-only by design: the key identifies the game, not a render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (dismissed) return;
    primaryRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismissed, dismiss]);

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
      onMouseDown={dismiss}
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
            {myNerf && (
              <RuleReveal label="Your rule" nerf={myNerf}>
                <RuleFeedback nerfId={myNerf.id} gameId={gameId} />
              </RuleReveal>
            )}
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

        {ratableBuffs.length > 0 && (
          <div className="mt-2 border border-white/10 bg-white/[0.02] p-3 text-left">
            <div className="flex items-baseline justify-between gap-2">
              <span className="smallcaps text-[9px] text-parchment-400">Was it balanced?</span>
              <span className="text-[11px] text-parchment-400">Rate the buffs you drafted</span>
            </div>
            <ul className="mt-1 max-h-40 divide-y divide-white/5 overflow-y-auto">
              {ratableBuffs.map((buff) => (
                <BuffFeedbackRow key={buff.id} buff={buff} gameId={gameId} />
              ))}
            </ul>
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
        <div className={`mt-2 grid gap-2 ${moves ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
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
          {moves && (
            <button
              type="button"
              onClick={handleCopyPGN}
              className="rounded-sm px-4 py-2 btn-ghost font-display text-sm inline-flex items-center justify-center gap-2"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {pgnCopied ? "Copied" : "Copy PGN"}
            </button>
          )}
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
