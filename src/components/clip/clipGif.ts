// GIF loop export: a 2-4 second perfectly looping GIF of the payoff window,
// rendered from the SAME deterministic renderClipFrame the video export uses,
// so the loop is frame-exact with the reel. Everything below is hand-rolled
// (median-cut 256-color quantizer + LZW GIF89a encoder) to keep the encoder
// dependency-free: no gifenc, no wasm, nothing fetched.
//
// Pipeline: pick the payoff window -> pass 1 samples a few frames to build a
// global 256-color palette (median cut over 5-bit-bucketed RGB) -> pass 2
// renders every frame at <=480x854, maps pixels through a bucketed nearest-
// color cache, and streams the indices through a GIF-flavored LZW into
// sub-blocked image data. Deterministic end to end: no Math.random, no
// Date.now, and the palette derives from seeded frames.

import type { ClipScene } from "./clipScene";
import { renderClipFrame } from "./clipScene";

const GIF_FPS = 20;
const GIF_DELAY_CS = Math.round(100 / GIF_FPS); // 5cs = 20fps
const MAX_W = 480;
const MAX_H = 854;

// --- Growable byte sink ------------------------------------------------------

class ByteSink {
  private buf = new Uint8Array(1 << 16);
  private len = 0;

  byte(b: number): void {
    if (this.len >= this.buf.length) {
      const next = new Uint8Array(this.buf.length * 2);
      next.set(this.buf);
      this.buf = next;
    }
    this.buf[this.len++] = b & 0xff;
  }

  bytes(arr: ArrayLike<number>): void {
    for (let i = 0; i < arr.length; i++) this.byte(arr[i]);
  }

  u16(v: number): void {
    this.byte(v & 0xff);
    this.byte((v >> 8) & 0xff);
  }

  ascii(s: string): void {
    for (let i = 0; i < s.length; i++) this.byte(s.charCodeAt(i));
  }

  done(): Uint8Array<ArrayBuffer> {
    const out = new Uint8Array(new ArrayBuffer(this.len));
    out.set(this.buf.subarray(0, this.len));
    return out;
  }
}

// --- Median-cut palette ------------------------------------------------------

/** Median cut over packed 0xRRGGBB samples down to (at most) 256 colors.
 *  Returns a 768-byte color table (padded with black). */
function medianCutPalette(samples: number[]): Uint8Array {
  interface Box {
    px: number[];
  }
  const boxes: Box[] = [{ px: samples }];
  const range = (box: Box): { ch: number; span: number } => {
    let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
    for (const p of box.px) {
      const r = (p >> 16) & 255;
      const g = (p >> 8) & 255;
      const b = p & 255;
      if (r < rMin) rMin = r;
      if (r > rMax) rMax = r;
      if (g < gMin) gMin = g;
      if (g > gMax) gMax = g;
      if (b < bMin) bMin = b;
      if (b > bMax) bMax = b;
    }
    const spans = [rMax - rMin, gMax - gMin, bMax - bMin];
    let ch = 0;
    if (spans[1] >= spans[0] && spans[1] >= spans[2]) ch = 1;
    else if (spans[2] > spans[0]) ch = 2;
    return { ch, span: spans[ch] };
  };
  while (boxes.length < 256) {
    // Split the box with the widest channel span (ties break by pixel count).
    let best = -1;
    let bestSpan = 0;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].px.length < 2) continue;
      const { span } = range(boxes[i]);
      if (span > bestSpan || (span === bestSpan && best >= 0 && boxes[i].px.length > boxes[best].px.length)) {
        best = i;
        bestSpan = span;
      }
    }
    if (best < 0 || bestSpan === 0) break;
    const box = boxes[best];
    const { ch } = range(box);
    const shift = ch === 0 ? 16 : ch === 1 ? 8 : 0;
    box.px.sort((a, b) => ((a >> shift) & 255) - ((b >> shift) & 255));
    const mid = box.px.length >> 1;
    boxes.splice(best, 1, { px: box.px.slice(0, mid) }, { px: box.px.slice(mid) });
  }
  const table = new Uint8Array(768);
  for (let i = 0; i < boxes.length && i < 256; i++) {
    const px = boxes[i].px;
    let r = 0, g = 0, b = 0;
    for (const p of px) {
      r += (p >> 16) & 255;
      g += (p >> 8) & 255;
      b += p & 255;
    }
    const n = Math.max(1, px.length);
    table[i * 3] = Math.round(r / n);
    table[i * 3 + 1] = Math.round(g / n);
    table[i * 3 + 2] = Math.round(b / n);
  }
  return table;
}

/** Nearest-palette lookup, cached over a 15-bit (5 bits/channel) bucket so
 *  the 25M-pixel mapping pass stays O(1) per pixel after warmup. */
function makeMapper(table: Uint8Array): (r: number, g: number, b: number) => number {
  const cache = new Int16Array(1 << 15).fill(-1);
  return (r, g, b) => {
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const hit = cache[key];
    if (hit >= 0) return hit;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < 256; i++) {
      const dr = table[i * 3] - r;
      const dg = table[i * 3 + 1] - g;
      const db = table[i * 3 + 2] - b;
      const d = dr * dr + dg * dg * 2 + db * db; // green-weighted
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    cache[key] = best;
    return best;
  };
}

// --- GIF-flavored LZW --------------------------------------------------------

/** Compress one frame's palette indices into GIF LZW sub-blocks. */
function lzwEncode(indices: Uint8Array, out: ByteSink): void {
  const MIN_CODE = 8;
  const CLEAR = 1 << MIN_CODE; // 256
  const EOI = CLEAR + 1;
  out.byte(MIN_CODE);

  // Sub-block staging: bytes buffer into 255-byte chunks.
  const chunk = new Uint8Array(255);
  let chunkLen = 0;
  let acc = 0;
  let accBits = 0;
  const flushByte = (b: number) => {
    chunk[chunkLen++] = b;
    if (chunkLen === 255) {
      out.byte(255);
      out.bytes(chunk);
      chunkLen = 0;
    }
  };
  let codeSize = MIN_CODE + 1;
  const emit = (code: number) => {
    acc |= code << accBits;
    accBits += codeSize;
    while (accBits >= 8) {
      flushByte(acc & 0xff);
      acc >>= 8;
      accBits -= 8;
    }
  };

  let dict = new Map<number, number>();
  let next = EOI + 1;
  emit(CLEAR);
  let prev = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (prev << 8) | k;
    const found = dict.get(key);
    if (found !== undefined) {
      prev = found;
      continue;
    }
    emit(prev);
    if (next === 4096) {
      emit(CLEAR);
      dict = new Map();
      next = EOI + 1;
      codeSize = MIN_CODE + 1;
    } else {
      if (next >= 1 << codeSize) codeSize++;
      dict.set(key, next++);
    }
    prev = k;
  }
  emit(prev);
  emit(EOI);
  if (accBits > 0) flushByte(acc & 0xff);
  if (chunkLen > 0) {
    out.byte(chunkLen);
    out.bytes(chunk.subarray(0, chunkLen));
  }
  out.byte(0); // block terminator
}

// --- The exporter ------------------------------------------------------------

export interface GifResult {
  blob: Blob;
  width: number;
  height: number;
  frames: number;
  /** Window of the reel the loop covers, ms. */
  windowMs: [number, number];
}

/** Thrown when a re-render supersedes a GIF export in flight. */
export class GifCancelled extends Error {
  constructor() {
    super("gif export cancelled");
    this.name = "GifCancelled";
  }
}

/** The payoff window the loop covers: ~1.1s of wind-up into the impact, 2-4s
 *  total, clamped to the reel. */
export function gifWindow(scene: ClipScene): [number, number] {
  const sf = scene.segs[scene.payoffIndex];
  const impact = sf
    ? sf.start + sf.arrowMs + sf.preMs + sf.moveMs
    : scene.durationMs * 0.5;
  let start = Math.max(0, impact - 1100);
  let end = Math.min(scene.durationMs, start + 3000);
  if (end - start < 2000) start = Math.max(0, end - 2000);
  if (end - start > 4000) end = start + 4000;
  return [start, end];
}

/** Encode the payoff window as a looping GIF (<=480x854, 20fps). Renders the
 *  same deterministic frames as the video export; yields to the event loop
 *  between frames and polls `cancelled` so a settings change can bail out. */
export async function encodeClipGif(
  scene: ClipScene,
  images: Map<string, HTMLImageElement> | null,
  onProgress?: (frac: number) => void,
  cancelled?: () => boolean,
): Promise<GifResult> {
  const { W, H } = scene.layout;
  const s = Math.min(1, MAX_W / W, MAX_H / H);
  const gw = Math.max(2, Math.round(W * s));
  const gh = Math.max(2, Math.round(H * s));
  const [t0, t1] = gifWindow(scene);
  const frameMs = 1000 / GIF_FPS;
  const frames = Math.max(2, Math.round((t1 - t0) / frameMs));

  const canvas = document.createElement("canvas");
  canvas.width = gw;
  canvas.height = gh;
  const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  if (!ctx) throw new Error("no 2d context");
  const renderAt = (i: number) => {
    ctx.setTransform(s, 0, 0, s, 0, 0);
    renderClipFrame(scene, ctx, Math.min(t1, t0 + i * frameMs), images);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };
  const tick = () => new Promise<void>((r) => setTimeout(r, 0));

  // Pass 1: palette from up to 6 evenly spaced frames, every 7th pixel.
  const samples: number[] = [];
  const sampleFrames = Math.min(6, frames);
  for (let k = 0; k < sampleFrames; k++) {
    if (cancelled?.()) throw new GifCancelled();
    renderAt(Math.round((k * (frames - 1)) / Math.max(1, sampleFrames - 1)));
    const data = ctx.getImageData(0, 0, gw, gh).data;
    for (let p = 0; p < data.length; p += 4 * 7) {
      samples.push((data[p] << 16) | (data[p + 1] << 8) | data[p + 2]);
    }
    await tick();
  }
  const palette = medianCutPalette(samples);
  const map = makeMapper(palette);

  // Pass 2: stream every frame through the mapper and the LZW.
  const out = new ByteSink();
  out.ascii("GIF89a");
  out.u16(gw);
  out.u16(gh);
  out.byte(0xf7); // GCT present, 8-bit color resolution, 256-entry table
  out.byte(0); // background color index
  out.byte(0); // pixel aspect
  out.bytes(palette);
  // NETSCAPE looping extension: loop forever.
  out.bytes([0x21, 0xff, 0x0b]);
  out.ascii("NETSCAPE2.0");
  out.bytes([0x03, 0x01, 0x00, 0x00, 0x00]);

  const indices = new Uint8Array(gw * gh);
  for (let i = 0; i < frames; i++) {
    if (cancelled?.()) throw new GifCancelled();
    renderAt(i);
    const data = ctx.getImageData(0, 0, gw, gh).data;
    for (let p = 0, q = 0; q < indices.length; p += 4, q++) {
      indices[q] = map(data[p], data[p + 1], data[p + 2]);
    }
    // Graphic Control Extension + Image Descriptor + LZW data.
    out.bytes([0x21, 0xf9, 0x04, 0x04]); // disposal: do not dispose
    out.u16(GIF_DELAY_CS);
    out.byte(0); // transparent index (unused)
    out.byte(0);
    out.byte(0x2c);
    out.u16(0);
    out.u16(0);
    out.u16(gw);
    out.u16(gh);
    out.byte(0); // no local color table
    lzwEncode(indices, out);
    onProgress?.((i + 1) / frames);
    await tick();
  }
  out.byte(0x3b); // trailer

  const bytes = out.done();
  return {
    blob: new Blob([bytes], { type: "image/gif" }),
    width: gw,
    height: gh,
    frames,
    windowMs: [t0, t1],
  };
}
