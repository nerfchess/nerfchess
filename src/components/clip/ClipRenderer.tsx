"use client";

// Dedicated canvas renderer for move clips. Draws a simplified but handsome
// board (theme colors, lichess piece sprites, tweened slides, capture flashes,
// spawn glows, and a big card-name banner on signature plies) into a fixed
// 720x880 canvas that the clip modal records via canvas.captureStream +
// MediaRecorder. It deliberately does NOT reproduce the live DOM VFX — the
// modal says so ("stylized replay").

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Color, Piece, Square } from "@/engine/types";
import { FILE, RANK } from "@/engine/types";
import type { ClipSegment, ClipTimeline } from "./clipReplay";

export const CLIP_W = 720;
export const CLIP_H = 880;
const BOARD_SIZE = 640;
const BOARD_X = (CLIP_W - BOARD_SIZE) / 2;
const BOARD_Y = 116;
const SQ = BOARD_SIZE / 8;

const LEAD_MS = 700;
const TAIL_MS = 1300;
const SIG_EXTRA_MS = 750;
const LOOP_GAP_MS = 600;

export interface ClipRendererHandle {
  canvas: HTMLCanvasElement | null;
  /** Total length of one full run, in milliseconds. */
  durationMs: number;
  /** Restart the animation from the top; `onDone` fires once when this run
   *  completes (used to stop the recorder in sync with the timeline). */
  restart: (onDone?: () => void) => void;
}

interface Props {
  timeline: ClipTimeline;
  orientation: Color;
  colors: { light: string; dark: string };
  /** Lichess piece sprite set under /piece/lichess/. */
  pieceSet: string;
  names: { w: string; b: string };
  /** Optional closing line drawn during the tail hold ("White wins" etc). */
  endText?: string | null;
  /** Fired once the piece sprites are ready (recording should wait for it). */
  onReady?: () => void;
  className?: string;
}

interface SegTiming {
  start: number;
  moveMs: number;
  holdMs: number;
}

/** Segment offsets and total run length for a timeline. Shorter beats for
 *  long clips so 10 plies still lands inside ~8 seconds; signature plies hold
 *  longer for the banner. Shared with the modal (duration readout). */
export function clipTimings(timeline: ClipTimeline): {
  timings: SegTiming[];
  durationMs: number;
} {
  const n = timeline.segments.length;
  const moveMs = n > 6 ? 430 : 560;
  const holdMs = n > 6 ? 210 : 300;
  let at = LEAD_MS;
  const timings: SegTiming[] = timeline.segments.map((seg) => {
    const t = { start: at, moveMs, holdMs: holdMs + (seg.sigName ? SIG_EXTRA_MS : 0) };
    at += t.moveMs + t.holdMs;
    return t;
  });
  return { timings, durationMs: at + TAIL_MS };
}

const PIECE_KEYS = [
  "wp", "wn", "wb", "wr", "wq", "wk",
  "bp", "bn", "bb", "br", "bq", "bk",
] as const;

/** Load the 12 piece sprites. The lichess SVGs carry only a viewBox, so the
 *  raw file is fetched and given explicit dimensions before being handed to
 *  an Image — drawImage of an intrinsically-unsized SVG is unreliable. */
function loadPieceImages(
  set: string,
  onDone: (images: Map<string, HTMLImageElement>) => void,
): () => void {
  let cancelled = false;
  const urls: string[] = [];
  const images = new Map<string, HTMLImageElement>();
  let remaining = PIECE_KEYS.length;
  const finish = () => {
    remaining -= 1;
    if (remaining === 0 && !cancelled) onDone(images);
  };
  for (const key of PIECE_KEYS) {
    const path = `/piece/lichess/${set}/${key[0]}${key[1].toUpperCase()}.svg`;
    fetch(path)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
      .then((svg) => {
        if (cancelled) return finish();
        const sized = svg.replace(/<svg /, '<svg width="256" height="256" ');
        const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }));
        urls.push(url);
        const img = new Image();
        img.onload = () => {
          images.set(key, img);
          finish();
        };
        img.onerror = finish;
        img.src = url;
      })
      .catch(finish);
  }
  return () => {
    cancelled = true;
    for (const url of urls) URL.revokeObjectURL(url);
  };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}
/** Hex accent -> rgba with alpha (falls back to the input for non-hex). */
function withAlpha(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export const ClipRenderer = forwardRef<ClipRendererHandle, Props>(function ClipRenderer(
  { timeline, orientation, colors, pieceSet, names, endText, onReady, className },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [images, setImages] = useState<Map<string, HTMLImageElement> | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const { timings, durationMs } = useMemo(() => clipTimings(timeline), [timeline]);

  useEffect(() => {
    return loadPieceImages(pieceSet, (loaded) => {
      setImages(loaded);
      onReadyRef.current?.();
    });
  }, [pieceSet]);

  // Fonts and accent resolved once from the document's CSS variables
  // (next/font hashes the family names; the accent follows the user's theme,
  // so the clip chrome matches the site they actually see).
  const { fonts, accent } = useMemo(() => {
    const fallback = {
      fonts: { display: "system-ui, sans-serif", body: "system-ui, sans-serif" },
      accent: "#d8b56e",
    };
    if (typeof document === "undefined") return fallback;
    const read = (name: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const font = (name: string, fb: string) => {
      const v = read(name);
      return v ? `${v}, ${fb}` : fb;
    };
    return {
      fonts: {
        display: font("--font-display", "system-ui, sans-serif"),
        body: font("--font-body", "system-ui, sans-serif"),
      },
      accent: read("--accent-hi") || read("--accent") || fallback.accent,
    };
  }, []);

  const runRef = useRef<{ t0: number; onDone: (() => void) | null; doneFired: boolean }>({
    t0: 0,
    onDone: null,
    doneFired: false,
  });

  useImperativeHandle(
    ref,
    () => ({
      get canvas() {
        return canvasRef.current;
      },
      durationMs,
      restart: (onDone?: () => void) => {
        runRef.current = { t0: performance.now(), onDone: onDone ?? null, doneFired: false };
      },
    }),
    [durationMs],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    runRef.current = { t0: performance.now(), onDone: null, doneFired: false };

    const sqXY = (sq: Square): { x: number; y: number } => {
      const f = FILE(sq);
      const r = RANK(sq);
      const col = orientation === "w" ? f : 7 - f;
      const row = orientation === "w" ? 7 - r : r;
      return { x: BOARD_X + col * SQ, y: BOARD_Y + row * SQ };
    };

    const drawPiece = (piece: Piece, x: number, y: number, alpha = 1, scale = 1) => {
      const img = images?.get(piece.color + piece.type);
      const size = SQ * 0.92 * scale;
      const cx = x + SQ / 2;
      const cy = y + SQ / 2;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (img) {
        ctx.shadowColor = "rgba(0,0,0,0.45)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
        ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
      } else {
        // Sprites still loading: a quiet lettered disc keeps the preview alive.
        ctx.fillStyle = piece.color === "w" ? "#ece7dd" : "#221f1a";
        ctx.strokeStyle = piece.color === "w" ? "#221f1a" : "#ece7dd";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = piece.color === "w" ? "#221f1a" : "#ece7dd";
        ctx.font = `600 ${SQ * 0.34}px ${fonts.display}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(piece.type.toUpperCase(), cx, cy + 1);
      }
      ctx.restore();
    };

    const tintSquare = (sq: Square, style: string) => {
      const { x, y } = sqXY(sq);
      ctx.fillStyle = style;
      ctx.fillRect(x, y, SQ, SQ);
    };

    const ring = (sq: Square, t: number, color: string) => {
      const { x, y } = sqXY(sq);
      const cx = x + SQ / 2;
      const cy = y + SQ / 2;
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5 * (1 - t * 0.6);
      ctx.beginPath();
      ctx.arc(cx, cy, SQ * (0.24 + t * 0.5), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    const drawChrome = (progress: number, label: string | null) => {
      // Background: warm charcoal with a soft top glow.
      const bg = ctx.createLinearGradient(0, 0, 0, CLIP_H);
      bg.addColorStop(0, "#201c17");
      bg.addColorStop(0.5, "#191713");
      bg.addColorStop(1, "#14110e");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CLIP_W, CLIP_H);

      // Header: wordmark + matchup.
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.font = `700 30px ${fonts.display}`;
      ctx.fillStyle = "#ece7dd";
      const mark = "nerf";
      ctx.fillText(mark, BOARD_X, 52);
      const markW = ctx.measureText(mark).width;
      ctx.fillStyle = accent;
      ctx.fillText("chess", BOARD_X + markW, 52);
      ctx.textAlign = "right";
      ctx.font = `600 13px ${fonts.body}`;
      ctx.fillStyle = "#7f7d77";
      ctx.fillText("STYLIZED REPLAY", BOARD_X + BOARD_SIZE, 46);
      ctx.textAlign = "left";
      ctx.font = `500 17px ${fonts.body}`;
      ctx.fillStyle = "#a7a297";
      const white = names.w;
      const black = names.b;
      ctx.fillText(`${white}  vs  ${black}`, BOARD_X, 86);

      // Gold hairline frame around the board.
      ctx.strokeStyle = withAlpha(accent, 0.55);
      ctx.lineWidth = 2;
      ctx.strokeRect(BOARD_X - 4, BOARD_Y - 4, BOARD_SIZE + 8, BOARD_SIZE + 8);

      // Squares.
      for (let sq = 0 as Square; sq < 64; sq++) {
        const { x, y } = sqXY(sq);
        const light = (FILE(sq) + RANK(sq)) % 2 === 1;
        ctx.fillStyle = light ? colors.light : colors.dark;
        ctx.fillRect(x, y, SQ, SQ);
      }
      // Coordinates along the bottom / left edges.
      ctx.font = `600 12px ${fonts.body}`;
      for (let i = 0; i < 8; i++) {
        const file = orientation === "w" ? i : 7 - i;
        const rank = orientation === "w" ? 7 - i : i;
        ctx.fillStyle = "rgba(20,17,14,0.55)";
        ctx.textAlign = "right";
        ctx.fillText(
          "abcdefgh"[file],
          BOARD_X + i * SQ + SQ - 4,
          BOARD_Y + BOARD_SIZE - 5,
        );
        ctx.textAlign = "left";
        ctx.fillText(String(rank + 1), BOARD_X + 4, BOARD_Y + i * SQ + 15);
      }

      // Footer: move label + progress bar + site line.
      ctx.textAlign = "center";
      ctx.font = `700 34px ${fonts.display}`;
      ctx.fillStyle = "#ece7dd";
      if (label) ctx.fillText(label, CLIP_W / 2, BOARD_Y + BOARD_SIZE + 56);
      const barW = BOARD_SIZE;
      const barY = BOARD_Y + BOARD_SIZE + 78;
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fillRect(BOARD_X, barY, barW, 4);
      ctx.fillStyle = accent;
      ctx.fillRect(BOARD_X, barY, barW * clamp01(progress), 4);
      ctx.font = `500 14px ${fonts.body}`;
      ctx.fillStyle = "#7f7d77";
      ctx.fillText("nerfchess.com", CLIP_W / 2, barY + 30);
    };

    const drawSigBanner = (name: string, t: number) => {
      // Ease in over the first beat, hold, ease out at the end.
      const a = t < 0.18 ? easeOutCubic(t / 0.18) : t > 0.88 ? clamp01((1 - t) / 0.12) : 1;
      if (a <= 0) return;
      const scale = 0.92 + 0.08 * (t < 0.18 ? easeOutCubic(t / 0.18) : 1);
      const cx = CLIP_W / 2;
      const cy = BOARD_Y + BOARD_SIZE / 2;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.font = `700 44px ${fonts.display}`;
      const w = Math.max(320, ctx.measureText(name).width + 96);
      const h = 118;
      ctx.fillStyle = "rgba(18,16,14,0.88)";
      ctx.strokeStyle = withAlpha(accent, 0.9);
      ctx.lineWidth = 2;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      // Corner ticks, echoing the site's card-corner motif.
      ctx.strokeStyle = accent;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
        ctx.beginPath();
        ctx.moveTo((sx * w) / 2 - sx * 18, (sy * h) / 2);
        ctx.lineTo((sx * w) / 2, (sy * h) / 2);
        ctx.lineTo((sx * w) / 2, (sy * h) / 2 - sy * 18);
        ctx.stroke();
      }
      ctx.textAlign = "center";
      ctx.font = `600 13px ${fonts.body}`;
      ctx.fillStyle = accent;
      ctx.fillText("SIGNATURE PLAY", 0, -h / 2 + 34);
      ctx.font = `700 44px ${fonts.display}`;
      ctx.fillStyle = "#ece7dd";
      ctx.fillText(name, 0, 24);
      ctx.restore();
    };

    const drawSegment = (seg: ClipSegment, u: number, holdU: number) => {
      const moveT = easeInOutCubic(clamp01(u));
      // Last-move tint on the primary pair once it lands (and during hold).
      const primary = seg.pairs.find((p) => p.primary) ?? seg.pairs[0] ?? null;
      if (primary && u >= 1) {
        tintSquare(primary.from, withAlpha(accent, 0.28));
        tintSquare(primary.to, withAlpha(accent, 0.34));
      }
      for (const st of seg.statics) {
        const { x, y } = sqXY(st.sq);
        drawPiece(st.piece, x, y);
      }
      // Vanishes: hold, then flash out mid-segment.
      for (const v of seg.vanishes) {
        const t = clamp01((u - 0.3) / 0.45);
        const { x, y } = sqXY(v.sq);
        if (t < 1) drawPiece(v.piece, x, y, 1 - t, 1 - t * 0.35);
        if (u > 0.3 && u < 1) ring(v.sq, t, "#dc5a54");
      }
      // Spawns: fade/scale in with a green-glow ring.
      for (const s of seg.spawns) {
        const t = clamp01((u - 0.35) / 0.5);
        const { x, y } = sqXY(s.sq);
        if (t > 0) drawPiece(s.piece, x, y, t, 0.55 + 0.45 * easeOutCubic(t));
        if (t > 0 && u < 1) ring(s.sq, t, "#7bb52f");
      }
      // Sliding pieces (captures flash under the arriving piece).
      for (const pair of seg.pairs) {
        const a = sqXY(pair.from);
        const b = sqXY(pair.to);
        if (pair.captured) {
          const capT = clamp01((u - 0.55) / 0.35);
          if (capT < 1) drawPiece(pair.captured, b.x, b.y, 1 - capT, 1 - capT * 0.4);
          if (u > 0.55) ring(pair.to, capT, "#dc5a54");
        }
        const x = a.x + (b.x - a.x) * moveT;
        const y = a.y + (b.y - a.y) * moveT;
        // A short fading trail behind the slide, the clip's one flourish.
        if (u > 0 && u < 1) {
          ctx.save();
          ctx.globalAlpha = 0.35 * Math.sin(Math.PI * moveT);
          ctx.strokeStyle = accent;
          ctx.lineWidth = 6;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(a.x + SQ / 2, a.y + SQ / 2);
          ctx.lineTo(x + SQ / 2, y + SQ / 2);
          ctx.stroke();
          ctx.restore();
        }
        const morphed = u >= 0.7;
        const piece = morphed ? pair.after : pair.before;
        const lift = u > 0 && u < 1 ? 1 + 0.09 * Math.sin(Math.PI * moveT) : 1;
        drawPiece(piece, x, y, 1, lift);
      }
      if (seg.sigName) {
        // Banner rides the whole segment (move + extended hold).
        const sigT = clamp01((u + holdU) / 2 > 0 ? (u < 1 ? u * 0.4 : 0.4 + holdU * 0.6) : 0);
        drawSigBanner(seg.sigName, sigT);
      }
    };

    const drawBoardFromPieces = (pieces: (Piece | null)[]) => {
      for (let sq = 0 as Square; sq < 64; sq++) {
        const p = pieces[sq];
        if (!p) continue;
        const { x, y } = sqXY(sq);
        drawPiece(p, x, y);
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const run = runRef.current;
      let t = now - run.t0;
      if (t >= durationMs && !run.doneFired) {
        run.doneFired = true;
        run.onDone?.();
        run.onDone = null;
      }
      // Preview loops with a short gap; a recording run has already fired
      // onDone by the time the loop wraps.
      if (t >= durationMs + LOOP_GAP_MS) {
        run.t0 = now;
        run.doneFired = false;
        t = 0;
      }
      t = Math.min(t, durationMs);
      const progress = t / durationMs;

      // Which segment are we in?
      let segIndex = -1;
      let u = 0;
      let holdU = 0;
      for (let i = 0; i < timings.length; i++) {
        const tm = timings[i];
        if (t >= tm.start && t < tm.start + tm.moveMs + tm.holdMs) {
          segIndex = i;
          u = clamp01((t - tm.start) / tm.moveMs);
          holdU = clamp01((t - tm.start - tm.moveMs) / tm.holdMs);
          break;
        }
        if (t >= tm.start + tm.moveMs + tm.holdMs) segIndex = i; // past it
      }
      const inTail = timings.length > 0 && t >= timings[timings.length - 1].start +
        timings[timings.length - 1].moveMs + timings[timings.length - 1].holdMs;
      const activeSeg =
        !inTail && segIndex >= 0 && t >= timings[segIndex].start
          ? timeline.segments[segIndex]
          : null;

      const label = inTail
        ? timeline.segments[timeline.segments.length - 1]?.label ?? null
        : activeSeg?.label ?? (segIndex >= 0 ? timeline.segments[segIndex].label : null);
      drawChrome(progress, t < LEAD_MS ? null : label);

      if (t < LEAD_MS) {
        // Lead-in: the starting position settles in.
        ctx.save();
        ctx.globalAlpha = easeOutCubic(clamp01(t / (LEAD_MS * 0.7)));
        drawBoardFromPieces(timeline.initial);
        ctx.restore();
      } else if (activeSeg) {
        drawSegment(activeSeg, u, holdU);
      } else {
        drawBoardFromPieces(timeline.final);
        if (inTail && endText) {
          const tailT = clamp01(
            (t -
              (timings[timings.length - 1].start +
                timings[timings.length - 1].moveMs +
                timings[timings.length - 1].holdMs)) /
              400,
          );
          ctx.save();
          ctx.globalAlpha = easeOutCubic(tailT) * 0.95;
          ctx.textAlign = "center";
          ctx.font = `700 52px ${fonts.display}`;
          ctx.fillStyle = "rgba(18,16,14,0.82)";
          const w = ctx.measureText(endText).width + 88;
          ctx.fillRect(CLIP_W / 2 - w / 2, BOARD_Y + BOARD_SIZE / 2 - 52, w, 104);
          ctx.strokeStyle = withAlpha(accent, 0.9);
          ctx.lineWidth = 2;
          ctx.strokeRect(CLIP_W / 2 - w / 2, BOARD_Y + BOARD_SIZE / 2 - 52, w, 104);
          ctx.fillStyle = accent;
          ctx.fillText(endText, CLIP_W / 2, BOARD_Y + BOARD_SIZE / 2 + 18);
          ctx.restore();
        }
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [timeline, timings, durationMs, orientation, colors, images, fonts, accent, names, endText]);

  return (
    <canvas
      ref={canvasRef}
      width={CLIP_W}
      height={CLIP_H}
      className={className}
      aria-label="Clip preview: a stylized replay of the final moves"
    />
  );
});
