"use client";

// Sideline mascot: once a player has a brainrot card in this game, that
// character loiters at the board edge for the rest of the game as an ambient
// pet. Pure decoration — pointer-events-none, mounted OUTSIDE the board crop
// (the same negative-offset trick as the walnut squirrel), never taller than
// ~9% of the board, CSS-only animation (idle bob loop, a rare waddle along
// the edge with a peek over the rim, and one-shot reaction poses toggled by
// the capture diff Board.tsx already runs). Hidden on small screens (edge
// space is tight), gated by the fx-hidden switch at the mount site, and
// rendered static when animations are off in Settings (persistent-prop rule
// from effects.css).
//
// Data note (see Board.tsx derivation): the mascot is summoned from the
// public buff list (buffs.players[color].buffs). Played brainrot cards stay
// in that list as spent instances, so instants keep their mascot; the only
// cards that can't summon one are masked placeholders (empty id) if a future
// server build re-enables draft masking.

import React from "react";
import { BrainrotFigure } from "./BoardEffects";
import { BRAINROT } from "@/engine/buffs/brainrot";
import "./sidelineMascot.css";

/** Card ids that summon a mascot: exactly the Italian-brainrot character set
 * (each has matching art in public/brainrot/<id>.svg). */
export const BRAINROT_MASCOT_IDS: ReadonlySet<string> = new Set(BRAINROT.map((b) => b.id));

export type MascotMood = "cheer" | "sad" | null;

export function SidelineMascot({
  side,
  id,
  mood,
  moodKey,
}: {
  /** Which edge the pet loiters on: "mine" hugs the bottom rim (the viewer's
   * edge), "theirs" the top rim. */
  side: "mine" | "theirs";
  /** Brainrot card id; picks the /public/brainrot art. */
  id: string;
  /** One-shot reaction: "cheer" when the owner just captured, "sad" when the
   * owner just lost a piece. Re-keyed by moodKey so each event replays once. */
  mood: MascotMood;
  moodKey: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={
        "slm-strip pointer-events-none absolute inset-x-2 sm:inset-x-3 z-[1] hidden h-[9%] sm:block " +
        (side === "mine"
          ? "bottom-2 sm:bottom-3 translate-y-[70%]"
          : "top-2 sm:top-3 -translate-y-[70%]")
      }
    >
      {/* Waddle wrapper: owns the slow translateX stroll (plus the rare peek
          lift) so it never fights the idle bob's translateY below. */}
      <div className={"slm-walk h-full aspect-square " + (side === "mine" ? "slm-walk-mine" : "slm-walk-theirs")}>
        {/* Idle bob loop, always on. */}
        <div className="slm-bob h-full w-full">
          {/* One-shot reaction pose, remounted per capture event. */}
          <div key={moodKey} className={"h-full w-full " + (mood === "cheer" ? "slm-cheer" : mood === "sad" ? "slm-sad" : "")}>
            <BrainrotFigure id={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
