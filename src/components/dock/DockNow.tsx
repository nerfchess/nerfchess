"use client";

// ZONE A — "Now": ONE status line about the next draft. The label always
// answers the question the player actually has — when is my next draft — and
// the side facts (take-both, opponent blocked) ride as trailing chips rather
// than owning a row each. Only a blocked draft takes the label over, because
// then there is no "when" to report.

import { NerfGame } from "@/engine/game";
import { Color } from "@/engine/types";
import { Ban, Hourglass, Layers } from "lucide-react";
import { DraftProgressRing } from "./bits";

export function DockNow({ game, myColor }: { game: NerfGame; myColor: Color }) {
  const bs = game.buffs;
  if (!bs) return null;
  const oppColor: Color = myColor === "w" ? "b" : "w";

  // Next shared draft: total plies until both players draft again. Older
  // saves predate nextDraftAtPly; the chip simply hides then.
  const ply = game.board.history.length;
  const nextDraftPly = bs.nextDraftAtPly;
  const draftMovesLeft =
    nextDraftPly != null && !game.result ? Math.max(0, Math.ceil((nextDraftPly - ply) / 2)) : null;
  const draftFrac =
    nextDraftPly != null
      ? Math.max(0, Math.min(1, 1 - (nextDraftPly - ply) / Math.max(1, bs.cadence * 2)))
      : 0;
  const myDraftBlocked = (bs.players[myColor].flags.blockedDrafts ?? 0) > 0;
  const oppDraftBlocked = bs.players[oppColor].flags.blockedDrafts ?? 0;
  const takeBoth = (bs.players[myColor].flags.takeBoth ?? 0) > 0;

  const draftStatus = myDraftBlocked
    ? {
        label: "Next draft blocked",
        frame: "border-oxblood-glow/40 bg-oxblood/10",
        ink: "text-oxblood-glow",
        Icon: Ban,
      }
    : draftMovesLeft == null
      ? takeBoth
        ? {
            label: "Next draft: take BOTH cards",
            frame: "border-gold/50 bg-gold/10",
            ink: "text-gold-leaf",
            Icon: Layers,
          }
        : null
      : {
          label:
            draftMovesLeft === 0
              ? "Draft now"
              : `Next draft in ${draftMovesLeft} move${draftMovesLeft === 1 ? "" : "s"}`,
          frame:
            takeBoth || draftMovesLeft === 0
              ? "border-gold/50 bg-gold/10"
              : "border-[color:var(--edge)] bg-white/[0.03]",
          ink: takeBoth || draftMovesLeft === 0 ? "text-gold-leaf" : "text-parchment-400",
          Icon: Hourglass,
        };

  if (!draftStatus) return null;
  return (
    <div
      role="status"
      className={"mt-2 flex items-center gap-2 rounded-[1px] border px-2 py-1.5 " + draftStatus.frame}
    >
      <draftStatus.Icon aria-hidden size={11} strokeWidth={2.2} className={"shrink-0 " + draftStatus.ink} />
      <span className={"min-w-0 flex-1 truncate text-[12px] " + draftStatus.ink}>
        {draftStatus.label}
      </span>
      {/* The next offer is taken whole. A chip, not a banner: it changes what
          the draft is, but the player still needs the countdown. */}
      {takeBoth && draftMovesLeft != null && !myDraftBlocked && (
        <span
          title="Your next draft takes BOTH cards"
          className="flex shrink-0 items-center gap-1 rounded-[1px] border border-gold/50 bg-gold/10 px-1 py-px text-[12px] font-semibold text-gold-leaf"
        >
          <Layers aria-hidden size={10} strokeWidth={2.4} />
          Both
        </span>
      )}
      {/* Your hex sealed their draft: their problem, not yours, so it is a
          chip on this row rather than an alert of its own. */}
      {oppDraftBlocked > 0 && !game.result && (
        <span
          title={
            oppDraftBlocked === 1
              ? "Opponent's next draft is blocked"
              : `Opponent's next ${oppDraftBlocked} drafts are blocked`
          }
          className="flex shrink-0 items-center gap-1 rounded-[1px] border border-oxblood-glow/40 bg-oxblood/15 px-1 py-px text-[12px] font-semibold text-oxblood-glow"
        >
          <Ban aria-hidden size={10} strokeWidth={2.4} />
          {oppDraftBlocked > 1 ? oppDraftBlocked : ""}
        </span>
      )}
      {draftMovesLeft != null && !myDraftBlocked && <DraftProgressRing fraction={draftFrac} blocked={false} />}
    </div>
  );
}
