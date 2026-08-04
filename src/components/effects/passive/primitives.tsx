// The 27 passive-effect primitives.
//
// Each primitive is a bounded, presentational building block that animates
// transform and opacity ONLY (docs/passive-effect-language.md section 3). Node
// counts are pooled and capped per the tier ladder (max 24). Every primitive
// has a reduced-motion static fallback: a short fade to its static sigil, shown
// whenever the caller passes `reduced` (the lifecycle components compute this
// from html[data-anim], which absorbs the OS prefers-reduced-motion request
// when "Follow system motion" is opted into). The CSS in primitives.css
// additionally hard-stops all keyframes under data-anim="off", so a primitive
// can never animate in a reduced context even if mis-called.
//
// PRIMITIVE_MANIFEST exports every key and its fallback descriptor, consumed by
// scripts/test-passive-registry.ts.

import * as React from "react";
import {
  cueRand,
  PRIMITIVE_CUE_FREEDOM,
  PRIMITIVE_MANIFEST,
  PRIMITIVE_NATURAL_NODES,
  type PrimitiveKey,
  type PrimitiveManifestEntry,
  type SpawnCue,
} from "./spec";
import "./primitives.css";

export { PRIMITIVE_MANIFEST };
export type { PrimitiveManifestEntry };

export interface PrimitiveProps {
  /** Resolved hue for the effect. */
  color: string;
  /** Spawn duration in ms; drives the CSS animation length. */
  durationMs: number;
  /** Bounded node count for this tier (particles are pooled). */
  maxNodes: number;
  /** When true, render the static fallback instead of the animation. */
  reduced?: boolean;
  /** Optional layout seed for deterministic node spread. */
  seed?: number;
}

type Style = React.CSSProperties & Record<string, string | number>;

function vars(color: string, durationMs: number): Style {
  return { ["--pfx-c"]: color, ["--pfx-d"]: `${durationMs}ms` };
}

/** Deterministic pseudo-random in [0,1) from an integer seed. */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function nodeCount(natural: number, maxNodes: number): number {
  return Math.max(1, Math.min(natural, maxNodes));
}

/** The reduced-motion fallback: a single faded ring standing in for the static
 *  sigil. Shared by every primitive. */
function Fallback({ color, durationMs }: { color: string; durationMs: number }): React.ReactElement {
  return <span className="pfx-fallback" style={vars(color, Math.min(160, durationMs))} aria-hidden />;
}

function make(
  key: PrimitiveKey,
  render: (p: Required<Omit<PrimitiveProps, "reduced">> & { count: number }) => React.ReactNode,
  naturalNodes: number,
): React.FC<PrimitiveProps> {
  const Comp: React.FC<PrimitiveProps> = ({ color, durationMs, maxNodes, reduced, seed = 1 }) => {
    if (reduced) return <Fallback color={color} durationMs={durationMs} />;
    const count = nodeCount(naturalNodes, maxNodes);
    return (
      <span className={`pfx pfx-${key}`} style={vars(color, durationMs)} aria-hidden>
        {render({ color, durationMs, maxNodes, seed, count })}
      </span>
    );
  };
  Comp.displayName = `Primitive_${key}`;
  return Comp;
}

function nodes(count: number, cls: string, fn: (i: number) => Style): React.ReactNode {
  return Array.from({ length: count }, (_, i) => <span key={i} className={cls} style={fn(i)} />);
}

// ---------------------------------------------------------------------------
// The 22 primitives.
// ---------------------------------------------------------------------------

const bolt = make("bolt", () => <span className="pfx-el pfx-bolt-el" />, 1);

const shockRing = make("shockRing", () => <span className="pfx-el pfx-ring-el" />, 1);

const crackLines = make(
  "crackLines",
  ({ count, seed }) =>
    nodes(count, "pfx-el pfx-crack-el", (i) => ({
      transform: `rotate(${Math.round(rand(seed + i) * 360)}deg)`,
      ["--pfx-delay"]: `${i * 24}ms`,
    })),
  6,
);

const crystallize = make(
  "crystallize",
  ({ count, seed }) =>
    nodes(count, "pfx-el pfx-crystal-el", (i) => ({
      transform: `rotate(${Math.round(rand(seed + i) * 360)}deg) translateY(-30%)`,
      ["--pfx-delay"]: `${i * 30}ms`,
    })),
  8,
);

const chainLink = make(
  "chainLink",
  ({ count }) =>
    nodes(count, "pfx-el pfx-chain-el", (i) => ({
      left: `${(i / Math.max(1, count - 1)) * 100}%`,
      ["--pfx-delay"]: `${i * 40}ms`,
    })),
  6,
);

const sigilStamp = make("sigilStamp", () => <span className="pfx-el pfx-sigil-el" />, 1);

const zoneSweep = make("zoneSweep", () => <span className="pfx-el pfx-sweep-el" />, 1);

const edgeBurn = make("edgeBurn", () => <span className="pfx-el pfx-edgeburn-el" />, 1);

const fogRoll = make(
  "fogRoll",
  ({ count }) =>
    nodes(count, "pfx-el pfx-fog-el", (i) => ({
      top: `${(i / Math.max(1, count)) * 100}%`,
      ["--pfx-delay"]: `${i * 60}ms`,
    })),
  4,
);

const beamVertical = make("beamVertical", () => <span className="pfx-el pfx-beam-v-el" />, 1);

const beamHorizontal = make("beamHorizontal", () => <span className="pfx-el pfx-beam-h-el" />, 1);

const dropImpact = make(
  "dropImpact",
  () => (
    <>
      <span className="pfx-el pfx-drop-el" />
      <span className="pfx-el pfx-drop-ripple-el" />
    </>
  ),
  2,
);

const riseGlow = make("riseGlow", () => <span className="pfx-el pfx-rise-el" />, 1);

const moonCircle = make("moonCircle", () => <span className="pfx-el pfx-moon-el" />, 1);

const gateSlam = make(
  "gateSlam",
  ({ count }) =>
    nodes(nodeCount(4, count > 4 ? count : 4), "pfx-el pfx-gate-el", (i) => ({
      left: `${(i / 4) * 100}%`,
      ["--pfx-delay"]: `${i * 30}ms`,
    })),
  4,
);

const cardLift = make("cardLift", () => <span className="pfx-el pfx-card-el" />, 1);

const weightDrop = make("weightDrop", () => <span className="pfx-el pfx-weight-el" />, 1);

const tickPips = make(
  "tickPips",
  ({ count }) =>
    nodes(count, "pfx-el pfx-pip-el", (i) => ({
      left: `${(i / Math.max(1, count)) * 100}%`,
      ["--pfx-delay"]: `${i * 50}ms`,
    })),
  6,
);

const orbitSpark = make(
  "orbitSpark",
  ({ count }) =>
    nodes(nodeCount(2, count), "pfx-el pfx-orbit-el", (i) => ({
      ["--pfx-orbit-offset"]: `${(i / 2) * 360}deg`,
    })),
  2,
);

const shatterExit = make(
  "shatterExit",
  ({ count, seed }) =>
    nodes(count, "pfx-el pfx-shard-el", (i) => ({
      ["--pfx-shard-x"]: `${Math.round((rand(seed + i) - 0.5) * 140)}%`,
      ["--pfx-shard-y"]: `${Math.round((rand(seed + i * 3) - 0.5) * 140)}%`,
      ["--pfx-delay"]: `${i * 12}ms`,
    })),
  8,
);

const drainFlow = make(
  "drainFlow",
  ({ count }) =>
    nodes(count, "pfx-el pfx-drain-el", (i) => ({
      transform: `rotate(${(i / Math.max(1, count)) * 360}deg)`,
      ["--pfx-delay"]: `${i * 40}ms`,
    })),
  6,
);

const pulseRing = make("pulseRing", () => <span className="pfx-el pfx-pulse-el" />, 1);

// --- The bespoke-nerf physicality wave (five primitives) -------------------

/** Rule slab slams down from above and settles with a quake-adjacent shudder;
 *  a dust line kicks out at impact. The decree family's physical accent. */
const slabSlam = make(
  "slabSlam",
  () => (
    <>
      <span className="pfx-el pfx-slab-el" />
      <span className="pfx-el pfx-slab-dust-el" />
    </>
  ),
  2,
);

/** Ground shudder: three short strokes jitter laterally under the target and
 *  still. The heavy-settle accent for slams and high-tier strikes. */
const quakeRumble = make(
  "quakeRumble",
  ({ count }) =>
    nodes(nodeCount(3, count), "pfx-el pfx-quake-el", (i) => ({
      top: `${64 + i * 12}%`,
      left: `${34 + i * 14}%`,
      ["--pfx-delay"]: `${i * 46}ms`,
    })),
  3,
);

/** Two shackle cuffs drop from above and clamp shut around the target; the
 *  pin snaps in last. Movement-restriction identity for piece binds. */
const shackleDrop = make(
  "shackleDrop",
  () => (
    <>
      <span className="pfx-el pfx-shackle-el pfx-shackle-l" />
      <span className="pfx-el pfx-shackle-el pfx-shackle-r" />
      <span className="pfx-el pfx-shackle-pin-el" />
    </>
  ),
  3,
);

/** Cage bars rise from below (the inverse of gateSlam's portcullis drop) and
 *  a lintel drops to lock them. Region-scale movement restriction. */
const barCage = make(
  "barCage",
  ({ count }) => (
    <>
      {nodes(nodeCount(4, count), "pfx-el pfx-cagebar-el", (i) => ({
        left: `${18 + i * 21}%`,
        ["--pfx-delay"]: `${i * 40}ms`,
      }))}
      <span className="pfx-el pfx-cagelintel-el" />
    </>
  ),
  5,
);

/** A central fissure splits open, then branch cracks bloom outward from it.
 *  The loss-condition mark: the ground itself gives way. */
const crackBloom = make(
  "crackBloom",
  ({ count, seed }) => (
    <>
      <span className="pfx-el pfx-fissure-el" />
      {nodes(Math.max(1, nodeCount(5, count) - 1), "pfx-el pfx-bloomcrack-el", (i) => ({
        transform: `rotate(${Math.round(35 + i * 70 + (rand(seed + i) - 0.5) * 24)}deg)`,
        ["--pfx-delay"]: `${120 + i * 55}ms`,
      }))}
    </>
  ),
  5,
);

// ---------------------------------------------------------------------------
// Registry of components and the exported manifest.
// ---------------------------------------------------------------------------

export const PRIMITIVES: Record<PrimitiveKey, React.FC<PrimitiveProps>> = {
  bolt,
  shockRing,
  crackLines,
  crystallize,
  chainLink,
  sigilStamp,
  zoneSweep,
  edgeBurn,
  fogRoll,
  beamVertical,
  beamHorizontal,
  dropImpact,
  riseGlow,
  moonCircle,
  gateSlam,
  cardLift,
  weightDrop,
  tickPips,
  orbitSpark,
  shatterExit,
  drainFlow,
  pulseRing,
  slabSlam,
  quakeRumble,
  shackleDrop,
  barCage,
  crackBloom,
};

// Reference the shared natural-node table so the map stays in sync with the
// component pool (used implicitly via PRIMITIVE_MANIFEST).
void PRIMITIVE_NATURAL_NODES;

/** Render a composition (1..3 primitives) as layered primitive components.
 *
 *  With a `cue` (the per-card cue sheet, docs section 3.1) each layer becomes
 *  a bespoke performance of the shared primitive:
 *    - layer i attacks on its beat (an animation-delay via --pfx-beat) and its
 *      play time is shortened by the same amount, so every layer still settles
 *      inside `durationMs` (the tier budget stays honest);
 *    - a per-layer geometry wrapper applies the card's rotation jitter, scale
 *      accent, and mirror, each clamped by the primitive's cue freedom
 *      (board-aligned primitives keep their axis, gravity keeps pointing down);
 *    - the card's seed drives node spread, so even two cards sharing
 *      crackLines fracture along different lines.
 *  Without a cue (trigger pulses, exits, previews) behavior is unchanged. */
export function CompositionLayers({
  composition,
  color,
  durationMs,
  maxNodes,
  reduced,
  cue,
}: {
  composition: PrimitiveKey[];
  color: string;
  durationMs: number;
  maxNodes: number;
  reduced?: boolean;
  cue?: SpawnCue;
}): React.ReactElement {
  return (
    <>
      {composition.map((k, i) => {
        const P = PRIMITIVES[k];
        if (!cue || reduced) {
          return <P key={`${k}-${i}`} color={color} durationMs={durationMs} maxNodes={maxNodes} reduced={reduced} seed={i + 1} />;
        }
        const freedom = PRIMITIVE_CUE_FREEDOM[k];
        const beatFrac = i === 0 ? 0 : Math.min(0.3, Math.max(0, cue.beats[Math.min(i, cue.beats.length - 1)] ?? 0));
        const beatMs = Math.round(durationMs * beatFrac);
        const layerMs = Math.max(180, durationMs - beatMs);
        const rot = freedom.rotateDeg > 0 ? Math.round((cueRand(cue.seed, 17 * (i + 1)) * 2 - 1) * freedom.rotateDeg) : 0;
        const s = freedom.scale ? cue.scale : 1;
        const sx = freedom.mirror && cue.mirror ? -s : s;
        const style = {
          transform: `rotate(${rot}deg) scale(${sx}, ${s})`,
          ["--pfx-beat"]: `${beatMs}ms`,
        } as React.CSSProperties & Record<string, string>;
        return (
          <span key={`${k}-${i}`} className="pfx-cue" style={style} aria-hidden>
            <P color={color} durationMs={layerMs} maxNodes={maxNodes} reduced={reduced} seed={(cue.seed % 997) + i * 31 + 1} />
          </span>
        );
      })}
    </>
  );
}
