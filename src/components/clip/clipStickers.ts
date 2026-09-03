// The sticker layer: a curated set of vector painters, never OS emoji, so an
// exported reel looks hand-made and identical on every platform. Each painter
// draws centered on the origin inside a `size` box using ONLY the reel's
// four-ink palette plus the house dark stroke, and the caller supplies the
// seeded tilt / slam-in transform, so stickers stay deterministic and
// palette-cohesive under every grade.

import type { ReelPalette } from "./clipStyles";

export type StickerId =
  | "crown"
  | "skull"
  | "flame"
  | "gg"
  | "arrow"
  | "cry"
  | "clown"
  | "hundred"
  | "alarm"
  | "brain";

/** One placed sticker. `x`/`y` are board-relative fractions (0 = the board's
 *  left/top edge, 1 = right/bottom), so the placement survives aspect swaps.
 *  `ply` pins the sticker to one ply's span (slam-in included); null keeps it
 *  on screen for the whole reel, poster frame included. */
export interface ClipSticker {
  id: StickerId;
  x: number;
  y: number;
  ply: number | null;
}

/** Hard cap on active stickers (the UI enforces it; the renderer trusts it
 *  but slices defensively). */
export const STICKER_CAP = 5;

export const STICKER_OPTIONS: readonly (readonly [StickerId, string])[] = [
  ["crown", "Crown"],
  ["skull", "Skull"],
  ["flame", "Flame"],
  ["gg", "GG"],
  ["arrow", "Arrow"],
  ["cry", "Crying"],
  ["clown", "Clown"],
  ["hundred", "100"],
  ["alarm", "Alarm"],
  ["brain", "Brain"],
] as const;

const STROKE = "rgba(10,8,6,0.9)";

type StickerPainter = (
  ctx: CanvasRenderingContext2D,
  s: number,
  pal: ReelPalette,
  displayFont: string,
) => void;

/** Text plate shared by the GG and 100 stickers: display slab on a dark
 *  plate with an accent frame, the sticker cousin of the verdict stamp. */
function plate(
  ctx: CanvasRenderingContext2D,
  s: number,
  text: string,
  ink: string,
  frame: string,
  displayFont: string,
): void {
  const w = s * 0.98;
  const h = s * 0.56;
  ctx.fillStyle = "rgba(16,14,11,0.92)";
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = frame;
  ctx.lineWidth = Math.max(2, s * 0.045);
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.font = `800 ${Math.round(s * 0.34)}px ${displayFont}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, s * 0.05);
  ctx.strokeStyle = STROKE;
  ctx.strokeText(text, 0, s * 0.02);
  ctx.fillStyle = ink;
  ctx.fillText(text, 0, s * 0.02);
  ctx.textBaseline = "alphabetic";
}

const PAINTERS: Record<StickerId, StickerPainter> = {
  crown: (ctx, s, pal) => {
    const w = s * 0.9;
    const base = s * 0.28;
    ctx.beginPath();
    ctx.moveTo(-w / 2, base);
    ctx.lineTo(-w / 2, -s * 0.1);
    ctx.lineTo(-w * 0.25, s * 0.06);
    ctx.lineTo(0, -s * 0.34);
    ctx.lineTo(w * 0.25, s * 0.06);
    ctx.lineTo(w / 2, -s * 0.1);
    ctx.lineTo(w / 2, base);
    ctx.closePath();
    ctx.fillStyle = pal.accent;
    ctx.strokeStyle = STROKE;
    ctx.lineWidth = Math.max(2, s * 0.05);
    ctx.lineJoin = "round";
    ctx.fill();
    ctx.stroke();
    // Band + three jewels in the paper ink.
    ctx.fillStyle = pal.paper;
    ctx.fillRect(-w / 2, base - s * 0.08, w, s * 0.05);
    for (const jx of [-w * 0.3, 0, w * 0.3]) {
      ctx.beginPath();
      ctx.arc(jx, base * 0.45, s * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  skull: (ctx, s, pal) => {
    ctx.strokeStyle = STROKE;
    ctx.lineWidth = Math.max(2, s * 0.05);
    // Dome + jaw.
    ctx.beginPath();
    ctx.arc(0, -s * 0.06, s * 0.34, Math.PI * 0.97, Math.PI * 2.03);
    ctx.lineTo(s * 0.22, s * 0.26);
    ctx.lineTo(-s * 0.22, s * 0.26);
    ctx.closePath();
    ctx.fillStyle = pal.paper;
    ctx.fill();
    ctx.stroke();
    // Eye holes and the nose notch print in the dark stroke ink.
    ctx.fillStyle = STROKE;
    ctx.beginPath();
    ctx.arc(-s * 0.13, -s * 0.06, s * 0.09, 0, Math.PI * 2);
    ctx.arc(s * 0.13, -s * 0.06, s * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, s * 0.02);
    ctx.lineTo(-s * 0.045, s * 0.12);
    ctx.lineTo(s * 0.045, s * 0.12);
    ctx.closePath();
    ctx.fill();
    // Teeth ticks.
    ctx.lineWidth = Math.max(1.5, s * 0.03);
    for (const tx of [-s * 0.1, 0, s * 0.1]) {
      ctx.beginPath();
      ctx.moveTo(tx, s * 0.17);
      ctx.lineTo(tx, s * 0.26);
      ctx.stroke();
    }
  },
  flame: (ctx, s, pal) => {
    ctx.strokeStyle = STROKE;
    ctx.lineWidth = Math.max(2, s * 0.05);
    ctx.lineJoin = "round";
    // Outer tongue in the hot ink.
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.42);
    ctx.bezierCurveTo(s * 0.3, -s * 0.1, s * 0.34, s * 0.1, s * 0.16, s * 0.32);
    ctx.bezierCurveTo(s * 0.28, s * 0.06, -s * 0.02, s * 0.02, -s * 0.08, s * 0.34);
    ctx.bezierCurveTo(-s * 0.34, s * 0.16, -s * 0.3, -s * 0.12, 0, -s * 0.42);
    ctx.closePath();
    ctx.fillStyle = pal.hot;
    ctx.fill();
    ctx.stroke();
    // Inner core in the accent ink.
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.14);
    ctx.bezierCurveTo(s * 0.14, s * 0.02, s * 0.12, s * 0.14, 0, s * 0.26);
    ctx.bezierCurveTo(-s * 0.12, s * 0.14, -s * 0.14, s * 0.02, 0, -s * 0.14);
    ctx.closePath();
    ctx.fillStyle = pal.accent;
    ctx.fill();
  },
  gg: (ctx, s, pal, displayFont) => {
    plate(ctx, s, "GG", pal.accent, pal.accent, displayFont);
  },
  arrow: (ctx, s, pal) => {
    // Hand-doodled swoop with a chunky head, accent ink.
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = Math.max(3, s * 0.09);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-s * 0.4, s * 0.34);
    ctx.bezierCurveTo(-s * 0.42, -s * 0.1, s * 0.05, -s * 0.38, s * 0.32, -s * 0.26);
    ctx.stroke();
    const ang = Math.atan2(-s * 0.26 - -s * 0.34, s * 0.32 - s * 0.14);
    const hx = s * 0.36;
    const hy = -s * 0.27;
    const hs = s * 0.2;
    ctx.fillStyle = pal.accent;
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(ang) * hs, hy + Math.sin(ang) * hs);
    ctx.lineTo(hx + Math.cos(ang + 2.4) * hs, hy + Math.sin(ang + 2.4) * hs);
    ctx.lineTo(hx + Math.cos(ang - 2.4) * hs, hy + Math.sin(ang - 2.4) * hs);
    ctx.closePath();
    ctx.fill();
    // Doodle speed ticks off the tail.
    ctx.lineWidth = Math.max(2, s * 0.045);
    ctx.beginPath();
    ctx.moveTo(-s * 0.46, s * 0.2);
    ctx.lineTo(-s * 0.34, s * 0.14);
    ctx.moveTo(-s * 0.44, s * 0.4);
    ctx.lineTo(-s * 0.3, s * 0.4);
    ctx.stroke();
  },
  cry: (ctx, s, pal) => {
    ctx.strokeStyle = STROKE;
    ctx.lineWidth = Math.max(2, s * 0.05);
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = pal.paper;
    ctx.fill();
    ctx.stroke();
    // Squeezed-shut eyes.
    ctx.lineWidth = Math.max(2, s * 0.045);
    for (const ex of [-s * 0.15, s * 0.15]) {
      ctx.beginPath();
      ctx.arc(ex, -s * 0.08, s * 0.08, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    // Wailing mouth.
    ctx.beginPath();
    ctx.arc(0, s * 0.16, s * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = STROKE;
    ctx.fill();
    // Tear gushes in the accent ink.
    ctx.fillStyle = pal.accent;
    for (const [tx, dir] of [
      [-s * 0.24, -1],
      [s * 0.24, 1],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(tx, -s * 0.04);
      ctx.lineTo(tx + dir * s * 0.14, s * 0.3);
      ctx.lineTo(tx + dir * s * 0.01, s * 0.3);
      ctx.closePath();
      ctx.fill();
    }
  },
  clown: (ctx, s, pal) => {
    // The big red nose, plus cheek dashes so it reads at sticker size.
    ctx.strokeStyle = STROKE;
    ctx.lineWidth = Math.max(2, s * 0.05);
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = pal.hot;
    ctx.fill();
    ctx.stroke();
    // Highlight glint in paper.
    ctx.fillStyle = pal.paper;
    ctx.beginPath();
    ctx.arc(-s * 0.1, -s * 0.11, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
    // Cheek dashes in the accent ink.
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = Math.max(2, s * 0.05);
    for (const dir of [-1, 1]) {
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        ctx.moveTo(dir * (s * 0.36 + k * s * 0.09), -s * 0.06 + k * s * 0.1);
        ctx.lineTo(dir * (s * 0.46 + k * s * 0.09), -s * 0.12 + k * s * 0.1);
        ctx.stroke();
      }
    }
  },
  hundred: (ctx, s, pal, displayFont) => {
    ctx.font = `800 ${Math.round(s * 0.4)}px ${displayFont}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, s * 0.055);
    ctx.strokeStyle = STROKE;
    ctx.strokeText("100", 0, -s * 0.08);
    ctx.fillStyle = pal.hot;
    ctx.fillText("100", 0, -s * 0.08);
    // The double underline that makes it the 100 sticker.
    ctx.strokeStyle = pal.hot;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(3, s * 0.06);
    ctx.beginPath();
    ctx.moveTo(-s * 0.34, s * 0.18);
    ctx.lineTo(s * 0.34, s * 0.18);
    ctx.moveTo(-s * 0.34, s * 0.32);
    ctx.lineTo(s * 0.34, s * 0.32);
    ctx.stroke();
    ctx.textBaseline = "alphabetic";
  },
  alarm: (ctx, s, pal) => {
    ctx.strokeStyle = STROKE;
    ctx.lineWidth = Math.max(2, s * 0.05);
    // Bells + legs.
    ctx.fillStyle = pal.hot;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(dir * s * 0.2, -s * 0.3, s * 0.11, Math.PI * 0.95, Math.PI * 1.9 + (dir > 0 ? 0.2 : 0));
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(dir * s * 0.22, s * 0.28);
      ctx.lineTo(dir * s * 0.32, s * 0.4);
      ctx.stroke();
    }
    // Body.
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = pal.hot;
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = pal.paper;
    ctx.fill();
    // Panicked hands.
    ctx.strokeStyle = STROKE;
    ctx.lineWidth = Math.max(2, s * 0.04);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -s * 0.15);
    ctx.moveTo(0, 0);
    ctx.lineTo(s * 0.12, s * 0.06);
    ctx.stroke();
    // Ring shock ticks.
    ctx.strokeStyle = pal.accent;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(dir * s * 0.36, -s * 0.36);
      ctx.lineTo(dir * s * 0.46, -s * 0.46);
      ctx.stroke();
    }
  },
  brain: (ctx, s, pal) => {
    ctx.strokeStyle = STROKE;
    ctx.lineWidth = Math.max(2, s * 0.05);
    ctx.lineJoin = "round";
    // Two lobes as overlapping blobs in the accent ink.
    ctx.beginPath();
    ctx.arc(-s * 0.13, -s * 0.08, s * 0.22, 0, Math.PI * 2);
    ctx.arc(s * 0.15, -s * 0.06, s * 0.2, 0, Math.PI * 2);
    ctx.arc(-s * 0.05, s * 0.12, s * 0.2, 0, Math.PI * 2);
    ctx.arc(s * 0.16, s * 0.14, s * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = pal.accent;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-s * 0.13, -s * 0.08, s * 0.22, Math.PI * 0.6, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s * 0.15, -s * 0.06, s * 0.2, Math.PI * 1.3, Math.PI * 0.45);
    ctx.stroke();
    // Folds: short squiggle strokes in paper.
    ctx.strokeStyle = pal.paper;
    ctx.lineWidth = Math.max(2, s * 0.04);
    ctx.lineCap = "round";
    const folds: [number, number, number][] = [
      [-s * 0.2, -s * 0.1, 0.6],
      [s * 0.08, -s * 0.14, -0.4],
      [-s * 0.08, s * 0.1, 0.2],
      [s * 0.18, s * 0.08, -0.7],
    ];
    for (const [fx, fy, fa] of folds) {
      ctx.beginPath();
      ctx.arc(fx, fy, s * 0.08, fa, fa + Math.PI * 0.9);
      ctx.stroke();
    }
    // Stem.
    ctx.strokeStyle = STROKE;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.28);
    ctx.lineTo(-s * 0.04, s * 0.4);
    ctx.stroke();
  },
};

/** Draw one sticker centered on the origin. The caller owns the transform
 *  (position, seeded tilt, slam-in scale) and alpha. */
export function paintSticker(
  ctx: CanvasRenderingContext2D,
  id: StickerId,
  size: number,
  pal: ReelPalette,
  displayFont: string,
): void {
  ctx.save();
  PAINTERS[id](ctx, size, pal, displayFont);
  ctx.restore();
}
