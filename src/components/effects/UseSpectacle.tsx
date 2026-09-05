"use client";

// The usage beat: a card just LEFT a hand. The cast layer owns what the play
// does to the board; this layer owns the card itself being consumed — its
// sigil performs the family's consumption (ignites, shatters, unravels, is
// stamped void...) at the owner's board edge, so the eye reads "that card was
// just spent" (or, on the nullified read, "that card was just cancelled")
// before the board answers. One-shot, decorative, pointer-events-none; the
// finished overlay ends at opacity 0 and waits to be replaced by the next
// use, exactly like CastSpectacle. All timing lives in useSpectacle.css
// (three beats, --fx-dur scaled, parked under html[data-anim="off"]).
//
// Node budget: stage + halo + ring + sigil + 3 family layers + 2 crown
// layers + 2 cancel strokes = 10 of the 16-node cap.

import type { LucideIcon } from "lucide-react";
import type { BuffCategory } from "@/engine/buff";
import { resolveUsage } from "./usageResolve";
import "./useSpectacle.css";

export function UseSpectacle({
  cardId,
  category,
  tier,
  icon: Icon,
  mine,
  nullified,
}: {
  cardId: string;
  category?: BuffCategory;
  tier: number;
  icon: LucideIcon;
  /** Which edge the beat anchors to: the owner's side of the crop. */
  mine: boolean;
  /** The cancel read: the performance plays broken (crack, desaturate,
   * sink) — the card was voided by the opponent, not spent by its owner. */
  nullified?: boolean;
}) {
  const r = resolveUsage({ id: cardId, category, tier });
  const v = r.variant;
  // A sixth per-card dimension straight off the seed: a small vertical drift
  // of the whole stage (-3..3% of the crop). Cheap, and it is what pushes the
  // same-family tuple collision count to zero across all 1,100+ usable cards.
  const yNudge = ((v.seed >>> 21) % 7) - 3;
  return (
    <span className="us-scene pointer-events-none absolute inset-0 z-40 block" aria-hidden="true">
      <span
        className={
          `us-stage us-f-${r.family} absolute left-1/2 block h-[26%] w-[30%]` +
          (mine ? " us-mine" : " us-theirs") +
          (nullified ? " us-nullified" : "") +
          (r.crown ? " us-crowned" : "")
        }
        style={
          {
            marginLeft: "-15%",
            "--us-color": r.theme.color,
            "--us-soft": r.theme.soft,
            "--us-deep": r.theme.deep,
            "--us-rot": `${v.rot}deg`,
            "--us-y": `${yNudge}%`,
            "--us-scale": v.scale,
            "--us-mirror": v.mirror ? -1 : 1,
            "--us-delay": `${v.delayJitter}ms`,
            ...(v.hueNudge !== 0 && !nullified ? { filter: `hue-rotate(${v.hueNudge}deg)` } : {}),
          } as React.CSSProperties
        }
        title={r.epithet}
      >
        {/* tell: the halo pools and the ring wakes around the sigil */}
        <span className="us-halo absolute inset-0 block rounded-full" />
        <span className="us-ring absolute left-1/2 top-1/2 block h-[62%] w-[38%] rounded-full" />
        <span className="us-sigil absolute left-1/2 top-1/2 flex h-[46%] w-[28%] items-center justify-center">
          <Icon className="h-full w-full" strokeWidth={1.8} />
        </span>
        {/* strike: the family's consumption, three layers with distinct
            keyframes per family (see useSpectacle.css) */}
        <span className="us-fa absolute left-1/2 top-1/2 block" />
        <span className="us-fb absolute left-1/2 top-1/2 block" />
        <span className="us-fc absolute left-1/2 top-1/2 block" />
        {/* flagship crown: the tier 9/10 rim arc + echo */}
        {r.crown && (
          <>
            <span className="us-crown absolute left-1/2 top-1/2 block h-[86%] w-[54%] rounded-full" />
            <span className="us-echo absolute left-1/2 top-1/2 block h-[86%] w-[54%] rounded-full" />
          </>
        )}
        {/* the cancel read: two void strokes across the sigil */}
        {nullified && (
          <>
            <span className="us-cancel us-cancel-a absolute left-1/2 top-1/2 block" />
            <span className="us-cancel us-cancel-b absolute left-1/2 top-1/2 block" />
          </>
        )}
      </span>
    </span>
  );
}
