"use client";

import { BuffOffer } from "@/engine/buff";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { playDraftChime } from "@/lib/sounds";
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
  /** Called once when the free lock-in window ends. The offer stays open:
   * the parent minimizes this overlay to the side and resumes the clock, so
   * further deliberation costs the player's own time. */
  onExpire?: () => void;
  /** Free window over: render as a compact side panel instead of a blocking
   * overlay. The board is visible again and picking still works. */
  minimized?: boolean;
  /** What the cards are called in this mode ("buff", or "hex" in nerf mode,
   * where the pool mixes opponent hexes with self boons and items). */
  cardNoun?: string;
  /** The opponent resolved their simultaneous draft while you are choosing. */
  oppLockedIn?: boolean;
  /** The opponent's resolution was a bank, not a pick (refines the badge). */
  oppBanked?: boolean;
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

/** Thin lock-in countdown: bar plus seconds. Silent by design: picking a
 * card should not come with time-pressure noise. */
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
  // The interval closure survives re-renders; always call the latest
  // onExpire so it sees current selection state, not a stale snapshot.
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    expiredRef.current = false;
    const id = window.setInterval(() => {
      const left = Math.max(0, deadline - Date.now());
      setLeftMs(left);
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current?.();
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
  minimized,
  cardNoun = "buff",
  oppLockedIn,
  oppBanked,
  opponent,
}: Props) {
  const noun = cardNoun;
  const nounCap = noun.charAt(0).toUpperCase() + noun.slice(1);
  const oppOffer = opponent?.offer ?? null;
  // Two-step pick: the first click only selects (highlight); the Confirm
  // button (or a second click on the same card) locks it in. `chosen` is the
  // confirmed card sliding toward the dock before the pick is committed:
  // fast and subtle, well under half a second.
  const [selected, setSelected] = useState<number | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    setSelected(null);
    setChosen(null);
    committedRef.current = false;
    // A fresh offer demands attention: the board is blocked until it resolves.
    playDraftChime();
  }, [offer.index]);

  const choose = (i: number) => {
    if (chosen != null) return;
    if (selected === i) {
      // Second click on the selected card confirms it.
      setChosen(i);
      return;
    }
    setSelected(i);
  };

  const confirmSelection = () => {
    if (chosen != null || selected == null) return;
    setChosen(selected);
  };

  const commit = (i: number) => {
    if (committedRef.current) return;
    committedRef.current = true;
    onPick(i);
  };

  // Free window over: the pick stays open, but from here on it runs on the
  // player's own clock. The parent minimizes the overlay to the side.
  const handleExpire = () => {
    if (committedRef.current || chosen != null) return;
    onExpire?.();
  };

  if (minimized) {
    return (
      <div className="fixed bottom-16 right-3 z-40 w-[min(92vw,19rem)] sm:bottom-4">
        <motion.div
          initial={{ opacity: 0, x: 80, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="plate border-gold/40 p-3 shadow-plate"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="smallcaps text-[10px] text-parchment-400">
              {nounCap} draft #{offer.index}
            </span>
            <span className="smallcaps text-[9px] text-oxblood-glow">On your clock</span>
          </div>
          {takeBoth ? (
            <p className="mt-1 text-[11px] font-semibold leading-snug text-gold-leaf">
              You take BOTH cards: picking any card takes the whole offer.
            </p>
          ) : (
            <p className="mt-1 text-[11px] leading-snug text-parchment-300">
              Still yours to pick, but the clock is running now.
            </p>
          )}
          <div className="mt-2 space-y-1.5">
            {offer.cards.map((card, i) => {
              const def = BUFF_BY_ID[card.id];
              if (!def) return null;
              return (
                <div key={i} className={selected === i ? "ring-2 ring-gold" : ""}>
                  <BuffCard
                    buff={def}
                    tier={card.tier}
                    compact
                    onClick={
                      chosen == null
                        ? () => (selected === i ? (setChosen(i), commit(i)) : setSelected(i))
                        : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-2">
            {selected != null && chosen == null && (
              <button
                onClick={() => {
                  setChosen(selected);
                  commit(selected);
                }}
                className="btn-leaf flex-1 px-3 py-1.5 font-display text-xs font-semibold tracking-wide"
              >
                Confirm pick
              </button>
            )}
            <button
              onClick={chosen == null ? onBank : undefined}
              disabled={chosen != null}
              className="flex-1 border border-white/15 bg-white/[0.03] px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide text-parchment-200 transition hover:border-gold/50 hover:text-gold-leaf disabled:opacity-40"
              title="Skip this draft; your next one pulls from a tier higher"
            >
              Skip &amp; bank
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-3 sm:px-4">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="plate min-w-0 w-full max-w-2xl max-h-[90dvh] overflow-y-auto overflow-x-hidden p-5 sm:p-8 lg:max-w-3xl"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="smallcaps text-[11px] text-parchment-400">{nounCap} draft #{offer.index}</div>
          {oppLockedIn && (
            <div
              role="status"
              className="flex items-center gap-1.5 border border-verdigris-glow/50 bg-verdigris/10 px-2 py-0.5"
            >
              <span aria-hidden className="text-[11px] text-verdigris-glow">✓</span>
              <span className="font-display text-[11px] font-semibold text-verdigris-glow">
                {oppBanked ? "Opponent banked" : "Opponent locked in"}
              </span>
            </div>
          )}
        </div>
        <h2 className="font-display text-3xl text-parchment mt-1">
          {takeBoth
            ? "Take your cards"
            : noun === "hex"
            ? "Choose a hex or a boon"
            : `Choose a ${noun}`}
        </h2>
        {takeBoth && (
          <div
            role="status"
            className="mt-2 inline-flex items-center gap-2 border border-gold/60 bg-gold/15 px-3 py-1"
          >
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 bg-gold-leaf animate-flicker" />
            <span className="font-display text-xs font-bold tracking-wide text-gold-leaf">
              You take BOTH cards this draft
            </span>
          </div>
        )}
        <p className="mt-1 text-sm text-parchment-300">
          {takeBoth
            ? "A draft-manipulation card lets you take every card in this offer."
            : "Pick one card, or skip and bank the draft to pull from one tier higher next time."}
          {!takeBoth &&
            noun === "hex" &&
            " Hexes curse your opponent; boons and items help you."}
          {bankedBonus && " This draft rolled a tier higher thanks to your banked skip."}
        </p>
        {deadline != null && (
          <>
            <LockInCountdown deadline={deadline} onExpire={handleExpire} className="mt-3" />
            <p className="mt-1 text-[10px] text-parchment-400">
              When the timer runs out this panel moves aside and further thinking costs your own time.
            </p>
          </>
        )}

        <div className={`mt-5 grid gap-3 lg:gap-4 ${offer.cards.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {offer.cards.map((card, i) => {
            const def = BUFF_BY_ID[card.id];
            if (!def) return null;
            return (
              <motion.div
                key={i}
                className={
                  "mx-auto w-full max-w-md sm:max-w-none " +
                  (selected === i && chosen == null
                    ? "ring-2 ring-gold shadow-leaf"
                    : selected != null && chosen == null
                    ? "opacity-60"
                    : "")
                }
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
                <BuffCard
                  buff={def}
                  tier={card.tier}
                  enterDelayMs={i * 70}
                  onClick={chosen == null ? () => choose(i) : undefined}
                />
              </motion.div>
            );
          })}
        </div>

        {selected != null && chosen == null && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={confirmSelection}
              className="btn-leaf px-6 py-2.5 font-display text-sm font-semibold tracking-wide"
            >
              Confirm pick
            </button>
            <span className="text-[11px] text-parchment-400">
              Clicking the card again also confirms.
            </span>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={chosen == null ? onBank : undefined}
            disabled={chosen != null}
            className="w-full sm:w-auto shrink-0 px-4 py-2 border border-white/15 bg-white/[0.03] text-parchment-200 hover:border-gold/50 hover:text-gold-leaf transition text-xs font-display font-semibold tracking-wide disabled:opacity-40"
            title="Skip this draft; your next one pulls from a tier higher"
          >
            Skip &amp; bank (+1 tier next draft)
          </button>
          {opponent && (
            <div className="min-w-0 w-full break-words text-left sm:w-auto sm:text-right text-[11px] text-parchment-400 leading-snug">
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
