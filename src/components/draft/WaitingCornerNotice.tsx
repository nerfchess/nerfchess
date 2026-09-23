"use client";

import { motion } from "framer-motion";
import { LockInCountdown } from "@/components/draft/LockInCountdown";
import { Button } from "@/components/ui/Button";

/**
 * Post-pick waiting notice. Your side of the simultaneous draft is settled
 * (picked, banked, or skipped) and the opponent's is still open.
 *
 * It lives in the bottom-right corner, the same spot the minimized draft
 * panel uses, so the board is never covered and the notice is always in the
 * same place whether you are waiting on them or they are waiting on you.
 * Two densities: the full card until you dismiss it or the free window ends,
 * then a one-line row that stays until the opponent locks in. Neither uses a
 * backdrop, glow or centred layout; the plate is the site's flat box.
 *
 * On phones it sits above the drawer bars (z-30, one layer under them) so
 * "Moves & chat" and "Buffs" stay tappable.
 */
export function WaitingCornerNotice({
  oppName,
  noun,
  compact,
  skipped,
  skipReason,
  oppLockedIn,
  oppBanked,
  oppNewestCardName,
  oppNewestCardTier,
  onClock,
  deadline,
  canViewTheirs,
  onViewTheirs,
  onDismiss,
}: {
  oppName: string;
  noun: string;
  compact: boolean;
  skipped: boolean;
  skipReason?: "dry" | "blocked" | null;
  oppLockedIn: boolean;
  oppBanked: boolean;
  oppNewestCardName?: string | null;
  oppNewestCardTier?: number | null;
  onClock: boolean;
  deadline: number | null;
  canViewTheirs: boolean;
  onViewTheirs: () => void;
  onDismiss: () => void;
  /** Kept for the caller. Both lifts are the same now that phones have no
   *  fixed drawer (the tablet bar is cleared by sm:bottom-16 either way). */
  liftForDrawer: boolean;
}) {
  const oppState = oppLockedIn
    ? oppBanked
      ? `${oppName} banked their draft.`
      : `${oppName} locked in.`
    : `${oppName} is still choosing a ${noun}`;
  const clockLine = onClock ? "On their clock" : "Clocks paused";
  // Phones have no fixed drawer any more; sm:bottom-16 keeps the notice clear
  // of the tablet buff drawer's bar (sm..lg). The two branches this used to
  // pick between were identical (F158).
  const pos =
    "pointer-events-none fixed right-3 z-30 w-[min(92vw,19rem)] " +
    "bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:bottom-16 lg:bottom-4";

  if (compact) {
    return (
      <div className={pos}>
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          role="status"
          aria-live="polite"
          className="corner-notice plate plate-raised pointer-events-auto flex items-center gap-2.5 px-3 py-2"
        >
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
            <span className="waiting-ping absolute inline-flex h-full w-full rounded-full bg-gold/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px] text-parchment-200">
            {skipped ? "Draft skipped. " : ""}
            Waiting for <span className="text-parchment-100">{oppName}</span>
            <span className="waiting-ellipsis" aria-hidden />
          </span>
          <span className={"shrink-0 text-[12px] " + (onClock ? "text-oxblood-glow" : "text-parchment-400")}>
            {clockLine}
          </span>
          {canViewTheirs && (
            <Button
              size="sm"
              onClick={onViewTheirs}
              className="shrink-0 touch-manipulation"
              title="See the cards your opponent is choosing between"
            >
              Their cards
            </Button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className={pos}>
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        role="status"
        aria-live="polite"
        className="corner-notice plate plate-raised pointer-events-auto p-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[12px] text-parchment-400">
              {skipped ? "Draft skipped" : `${noun[0].toUpperCase()}${noun.slice(1)} draft`}
            </div>
            <div className="mt-0.5 truncate font-display text-[15px] font-semibold text-parchment-100">
              {skipped ? "Your draft was skipped" : `Waiting for ${oppName}`}
            </div>
          </div>
          {/* A real icon button: 44px on touch, 36px under a fine pointer.
              It was a bare 24px glyph (F158). */}
          <Button
            tone="ghost"
            size="sm"
            iconOnly
            onClick={onDismiss}
            aria-label="Minimize"
            title="Minimize"
            className="-mr-1.5 -mt-1.5 shrink-0 touch-manipulation text-[16px] leading-none text-parchment-400 hover:text-parchment-100"
          >
            <span aria-hidden>&times;</span>
          </Button>
        </div>
        {skipped && (
          <p className="mt-1 text-[12px] leading-snug text-parchment-300">
            {skipReason === "dry"
              ? "The pool ran dry this round, so nothing was dealt to you."
              : "A card your opponent played blocked your draft this round."}
          </p>
        )}
        {skipped && oppLockedIn && !oppBanked && oppNewestCardName && (
          <p className="mt-1 text-[12px] leading-snug text-parchment-200">
            {oppName} took{" "}
            <span className={`font-display font-semibold tier-${oppNewestCardTier ?? 1}`}>
              {oppNewestCardName}
            </span>
            .
          </p>
        )}
        <div className="mt-2 flex items-center gap-2 text-[12px] text-parchment-300">
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
            <span className="waiting-ping absolute inline-flex h-full w-full rounded-full bg-gold/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
          </span>
          <span className="min-w-0 flex-1 truncate">
            {oppState}
            {!oppLockedIn && <span className="waiting-ellipsis" aria-hidden />}
          </span>
          <span className={"shrink-0 text-[12px] " + (onClock ? "text-oxblood-glow" : "text-parchment-400")}>
            {clockLine}
          </span>
        </div>
        {deadline != null && <LockInCountdown deadline={deadline} className="mt-2" />}
        {canViewTheirs && !oppLockedIn && (
          <Button
            block
            onClick={onViewTheirs}
            className="mt-2 touch-manipulation"
            title="See the cards your opponent is choosing between"
          >
            View their cards
          </Button>
        )}
      </motion.div>
    </div>
  );
}
