// The clip style engine: color grades, ambient particle fields, ply
// transitions, and the finishing FX passes (VHS, glitch, letterbox, confetti),
// each a pure deterministic painter keyed off (t, seed, config) and registered
// in a lookup map so renderClipFrame composes them by config without branching
// sprawl. Anything expensive (gradient layers, scanlines) is precomputed to an
// offscreen canvas ONCE per (config, size) and composited per frame, so the
// preview holds 60fps and per-frame allocations stay near zero. No ctx.filter
// anywhere (Safari inconsistency): grades are blend-mode composites only.
//
// Determinism contract: no Date.now(), no Math.random(). Every painter is a
// pure function of the milliseconds into the clip plus a fixed seed, so the
// preview, the Tier 1 offline encode, and the Tier 2 live capture produce
// identical frames.

import type { CaptionStyle, EmojiLevel } from "./clipScene";
import { mulberry32 } from "./clipScene";
import type { MusicTrackId } from "./clipMusic";

// --- The style object --------------------------------------------------------

export type ZoomStyle = "off" | "subtle" | "punchy" | "extreme";
export type DriftCam = "off" | "gentle" | "cinematic";
export type ShakeLevel = "off" | "subtle" | "heavy";
export type ChromaticMode = "off" | "impacts" | "always";
export type GrainLevel = "off" | "fine" | "gritty";
export type GradeId =
  | "none"
  | "noir"
  | "vaporwave"
  | "cyberpunk"
  | "vintage"
  | "emerald"
  | "infrared"
  | "bleach";
export type ParticleFieldId =
  | "embers"
  | "snow"
  | "rain"
  | "sparks"
  | "matrix"
  | "bubbles"
  | "off";
export type TransitionId = "shimmer" | "whip" | "flash" | "spin" | "pixel" | "none";
export type ClipSpeed = 0.75 | 1 | 1.25 | 1.5;
export type SlowmoDepth = "off" | "classic" | "ultra";
export type WatermarkCorner = "tl" | "tr" | "bl" | "br";

/** Every wave-2 knob in one object. Lives on ClipSceneOptions as `style`, so
 *  the whole thing participates in the auto re-encode dependency. */
export interface ClipStyle {
  zoom: ZoomStyle;
  followCam: boolean;
  driftCam: DriftCam;
  payoffDolly: boolean;
  tiltSway: boolean;
  grade: GradeId;
  shake: ShakeLevel;
  chromatic: ChromaticMode;
  grain: GrainLevel;
  letterbox: boolean;
  glitch: boolean;
  vhs: boolean;
  bloom: boolean;
  invertFlash: boolean;
  particles: ParticleFieldId;
  confetti: boolean;
  speed: ClipSpeed;
  slowmo: SlowmoDepth;
  captureFreeze: boolean;
  stutter: boolean;
  transition: TransitionId;
  verdictStamps: boolean;
  flameTrail: boolean;
  scoreBug: boolean;
  watermarkCorner: WatermarkCorner;
  /** Deterministic seed for glitch slices, pixel dissolves, confetti, and the
   *  Surprise-me shuffle. Incremented per Surprise tap. */
  seed: number;
}

export const STYLE_DEFAULTS: ClipStyle = {
  zoom: "punchy",
  followCam: false,
  driftCam: "off",
  payoffDolly: false,
  tiltSway: false,
  grade: "none",
  shake: "heavy",
  chromatic: "impacts",
  grain: "fine",
  letterbox: false,
  glitch: true,
  vhs: false,
  bloom: true,
  invertFlash: false,
  particles: "embers",
  confetti: true,
  speed: 1,
  slowmo: "classic",
  captureFreeze: false,
  stutter: false,
  transition: "shimmer",
  verdictStamps: true,
  flameTrail: true,
  scoreBug: false,
  watermarkCorner: "br",
  seed: 0,
};

// --- Style presets -----------------------------------------------------------

/** Knobs a preset may set OUTSIDE the style object (they live on the modal's
 *  option state but belong to the one-tap vibe). */
export interface StylePresetExtras {
  emojiLevel?: EmojiLevel;
  captionStyle?: CaptionStyle;
  musicTrack?: MusicTrackId;
}

export interface StylePreset {
  id: string;
  label: string;
  style: Partial<ClipStyle>;
  extras?: StylePresetExtras;
}

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "tiktok",
    label: "TikTok Hype",
    style: {},
    extras: { emojiLevel: "tasteful", captionStyle: "pop" },
  },
  {
    id: "cinematic",
    label: "Cinematic",
    style: {
      zoom: "subtle",
      driftCam: "cinematic",
      payoffDolly: true,
      grade: "noir",
      shake: "subtle",
      chromatic: "off",
      letterbox: true,
      glitch: false,
      bloom: false,
      particles: "off",
      confetti: false,
      slowmo: "ultra",
      transition: "none",
      verdictStamps: false,
      flameTrail: false,
    },
    extras: { emojiLevel: "off", captionStyle: "static", musicTrack: "cathedral" },
  },
  {
    id: "retro",
    label: "Retro Arcade",
    style: {
      vhs: true,
      grain: "gritty",
      transition: "pixel",
      particles: "sparks",
      glitch: true,
      scoreBug: true,
      flameTrail: true,
    },
    extras: { musicTrack: "chiptune" },
  },
  {
    id: "analyst",
    label: "Clean Analyst",
    style: {
      zoom: "off",
      followCam: true,
      shake: "off",
      chromatic: "off",
      grain: "off",
      glitch: false,
      bloom: false,
      particles: "off",
      confetti: false,
      slowmo: "off",
      captureFreeze: true,
      transition: "none",
      verdictStamps: true,
      flameTrail: false,
      scoreBug: true,
    },
    extras: { emojiLevel: "off", captionStyle: "static", musicTrack: "quiet" },
  },
  {
    id: "brainrot",
    label: "Brainrot Max",
    style: {
      zoom: "extreme",
      followCam: true,
      driftCam: "gentle",
      tiltSway: true,
      shake: "heavy",
      chromatic: "always",
      grain: "gritty",
      glitch: true,
      bloom: true,
      invertFlash: true,
      particles: "matrix",
      confetti: true,
      speed: 1.25,
      slowmo: "ultra",
      captureFreeze: true,
      stutter: true,
      transition: "whip",
      verdictStamps: true,
      flameTrail: true,
      scoreBug: true,
    },
    extras: { emojiLevel: "brainrot", captionStyle: "pop", musicTrack: "phonk" },
  },
  {
    id: "noir",
    label: "Noir",
    style: {
      zoom: "subtle",
      driftCam: "gentle",
      payoffDolly: true,
      grade: "noir",
      shake: "subtle",
      chromatic: "off",
      grain: "gritty",
      letterbox: true,
      glitch: false,
      bloom: false,
      particles: "rain",
      confetti: false,
      transition: "flash",
      verdictStamps: false,
      flameTrail: false,
    },
    extras: { emojiLevel: "off", musicTrack: "quiet" },
  },
  {
    id: "vapor",
    label: "Vaporwave",
    style: {
      grade: "vaporwave",
      driftCam: "gentle",
      tiltSway: true,
      chromatic: "always",
      particles: "bubbles",
      transition: "spin",
      bloom: true,
    },
    extras: { musicTrack: "neon" },
  },
];

/** Deterministic Surprise-me: the Nth tap always yields the same combo. Picks
 *  lean coherent (a base vibe, then a few seeded swaps) rather than uniform
 *  noise. */
export function surpriseStyle(tap: number): ClipStyle {
  const rng = mulberry32(0x5eed5 ^ Math.imul(tap, 0x9e3779b9));
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
  const base = STYLE_PRESETS[Math.floor(rng() * STYLE_PRESETS.length)];
  const s: ClipStyle = { ...STYLE_DEFAULTS, ...base.style };
  s.grade = pick(["none", "noir", "vaporwave", "cyberpunk", "vintage", "emerald", "infrared", "bleach"] as const);
  s.particles = pick(["embers", "snow", "rain", "sparks", "matrix", "bubbles", "off"] as const);
  s.transition = pick(["shimmer", "whip", "flash", "spin", "pixel", "none"] as const);
  s.zoom = pick(["subtle", "punchy", "punchy", "extreme"] as const);
  s.speed = pick([0.75, 1, 1, 1.25, 1.25, 1.5] as const);
  if (rng() < 0.45) s.followCam = !s.followCam;
  if (rng() < 0.4) s.driftCam = pick(["off", "gentle", "cinematic"] as const);
  if (rng() < 0.35) s.vhs = !s.vhs;
  if (rng() < 0.4) s.letterbox = !s.letterbox;
  if (rng() < 0.5) s.glitch = !s.glitch;
  if (rng() < 0.4) s.stutter = !s.stutter;
  if (rng() < 0.4) s.captureFreeze = !s.captureFreeze;
  if (rng() < 0.3) s.tiltSway = !s.tiltSway;
  s.seed = tap;
  return s;
}

// --- Color grades ------------------------------------------------------------
//
// Each grade is a short list of composite passes: a blend-mode plus either a
// flat fill or a PRECOMPUTED gradient canvas. Gradient layers are built once
// per (grade, W, H) and cached; per frame the pass list is just fillRect /
// drawImage calls, keeping the cost flat.

type PassSpec =
  | { op: GlobalCompositeOperation; alpha: number; flicker?: number; kind: "fill"; color: string }
  | {
      op: GlobalCompositeOperation;
      alpha: number;
      flicker?: number;
      kind: "linear";
      stops: [number, string][];
    }
  | {
      op: GlobalCompositeOperation;
      alpha: number;
      flicker?: number;
      kind: "radial";
      /** Center + radii as fractions of the frame. */
      cx: number;
      cy: number;
      r0: number;
      r1: number;
      stops: [number, string][];
    }
  | { op: GlobalCompositeOperation; alpha: number; flicker?: number; kind: "scan" };

const VIGNETTE: PassSpec = {
  op: "multiply",
  alpha: 0.7,
  kind: "radial",
  cx: 0.5,
  cy: 0.5,
  r0: 0.3,
  r1: 0.85,
  stops: [
    [0, "#ffffff"],
    [0.6, "#d8d8d8"],
    [1, "#4a4a4a"],
  ],
};

const GRADES: Record<Exclude<GradeId, "none">, PassSpec[]> = {
  noir: [
    { op: "saturation", alpha: 1, kind: "fill", color: "#7d7d7d" },
    { ...VIGNETTE, alpha: 0.85 },
    {
      op: "screen",
      alpha: 0.2,
      kind: "radial",
      cx: 0.5,
      cy: 0.42,
      r0: 0,
      r1: 0.5,
      stops: [
        [0, "rgba(255,252,240,0.7)"],
        [1, "rgba(0,0,0,0)"],
      ],
    },
  ],
  vaporwave: [
    {
      op: "screen",
      alpha: 0.5,
      kind: "linear",
      stops: [
        [0, "rgba(255,60,220,0.6)"],
        [0.5, "rgba(0,0,0,0)"],
        [1, "rgba(60,230,255,0.55)"],
      ],
    },
    { op: "hue", alpha: 0.22, kind: "fill", color: "#c86adf" },
    { op: "multiply", alpha: 0.22, kind: "scan" },
  ],
  cyberpunk: [
    {
      op: "multiply",
      alpha: 0.5,
      kind: "linear",
      stops: [
        [0, "#14454e"],
        [1, "#0c2f3a"],
      ],
    },
    {
      op: "screen",
      alpha: 0.5,
      kind: "radial",
      cx: 0.5,
      cy: 0.2,
      r0: 0,
      r1: 0.7,
      stops: [
        [0, "rgba(255,40,150,0.5)"],
        [1, "rgba(0,0,0,0)"],
      ],
    },
    {
      op: "screen",
      alpha: 0.32,
      kind: "radial",
      cx: 0.5,
      cy: 0.9,
      r0: 0,
      r1: 0.7,
      stops: [
        [0, "rgba(40,220,255,0.4)"],
        [1, "rgba(0,0,0,0)"],
      ],
    },
  ],
  vintage: [
    { op: "saturation", alpha: 0.55, kind: "fill", color: "#96876c" },
    { op: "color", alpha: 0.28, kind: "fill", color: "#b98a4e" },
    { ...VIGNETTE, alpha: 0.5, flicker: 0.14 },
    { op: "screen", alpha: 0.6, kind: "fill", color: "#241c10" },
  ],
  emerald: [
    { op: "color", alpha: 0.3, kind: "fill", color: "#3fae6a" },
    {
      op: "multiply",
      alpha: 0.42,
      kind: "linear",
      stops: [
        [0, "#dcefe2"],
        [1, "#a3d6b6"],
      ],
    },
    { op: "screen", alpha: 0.7, kind: "fill", color: "#06180d" },
  ],
  infrared: [
    { op: "hue", alpha: 0.8, kind: "fill", color: "#ff3020" },
    { op: "saturation", alpha: 0.35, kind: "fill", color: "#ff5040" },
    {
      op: "screen",
      alpha: 0.45,
      kind: "radial",
      cx: 0.5,
      cy: 0.45,
      r0: 0,
      r1: 0.65,
      stops: [
        [0, "rgba(255,120,90,0.45)"],
        [1, "rgba(0,0,0,0)"],
      ],
    },
    { ...VIGNETTE, alpha: 0.4 },
  ],
  bleach: [
    { op: "saturation", alpha: 0.55, kind: "fill", color: "#909090" },
    { op: "screen", alpha: 0.85, kind: "fill", color: "#2a261f" },
    {
      op: "multiply",
      alpha: 0.5,
      kind: "linear",
      stops: [
        [0, "#efece6"],
        [1, "#d6cfc1"],
      ],
    },
  ],
};

interface CompiledPass {
  op: GlobalCompositeOperation;
  alpha: number;
  flicker: number;
  color: string | null;
  layer: HTMLCanvasElement | null;
}

const gradeCache = new Map<string, CompiledPass[]>();
let scanTile: HTMLCanvasElement | null = null;

function scanlineTile(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  if (scanTile) return scanTile;
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 4;
  const g = c.getContext("2d");
  if (!g) return null;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 8, 4);
  g.fillStyle = "#5a5a5a";
  g.fillRect(0, 2, 8, 1);
  scanTile = c;
  return c;
}

function compilePass(spec: PassSpec, W: number, H: number): CompiledPass {
  const base: CompiledPass = {
    op: spec.op,
    alpha: spec.alpha,
    flicker: spec.flicker ?? 0,
    color: null,
    layer: null,
  };
  if (spec.kind === "fill") {
    base.color = spec.color;
    return base;
  }
  if (typeof document === "undefined") return base;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (!g) return base;
  if (spec.kind === "scan") {
    const tile = scanlineTile();
    if (tile) {
      const pat = g.createPattern(tile, "repeat");
      if (pat) {
        g.fillStyle = pat;
        g.fillRect(0, 0, W, H);
      }
    }
  } else if (spec.kind === "linear") {
    const grad = g.createLinearGradient(0, 0, 0, H);
    for (const [at, col] of spec.stops) grad.addColorStop(at, col);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  } else {
    const R = Math.max(W, H);
    const grad = g.createRadialGradient(
      spec.cx * W, spec.cy * H, spec.r0 * R,
      spec.cx * W, spec.cy * H, Math.max(0.001, spec.r1) * R,
    );
    for (const [at, col] of spec.stops) grad.addColorStop(at, col);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  }
  base.layer = c;
  return base;
}

/** Composite the grade over the finished frame. Pure function of (grade, t);
 *  the layers are cached per (grade, W, H). */
export function applyGrade(
  ctx: CanvasRenderingContext2D,
  grade: GradeId,
  W: number,
  H: number,
  t: number,
): void {
  if (grade === "none") return;
  const key = `${grade}:${W}x${H}`;
  let passes = gradeCache.get(key);
  if (!passes) {
    passes = GRADES[grade].map((spec) => compilePass(spec, W, H));
    gradeCache.set(key, passes);
  }
  for (const p of passes) {
    ctx.save();
    ctx.globalCompositeOperation = p.op;
    ctx.globalAlpha = p.alpha * (1 + p.flicker * Math.sin(t * 0.017));
    if (p.layer) {
      ctx.drawImage(p.layer, 0, 0);
    } else if (p.color) {
      ctx.fillStyle = p.color;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }
}

// --- Ambient particle fields -------------------------------------------------
//
// One field per clip, seeded and cached per (kind, size, seed); every speck's
// position is a closed-form function of t (drift + modulo wrap), so any frame
// renders identically no matter what was drawn before it.

interface Speck {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  phase: number;
  tint: number;
}

const fieldCache = new Map<string, Speck[]>();

function specks(kind: string, W: number, H: number, seed: number, n: number): Speck[] {
  const key = `${kind}:${W}x${H}:${seed}:${n}`;
  const hit = fieldCache.get(key);
  if (hit) return hit;
  const rng = mulberry32(seed ^ 0x0f1e2d3c);
  const out: Speck[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: rng() * W,
      y: rng() * H,
      vx: rng() - 0.5,
      vy: rng(),
      r: rng(),
      a: rng(),
      phase: rng() * Math.PI * 2,
      tint: rng(),
    });
  }
  fieldCache.set(key, out);
  return out;
}

/** Speck count scaled by frame area so classic stays sparse. */
function countFor(base: number, W: number, H: number): number {
  return Math.max(6, Math.round(base * Math.min(1, (W * H) / 2073600)));
}

type FieldPainter = (
  ctx: CanvasRenderingContext2D,
  t: number,
  W: number,
  H: number,
  seed: number,
  accent: string,
) => void;

const wrap = (v: number, max: number) => ((v % max) + max) % max;

const FIELD_PAINTERS: Record<Exclude<ParticleFieldId, "off">, FieldPainter> = {
  embers: (ctx, t, W, H, seed) => {
    for (const d of specks("embers", W, H, seed, countFor(34, W, H))) {
      const x = wrap(d.x + (d.vx * 0.028) * t, W);
      const y = wrap(d.y - (0.007 + d.vy * 0.014) * t, H);
      ctx.globalAlpha = (0.06 + d.a * 0.14) * (0.65 + 0.35 * Math.sin(t * 0.004 + d.phase));
      ctx.fillStyle = d.tint > 0.6 ? "#ffb35c" : "#ece7dd";
      const r = 1 + d.r * 2.4;
      ctx.fillRect(x, y, r, r);
    }
    ctx.globalAlpha = 1;
  },
  snow: (ctx, t, W, H, seed) => {
    for (const d of specks("snow", W, H, seed, countFor(44, W, H))) {
      const y = wrap(d.y + (0.02 + d.vy * 0.05) * t, H + 20) - 10;
      const x = wrap(d.x + Math.sin(t * 0.0008 + d.phase) * 26 + d.vx * 0.006 * t, W);
      ctx.globalAlpha = 0.16 + d.a * 0.3;
      ctx.fillStyle = "#f2f4f8";
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + d.r * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  rain: (ctx, t, W, H, seed) => {
    ctx.lineCap = "round";
    for (const d of specks("rain", W, H, seed, countFor(40, W, H))) {
      const speed = 0.55 + d.vy * 0.5;
      const len = 30 + d.r * 55;
      const y = wrap(d.y + speed * t, H + len * 2) - len;
      const x = wrap(d.x + speed * 0.16 * t, W);
      ctx.globalAlpha = 0.1 + d.a * 0.16;
      ctx.strokeStyle = "#aebfd4";
      ctx.lineWidth = 1 + d.r;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - len * 0.16, y - len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  sparks: (ctx, t, W, H, seed, accent) => {
    for (const d of specks("sparks", W, H, seed, countFor(30, W, H))) {
      const y = wrap(d.y - (0.03 + d.vy * 0.06) * t, H + 12) - 6;
      const x = wrap(d.x + Math.sin(t * 0.002 + d.phase) * 14 + d.vx * 0.02 * t, W);
      const flick = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.011 + d.phase));
      ctx.globalAlpha = (0.12 + d.a * 0.32) * flick;
      ctx.fillStyle = d.tint > 0.5 ? accent : "#ffd76a";
      const r = 1 + d.r * 2;
      ctx.fillRect(x, y, r, r * (1.4 + d.vy));
    }
    ctx.globalAlpha = 1;
  },
  matrix: (ctx, t, W, H, seed) => {
    const cols = specks("matrix", W, H, seed, countFor(26, W, H));
    for (const d of cols) {
      const trail = 5;
      const cell = 14 + d.r * 8;
      const speed = 0.12 + d.vy * 0.2;
      const span = H + trail * cell * 2;
      const headY = wrap(d.y + speed * t, span) - trail * cell;
      const x = Math.floor(d.x / 24) * 24;
      for (let k = 0; k < trail; k++) {
        const y = headY - k * cell;
        if (y < -cell || y > H) continue;
        ctx.globalAlpha = (0.32 - k * 0.055) * (0.6 + d.a * 0.4);
        ctx.fillStyle = k === 0 ? "#b8ffc8" : "#38c95c";
        // Seeded per-cell flicker keeps the column alive without text costs.
        const on = Math.sin(x * 3.7 + Math.floor(y / cell) * 7.1 + Math.floor(t / 160)) > -0.4;
        if (on) ctx.fillRect(x, y, cell * 0.42, cell * 0.62);
      }
    }
    ctx.globalAlpha = 1;
  },
  bubbles: (ctx, t, W, H, seed, accent) => {
    for (const d of specks("bubbles", W, H, seed, countFor(26, W, H))) {
      const y = wrap(d.y - (0.02 + d.vy * 0.05) * t, H + 40) - 20;
      const x = wrap(d.x + Math.sin(t * 0.0012 + d.phase) * 18, W);
      const r = 2.5 + d.r * 8;
      ctx.globalAlpha = 0.1 + d.a * 0.16;
      ctx.strokeStyle = d.tint > 0.7 ? accent : "#cfe4ee";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha *= 0.6;
      ctx.beginPath();
      ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
};

/** Draw the ambient field for this frame (background layer, under the board). */
export function paintParticleField(
  ctx: CanvasRenderingContext2D,
  kind: ParticleFieldId,
  t: number,
  W: number,
  H: number,
  seed: number,
  accent: string,
): void {
  if (kind === "off") return;
  FIELD_PAINTERS[kind](ctx, t, W, H, seed, accent);
}

// --- Ply transitions ---------------------------------------------------------

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** Board-group transform for the transition window (p: 0..1, dir: -1 | 1).
 *  Returned as fractions of the board size / radians so the caller scales. */
export function transitionShift(
  id: TransitionId,
  p: number,
  dir: number,
): { dx01: number; rot: number } {
  if (id === "whip") return { dx01: dir * 0.16 * (1 - easeOutCubic(p)), rot: 0 };
  if (id === "spin") {
    return { dx01: 0, rot: dir * (5 * Math.PI / 180) * (1 - easeOutCubic(p)) };
  }
  return { dx01: 0, rot: 0 };
}

/** Fractional hash for pixel-dissolve thresholds: pure math, no cache. */
function hash01(a: number, b: number, seed: number): number {
  const s = Math.sin(a * 12.9898 + b * 78.233 + seed * 0.61803) * 43758.5453;
  return s - Math.floor(s);
}

/** Overlay pass for the transition, drawn over the board rect inside the
 *  board group (so it shakes and zooms with the board). */
export function paintTransitionOverBoard(
  ctx: CanvasRenderingContext2D,
  id: TransitionId,
  p: number,
  seed: number,
  bx: number,
  by: number,
  bsize: number,
  accent: string,
  dir: number,
): void {
  if (id === "whip") {
    // Directional motion streaks sweeping the way the board snapped.
    ctx.save();
    ctx.globalAlpha = Math.sin(Math.PI * p) * 0.35;
    const g = ctx.createLinearGradient(bx, 0, bx + bsize, 0);
    g.addColorStop(dir > 0 ? 0 : 1, "rgba(255,255,255,0.5)");
    g.addColorStop(0.5, "rgba(255,255,255,0)");
    g.addColorStop(dir > 0 ? 1 : 0, "rgba(255,255,255,0.24)");
    ctx.fillStyle = g;
    ctx.fillRect(bx, by, bsize, bsize);
    ctx.restore();
    return;
  }
  if (id === "pixel") {
    // Seeded block dissolve: dark blocks vanish in a fixed random order.
    const n = 12;
    const cell = bsize / n;
    ctx.save();
    ctx.fillStyle = "#15120e";
    for (let gy = 0; gy < n; gy++) {
      for (let gx = 0; gx < n; gx++) {
        if (hash01(gx, gy, seed) > p) {
          ctx.fillRect(bx + gx * cell, by + gy * cell, cell + 0.5, cell + 0.5);
        }
      }
    }
    ctx.globalAlpha = Math.sin(Math.PI * p) * 0.5;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bsize, bsize);
    ctx.restore();
  }
}

/** Full-frame flash for the flash-cut transition (kept moderate on purpose:
 *  repeated soft flashes, never hard white strobes). */
export function paintFlashCut(
  ctx: CanvasRenderingContext2D,
  p: number,
  W: number,
  H: number,
): void {
  const a = Math.pow(1 - p, 2) * 0.4;
  if (a <= 0.01) return;
  ctx.save();
  ctx.fillStyle = `rgba(255,250,240,${a})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// --- Finishing FX passes -----------------------------------------------------

/** Animated letterbox bars. inU: 0..1 slide-in, extra: 0..1 payoff squeeze. */
export function paintLetterbox(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  inU: number,
  extra: number,
): void {
  const barH = H * (0.055 * inU + 0.03 * extra);
  if (barH <= 0) return;
  ctx.save();
  ctx.fillStyle = "#050403";
  ctx.fillRect(0, 0, W, barH);
  ctx.fillRect(0, H - barH, W, barH);
  ctx.restore();
}

/** Seeded slice-offset glitch burst around a capture landing. te: the landing
 *  time; active for ~110ms (3 frames at 30fps). Self-blits the current frame,
 *  so call it AFTER the grade pass. */
export function paintGlitch(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  te: number,
  seed: number,
): void {
  if (t < te || t > te + 110) return;
  const q = 1 - (t - te) / 110;
  const frame = Math.floor((t - te) / 33);
  const rng = mulberry32((seed ^ Math.imul(te | 0, 2654435761) ^ frame) >>> 0);
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const sy = Math.floor(rng() * H);
    const h = Math.floor(8 + rng() * H * 0.05);
    const dx = Math.round((rng() - 0.5) * W * 0.07 * q);
    if (dx !== 0) ctx.drawImage(ctx.canvas, 0, sy, W, h, dx, sy, W, h);
  }
  // Two hot interference bars.
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.12 * q;
  ctx.fillStyle = "#ff4d6a";
  ctx.fillRect(0, rng() * H, W, 2 + rng() * 3);
  ctx.fillStyle = "#4dd8ff";
  ctx.fillRect(0, rng() * H, W, 2 + rng() * 3);
  ctx.restore();
}

/** VHS finishing layer: scanlines, an occasional tracking jitter, and REC
 *  chrome pinned inside the board's top-left corner. */
export function paintVhs(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  bx: number,
  by: number,
  bodyFont: string,
): void {
  const tile = scanlineTile();
  if (tile) {
    const pat = ctx.createPattern(tile, "repeat");
    if (pat) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }
  // Slow tracking band drifting down the frame.
  const bandY = wrap(t * 0.09, H * 1.5) - H * 0.25;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const g = ctx.createLinearGradient(0, bandY - 40, 0, bandY + 40);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.5, "rgba(210,225,235,0.07)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, bandY - 40, W, 80);
  ctx.restore();
  // Brief horizontal jitter every ~2.6s: three thin self-blit bands.
  const cyc = t % 2600;
  if (cyc < 140) {
    const jq = 1 - cyc / 140;
    for (let i = 0; i < 3; i++) {
      const sy = Math.floor(wrap(bandY + i * H * 0.23, H));
      const dx = Math.round(Math.sin(t * 0.09 + i * 2.1) * 6 * jq);
      const h = 6 + i * 4;
      if (dx !== 0) ctx.drawImage(ctx.canvas, 0, sy, W, h, dx, sy, W, h);
    }
  }
  // REC chrome: blinking dot, label, rolling timecode. Inside the board frame
  // so no aspect's platform UI ever covers it.
  const size = Math.max(16, Math.round(W * 0.019));
  ctx.save();
  ctx.font = `600 ${size}px ${bodyFont}`;
  ctx.textAlign = "left";
  const x = bx + size;
  const y = by + size * 2;
  if (Math.floor(t / 500) % 2 === 0) {
    ctx.fillStyle = "#ff3b30";
    ctx.beginPath();
    ctx.arc(x + size * 0.3, y - size * 0.32, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(240,240,235,0.9)";
  ctx.fillText("REC", x + size, y);
  const totalS = Math.floor(t / 1000);
  const ff = String(Math.floor((t % 1000) / 33.4)).padStart(2, "0");
  const ss = String(totalS % 60).padStart(2, "0");
  const mm = String(Math.floor(totalS / 60)).padStart(2, "0");
  ctx.globalAlpha = 0.75;
  ctx.fillText(`${mm}:${ss}:${ff}`, x + size * 3.4, y);
  ctx.restore();
}

// --- Victory confetti --------------------------------------------------------

const CONFETTI_COLORS = ["#ffd76a", "#e05252", "#4dc8ff", "#8fbf7a", "#ece7dd", "#c86adf"];

/** Confetti rain over the verdict freeze. tLocal counts from the freeze start;
 *  pieces recycle top-to-bottom so the fall never runs dry. */
export function paintConfetti(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  tLocal: number,
  seed: number,
): void {
  const pieces = specks("confetti", W, H, seed ^ 0xc0ffee, countFor(90, W, H));
  ctx.save();
  for (const d of pieces) {
    const speed = 0.18 + d.vy * 0.22;
    const span = H + 60;
    const y = wrap(d.y * 0.3 - H * 0.3 + speed * tLocal, span) - 30;
    const x = wrap(d.x + Math.sin(tLocal * 0.0016 + d.phase) * 40, W);
    const rot = d.phase + tLocal * (0.004 + d.r * 0.006) * (d.vx > 0 ? 1 : -1);
    const w = 5 + d.r * 7;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.translate(x, y);
    ctx.rotate(rot);
    // A second squeeze axis fakes the 3D tumble.
    ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.sin(tLocal * 0.005 + d.phase * 3)));
    ctx.fillStyle = CONFETTI_COLORS[Math.floor(d.tint * CONFETTI_COLORS.length) % CONFETTI_COLORS.length];
    ctx.fillRect(-w / 2, -w * 0.35, w, w * 0.7);
    ctx.restore();
  }
  ctx.restore();
}
