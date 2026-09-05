"use client";

// Enlarged, read-only view of the opponent's open draft offer, available while
// you wait for them to finish (you already resolved your own draft). The offer
// is public data the server sends open (full-transparency rule), so this shows
// nothing the small OpponentDraftPanel mini-cards don't already show — just at
// full card size, so you can actually study what they're deciding between.
//
// Strictly presentational: it renders the offer the caller passes and can only
// close itself. It never touches either side's draft state.

import { useReducedMotion } from "@/lib/useReducedMotion";
import type { BuffOffer } from "@/engine/buff";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { BuffCard } from "./BuffCard";

/** Small inline close mark (no text glyphs, no emoji). */
function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      width="11"
      height="11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className={"shrink-0 " + className}
    >
      <path d="M2 2l8 8M10 2l-8 8" />
    </svg>
  );
}

export function OpponentDraftViewer({
  offer,
  oppName,
  cardNoun = "buff",
  onClose,
}: {
  offer: BuffOffer;
  oppName: string;
  /** What the cards are called in this mode ("buff", or "hex" in nerf mode). */
  cardNoun?: string;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const nounCap = cardNoun.charAt(0).toUpperCase() + cardNoun.slice(1);

  // Escape closes, same as clicking the backdrop or the Close button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${oppName}'s open ${cardNoun} draft`}
      // z-50: above the waiting card/banner (z-40); your own draft overlay
      // (z-[55]) is never mounted while this can show, so no contest there.
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/40"
    >
      <div className="flex min-h-full items-center justify-center px-3 py-4 sm:px-4">
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="plate plate-raised w-full max-w-2xl border-gold/40 p-5 shadow-plate sm:p-8 lg:max-w-3xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[12px] text-parchment-400">
                {/* Ember accent: the same "this is the OPPONENT's" marker the
                    in-draft mini panel wears. */}
                <span aria-hidden className="h-2.5 w-0.5 shrink-0 rounded-full bg-oxblood-glow/70" />
                {nounCap} draft #{offer.index}
              </div>
              <h2 className="mt-1 font-display text-2xl text-parchment sm:text-3xl">
                <span className="text-gold">{oppName}</span> is choosing between these
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close the opponent draft view"
              className="flex min-h-[44px] shrink-0 touch-manipulation items-center gap-1.5 rounded-[1px] border border-[color:var(--edge)] bg-white/[0.03] px-3 py-0.5 text-parchment-300 transition hover:border-gold/50 hover:text-gold-leaf"
            >
              <CloseIcon />
              <span className="font-display text-[14px] font-semibold tracking-wide sm:text-[13px]">
                Close
              </span>
            </button>
          </div>

          <div
            className={
              "mt-5 grid items-stretch gap-3 lg:gap-4 " +
              (offer.cards.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")
            }
          >
            {offer.cards.map((card, i) => {
              const def = BUFF_BY_ID[card.id];
              if (!def) return null;
              return (
                <div key={`${offer.index}:${offer.rerolled ?? 0}:${i}`} className="mx-auto h-full w-full max-w-md sm:max-w-none">
                  {/* Full-size read-only card (no onClick): the same face your
                      own draft deals, animation-preview medallion included. */}
                  <BuffCard buff={def} tier={card.tier} preview />
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-center text-[12px] leading-snug text-parchment-400">
            Live view: it updates if they reroll. Watching does not affect their draft.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
