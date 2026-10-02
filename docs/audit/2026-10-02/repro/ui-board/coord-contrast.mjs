// WCAG contrast of the hardcoded coordinate label colours (Board.tsx:2380,2392:
// #4a3826 on light squares, #eeeed2 at 85% opacity on dark squares) against
// every BOARD_THEMES square colour in src/lib/settings.ts.
import fs from "node:fs";
const src = fs.readFileSync("./src/lib/settings.ts", "utf8");
const block = src.slice(src.indexOf("export const BOARD_THEMES"), src.indexOf("};", src.indexOf("export const BOARD_THEMES")));
const themes = [...block.matchAll(/(\w+):\s*\{ light: "(#[0-9a-f]{6})", dark: "(#[0-9a-f]{6})", label: "([^"]+)"/g)].map(m => ({ k: m[1], light: m[2], dark: m[3], label: m[4] }));
const hex = h => [1,3,5].map(i => parseInt(h.slice(i, i+2), 16));
const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = rgb => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x,y) + 0.05) / (Math.min(x,y) + 0.05); };
const mix = (fg, bg, a) => fg.map((v, i) => Math.round(v * a + bg[i] * (1 - a)));
const onLight = hex("#4a3826"), onDark = hex("#eeeed2");
let fails = 0;
console.log("theme        light-sq label   dark-sq label   (12px semibold mono: AA needs 4.5)");
for (const t of themes) {
  const a = cr(onLight, hex(t.light));
  const b = cr(mix(onDark, hex(t.dark), 0.85), hex(t.dark));
  const flag = (v) => (v < 4.5 ? (v < 3 ? " FAIL<3" : " <4.5") : "");
  if (a < 4.5) fails++; if (b < 4.5) fails++;
  console.log(`${t.label.padEnd(12)} ${a.toFixed(2).padStart(6)}${flag(a).padEnd(8)}  ${b.toFixed(2).padStart(6)}${flag(b)}`);
}
console.log(`themes: ${themes.length}, label/square pairs under 4.5:1: ${fails}`);
