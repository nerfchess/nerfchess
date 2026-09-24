// Real advance widths from the embedded Noto Sans subsets, so a preview can
// pick the largest title size that fits its line budget instead of guessing
// (next/og cannot shrink text to fit on its own). Reads the three tables it
// needs from the TrueType file once: head (units per em), hhea and hmtx
// (advances), and the format 4 cmap (character to glyph).

import { NOTO_SANS_400_B64, NOTO_SANS_700_B64 } from "./fontData";

type Metrics = { unitsPerEm: number; advance: (cp: number) => number };

function parse(b64: string): Metrics {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const dv = new DataView(buf.buffer);
  const tables = new Map<string, number>();
  const numTables = dv.getUint16(4);
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = String.fromCharCode(buf[rec], buf[rec + 1], buf[rec + 2], buf[rec + 3]);
    tables.set(tag, dv.getUint32(rec + 8));
  }
  const head = tables.get("head")!;
  const hhea = tables.get("hhea")!;
  const hmtx = tables.get("hmtx")!;
  const cmap = tables.get("cmap")!;
  const unitsPerEm = dv.getUint16(head + 18);
  const numHMetrics = dv.getUint16(hhea + 34);
  const advanceOfGlyph = (g: number) => dv.getUint16(hmtx + 4 * Math.min(g, numHMetrics - 1));

  // Find the Windows Unicode BMP (3,1) format 4 subtable.
  let sub = -1;
  const n = dv.getUint16(cmap + 2);
  for (let i = 0; i < n; i++) {
    const rec = cmap + 4 + i * 8;
    const platform = dv.getUint16(rec);
    const encoding = dv.getUint16(rec + 2);
    const offset = cmap + dv.getUint32(rec + 4);
    if (platform === 3 && encoding === 1 && dv.getUint16(offset) === 4) sub = offset;
  }
  const cache = new Map<number, number>();
  const glyphOf = (cp: number): number => {
    if (sub < 0 || cp > 0xffff) return 0;
    const segX2 = dv.getUint16(sub + 6);
    const ends = sub + 14;
    const starts = ends + segX2 + 2;
    const deltas = starts + segX2;
    const ranges = deltas + segX2;
    for (let i = 0; i < segX2 / 2; i++) {
      const end = dv.getUint16(ends + i * 2);
      if (cp > end) continue;
      const start = dv.getUint16(starts + i * 2);
      if (cp < start) return 0;
      const delta = dv.getInt16(deltas + i * 2);
      const rangeOffset = dv.getUint16(ranges + i * 2);
      if (rangeOffset === 0) return (cp + delta) & 0xffff;
      const addr = ranges + i * 2 + rangeOffset + (cp - start) * 2;
      const g = dv.getUint16(addr);
      return g === 0 ? 0 : (g + delta) & 0xffff;
    }
    return 0;
  };
  return {
    unitsPerEm,
    advance(cp: number) {
      let a = cache.get(cp);
      if (a === undefined) {
        a = advanceOfGlyph(glyphOf(cp));
        cache.set(cp, a);
      }
      return a;
    },
  };
}

let regular: Metrics | null = null;
let bold: Metrics | null = null;

/** Width in pixels of `text` set in Noto Sans at `size`, without kerning. */
export function textWidth(text: string, size: number, isBold: boolean): number {
  const m = isBold ? (bold ??= parse(NOTO_SANS_700_B64)) : (regular ??= parse(NOTO_SANS_400_B64));
  let units = 0;
  for (const ch of text) units += m.advance(ch.codePointAt(0)!);
  return (units / m.unitsPerEm) * size;
}
