// The deterministic clip scene: everything the exported video shows is a pure
// function of (options, time). buildClipScene precomputes layout, per-segment
// timing (speed ramp), energy-scene particles, captions, and the audio event
// schedule from a seeded RNG; renderClipFrame then draws any millisecond of
// the clip on demand. That purity is what lets Tier 1 encoding render the
// timeline OFFLINE frame-by-frame (seek to i/30, draw, encode) and produce the
// exact clip the live preview showed.

import type { Color, Piece, PieceType, Square } from "@/engine/types";
import { FILE, PIECE_VALUE, RANK } from "@/engine/types";
import type { ClipSegment, ClipSigMeta, ClipTimeline } from "./clipReplay";
import type { ClipStyle, ReelPalette } from "./clipStyles";
import {
  applyGrade,
  paintConfetti,
  paintFlashCut,
  paintGlitch,
  paintLetterbox,
  paintParticleField,
  paintTransitionOverBoard,
  paintVhs,
  reelPalette,
  transitionShift,
} from "./clipStyles";

// --- Aspect layouts ----------------------------------------------------------

export type ClipAspect = "tiktok" | "square" | "classic" | "youtube";
export type CaptionStyle = "pop" | "static" | "off";
export type EmojiLevel = "off" | "tasteful" | "brainrot";

export interface ClipLayout {
  W: number;
  H: number;
  boardX: number;
  boardY: number;
  board: number;
  sq: number;
  /** Wordmark baseline. */
  headerY: number;
  /** Matchup line baseline (null: matchup rides the header line, right side). */
  matchY: number | null;
  /** Hook caption first-line baseline. */
  hookY: number;
  hookSize: number;
  /** Word-pop caption center baseline. */
  popY: number;
  popSize: number;
  /** Progress strip top. */
  progressY: number;
  /** Watermark baseline. */
  watermarkY: number;
  /** Vertical momentum bar (left of the board). */
  momentumX: number;
  momentumW: number;
}

// The TikTok frame reliably keeps a ~840x1264 centered rect clear of UI; all
// TEXT stays inside it (top 250, bottom 500, right 140 avoided). The board is
// graphics and may run slightly wider than the text-safe column.
const LAYOUTS: Record<ClipAspect, ClipLayout> = {
  tiktok: {
    W: 1080, H: 1920, boardX: 100, boardY: 460, board: 880, sq: 110,
    headerY: 308, matchY: null, hookY: 378, hookSize: 44,
    popY: 1398, popSize: 54, progressY: 1348, watermarkY: 1414,
    momentumX: 72, momentumW: 16,
  },
  square: {
    W: 1080, H: 1080, boardX: 140, boardY: 176, board: 800, sq: 100,
    headerY: 84, matchY: null, hookY: 140, hookSize: 36,
    popY: 1026, popSize: 44, progressY: 988, watermarkY: 1060,
    momentumX: 106, momentumW: 14,
  },
  classic: {
    W: 720, H: 880, boardX: 40, boardY: 116, board: 640, sq: 80,
    headerY: 52, matchY: 86, hookY: 108, hookSize: 17,
    popY: 812, popSize: 32, progressY: 834, watermarkY: 864,
    momentumX: 14, momentumW: 12,
  },
  youtube: {
    W: 1920, H: 1080, boardX: 600, boardY: 230, board: 720, sq: 90,
    headerY: 90, matchY: null, hookY: 170, hookSize: 44,
    popY: 1016, popSize: 48, progressY: 968, watermarkY: 1048,
    momentumX: 560, momentumW: 16,
  },
};

export function clipLayout(aspect: ClipAspect): ClipLayout {
  return LAYOUTS[aspect];
}

// --- Deterministic randomness ------------------------------------------------

/** Tiny seeded PRNG; the whole clip's randomness flows from one fixed seed so
 *  offline Tier 1 rendering is frame-exact with the preview. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Easing ------------------------------------------------------------------

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
/** easeOutBack with a tunable overshoot, so entrances vary: some overlays
 *  settle heavy (c1 near 1), some snap light (c1 past 2). Nothing in the
 *  frame is allowed to move on the exact same curve as its neighbor. */
const easeOutBackVar = (t: number, c1: number) => {
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
/** Cheap deterministic hash for per-overlay jitter that is not worth carrying
 *  through the scene object: pure function of (seed, k), no state. */
const jit01 = (seed: number, k: number) => {
  const s = Math.sin(seed * 0.0001 + k * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

/** Hex accent -> rgba with alpha (falls back to the input for non-hex). */
export function withAlpha(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// --- Energy scenes -----------------------------------------------------------

export type EnergyKind =
  | "burst" // burst rings + sparks (info / draft / nerf, empower / rally)
  | "shock" // shockwave + shake (attack, detonations)
  | "freeze" // freeze bloom (tempo, slow)
  | "beam" // beam sweep (movement)
  | "ember" // ember rise (pieces: summons, revivals)
  | "petal" // petal / leaf scatter (protection, items)
  | "void" // void collapse (hexes, jail / muzzle / blindfold / anchor)
  | "coronation"; // gold coronation (tier 8+)

function pickEnergy(sig: ClipSigMeta): EnergyKind {
  if (sig.tier >= 8) return "coronation";
  switch (sig.category) {
    case "attack": return "shock";
    case "hex": return "void";
    case "tempo": return "freeze";
    case "movement": return "beam";
    case "pieces": return "ember";
    case "protection": return "petal";
    case "item": return "petal";
    default: break;
  }
  if (sig.motif === "slow") return "freeze";
  if (sig.motif === "jail" || sig.motif === "muzzle" || sig.motif === "blindfold" || sig.motif === "anchor") {
    return "void";
  }
  return "burst";
}

const ENERGY_COLOR: Record<EnergyKind, string> = {
  burst: "#e6bf6a",
  shock: "#ff7a45",
  freeze: "#9fd8f0",
  beam: "#7fb8ff",
  ember: "#ff9a3d",
  petal: "#8fbf7a",
  void: "#8a5cf0",
  coronation: "#ffd76a",
};

interface Particle {
  ang: number;
  speed: number;
  size: number;
  spin: number;
  tint: number;
  delay: number;
}

function makeParticles(rng: () => number, n: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      ang: rng() * Math.PI * 2,
      speed: 0.4 + rng() * 0.9,
      size: 0.35 + rng() * 0.85,
      spin: (rng() - 0.5) * 6,
      tint: rng(),
      delay: rng() * 0.25,
    });
  }
  return out;
}

// --- Captions ----------------------------------------------------------------

interface CaptionWord {
  text: string;
  hot: boolean;
}

interface CaptionEvent {
  words: CaptionWord[];
  emoji: string;
  /** Big pop caption vs a quiet SAN label. */
  big: boolean;
}

export const PIECE_WORD: Record<PieceType, string> = {
  p: "PAWN", n: "KNIGHT", b: "BISHOP", r: "ROOK", q: "QUEEN", k: "KING",
};

function emojiFor(level: EmojiLevel, kind: "capture" | "card" | "crown"): string {
  if (level === "off") return "";
  if (level === "tasteful") {
    return kind === "capture" ? "\u{1F4A5}" : kind === "card" ? "✨" : "\u{1F451}";
  }
  return kind === "capture"
    ? "\u{1F4A5}\u{1F480}"
    : kind === "card"
      ? "\u{1F525}\u{1F525}"
      : "\u{1F451}\u{1F525}";
}

function captionFor(
  seg: ClipSegment,
  energy: EnergyKind | null,
  emojiLevel: EmojiLevel,
): CaptionEvent | null {
  if (seg.sig) {
    const words = seg.sig.name.toUpperCase().split(/\s+/).slice(0, 3);
    return {
      words: words.map((text) => ({ text, hot: true })),
      emoji: emojiFor(emojiLevel, energy === "coronation" ? "crown" : "card"),
      big: true,
    };
  }
  const primary = seg.pairs.find((p) => p.primary) ?? seg.pairs[0] ?? null;
  if (primary?.captured) {
    return {
      words: [
        { text: PIECE_WORD[primary.before.type], hot: false },
        { text: "TAKES!", hot: true },
      ],
      emoji: emojiFor(emojiLevel, "capture"),
      big: true,
    };
  }
  if (primary && primary.before.type !== primary.after.type) {
    return {
      words: [{ text: "PROMOTES!", hot: true }],
      emoji: emojiFor(emojiLevel, "crown"),
      big: true,
    };
  }
  if (seg.label) {
    return { words: [{ text: seg.label, hot: false }], emoji: "", big: false };
  }
  return null;
}

// --- Scene assembly ----------------------------------------------------------

export interface ClipAudioEvent {
  /** Milliseconds into the clip. */
  t: number;
  kind:
    | "move"
    | "capture"
    | "card"
    | "verdict"
    /** Two-note sting under the intro slam. */
    | "intro"
    /** Whoosh under the between-ply edge shimmer. */
    | "shimmer"
    /** Rising pre-beat tone into the payoff. */
    | "riser"
    /** Deeper hit for the slow-motion payoff landing. */
    | "impact"
    /** Resolve chord under the end card. */
    | "outro"
    /** Subtle draw tick as a move arrow sketches itself on. */
    | "tick"
    /** Soft page-flip whoosh under the rule panel slide-in. */
    | "flip";
  tier?: number;
}

export interface ClipVerdict {
  main: string;
  sub: string | null;
}

export interface ClipSceneOptions {
  timeline: ClipTimeline;
  orientation: Color;
  colors: { light: string; dark: string };
  names: { w: string; b: string };
  aspect: ClipAspect;
  hookText: string;
  captionStyle: CaptionStyle;
  emojiLevel: EmojiLevel;
  /** The wave-2 style pack: camera, look, fx, pace, transitions, stamps. */
  style: ClipStyle;
  /** End-card call-to-action line (short, editable). */
  ctaText: string;
  speedRamp: boolean;
  freezeStamp: boolean;
  momentumBar: boolean;
  moveCounter: boolean;
  /** Watermark handle, or null when the toggle is off. */
  watermark: string | null;
  endCard: boolean;
  /** Explainer layer: telegraph arrows ahead of each slide (plus capture
   *  rings on the destination). */
  explainArrows: boolean;
  /** Explainer layer: the card rule panel that slides in on card plays and
   *  holds long enough to read (extending that ply's timing). */
  explainRules: boolean;
  /** Explainer layer: "CAPTURE!" / "x2 TRADE" action callouts. */
  explainCallouts: boolean;
  verdict: ClipVerdict | null;
  /** The three in-frame type voices: display slams, body rule copy, and the
   *  mono chrome voice (timecode, score bug, tier labels, watermark). */
  fonts: { display: string; body: string; mono: string };
  accent: string;
  /** Auto-director payoff hint: absolute ply of the segment that should get
   *  the dramatic pre-beat + slow-motion hit. Falls back to an internal scan
   *  (last capture / card) when absent. */
  payoffPly?: number | null;
}

interface SegFx {
  start: number;
  /** Telegraph window before the pre-beat/slide: the explainer arrow draws
   *  itself on during this lead so the viewer sees the move coming. */
  arrowMs: number;
  /** Dramatic pre-beat pause (darken + zoom + riser) before the slide. */
  preMs: number;
  moveMs: number;
  /** Capture freeze-frame window right after the landing (0 when off). */
  freezeMs: number;
  holdMs: number;
  /** How long the card rule panel holds on screen (0: no panel). The
   *  segment's hold is extended so the panel never gets cut off mid-read. */
  ruleMs: number;
  /** Action callout ("CAPTURE!", "x2 TRADE", payoff piece name), or null. */
  callout: { text: string; emoji: string } | null;
  seg: ClipSegment;
  /** Focal square for punch-ins and energy scenes. */
  target: Square;
  energy: EnergyKind | null;
  tierScale: number;
  particles: Particle[];
  /** Capture shard bursts, one per captured piece. */
  shards: { sq: Square; light: boolean; parts: Particle[] }[];
  /** Small dust puff on every landing (the big shards are captures only). */
  dust: Particle[];
  caption: CaptionEvent | null;
  /** White-minus-black material after this segment lands. */
  matAfter: number;
  /** Auto move-verdict stamp from the capture-swing math, or null. */
  stamp: "!!" | "!?" | "??" | null;
  punch: boolean;
  shakeAmp: number;
  isPayoff: boolean;
  /** Seeded 20-60ms entrance offset so overlays never land in lockstep. */
  jitterMs: number;
  /** Seeded -1..1 tilt for stamps/callouts (sign and magnitude both vary). */
  tiltSeed: number;
  /** Seeded 0..1 easing pick: how heavy this segment's overlays settle. */
  easeSeed: number;
}

/** Lead (telegraph + pre-beat) before a segment's slide starts. */
const segLead = (sf: SegFx) => sf.arrowMs + sf.preMs;
/** Full wall-clock span of a segment on the shared timeline. */
const segSpan = (sf: SegFx) => sf.arrowMs + sf.preMs + sf.moveMs + sf.freezeMs + sf.holdMs;

export interface ClipScene {
  opts: ClipSceneOptions;
  layout: ClipLayout;
  lead: number;
  segs: SegFx[];
  payoffIndex: number;
  freezeStart: number;
  freezeMs: number;
  endStart: number;
  endMs: number;
  durationMs: number;
  audio: ClipAudioEvent[];
  matStart: number;
  /** Seed for the ambient particle field + seeded FX (glitch, confetti). */
  fieldSeed: number;
  /** Confetti fires over the verdict freeze (win verdicts only). */
  celebrate: boolean;
  /** Dust kicked up by the intro board slam. */
  introDust: Particle[];
  /** The reel's one cohesive overlay palette, derived from the grade. */
  palette: ReelPalette;
  /** Seeded off-axis angle (radians) for the verdict slam's rubber-stamp
   *  print; also seeds the print-registration offset direction. */
  verdictTilt: number;
}

function material(pieces: (Piece | null)[]): number {
  let d = 0;
  for (const p of pieces) {
    if (!p || p.type === "k") continue;
    d += (p.color === "w" ? 1 : -1) * PIECE_VALUE[p.type];
  }
  return d;
}

function segMaterial(seg: ClipSegment): number {
  let d = 0;
  const add = (p: Piece) => {
    if (p.type !== "k") d += (p.color === "w" ? 1 : -1) * PIECE_VALUE[p.type];
  };
  for (const s of seg.statics) add(s.piece);
  for (const s of seg.spawns) add(s.piece);
  for (const pr of seg.pairs) add(pr.after);
  return d;
}

const ENERGY_PARTICLES: Record<EnergyKind, number> = {
  burst: 26, shock: 34, freeze: 20, beam: 24,
  ember: 30, petal: 24, void: 30, coronation: 44,
};

/** How hard the emoji knob leans on everything else (shake, caption pop). */
function intensityScale(level: EmojiLevel): number {
  return level === "off" ? 0.85 : level === "brainrot" ? 1.4 : 1;
}

export function buildClipScene(opts: ClipSceneOptions): ClipScene {
  const { timeline, style } = opts;
  const layout = LAYOUTS[opts.aspect];
  const n = timeline.segments.length;
  const fieldSeed =
    (0x1badb002 ^ Math.imul(timeline.startPly, 2654435761) ^ (n << 16) ^ Math.imul(style.seed, 0x85ebca6b)) >>> 0;
  const rng = mulberry32(fieldSeed);
  const intensity = intensityScale(opts.emojiLevel);
  // The ONE global time warp: every duration below passes through it, so the
  // whole timeline (and with it the audio/music schedule, which is keyed off
  // these same numbers) stretches identically at any speed.
  const warp = (ms: number) => Math.round(ms / style.speed);
  const shakeScale =
    style.shake === "off" ? 0 : style.shake === "subtle" ? 0.6 : 1.3;

  // The payoff ply: the auto-director's hint when present, else the last
  // capture / card / promotion. Held in slow motion when the speed ramp is on;
  // everything before it is setup at 1.5x.
  let payoff = n - 1;
  const hinted =
    opts.payoffPly != null
      ? timeline.segments.findIndex((s) => s.ply === opts.payoffPly)
      : -1;
  if (hinted >= 0) {
    payoff = hinted;
  } else {
    for (let i = n - 1; i >= 0; i--) {
      const seg = timeline.segments[i];
      const hasCapture = seg.pairs.some((p) => p.captured) || seg.vanishes.length > 0;
      if (seg.sig || hasCapture) {
        payoff = i;
        break;
      }
    }
  }

  const baseMove = n > 6 ? 430 : 560;
  const baseHold = n > 6 ? 210 : 300;
  // Intro beat: the board slams in, the wordmark pops, the hook spring-pops.
  const lead = warp(700);
  let at = lead;
  const segs: SegFx[] = [];
  const audio: ClipAudioEvent[] = [];
  audio.push({ t: 40, kind: "intro" });
  let matPrev = material(timeline.initial);

  for (let i = 0; i < n; i++) {
    const seg = timeline.segments[i];
    const primary = seg.pairs.find((p) => p.primary) ?? seg.pairs[0] ?? null;
    const captured = seg.pairs.filter((p) => p.captured);
    const hasCapture = captured.length > 0;
    const energy = seg.sig ? pickEnergy(seg.sig) : null;
    const tierScale = seg.sig ? Math.min(2, 0.85 + seg.sig.tier * 0.13) : 1;
    const isPayoff = i === payoff;
    // The payoff earns a dramatic pre-beat (darken + zoom + riser) when it has
    // an actual hit to sell; a quiet final move gets none.
    const preMs = isPayoff && (hasCapture || !!seg.sig || seg.vanishes.length > 0) ? 300 : 0;

    let moveMs = baseMove;
    let holdMs = baseHold + (seg.sig ? Math.round(420 * tierScale) : 0);
    if (opts.speedRamp && i < payoff) {
      moveMs = Math.round(moveMs / 1.5);
      holdMs = Math.round(holdMs / 1.5);
    }
    if (isPayoff && style.slowmo !== "off") {
      const ultra = style.slowmo === "ultra";
      moveMs = Math.round(moveMs * (ultra ? 2.85 : 2));
      holdMs = Math.round(holdMs * (ultra ? 2 : 1.6));
    }

    // Explainer arrow: a 300ms telegraph lead in which the accent arrow draws
    // itself from origin to destination BEFORE the piece starts sliding.
    const arrowMs =
      opts.explainArrows && primary && primary.from !== primary.to ? 300 : 0;

    // Explainer rule panel: hold length scales with the rule text so it can
    // actually be read (min 1.6s, cap 3s), and the ply's hold is EXTENDED so
    // the reel never cuts a rule off mid-read. This flows through the single
    // timeline accumulator below, so preview, offline encode, and the audio
    // schedule all stretch identically.
    let ruleMs = 0;
    if (opts.explainRules && seg.sig) {
      // The rule-hold bias scales the read-speed estimate: quick for viewers
      // who skim, slow reader stretches every panel.
      const holdBias = style.ruleHold === "quick" ? 0.72 : style.ruleHold === "slow" ? 1.4 : 1;
      ruleMs = Math.round(
        Math.min(3600, Math.max(1200, (900 + seg.sig.description.length * 11) * holdBias)),
      );
      holdMs = Math.max(holdMs, ruleMs + 240 - moveMs);
    }

    // Explainer callout for notable beats, respecting the emoji knob.
    let callout: SegFx["callout"] = null;
    if (opts.explainCallouts) {
      const capCount = captured.length + seg.vanishes.length;
      let top: PieceType | null = null;
      for (const pr of captured) {
        if (!top || PIECE_VALUE[pr.captured!.type] >= PIECE_VALUE[top]) {
          top = pr.captured!.type;
        }
      }
      if (isPayoff && top) {
        callout = { text: `${PIECE_WORD[top]} DOWN`, emoji: emojiFor(opts.emojiLevel, "capture") };
      } else if (capCount >= 2) {
        callout = { text: `x${capCount} TRADE`, emoji: emojiFor(opts.emojiLevel, "capture") };
      } else if (capCount === 1) {
        callout = { text: "CAPTURE!", emoji: "" };
      }
    }

    const target: Square =
      primary?.to ?? seg.spawns[0]?.sq ?? seg.vanishes[0]?.sq ?? 27;

    const shards = captured.map((p) => ({
      sq: p.to,
      light: p.captured!.color === "w",
      parts: makeParticles(rng, 14),
    }));
    for (const v of seg.vanishes) {
      shards.push({ sq: v.sq, light: v.piece.color === "w", parts: makeParticles(rng, 10) });
    }

    // Capture freeze-frame: a beat of held pose right after the landing.
    const freezeMs = style.captureFreeze && hasCapture ? 300 : 0;

    // Auto move-verdict stamp from the capture-swing math: how much material
    // the MOVER netted across this ply (captures minus what the diff says was
    // given back). No engine eval involved.
    const matAfter = segMaterial(seg);
    let stamp: SegFx["stamp"] = null;
    if (primary && (hasCapture || seg.vanishes.length > 0)) {
      const mover = primary.before.color;
      const gain = (matAfter - matPrev) * (mover === "w" ? 1 : -1);
      let capturedValue = 0;
      for (const pr of captured) capturedValue += PIECE_VALUE[pr.captured!.type];
      for (const v of seg.vanishes) {
        if (v.piece.color !== mover) capturedValue += PIECE_VALUE[v.piece.type];
      }
      if (gain >= 4) stamp = "!!";
      else if (gain <= -2) stamp = "??";
      else if (capturedValue >= 3) stamp = "!?";
    }
    matPrev = matAfter;

    // Everything below runs on WARPED durations, so the audio schedule and the
    // visual timeline stretch through the same numbers.
    const arrowW = warp(arrowMs);
    const preW = warp(preMs);
    moveMs = warp(moveMs);
    holdMs = warp(holdMs);
    const ruleW = warp(ruleMs);
    const freezeW = warp(freezeMs);

    // Between-ply shimmer whoosh (the payoff gets the riser instead).
    if (i > 0 && !preW) audio.push({ t: at, kind: "shimmer" });
    if (arrowW) audio.push({ t: at, kind: "tick" });
    if (preW) audio.push({ t: at + arrowW, kind: "riser" });
    if (ruleW) audio.push({ t: at + arrowW + preW, kind: "flip" });
    if (seg.sig) {
      audio.push({ t: at + arrowW + preW + 60, kind: "card", tier: seg.sig.tier });
    }
    audio.push({
      t: at + arrowW + preW + moveMs,
      kind: isPayoff && hasCapture ? "impact" : hasCapture ? "capture" : "move",
    });

    segs.push({
      start: at,
      arrowMs: arrowW,
      preMs: preW,
      moveMs,
      freezeMs: freezeW,
      holdMs,
      ruleMs: ruleW,
      callout,
      seg,
      target,
      energy,
      tierScale,
      particles: energy ? makeParticles(rng, Math.round(ENERGY_PARTICLES[energy] * tierScale)) : [],
      shards,
      dust: makeParticles(rng, 7),
      caption: captionFor(seg, energy, opts.emojiLevel),
      matAfter,
      stamp,
      punch: style.zoom !== "off" && (hasCapture || !!seg.sig || style.zoom === "extreme"),
      shakeAmp:
        shakeScale === 0
          ? 0
          : (energy === "shock"
              ? 6 * intensity
              : hasCapture
                ? 3.5 * intensity
                : seg.sig
                  ? 2 * intensity
                  : 0) * shakeScale,
      isPayoff,
      // Hand-tuned imperfection: every segment's overlays get their own
      // entrance offset, tilt, and settle weight from the seeded stream.
      jitterMs: Math.round(20 + rng() * 40),
      tiltSeed: rng() * 2 - 1,
      easeSeed: rng(),
    });
    at += arrowW + preW + moveMs + freezeW + holdMs;
  }

  const freezeMs = warp(opts.freezeStamp ? 1000 : 320);
  const freezeStart = at;
  if (opts.freezeStamp) audio.push({ t: freezeStart + 80, kind: "verdict" });
  at += freezeMs;
  const endMs = opts.endCard ? warp(1400) : 0;
  const endStart = at;
  if (endMs > 0) audio.push({ t: endStart + 60, kind: "outro" });
  at += endMs;

  const celebrate =
    style.confetti &&
    !!opts.verdict &&
    /WIN|CHECKMATE/.test(opts.verdict.main);

  return {
    opts,
    layout,
    lead,
    segs,
    payoffIndex: payoff,
    freezeStart,
    freezeMs,
    endStart,
    endMs,
    durationMs: at,
    audio,
    matStart: material(timeline.initial),
    fieldSeed,
    celebrate,
    introDust: makeParticles(rng, 18),
    palette: reelPalette(style.grade, opts.accent, style.duotoneB),
    // 1 to 3 degrees, sign seeded: the verdict prints like a rubber stamp.
    verdictTilt: ((1 + rng() * 2) * Math.PI / 180) * (rng() < 0.5 ? -1 : 1),
  };
}

/** The biggest card fired inside the clip window, for hook auto-suggestions
 *  and the fallback verdict. */
export function biggestClipCard(timeline: ClipTimeline): ClipSigMeta | null {
  let best: ClipSigMeta | null = null;
  for (const seg of timeline.segments) {
    if (seg.sig && (!best || seg.sig.tier > best.tier)) best = seg.sig;
  }
  return best;
}

// --- Piece sprites -----------------------------------------------------------

export type PieceImageSource =
  | { kind: "inline"; wFill: string; wStroke: string; bFill: string; bStroke: string }
  | { kind: "asset"; set: string };

const PIECE_KEYS = [
  "wp", "wn", "wb", "wr", "wq", "wk",
  "bp", "bn", "bb", "br", "bq", "bk",
] as const;

/** Load the 12 piece sprites for the clip canvas. Inline themes (and custom
 *  colors) rasterize the site's own SVG path strings with the theme fills
 *  injected, so the clip shows the pieces the player actually plays with;
 *  lichess asset themes fetch their sprite files as before. */
export async function loadClipPieceImages(
  source: PieceImageSource,
): Promise<Map<string, HTMLImageElement>> {
  // Imported lazily so clipScene stays importable in tests without pulling the
  // whole React piece component graph eagerly.
  const { PIECE_PATHS } = await import("@/components/Pieces");
  const images = new Map<string, HTMLImageElement>();
  const jobs = PIECE_KEYS.map(async (key) => {
    let svg: string;
    if (source.kind === "asset") {
      const path = `/piece/lichess/${source.set}/${key[0]}${key[1].toUpperCase()}.svg`;
      const res = await fetch(path);
      if (!res.ok) return;
      svg = (await res.text()).replace(/<svg /, '<svg width="256" height="256" ');
    } else {
      const body = (PIECE_PATHS[key] ?? "")
        .replaceAll("var(--piece-w-fill)", source.wFill)
        .replaceAll("var(--piece-w-stroke)", source.wStroke)
        .replaceAll("var(--piece-b-fill)", source.bFill)
        .replaceAll("var(--piece-b-stroke)", source.bStroke)
        .replaceAll("var(--piece-stroke-w, 1.2)", "1.5");
      if (!body) return;
      svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45" width="256" height="256">' +
        body +
        "</svg>";
    }
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    try {
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = url;
      });
      if (img.naturalWidth > 0) images.set(key, img);
    } finally {
      URL.revokeObjectURL(url);
    }
  });
  await Promise.all(jobs);
  return images;
}

// --- Frame renderer ----------------------------------------------------------

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

export function renderClipFrame(
  scene: ClipScene,
  ctx: CanvasRenderingContext2D,
  tMs: number,
  images: Map<string, HTMLImageElement> | null,
): void {
  const { layout: L, opts } = scene;
  const t = Math.max(0, Math.min(tMs, scene.durationMs));
  // The reel palette IS the accent inside the frame: every overlay pulls from
  // the same few inks so a graded reel reads art-directed, not assembled.
  const accent = scene.palette.accent;
  const fonts = opts.fonts;

  const sqXY = (sq: Square): { x: number; y: number } => {
    const f = FILE(sq);
    const r = RANK(sq);
    const col = opts.orientation === "w" ? f : 7 - f;
    const row = opts.orientation === "w" ? 7 - r : r;
    return { x: L.boardX + col * L.sq, y: L.boardY + row * L.sq };
  };

  const drawPiece = (
    piece: Piece,
    x: number,
    y: number,
    alpha = 1,
    scale = 1,
    size = L.sq,
    scaleY = scale,
  ) => {
    const img = images?.get(piece.color + piece.type);
    const s = size * 0.92 * scale;
    const sv = size * 0.92 * scaleY;
    const cx = x + size / 2;
    const cy = y + size / 2;
    ctx.save();
    ctx.globalAlpha *= alpha;
    if (img) {
      // Warm ground shadow (never the generic 50% black drop).
      ctx.shadowColor = "rgba(26,15,6,0.42)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      // Squash draws from the ground line, not the center, so a landing piece
      // compresses onto the square instead of floating.
      ctx.drawImage(img, cx - s / 2, cy + size * 0.46 - sv, s, sv);
    } else {
      ctx.fillStyle = piece.color === "w" ? "#ece7dd" : "#221f1a";
      ctx.strokeStyle = piece.color === "w" ? "#221f1a" : "#ece7dd";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = piece.color === "w" ? "#221f1a" : "#ece7dd";
      ctx.font = `600 ${size * 0.34}px ${fonts.display}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(piece.type.toUpperCase(), cx, cy + 1);
      ctx.textBaseline = "alphabetic";
    }
    ctx.restore();
  };

  // ---- Background: breathing gradient, rotating glow, ember field ----
  const bg = ctx.createLinearGradient(0, 0, 0, L.H);
  bg.addColorStop(0, "#201c17");
  bg.addColorStop(0.5, "#181510");
  bg.addColorStop(1, "#120f0c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, L.W, L.H);
  const bcx = L.W / 2;
  const bcy = L.boardY + L.board / 2;
  // Slow-breathing accent wash so the backdrop itself is never still.
  const breathe = ctx.createLinearGradient(0, 0, 0, L.H);
  breathe.addColorStop(0, withAlpha(accent, 0.05 + 0.03 * Math.sin(t * 0.0011)));
  breathe.addColorStop(0.6, "rgba(0,0,0,0)");
  breathe.addColorStop(1, withAlpha(accent, 0.03 + 0.02 * Math.sin(t * 0.0009 + 2.1)));
  ctx.fillStyle = breathe;
  ctx.fillRect(0, 0, L.W, L.H);
  // Slowly rotating glow behind the board, its brightness pulsing in sync
  // with the momentum bar's material swing.
  const mom = Math.abs(momentumAt(scene, t));
  const orbitA = t * 0.0005;
  const gx = bcx + Math.cos(orbitA) * L.board * 0.12;
  const gy = bcy + Math.sin(orbitA) * L.board * 0.12;
  const glow = ctx.createRadialGradient(gx, gy, L.board * 0.15, gx, gy, L.board * 0.95);
  glow.addColorStop(0, withAlpha(accent, 0.11 + 0.05 * mom + 0.02 * Math.sin(t * 0.003)));
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, L.W, L.H);
  // Ambient particle field (embers / snow / rain / sparks / matrix / bubbles):
  // seeded, cached, every speck a closed-form function of t.
  paintParticleField(
    ctx, opts.style.particles, t, L.W, L.H, scene.fieldSeed, accent,
    opts.style.particleDensity,
  );

  // ---- End card replaces the board chrome once it starts ----
  if (scene.endMs > 0 && t >= scene.endStart) {
    drawEndCard(scene, ctx, (t - scene.endStart) / scene.endMs, images, drawPiece);
    drawOverlays(scene, ctx, t);
    return;
  }

  // ---- Chrome: wordmark, matchup, hook ----
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const markSize = opts.aspect === "classic" ? 30 : 42;
  ctx.font = `700 ${markSize}px ${fonts.display}`;
  const markX = opts.aspect === "tiktok" ? 120 : L.boardX;
  // Wordmark pops in with the intro sting, then keeps a barely-there breathe.
  const markPop = t < 340 ? easeOutBack(clamp01(t / 340)) : 1 + 0.006 * Math.sin(t * 0.002);
  ctx.save();
  const markW = ctx.measureText("nerf").width;
  const markW2 = ctx.measureText("chess").width;
  ctx.translate(markX + (markW + markW2) / 2, L.headerY - markSize * 0.35);
  ctx.scale(markPop, markPop);
  ctx.translate(-(markX + (markW + markW2) / 2), -(L.headerY - markSize * 0.35));
  ctx.fillStyle = scene.palette.paper;
  ctx.fillText("nerf", markX, L.headerY);
  ctx.fillStyle = accent;
  ctx.fillText("chess", markX + markW, L.headerY);
  ctx.restore();
  ctx.font = `500 ${opts.aspect === "classic" ? 17 : 26}px ${fonts.body}`;
  ctx.fillStyle = scene.palette.dim;
  const match = `${opts.names.w}  vs  ${opts.names.b}`;
  if (L.matchY !== null) {
    ctx.fillText(match, L.boardX, L.matchY);
  } else {
    ctx.textAlign = "right";
    ctx.fillText(match, opts.aspect === "tiktok" ? 940 : L.boardX + L.board, L.headerY);
    ctx.textAlign = "left";
  }
  drawHook(scene, ctx, t);

  // ---- Where are we in the timeline? ----
  const style = opts.style;
  const inFreeze = t >= scene.freezeStart;
  let active: SegFx | null = null;
  let u = 0; // 0..1 across the slide
  let holdU = 0; // 0..1 across the hold
  let doneCount = 0;
  for (const sf of scene.segs) {
    if (t >= sf.start + segSpan(sf)) {
      doneCount++;
      continue;
    }
    if (t >= sf.start) {
      active = sf;
      let tl = t - sf.start - segLead(sf);
      // Stutter cut: hold the first beat of the slide, then snap in.
      if (style.stutter && sf.moveMs > 120) {
        const holdIn = Math.min(100, sf.moveMs * 0.3);
        tl = tl <= holdIn ? 0 : ((tl - holdIn) / (sf.moveMs - holdIn)) * sf.moveMs;
      }
      u = clamp01(tl / sf.moveMs);
      // The capture freeze window parks u at 1 (landing pose) before holdU
      // starts counting, so the frame visibly freezes on the hit.
      holdU = clamp01((t - sf.start - segLead(sf) - sf.moveMs - sf.freezeMs) / sf.holdMs);
    }
    break;
  }
  // Pre-beat progress: the darken + zoom window before the payoff slide
  // (after the arrow telegraph, when there is one).
  const preU =
    active && active.preMs > 0 && t < active.start + active.arrowMs + active.preMs
      ? clamp01((t - active.start - active.arrowMs) / active.preMs)
      : 0;

  // ---- Board group: shake + punch transforms wrap everything on the board ----
  ctx.save();
  const shake = shakeOffset(scene, t);
  ctx.translate(shake.x, shake.y);
  // Intro slam: the whole board group scales down onto the table.
  if (t < scene.lead) {
    const su = clamp01(t / (scene.lead * 0.55));
    const s = 1.3 - 0.3 * easeOutCubic(su);
    ctx.translate(bcx, bcy);
    ctx.scale(s, s);
    ctx.translate(-bcx, -bcy);
  }
  // Pre-beat zoom-in toward the payoff target.
  if (preU > 0 && active) {
    const { x, y } = sqXY(active.target);
    const zc = 1 + 0.06 * easeInOutCubic(preU);
    const tx = x + L.sq / 2;
    const ty = y + L.sq / 2;
    ctx.translate(tx, ty);
    ctx.scale(zc, zc);
    ctx.translate(-tx, -ty);
  }
  applyPunch(scene, ctx, t, sqXY);
  applyCameraWork(scene, ctx, t, sqXY, bcx, bcy);

  // Frame + squares. The frame glow pulses gently, synced to the momentum bar.
  ctx.strokeStyle = withAlpha(
    accent,
    Math.min(1, 0.45 + 0.15 * mom + 0.08 * Math.sin(t * 0.004)),
  );
  ctx.lineWidth = 2;
  ctx.strokeRect(L.boardX - 4, L.boardY - 4, L.board + 8, L.board + 8);
  for (let sq = 0 as Square; sq < 64; sq++) {
    const { x, y } = sqXY(sq);
    const light = (FILE(sq) + RANK(sq)) % 2 === 1;
    ctx.fillStyle = light ? opts.colors.light : opts.colors.dark;
    ctx.fillRect(x, y, L.sq, L.sq);
  }
  ctx.font = `600 ${Math.round(L.sq * 0.15)}px ${fonts.body}`;
  for (let i = 0; i < 8; i++) {
    const file = opts.orientation === "w" ? i : 7 - i;
    const rank = opts.orientation === "w" ? 7 - i : i;
    ctx.fillStyle = "rgba(20,17,14,0.55)";
    ctx.textAlign = "right";
    ctx.fillText("abcdefgh"[file], L.boardX + i * L.sq + L.sq - 4, L.boardY + L.board - 5);
    ctx.textAlign = "left";
    ctx.fillText(String(rank + 1), L.boardX + 4, L.boardY + i * L.sq + L.sq * 0.19);
  }

  if (t < scene.lead) {
    ctx.save();
    ctx.globalAlpha = easeOutCubic(clamp01(t / (scene.lead * 0.7)));
    for (let sq = 0 as Square; sq < 64; sq++) {
      const p = opts.timeline.initial[sq];
      if (p) {
        const { x, y } = sqXY(sq);
        drawPiece(p, x, y);
      }
    }
    ctx.restore();
    drawIntroSlam(scene, ctx, t, bcx, bcy);
  } else if (active) {
    drawSegment(scene, ctx, active, u, holdU, t, sqXY, drawPiece);
    // Pre-beat: darkness pools over the board while the riser climbs.
    if (preU > 0) {
      ctx.fillStyle = `rgba(8,6,12,${0.38 * easeInOutCubic(preU)})`;
      ctx.fillRect(L.boardX - 4, L.boardY - 4, L.board + 8, L.board + 8);
    }
  } else {
    for (let sq = 0 as Square; sq < 64; sq++) {
      const p = opts.timeline.final[sq];
      if (p) {
        const { x, y } = sqXY(sq);
        drawPiece(p, x, y);
      }
    }
  }
  // Bloom pulse on card plays: an additive radial swell over the target.
  if (style.bloom) drawBloom(scene, ctx, t, sqXY);
  // Flame streak behind capture slides.
  if (style.flameTrail && active) drawFlameTrail(scene, ctx, active, u, t, sqXY);
  // Auto move-verdict stamps ("!!" / "!?" / "??").
  if (style.verdictStamps) drawStamps(scene, ctx, t, sqXY);
  // Capture freeze chrome: accent ticks around the held pose.
  if (active && active.freezeMs > 0) drawFreezeTicks(scene, ctx, active, t, sqXY);
  // Between-ply transition, per the style: the classic edge shimmer or one of
  // the wave-2 cuts (whip / flash / spin / pixel / none).
  if (style.transition === "shimmer") {
    drawEdgeShimmer(scene, ctx, t);
  } else {
    const tr = activeTransition(scene, t);
    if (tr) {
      paintTransitionOverBoard(
        ctx, style.transition, tr.p, scene.fieldSeed ^ tr.sf.start,
        L.boardX - 4, L.boardY - 4, L.board + 8, accent, tr.dir,
      );
    }
  }
  // Explainer callouts pop over the board edge (inside the shake group so
  // they thump with the hit that spawned them).
  if (opts.explainCallouts) drawCallouts(scene, ctx, t, sqXY);
  ctx.restore(); // board group

  // ---- Meters, captions, watermark ----
  if (opts.momentumBar) drawMomentum(scene, ctx, t);
  if (opts.moveCounter) drawProgress(scene, ctx, doneCount, active, u);
  if (style.scoreBug) drawScoreBug(scene, ctx, t);
  drawPopCaption(scene, ctx, active, t);
  // Explainer rule panel: slides in from the safe side, holds while the rule
  // text is read, slides out. Drawn outside the board group so shake and
  // punch never smear the text.
  if (opts.explainRules) drawRulePanel(scene, ctx, t, sqXY);
  if (opts.watermark) drawWatermark(scene, ctx);

  // ---- Freeze + stamp finish ----
  if (inFreeze && opts.freezeStamp && opts.verdict) {
    drawVerdict(scene, ctx, (t - scene.freezeStart) / scene.freezeMs);
  }

  drawOverlays(scene, ctx, t);
}

// --- Sub-renderers -----------------------------------------------------------

function shakeOffset(scene: ClipScene, t: number): { x: number; y: number } {
  for (const sf of scene.segs) {
    if (sf.shakeAmp <= 0) continue;
    const te = sf.start + sf.arrowMs + sf.preMs + sf.moveMs; // impact lands with the slide
    if (t < te || t > te + 150) continue;
    const u = (t - te) / 150;
    const amp = sf.shakeAmp * (1 - u);
    return {
      x: amp * Math.sin(t * 0.19 + sf.start),
      y: amp * Math.cos(t * 0.23 + sf.start * 2),
    };
  }
  return { x: 0, y: 0 };
}

function applyPunch(
  scene: ClipScene,
  ctx: CanvasRenderingContext2D,
  t: number,
  sqXY: (sq: Square) => { x: number; y: number },
): void {
  const style = scene.opts.style;
  const mag = style.zoom === "subtle" ? 0.1 : style.zoom === "extreme" ? 0.32 : 0.2;
  for (const sf of scene.segs) {
    if (!sf.punch) continue;
    // Punch timing: on the landing impact (default) or on the ply's opening
    // beat, right as the slide starts.
    const te =
      style.punchTiming === "beat"
        ? sf.start + sf.arrowMs + sf.preMs
        : sf.start + sf.arrowMs + sf.preMs + sf.moveMs;
    if (t < te || t > te + 200) continue;
    const u = easeOutCubic((t - te) / 200);
    const s = 1 + mag * (1 - u);
    // Zoom target bias: the action square, or the board's center.
    let cx: number;
    let cy: number;
    if (style.zoomBias === "center") {
      cx = scene.layout.boardX + scene.layout.board / 2;
      cy = scene.layout.boardY + scene.layout.board / 2;
    } else {
      const { x, y } = sqXY(sf.target);
      cx = x + scene.layout.sq / 2;
      cy = y + scene.layout.sq / 2;
    }
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    return;
  }
}

// --- Camera work (wave 2) ----------------------------------------------------

/** Follow-cam focal point: eases from ply to ply toward the midpoint of the
 *  active move. Pure function of t. */
function followTarget(
  scene: ClipScene,
  t: number,
  sqXY: (sq: Square) => { x: number; y: number },
): { x: number; y: number } {
  const L = scene.layout;
  let px = L.boardX + L.board / 2;
  let py = L.boardY + L.board / 2;
  for (const sf of scene.segs) {
    const primary = sf.seg.pairs.find((p) => p.primary) ?? sf.seg.pairs[0] ?? null;
    const a = primary ? sqXY(primary.from) : sqXY(sf.target);
    const b = primary ? sqXY(primary.to) : a;
    const cx = (a.x + b.x) / 2 + L.sq / 2;
    const cy = (a.y + b.y) / 2 + L.sq / 2;
    if (t < sf.start) break;
    if (t < sf.start + segSpan(sf)) {
      const k = easeInOutCubic(clamp01((t - sf.start) / 380));
      return { x: px + (cx - px) * k, y: py + (cy - py) * k };
    }
    px = cx;
    py = cy;
  }
  return { x: px, y: py };
}

const TRANSITION_MS = 260;

/** The transition window at the top of a ply (non-payoff plies only), with a
 *  left/right direction read off the move itself. */
function activeTransition(
  scene: ClipScene,
  t: number,
): { sf: SegFx; p: number; dir: number } | null {
  const id = scene.opts.style.transition;
  if (id === "none" || id === "shimmer") return null;
  for (let i = 1; i < scene.segs.length; i++) {
    const sf = scene.segs[i];
    if (sf.preMs > 0) continue;
    if (t < sf.start || t > sf.start + TRANSITION_MS) continue;
    const primary = sf.seg.pairs.find((p) => p.primary) ?? sf.seg.pairs[0] ?? null;
    const dir = primary && FILE(primary.to) < FILE(primary.from) ? -1 : 1;
    return { sf, p: (t - sf.start) / TRANSITION_MS, dir };
  }
  return null;
}

/** Follow cam, Ken Burns drift, payoff dolly, tilt sway, and the transition
 *  snap transform, all composed inside the board group. Every term is a pure
 *  function of t, and every zoom stays >= 1 about an interior point so the
 *  board never reveals its own edges. */
function applyCameraWork(
  scene: ClipScene,
  ctx: CanvasRenderingContext2D,
  t: number,
  sqXY: (sq: Square) => { x: number; y: number },
  bcx: number,
  bcy: number,
): void {
  const style = scene.opts.style;
  const L = scene.layout;
  if (style.followCam && t >= scene.lead && t < scene.freezeStart) {
    const target = followTarget(scene, t, sqXY);
    const z = 1.07;
    ctx.translate(target.x, target.y);
    ctx.scale(z, z);
    ctx.translate(-target.x, -target.y);
  }
  if (style.driftCam !== "off") {
    const amp = style.driftCam === "gentle" ? 0.02 : 0.042;
    const z = 1 + amp * (0.5 + 0.5 * Math.sin(t * 0.00042 + 0.8));
    const panX = Math.sin(t * 0.00027) * L.board * 0.008;
    ctx.translate(bcx, bcy);
    ctx.scale(z, z);
    ctx.translate(-bcx + panX, -bcy);
  }
  if (style.payoffDolly) {
    const sf = scene.segs[scene.payoffIndex];
    if (sf && t >= sf.start && t <= sf.start + segSpan(sf)) {
      const p = clamp01((t - sf.start) / segSpan(sf));
      const z = 1 + 0.05 * easeInOutCubic(p);
      const { x, y } = sqXY(sf.target);
      const tx = x + L.sq / 2;
      const ty = y + L.sq / 2;
      ctx.translate(tx, ty);
      ctx.scale(z, z);
      ctx.translate(-tx, -ty);
    }
  }
  if (style.tiltSway) {
    const rot =
      (0.55 * momentumAt(scene, t) + 0.45 * Math.sin(t * 0.0006)) *
      (1.5 * Math.PI / 180);
    ctx.translate(bcx, bcy);
    ctx.rotate(rot);
    ctx.translate(-bcx, -bcy);
  }
  const tr = activeTransition(scene, t);
  if (tr) {
    const { dx01, rot } = transitionShift(style.transition, tr.p, tr.dir);
    if (dx01 !== 0 || rot !== 0) {
      ctx.translate(bcx, bcy);
      ctx.rotate(rot);
      ctx.translate(-bcx + dx01 * L.board, -bcy);
    }
  }
}

// --- Wave-2 board-layer painters ---------------------------------------------

/** Additive bloom swell over the target square while a card fires. */
function drawBloom(
  scene: ClipScene,
  ctx: CanvasRenderingContext2D,
  t: number,
  sqXY: (sq: Square) => { x: number; y: number },
): void {
  const L = scene.layout;
  const amt = scene.opts.style.bloomAmount / 100;
  if (amt <= 0.01) return;
  for (const sf of scene.segs) {
    if (!sf.seg.sig) continue;
    const t0 = sf.start + segLead(sf) + sf.jitterMs;
    const dur = Math.min(900, sf.moveMs + sf.holdMs);
    if (t < t0 || t > t0 + dur) continue;
    const p = (t - t0) / dur;
    const color = sf.energy ? ENERGY_COLOR[sf.energy] : scene.palette.accent;
    const { x, y } = sqXY(sf.target);
    const cx = x + L.sq / 2;
    const cy = y + L.sq / 2;
    const R = L.sq * (1.2 + 0.8 * amt + 0.9 * p) * sf.tierScale;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.sin(Math.PI * p) * (0.12 + 0.34 * amt + 0.06 * Math.sin(t * 0.02));
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, withAlpha(color, 0.8));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
    ctx.restore();
    return;
  }
}

/** Flame streak trailing a capture slide: a tapering ember-colored ribbon
 *  sampled back along the path. Emoji-free by design. */
function drawFlameTrail(
  scene: ClipScene,
  ctx: CanvasRenderingContext2D,
  sf: SegFx,
  u: number,
  t: number,
  sqXY: (sq: Square) => { x: number; y: number },
): void {
  if (u <= 0.02 || u >= 1) return;
  const primary = sf.seg.pairs.find((p) => p.primary) ?? sf.seg.pairs[0] ?? null;
  if (!primary?.captured) return;
  const L = scene.layout;
  const a = sqXY(primary.from);
  const b = sqXY(primary.to);
  const moveT = easeInOutCubic(clamp01(u));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let g = 0; g < 7; g++) {
    const gt = moveT - g * 0.07;
    if (gt <= 0) break;
    const px = a.x + (b.x - a.x) * gt + L.sq / 2;
    const py = a.y + (b.y - a.y) * gt + L.sq / 2;
    const flick = 0.7 + 0.3 * Math.sin(t * 0.05 + g * 1.7);
    const r = L.sq * (0.3 - g * 0.034) * flick;
    if (r <= 0) break;
    ctx.globalAlpha = (0.3 - g * 0.036) * Math.sin(Math.PI * moveT);
    const grad = ctx.createRadialGradient(px, py, 0, px, py, r);
    grad.addColorStop(0, g < 2 ? "#ffd76a" : "#ff9a3d");
    grad.addColorStop(1, "rgba(224,82,31,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(px - r, py - r, r * 2, r * 2);
  }
  ctx.restore();
}

/** Auto move-verdict stamps: "!!" / "!?" / "??" popped beside the landing
 *  square, derived from the capture-swing math at build time. */
function drawStamps(
  scene: ClipScene,
  ctx: CanvasRenderingContext2D,
  t: number,
  sqXY: (sq: Square) => { x: number; y: number },
): void {
  const L = scene.layout;
  const rotKnob = scene.opts.style.stampRotation;
  for (const sf of scene.segs) {
    if (!sf.stamp) continue;
    // Seeded entrance jitter: stamps never land on the exact impact frame.
    const tLand = sf.start + segLead(sf) + sf.moveMs + sf.jitterMs;
    const dur = 900 + sf.freezeMs;
    if (t < tLand || t > tLand + dur) continue;
    const p = (t - tLand) / dur;
    // Settle weight varies per segment: some stamps thud in, some snap.
    const c1 = 1.1 + sf.easeSeed * 1.2;
    const pop = p < 0.18 ? easeOutBackVar(clamp01(p / 0.18), c1) : 1 + 0.015 * Math.sin(t * 0.02);
    const fade = p > 0.82 ? 1 - (p - 0.82) / 0.18 : 1;
    const { x, y } = sqXY(sf.target);
    const size = L.sq * 0.62;
    // Sit above-right of the square, nudged inside the board frame.
    const cx = Math.min(L.boardX + L.board - size, Math.max(L.boardX + size, x + L.sq * 0.95));
    const cy = Math.max(L.boardY + size * 0.8, y - L.sq * 0.05);
    const pal = scene.palette;
    const color = sf.stamp === "!!" ? pal.accent : sf.stamp === "??" ? pal.hot : pal.paper;
    // Rubber-stamp rotation: Off prints square, Subtle lands at a seeded 1 to
    // 3 degrees, Rowdy at 3 to 8. Sign follows the segment's tilt seed.
    const rot =
      rotKnob === "off"
        ? 0
        : (rotKnob === "rowdy" ? 0.05 + 0.09 * Math.abs(sf.tiltSeed) : 0.017 + 0.035 * Math.abs(sf.tiltSeed)) *
          Math.sign(sf.tiltSeed || 1);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(pop, pop);
    ctx.textAlign = "center";
    ctx.font = `800 ${size}px ${scene.opts.fonts.display}`;
    ctx.lineWidth = Math.max(3, size * 0.16);
    ctx.strokeStyle = "rgba(10,8,6,0.92)";
    ctx.lineJoin = "round";
    ctx.strokeText(sf.stamp, 0, 0);
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.2;
    ctx.fillStyle = color;
    ctx.fillText(sf.stamp, 0, 0);
    ctx.restore();
    return;
  }
}

/** Accent corner ticks around the target square during a capture freeze. */
function drawFreezeTicks(
  scene: ClipScene,
  ctx: CanvasRenderingContext2D,
  sf: SegFx,
  t: number,
  sqXY: (sq: Square) => { x: number; y: number },
): void {
  const fStart = sf.start + segLead(sf) + sf.moveMs;
  if (t < fStart || t > fStart + sf.freezeMs) return;
  const p = (t - fStart) / sf.freezeMs;
  const L = scene.layout;
  const { x, y } = sqXY(sf.target);
  const grow = easeOutCubic(clamp01(p * 3));
  const pad = L.sq * (0.12 + 0.06 * grow);
  ctx.save();
  ctx.globalAlpha = 0.9 * (1 - p * 0.4);
  ctx.strokeStyle = scene.palette.accent;
  ctx.lineWidth = 3;
  for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
    const cx = x - pad + sx * (L.sq + pad * 2);
    const cy = y - pad + sy * (L.sq + pad * 2);
    // Hand-drawn tick feel: each corner's two arms differ slightly in length,
    // seeded per corner so the variance is frame-stable.
    const lenA = L.sq * (0.22 + 0.08 * jit01(scene.fieldSeed, sx * 7 + sy * 13 + 1));
    const lenB = L.sq * (0.22 + 0.08 * jit01(scene.fieldSeed, sx * 7 + sy * 13 + 2));
    ctx.beginPath();
    ctx.moveTo(cx + (sx ? -lenA : lenA), cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + (sy ? -lenB : lenB));
    ctx.stroke();
  }
  // A one-beat white blink right at the freeze cut, well under flash limits.
  if (p < 0.12) {
    ctx.globalAlpha = 0.18 * (1 - p / 0.12);
    ctx.fillStyle = "#fff7e6";
    ctx.fillRect(L.boardX - 4, L.boardY - 4, L.board + 8, L.board + 8);
  }
  ctx.restore();
}

/** Captured-material score bug: a minimal chip above the board's right edge
 *  showing who leads on material and by how much. */
function drawScoreBug(scene: ClipScene, ctx: CanvasRenderingContext2D, t: number): void {
  const { layout: L, opts } = scene;
  const v = materialAt(scene, t);
  const lead = Math.round(Math.abs(v));
  const small = opts.aspect === "classic";
  const h = small ? 24 : 36;
  const w = small ? 78 : 118;
  const x = L.boardX + L.board - w;
  const y = L.boardY - h - (small ? 6 : 10);
  if (y < 8) return;
  ctx.save();
  ctx.fillStyle = "rgba(16,14,11,0.85)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // Leader dot: parchment for White, coal for Black, split when even.
  const dot = small ? 7 : 10;
  const dx = x + (small ? 8 : 12);
  const dy = y + h / 2 - dot / 2;
  if (lead === 0) {
    ctx.fillStyle = "#ece7dd";
    ctx.fillRect(dx, dy, dot / 2, dot);
    ctx.fillStyle = "#3a352c";
    ctx.fillRect(dx + dot / 2, dy, dot / 2, dot);
  } else {
    ctx.fillStyle = v > 0 ? "#ece7dd" : "#3a352c";
    ctx.fillRect(dx, dy, dot, dot);
    ctx.strokeStyle = "rgba(236,231,221,0.5)";
    ctx.strokeRect(dx + 0.5, dy + 0.5, dot - 1, dot - 1);
  }
  // Chrome voice: the score bug is data, so it speaks mono.
  ctx.font = `600 ${small ? 12 : 18}px ${opts.fonts.mono}`;
  ctx.textAlign = "left";
  ctx.fillStyle = scene.palette.dim;
  ctx.fillText(lead === 0 ? "EVEN" : `+${lead}`, dx + dot + (small ? 6 : 10), y + h * 0.66);
  ctx.restore();
}

/** Watermark, at the corner the style picked. Corners are the BOARD's corners
 *  so every aspect's platform-safe zones stay respected. */
function drawWatermark(scene: ClipScene, ctx: CanvasRenderingContext2D): void {
  const { layout: L, opts } = scene;
  if (!opts.watermark) return;
  const corner = opts.style.watermarkCorner;
  const leftX = opts.aspect === "tiktok" ? 120 : L.boardX;
  let rightX = opts.aspect === "tiktok" ? 940 : L.boardX + L.board;
  const topY = L.boardY - (opts.aspect === "classic" ? 10 : 16);
  // The score bug owns the board's top-right shoulder; slide a "tr" watermark
  // left of it rather than stacking the two.
  if (corner === "tr" && opts.style.scoreBug) {
    rightX -= opts.aspect === "classic" ? 92 : 136;
  }
  const x = corner === "tl" || corner === "bl" ? leftX : rightX;
  const y = corner === "tl" || corner === "tr" ? topY : L.watermarkY;
  ctx.save();
  ctx.textAlign = corner === "tl" || corner === "bl" ? "left" : "right";
  // Watermark is chrome: mono voice, opacity from the BRAND dial.
  ctx.font = `500 ${opts.aspect === "classic" ? 13 : 22}px ${opts.fonts.mono}`;
  ctx.globalAlpha = Math.max(0.05, Math.min(1, opts.style.watermarkOpacity / 100));
  ctx.fillStyle = scene.palette.paper;
  ctx.fillText(opts.watermark, x, y);
  ctx.restore();
}

function drawSegment(
  scene: ClipScene,
  ctx: CanvasRenderingContext2D,
  sf: SegFx,
  u: number,
  holdU: number,
  t: number,
  sqXY: (sq: Square) => { x: number; y: number },
  drawPiece: (
    p: Piece,
    x: number,
    y: number,
    alpha?: number,
    scale?: number,
    size?: number,
    scaleY?: number,
  ) => void,
): void {
  const { layout: L, opts } = scene;
  const seg = sf.seg;
  const accent = scene.palette.accent;
  const moveT = easeInOutCubic(clamp01(u));
  const primary = seg.pairs.find((p) => p.primary) ?? seg.pairs[0] ?? null;
  const tLand = sf.start + sf.arrowMs + sf.preMs + sf.moveMs;

  if (primary && u >= 1) {
    const a = sqXY(primary.from);
    const b = sqXY(primary.to);
    ctx.fillStyle = withAlpha(accent, 0.28);
    ctx.fillRect(a.x, a.y, L.sq, L.sq);
    ctx.fillStyle = withAlpha(accent, 0.34);
    ctx.fillRect(b.x, b.y, L.sq, L.sq);
  }

  // Energy scene UNDER the pieces (ground layer).
  if (sf.energy) {
    const p = clamp01((t - sf.start - sf.arrowMs - sf.preMs) / (sf.moveMs + sf.holdMs));
    drawEnergy(scene, ctx, sf, p, sqXY, "under");
  }

  // Explainer arrow + capture ring: telegraphed under the pieces so the
  // viewer reads where the move goes before (and while) it happens.
  if (opts.explainArrows) drawMoveArrow(scene, ctx, sf, t, u, sqXY);

  for (const st of seg.statics) {
    const { x, y } = sqXY(st.sq);
    drawPiece(st.piece, x, y);
  }
  for (const v of seg.vanishes) {
    const vt = clamp01((u - 0.3) / 0.45);
    const { x, y } = sqXY(v.sq);
    if (vt < 1) drawPiece(v.piece, x, y, 1 - vt, 1 - vt * 0.35);
  }
  for (const s of seg.spawns) {
    const st = clamp01((u - 0.35) / 0.5);
    const { x, y } = sqXY(s.sq);
    if (st > 0) drawPiece(s.piece, x, y, st, 0.55 + 0.45 * easeOutCubic(st));
  }
  for (const pair of seg.pairs) {
    const a = sqXY(pair.from);
    const b = sqXY(pair.to);
    if (pair.captured) {
      const capT = clamp01((u - 0.55) / 0.35);
      if (capT < 1) drawPiece(pair.captured, b.x, b.y, 1 - capT, 1 - capT * 0.4);
    }
    const x = a.x + (b.x - a.x) * moveT;
    const y = a.y + (b.y - a.y) * moveT;
    if (u > 0 && u < 1) {
      ctx.save();
      ctx.globalAlpha = 0.35 * Math.sin(Math.PI * moveT);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x + L.sq / 2, a.y + L.sq / 2);
      ctx.lineTo(x + L.sq / 2, y + L.sq / 2);
      ctx.stroke();
      ctx.restore();
      // Motion-blur trail: ghost copies sampled back along the path.
      const piece0 = u >= 0.7 ? pair.after : pair.before;
      for (let g = 1; g <= 3; g++) {
        const gt = Math.max(0, moveT - g * 0.085);
        if (gt >= moveT) continue;
        const ga = 0.16 * (1 - g / 4) * Math.sin(Math.PI * moveT);
        if (ga <= 0.01) continue;
        drawPiece(
          piece0,
          a.x + (b.x - a.x) * gt,
          a.y + (b.y - a.y) * gt,
          ga,
          1 - g * 0.04,
        );
      }
    }
    const piece = u >= 0.7 ? pair.after : pair.before;
    const lift = u > 0 && u < 1 ? 1 + 0.09 * Math.sin(Math.PI * moveT) : 1;
    // Squash on landing: a quick vertical compression that springs back.
    let squash = 0;
    if (t >= tLand && t <= tLand + 160) {
      squash = 0.16 * (1 - easeOutCubic((t - tLand) / 160));
    }
    drawPiece(piece, x, y, 1, lift * (1 + squash), L.sq, lift * (1 - squash));
  }

  // Impact dust puff on every landing (small, ground-hugging).
  if (primary && t >= tLand && t <= tLand + 360) {
    const dp = (t - tLand) / 360;
    const { x, y } = sqXY(primary.to);
    const cx = x + L.sq / 2;
    const gy = y + L.sq * 0.82;
    ctx.save();
    for (const d of sf.dust) {
      const pp = clamp01((dp - d.delay * 0.3) / (1 - d.delay * 0.3));
      if (pp <= 0) continue;
      const spread = L.sq * (0.2 + d.speed * 0.5) * easeOutCubic(pp);
      const px = cx + Math.cos(d.ang) * spread;
      const py = gy - Math.abs(Math.sin(d.ang)) * spread * 0.35 + pp * pp * L.sq * 0.1;
      ctx.globalAlpha = (1 - pp) * 0.4;
      ctx.fillStyle = d.tint > 0.5 ? "#b8ae9c" : "#8d8578";
      ctx.beginPath();
      ctx.arc(px, py, L.sq * 0.055 * d.size * (1 + pp * 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Capture shard bursts replace the old red ring.
  drawShards(scene, ctx, sf, t, sqXY);

  // Energy scene OVER the pieces (air layer) + the compact card badge.
  if (sf.energy) {
    const p = clamp01((t - sf.start - sf.arrowMs - sf.preMs) / (sf.moveMs + sf.holdMs));
    drawEnergy(scene, ctx, sf, p, sqXY, "over");
  }
  if (seg.sig) {
    drawCardBadge(scene, ctx, seg.sig, sf.energy, clamp01((u + holdU) / 1.2));
  }
}

function drawShards(
  scene: ClipScene,
  ctx: CanvasRenderingContext2D,
  sf: SegFx,
  t: number,
  sqXY: (sq: Square) => { x: number; y: number },
): void {
  if (sf.shards.length === 0) return;
  const L = scene.layout;
  const te = sf.start + sf.arrowMs + sf.preMs + sf.moveMs * 0.72; // shatter as the mover arrives
  const dur = 420;
  if (t < te || t > te + dur) return;
  const p = (t - te) / dur;
  for (const burst of sf.shards) {
    const { x, y } = sqXY(burst.sq);
    const cx = x + L.sq / 2;
    const cy = y + L.sq / 2;
    for (const sh of burst.parts) {
      const pp = clamp01((p - sh.delay * 0.4) / (1 - sh.delay * 0.4));
      if (pp <= 0) continue;
      const dist = L.sq * (0.15 + sh.speed * 0.85) * easeOutCubic(pp);
      const px = cx + Math.cos(sh.ang) * dist;
      const py = cy + Math.sin(sh.ang) * dist + L.sq * 0.35 * pp * pp; // gravity
      const size = L.sq * 0.12 * sh.size * (1 - pp * 0.6);
      ctx.save();
      ctx.globalAlpha = (1 - pp) * 0.95;
      ctx.translate(px, py);
      ctx.rotate(sh.ang + sh.spin * pp);
      ctx.fillStyle = burst.light
        ? sh.tint > 0.5 ? "#ece7dd" : "#c9bfae"
        : sh.tint > 0.5 ? "#3a352c" : "#57504a";
      ctx.fillRect(-size / 2, -size / 2, size, size * 0.7);
      ctx.restore();
    }
    // One hot flash ring at the impact point.
    if (p < 0.4) {
      ctx.save();
      ctx.globalAlpha = (1 - p / 0.4) * 0.8;
      ctx.strokeStyle = "#e05252";
      ctx.lineWidth = 4 * (1 - p);
      ctx.beginPath();
      ctx.arc(cx, cy, L.sq * (0.25 + p * 1.1), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawEnergy(
  scene: ClipScene,
  ctx: CanvasRenderingContext2D,
  sf: SegFx,
  p: number,
  sqXY: (sq: Square) => { x: number; y: number },
  pass: "under" | "over",
): void {
  const L = scene.layout;
  const kind = sf.energy!;
  const color = ENERGY_COLOR[kind];
  const { x, y } = sqXY(sf.target);
  const cx = x + L.sq / 2;
  const cy = y + L.sq / 2;
  const S = L.sq * sf.tierScale;
  ctx.save();
  // Keep the energy inside the board frame so 9:16 chrome stays clean.
  ctx.beginPath();
  ctx.rect(L.boardX - 4, L.boardY - 4, L.board + 8, L.board + 8);
  ctx.clip();

  if (pass === "under") {
    if (kind === "void") {
      // Darkness pools over the whole board while the collapse runs.
      ctx.fillStyle = `rgba(16,8,28,${0.45 * Math.sin(Math.PI * p)})`;
      ctx.fillRect(L.boardX, L.boardY, L.board, L.board);
    }
    if (kind === "coronation") {
      ctx.fillStyle = withAlpha(color, 0.16 * Math.sin(Math.PI * p));
      ctx.fillRect(L.boardX, L.boardY, L.board, L.board);
    }
    if (kind === "freeze") {
      ctx.fillStyle = withAlpha(color, 0.12 * Math.sin(Math.PI * p));
      ctx.fillRect(L.boardX, L.boardY, L.board, L.board);
    }
    if (kind === "beam") {
      // A light sweep crossing the board through the target row.
      const sweepX = L.boardX - L.sq + (L.board + 2 * L.sq) * easeInOutCubic(p);
      const g = ctx.createLinearGradient(sweepX - L.sq, 0, sweepX + L.sq, 0);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.5, withAlpha(color, 0.3));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(L.boardX, L.boardY, L.board, L.board);
    }
    ctx.restore();
    return;
  }

  switch (kind) {
    case "burst": {
      for (let r = 0; r < 3; r++) {
        const rp = clamp01(p * 1.6 - r * 0.18);
        if (rp <= 0 || rp >= 1) continue;
        ctx.globalAlpha = (1 - rp) * 0.85;
        ctx.strokeStyle = color;
        ctx.lineWidth = 5 - r;
        ctx.beginPath();
        ctx.arc(cx, cy, S * (0.3 + rp * (1.6 + r * 0.5)), 0, Math.PI * 2);
        ctx.stroke();
      }
      sparks(ctx, sf.particles, cx, cy, S * 2, p, color);
      break;
    }
    case "shock": {
      const rp = easeOutCubic(clamp01(p * 1.5));
      if (rp < 1) {
        ctx.globalAlpha = (1 - rp) * 0.95;
        ctx.strokeStyle = color;
        ctx.lineWidth = 14 * (1 - rp * 0.7);
        ctx.beginPath();
        ctx.arc(cx, cy, S * (0.2 + rp * 3.2), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = (1 - rp) * 0.35;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, S * (0.2 + rp * 1.4), 0, Math.PI * 2);
        ctx.fill();
      }
      sparks(ctx, sf.particles, cx, cy, S * 2.6, p, "#ffd0a0");
      break;
    }
    case "freeze": {
      const bp = easeOutCubic(clamp01(p * 1.4));
      ctx.globalAlpha = Math.min(1, (1 - p * 0.6)) * 0.9;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + 0.3;
        const len = S * (0.4 + bp * 1.3);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
        // Side crystals halfway out.
        const mx = cx + Math.cos(ang) * len * 0.55;
        const my = cy + Math.sin(ang) * len * 0.55;
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(ang + 0.7) * len * 0.25, my + Math.sin(ang + 0.7) * len * 0.25);
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + Math.cos(ang - 0.7) * len * 0.25, my + Math.sin(ang - 0.7) * len * 0.25);
        ctx.stroke();
      }
      sparks(ctx, sf.particles, cx, cy, S * 1.4, p, "#d8f2ff");
      break;
    }
    case "beam": {
      sparks(ctx, sf.particles, cx, cy, S * 1.8, p, color);
      break;
    }
    case "ember": {
      for (const em of sf.particles) {
        const pp = clamp01((p - em.delay) / (1 - em.delay));
        if (pp <= 0) continue;
        const px = cx + Math.cos(em.ang) * S * 0.5 + Math.sin(pp * 9 + em.spin) * S * 0.12;
        const py = cy + S * 0.4 - pp * S * (1.2 + em.speed);
        ctx.globalAlpha = (1 - pp) * 0.9;
        ctx.fillStyle = em.tint > 0.6 ? "#ffd76a" : ENERGY_COLOR.ember;
        ctx.beginPath();
        ctx.arc(px, py, S * 0.05 * em.size * (1 - pp * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "petal": {
      for (const pt of sf.particles) {
        const pp = clamp01((p - pt.delay) / (1 - pt.delay));
        if (pp <= 0) continue;
        const dist = S * (0.3 + pt.speed * 1.3) * easeOutCubic(pp);
        const px = cx + Math.cos(pt.ang) * dist + Math.sin(pp * 6 + pt.spin) * S * 0.1;
        const py = cy + Math.sin(pt.ang) * dist * 0.7 + pp * pp * S * 0.6;
        ctx.save();
        ctx.globalAlpha = (1 - pp) * 0.9;
        ctx.translate(px, py);
        ctx.rotate(pt.spin * pp * 2);
        ctx.fillStyle = pt.tint > 0.5 ? ENERGY_COLOR.petal : "#c9e0a8";
        ctx.beginPath();
        ctx.ellipse(0, 0, S * 0.09 * pt.size, S * 0.045 * pt.size, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case "void": {
      const rp = 1 - easeOutCubic(clamp01(p * 1.3)); // collapsing inward
      ctx.globalAlpha = Math.sin(Math.PI * clamp01(p * 1.2)) * 0.9;
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, S * (0.2 + rp * 2.2), 0, Math.PI * 2);
      ctx.stroke();
      for (const v of sf.particles) {
        const pp = clamp01((p - v.delay) / (1 - v.delay));
        if (pp <= 0) continue;
        const dist = S * (0.4 + v.speed * 1.8) * (1 - easeOutCubic(pp));
        ctx.globalAlpha = pp * 0.8;
        ctx.fillStyle = v.tint > 0.5 ? color : "#c9b8f5";
        ctx.beginPath();
        ctx.arc(cx + Math.cos(v.ang) * dist, cy + Math.sin(v.ang) * dist, S * 0.045 * v.size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "coronation": {
      // Rotating gold rays + falling glitter: the apex-card celebration.
      const rays = 10;
      ctx.globalAlpha = Math.sin(Math.PI * p) * 0.5;
      for (let i = 0; i < rays; i++) {
        const ang = (i / rays) * Math.PI * 2 + p * 1.2;
        const g = ctx.createLinearGradient(cx, cy, cx + Math.cos(ang) * S * 3, cy + Math.sin(ang) * S * 3);
        g.addColorStop(0, withAlpha(color, 0.7));
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * S * 3, cy + Math.sin(ang) * S * 3);
        ctx.stroke();
      }
      for (const gl of sf.particles) {
        const pp = (p * (0.6 + gl.speed) + gl.delay) % 1;
        const px = L.boardX + gl.tint * L.board;
        const py = L.boardY + pp * L.board;
        ctx.globalAlpha = Math.sin(Math.PI * pp) * 0.8;
        ctx.fillStyle = gl.size > 0.8 ? "#fff3c4" : color;
        ctx.fillRect(px, py, 3 * gl.size, 3 * gl.size);
      }
      break;
    }
  }
  ctx.restore();
}

function sparks(
  ctx: CanvasRenderingContext2D,
  parts: Particle[],
  cx: number,
  cy: number,
  reach: number,
  p: number,
  color: string,
): void {
  for (const sp of parts) {
    const pp = clamp01((p - sp.delay) / (1 - sp.delay));
    if (pp <= 0 || pp >= 1) continue;
    const dist = reach * sp.speed * easeOutCubic(pp);
    const px = cx + Math.cos(sp.ang) * dist;
    const py = cy + Math.sin(sp.ang) * dist;
    ctx.globalAlpha = (1 - pp) * 0.9;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5 * sp.size;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(sp.ang) * 6 * sp.size, py + Math.sin(sp.ang) * 6 * sp.size);
    ctx.stroke();
  }
}

// --- Explainer layer ---------------------------------------------------------

/** Sampled arrow path in canvas coords: straight for most pieces, the L with
 *  a rounded corner for knights. Deterministic and cheap (28 points). */
function arrowPathPoints(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  knight: boolean,
  cornerR: number,
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  if (!knight) {
    for (let i = 0; i <= 27; i++) {
      const s = i / 27;
      pts.push({ x: ax + (bx - ax) * s, y: ay + (by - ay) * s });
    }
    return pts;
  }
  // Long leg first: matches how the eye tracks a knight hop.
  const horizFirst = Math.abs(bx - ax) > Math.abs(by - ay);
  const cx = horizFirst ? bx : ax;
  const cy = horizFirst ? ay : by;
  const len1 = Math.hypot(cx - ax, cy - ay);
  const len2 = Math.hypot(bx - cx, by - cy);
  const r = Math.min(cornerR, len1 * 0.5, len2 * 0.5);
  // P1: r before the corner on leg 1; P2: r after it on leg 2.
  const p1 = { x: cx - ((cx - ax) / len1) * r, y: cy - ((cy - ay) / len1) * r };
  const p2 = { x: cx + ((bx - cx) / len2) * r, y: cy + ((by - cy) / len2) * r };
  for (let i = 0; i <= 11; i++) {
    const s = i / 11;
    pts.push({ x: ax + (p1.x - ax) * s, y: ay + (p1.y - ay) * s });
  }
  for (let i = 1; i <= 6; i++) {
    // Quadratic bezier through the corner.
    const s = i / 6;
    const q = (a: number, c: number, b: number) =>
      (1 - s) * (1 - s) * a + 2 * (1 - s) * s * c + s * s * b;
    pts.push({ x: q(p1.x, cx, p2.x), y: q(p1.y, cy, p2.y) });
  }
  for (let i = 1; i <= 9; i++) {
    const s = i / 9;
    pts.push({ x: p2.x + (bx - p2.x) * s, y: p2.y + (by - p2.y) * s });
  }
  return pts;
}

/** The move-direction arrow: draws itself on during the telegraph lead
 *  (arrowhead pops as it completes), then fades as the piece slides. Capture
 *  destinations get a pulsing ring until the impact lands. */
function drawMoveArrow(
  scene: ClipScene,
  ctx: CanvasRenderingContext2D,
  sf: SegFx,
  t: number,
  u: number,
  sqXY: (sq: Square) => { x: number; y: number },
): void {
  const { layout: L, opts } = scene;
  const primary = sf.seg.pairs.find((p) => p.primary) ?? sf.seg.pairs[0] ?? null;
  if (!primary || primary.from === primary.to) return;
  const tLand = sf.start + sf.arrowMs + sf.preMs + sf.moveMs;
  if (t > tLand) return;

  const a = sqXY(primary.from);
  const b = sqXY(primary.to);
  const acx = a.x + L.sq / 2;
  const acy = a.y + L.sq / 2;
  const bcx = b.x + L.sq / 2;
  const bcy = b.y + L.sq / 2;

  // Arrow ink from the EXPLAIN dial: reel palette accent (default), the raw
  // site accent, or plain paper for a chalk-line read.
  const arrowInk =
    opts.style.arrowColor === "site"
      ? opts.accent
      : opts.style.arrowColor === "white"
        ? scene.palette.paper
        : scene.palette.accent;

  // Pulsing ring on a capture destination, alive until the mover arrives.
  if (primary.captured) {
    const ringIn = clamp01((t - sf.start) / 150);
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.02);
    ctx.save();
    ctx.globalAlpha = ringIn * (0.5 + 0.35 * pulse);
    ctx.strokeStyle = scene.palette.hot;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(bcx, bcy, L.sq * (0.36 + 0.05 * pulse), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = ringIn * 0.25 * pulse;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bcx, bcy, L.sq * (0.46 + 0.07 * pulse), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (sf.arrowMs === 0) return;
  // Draw-on progress across the telegraph lead (plus any pre-beat), so the
  // arrow is fully drawn ~300ms before the piece even starts to slide.
  const drawU = easeOutCubic(clamp01((t - sf.start) / (sf.arrowMs + sf.preMs)));
  if (drawU <= 0) return;
  // Fade while the piece travels; gone by landing.
  const alpha = (1 - 0.9 * clamp01(u)) * clamp01((tLand - t) / 80 + 1);

  const knight = primary.before.type === "n";
  const raw = arrowPathPoints(acx, acy, bcx, bcy, knight, L.sq * 0.4);
  // Trim both ends so the arrow floats between the squares' centers.
  let pathLen = 0;
  for (let i = 1; i < raw.length; i++) {
    pathLen += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y);
  }
  const trimFrac = Math.min(0.18, (L.sq * 0.3) / Math.max(1, pathLen));
  const startIdx = Math.floor(trimFrac * (raw.length - 1));
  const endIdx = raw.length - 1 - Math.ceil(trimFrac * (raw.length - 1));
  const pts = raw.slice(startIdx, Math.max(startIdx + 2, endIdx + 1));
  const shown = Math.max(2, Math.ceil(pts.length * drawU));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = arrowInk;
  ctx.shadowColor = arrowInk;
  ctx.shadowBlur = L.sq * 0.14;
  ctx.lineWidth = L.sq * 0.1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < shown; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();

  // Arrowhead pops once the shaft is nearly complete.
  const headU = clamp01((drawU - 0.72) / 0.28);
  if (headU > 0) {
    const tip = pts[shown - 1];
    const prev = pts[Math.max(0, shown - 3)];
    const ang = Math.atan2(tip.y - prev.y, tip.x - prev.x);
    const size = L.sq * 0.26 * easeOutBack(headU);
    ctx.fillStyle = arrowInk;
    ctx.beginPath();
    ctx.moveTo(tip.x + Math.cos(ang) * size, tip.y + Math.sin(ang) * size);
    ctx.lineTo(tip.x + Math.cos(ang + 2.5) * size, tip.y + Math.sin(ang + 2.5) * size);
    ctx.lineTo(tip.x + Math.cos(ang - 2.5) * size, tip.y + Math.sin(ang - 2.5) * size);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Tier chip tint for the rule panel: parchment for low tiers, warming up
 *  through gold to the coronation glow at the top of the ladder. */
function tierTint(tier: number): string {
  if (tier >= 8) return "#ffd76a";
  if (tier >= 6) return "#ff9a3d";
  if (tier >= 4) return "#e6bf6a";
  return "#c9c2b4";
}

/** Greedy word wrap against the current ctx font. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const probe = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(probe).width > maxW) {
      lines.push(line);
      line = w;
    } else {
      line = probe;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** The card rule pop-up: a mini card panel (name, tier chip, rule text,
 *  category accent edge, corner ticks) that slides in from whichever side
 *  keeps it off the action square, holds long enough to read, slides out. */
function drawRulePanel(
  scene: ClipScene,
  ctx: CanvasRenderingContext2D,
  t: number,
  sqXY: (sq: Square) => { x: number; y: number },
): void {
  const { layout: L, opts } = scene;
  for (const sf of scene.segs) {
    if (sf.ruleMs <= 0 || !sf.seg.sig) continue;
    const tIn = sf.start + sf.arrowMs + sf.preMs;
    const tOut = tIn + sf.ruleMs;
    if (t < tIn || t > tOut + 240) continue;
    const sig = sf.seg.sig;
    const inU = easeOutCubic(clamp01((t - tIn) / 260));
    const outU = t > tOut ? easeInOutCubic(clamp01((t - tOut) / 240)) : 0;
    const off = 1 - inU + outU; // 0 = parked, 1 = fully offscreen
    if (off >= 1) continue;

    // Side: forced by the EXPLAIN dial, else auto (away from the action).
    const targetX = sqXY(sf.target).x + L.sq / 2;
    const onLeft =
      opts.style.ruleSide === "left"
        ? true
        : opts.style.ruleSide === "right"
          ? false
          : targetX >= L.boardX + L.board / 2;
    const color = sf.energy ? ENERGY_COLOR[sf.energy] : scene.palette.accent;

    const textSize = opts.aspect === "classic" ? 20 : 30;
    const nameSize = Math.round(textSize * 1.15);
    const tierSize = Math.round(textSize * 0.6);
    const w = opts.aspect === "classic" ? 280 : opts.aspect === "square" ? 400 : 430;
    const pad = Math.round(textSize * 0.7);
    const edgeW = 5;

    ctx.save();
    ctx.font = `500 ${textSize}px ${opts.fonts.body}`;
    const lines = wrapText(ctx, sig.description, w - pad * 2 - edgeW);
    const lineH = Math.round(textSize * 1.3);
    const h = pad + tierSize * 1.4 + nameSize * 1.5 + lines.length * lineH + pad;

    // Text-safe margins: TikTok keeps 120 left / 940 right clear of UI.
    const margin = opts.aspect === "tiktok" ? 120 : opts.aspect === "square" ? 60 : 24;
    const xPark = onLeft ? margin : L.W - margin - w;
    const x = xPark + (onLeft ? -1 : 1) * off * (w + margin + 8);
    const y = Math.round(L.boardY + L.board / 2 - h / 2);

    ctx.globalAlpha = 1 - outU * 0.3;
    // Panel plate + category accent edge on the slide-origin side.
    ctx.fillStyle = "rgba(16,14,11,0.93)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = withAlpha(color, 0.85);
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(onLeft ? x : x + w - edgeW, y, edgeW, h);
    // The four corner ticks, same family as the card badge and verdict, each
    // arm with a seeded length wobble for the hand-drawn read.
    ctx.strokeStyle = color;
    for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
      const cxp = x + sx * w;
      const cyp = y + sy * h;
      const lenA = 11 + 6 * jit01(scene.fieldSeed, 31 + sx * 3 + sy * 5);
      const lenB = 11 + 6 * jit01(scene.fieldSeed, 47 + sx * 3 + sy * 5);
      ctx.beginPath();
      ctx.moveTo(cxp + (sx ? -lenA : lenA), cyp);
      ctx.lineTo(cxp, cyp);
      ctx.lineTo(cxp, cyp + (sy ? -lenB : lenB));
      ctx.stroke();
    }

    const tx = x + pad + (onLeft ? edgeW : 0);
    let ty = y + pad + tierSize;
    ctx.textAlign = "left";
    // Tier chip speaks the mono chrome voice; the card name slams in display;
    // the rule copy reads in the text voice. Three voices, one panel.
    ctx.font = `600 ${tierSize}px ${opts.fonts.mono}`;
    ctx.fillStyle = tierTint(sig.tier);
    ctx.fillText(`TIER ${ROMAN[sig.tier - 1] ?? sig.tier}`, tx, ty);
    ty += Math.round(nameSize * 1.25);
    ctx.font = `700 ${nameSize}px ${opts.fonts.display}`;
    ctx.fillStyle = scene.palette.paper;
    ctx.fillText(sig.name, tx, ty);
    ty += Math.round(textSize * 1.1);
    ctx.font = `500 ${textSize}px ${opts.fonts.body}`;
    ctx.fillStyle = "#d9d2c2";
    for (const ln of lines) {
      ty += lineH;
      ctx.fillText(ln, tx, ty - lineH + textSize);
    }
    ctx.restore();
    return;
  }
}

/** Action callouts: small stamped labels that pop over the board edge on
 *  notable beats and thump away again. */
function drawCallouts(
  scene: ClipScene,
  ctx: CanvasRenderingContext2D,
  t: number,
  sqXY: (sq: Square) => { x: number; y: number },
): void {
  const { layout: L, opts } = scene;
  const rotKnob = opts.style.stampRotation;
  for (const sf of scene.segs) {
    if (!sf.callout) continue;
    // Offset from the stamp's jitter (1.6x) so the two never pop together.
    const tLand = sf.start + sf.arrowMs + sf.preMs + sf.moveMs + Math.round(sf.jitterMs * 1.6);
    const dur = 950;
    if (t < tLand || t > tLand + dur) continue;
    const p = (t - tLand) / dur;
    const c1 = 2.4 - sf.easeSeed * 1.2; // callouts settle opposite to stamps
    const pop = p < 0.2 ? easeOutBackVar(clamp01(p / 0.2), c1) : 1 + 0.01 * Math.sin(t * 0.02);
    const fade = p > 0.8 ? 1 - (p - 0.8) / 0.2 : 1;

    // Opposite side from the action square, straddling the board's top edge.
    const targetX = sqXY(sf.target).x + L.sq / 2;
    const onLeft = targetX >= L.boardX + L.board / 2;
    const cx = L.boardX + L.board * (onLeft ? 0.24 : 0.76);
    // Straddle the board's top edge; 9:16 has clear air above the board while
    // the tighter layouts sit the label just inside the frame.
    const cy =
      L.boardY + (opts.aspect === "tiktok" ? -18 : opts.aspect === "square" ? 6 : 22);
    const size = opts.aspect === "classic" ? 20 : 34;
    const text = sf.callout.emoji ? `${sf.callout.text} ${sf.callout.emoji}` : sf.callout.text;
    const rot =
      rotKnob === "off"
        ? 0
        : (onLeft ? -1 : 1) *
          (rotKnob === "rowdy" ? 0.05 + 0.06 * Math.abs(sf.tiltSeed) : 0.03 + 0.025 * Math.abs(sf.tiltSeed));

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(pop, pop);
    ctx.textAlign = "center";
    ctx.font = `800 ${size}px ${opts.fonts.display}`;
    ctx.lineWidth = Math.max(3, size * 0.16);
    ctx.strokeStyle = "rgba(10,8,6,0.92)";
    ctx.lineJoin = "round";
    ctx.strokeText(text, 0, 0);
    ctx.shadowColor = scene.palette.accent;
    ctx.shadowBlur = size * 0.25;
    ctx.fillStyle = sf.isPayoff ? scene.palette.accent : scene.palette.paper;
    ctx.fillText(text, 0, 0);
    ctx.restore();
    return;
  }
}

function drawCardBadge(
  scene: ClipScene,
  ctx: CanvasRenderingContext2D,
  sig: ClipSigMeta,
  energy: EnergyKind | null,
  t01: number,
): void {
  const { layout: L, opts } = scene;
  const a = t01 < 0.15 ? easeOutCubic(t01 / 0.15) : t01 > 0.92 ? clamp01((1 - t01) / 0.08) : 1;
  if (a <= 0) return;
  const scale = 0.94 + 0.06 * (t01 < 0.15 ? easeOutCubic(t01 / 0.15) : 1);
  const cx = L.W / 2;
  const cy = L.boardY + (opts.aspect === "classic" ? 44 : 56);
  const nameSize = opts.aspect === "classic" ? 22 : 30;
  const color = energy ? ENERGY_COLOR[energy] : scene.palette.accent;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.font = `700 ${nameSize}px ${opts.fonts.display}`;
  const w = Math.max(220, ctx.measureText(sig.name).width + 72);
  const h = nameSize * 2.4;
  ctx.fillStyle = "rgba(18,16,14,0.9)";
  ctx.strokeStyle = withAlpha(color, 0.9);
  ctx.lineWidth = 2;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = color;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    ctx.beginPath();
    ctx.moveTo((sx * w) / 2 - sx * 14, (sy * h) / 2);
    ctx.lineTo((sx * w) / 2, (sy * h) / 2);
    ctx.lineTo((sx * w) / 2, (sy * h) / 2 - sy * 14);
    ctx.stroke();
  }
  ctx.textAlign = "center";
  ctx.font = `600 ${Math.round(nameSize * 0.4)}px ${opts.fonts.mono}`;
  ctx.fillStyle = color;
  ctx.fillText(`TIER ${ROMAN[sig.tier - 1] ?? sig.tier}`, 0, -h / 2 + nameSize * 0.62);
  ctx.font = `700 ${nameSize}px ${opts.fonts.display}`;
  ctx.fillStyle = scene.palette.paper;
  ctx.fillText(sig.name, 0, h / 2 - nameSize * 0.5);
  ctx.restore();
}

function drawHook(scene: ClipScene, ctx: CanvasRenderingContext2D, t: number): void {
  const { layout: L, opts } = scene;
  const text = opts.hookText.trim();
  if (!text) return;
  ctx.save();
  ctx.font = `800 ${L.hookSize}px ${opts.fonts.display}`;
  ctx.textAlign = "left";
  const maxW = Math.min(L.board, opts.aspect === "tiktok" ? 820 : L.board);
  const words = text.split(/\s+/);
  const lines: string[][] = [];
  let line: string[] = [];
  for (const w of words) {
    const probe = [...line, w].join(" ");
    if (ctx.measureText(probe).width > maxW && line.length) {
      lines.push(line);
      line = [w];
    } else {
      line.push(w);
    }
  }
  if (line.length) lines.push(line);
  const shown = lines.slice(0, 2);
  const lh = L.hookSize * 1.22;
  const space = ctx.measureText(" ").width;
  // Frame 0 is the thumbnail: the whole hook stamped in full. From the next
  // frame it re-animates word by word, then floats gently forever after.
  const stamp = t < 34;
  let wordIdx = 0;
  shown.forEach((lnWords, li) => {
    const y = L.hookY + li * lh;
    const widths = lnWords.map((w) => ctx.measureText(w).width);
    const total = widths.reduce((a, b) => a + b, 0) + space * (lnWords.length - 1);
    let x = L.W / 2 - total / 2;
    lnWords.forEach((w, wi) => {
      const appear = 120 + wordIdx * 95;
      const wu = stamp ? 1 : clamp01((t - appear) / 180);
      wordIdx++;
      if (wu <= 0) {
        x += widths[wi] + space;
        return;
      }
      // Spring pop in, then a continuous barely-there float so the hook is
      // never a static stamp.
      const pop = stamp ? 1 : 0.6 + 0.4 * easeOutBackVar(wu, 1.2 + jit01(scene.fieldSeed, wordIdx) * 1.1);
      const float = Math.sin(t * 0.0017 + wordIdx * 1.3) * L.hookSize * 0.045;
      const cx = x + widths[wi] / 2;
      ctx.save();
      ctx.globalAlpha = wu;
      ctx.translate(cx, y + float);
      ctx.scale(pop, pop);
      ctx.lineWidth = Math.max(3, L.hookSize * 0.16);
      ctx.strokeStyle = "rgba(10,8,6,0.9)";
      ctx.lineJoin = "round";
      ctx.strokeText(w, -widths[wi] / 2, 0);
      // Print-registration misalignment: a hot pass a couple px off-axis
      // under the paper fill, like a poster run slightly out of register.
      const regOff = L.hookSize * 0.045;
      const regAng = scene.verdictTilt * 30;
      ctx.globalAlpha = wu * 0.45;
      ctx.fillStyle = scene.palette.hot;
      ctx.fillText(w, -widths[wi] / 2 + Math.cos(regAng) * regOff, Math.sin(regAng) * regOff);
      ctx.globalAlpha = wu;
      ctx.fillStyle = scene.palette.paper;
      ctx.fillText(w, -widths[wi] / 2, 0);
      ctx.restore();
      x += widths[wi] + space;
    });
  });
  ctx.restore();
}

function drawPopCaption(
  scene: ClipScene,
  ctx: CanvasRenderingContext2D,
  active: SegFx | null,
  t: number,
): void {
  const { layout: L, opts } = scene;
  if (opts.captionStyle === "off") return;
  // During the freeze the last caption stays put.
  let sf = active;
  if (!sf && t >= scene.freezeStart && scene.segs.length > 0) {
    sf = scene.segs[scene.segs.length - 1];
  }
  if (!sf?.caption) return;
  const cap = sf.caption;
  const style = opts.style;
  const pop = opts.captionStyle === "pop";
  const intensity = intensityScale(opts.emojiLevel);
  // Caption size dial: S / M / L on top of the layout's base size.
  const sizeMult = style.captionSize === "s" ? 0.82 : style.captionSize === "l" ? 1.18 : 1;
  const size = Math.round((cap.big ? L.popSize : L.popSize * 0.62) * sizeMult);
  // Caption parking dial: Low sits at the layout's classic line; Mid and High
  // climb toward the board's lower edge, always inside the text-safe band.
  const boardBottom = L.boardY + L.board;
  const span = Math.max(0, L.popY - boardBottom - size * 1.2);
  const posK = style.captionPos === "high" ? 0.3 : style.captionPos === "mid" ? 0.62 : 1;
  const capY = boardBottom + size * 1.2 + span * posK;
  // Caption ink source: Auto rides the reel palette, the rest are forced.
  const pal = scene.palette;
  const baseInk =
    style.captionColor === "accent"
      ? pal.accent
      : style.captionColor === "white"
        ? "#f5f2ea"
        : style.captionColor === "custom"
          ? style.captionHex
          : pal.paper;
  const hotInk = style.captionColor === "auto" ? pal.accent : baseInk;
  ctx.save();
  ctx.textAlign = "left";
  ctx.font = `800 ${size}px ${opts.fonts.display}`;
  const tokens: CaptionWord[] = cap.emoji
    ? [...cap.words, { text: cap.emoji, hot: false }]
    : cap.words;
  const gap = size * 0.3;
  const widths = tokens.map((w) => ctx.measureText(w.text).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (tokens.length - 1);
  let x = L.W / 2 - total / 2;
  tokens.forEach((word, i) => {
    // The segment's seeded jitter keeps caption pops out of lockstep with the
    // stamps and callouts that share its beat.
    const appear =
      sf!.start + sf!.arrowMs + sf!.preMs + Math.round(sf!.jitterMs * 0.5) + (pop ? i * 110 : 0);
    const wu = clamp01((t - appear) / 160);
    if (wu <= 0) {
      x += widths[i] + gap;
      return;
    }
    const s = pop ? 1 + (0.5 * intensity) * (1 - easeOutCubic(wu)) : 1;
    // After the pop the word keeps living: a subtle float / wobble, and hot
    // keywords carry a pulsing glow.
    const settled = wu >= 1;
    const float = settled ? Math.sin(t * 0.005 + i * 1.1) * size * 0.05 : 0;
    const wob = settled ? Math.sin(t * 0.003 + i * 2.1) * 0.02 : 0;
    const cxw = x + widths[i] / 2;
    ctx.save();
    ctx.globalAlpha = pop ? wu : 1;
    ctx.translate(cxw, capY + float);
    ctx.rotate(wob);
    ctx.scale(s, s);
    ctx.lineWidth = Math.max(3, size * 0.14);
    ctx.strokeStyle = "rgba(10,8,6,0.9)";
    ctx.lineJoin = "round";
    ctx.strokeText(word.text, -widths[i] / 2, 0);
    if (word.hot) {
      ctx.shadowColor = hotInk;
      ctx.shadowBlur = size * (0.2 + 0.12 * Math.sin(t * 0.007 + i));
    }
    ctx.fillStyle = word.hot ? hotInk : cap.big ? baseInk : pal.dim;
    ctx.fillText(word.text, -widths[i] / 2, 0);
    ctx.restore();
    x += widths[i] + gap;
  });
  ctx.restore();
}

/** Interpolated white-minus-black material at time t, with an overshooting
 *  lurch on segments where the value actually jumps. Shared by the momentum
 *  bar, the board-glow pulse, and the score bug. */
function materialAt(scene: ClipScene, t: number): number {
  let value = scene.matStart;
  for (const sf of scene.segs) {
    const from = value;
    const to = sf.matAfter;
    if (t >= sf.start + segSpan(sf)) {
      value = to;
      continue;
    }
    if (t >= sf.start) {
      const u = clamp01((t - sf.start - segLead(sf)) / (sf.moveMs + sf.holdMs * 0.4));
      const ease = Math.abs(to - from) >= 3 ? easeOutBack(u) : easeInOutCubic(u);
      value = from + (to - from) * ease;
    }
    break;
  }
  return value;
}

/** Signed momentum at time t, -1..1: the material swing squashed to a bar. */
function momentumAt(scene: ClipScene, t: number): number {
  const value = materialAt(scene, t);
  return Math.max(-1, Math.min(1, (value / (Math.abs(value) + 6)) * 1.6));
}

function drawMomentum(scene: ClipScene, ctx: CanvasRenderingContext2D, t: number): void {
  const { layout: L } = scene;
  const f = momentumAt(scene, t);
  const x = L.momentumX;
  const w = L.momentumW;
  const top = L.boardY;
  const h = L.board;
  const mid = top + h / 2;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x, top, w, h);
  const extent = (h / 2) * Math.abs(f);
  ctx.fillStyle = f >= 0 ? scene.palette.paper : "#2f2b26";
  if (f >= 0) ctx.fillRect(x, mid - extent, w, extent);
  else ctx.fillRect(x, mid, w, extent);
  ctx.strokeStyle = withAlpha(scene.palette.accent, 0.7);
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, top + 0.5, w - 1, h - 1);
  ctx.beginPath();
  ctx.moveTo(x - 3, mid);
  ctx.lineTo(x + w + 3, mid);
  ctx.stroke();
}

function drawProgress(
  scene: ClipScene,
  ctx: CanvasRenderingContext2D,
  done: number,
  active: SegFx | null,
  u: number,
): void {
  const { layout: L, opts } = scene;
  const n = scene.segs.length;
  const y = L.progressY;
  const w = L.board;
  const cellGap = 4;
  const cellW = (w - cellGap * (n - 1)) / n;
  for (let i = 0; i < n; i++) {
    const x = L.boardX + i * (cellW + cellGap);
    const activeHere = active && scene.segs[i] === active;
    const fill = i < done ? 1 : activeHere ? u : 0;
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(x, y, cellW, 6);
    if (fill > 0) {
      ctx.fillStyle = scene.palette.accent;
      ctx.fillRect(x, y, cellW * clamp01(fill), 6);
    }
  }
  const current = Math.min(n, done + (active ? 1 : 0)) || (done >= n ? n : 0);
  // Chrome voice: the move counter is a readout, so it speaks mono.
  ctx.font = `500 ${opts.aspect === "classic" ? 11 : 18}px ${opts.fonts.mono}`;
  ctx.fillStyle = "#7f7d77";
  ctx.textAlign = "left";
  ctx.fillText(`MOVE ${Math.max(1, current)}/${n}`, L.boardX, y + (opts.aspect === "classic" ? 22 : 32));
}

function drawVerdict(scene: ClipScene, ctx: CanvasRenderingContext2D, p01: number): void {
  const { layout: L, opts } = scene;
  const v = opts.verdict!;
  const p = clamp01(p01);
  // White flash on the freeze frame.
  if (p < 0.22) {
    ctx.fillStyle = `rgba(255,250,238,${0.75 * (1 - p / 0.22)})`;
    ctx.fillRect(0, 0, L.W, L.H);
  }
  // Spring slam: overshoots below rest size then snaps back, and the settled
  // stamp keeps a barely-visible pulse so the freeze is never a still image.
  // It also prints OFF-AXIS: a seeded 1 to 3 degree tilt that eases toward
  // level as it settles but never fully squares up, like a rubber stamp.
  const slam =
    p < 0.2 ? 1.8 - 0.8 * easeOutBack(p / 0.2) : 1 + 0.006 * Math.sin(p01 * 26);
  const tilt = scene.verdictTilt * (p < 0.2 ? 1.6 - 0.6 * easeOutCubic(p / 0.2) : 1);
  const cx = L.W / 2;
  const cy = L.boardY + L.board / 2;
  const mainSize = opts.aspect === "classic" ? 56 : 92;
  const pal = scene.palette;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.scale(slam, slam);
  ctx.textAlign = "center";
  ctx.font = `800 ${mainSize}px ${opts.fonts.display}`;
  const w = Math.max(L.board * 0.55, ctx.measureText(v.main).width + 96);
  const h = v.sub ? mainSize * 2.2 : mainSize * 1.7;
  ctx.fillStyle = "rgba(14,12,10,0.86)";
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = withAlpha(pal.accent, 0.9);
  ctx.lineWidth = 3;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = pal.accent;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    // Seeded arm-length variance keeps the frame ticks hand-cut.
    const lenA = 18 + 9 * jit01(scene.fieldSeed, 61 + sx * 2 + sy * 3);
    const lenB = 18 + 9 * jit01(scene.fieldSeed, 73 + sx * 2 + sy * 3);
    ctx.beginPath();
    ctx.moveTo((sx * w) / 2 - sx * lenA, (sy * h) / 2);
    ctx.lineTo((sx * w) / 2, (sy * h) / 2);
    ctx.lineTo((sx * w) / 2, (sy * h) / 2 - sy * lenB);
    ctx.stroke();
  }
  const isMate = v.main === "CHECKMATE";
  const mainInk = isMate ? pal.hot : pal.accent;
  const mainY = v.sub ? -mainSize * 0.1 : mainSize * 0.32;
  // Print-registration misalignment under the big verdict type.
  const regOff = mainSize * 0.04;
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = isMate ? pal.accent : pal.hot;
  ctx.fillText(v.main, Math.sign(scene.verdictTilt) * regOff, mainY + regOff * 0.6);
  ctx.globalAlpha = 1;
  ctx.fillStyle = mainInk;
  ctx.fillText(v.main, 0, mainY);
  if (v.sub) {
    ctx.font = `600 ${Math.round(mainSize * 0.34)}px ${opts.fonts.body}`;
    ctx.fillStyle = pal.paper;
    ctx.fillText(v.sub, 0, mainSize * 0.62);
  }
  ctx.restore();
}

function drawEndCard(
  scene: ClipScene,
  ctx: CanvasRenderingContext2D,
  p01: number,
  images: Map<string, HTMLImageElement> | null,
  drawPiece: (p: Piece, x: number, y: number, alpha?: number, scale?: number, size?: number) => void,
): void {
  void images;
  const { layout: L, opts } = scene;
  const p = clamp01(p01);
  const tAbs = scene.endStart + p01 * scene.endMs;
  const a = easeOutCubic(clamp01(p / 0.18));
  // The last frames ease down slightly so the final frame hands off to the
  // dark frame-0 intro when the reel loops.
  const loopDim = p > 0.92 ? 1 - 0.25 * easeInOutCubic((p - 0.92) / 0.08) : 1;
  ctx.save();
  ctx.globalAlpha = a * loopDim;
  const cx = L.W / 2;
  const markSize = opts.aspect === "classic" ? 56 : 88;
  const topY = opts.aspect === "tiktok" ? L.H * 0.32 : L.H * 0.24;

  // Logo pops in with a spring, then breathes.
  const logoPop =
    p < 0.22 ? easeOutBack(clamp01(p / 0.22)) : 1 + 0.007 * Math.sin(tAbs * 0.003);
  ctx.save();
  ctx.translate(cx, topY - markSize * 0.35);
  ctx.scale(logoPop, logoPop);
  ctx.translate(-cx, -(topY - markSize * 0.35));
  ctx.font = `800 ${markSize}px ${opts.fonts.display}`;
  const wm1 = "nerf";
  const wm2 = "chess";
  const w1 = ctx.measureText(wm1).width;
  const w2 = ctx.measureText(wm2).width;
  ctx.textAlign = "left";
  ctx.fillStyle = scene.palette.paper;
  ctx.fillText(wm1, cx - (w1 + w2) / 2, topY);
  ctx.fillStyle = scene.palette.accent;
  ctx.fillText(wm2, cx - (w1 + w2) / 2 + w1, topY);
  ctx.restore();

  // The CTA line types itself on in the mono chrome voice, caret blinking.
  const url = opts.ctaText.trim() || "nerfchess.com";
  const typed = Math.round(clamp01((p - 0.16) / 0.4) * url.length);
  ctx.textAlign = "center";
  ctx.font = `500 ${Math.round(markSize * 0.28)}px ${opts.fonts.mono}`;
  ctx.fillStyle = scene.palette.dim;
  const shownUrl =
    url.slice(0, typed) +
    (typed < url.length && Math.floor(tAbs / 200) % 2 === 0 ? "_" : "");
  ctx.fillText(shownUrl, cx, topY + markSize * 0.66);

  // Final position, miniaturized, sliding up into place.
  const slide = 1 - easeOutCubic(clamp01((p - 0.2) / 0.35));
  const mini = Math.min(L.board * 0.5, opts.aspect === "classic" ? 280 : 440);
  const msq = mini / 8;
  const mx = cx - mini / 2;
  const my = topY + markSize * 1.1 + slide * mini * 0.16;
  ctx.save();
  ctx.globalAlpha *= easeOutCubic(clamp01((p - 0.18) / 0.3));
  ctx.strokeStyle = withAlpha(scene.palette.accent, 0.45 + 0.12 * Math.sin(tAbs * 0.004));
  ctx.lineWidth = 2;
  ctx.strokeRect(mx - 3, my - 3, mini + 6, mini + 6);
  for (let sq = 0 as Square; sq < 64; sq++) {
    const f = FILE(sq);
    const r = RANK(sq);
    const col = opts.orientation === "w" ? f : 7 - f;
    const row = opts.orientation === "w" ? 7 - r : r;
    const light = (f + r) % 2 === 1;
    ctx.fillStyle = light ? opts.colors.light : opts.colors.dark;
    ctx.fillRect(mx + col * msq, my + row * msq, msq, msq);
  }
  for (let sq = 0 as Square; sq < 64; sq++) {
    const pc = opts.timeline.final[sq];
    if (!pc) continue;
    const f = FILE(sq);
    const r = RANK(sq);
    const col = opts.orientation === "w" ? f : 7 - f;
    const row = opts.orientation === "w" ? 7 - r : r;
    drawPiece(pc, mx + col * msq, my + row * msq, 1, 1, msq);
  }
  ctx.restore();
  if (opts.watermark) {
    ctx.globalAlpha =
      a * loopDim * clamp01((p - 0.45) / 0.2) *
      Math.max(0.05, Math.min(1, opts.style.watermarkOpacity / 100));
    ctx.font = `500 ${opts.aspect === "classic" ? 13 : 22}px ${opts.fonts.mono}`;
    ctx.fillStyle = scene.palette.paper;
    ctx.fillText(opts.watermark, cx, my + mini + (opts.aspect === "classic" ? 34 : 56));
  }
  ctx.restore();
}

// --- Always-on overlays ------------------------------------------------------

/** Intro slam accents: a flash ring plus dust kicked off the board edges the
 *  moment the board lands. Drawn inside the board group so it scales with the
 *  slam itself. */
function drawIntroSlam(
  scene: ClipScene,
  ctx: CanvasRenderingContext2D,
  t: number,
  bcx: number,
  bcy: number,
): void {
  const L = scene.layout;
  const tImp = scene.lead * 0.55; // the slam touches down here
  if (t < tImp || t > tImp + 300) return;
  const p = (t - tImp) / 300;
  ctx.save();
  // Flash ring expanding off the board.
  ctx.globalAlpha = (1 - p) * 0.85;
  ctx.strokeStyle = withAlpha(scene.palette.accent, 0.9);
  ctx.lineWidth = 10 * (1 - p * 0.6);
  ctx.beginPath();
  ctx.arc(bcx, bcy, L.board * (0.3 + easeOutCubic(p) * 0.55), 0, Math.PI * 2);
  ctx.stroke();
  // Hot white core flash for the first frames.
  if (p < 0.3) {
    ctx.globalAlpha = (1 - p / 0.3) * 0.28;
    ctx.fillStyle = "#fff7e6";
    ctx.fillRect(L.boardX - 4, L.boardY - 4, L.board + 8, L.board + 8);
  }
  // Dust bursting off the bottom edge.
  for (const d of scene.introDust) {
    const pp = clamp01((p - d.delay * 0.3) / (1 - d.delay * 0.3));
    if (pp <= 0) continue;
    const px = L.boardX + d.tint * L.board;
    const py = L.boardY + L.board + 4 - Math.abs(Math.sin(d.ang)) * L.sq * 0.9 * easeOutCubic(pp);
    ctx.globalAlpha = (1 - pp) * 0.4;
    ctx.fillStyle = d.size > 0.7 ? "#b8ae9c" : "#8d8578";
    ctx.beginPath();
    ctx.arc(px, py, L.sq * 0.06 * d.size * (1 + pp), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Between plies a brief accent shimmer sweeps across the board frame. */
function drawEdgeShimmer(scene: ClipScene, ctx: CanvasRenderingContext2D, t: number): void {
  const L = scene.layout;
  for (let i = 1; i < scene.segs.length; i++) {
    const sf = scene.segs[i];
    if (sf.preMs > 0) continue; // the payoff gets the pre-beat instead
    if (t < sf.start || t > sf.start + 240) continue;
    const p = (t - sf.start) / 240;
    const x0 = L.boardX - 4;
    const y0 = L.boardY - 4;
    const w = L.board + 8;
    const bandX = x0 + (p * 1.5 - 0.25) * w;
    const g = ctx.createLinearGradient(bandX - w * 0.18, y0, bandX + w * 0.18, y0 + w);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.5, withAlpha(scene.palette.accent, 0.9));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalAlpha = Math.sin(Math.PI * p) * 0.85;
    ctx.strokeStyle = g;
    ctx.lineWidth = 4;
    ctx.strokeRect(x0, y0, w, w);
    ctx.restore();
    return;
  }
}

// Deterministic film grain: a handful of seeded noise tiles generated once per
// module load (fixed seeds, so every render of frame N picks the same tile and
// the offline encode stays frame-exact with the preview), cycled per frame.
const GRAIN_TILE = 128;
const GRAIN_FRAMES = 4;
let grainCache: HTMLCanvasElement[] | null = null;

function grainTiles(): HTMLCanvasElement[] | null {
  if (typeof document === "undefined") return null;
  if (grainCache) return grainCache;
  const tiles: HTMLCanvasElement[] = [];
  for (let i = 0; i < GRAIN_FRAMES; i++) {
    const c = document.createElement("canvas");
    c.width = GRAIN_TILE;
    c.height = GRAIN_TILE;
    const g = c.getContext("2d");
    if (!g) return null;
    const img = g.createImageData(GRAIN_TILE, GRAIN_TILE);
    const rng = mulberry32(0x9e3779b9 + i * 0x1005);
    for (let px = 0; px < img.data.length; px += 4) {
      const v = rng() > 0.5 ? 255 : 0;
      img.data[px] = v;
      img.data[px + 1] = v;
      img.data[px + 2] = v;
      img.data[px + 3] = rng() < 0.18 ? 24 : 0;
    }
    g.putImageData(img, 0, 0);
    tiles.push(c);
  }
  grainCache = tiles;
  return tiles;
}

/** The always-on finishing pass, composed strictly by config: flash-cut,
 *  color grade, confetti, VHS, glitch bursts, chromatic split, vignette,
 *  film grain, letterbox, and the single-frame invert flash. Runs over EVERY
 *  frame, end card included. */
function drawOverlays(scene: ClipScene, ctx: CanvasRenderingContext2D, t: number): void {
  const L = scene.layout;
  const style = scene.opts.style;

  // Flash-cut transition: a soft white kiss at the top of each ply.
  if (style.transition === "flash") {
    const tr = activeTransition(scene, t);
    if (tr) paintFlashCut(ctx, tr.p, L.W, L.H);
  }

  // Color grade: precomputed blend layers over the finished frame, scaled by
  // the strength dial; the duotone grade compiles from its two hex wells.
  applyGrade(ctx, style.grade, L.W, L.H, t, style.gradeStrength / 100, {
    a: style.duotoneA,
    b: style.duotoneB,
  });

  // Victory confetti over the verdict freeze.
  if (scene.celebrate && t >= scene.freezeStart) {
    paintConfetti(ctx, L.W, L.H, t - scene.freezeStart, scene.fieldSeed);
  }

  // VHS: scanlines, tracking band, REC chrome (mono, like real deck chrome).
  if (style.vhs) paintVhs(ctx, L.W, L.H, t, L.boardX, L.boardY, scene.opts.fonts.mono);

  // Seeded glitch bursts on capture landings (self-blit, so post-grade), the
  // violence scaled by the FX dial.
  if (style.glitch) {
    for (const sf of scene.segs) {
      if (sf.shards.length === 0) continue;
      paintGlitch(
        ctx, L.W, L.H, t, sf.start + segLead(sf) + sf.moveMs, scene.fieldSeed,
        style.glitchAmount / 100,
      );
    }
  }

  // Chromatic split. "impacts": red/cyan board-frame ghosts for a few frames
  // after a hit. "always": the same ghosts simmering the whole clip.
  if (style.chromatic !== "off") {
    let q = 0;
    if (style.chromatic === "always") q = 0.35 + 0.15 * Math.sin(t * 0.003);
    for (const sf of scene.segs) {
      if (sf.shards.length === 0 && !sf.isPayoff) continue;
      const te = sf.start + segLead(sf) + sf.moveMs;
      if (t < te || t > te + 130) continue;
      q = Math.max(q, 1 - (t - te) / 130);
      break;
    }
    if (q > 0.02) {
      const off = 3 * q;
      ctx.save();
      ctx.globalAlpha = 0.35 * q;
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ff5a4d";
      ctx.strokeRect(L.boardX - 4 - off, L.boardY - 4, L.board + 8, L.board + 8);
      ctx.strokeStyle = "#4dc8ff";
      ctx.strokeRect(L.boardX - 4 + off, L.boardY - 4, L.board + 8, L.board + 8);
      ctx.restore();
    }
  }

  // Vignette, breathing very slightly.
  const vig = ctx.createRadialGradient(
    L.W / 2, L.H / 2, Math.min(L.W, L.H) * 0.42,
    L.W / 2, L.H / 2, Math.max(L.W, L.H) * 0.72,
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, `rgba(8,6,4,${0.3 + 0.04 * Math.sin(t * 0.0013)})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, L.W, L.H);

  // Film grain: deterministic tiles cycled at frame rate.
  if (style.grain !== "off") {
    const tiles = grainTiles();
    if (tiles) {
      const tile = tiles[Math.floor(t / (1000 / 30)) % GRAIN_FRAMES];
      const pat = ctx.createPattern(tile, "repeat");
      if (pat) {
        ctx.save();
        ctx.globalAlpha = style.grain === "gritty" ? 0.8 : 0.5;
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, L.W, L.H);
        if (style.grain === "gritty") {
          // A second, coarser pass: the same tiles at double scale.
          ctx.globalAlpha = 0.35;
          ctx.scale(2, 2);
          ctx.fillRect(0, 0, L.W / 2, L.H / 2);
        }
        ctx.restore();
      }
    }
  }

  // Animated letterbox: bars slide in over the intro, squeeze on the payoff.
  if (style.letterbox) {
    const inU = easeOutCubic(clamp01(t / 600));
    let extra = 0;
    const sf = scene.segs[scene.payoffIndex];
    if (sf && t >= sf.start) {
      extra =
        t <= sf.start + segSpan(sf)
          ? easeInOutCubic(clamp01((t - sf.start) / 500))
          : 1;
    }
    paintLetterbox(ctx, L.W, L.H, inU, extra);
  }

  // Single-frame invert flash on the payoff impact. Epilepsy-safe by
  // construction: it fires once per clip (the payoff is unique), lasts ONE
  // frame at 30fps, and can never repeat within 2 seconds.
  if (style.invertFlash) {
    const sf = scene.segs[scene.payoffIndex];
    if (sf && (sf.shards.length > 0 || sf.seg.sig)) {
      const te = sf.start + segLead(sf) + sf.moveMs;
      if (t >= te && t < te + 1000 / 30) {
        ctx.save();
        ctx.globalCompositeOperation = "difference";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, L.W, L.H);
        ctx.restore();
      }
    }
  }
}
