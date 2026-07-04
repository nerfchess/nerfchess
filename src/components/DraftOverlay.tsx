"use client";

import { BuffOffer } from "@/engine/buff";
import { BUFF_BY_ID } from "@/engine/buffs/library";
import { motion } from "framer-motion";
import { BuffCard } from "./BuffCard";

interface Props {
  offer: BuffOffer;
  /** Take-both is active: picking any card takes the whole offer. */
  takeBoth?: boolean;
  /** This offer rolled one tier up thanks to a banked skip. */
  bankedBonus?: boolean;
  onPick: (index: number) => void;
  onBank: () => void;
  /** What we can legitimately show about the opponent's draft. */
  opponent?: {
    offer: BuffOffer | null;
    showCards: boolean;
    showTier: boolean;
    lastPick?: { id: string; tier: number } | null;
  };
}

export function DraftOverlay({ offer, takeBoth, bankedBonus, onPick, onBank, opponent }: Props) {
  const oppOffer = opponent?.offer ?? null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="plate w-full max-w-2xl p-6 sm:p-8"
      >
        <div className="smallcaps text-[11px] text-parchment-400">Buff draft #{offer.index}</div>
        <h2 className="font-display text-3xl text-parchment mt-1">
          {takeBoth ? "Take your cards" : "Choose a buff"}
        </h2>
        <p className="mt-1 text-sm text-parchment-300">
          {takeBoth
            ? "A draft-manipulation buff lets you take every card in this offer."
            : "Pick one card — or skip and bank the draft to pull from one tier higher next time."}
          {bankedBonus && " This draft rolled a tier higher thanks to your banked skip."}
        </p>

        <div className={`mt-5 grid gap-3 ${offer.cards.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {offer.cards.map((card, i) => {
            const def = BUFF_BY_ID[card.id];
            if (!def) return null;
            return <BuffCard key={i} buff={def} tier={card.tier} onClick={() => onPick(i)} />;
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            onClick={onBank}
            className="px-4 py-2 border border-white/15 bg-white/[0.03] text-parchment-200 hover:border-gold/50 hover:text-gold-leaf transition text-xs font-display font-semibold tracking-wide"
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
              ) : opponent.lastPick ? (
                <span>
                  Opponent last drafted:{" "}
                  {BUFF_BY_ID[opponent.lastPick.id]?.name ?? opponent.lastPick.id}
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
