// Contrast of the light-theme text overrides on the unpatched bg-ink-700/95 surface.
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => v * t + b[i] * (1 - t)); // t = weight of a
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; const [r, g, b] = c.map(f); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// light page: hsl(37 10% 92%)
function hsl(h, s, l) { s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12; const a = s * Math.min(l, 1 - l); const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); return [f(0), f(8), f(4)].map((v) => Math.round(v * 255)); }
const page = hsl(37, 10, 92);
const ink700 = hex("#302e2c");
const surface = mix(ink700, page, 0.95);
const textPrimary = hex("#3d3d3d"), textSecondary = hex("#666666"), textMuted = hex("#696969");
const p100 = textPrimary;
const p300 = mix(textPrimary, textSecondary, 0.55);
const p400 = mix(textSecondary, textMuted, 0.55);
const out = { surface: surface.map(Math.round), "parchment-100 (title)": ratio(p100, surface).toFixed(2), "parchment-300 (body)": ratio(p300, surface).toFixed(2), "parchment-400 (label)": ratio(p400, surface).toFixed(2) };
// dark theme reference: parchment-100 #dedede on same surface over dark page
const dpage = hsl(37, 10, 8);
const dsurface = mix(ink700, dpage, 0.95);
out["dark ref parchment-100"] = ratio(hex("#dedede"), dsurface).toFixed(2);
console.log(JSON.stringify(out, null, 1));
// Board banners: bg-ink-950/90 (#0f0e0c @ 0.9) over a light board square (#f0d9b5).
const ink950 = hex("#0f0e0c");
const banner = mix(ink950, hex("#f0d9b5"), 0.9);
console.log(JSON.stringify({ banner: banner.map(Math.round), "light parchment-100 on board banner": ratio(p100, banner).toFixed(2), "light parchment-300 on board banner": ratio(p300, banner).toFixed(2) }));
