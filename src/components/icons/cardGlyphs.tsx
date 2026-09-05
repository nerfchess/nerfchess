"use client";

// The card glyph set: one hand-drawn, single-weight mark per effect category
// (docs/card-registry.json effectCategory), so a card's face tells you what
// kind of thing it does. Same 24-unit grid, 2px round strokes and quiet
// geometry as the board status glyphs, and every component is shaped like a
// lucide icon (size, strokeWidth, className, ref) so the existing face-icon
// plumbing can hand one out without knowing the difference.
//
// Hand-tuned tier 7+ cards keep their name-matched lucide picks (see
// scripts/gen-card-icons.mjs CARD_ICON_OVERRIDES); every other card wears its
// category glyph. Tier and family colour still come from the card chrome.

import { forwardRef, type SVGProps } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";

type GlyphDef = { name: string; paths: string[]; dots?: [number, number][] };

function makeGlyph(def: GlyphDef): LucideIcon {
  const C = forwardRef<SVGSVGElement, LucideProps>(function Glyph(
    { size = 24, strokeWidth = 2, color = "currentColor", className, absoluteStrokeWidth, ...rest },
    ref,
  ) {
    const sw = absoluteStrokeWidth ? (Number(strokeWidth) * 24) / Number(size) : strokeWidth;
    const props: SVGProps<SVGSVGElement> = {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: color,
      strokeWidth: sw,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className,
    };
    return (
      <svg ref={ref} {...props} {...(rest as SVGProps<SVGSVGElement>)} data-glyph={def.name}>
        {def.paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
        {def.dots?.map(([cx, cy], i) => (
          <circle key={`d${i}`} cx={cx} cy={cy} r={1.1} fill={color} stroke="none" />
        ))}
      </svg>
    );
  });
  C.displayName = `Glyph.${def.name}`;
  return C as unknown as LucideIcon;
}

// Category -> glyph. Drawn to read at 13px: two or three strokes, one idea.
const DEFS: Record<string, GlyphDef> = {
  // A crown split by a lightning fork: the game ends another way.
  "alt-win-loss-condition": { name: "altWin", paths: ["M4 18h16", "M5 18l-1-9 4 4 4-7 4 7 4-4-1 9", "M12 3v3"] },
  // A grid with one warped edge.
  "board-geometry-warp": { name: "warp", paths: ["M4 4h16v16H4z", "M4 12c4-3 12 3 16 0", "M12 4c-3 4 3 12 0 16"] },
  // A capture only when the target sits in the frame.
  "capture-condition": { name: "captureIf", paths: ["M4 9V5h4", "M16 5h4v4", "M20 15v4h-4", "M8 19H4v-4", "M9 12l2 2 4-4"] },
  // Crossed swords struck through.
  "capture-denial": { name: "noCapture", paths: ["M6 6l12 12", "M18 6L6 18", "M3 12h18"] },
  // A sword with a small check.
  "capture-permission": { name: "mayCapture", paths: ["M5 19l10-10", "M13 5l6 6", "M17 3l4 4", "M4 20h4v-4"] },
  // A sword returning as a boomerang.
  "capture-punishment": { name: "punish", paths: ["M5 18L15 8", "M13 6l5 5", "M19 3c1 3 1 6-2 9", "M4 20h4v-4"] },
  // A card being drawn from a hand.
  "card-tutor-gain": { name: "tutor", paths: ["M6 20h9a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H8", "M8 4L4 8v10a2 2 0 0 0 2 2", "M12 9v6", "M9 12h6"] },
  // A king with a crossed check mark.
  "check-rule-change": { name: "checkRule", paths: ["M12 3v4", "M9 5h6", "M8 21h8", "M7 21l1-9h8l1 9", "M4 4l16 16"] },
  // A clock draining down, arrow out.
  "clock-drain-enemy": { name: "drainClock", paths: ["M12 4a8 8 0 1 0 8 8", "M12 8v4l3 2", "M20 4v5h-5", "M20 4l-4 4"] },
  // A clock topping up, arrow in.
  "clock-gain-self": { name: "gainClock", paths: ["M12 4a8 8 0 1 1-8 8", "M12 8v4l3 2", "M4 9V4h5", "M4 4l4 4"] },
  // A piece with a dotted outline and a question.
  "conditional-piece-removal": { name: "ifRemove", paths: ["M8 21h8", "M9 21l1-8h4l1 8", "M9 8a3 3 0 1 1 6 0c0 2-3 2-3 5", "M12 16v.5"] },
  // A sealed scroll with a clock tick.
  "delayed-contract": { name: "contract", paths: ["M6 3h9l4 4v14H6z", "M15 3v4h4", "M9 13h6", "M9 17h4"] },
  // A compass rose with one arm locked.
  "direction-geometry-lock": { name: "dirLock", paths: ["M12 3v18", "M3 12h18", "M6 6l3 3", "M18 18l-3-3", "M18 6l-3 3"] },
  // Two cards, one raised.
  "draft-advantage": { name: "draftUp", paths: ["M4 8h9v13H4z", "M9 3h9v13", "M8.5 17.5l2.5-2.5 2.5 2.5"] },
  // A card struck through.
  "draft-denial": { name: "noDraft", paths: ["M6 3h12v18H6z", "M6 3l12 18"] },
  // A wall of stakes in front of a piece.
  "enemy-movement-restriction": { name: "fence", paths: ["M4 20V10", "M9 20V8", "M14 20V10", "M19 20V8", "M3 14h18"] },
  // Two footprints, one more than expected.
  "extra-move": { name: "extraMove", paths: ["M5 12l6-6", "M5 12l6 6", "M12 12l6-6", "M12 12l6 6"] },
  // An hourglass being handed over.
  "extra-turn-theft": { name: "stealTurn", paths: ["M7 4h6", "M7 20h6", "M8 4c0 5 4 6 4 8s-4 3-4 8", "M12 4c0 5-4 6-4 8", "M17 8l3 4-3 4", "M14 12h6"] },
  // A piece dragged by a hand.
  "forced-move": { name: "forced", paths: ["M4 12h10", "M11 8l4 4-4 4", "M17 5v14", "M21 8v8"] },
  // A piece on an altar.
  "forced-sacrifice": { name: "sacrifice", paths: ["M4 20h16", "M7 20v-4h10v4", "M12 4v9", "M9 7h6"] },
  // A snowflake breaking apart.
  "freeze-cleanse": { name: "thaw", paths: ["M12 3v8", "M5 7l7 4", "M19 7l-7 4", "M6 21l3-6", "M18 21l-3-6", "M12 15v2"] },
  // A closed eye.
  "info-denial": { name: "noInfo", paths: ["M3 12s3.5 5 9 5 9-5 9-5", "M8 16l-1 3", "M16 16l1 3", "M12 17v3"] },
  // An open eye.
  "info-reveal": { name: "reveal", paths: ["M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z", "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"] },
  // A piece with a hard X.
  "instant-piece-removal": { name: "remove", paths: ["M8 21h8", "M9 21l1-8h4l1 8", "M9 7l6 6", "M15 7l-6 6"] },
  // A piece appearing from a burst.
  "instant-piece-spawn": { name: "spawn", paths: ["M8 21h8", "M9 21l1-7h4l1 7", "M12 4v3", "M7 6l2 2", "M17 6l-2 2", "M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"] },
  // A crown under a shield arc.
  "king-protection": { name: "kingGuard", paths: ["M5 20h14", "M6 20l-1-7 3 3 4-5 4 5 3-3-1 7", "M4 8a10 6 0 0 1 16 0"] },
  // Three pieces marching in.
  "mass-army-spawn": { name: "army", paths: ["M3 20h18", "M4 20l1-6h3l1 6", "M10 20l1-8h3l1 8", "M16 20l1-6h3l1 6", "M12 4v4", "M6 8v3", "M18 8v3"] },
  // A whole rank frozen: a bar of crystals.
  "mass-freeze": { name: "massFreeze", paths: ["M3 18h18", "M6 18V9l2-3 2 3v9", "M14 18V7l2-3 2 3v11", "M10 18v-5l1-2 1 2v5"] },
  // A broom sweeping pieces off.
  "mass-removal": { name: "sweep", paths: ["M4 20l6-6", "M10 14l6-6", "M14 4l6 6", "M6 20h6l-2-4", "M18 4l2 2"] },
  // A wide shield over a row.
  "mass-shield": { name: "massShield", paths: ["M4 6h16v5c0 5-4 8-8 9-4-1-8-4-8-9V6Z", "M8 10h8", "M8 13h8"] },
  // A footprint budget: three steps, one crossed.
  "move-budget-change": { name: "budget", paths: ["M4 16l4-4", "M10 16l4-4", "M16 16l4-4", "M3 20h18", "M17 8l4 4"] },
  // A piece jumping an arc.
  "movement-phase-jump": { name: "jump", paths: ["M4 18c2-8 14-8 16 0", "M4 18h3", "M17 18h3", "M12 6v3"] },
  // A piece with an upward arrow.
  "movement-upgrade": { name: "upgrade", paths: ["M8 21h8", "M9 21l1-7h4l1 7", "M12 3v8", "M8 7l4-4 4 4"] },
  // Two crystals side by side.
  "multi-piece-freeze": { name: "twoFreeze", paths: ["M5 20V9l3-4 3 4v11", "M13 20V9l3-4 3 4v11", "M5 14h6", "M13 14h6"] },
  // A broken chain link.
  "nerf-relief": { name: "relief", paths: ["M9 15l-3 3a3 3 0 0 1-4-4l3-3", "M15 9l3-3a3 3 0 0 1 4 4l-3 3", "M8 8l8 8"] },
  // A feather: nothing changes.
  "no-op-cosmetic": { name: "cosmetic", paths: ["M20 4c-6 0-11 5-13 12l-3 4", "M7 16c4 0 8-3 10-8", "M9 14l4-4"] },
  // A padlock on a piece.
  "piece-class-lockdown": { name: "classLock", paths: ["M6 11h12v9H6z", "M9 11V8a3 3 0 0 1 6 0v3", "M12 15v2"] },
  // A piece with a downward arrow.
  "piece-downgrade-transform": { name: "downgrade", paths: ["M8 21h8", "M9 21l1-7h4l1 7", "M12 3v8", "M8 7l4 4 4-4"] },
  // A piece with a spiral over its head.
  "piece-mind-control": { name: "mindControl", paths: ["M8 21h8", "M9 21l1-7h4l1 7", "M12 11a4 4 0 1 1 4-4c0 2-2 3-4 3", "M12 5a2 2 0 1 0 2 2"] },
  // A piece nudged one square: arrow with a short tail.
  "piece-nudge-reposition": { name: "nudge", paths: ["M4 12h12", "M12 8l4 4-4 4", "M19 8v8"] },
  // A piece rising from the ground line.
  "piece-revival": { name: "revive", paths: ["M4 20h16", "M12 20V9", "M8 13l4-4 4 4", "M9 5h6"] },
  // Two pieces swapping on arrows.
  "piece-swap": { name: "swap", paths: ["M4 8h13", "M14 5l3 3-3 3", "M20 16H7", "M10 13l-3 3 3 3"] },
  // A piece with a crown added.
  "piece-upgrade-transform": { name: "crownUp", paths: ["M8 21h8", "M9 21l1-7h4l1 7", "M7 10l1-5 2 2 2-4 2 4 2-2 1 5H7Z"] },
  // A crown behind bars.
  "promotion-denial": { name: "noPromote", paths: ["M5 18l1-8 3 3 3-6 3 6 3-3 1 8H5Z", "M12 3v3", "M4 21L20 3"] },
  // A pawn with a crown arrow.
  "promotion-grant": { name: "promote", paths: ["M8 21h8", "M9 21l1-6h4l1 6", "M12 12V4", "M9 7l3-3 3 3", "M7 15h10"] },
  // A die.
  "randomness-gamble": { name: "gamble", paths: ["M4 4h16v16H4z"], dots: [[8.5, 8.5], [15.5, 8.5], [12, 12], [8.5, 15.5], [15.5, 15.5]] },
  // A blow returned: two arrows meeting.
  "retaliation-damage": { name: "retaliate", paths: ["M3 12h7", "M7 9l3 3-3 3", "M21 12h-7", "M17 9l-3 3 3 3"] },
  // A piece boxed on its own square.
  "self-movement-restriction": { name: "selfBound", paths: ["M4 4h16v16H4z", "M9 20l1-6h4l1 6", "M12 9a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"] },
  // One crystal.
  "single-piece-freeze": { name: "freeze", paths: ["M12 3v18", "M4 7.5l16 9", "M4 16.5l16-9"] },
  // One shield.
  "single-piece-shield": { name: "shield", paths: ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"] },
  // A rule scroll crossed out.
  "special-rule-denial": { name: "noRule", paths: ["M6 3h12v18H6z", "M9 8h6", "M9 12h6", "M4 20L20 4"] },
  // A rule scroll with a seal.
  "special-rule-grant": { name: "rule", paths: ["M6 3h12v18H6z", "M9 8h6", "M9 12h6", "M12 15a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"] },
  // A target reticle.
  "target-marking": { name: "mark", paths: ["M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z", "M12 2v4", "M12 18v4", "M2 12h4", "M18 12h4"], dots: [[12, 12]] },
  // A piece blinking out and in.
  "teleport-relocate": { name: "teleport", paths: ["M4 20h5", "M15 20h5", "M6.5 16v-3", "M17.5 16v-3", "M9 5l3-2 3 2", "M12 3v8", "M8 11h8"] },
  // Spikes rising from the ground.
  "terrain-hazard": { name: "hazard", paths: ["M3 20h18", "M5 20l2-7 2 7", "M10 20l2-10 2 10", "M15 20l2-6 2 6"] },
  // A skip-forward mark.
  "turn-skip-enemy": { name: "skipTurn", paths: ["M5 5l8 7-8 7V5Z", "M17 5v14"] },
  // A square shining.
  "zone-buff": { name: "zoneBuff", paths: ["M6 6h12v12H6z", "M12 2v2", "M12 20v2", "M2 12h2", "M20 12h2"] },
  // A square struck through.
  "zone-denial": { name: "zoneDeny", paths: ["M5 5h14v14H5z", "M5 5l14 14"] },
  // A square with a lock.
  "zone-lock-in": { name: "zoneLock", paths: ["M4 4h16v16H4z", "M9 13h6v5H9z", "M10 13v-2a2 2 0 0 1 4 0v2"] },
};

export const CATEGORY_GLYPHS: Record<string, LucideIcon> = Object.fromEntries(
  Object.entries(DEFS).map(([k, d]) => [k, makeGlyph(d)]),
);

/** The glyph for an effect category, or undefined when the category is unknown. */
export function categoryGlyph(effectCategory: string | undefined): LucideIcon | undefined {
  return effectCategory ? CATEGORY_GLYPHS[effectCategory] : undefined;
}

export const GLYPH_CATEGORIES = Object.keys(DEFS);
