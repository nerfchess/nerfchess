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
  | "bleach"
  /** The custom duotone built from the two hex wells in the GRADE panel. */
  | "duotone";
export type CaptionColorSource = "auto" | "accent" | "white" | "custom";
export type CaptionSizeId = "s" | "m" | "l";
export type CaptionPosId = "low" | "mid" | "high";
export type StampRotationId = "off" | "subtle" | "rowdy";
export type ZoomBiasId = "action" | "center";
export type PunchTimingId = "impact" | "beat";
export type ArrowColorSource = "palette" | "site" | "white";
export type RulePanelSide = "auto" | "left" | "right";
export type RuleHoldBias = "quick" | "comfy" | "slow";
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
/** Caption style packs: each restyles the word-pop captions without touching
 *  the deterministic per-word timing. */
export type CaptionPackId = "impact" | "typewriter" | "neon" | "minimal" | "serif";
/** Intro title templates: each restyles the hook slam's typography (and, for
 *  the non-custom picks, auto-fills the hook line itself). */
export type TitleTemplateId =
  | "custom"
  | "pov"
  | "neversaw"
  | "waitforit"
  | "illegal"
  | "ruined";
/** End-card variants: the logo pop, a rematch taunt, the card-codex tease, or
 *  the run's stats splat. */
export type OutroVariantId = "logo" | "taunt" | "codex" | "stats";
/** Ambient scene sets: coordinated chrome layered around the board. Void is
 *  the classic bare backdrop; the rest are precomputed layer packs. */
export type SceneSetId = "void" | "stadium" | "study" | "arcade";
/** Impact zoom curves: how punch-ins (and the payoff arc) ease. */
export type ZoomCurveId = "snap" | "whip" | "creep" | "bounce";

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
  /** Caption ink source: Auto samples the reel palette, Accent forces the
   *  palette accent, White is plain paper, Custom uses captionHex. */
  captionColor: CaptionColorSource;
  /** Custom caption hex, used only when captionColor === "custom". */
  captionHex: string;
  captionSize: CaptionSizeId;
  /** Pop-caption vertical parking inside the platform-safe band. */
  captionPos: CaptionPosId;
  /** How far off-axis stamps and callouts print. */
  stampRotation: StampRotationId;
  /** Punch-in aim: the action square, or the board center. */
  zoomBias: ZoomBiasId;
  /** Punch-in trigger: on the landing impact, or on the ply's opening beat. */
  punchTiming: PunchTimingId;
  /** 0..100 glitch burst violence. */
  glitchAmount: number;
  /** 0..100 bloom swell strength. */
  bloomAmount: number;
  /** 0..100 ambient particle field density. */
  particleDensity: number;
  /** 0..100 grade strength (100 = the full tint stack). */
  gradeStrength: number;
  /** Duotone builder shadows hex. */
  duotoneA: string;
  /** Duotone builder highlights hex. */
  duotoneB: string;
  /** 0..100 watermark ink opacity. */
  watermarkOpacity: number;
  /** Explainer arrow ink: reel palette accent, the site accent, or paper. */
  arrowColor: ArrowColorSource;
  /** Which side the card rule panel slides in from. */
  ruleSide: RulePanelSide;
  /** How long rule panels hold relative to the read-speed estimate. */
  ruleHold: RuleHoldBias;
  /** Caption style pack (Impact is the classic wave-1 look). */
  captionPack: CaptionPackId;
  /** Intro title template; "custom" keeps the free-text hook behavior. */
  titleTemplate: TitleTemplateId;
  /** End-card variant. */
  outro: OutroVariantId;
  /** Snap ply starts to the music's beat grid (built-in tracks only). */
  beatSync: boolean;
  /** Eval-style tension bar beside the board (material + mobility, no engine). */
  tensionMeter: boolean;
  /** Viewer-facing replay minimap strip in the bottom safe zone. */
  minimap: boolean;
  /** Ambient scene set layered around the board (Void is the classic look). */
  sceneSet: SceneSetId;
  /** Impact zoom curve for punch-ins and the payoff arc. */
  zoomCurve: ZoomCurveId;
  /** Deterministic seed for glitch slices, pixel dissolves, confetti, and the
   *  Surprise-me shuffle. Incremented per Surprise tap. */
  seed: number;
}

// The default is the restraint dial's resting point: editorial and confident,
// not maximal. Shake sits at subtle, glitch and bloom at moderate amounts;
// Brainrot Max exists for the other end of the dial.
export const STYLE_DEFAULTS: ClipStyle = {
  zoom: "punchy",
  followCam: false,
  driftCam: "off",
  payoffDolly: false,
  tiltSway: false,
  grade: "none",
  shake: "subtle",
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
  captionColor: "auto",
  captionHex: "#e6b52e",
  captionSize: "m",
  captionPos: "low",
  stampRotation: "subtle",
  zoomBias: "action",
  punchTiming: "impact",
  glitchAmount: 55,
  bloomAmount: 55,
  particleDensity: 50,
  gradeStrength: 100,
  duotoneA: "#1c1408",
  duotoneB: "#e6b52e",
  watermarkOpacity: 50,
  arrowColor: "palette",
  ruleSide: "auto",
  ruleHold: "comfy",
  captionPack: "impact",
  titleTemplate: "custom",
  outro: "logo",
  beatSync: false,
  tensionMeter: false,
  minimap: false,
  sceneSet: "void",
  zoomCurve: "snap",
  seed: 0,
};

// --- Style presets -----------------------------------------------------------

/** Knobs a preset may set OUTSIDE the style object (they live on the modal's
 *  option state but belong to the one-tap vibe). */
export interface StylePresetExtras {
  emojiLevel?: EmojiLevel;
  captionStyle?: CaptionStyle;
  musicTrack?: MusicTrackId;
  /** Versus intro match card (a modal option, not a style knob). */
  versusIntro?: boolean;
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
      glitchAmount: 80,
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
      tensionMeter: true,
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
      glitchAmount: 100,
      bloom: true,
      bloomAmount: 90,
      invertFlash: true,
      particles: "matrix",
      particleDensity: 85,
      confetti: true,
      speed: 1.25,
      slowmo: "ultra",
      captureFreeze: true,
      stutter: true,
      transition: "whip",
      verdictStamps: true,
      stampRotation: "rowdy",
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
    id: "grudge",
    label: "Grudge Match",
    style: {
      shake: "heavy",
      zoom: "punchy",
      zoomCurve: "bounce",
      grade: "infrared",
      particles: "sparks",
      transition: "whip",
      outro: "taunt",
      verdictStamps: true,
      scoreBug: true,
      stampRotation: "rowdy",
    },
    extras: { versusIntro: true, musicTrack: "wardrums" },
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
  // The dials get seeded settings too, biased toward the mid range.
  s.glitchAmount = Math.round(35 + rng() * 60);
  s.bloomAmount = Math.round(30 + rng() * 60);
  s.particleDensity = Math.round(30 + rng() * 55);
  s.gradeStrength = Math.round(65 + rng() * 35);
  s.stampRotation = pick(["off", "subtle", "subtle", "rowdy"] as const);
  s.zoomBias = rng() < 0.8 ? "action" : "center";
  s.punchTiming = rng() < 0.75 ? "impact" : "beat";
  // Wave-4 depth knobs join the shuffle, biased toward the classic picks.
  s.captionPack = pick(["impact", "impact", "typewriter", "neon", "minimal", "serif"] as const);
  s.outro = pick(["logo", "logo", "taunt", "codex", "stats"] as const);
  if (rng() < 0.35) s.beatSync = true;
  if (rng() < 0.3) s.tensionMeter = true;
  if (rng() < 0.3) s.minimap = true;
  // Wave-6 presentation knobs, biased toward the classic picks.
  s.sceneSet = pick(["void", "void", "void", "stadium", "study", "arcade"] as const);
  s.zoomCurve = pick(["snap", "snap", "whip", "creep", "bounce"] as const);
  s.seed = tap;
  return s;
}

// --- Reel palettes -----------------------------------------------------------
//
// ONE cohesive palette per reel, derived from the grade plus the site's ink
// language. Every overlay (captions, stamps, callouts, rule panel, end card)
// pulls from these same four inks, so a graded reel never has each element
// picking its own color.

export interface ReelPalette {
  /** Light foreground: the reel's paper. */
  paper: string;
  /** The reel's accent: highlights, arrows, ticks, hot caption words. */
  accent: string;
  /** Alarm ink: captures, "??" verdicts, the misprint registration pass. */
  hot: string;
  /** Muted secondary text. */
  dim: string;
}

const GRADE_PALETTES: Record<Exclude<GradeId, "none" | "duotone">, ReelPalette> = {
  noir: { paper: "#f0ede6", accent: "#d8d3c8", hot: "#c94848", dim: "#8f8b82" },
  vaporwave: { paper: "#f9edff", accent: "#ff7ae0", hot: "#4de0ff", dim: "#b39ac6" },
  cyberpunk: { paper: "#e8f6ff", accent: "#ff3d9e", hot: "#35dcff", dim: "#7f9aa8" },
  vintage: { paper: "#f2e4c8", accent: "#cf9448", hot: "#a34e32", dim: "#a08c6a" },
  emerald: { paper: "#eaf5ed", accent: "#63cf8f", hot: "#ffd76a", dim: "#7fa78c" },
  infrared: { paper: "#ffeae4", accent: "#ff6a50", hot: "#ffd0c0", dim: "#b07f74" },
  bleach: { paper: "#f4f1ea", accent: "#cbc0a6", hot: "#d4574a", dim: "#9a948a" },
};

/** Mix a hex toward white by `k` (0..1). Used to derive the duotone paper. */
function towardPaper(hex: string, k: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#ece7dd";
  const n = parseInt(m[1], 16);
  const ch = (v: number) => Math.round(v + (245 - v) * k);
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** The reel's palette for a grade. `siteAccent` anchors the ungraded reel to
 *  the site's own accent; the duotone palette is derived from its two wells. */
export function reelPalette(grade: GradeId, siteAccent: string, duotoneB: string): ReelPalette {
  if (grade === "none") {
    return { paper: "#ece7dd", accent: siteAccent, hot: "#e05252", dim: "#a7a297" };
  }
  if (grade === "duotone") {
    return {
      paper: towardPaper(duotoneB, 0.65),
      accent: duotoneB,
      hot: towardPaper(duotoneB, 0.2),
      dim: towardPaper(duotoneB, 0.35),
    };
  }
  return GRADE_PALETTES[grade];
}

/** Three sampled swatch colors for a grade, used by the preset chips and the
 *  GRADE panel so styles are scannable at a glance. */
export function gradeSwatch(
  grade: GradeId,
  siteAccent: string,
  duotoneA: string,
  duotoneB: string,
): [string, string, string] {
  if (grade === "duotone") return [duotoneA, duotoneB, towardPaper(duotoneB, 0.55)];
  const p = reelPalette(grade, siteAccent, duotoneB);
  const DEEP: Record<GradeId, string> = {
    none: "#201c17", noir: "#101010", vaporwave: "#2a1030", cyberpunk: "#0c2f3a",
    vintage: "#241c10", emerald: "#0a2214", infrared: "#2e0d08", bleach: "#2a261f",
    duotone: duotoneA,
  };
  return [DEEP[grade], p.accent, p.paper];
}

// --- Reel board themes -------------------------------------------------------
//
// Render-only board looks for the reel: square colors plus a frame ink,
// applied by the scene renderer without touching the player's site settings.
// Grades composite on top, so a Walnut board still goes Noir.

export type ReelBoardThemeId = "site" | "slate" | "walnut" | "midnight" | "paper";

export interface ReelBoardTheme {
  label: string;
  light: string;
  dark: string;
  /** Frame stroke ink (replaces the palette accent around the board). */
  frame: string;
}

export const REEL_BOARD_THEMES: Record<Exclude<ReelBoardThemeId, "site">, ReelBoardTheme> = {
  slate: { label: "Slate", light: "#a3abb5", dark: "#4e565f", frame: "#c2ccd6" },
  walnut: { label: "Walnut", light: "#d8b688", dark: "#7c5130", frame: "#e6c893" },
  midnight: { label: "Midnight", light: "#414a6e", dark: "#1d2440", frame: "#8b96c9" },
  paper: { label: "Paper", light: "#f2ecdd", dark: "#c6bca2", frame: "#847b69" },
};

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

const GRADES: Record<Exclude<GradeId, "none" | "duotone">, PassSpec[]> = {
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

/** The custom duotone: desaturate, tint highlights toward B, lift shadows
 *  toward A. Cheap blend-mode composites like every built-in grade. */
function duotonePasses(a: string, b: string): PassSpec[] {
  return [
    { op: "saturation", alpha: 1, kind: "fill", color: "#7d7d7d" },
    { op: "multiply", alpha: 0.88, kind: "fill", color: b },
    { op: "lighten", alpha: 0.8, kind: "fill", color: a },
    { ...VIGNETTE, alpha: 0.35 },
  ];
}

/** Composite the grade over the finished frame. Pure function of
 *  (grade, t, strength, duotone wells); the layers are cached per config.
 *  `strength` (0..1) scales every pass alpha, blending toward the ungraded
 *  frame; the duotone grade compiles its passes from the two hex wells. */
export function applyGrade(
  ctx: CanvasRenderingContext2D,
  grade: GradeId,
  W: number,
  H: number,
  t: number,
  strength = 1,
  duotone?: { a: string; b: string },
): void {
  if (grade === "none" || strength <= 0.005) return;
  const duoKey = grade === "duotone" ? `:${duotone?.a}:${duotone?.b}` : "";
  const key = `${grade}:${W}x${H}${duoKey}`;
  let passes = gradeCache.get(key);
  if (!passes) {
    const specs =
      grade === "duotone"
        ? duotonePasses(duotone?.a ?? "#1c1408", duotone?.b ?? "#e6b52e")
        : GRADES[grade];
    passes = specs.map((spec) => compilePass(spec, W, H));
    gradeCache.set(key, passes);
  }
  for (const p of passes) {
    ctx.save();
    ctx.globalCompositeOperation = p.op;
    ctx.globalAlpha = Math.min(1, p.alpha * strength * (1 + p.flicker * Math.sin(t * 0.017)));
    if (p.layer) {
      ctx.drawImage(p.layer, 0, 0);
    } else if (p.color) {
      ctx.fillStyle = p.color;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }
}

// --- Ambient scene sets ------------------------------------------------------
//
// Coordinated chrome layered around the board, in the grade-cache mold: the
// expensive parts (crowd silhouettes, paper texture, pencil frame, CRT
// corners) are precomputed ONCE per (set, size, palette) onto offscreen
// canvases and composited per frame; only the cheap animated bits (flash
// twinkles, marquee pulse) draw live. Palette-cohesive: every ink comes from
// the reel palette or the house darks.

const sceneSetCache = new Map<string, HTMLCanvasElement>();

function sceneLayer(
  key: string,
  W: number,
  H: number,
  paint: (g: CanvasRenderingContext2D) => void,
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const hit = sceneSetCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (!g) return null;
  paint(g);
  sceneSetCache.set(key, c);
  return c;
}

/** Crowd silhouette band: seeded head-and-shoulder bumps along `yBase`. */
function paintCrowdRow(
  g: CanvasRenderingContext2D,
  rng: () => number,
  x0: number,
  x1: number,
  yBase: number,
  scale: number,
  ink: string,
): void {
  g.fillStyle = ink;
  let x = x0;
  while (x < x1) {
    const r = (10 + rng() * 8) * scale;
    const bob = (rng() - 0.5) * 8 * scale;
    // Shoulders + head.
    g.fillRect(x - r * 1.15, yBase + bob - r * 0.35, r * 2.3, r * 3);
    g.beginPath();
    g.arc(x, yBase + bob - r * 0.6, r, 0, Math.PI * 2);
    g.fill();
    x += r * (1.7 + rng() * 0.9);
  }
}

/** Draw the scene set's precomputed layers plus its live accents.
 *  `phase: "back"` runs under the board (behind everything), `"front"` runs
 *  with the finishing overlays. `impactQ` (0..1) is how recently a hit landed
 *  and drives the stadium's camera flashes. Pure function of its inputs. */
export function paintSceneSet(
  ctx: CanvasRenderingContext2D,
  set: SceneSetId,
  phase: "back" | "front",
  t: number,
  W: number,
  H: number,
  seed: number,
  pal: ReelPalette,
  impactQ = 0,
): void {
  if (set === "void") return;

  if (set === "stadium") {
    if (phase === "back") {
      const layer = sceneLayer(`stadium:${W}x${H}:${seed & 0xff}`, W, H, (g) => {
        // Two rows of crowd silhouettes pooling in the bottom corners, plus a
        // faint stand glow so the vignette reads as an arena, not a smudge.
        const rng = mulberry32(seed ^ 0x57ad1a);
        const grad = g.createLinearGradient(0, H * 0.72, 0, H);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(6,5,4,0.85)");
        g.fillStyle = grad;
        g.fillRect(0, H * 0.72, W, H * 0.28);
        g.globalAlpha = 0.8;
        paintCrowdRow(g, rng, -20, W * 0.34, H * 0.93, W / 1080, "#0d0a08");
        paintCrowdRow(g, rng, W * 0.66, W + 20, H * 0.93, W / 1080, "#0d0a08");
        g.globalAlpha = 0.95;
        paintCrowdRow(g, rng, -20, W * 0.28, H * 0.985, W / 900, "#080605");
        paintCrowdRow(g, rng, W * 0.72, W + 20, H * 0.985, W / 900, "#080605");
        // Upper-corner crowd shadow wedges.
        g.globalAlpha = 0.55;
        for (const side of [0, 1]) {
          const cg = g.createRadialGradient(
            side * W, 0, 0, side * W, 0, Math.min(W, H) * 0.4,
          );
          cg.addColorStop(0, "rgba(8,6,5,0.7)");
          cg.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = cg;
          g.fillRect(side === 0 ? 0 : W * 0.6, 0, W * 0.4, H * 0.4);
        }
        g.globalAlpha = 1;
      });
      if (layer) ctx.drawImage(layer, 0, 0);
      return;
    }
    // Front: camera-flash twinkles in the crowd bands, alive on impacts.
    if (impactQ <= 0.02) return;
    const rng = mulberry32(seed ^ 0xf1a54);
    ctx.save();
    for (let i = 0; i < 14; i++) {
      const fx = rng() * W;
      // Flashes live in the crowd corners, never over the board.
      const inCorner = fx < W * 0.3 || fx > W * 0.7;
      const fy = H * (0.78 + rng() * 0.2);
      const phaseK = rng();
      if (!inCorner) continue;
      const tw = Math.abs(Math.sin(t * 0.021 + phaseK * 9));
      const a = impactQ * tw;
      if (a <= 0.06) continue;
      const r = (2 + rng() * 3) * (W / 1080);
      ctx.globalAlpha = Math.min(0.9, a);
      ctx.fillStyle = phaseK > 0.7 ? pal.accent : "#f5f1e6";
      ctx.fillRect(fx - r, fy - r * 0.3, r * 2, r * 0.6);
      ctx.fillRect(fx - r * 0.3, fy - r, r * 0.6, r * 2);
    }
    ctx.restore();
    return;
  }

  if (set === "study") {
    if (phase !== "back") return;
    const layer = sceneLayer(
      `study:${W}x${H}:${seed & 0xff}:${pal.dim}`,
      W, H,
      (g) => {
        const rng = mulberry32(seed ^ 0x9a9e12);
        // Paper wash + seeded fiber flecks.
        g.fillStyle = "rgba(236,227,205,0.05)";
        g.fillRect(0, 0, W, H);
        for (let i = 0; i < 420; i++) {
          const x = rng() * W;
          const y = rng() * H;
          const len = 1 + rng() * 3;
          const ang = rng() * Math.PI;
          g.globalAlpha = 0.03 + rng() * 0.05;
          g.strokeStyle = rng() > 0.5 ? "#e8dfc8" : "#2a241c";
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(x, y);
          g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
          g.stroke();
        }
        // Pencil-line frame: two hand-wobbled rectangles inset from the edge,
        // sampled as short jittered strokes so they read as drawn, not ruled.
        g.globalAlpha = 1;
        const inset = Math.round(Math.min(W, H) * 0.028);
        for (const [pad, alpha, width] of [
          [inset, 0.5, 1.6],
          [inset + 7, 0.28, 1.1],
        ] as const) {
          g.strokeStyle = pal.dim;
          g.globalAlpha = alpha;
          g.lineWidth = width;
          g.lineCap = "round";
          const jitter = () => (rng() - 0.5) * 2.4;
          const edges: [number, number, number, number][] = [
            [pad, pad, W - pad, pad],
            [W - pad, pad, W - pad, H - pad],
            [W - pad, H - pad, pad, H - pad],
            [pad, H - pad, pad, pad],
          ];
          for (const [ax, ay, bx, by] of edges) {
            const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 60);
            g.beginPath();
            g.moveTo(ax + jitter(), ay + jitter());
            for (let k = 1; k <= steps; k++) {
              const s = k / steps;
              g.lineTo(ax + (bx - ax) * s + jitter(), ay + (by - ay) * s + jitter());
            }
            g.stroke();
          }
        }
        g.globalAlpha = 1;
      },
    );
    if (layer) ctx.drawImage(layer, 0, 0);
    return;
  }

  // Arcade.
  if (phase === "back") {
    // Marquee glow: cabinet-light washes climbing both side edges, pulsing.
    const pulse = 0.7 + 0.3 * Math.sin(t * 0.0032);
    ctx.save();
    for (const side of [0, 1]) {
      const g = ctx.createLinearGradient(side * W, 0, side === 0 ? W * 0.2 : W * 0.8, 0);
      g.addColorStop(0, withAlphaHex(side === 0 ? pal.accent : pal.hot, 0.16 * pulse));
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(side === 0 ? 0 : W * 0.8, 0, W * 0.2, H);
    }
    // Marquee bulb dots along the top edge, blinking in a marching pattern.
    const n = Math.max(8, Math.round(W / 90));
    for (let i = 0; i < n; i++) {
      const on = (i + Math.floor(t / 400)) % 3 === 0;
      ctx.globalAlpha = on ? 0.5 : 0.14;
      ctx.fillStyle = on ? pal.accent : pal.dim;
      const bx = (W / n) * (i + 0.5);
      ctx.fillRect(bx - 2, 8, 4, 4);
    }
    ctx.restore();
    return;
  }
  // Front: CRT curvature corners + a faint glass glare arc.
  const layer = sceneLayer(`arcade:${W}x${H}`, W, H, (g) => {
    const R = Math.min(W, H) * 0.09;
    // CRT corners: fill the frame, then knock out a giant rounded rect; what
    // survives is the four curved-tube corners.
    g.fillStyle = "#060504";
    g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "destination-out";
    g.beginPath();
    g.moveTo(R, 0);
    g.lineTo(W - R, 0);
    g.arcTo(W, 0, W, R, R);
    g.lineTo(W, H - R);
    g.arcTo(W, H, W - R, H, R);
    g.lineTo(R, H);
    g.arcTo(0, H, 0, H - R, R);
    g.lineTo(0, R);
    g.arcTo(0, 0, R, 0, R);
    g.closePath();
    g.fill();
    g.globalCompositeOperation = "source-over";
    // Glass glare: a soft diagonal highlight arc near the top-left.
    g.globalAlpha = 0.05;
    g.strokeStyle = "#f2ecdc";
    g.lineWidth = Math.min(W, H) * 0.05;
    g.beginPath();
    g.arc(W * 0.16, H * 0.14, Math.min(W, H) * 0.22, Math.PI * 1.05, Math.PI * 1.6);
    g.stroke();
    g.globalAlpha = 1;
  });
  if (layer) ctx.drawImage(layer, 0, 0);
}

/** Local hex-with-alpha (clipScene has its own; kept here so the scene-set
 *  painters stay self-contained). */
function withAlphaHex(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
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

/** Speck count scaled by frame area (so classic stays sparse) and by the
 *  density knob paintParticleField set for this pass. */
function countFor(base: number, W: number, H: number): number {
  return Math.max(4, Math.round(base * densityMult * Math.min(1, (W * H) / 2073600)));
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

/** Density multiplier applied inside countFor. Module-level (not threaded
 *  through every painter) because the painters share countFor; set per call
 *  by paintParticleField, and the speck cache keys on the resulting count. */
let densityMult = 1;

/** Draw the ambient field for this frame (background layer, under the board).
 *  `density` is the 0..100 knob; 50 keeps the classic counts. */
export function paintParticleField(
  ctx: CanvasRenderingContext2D,
  kind: ParticleFieldId,
  t: number,
  W: number,
  H: number,
  seed: number,
  accent: string,
  density = 50,
): void {
  if (kind === "off") return;
  densityMult = 0.25 + (Math.max(0, Math.min(100, density)) / 100) * 1.5;
  FIELD_PAINTERS[kind](ctx, t, W, H, seed, accent);
  densityMult = 1;
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
 *  so call it AFTER the grade pass. `amount` is the 0..1 violence dial:
 *  it scales the slice count, the shear distance, and the interference bars. */
export function paintGlitch(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  te: number,
  seed: number,
  amount = 0.55,
): void {
  if (t < te || t > te + 110 || amount <= 0.01) return;
  const q = 1 - (t - te) / 110;
  const frame = Math.floor((t - te) / 33);
  const rng = mulberry32((seed ^ Math.imul(te | 0, 2654435761) ^ frame) >>> 0);
  const slices = Math.max(2, Math.round(2 + amount * 5));
  ctx.save();
  for (let i = 0; i < slices; i++) {
    const sy = Math.floor(rng() * H);
    const h = Math.floor(8 + rng() * H * 0.05);
    const dx = Math.round((rng() - 0.5) * W * (0.03 + 0.09 * amount) * q);
    if (dx !== 0) ctx.drawImage(ctx.canvas, 0, sy, W, h, dx, sy, W, h);
  }
  // Two hot interference bars.
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = (0.05 + 0.13 * amount) * q;
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
