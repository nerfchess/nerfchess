"use client";

// ---------------------------------------------------------------------------
// DraftPreview: a small looping "animation preview" medallion for draft cards.
//
// A player should recognize an upgrade's EFFECT STYLE from the card face
// before reading its name, so each draft card wears a ~2.75rem medallion
// that loops a tiny CSS vignette in the card's own effect identity — NEVER
// the full flagship board animation, just its family's motif:
//
//   buff/hex cards — identity comes from genSignatureConfig(id, category,
//     tier) (src/components/effects/genSignature.tsx). Its 37 GenFamily
//     values collapse onto 14 micro-motifs (GEN_MOTIF below), tinted by the
//     same hue/palette math the board burst uses, stamped with the card's
//     lucide face icon (the caller passes the icon it already resolved).
//   nerf cards — identity comes from getPassiveVisual(id, "nerf")
//     (src/components/effects/passive/registry.ts); its 9 passive families
//     map onto the same motif set (PASSIVE_MOTIF), tinted with the passive's
//     registry color.
//
// Performance / motion contract (loops live in DraftOverlay.css, .dpv-*):
//   - transform/opacity-only keyframes, no blur/filter, <= 6 animated nodes.
//   - Paused when offscreen or when the tab is hidden: ONE shared
//     IntersectionObserver plus one document visibilitychange listener toggle
//     data-paused on each medallion; CSS sets animation-play-state: paused.
//     Both are torn down when the last preview unmounts.
//   - Reduced motion: when the in-app setting turns animations off
//     (html[data-anim="off"], read via motionOff()) or framer-motion's
//     useReducedMotion asks to reduce, only the static tinted medallion +
//     icon render (no animated nodes at all). The html[data-anim="off"] CSS
//     gate additionally kills any running loop if the setting flips live.
// ---------------------------------------------------------------------------

import { useReducedMotion } from "@/lib/useReducedMotion";
import {
  createElement,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
} from "react";

import type { LucideIcon } from "lucide-react";
import { genSignatureConfig, type GenFamily } from "@/components/effects/genSignature";
import { getPassiveVisual, type PassiveFamily } from "@/components/effects/passive/registry";
import type { Buff } from "@/engine/buff";
import { motionOff } from "@/lib/settings";
import "./DraftOverlay.css";

// --- Motif vocabulary --------------------------------------------------------

/** The 14 micro-loops. Each is a named CSS block (.dpv--<motif>) of at most
 * ~4 animated nodes; families group onto whichever motif best previews their
 * board choreography. */
type Motif =
  | "shimmer" // crystalline shimmer: slow-orbiting pale glints
  | "embers" // rising ember motes
  | "gear" // ticking gear ring (hard quarter-turn steps)
  | "curse" // inscribing curse ring: dashed sigil circle + breathing glyph
  | "dome" // pulsing dome ribs (two breathing rings in counterphase)
  | "gleam" // a gleam bar sweeping across the medallion
  | "links" // taut chain links tugging toward each other
  | "wave" // wave crests sweeping across
  | "arc" // arc flicker: sparks + glyph blink in hard steps
  | "unfurl" // a line unfurling under the glyph (scroll/quill)
  | "twinkle" // star points twinkling around the rim
  | "blink" // a teleport slit blinking shut and open
  | "march" // chevrons marching upward (ranks / ramparts / banners)
  | "pulse"; // concentric shockwave rings

/** Every GenFamily (37) onto its preview motif. Record<> keeps this total:
 * adding a family to genSignature without mapping it fails the build. */
const GEN_MOTIF: Record<GenFamily, Motif> = {
  frostbloom: "shimmer",
  mirrorShatter: "shimmer",
  prismSplit: "shimmer",
  emberfall: "embers",
  lanternFloat: "embers",
  potionFizz: "embers",
  clockwork: "gear",
  hourglass: "gear",
  hexSigil: "curse",
  shadowVeil: "curse",
  arcaneRunes: "curse",
  shieldDome: "dome",
  thornRing: "dome",
  crownGleam: "gleam",
  kingsDecree: "gleam",
  queenRadiance: "gleam",
  coinFlip: "gleam",
  chainSnap: "links",
  tideSweep: "wave",
  gustSpiral: "wave",
  featherBurst: "wave",
  sparkArc: "arc",
  bishopCross: "arc",
  scrollUnfurl: "unfurl",
  quillSign: "unfurl",
  starChart: "twinkle",
  teleportRift: "blink",
  swapHelix: "blink",
  pawnTide: "march",
  knightVault: "march",
  rookRampart: "march",
  bannerRally: "march",
  drumShock: "pulse",
  gravityWell: "pulse",
  bellToll: "pulse",
  stonecarve: "pulse",
  diceTumble: "pulse",
};

/** The 9 passive (nerf) families onto the same motif set. */
const PASSIVE_MOTIF: Record<PassiveFamily, Motif> = {
  strike: "arc",
  bind: "links",
  fracture: "pulse",
  territory: "march",
  veil: "curse",
  decree: "gleam",
  tempo: "gear",
  summon: "embers",
  blessing: "twinkle",
};

// --- Palette (mirrors genSignature's palette() so the preview tint matches
// the board burst the card will actually play) --------------------------------

const clampN = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

const hsl = (h: number, s: number, l: number): string =>
  `hsl(${(((h % 360) + 360) % 360).toFixed(0)} ${clampN(s, 0, 100).toFixed(0)}% ${clampN(l, 0, 100).toFixed(0)}%)`;

// --- Shared pause plumbing ----------------------------------------------------
// ONE IntersectionObserver and ONE visibilitychange listener serve every
// mounted preview. Each medallion registers its element; going offscreen or
// hiding the tab stamps data-paused="true" on it, and the CSS rule
// `.dpv[data-paused="true"] *` freezes the loop via animation-play-state.
// The last unmount tears both down.

const trackedEls = new Map<HTMLElement, boolean>(); // element -> intersecting
let sharedIO: IntersectionObserver | null = null;
let visHandler: (() => void) | null = null;
let pageHidden = false;

function applyPaused(el: HTMLElement) {
  const onscreen = trackedEls.get(el) ?? true;
  if (pageHidden || !onscreen) el.setAttribute("data-paused", "true");
  else el.removeAttribute("data-paused");
}

function trackPreview(el: HTMLElement): () => void {
  if (trackedEls.size === 0) {
    pageHidden = document.visibilityState === "hidden";
    visHandler = () => {
      pageHidden = document.visibilityState === "hidden";
      trackedEls.forEach((_onscreen, tracked) => applyPaused(tracked));
    };
    document.addEventListener("visibilitychange", visHandler);
    if (typeof IntersectionObserver !== "undefined") {
      sharedIO = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const target = entry.target as HTMLElement;
          if (!trackedEls.has(target)) continue;
          trackedEls.set(target, entry.isIntersecting);
          applyPaused(target);
        }
      });
    }
  }
  trackedEls.set(el, true);
  sharedIO?.observe(el);
  applyPaused(el);
  return () => {
    sharedIO?.unobserve(el);
    trackedEls.delete(el);
    el.removeAttribute("data-paused");
    if (trackedEls.size === 0) {
      if (visHandler) document.removeEventListener("visibilitychange", visHandler);
      visHandler = null;
      sharedIO?.disconnect();
      sharedIO = null;
    }
  };
}

// --- Motif node structures ----------------------------------------------------
// Purely decorative <i>/<span> scaffolding; ALL styling and every keyframe
// lives in DraftOverlay.css under the matching .dpv--<motif> block.

function motifNodes(motif: Motif) {
  switch (motif) {
    case "shimmer":
      return (
        <span className="dpv__spin">
          <i />
          <i />
          <i />
        </span>
      );
    case "gear":
      return (
        <>
          <span className="dpv__ring" />
          <span className="dpv__ring dpv__ring--inner" />
        </>
      );
    case "curse":
      return <span className="dpv__ring" />;
    case "gleam":
    case "wave":
      return (
        <span className="dpv__clip">
          <i />
          {motif === "wave" && <i />}
        </span>
      );
    case "embers":
    case "twinkle":
    case "march":
      return (
        <>
          <i />
          <i />
          <i />
        </>
      );
    case "dome":
    case "links":
    case "arc":
    case "pulse":
      return (
        <>
          <i />
          <i />
        </>
      );
    case "unfurl":
    case "blink":
      return <i />;
  }
}

// --- In-app animations-off setting, as a subscribable store ------------------
// applyUiPrefs folds the Settings toggle and OS reduced-motion into
// html[data-anim]; watching that attribute keeps every mounted preview live
// when the setting flips. Server snapshot says "off" so SSR/hydration always
// paint the static medallion first.

function subscribeAnimSetting(onChange: () => void): () => void {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-anim"] });
  return () => mo.disconnect();
}

// --- Component -----------------------------------------------------------------

interface Props {
  /** Which identity system names the loop: the generated buff signature or
   * the nerf passive composition. */
  kind: "buff" | "nerf";
  /** Card id (buff id or nerf id). */
  id: string;
  /** Buff cards only: the category (drives the generated palette hue). */
  category?: Buff["category"];
  /** Buff cards only: the tier the card rolled at (deepens the palette). */
  tier?: number;
  /** The card's resolved lucide face icon — the same glyph the card already
   * wears (cardFaceIcon / nerfFaceIcon), stamped inside the motif frame. */
  icon: LucideIcon;
  /** Placement offsets (the medallion itself is position:absolute). */
  className?: string;
}

export function DraftPreview({ kind, id, category, tier, icon, className }: Props) {
  const reduce = useReducedMotion();
  // In-app animations-off setting (html[data-anim="off"], via motionOff),
  // subscribed so a live Settings flip re-renders every mounted preview.
  const animOff = useSyncExternalStore(subscribeAnimSetting, motionOff, () => true);
  const staticOnly = animOff || !!reduce;

  const { motif, main, glow, accent } = useMemo(() => {
    if (kind === "buff") {
      const v = genSignatureConfig(id, category ?? "movement", tier ?? 1).visual;
      return {
        motif: GEN_MOTIF[v.family],
        main: hsl(v.hue, v.sat, v.light),
        glow: hsl(v.hue, Math.min(96, v.sat + 10), Math.min(88, v.light + 22)),
        accent: hsl(v.hue2, v.sat, clampN(v.light + 8, 34, 78)),
      };
    }
    const pv = getPassiveVisual(id, "nerf");
    const color = pv?.color ?? "var(--accent-gold)";
    return { motif: pv ? PASSIVE_MOTIF[pv.family] : ("pulse" as Motif), main: color, glow: color, accent: color };
  }, [kind, id, category, tier]);

  // Register with the shared pause plumbing only while actually animating.
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    if (staticOnly) return;
    const el = ref.current;
    if (!el) return;
    return trackPreview(el);
  }, [staticOnly]);

  const vars = {
    "--dpv-main": main,
    "--dpv-glow": glow,
    "--dpv-accent": accent,
  } as CSSProperties;

  return (
    <span
      ref={ref}
      aria-hidden
      className={`dpv ${staticOnly ? "dpv--static" : `dpv--${motif}`} ${className ?? ""}`}
      style={vars}
    >
      <span className="dpv__disc" />
      {!staticOnly && motifNodes(motif)}
      {createElement(icon, {
        "aria-hidden": true,
        size: 17,
        strokeWidth: 2,
        className: "dpv__icon",
      })}
    </span>
  );
}
