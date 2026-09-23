// Text shaping for link previews: keep only what the embedded font can draw,
// clamp to a length that fits, and pick a title size that fits a line budget.

import { OG_FONT_EXTRA, OG_FONT_RANGES } from "./fontData";
import { textWidth } from "./metrics";

const EXTRA = new Set(OG_FONT_EXTRA);

function drawable(cp: number): boolean {
  if (EXTRA.has(cp)) return true;
  for (const [a, b] of OG_FONT_RANGES) if (cp >= a && cp <= b) return true;
  return false;
}

/** Collapse whitespace and drop every character the embedded Noto Sans subset
 *  cannot draw (emoji, CJK, symbols), so a user-named club never renders as a
 *  row of empty boxes. Returns "" when nothing drawable is left; callers fall
 *  back to a generic label. Em dashes become commas (house style). */
export function ogText(input: unknown): string {
  if (typeof input !== "string") return "";
  let out = "";
  for (const ch of input.normalize("NFC").replace(/\u2014/g, ", ")) {
    const cp = ch.codePointAt(0)!;
    if (/\s/.test(ch)) out += " ";
    else if (drawable(cp)) out += ch;
  }
  return out.replace(/\s+/g, " ").replace(/\s+([,.])/g, "$1").trim();
}

/** Clamp near `max` characters on a word boundary, with an ellipsis. */
export function clamp(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > max / 2 ? space : cut.length).replace(/[\s,.;:]+$/, "")}\u2026`;
}

/** Number of lines `text` wraps to at `size` in `width` pixels, from the
 *  font's real advance widths (a word longer than the line counts as one line,
 *  as next/og breaks it). A 3% margin covers kerning and rounding. */
export function lineCount(text: string, size: number, width: number, bold = false): number {
  const room = width * 0.97;
  const space = textWidth(" ", size, bold);
  let lines = 1;
  let x = 0;
  for (const word of text.split(" ")) {
    const w = textWidth(word, size, bold);
    if (x > 0 && x + space + w > room) {
      lines += 1;
      x = w;
    } else {
      x += (x > 0 ? space : 0) + w;
    }
  }
  return lines;
}

/** The largest size in `sizes` (descending) at which `text` fits `maxLines`
 *  lines of `width` pixels; the smallest size otherwise. */
export function fitSize(text: string, width: number, maxLines: number, sizes: number[], bold = true): number {
  for (const s of sizes) if (lineCount(text, s, width, bold) <= maxLines) return s;
  return sizes[sizes.length - 1];
}

/** 1234 -> "1,234". */
export function formatCount(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** Seconds and increment -> "5+3", "10+0", or "No clock". */
export function clockLabel(timeSec: number, incrementSec: number): string {
  if (!timeSec && !incrementSec) return "No clock";
  const minutes = timeSec / 60;
  const m = Number.isInteger(minutes) ? String(minutes) : minutes < 1 ? `${timeSec}s` : minutes.toFixed(1);
  return `${m}+${incrementSec}`;
}
