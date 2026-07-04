"use client";

import { BuffOffer } from "@/engine/buff";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { playCountdownTick } from "@/lib/sounds";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { BuffCard } from "./BuffCard";

interface Props {
  offer: BuffOffer;
  /** Take-both is active: picking any card takes the whole offer. */
  takeBoth?: boolean;
  /** This offer rolled one tier up thanks to a banked skip. */
  bankedBonus?: boolean;
  onPick: (index: number) => void;
  onBank: () => void;
  /** Lock-in deadline (ms epoch). The countdown renders while set. */
  deadline?: number | null;
  /** Called once when the deadline passes (bot games auto-resolve locally;
   * online games leave this unset and let the server resolve). */
  onExpire?: () => void;
  /** The opponent resolved their simultaneous draft while you are choosing. */
  oppLockedIn?: boolean;
  /** What we can legitimately show about the opponent's draft. */
  opponent?: {
    offer: BuffOffer | null;
    showCards: boolean;
    showTier: boolean;
    /** One-shot reveal snapshot (Peek, Quick Glance, Draft Insight). */
    reveal?: { index: number; cards?: { id: string; tier: number }[]; tier?: number } | null;
    lastPick?: { id: string; tier: number } | null;
  };
}

/** Thin lock-in countdown: bar plus seconds, ticking under 6 seconds. */
export function LockInCountdown({
  deadline,
  onExpire,
  className = "",
}: {
  deadline: number;
  onExpire?: () => void;
  className?: string;
}) {
  const total = 15_000;
  const [leftMs, setLeftMs] = useState(() => Math.max(0, deadline - Date.now()));
  const expiredRef = useRef(false);
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    expiredRef.current = false;
    const id = window.setInterval(() => {
      const left = Math.max(0, deadline - Date.now());
      setLeftMs(left);
      const seconds = Math.ceil(left / 1000);
      if (left > 0 && seconds <= 5 && lastTickRef.current !== seconds) {
        lastTickRef.current = seconds;
        playCountdownTick();
      }
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    }, 100);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  const seconds = Math.ceil(leftMs / 1000);
  const fraction = Math.max(0, Math.min(1, leftMs / total));
  const urgent = leftMs <= 5000;
  return (
    <div className={"flex items-center gap-2 " + className} role="timer" aria-label="Lock-in timer">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={"h-full transition-[width] duration-100 " + (urgent ? "bg-oxblood-glow" : "bg-gold-leaf")}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <span
        className={
          "w-6 shrink-0 text-right font-mono text-sm font-bold tabular-nums " +
          (urgent ? "text-oxblood-glow" : "text-gold-leaf")
        }
      >
        {seconds}
      </span>
    </div>
  );
}

export function DraftOverlay({
  offer,
  takeBoth,
  bankedBonus,
  onPick,
  onBank,
  deadline,
  onExpire,
  oppLockedIn,
  opponent,
}: Props) {
  const oppOffer = opponent?.offer ?? null;
  // The chosen card slides toward the dock before the pick is committed:
  // fast and subtle, well under half a second.
  const [chosen, setChosen] = useState<number | null>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    setChosen(null);
    committedRef.current = false;
  }, [offer.index]);

  const choose = (i: number) => {
    if (chosen != null) return;
    setChosen(i);
  };

  const commit = (i: number) => {
    if (committedRef.current) return;
    committedRef.current = true;
    onPick(i);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="plate w-full max-w-2xl max-h-[90dvh] overflow-y-auto p-6 sm:p-8"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="smallcaps text-[11px] text-parchment-400">Buff draft #{offer.index}</div>
          {oppLockedIn && (
            <div
              role="status"
              className="flex items-center gap-1.5 border border-verdigris-glow/50 bg-verdigris/10 px-2 py-0.5"
            >
              <span aria-hidden className="text-[11px] text-verdigris-glow">✓</span>
              <span className="font-display text-[11px] font-semibold text-verdigris-glow">
                Opponent locked in
              </span>
            </div>
          )}
        </div>
        <h2 className="font-display text-3xl text-parchment mt-1">
          {takeBoth ? "Take your cards" : "Choose a buff"}
        </h2>
        <p className="mt-1 text-sm text-parchment-300">
          {takeBoth
            ? "A draft-manipulation buff lets you take every card in this offer."
            : "Pick one card, or skip and bank the draft to pull from one tier higher next time."}
          {bankedBonus && " This draft rolled a tier higher thanks to your banked skip."}
        </p>
        {deadline != null && (
          <LockInCountdown deadline={deadline} onExpire={onExpire} className="mt-3" />
        )}

        <div className={`mt-5 grid gap-3 ${offer.cards.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {offer.cards.map((card, i) => {
            const def = BUFF_BY_ID[card.id];
            if (!def) return null;
            return (
              <motion.div
                key={i}
                animate={
                  chosen === i
                    ? { x: -140, y: 180, scale: 0.35, opacity: 0 }
                    : chosen != null
                    ? { opacity: 0.15 }
                    : {}
                }
                transition={{ duration: 0.3, ease: "easeIn" }}
                onAnimationComplete={() => {
                  if (chosen === i) commit(i);
                }}
              >
                <BuffCard buff={def} tier={card.tier} onClick={chosen == null ? () => choose(i) : undefined} />
              </motion.div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            onClick={chosen == null ? onBank : undefined}
            disabled={chosen != null}
            className="px-4 py-2 border border-white/15 bg-white/[0.03] text-parchment-200 hover:border-gold/50 hover:text-gold-leaf transition text-xs font-display font-semibold tracking-wide disabled:opacity-40"
            title="Skip this draft; your next one pulls from a tier higher"
          >
            Skip &amp; bank (+1 tier next draft)
          </button>
          {opponent && (
            <div className="text-right text-[11px] text-parchment-400 leading-snug">
              {oppOffer && opponent.showCards ? (
                <span>
                  Opponent&apos;s draft:{" "}
                  {oppOffer.cards
                    .map((c) => `${BUFF_BY_ID[c.id]?.name ?? c.id} (T${c.tier})`)
                    .join(" · ")}
                </span>
              ) : oppOffer && opponent.showTier ? (
                <span>
                  Opponent is drafting at tier{" "}
                  {Math.max(...oppOffer.cards.map((c) => c.tier))}
                </span>
              ) : opponent.reveal?.cards ? (
                <span>
                  Revealed draft #{opponent.reveal.index}:{" "}
                  {opponent.reveal.cards
                    .map((c) => `${BUFF_BY_ID[c.id]?.name ?? c.id} (T${c.tier})`)
                    .join(" · ")}
                </span>
              ) : opponent.reveal?.tier != null ? (
                <span>
                  Revealed draft #{opponent.reveal.index} rolled tier {opponent.reveal.tier}
                </span>
              ) : opponent.lastPick && BUFF_BY_ID[opponent.lastPick.id] ? (
                <span>
                  Opponent last drafted:{" "}
                  {BUFF_BY_ID[opponent.lastPick.id]?.name}
                </span>
              ) : (
                <span>Opponent&apos;s draft is hidden</span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
