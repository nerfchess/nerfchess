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

// --- Aspect layouts ----------------------------------------------------------

export type ClipAspect = "tiktok" | "square" | "classic";
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
    | "outro";
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
  zoomPunch: boolean;
  screenShake: boolean;
  speedRamp: boolean;
  freezeStamp: boolean;
  momentumBar: boolean;
  moveCounter: boolean;
  /** Watermark handle, or null when the toggle is off. */
  watermark: string | null;
  endCard: boolean;
  verdict: ClipVerdict | null;
  fonts: { display: string; body: string };
  accent: string;
  /** Auto-director payoff hint: absolute ply of the segment that should get
   *  the dramatic pre-beat + slow-motion hit. Falls back to an internal scan
   *  (last capture / card) when absent. */
  payoffPly?: number | null;
}

interface SegFx {
  start: number;
  /** Dramatic pre-beat pause (darken + zoom + riser) before the slide. */
  preMs: number;
  moveMs: number;
  holdMs: number;
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
  punch: boolean;
  shakeAmp: number;
  isPayoff: boolean;
}

/** Ambient ember: drifts, flickers, and leans warm or parchment-neutral. */
interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  phase: number;
  warm: number;
}

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
  drift: Ember[];
  /** Dust kicked up by the intro board slam. */
  introDust: Particle[];
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
  const { timeline } = opts;
  const layout = LAYOUTS[opts.aspect];
  const n = timeline.segments.length;
  const rng = mulberry32(0x1badb002 ^ (timeline.startPly * 2654435761) ^ (n << 16));
  const intensity = intensityScale(opts.emojiLevel);

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
  const lead = 700;
  let at = lead;
  const segs: SegFx[] = [];
  const audio: ClipAudioEvent[] = [];
  audio.push({ t: 40, kind: "intro" });

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
    if (opts.speedRamp) {
      if (i < payoff) {
        moveMs = Math.round(moveMs / 1.5);
        holdMs = Math.round(holdMs / 1.5);
      } else if (isPayoff) {
        moveMs = Math.round(moveMs * 2);
        holdMs = Math.round(holdMs * 1.6);
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

    // Between-ply shimmer whoosh (the payoff gets the riser instead).
    if (i > 0 && !preMs) audio.push({ t: at, kind: "shimmer" });
    if (preMs) audio.push({ t: at, kind: "riser" });
    if (seg.sig) {
      audio.push({ t: at + preMs + 60, kind: "card", tier: seg.sig.tier });
    }
    audio.push({
      t: at + preMs + moveMs,
      kind: isPayoff && hasCapture ? "impact" : hasCapture ? "capture" : "move",
    });

    segs.push({
      start: at,
      preMs,
      moveMs,
      holdMs,
      seg,
      target,
      energy,
      tierScale,
      particles: energy ? makeParticles(rng, Math.round(ENERGY_PARTICLES[energy] * tierScale)) : [],
      shards,
      dust: makeParticles(rng, 7),
      caption: captionFor(seg, energy, opts.emojiLevel),
      matAfter: segMaterial(seg),
      punch: opts.zoomPunch && (hasCapture || !!seg.sig),
      shakeAmp: !opts.screenShake
        ? 0
        : energy === "shock"
          ? 6 * intensity
          : hasCapture
            ? 3.5 * intensity
            : seg.sig
              ? 2 * intensity
              : 0,
      isPayoff,
    });
    at += preMs + moveMs + holdMs;
  }

  const freezeMs = opts.freezeStamp ? 1000 : 320;
  const freezeStart = at;
  if (opts.freezeStamp) audio.push({ t: freezeStart + 80, kind: "verdict" });
  at += freezeMs;
  const endMs = opts.endCard ? 1400 : 0;
  const endStart = at;
  if (endMs > 0) audio.push({ t: endStart + 60, kind: "outro" });
  at += endMs;

  // Ambient ember field for the decorative fill outside the safe zones: every
  // speck drifts AND flickers, so no frame of background is ever static.
  const drift: ClipScene["drift"] = [];
  const driftN = opts.aspect === "classic" ? 18 : 34;
  for (let i = 0; i < driftN; i++) {
    drift.push({
      x: rng() * layout.W,
      y: rng() * layout.H,
      vx: (rng() - 0.5) * 0.014,
      vy: -0.007 - rng() * 0.014,
      r: 1 + rng() * 2.4,
      a: 0.06 + rng() * 0.14,
      phase: rng() * Math.PI * 2,
      warm: rng(),
    });
  }

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
    drift,
    introDust: makeParticles(rng, 18),
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
  const accent = opts.accent;
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
      ctx.shadowColor = "rgba(0,0,0,0.45)";
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
  // Drifting ember / spark field: position drifts, alpha flickers, warm specks
  // read as embers against the parchment-neutral dust.
  for (const d of scene.drift) {
    const dx = (((d.x + d.vx * t) % L.W) + L.W) % L.W;
    const dy = (((d.y + d.vy * t) % L.H) + L.H) % L.H;
    ctx.globalAlpha = d.a * (0.65 + 0.35 * Math.sin(t * 0.004 + d.phase));
    ctx.fillStyle = d.warm > 0.6 ? "#ffb35c" : "#ece7dd";
    ctx.fillRect(dx, dy, d.r, d.r);
  }
  ctx.globalAlpha = 1;

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
  ctx.fillStyle = "#ece7dd";
  ctx.fillText("nerf", markX, L.headerY);
  ctx.fillStyle = accent;
  ctx.fillText("chess", markX + markW, L.headerY);
  ctx.restore();
  ctx.font = `500 ${opts.aspect === "classic" ? 17 : 26}px ${fonts.body}`;
  ctx.fillStyle = "#a7a297";
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
  const inFreeze = t >= scene.freezeStart;
  let active: SegFx | null = null;
  let u = 0; // 0..1 across the slide
  let holdU = 0; // 0..1 across the hold
  let doneCount = 0;
  for (const sf of scene.segs) {
    if (t >= sf.start + sf.preMs + sf.moveMs + sf.holdMs) {
      doneCount++;
      continue;
    }
    if (t >= sf.start) {
      active = sf;
      u = clamp01((t - sf.start - sf.preMs) / sf.moveMs);
      holdU = clamp01((t - sf.start - sf.preMs - sf.moveMs) / sf.holdMs);
    }
    break;
  }
  // Pre-beat progress: the darken + zoom window before the payoff slide.
  const preU =
    active && active.preMs > 0 && t < active.start + active.preMs
      ? clamp01((t - active.start) / active.preMs)
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
  // Between-ply transition: a brief accent shimmer sweeps the board edge.
  drawEdgeShimmer(scene, ctx, t);
  ctx.restore(); // board group

  // ---- Meters, captions, watermark ----
  if (opts.momentumBar) drawMomentum(scene, ctx, t);
  if (opts.moveCounter) drawProgress(scene, ctx, doneCount, active, u);
  drawPopCaption(scene, ctx, active, t);
  if (opts.watermark) {
    ctx.textAlign = "right";
    ctx.font = `600 ${opts.aspect === "classic" ? 14 : 24}px ${fonts.body}`;
    ctx.fillStyle = "rgba(236,231,221,0.5)";
    const wx = opts.aspect === "tiktok" ? 940 : L.boardX + L.board;
    ctx.fillText(opts.watermark, wx, L.watermarkY);
    ctx.textAlign = "left";
  }

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
    const te = sf.start + sf.preMs + sf.moveMs; // impact lands with the slide
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
  for (const sf of scene.segs) {
    if (!sf.punch) continue;
    const te = sf.start + sf.preMs + sf.moveMs;
    if (t < te || t > te + 200) continue;
    const u = easeOutCubic((t - te) / 200);
    const s = 1 + 0.2 * (1 - u);
    const { x, y } = sqXY(sf.target);
    const cx = x + scene.layout.sq / 2;
    const cy = y + scene.layout.sq / 2;
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    return;
  }
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
  const accent = opts.accent;
  const moveT = easeInOutCubic(clamp01(u));
  const primary = seg.pairs.find((p) => p.primary) ?? seg.pairs[0] ?? null;
  const tLand = sf.start + sf.preMs + sf.moveMs;

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
    const p = clamp01((t - sf.start - sf.preMs) / (sf.moveMs + sf.holdMs));
    drawEnergy(scene, ctx, sf, p, sqXY, "under");
  }

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
    const p = clamp01((t - sf.start - sf.preMs) / (sf.moveMs + sf.holdMs));
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
  const te = sf.start + sf.preMs + sf.moveMs * 0.72; // shatter as the mover arrives
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
  const color = energy ? ENERGY_COLOR[energy] : opts.accent;
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
  ctx.font = `600 ${Math.round(nameSize * 0.42)}px ${opts.fonts.body}`;
  ctx.fillStyle = color;
  ctx.fillText(`TIER ${ROMAN[sig.tier - 1] ?? sig.tier}`, 0, -h / 2 + nameSize * 0.62);
  ctx.font = `700 ${nameSize}px ${opts.fonts.display}`;
  ctx.fillStyle = "#ece7dd";
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
      const pop = stamp ? 1 : 0.6 + 0.4 * easeOutBack(wu);
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
      ctx.fillStyle = "#ffffff";
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
  const pop = opts.captionStyle === "pop";
  const intensity = intensityScale(opts.emojiLevel);
  const size = cap.big ? L.popSize : Math.round(L.popSize * 0.62);
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
    const appear = sf!.start + sf!.preMs + (pop ? i * 110 : 0);
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
    ctx.translate(cxw, L.popY + float);
    ctx.rotate(wob);
    ctx.scale(s, s);
    ctx.lineWidth = Math.max(3, size * 0.14);
    ctx.strokeStyle = "rgba(10,8,6,0.9)";
    ctx.lineJoin = "round";
    ctx.strokeText(word.text, -widths[i] / 2, 0);
    if (word.hot) {
      ctx.shadowColor = opts.accent;
      ctx.shadowBlur = size * (0.2 + 0.12 * Math.sin(t * 0.007 + i));
    }
    ctx.fillStyle = word.hot ? opts.accent : cap.big ? "#ffffff" : "#c9c2b4";
    ctx.fillText(word.text, -widths[i] / 2, 0);
    ctx.restore();
    x += widths[i] + gap;
  });
  ctx.restore();
}

/** Signed momentum at time t, -1..1: interpolated material swing, with an
 *  overshooting lurch on segments where the value actually jumps. Shared by
 *  the momentum bar and the board-glow pulse so the two breathe together. */
function momentumAt(scene: ClipScene, t: number): number {
  let value = scene.matStart;
  for (const sf of scene.segs) {
    const from = value;
    const to = sf.matAfter;
    if (t >= sf.start + sf.preMs + sf.moveMs + sf.holdMs) {
      value = to;
      continue;
    }
    if (t >= sf.start) {
      const u = clamp01((t - sf.start - sf.preMs) / (sf.moveMs + sf.holdMs * 0.4));
      const ease = Math.abs(to - from) >= 3 ? easeOutBack(u) : easeInOutCubic(u);
      value = from + (to - from) * ease;
    }
    break;
  }
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
  ctx.fillStyle = f >= 0 ? "#ece7dd" : "#2f2b26";
  if (f >= 0) ctx.fillRect(x, mid - extent, w, extent);
  else ctx.fillRect(x, mid, w, extent);
  ctx.strokeStyle = withAlpha(scene.opts.accent, 0.7);
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
      ctx.fillStyle = opts.accent;
      ctx.fillRect(x, y, cellW * clamp01(fill), 6);
    }
  }
  const current = Math.min(n, done + (active ? 1 : 0)) || (done >= n ? n : 0);
  ctx.font = `600 ${opts.aspect === "classic" ? 12 : 20}px ${opts.fonts.body}`;
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
  const slam =
    p < 0.2 ? 1.8 - 0.8 * easeOutBack(p / 0.2) : 1 + 0.006 * Math.sin(p01 * 26);
  const cx = L.W / 2;
  const cy = L.boardY + L.board / 2;
  const mainSize = opts.aspect === "classic" ? 56 : 92;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(slam, slam);
  ctx.textAlign = "center";
  ctx.font = `800 ${mainSize}px ${opts.fonts.display}`;
  const w = Math.max(L.board * 0.55, ctx.measureText(v.main).width + 96);
  const h = v.sub ? mainSize * 2.2 : mainSize * 1.7;
  ctx.fillStyle = "rgba(14,12,10,0.86)";
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = withAlpha(opts.accent, 0.9);
  ctx.lineWidth = 3;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = opts.accent;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    ctx.beginPath();
    ctx.moveTo((sx * w) / 2 - sx * 22, (sy * h) / 2);
    ctx.lineTo((sx * w) / 2, (sy * h) / 2);
    ctx.lineTo((sx * w) / 2, (sy * h) / 2 - sy * 22);
    ctx.stroke();
  }
  const isMate = v.main === "CHECKMATE";
  ctx.fillStyle = isMate ? "#e05252" : opts.accent;
  ctx.fillText(v.main, 0, v.sub ? -mainSize * 0.1 : mainSize * 0.32);
  if (v.sub) {
    ctx.font = `600 ${Math.round(mainSize * 0.34)}px ${opts.fonts.body}`;
    ctx.fillStyle = "#ece7dd";
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
  ctx.fillStyle = "#ece7dd";
  ctx.fillText(wm1, cx - (w1 + w2) / 2, topY);
  ctx.fillStyle = opts.accent;
  ctx.fillText(wm2, cx - (w1 + w2) / 2 + w1, topY);
  ctx.restore();

  // The URL types itself on, caret blinking while it goes.
  const url = "play at nerfchess.com";
  const typed = Math.round(clamp01((p - 0.16) / 0.4) * url.length);
  ctx.textAlign = "center";
  ctx.font = `600 ${Math.round(markSize * 0.3)}px ${opts.fonts.body}`;
  ctx.fillStyle = "#a7a297";
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
  ctx.strokeStyle = withAlpha(opts.accent, 0.45 + 0.12 * Math.sin(tAbs * 0.004));
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
    ctx.globalAlpha = a * loopDim * clamp01((p - 0.45) / 0.2);
    ctx.font = `600 ${opts.aspect === "classic" ? 14 : 24}px ${opts.fonts.body}`;
    ctx.fillStyle = "rgba(236,231,221,0.5)";
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
  ctx.strokeStyle = withAlpha(scene.opts.accent, 0.9);
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
    g.addColorStop(0.5, withAlpha(scene.opts.accent, 0.9));
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

/** The always-on finishing pass: vignette, seeded film grain, and a chromatic
 *  edge kick on impact frames. Runs over EVERY frame, end card included. */
function drawOverlays(scene: ClipScene, ctx: CanvasRenderingContext2D, t: number): void {
  const L = scene.layout;

  // Chromatic edge on impact frames: the board frame splits into a red and a
  // cyan ghost for a few frames after a hit lands.
  for (const sf of scene.segs) {
    if (sf.shards.length === 0 && !sf.isPayoff) continue;
    const te = sf.start + sf.preMs + sf.moveMs;
    if (t < te || t > te + 130) continue;
    const q = 1 - (t - te) / 130;
    const off = 3 * q;
    ctx.save();
    ctx.globalAlpha = 0.35 * q;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ff5a4d";
    ctx.strokeRect(L.boardX - 4 - off, L.boardY - 4, L.board + 8, L.board + 8);
    ctx.strokeStyle = "#4dc8ff";
    ctx.strokeRect(L.boardX - 4 + off, L.boardY - 4, L.board + 8, L.board + 8);
    ctx.restore();
    break;
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

  // Film grain: deterministic tiles cycled at frame rate. Very subtle.
  const tiles = grainTiles();
  if (tiles) {
    const tile = tiles[Math.floor(t / (1000 / 30)) % GRAIN_FRAMES];
    const pat = ctx.createPattern(tile, "repeat");
    if (pat) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, L.W, L.H);
      ctx.restore();
    }
  }
}
