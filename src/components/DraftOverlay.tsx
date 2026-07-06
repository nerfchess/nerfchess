"use client";

import { BuffOffer } from "@/engine/buff";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { playDraftChime } from "@/lib/sounds";
import { TIER_ROMAN } from "@/lib/tiers";
import { BuffCard } from "./BuffCard";
import "./DraftOverlay.css";

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

/** Shared countdown tick: milliseconds left plus a one-shot expiry callback
 * that always sees the latest closure. */
function useCountdown(deadline: number, onExpire?: () => void) {
  const [leftMs, setLeftMs] = useState(() => Math.max(0, deadline - Date.now()));
  const expiredRef = useRef(false);
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
  }, [deadline]);

  return leftMs;
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
  const leftMs = useCountdown(deadline, onExpire);
  const seconds = Math.ceil(leftMs / 1000);
  const fraction = Math.max(0, Math.min(1, leftMs / total));
  const urgent = leftMs <= 5000;
  return (
    <div className={"flex items-center gap-2 " + className} role="timer" aria-label="Lock-in timer">
      <div className="h-1 flex-1 overflow-hidden rounded-[1px] bg-white/10">
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

/** The draft clock as its own chip, sitting centered immediately above
 * the draft panel (they share a flex column, so the chip travels with the
 * plate): a ring that drains with the free window plus big tabular digits.
 * Separate from the card panel so time pressure reads at a glance without
 * crowding the cards. */
function DraftTimerWindow({ deadline, onExpire }: { deadline: number; onExpire?: () => void }) {
  const total = 15_000;
  const leftMs = useCountdown(deadline, onExpire);
  const seconds = Math.ceil(leftMs / 1000);
  const fraction = Math.max(0, Math.min(1, leftMs / total));
  const urgent = leftMs <= 5000;
  // r=15.5 keeps the 2.5-width stroke inside the 36px viewBox.
  const CIRC = 2 * Math.PI * 15.5;
  return (
    <div role="timer" aria-label="Draft lock-in timer" className="pointer-events-none shrink-0">
      <div className={"draft-timer flex items-center gap-3 px-4 py-2 " + (urgent ? "draft-timer--urgent" : "")}>
        <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden className="-rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke={urgent ? "#dc5a54" : "#4a9fee"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - fraction)}
            style={{ transition: "stroke-dashoffset 100ms linear, stroke 300ms ease" }}
          />
        </svg>
        <div className="leading-none">
          <div className="smallcaps text-[9px] text-parchment-400">Lock in</div>
          <div
            className={
              "mt-1 font-mono text-2xl font-bold tabular-nums " +
              (urgent ? "text-oxblood-glow" : "text-parchment-50")
            }
          >
            {seconds}
            <span className="ml-0.5 text-sm font-semibold text-parchment-400">s</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small inline check mark (no text glyphs, no emoji). */
function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" width="10" height="10" className={"shrink-0 " + className}>
      <path d="M2 6.5 4.8 9.3 10 2.9" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

/** Where the confirmed card flies: the buff dock ("your pocket") if it is
 * visible, otherwise off toward the bottom-left where the mobile drawer
 * lives. Returns the translation from the card's current center. */
function pocketDelta(cardEl: HTMLElement | null): { dx: number; dy: number } {
  const fallback = { dx: -180, dy: 220 };
  if (!cardEl) return fallback;
  const c = cardEl.getBoundingClientRect();
  const cx = c.left + c.width / 2;
  const cy = c.top + c.height / 2;
  const dock = document.querySelector("[data-buff-dock]");
  if (dock) {
    const d = (dock as HTMLElement).getBoundingClientRect();
    // A hidden dock (mobile: it lives in a closed drawer) measures ~0.
    if (d.width > 40 && d.height > 40) {
      return {
        dx: d.left + d.width / 2 - cx,
        dy: d.top + Math.min(d.height / 2, 140) - cy,
      };
    }
  }
  // Mobile: the buff drawer handle sits along the bottom edge.
  return { dx: -cx + 48, dy: window.innerHeight - cy - 24 };
}

/** Translation from a card's center to the Skip button ("the bank"). */
function bankDelta(cardEl: HTMLElement | null, bankEl: HTMLElement | null): { dx: number; dy: number } {
  const fallback = { dx: 0, dy: 240 };
  if (!cardEl || !bankEl) return fallback;
  const c = cardEl.getBoundingClientRect();
  const b = bankEl.getBoundingClientRect();
  return {
    dx: b.left + b.width / 2 - (c.left + c.width / 2),
    dy: b.top + b.height / 2 - (c.top + c.height / 2),
  };
}

// Deal choreography budget: three cards fully dealt and flipped in under
// ~900ms. Cards fly from a face-down stack at the bottom center of the
// panel to their slots with a stagger, then flip face-up; higher tiers flip
// a touch later so the best card is the last reveal.
const DEAL_STAGGER_MS = 80;
const DEAL_MS = 280;
const FLIP_MS = 300;
const DEAL_TOTAL_MS = 900;
const flipDelayMs = (i: number, tier: number) => i * DEAL_STAGGER_MS + DEAL_MS + 40 + tier * 12;

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
  const reduceMotion = useReducedMotion();
  // Two-step pick: the first click only selects (highlight); the Confirm
  // button (or a second click on the same card) locks it in. `chosen` is the
  // confirmed card sliding into the pocket (the buff dock) before the pick
  // commits.
  const [selected, setSelected] = useState<number | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  // Skip and bank: the cards flip back face-down and slide into a bank stack
  // (toward the Skip button) before the overlay closes.
  const [banking, setBanking] = useState(false);
  const [bankDeltas, setBankDeltas] = useState<{ dx: number; dy: number }[] | null>(null);
  // True once the deal has settled: later animations (dim, select) run
  // without the deal's stagger delays.
  const [dealt, setDealt] = useState(false);
  // Measured flight path from the chosen card to the dock, captured at
  // confirm time (measuring during render would thrash layout).
  const [pocket, setPocket] = useState<{ dx: number; dy: number } | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const bankBtnRef = useRef<HTMLButtonElement | null>(null);
  const bankTimer = useRef<number | null>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    setSelected(null);
    setChosen(null);
    setPocket(null);
    setBanking(false);
    setBankDeltas(null);
    committedRef.current = false;
    setDealt(!!reduceMotion);
    // A fresh offer demands attention: the board is blocked until it resolves.
    playDraftChime();
    if (reduceMotion) return;
    const t = window.setTimeout(() => setDealt(true), DEAL_TOTAL_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer.index]);

  useEffect(
    () => () => {
      if (bankTimer.current != null) window.clearTimeout(bankTimer.current);
    },
    [],
  );

  const confirmCard = (i: number) => {
    if (chosen != null || banking) return;
    setPocket(pocketDelta(cardRefs.current[i]));
    setChosen(i);
  };

  const choose = (i: number) => {
    if (chosen != null || banking) return;
    if (selected === i) {
      // Second click on the selected card confirms it.
      confirmCard(i);
      return;
    }
    setSelected(i);
  };

  const confirmSelection = () => {
    if (chosen != null || banking || selected == null) return;
    confirmCard(selected);
  };

  const commit = (i: number) => {
    if (committedRef.current) return;
    committedRef.current = true;
    onPick(i);
  };

  // Skip and bank with feedback: the offer flips face-down and slides into
  // the bank (the Skip button) before the overlay closes. Reduced motion
  // banks immediately.
  const handleBank = () => {
    if (chosen != null || banking || committedRef.current) return;
    committedRef.current = true;
    if (reduceMotion) {
      onBank();
      return;
    }
    setBankDeltas(offer.cards.map((_, i) => bankDelta(cardRefs.current[i], bankBtnRef.current)));
    setBanking(true);
    bankTimer.current = window.setTimeout(() => onBank(), 750);
  };

  // Free window over: the pick stays open, but from here on it runs on the
  // player's own clock. The parent minimizes the overlay to the side.
  const handleExpire = () => {
    if (committedRef.current || chosen != null || banking) return;
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
          {takeBoth && (
            <p className="mt-1 text-[11px] font-semibold leading-snug text-gold-leaf">
              Picking any card takes the whole offer.
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
              className="flex-1 rounded-[1px] border border-white/15 bg-white/[0.03] px-3 py-1.5 font-display text-[11px] font-semibold tracking-wide text-parchment-200 transition hover:border-gold/50 hover:text-gold-leaf disabled:opacity-40"
              title="Skip this draft; your next one pulls from a tier higher"
            >
              Skip &amp; bank
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const mid = (offer.cards.length - 1) / 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-3 sm:px-4">
      {/* Timer and panel share one column: the clock chip sits centered right
          above the plate with a small gap and moves with it. */}
      <div className="flex min-w-0 w-full max-w-2xl flex-col items-center gap-2.5 lg:max-w-3xl">
        {deadline != null && <DraftTimerWindow deadline={deadline} onExpire={handleExpire} />}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="draft-frame corner-cut min-w-0 w-full"
        >
          <div className="plate draft-panel max-h-[78dvh] w-full overflow-y-auto overflow-x-hidden p-5 sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="smallcaps text-[11px] text-parchment-400">{nounCap} draft #{offer.index}</div>
          {oppLockedIn && (
            <div
              role="status"
              className="flex items-center gap-1.5 rounded-[1px] border border-verdigris-glow/50 bg-verdigris/10 px-2.5 py-0.5"
            >
              <CheckIcon className="text-verdigris-glow" />
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
        {(takeBoth || bankedBonus) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {takeBoth && (
              <div
                role="status"
                className="inline-flex items-center gap-2 rounded-[1px] border border-gold/60 bg-gold/15 px-3 py-1"
              >
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 bg-gold-leaf animate-flicker" />
                <span className="font-display text-xs font-bold tracking-wide text-gold-leaf">
                  You take BOTH cards this draft
                </span>
              </div>
            )}
            {bankedBonus && (
              <div className="inline-flex items-center gap-2 rounded-[1px] border border-white/20 bg-white/[0.05] px-3 py-1">
                <span className="font-display text-xs font-semibold tracking-wide text-parchment-200">
                  +1 tier from your banked skip
                </span>
              </div>
            )}
          </div>
        )}

        <div
          className={`draft-deal-grid mt-5 grid items-stretch gap-3 lg:gap-4 ${offer.cards.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
        >
          {offer.cards.map((card, i) => {
            const def = BUFF_BY_ID[card.id];
            if (!def) return null;
            const flipDelay = flipDelayMs(i, card.tier);
            return (
              <motion.div
                // Key by the offer index so a fresh draft remounts the cards,
                // replaying the deal from the deck and the flip reveal.
                key={`${offer.index}-${i}`}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                data-tier={card.tier}
                data-cat={def.category}
                // The one-shot shine pass (CSS) waits for this card's own flip
                // to finish before it crosses.
                style={{ ["--reveal-delay" as string]: `${flipDelay + FLIP_MS + 80}ms` }}
                className={
                  "draft-fx mx-auto h-full w-full max-w-md sm:max-w-none " +
                  (selected === i && chosen == null && !banking ? "draft-fx--selected" : "")
                }
                // Deal from the deck: the card starts face-down on a stack at
                // the bottom center of the panel, then flies to its slot.
                initial={
                  reduceMotion
                    ? { opacity: 0 }
                    : {
                        x: `${(mid - i) * 104}%`,
                        y: "56%",
                        rotate: (i - mid) * 2,
                        scale: 0.62,
                        opacity: 1,
                      }
                }
                animate={
                  chosen === i
                    ? {
                        // Into the pocket: the confirmed card arcs toward the
                        // dock (measured at confirm time), shrinking as it
                        // goes, and fades just before it lands.
                        x: pocket?.dx ?? -180,
                        y: pocket?.dy ?? 220,
                        scale: 0.18,
                        rotate: -5,
                        opacity: [1, 1, 0.85, 0],
                      }
                    : chosen != null
                    ? { opacity: 0.12 }
                    : banking
                    ? {
                        // Into the bank: face-down again (the inner flip) and
                        // off toward the Skip button as a stack.
                        x: bankDeltas?.[i]?.dx ?? 0,
                        y: bankDeltas?.[i]?.dy ?? 240,
                        scale: 0.22,
                        rotate: 4,
                        opacity: [1, 1, 0.9, 0],
                      }
                    : // Once a card is selected the others dim to focus it.
                      {
                        opacity: selected != null && selected !== i ? 0.55 : 1,
                        x: 0,
                        y: selected === i ? -3 : 0,
                        rotate: 0,
                        scale: 1,
                      }
                }
                transition={
                  chosen === i
                    ? { duration: 0.55, ease: [0.3, 0.05, 0.2, 1], opacity: { times: [0, 0.6, 0.85, 1] } }
                    : chosen != null
                    ? { duration: 0.3, ease: "easeIn" }
                    : banking
                    ? {
                        delay: 0.14 + i * 0.06,
                        duration: 0.4,
                        ease: [0.3, 0.05, 0.2, 1],
                        opacity: { times: [0, 0.5, 0.8, 1] },
                      }
                    : dealt
                    ? { duration: 0.18, ease: "easeOut" }
                    : {
                        delay: (i * DEAL_STAGGER_MS) / 1000,
                        duration: DEAL_MS / 1000,
                        ease: [0.2, 0.8, 0.2, 1],
                      }
                }
                onAnimationComplete={() => {
                  if (chosen === i) commit(i);
                }}
              >
                <span aria-hidden className="draft-fx__glow" />
                {/* 3D flip: the back faces the viewer while dealing, then the
                    wrapper rotates to reveal the face (higher tier flips a
                    touch later). Banking rotates it face-down again. */}
                <motion.div
                  className="draft-flip"
                  initial={reduceMotion ? false : { rotateY: 180 }}
                  animate={{ rotateY: banking && !reduceMotion ? 180 : 0 }}
                  transition={
                    banking
                      ? { duration: 0.22, ease: "easeIn" }
                      : {
                          delay: reduceMotion || dealt ? 0 : flipDelay / 1000,
                          duration: FLIP_MS / 1000,
                          ease: [0.3, 0.1, 0.3, 1],
                        }
                  }
                >
                  <div className="draft-card-front">
                    <BuffCard
                      buff={def}
                      tier={card.tier}
                      onClick={chosen == null && !banking ? () => choose(i) : undefined}
                    />
                  </div>
                  {/* Card back: an ink panel with a hairline frame and the
                      tier numeral as a quiet watermark. */}
                  <div aria-hidden className="draft-card-back">
                    <span className={`draft-card-back__numeral font-display tier-${card.tier}`}>
                      {TIER_ROMAN[card.tier]}
                    </span>
                  </div>
                </motion.div>
                <span aria-hidden className="draft-fx__sheen" />
              </motion.div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
          <button
            onClick={confirmSelection}
            disabled={selected == null || chosen != null || banking}
            className="btn-glass btn-glass--primary w-full px-8 py-3 font-display text-base font-semibold tracking-wide sm:w-auto"
          >
            {selected != null ? "Confirm pick" : "Pick a card"}
          </button>
          <div className="relative w-full sm:w-auto">
            <button
              ref={bankBtnRef}
              onClick={handleBank}
              disabled={chosen != null || banking}
              className="btn-glass w-full px-6 py-3 font-display text-sm font-semibold tracking-wide sm:w-auto"
              title="Skip this draft; your next one pulls from a tier higher"
            >
              Skip &amp; bank <span className="ml-1 text-parchment-400">+1 tier next draft</span>
            </button>
            {banking && (
              <motion.span
                aria-hidden
                initial={{ opacity: 0, y: 6, x: "-50%" }}
                animate={{ opacity: [0, 1, 1, 0], y: -22, x: "-50%" }}
                transition={{ duration: 0.6, delay: 0.15 }}
                className="pointer-events-none absolute -top-1 left-1/2 font-display text-xs font-semibold text-gold-leaf"
              >
                +1 tier
              </motion.span>
            )}
          </div>
        </div>

        {opponent && (
          <div className="mt-4 border-t border-white/10 pt-3 text-center text-[11px] leading-snug text-parchment-400">
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
    </div>
  );
}
