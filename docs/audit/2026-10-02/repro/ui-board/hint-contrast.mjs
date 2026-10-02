// Contrast of the board's move hints against the squares they sit on, for
// every BOARD_THEMES entry (src/lib/settings.ts). Colours from globals.css:
//   .dot-target  rgba(20,85,30,0.5)     legal-move dot
//   .dot-capture rgba(20,85,0,0.3)      capture ring
//   .sq-last     rgba(155,199,0,0.41)   last-move tint (vs the untinted square)
//   .sq-sel      rgba(20,85,30,0.5)     selected square
// WCAG 1.4.11 asks 3:1 for graphics needed to understand the state.
import fs from "node:fs";
const src = fs.readFileSync("./src/lib/settings.ts", "utf8");
const i = src.indexOf("export const BOARD_THEMES");
const block = src.slice(i, src.indexOf("};", i));
const themes = [...block.matchAll(/(\w+):\s*\{ light: "(#[0-9a-f]{6})", dark: "(#[0-9a-f]{6})", label: "([^"]+)"/g)].map(m => ({ light: m[2], dark: m[3], label: m[4] }));
const hex = h => [1,3,5].map(i => parseInt(h.slice(i, i+2), 16));
const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = rgb => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x,y) + 0.05) / (Math.min(x,y) + 0.05); };
const over = (rgba, bg) => rgba.slice(0,3).map((v, k) => v * rgba[3] + bg[k] * (1 - rgba[3]));
const hints = { dot: [20,85,30,0.5], ring: [20,85,0,0.3], last: [155,199,0,0.41] };
console.log("theme        dot/light dot/dark  ring/light ring/dark  last/light last/dark");
let low = 0, total = 0;
for (const t of themes) {
  const row = [];
  for (const [k, c] of Object.entries(hints)) for (const sq of [t.light, t.dark]) {
    const bg = hex(sq); const v = cr(over(c, bg), bg); total++; if (v < 3) low++;
    row.push((v.toFixed(2) + (v < 1.5 ? "!!" : v < 3 ? "! " : "  ")).padStart(10));
  }
  console.log(t.label.padEnd(12) + row.join(""));
}
console.log(`pairs under 3:1: ${low}/${total}  (!! = under 1.5:1)`);

// Perceptual distance too (CIE76 deltaE in Lab): luminance contrast undersells a
// green dot on a blue-grey square, so report both. dE < ~10 is hard to spot at a glance.
const toLab = (rgb) => {
  const [r, g, b] = rgb.map(lin);
  let X = (0.4124*r + 0.3576*g + 0.1805*b) / 0.95047, Y = 0.2126*r + 0.7152*g + 0.0722*b, Z = (0.0193*r + 0.1192*g + 0.9505*b) / 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16/116;
  return [116*f(Y) - 16, 500*(f(X) - f(Y)), 200*(f(Y) - f(Z))];
};
const dE = (a, b) => { const p = toLab(a), q = toLab(b); return Math.hypot(p[0]-q[0], p[1]-q[1], p[2]-q[2]); };
console.log("\ndeltaE76  dot/light dot/dark ring/light ring/dark last/light last/dark");
for (const t of themes) {
  const row = [];
  for (const c of Object.values(hints)) for (const sq of [t.light, t.dark]) { const bg = hex(sq); row.push(dE(over(c, bg), bg).toFixed(1).padStart(9)); }
  console.log(t.label.padEnd(10) + row.join(""));
}
