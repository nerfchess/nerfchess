// Deterministic profile-picture generator for the house-bot roster.
//
// The first generation of this script emitted 200 dawn/dusk landscape scenes.
// They were unique in the pixel sense but read as the SAME image at avatar
// size — every bot looked like a sunset. This version emits the kind of pfp
// real players actually upload: one bold, memorable subject per image — an
// animal face, a meme-style grin, a Rubik's cube, an arcade stick, a moai, a
// rubber duck — drawn as original flat vector art (nothing traced or copied,
// so there is nothing to license) over a varied set of colored backdrops.
//
// 50 distinct subjects x 4 palette/backdrop variations = 200 files, and no
// two files share both subject and palette, so the crowd finally reads as 200
// different people. Output is fully deterministic per index — re-running
// produces byte-identical files — so the roster's look is stable across
// deploys, and the filenames (gen_NNN.svg) are unchanged so every stored
// "house_pfp:gen_NNN" avatar id keeps resolving.
//
// Usage:
//   node scripts/gen-house-pfps.mjs           # write/refresh the generated SVGs
//   node scripts/gen-house-pfps.mjs --check    # verify on-disk files are current
//
// The generated names + count are mirrored in src/lib/avatars.ts
// (GENERATED_PFP_COUNT / generatedPfpName). Keep the two in lockstep: bump the
// count here and there together. The audit script (scripts/audit-house-bots.ts)
// asserts every roster pfp resolves to a file that exists.

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "house-pfp");

// Must match src/lib/avatars.ts GENERATED_PFP_COUNT + generatedPfpName().
// 560 with the 2026-07 roster expansion. IMPORTANT: the count may only ever
// grow, and the MOTIFS/PALETTES/BACKDROPS arrays must never be reordered or
// resized — buildSvg(i) must stay byte-stable for every already-shipped index
// so stored "house_pfp:gen_NNN" avatars never change appearance.
export const GENERATED_PFP_COUNT = 1000;
export const generatedPfpName = (i) => `gen_${String(i).padStart(3, "0")}`;

// A tiny deterministic PRNG (mulberry32) so each index yields a stable image.
function rngFor(seed) {
  let a = (seed ^ 0x9e3779b9) >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Bold two-tone backdrop palettes plus a pop accent, spanning the whole hue
// wheel (deliberately NOT the old sunset register).
const PALETTES = [
  { a: "#1f7a8c", b: "#022b3a", pop: "#ffd166" },
  { a: "#ef6351", b: "#8c2f39", pop: "#ffe8d1" },
  { a: "#7b5ea7", b: "#2d1e4f", pop: "#ffd97e" },
  { a: "#9bc53d", b: "#3a5a24", pop: "#fff8d6" },
  { a: "#5aa9e6", b: "#1b3a6b", pop: "#ffe45e" },
  { a: "#d81e5b", b: "#5c0f33", pop: "#ffd6e0" },
  { a: "#f4a259", b: "#8c4a1f", pop: "#fff1d0" },
  { a: "#62c99d", b: "#1f5c46", pop: "#eafff5" },
  { a: "#3d5a80", b: "#101d33", pop: "#ee6c4d" },
  { a: "#e56b6f", b: "#6d2e46", pop: "#ffe5d9" },
  { a: "#6c7a89", b: "#2b3440", pop: "#ffd166" },
  { a: "#9d4edd", b: "#3c096c", pop: "#ffe45e" },
  { a: "#12a4a8", b: "#053f42", pop: "#ffe08a" },
  { a: "#d9ae7e", b: "#7a5230", pop: "#fffbe0" },
  { a: "#c1121f", b: "#590d15", pop: "#ffe3e0" },
  { a: "#4f772d", b: "#132a13", pop: "#ffe66d" },
];

// Backdrop styles. Each returns { defs, body } for a 200x200 canvas.
const BACKDROPS = [
  (uid, p) => ({
    defs: `<linearGradient id="${uid}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient>`,
    body: `<rect width="200" height="200" fill="url(#${uid}bg)"/>`,
  }),
  (uid, p) => ({
    defs: `<radialGradient id="${uid}bg" cx="0.5" cy="0.42" r="0.75"><stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></radialGradient>`,
    body: `<rect width="200" height="200" fill="url(#${uid}bg)"/>`,
  }),
  (uid, p) => ({
    defs: "",
    body:
      `<rect width="200" height="200" fill="${p.b}"/>` +
      `<path d="M0 0 H200 L0 200 Z" fill="${p.a}"/>`,
  }),
  (uid, p) => ({
    defs: "",
    body:
      `<rect width="200" height="200" fill="${p.b}"/>` +
      `<g fill="${p.a}"><path d="M-40 240 L120 -40 H160 L0 240 Z"/><path d="M40 240 L200 -40 H240 L80 240 Z" opacity="0.55"/></g>`,
  }),
  (uid, p) => {
    let dots = "";
    for (let y = 14; y < 200; y += 24) {
      for (let x = ((y / 24) | 0) % 2 ? 26 : 14; x < 200; x += 24) {
        dots += `<circle cx="${x}" cy="${y}" r="3"/>`;
      }
    }
    return {
      defs: "",
      body:
        `<rect width="200" height="200" fill="${p.b}"/>` +
        `<g fill="${p.a}" opacity="0.5">${dots}</g>`,
    };
  },
  (uid, p) => {
    let sq = "";
    for (let y = 0; y < 200; y += 50) {
      for (let x = 0; x < 200; x += 50) {
        if (((x + y) / 50) % 2 === 0) sq += `<rect x="${x}" y="${y}" width="50" height="50"/>`;
      }
    }
    return {
      defs: "",
      body:
        `<rect width="200" height="200" fill="${p.b}"/>` +
        `<g fill="${p.a}" opacity="0.45">${sq}</g>`,
    };
  },
  (uid, p) => {
    let rays = "";
    for (let i = 0; i < 12; i++) {
      rays += `<path d="M100 100 L${100 + 160 * Math.cos((i * Math.PI) / 6)} ${100 + 160 * Math.sin((i * Math.PI) / 6)} L${100 + 160 * Math.cos(((i + 0.5) * Math.PI) / 6)} ${100 + 160 * Math.sin(((i + 0.5) * Math.PI) / 6)} Z"/>`;
    }
    return {
      defs: `<linearGradient id="${uid}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient>`,
      body:
        `<rect width="200" height="200" fill="url(#${uid}bg)"/>` +
        `<g fill="${p.b}" opacity="0.35">${rays}</g>`,
    };
  },
];

// ---------------------------------------------------------------------------
// The subject catalog: 50 distinct, memorable, avatar-sized drawings. Each is
// original flat vector art with its own fixed colors (so a panda stays a
// panda on any backdrop); the palette only drives the backdrop + small pop
// accents. Keep every subject readable at 32px: one big silhouette, high
// contrast, no fine detail that vanishes when small.
// ---------------------------------------------------------------------------

const eyes = (x1, x2, y, r = 6, c = "#20242e") =>
  `<circle cx="${x1}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x2}" cy="${y}" r="${r}" fill="${c}"/>` +
  `<circle cx="${x1 + r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.3}" fill="#fff"/><circle cx="${x2 + r * 0.3}" cy="${y - r * 0.3}" r="${r * 0.3}" fill="#fff"/>`;

const MOTIFS = [
  {
    label: "Gray cat",
    draw: () =>
      `<path d="M52 84 L60 38 L92 66 Z" fill="#8d93a3"/><path d="M148 84 L140 38 L108 66 Z" fill="#8d93a3"/>` +
      `<path d="M60 48 L66 60 L80 62 Z" fill="#e8a8b8"/><path d="M140 48 L134 60 L120 62 Z" fill="#e8a8b8"/>` +
      `<circle cx="100" cy="108" r="52" fill="#8d93a3"/>` +
      eyes(80, 120, 100, 7) +
      `<path d="M94 118 L106 118 L100 126 Z" fill="#e8a8b8"/>` +
      `<path d="M100 126 q-6 10 -16 6 M100 126 q6 10 16 6" stroke="#20242e" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
      `<g stroke="#e6e9f2" stroke-width="2" stroke-linecap="round"><path d="M40 104 h22 M40 116 h22 M138 104 h22 M138 116 h22"/></g>`,
  },
  {
    label: "Shiba dog",
    draw: () =>
      `<path d="M54 82 L58 40 L90 62 Z" fill="#e0a35c"/><path d="M146 82 L142 40 L110 62 Z" fill="#e0a35c"/>` +
      `<circle cx="100" cy="110" r="54" fill="#e0a35c"/>` +
      `<path d="M100 164 a54 54 0 0 0 44 -84 q-22 6 -44 40 q-22 -34 -44 -40 a54 54 0 0 0 44 84z" fill="#f6e5c8"/>` +
      `<circle cx="78" cy="98" r="6" fill="#20242e"/><circle cx="122" cy="98" r="6" fill="#20242e"/>` +
      `<ellipse cx="100" cy="126" rx="9" ry="7" fill="#3a2c1e"/>` +
      `<path d="M100 133 q-8 10 -18 4 M100 133 q8 10 18 4" stroke="#3a2c1e" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
      `<circle cx="66" cy="118" r="8" fill="#e88f6a" opacity="0.5"/><circle cx="134" cy="118" r="8" fill="#e88f6a" opacity="0.5"/>`,
  },
  {
    label: "Red fox",
    draw: () =>
      `<path d="M50 92 L54 36 L94 60 Z" fill="#d96b3a"/><path d="M150 92 L146 36 L106 60 Z" fill="#d96b3a"/>` +
      `<path d="M58 44 L62 62 L82 60 Z" fill="#3a2c24"/><path d="M142 44 L138 62 L118 60 Z" fill="#3a2c24"/>` +
      `<circle cx="100" cy="110" r="52" fill="#d96b3a"/>` +
      `<path d="M60 128 q18 34 40 34 q22 0 40 -34 q-18 12 -40 12 q-22 0 -40 -12z" fill="#f6ead8"/>` +
      eyes(80, 120, 102, 6) +
      `<path d="M92 138 L108 138 L100 148 Z" fill="#3a2c24"/>`,
  },
  {
    label: "Owl",
    draw: () =>
      `<ellipse cx="100" cy="112" rx="52" ry="56" fill="#8a6a4f"/>` +
      `<path d="M56 70 q10 -18 24 -12 M144 70 q-10 -18 -24 -12" stroke="#8a6a4f" stroke-width="10" fill="none" stroke-linecap="round"/>` +
      `<circle cx="79" cy="100" r="21" fill="#f2e6cf"/><circle cx="121" cy="100" r="21" fill="#f2e6cf"/>` +
      `<circle cx="79" cy="100" r="10" fill="#20242e"/><circle cx="121" cy="100" r="10" fill="#20242e"/>` +
      `<circle cx="82" cy="97" r="3" fill="#fff"/><circle cx="124" cy="97" r="3" fill="#fff"/>` +
      `<path d="M93 118 L107 118 L100 132 Z" fill="#e8b04a"/>` +
      `<path d="M74 138 q8 8 16 0 M94 142 q8 8 16 0 M114 138 q8 8 16 0" stroke="#6e5340" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  },
  {
    label: "Penguin",
    draw: () =>
      `<ellipse cx="100" cy="116" rx="46" ry="54" fill="#2b3240"/>` +
      `<ellipse cx="100" cy="124" rx="30" ry="40" fill="#f2f4f8"/>` +
      `<circle cx="86" cy="92" r="6" fill="#fff"/><circle cx="114" cy="92" r="6" fill="#fff"/>` +
      `<circle cx="86" cy="92" r="3" fill="#20242e"/><circle cx="114" cy="92" r="3" fill="#20242e"/>` +
      `<path d="M92 104 L108 104 L100 114 Z" fill="#e8952f"/>` +
      `<path d="M58 108 q-12 22 2 40 M142 108 q12 22 -2 40" stroke="#2b3240" stroke-width="10" fill="none" stroke-linecap="round"/>` +
      `<path d="M84 168 h12 l-6 8 z M104 168 h12 l-6 8 z" fill="#e8952f"/>`,
  },
  {
    label: "Frog",
    draw: () =>
      `<circle cx="72" cy="72" r="20" fill="#5cae4a"/><circle cx="128" cy="72" r="20" fill="#5cae4a"/>` +
      `<circle cx="72" cy="70" r="11" fill="#fff"/><circle cx="128" cy="70" r="11" fill="#fff"/>` +
      `<circle cx="72" cy="70" r="5" fill="#20242e"/><circle cx="128" cy="70" r="5" fill="#20242e"/>` +
      `<ellipse cx="100" cy="118" rx="56" ry="44" fill="#5cae4a"/>` +
      `<path d="M64 122 q36 26 72 0" stroke="#2f5c26" stroke-width="4" fill="none" stroke-linecap="round"/>` +
      `<circle cx="62" cy="106" r="7" fill="#e88f6a" opacity="0.45"/><circle cx="138" cy="106" r="7" fill="#e88f6a" opacity="0.45"/>`,
  },
  {
    label: "Panda",
    draw: () =>
      `<circle cx="62" cy="66" r="18" fill="#20242e"/><circle cx="138" cy="66" r="18" fill="#20242e"/>` +
      `<circle cx="100" cy="112" r="54" fill="#f4f4f2"/>` +
      `<ellipse cx="78" cy="102" rx="14" ry="17" fill="#20242e" transform="rotate(-18 78 102)"/>` +
      `<ellipse cx="122" cy="102" rx="14" ry="17" fill="#20242e" transform="rotate(18 122 102)"/>` +
      `<circle cx="80" cy="104" r="5" fill="#fff"/><circle cx="120" cy="104" r="5" fill="#fff"/>` +
      `<circle cx="80" cy="104" r="2.5" fill="#20242e"/><circle cx="120" cy="104" r="2.5" fill="#20242e"/>` +
      `<ellipse cx="100" cy="128" rx="8" ry="6" fill="#20242e"/>` +
      `<path d="M100 134 q-6 8 -14 4 M100 134 q6 8 14 4" stroke="#20242e" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  },
  {
    label: "Brown bear",
    draw: () =>
      `<circle cx="60" cy="66" r="17" fill="#8a5a34"/><circle cx="140" cy="66" r="17" fill="#8a5a34"/>` +
      `<circle cx="60" cy="66" r="8" fill="#c99668"/><circle cx="140" cy="66" r="8" fill="#c99668"/>` +
      `<circle cx="100" cy="112" r="54" fill="#8a5a34"/>` +
      `<ellipse cx="100" cy="130" rx="24" ry="19" fill="#c99668"/>` +
      eyes(80, 120, 100, 6) +
      `<ellipse cx="100" cy="124" rx="9" ry="7" fill="#3a2c1e"/>` +
      `<path d="M100 131 v8 M100 139 q-7 7 -14 2 M100 139 q7 7 14 2" stroke="#3a2c1e" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  },
  {
    label: "Koala",
    draw: () =>
      `<circle cx="52" cy="84" r="26" fill="#9aa2ad"/><circle cx="148" cy="84" r="26" fill="#9aa2ad"/>` +
      `<circle cx="52" cy="84" r="13" fill="#d8a8b8"/><circle cx="148" cy="84" r="13" fill="#d8a8b8"/>` +
      `<ellipse cx="100" cy="112" rx="48" ry="50" fill="#b8bec8"/>` +
      eyes(82, 118, 102, 5) +
      `<ellipse cx="100" cy="124" rx="12" ry="17" fill="#3a3f4a"/>`,
  },
  {
    label: "Octopus",
    draw: () =>
      `<path d="M56 116 a44 44 0 1 1 88 0 v14 h-88 z" fill="#9c6bb8"/>` +
      `<g fill="#9c6bb8"><path d="M56 128 q-14 22 4 34 q-12 -4 -14 -18 q-4 16 12 26 l10 -18 z"/><path d="M144 128 q14 22 -4 34 q12 -4 14 -18 q4 16 -12 26 l-10 -18 z"/><path d="M76 132 q-6 26 8 38 l10 -14 z"/><path d="M124 132 q6 26 -8 38 l-10 -14 z"/><path d="M96 134 h8 q4 24 -4 34 q-8 -10 -4 -34z"/></g>` +
      eyes(82, 118, 100, 7) +
      `<path d="M90 122 q10 8 20 0" stroke="#4a2c5e" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  },
  {
    label: "Whale",
    draw: (p) =>
      `<g stroke="${p.pop}" stroke-width="3" stroke-linecap="round"><path d="M100 34 v14 M88 40 q0 -12 12 -8 M112 40 q0 -12 -12 -8"/></g>` +
      `<path d="M34 118 q10 -46 66 -46 q56 0 66 34 q0 34 -46 34 h-60 q-26 0 -26 -22z" fill="#4a7fb5"/>` +
      `<path d="M150 128 q22 -4 28 -20 q4 20 -10 30 q-14 8 -24 -2z" fill="#4a7fb5"/>` +
      `<path d="M40 122 q30 14 84 14 q-6 10 -24 10 h-40 q-18 0 -20 -24z" fill="#dce8f4"/>` +
      `<circle cx="72" cy="102" r="6" fill="#20242e"/><circle cx="74" cy="100" r="2" fill="#fff"/>` +
      `<path d="M52 116 q8 6 16 0" stroke="#20242e" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  },
  {
    label: "Crab",
    draw: () =>
      `<g stroke="#c94f38" stroke-width="8" fill="none" stroke-linecap="round"><path d="M62 128 q-26 4 -32 24 M138 128 q26 4 32 24 M70 142 q-20 8 -22 24 M130 142 q20 8 22 24"/></g>` +
      `<path d="M58 74 q-20 -14 -14 -32 q16 2 22 20 z" fill="#e06046"/><path d="M142 74 q20 -14 14 -32 q-16 2 -22 20 z" fill="#e06046"/>` +
      `<path d="M56 66 v20 M144 66 v20" stroke="#e06046" stroke-width="9" stroke-linecap="round"/>` +
      `<ellipse cx="100" cy="118" rx="52" ry="38" fill="#e06046"/>` +
      eyes(82, 118, 108, 6) +
      `<path d="M88 130 q12 8 24 0" stroke="#7c2618" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  },
  {
    label: "Butterfly",
    draw: (p) =>
      `<g fill="#d977b8"><path d="M96 100 q-44 -52 -62 -30 q-12 16 18 40 q-30 8 -14 28 q14 16 58 -22z"/><path d="M104 100 q44 -52 62 -30 q12 16 -18 40 q30 8 14 28 q-14 16 -58 -22z"/></g>` +
      `<g fill="${p.pop}" opacity="0.8"><circle cx="62" cy="86" r="8"/><circle cx="138" cy="86" r="8"/><circle cx="66" cy="122" r="5"/><circle cx="134" cy="122" r="5"/></g>` +
      `<rect x="95" y="76" width="10" height="60" rx="5" fill="#3a3040"/>` +
      `<path d="M97 78 q-8 -14 -16 -18 M103 78 q8 -14 16 -18" stroke="#3a3040" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  },
  {
    label: "Cobra",
    draw: () =>
      `<path d="M100 34 q-50 8 -50 58 q0 44 38 56 h-22 q-9 0 -9 10 q0 8 10 8 h66 q10 0 10 -8 q0 -10 -9 -10 h-22 q38 -12 38 -56 q0 -50 -50 -58z" fill="#5c9c50" stroke="#35682e" stroke-width="4"/>` +
      `<path d="M100 46 q-36 8 -36 46 q0 30 22 42 q-8 -34 14 -56 q22 22 14 56 q22 -12 22 -42 q0 -38 -36 -46z" fill="#3f7a38"/>` +
      `<ellipse cx="100" cy="86" rx="22" ry="26" fill="#cfe6b8"/>` +
      `<circle cx="91" cy="80" r="6" fill="#20242e"/><circle cx="109" cy="80" r="6" fill="#20242e"/>` +
      `<circle cx="93" cy="78" r="2" fill="#fff"/><circle cx="111" cy="78" r="2" fill="#fff"/>` +
      `<path d="M94 98 q6 5 12 0" stroke="#35682e" stroke-width="3" fill="none" stroke-linecap="round"/>` +
      `<path d="M100 102 v14 M100 116 l-7 9 M100 116 l7 9" stroke="#c94f38" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  },
  {
    label: "Dinosaur",
    draw: () =>
      `<path d="M50 148 q-4 -70 46 -78 q52 -8 58 34 l-28 4 6 10 l-24 4 6 10 l-22 4 q4 24 -6 32 q-24 8 -36 -20z" fill="#5aa05a"/>` +
      `<path d="M64 74 l10 -22 8 20 M86 64 l10 -22 8 20 M108 60 l10 -20 8 18" fill="#3f7a3f"/>` +
      `<circle cx="118" cy="92" r="7" fill="#20242e"/><circle cx="120" cy="90" r="2.5" fill="#fff"/>` +
      `<path d="M126 122 l8 8 M112 126 l8 8" stroke="#f2f4e8" stroke-width="5" stroke-linecap="round"/>` +
      `<circle cx="78" cy="112" r="6" fill="#3f7a3f"/><circle cx="94" cy="130" r="5" fill="#3f7a3f"/>`,
  },
  {
    label: "Rubber duck",
    draw: () =>
      `<circle cx="86" cy="84" r="34" fill="#f2c73a"/>` +
      `<path d="M44 132 q0 -22 26 -22 h52 q34 0 34 -18 q10 40 -22 58 q-30 16 -64 2 q-26 -8 -26 -20z" fill="#f2c73a"/>` +
      `<path d="M52 82 q-18 -2 -24 8 q6 10 24 8 z" fill="#e8952f"/>` +
      `<circle cx="92" cy="76" r="6" fill="#20242e"/><circle cx="94" cy="74" r="2" fill="#fff"/>` +
      `<path d="M96 120 q22 6 40 -4" stroke="#c9992a" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  },
  {
    label: "Puzzle cube",
    draw: () => {
      const cols = [
        ["#e84040", "#f2c73a", "#3a78d8"],
        ["#f2f2f2", "#e8952f", "#4aae4a"],
        ["#f2c73a", "#3a78d8", "#e84040"],
      ];
      let cells = "";
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++)
          cells += `<rect x="${58 + c * 30}" y="${64 + r * 30}" width="26" height="26" rx="4" fill="${cols[r][c]}"/>`;
      return (
        `<rect x="50" y="56" width="100" height="100" rx="10" fill="#20242e"/>` +
        cells +
        `<path d="M50 66 q-14 30 0 80 M150 66 q14 30 0 80" stroke="#20242e" stroke-width="10" fill="none" stroke-linecap="round"/>`
      );
    },
  },
  {
    label: "Game controller",
    draw: (p) =>
      `<path d="M56 74 h88 q26 0 30 40 q4 42 -16 44 q-14 2 -26 -22 h-64 q-12 24 -26 22 q-20 -2 -16 -44 q4 -40 30 -40z" fill="#3a4152"/>` +
      `<path d="M70 96 h14 M77 89 v14" stroke="#e6e9f2" stroke-width="7" stroke-linecap="round"/>` +
      `<circle cx="118" cy="90" r="6" fill="#f2c73a"/><circle cx="134" cy="102" r="6" fill="#4aae4a"/>` +
      `<circle cx="118" cy="114" r="6" fill="#e84040"/><circle cx="102" cy="102" r="6" fill="#3a78d8"/>` +
      `<circle cx="100" cy="80" r="3" fill="${p.pop}"/>`,
  },
  {
    label: "Dice",
    draw: () =>
      `<rect x="42" y="76" width="64" height="64" rx="10" fill="#f2f2ee" transform="rotate(-8 74 108)"/>` +
      `<g fill="#20242e" transform="rotate(-8 74 108)"><circle cx="58" cy="92" r="6"/><circle cx="74" cy="108" r="6"/><circle cx="90" cy="124" r="6"/></g>` +
      `<rect x="102" y="66" width="60" height="60" rx="10" fill="#e84040" transform="rotate(10 132 96)"/>` +
      `<g fill="#fff" transform="rotate(10 132 96)"><circle cx="118" cy="82" r="5.5"/><circle cx="146" cy="82" r="5.5"/><circle cx="118" cy="110" r="5.5"/><circle cx="146" cy="110" r="5.5"/></g>`,
  },
  {
    label: "Trophy",
    draw: () =>
      `<path d="M68 52 h64 v28 q0 30 -32 38 q-32 -8 -32 -38 z" fill="#f2c73a"/>` +
      `<path d="M68 58 h-20 q-2 26 22 32 M132 58 h20 q2 26 -22 32" stroke="#f2c73a" stroke-width="8" fill="none"/>` +
      `<rect x="92" y="116" width="16" height="16" fill="#d9a520"/>` +
      `<path d="M74 148 h52 l6 14 h-64 z" fill="#d9a520"/>` +
      `<rect x="64" y="162" width="72" height="8" rx="3" fill="#8a6a1f"/>` +
      `<path d="M84 64 q-2 18 8 28" stroke="#fff" stroke-width="4" fill="none" opacity="0.5" stroke-linecap="round"/>`,
  },
  {
    label: "Rocket",
    draw: (p) =>
      `<path d="M100 30 q30 26 30 74 l-30 16 l-30 -16 q0 -48 30 -74z" fill="#e6e9f2"/>` +
      `<circle cx="100" cy="86" r="14" fill="#3a78d8"/><circle cx="100" cy="86" r="8" fill="#a8d0f0"/>` +
      `<path d="M70 104 q-20 10 -22 40 l24 -14 z M130 104 q20 10 22 40 l-24 -14 z" fill="#e84040"/>` +
      `<path d="M100 120 l-12 24 h24 z" fill="#e84040"/>` +
      `<path d="M92 148 q8 22 8 22 q0 0 8 -22 q-8 6 -16 0z" fill="${p.pop}"/>`,
  },
  {
    label: "Ringed planet",
    draw: (p) =>
      `<circle cx="100" cy="100" r="42" fill="#d98f4a"/>` +
      `<path d="M62 92 q38 -14 76 0 M58 108 q42 16 84 0" stroke="#b06a2e" stroke-width="7" fill="none" opacity="0.7"/>` +
      `<ellipse cx="100" cy="104" rx="76" ry="20" fill="none" stroke="${p.pop}" stroke-width="7" transform="rotate(-16 100 104)"/>` +
      `<circle cx="146" cy="64" r="4" fill="${p.pop}"/><circle cx="52" cy="140" r="3" fill="${p.pop}"/>`,
  },
  {
    label: "Crescent moon",
    draw: (p) =>
      `<path d="M124 36 a70 70 0 1 0 40 118 a58 58 0 0 1 -40 -118z" fill="#f2e6b8"/>` +
      `<circle cx="88" cy="86" r="9" fill="#d9c98a"/><circle cx="72" cy="126" r="6" fill="#d9c98a"/><circle cx="100" cy="150" r="7" fill="#d9c98a"/>` +
      `<g fill="${p.pop}"><path d="M150 60 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z"/><circle cx="164" cy="104" r="3"/></g>`,
  },
  {
    label: "Star",
    draw: (p) =>
      `<path d="M100 30 l20 46 50 5 -38 33 11 49 -43 -26 -43 26 11 -49 -38 -33 50 -5z" fill="#f2c73a" stroke="#d9a520" stroke-width="4" stroke-linejoin="round"/>` +
      `<circle cx="86" cy="96" r="5" fill="#20242e"/><circle cx="114" cy="96" r="5" fill="#20242e"/>` +
      `<path d="M88 116 q12 10 24 0" stroke="#20242e" stroke-width="3.5" fill="none" stroke-linecap="round"/>` +
      `<circle cx="160" cy="52" r="4" fill="${p.pop}"/><circle cx="40" cy="60" r="3" fill="${p.pop}"/>`,
  },
  {
    label: "Lightning bolt",
    draw: () =>
      `<path d="M116 26 L58 112 h34 l-12 62 L142 88 h-36 z" fill="#f2c73a" stroke="#d9a520" stroke-width="4" stroke-linejoin="round"/>`,
  },
  {
    label: "Mushroom",
    draw: () =>
      `<path d="M40 104 q0 -58 60 -58 q60 0 60 58 q0 10 -12 10 h-96 q-12 0 -12 -10z" fill="#d94040"/>` +
      `<g fill="#f6ead8"><circle cx="72" cy="76" r="10"/><circle cx="112" cy="62" r="8"/><circle cx="132" cy="88" r="7"/><circle cx="92" cy="94" r="6"/></g>` +
      `<path d="M76 114 h48 q4 40 -10 50 h-28 q-14 -10 -10 -50z" fill="#f2e6cf"/>` +
      `<circle cx="90" cy="136" r="3.5" fill="#20242e"/><circle cx="110" cy="136" r="3.5" fill="#20242e"/>` +
      `<path d="M94 148 q6 5 12 0" stroke="#20242e" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  },
  {
    label: "Potted cactus",
    draw: (p) =>
      `<rect x="88" y="52" width="24" height="70" rx="12" fill="#4aae6a"/>` +
      `<path d="M88 84 q-24 0 -24 -22 q0 -8 8 -8 q8 0 8 8 q0 6 8 6 M112 96 q26 0 26 -26 q0 -8 -8 -8 q-8 0 -8 8 q0 10 -10 10" stroke="#4aae6a" stroke-width="16" fill="none" stroke-linecap="round"/>` +
      `<g stroke="#2e7a46" stroke-width="2" stroke-linecap="round"><path d="M96 62 v8 M104 72 v8 M96 92 v8 M104 102 v8"/></g>` +
      `<circle cx="100" cy="50" r="8" fill="${p.pop}"/>` +
      `<path d="M74 122 h52 l-6 46 h-40 z" fill="#c9704a"/><rect x="70" y="118" width="60" height="10" rx="4" fill="#e08a5c"/>`,
  },
  {
    label: "Pizza slice",
    draw: () =>
      `<path d="M100 172 L54 52 q46 -22 92 0 z" fill="#f2c96a"/>` +
      `<path d="M54 52 q46 -22 92 0 l-6 16 q-40 -18 -80 0 z" fill="#d94040"/>` +
      `<g fill="#c94f38"><circle cx="94" cy="94" r="9"/><circle cx="116" cy="112" r="8"/><circle cx="84" cy="126" r="7"/><circle cx="102" cy="146" r="6"/></g>`,
  },
  {
    label: "Donut",
    draw: () =>
      `<circle cx="100" cy="104" r="56" fill="#e8a86a"/>` +
      `<path d="M100 48 a56 56 0 0 1 0 112 a56 56 0 0 1 0 -112z M100 78 q26 2 28 26 q-4 22 -28 20 q-26 -4 -26 -22 q2 -20 26 -24z" fill="#e87ba8" fill-rule="evenodd"/>` +
      `<circle cx="100" cy="104" r="17" fill="#000" opacity="0.4"/>` +
      `<g stroke-width="4" stroke-linecap="round"><path d="M70 84 l10 -6" stroke="#fff"/><path d="M120 72 l10 4" stroke="#f2c73a"/><path d="M136 116 l10 -6" stroke="#4aae4a"/><path d="M76 136 l10 6" stroke="#3a78d8"/><path d="M116 142 l8 -8" stroke="#fff"/></g>`,
  },
  {
    label: "Burger",
    draw: () =>
      `<path d="M48 92 q0 -40 52 -40 q52 0 52 40 z" fill="#e8a85c"/>` +
      `<g fill="#f6ead8"><circle cx="80" cy="66" r="2.5"/><circle cx="102" cy="60" r="2.5"/><circle cx="122" cy="70" r="2.5"/></g>` +
      `<path d="M46 92 h108 l-12 14 -18 -8 -18 10 -18 -10 -18 8 z" fill="#5aae3a"/>` +
      `<rect x="52" y="106" width="96" height="14" rx="7" fill="#8a4a2a"/>` +
      `<rect x="56" y="122" width="88" height="10" rx="5" fill="#f2c73a"/>` +
      `<path d="M50 134 h100 q0 24 -20 24 h-60 q-20 0 -20 -24z" fill="#e8a85c"/>`,
  },
  {
    label: "Ice cream",
    draw: () =>
      `<circle cx="82" cy="78" r="26" fill="#e87ba8"/><circle cx="118" cy="78" r="26" fill="#f2e6cf"/>` +
      `<circle cx="100" cy="64" r="24" fill="#8a5a3a"/>` +
      `<path d="M62 96 h76 L100 178 z" fill="#e8b06a"/>` +
      `<g stroke="#c98a4a" stroke-width="2.5"><path d="M74 108 l40 40 M92 100 l32 32 M110 100 l16 16 M70 122 l24 24"/></g>` +
      `<circle cx="100" cy="42" r="6" fill="#d94040"/>`,
  },
  {
    label: "Coffee cup",
    draw: (p) =>
      `<g stroke="#f2e6cf" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.9"><path d="M84 44 q6 -8 0 -16 M100 46 q6 -8 0 -16 M116 44 q6 -8 0 -16"/></g>` +
      `<path d="M62 58 h76 l-4 24 h-68 z" fill="#f2ede2"/>` +
      `<path d="M66 82 h68 l-10 78 q-2 12 -14 12 h-20 q-12 0 -14 -12 z" fill="#f2ede2"/>` +
      `<path d="M68 100 h64 l-3 22 h-58 z" fill="${p.pop}"/>` +
      `<rect x="58" y="52" width="84" height="10" rx="5" fill="#c9b8a0"/>`,
  },
  {
    label: "Bubble tea",
    draw: (p) =>
      `<path d="M108 24 l-30 44 M108 24 h10" stroke="#e87ba8" stroke-width="8" stroke-linecap="round"/>` +
      `<path d="M64 62 h72 l-8 100 q-2 14 -16 14 h-24 q-14 0 -16 -14 z" fill="#e8c9a0" opacity="0.92"/>` +
      `<path d="M66 88 h68" stroke="#c9a878" stroke-width="3"/>` +
      `<g fill="#3a2c24"><circle cx="82" cy="152" r="7"/><circle cx="100" cy="158" r="7"/><circle cx="118" cy="152" r="7"/><circle cx="90" cy="138" r="7"/><circle cx="110" cy="138" r="7"/></g>` +
      `<rect x="58" y="56" width="84" height="10" rx="5" fill="${p.pop}"/>`,
  },
  {
    label: "Headphones",
    draw: (p) =>
      `<path d="M52 128 v-20 q0 -48 48 -48 q48 0 48 48 v20" stroke="#3a4152" stroke-width="12" fill="none" stroke-linecap="round"/>` +
      `<rect x="40" y="118" width="26" height="44" rx="10" fill="#3a4152"/>` +
      `<rect x="134" y="118" width="26" height="44" rx="10" fill="#3a4152"/>` +
      `<rect x="46" y="126" width="8" height="28" rx="4" fill="${p.pop}"/>` +
      `<rect x="146" y="126" width="8" height="28" rx="4" fill="${p.pop}"/>`,
  },
  {
    label: "Cassette tape",
    draw: (p) =>
      `<rect x="36" y="62" width="128" height="80" rx="8" fill="#3a4152"/>` +
      `<rect x="46" y="72" width="108" height="34" rx="6" fill="${p.pop}"/>` +
      `<circle cx="74" cy="89" r="9" fill="#f2f2ee"/><circle cx="126" cy="89" r="9" fill="#f2f2ee"/>` +
      `<g fill="#3a4152"><path d="M74 84 l4 8 h-8z"/><path d="M126 84 l4 8 h-8z"/></g>` +
      `<path d="M60 142 l8 -22 h64 l8 22z" fill="#2b3240"/>` +
      `<circle cx="60" cy="128" r="3" fill="#f2f2ee"/><circle cx="140" cy="128" r="3" fill="#f2f2ee"/>`,
  },
  {
    label: "Vinyl record",
    draw: (p) =>
      `<circle cx="100" cy="100" r="62" fill="#20242e"/>` +
      `<g stroke="#3d4454" stroke-width="2" fill="none"><circle cx="100" cy="100" r="52"/><circle cx="100" cy="100" r="44"/><circle cx="100" cy="100" r="36"/></g>` +
      `<circle cx="100" cy="100" r="22" fill="${p.pop}"/>` +
      `<circle cx="100" cy="100" r="4" fill="#20242e"/>` +
      `<path d="M52 62 q14 -14 28 -18" stroke="#5a6274" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  },
  {
    label: "Camera",
    draw: (p) =>
      `<rect x="40" y="70" width="120" height="80" rx="12" fill="#3a4152"/>` +
      `<path d="M76 70 l8 -14 h32 l8 14z" fill="#3a4152"/>` +
      `<circle cx="100" cy="110" r="28" fill="#2b3240"/><circle cx="100" cy="110" r="20" fill="#5a9ad8"/>` +
      `<circle cx="94" cy="104" r="6" fill="#cfe6f8"/>` +
      `<rect x="132" y="80" width="16" height="10" rx="4" fill="${p.pop}"/>` +
      `<circle cx="56" cy="86" r="5" fill="#e84040"/>`,
  },
  {
    label: "Arcade joystick",
    draw: () =>
      `<circle cx="100" cy="64" r="22" fill="#e84040"/><circle cx="93" cy="57" r="7" fill="#f28a7a"/>` +
      `<rect x="92" y="84" width="16" height="40" fill="#3a4152"/>` +
      `<path d="M48 124 h104 q12 0 12 14 v14 q0 12 -12 12 h-104 q-12 0 -12 -12 v-14 q0 -14 12 -14z" fill="#4a5266"/>` +
      `<circle cx="64" cy="144" r="9" fill="#f2c73a"/><circle cx="88" cy="144" r="9" fill="#4aae4a"/>` +
      `<circle cx="136" cy="144" r="9" fill="#3a78d8"/>`,
  },
  {
    label: "Skateboard",
    draw: (p) =>
      `<path d="M38 96 q6 -18 22 -12 l84 30 q16 6 10 24 q-8 14 -22 8 l-84 -30 q-14 -6 -10 -20z" fill="${p.pop}" transform="rotate(-8 100 116)"/>` +
      `<path d="M44 100 q4 -10 14 -7 l84 30 q10 4 7 14" stroke="#00000030" stroke-width="4" fill="none" transform="rotate(-8 100 116)"/>` +
      `<g fill="#3a4152" transform="rotate(-8 100 116)"><circle cx="72" cy="138" r="11"/><circle cx="128" cy="156" r="11"/></g>` +
      `<g fill="#c9ccd6" transform="rotate(-8 100 116)"><circle cx="72" cy="138" r="4"/><circle cx="128" cy="156" r="4"/></g>`,
  },
  {
    label: "Crown",
    draw: () =>
      `<path d="M46 142 l-8 -70 30 26 32 -48 32 48 30 -26 -8 70z" fill="#f2c73a" stroke="#d9a520" stroke-width="4" stroke-linejoin="round"/>` +
      `<rect x="44" y="144" width="112" height="16" rx="5" fill="#d9a520"/>` +
      `<circle cx="100" cy="118" r="8" fill="#e84040"/><circle cx="68" cy="124" r="6" fill="#3a78d8"/><circle cx="132" cy="124" r="6" fill="#4aae4a"/>`,
  },
  {
    label: "Crossed swords",
    draw: (p) =>
      `<g transform="rotate(45 100 100)"><rect x="94" y="30" width="12" height="94" rx="4" fill="#c9ccd6"/><path d="M94 30 h12 l-6 -12z" fill="#c9ccd6"/><rect x="80" y="124" width="40" height="10" rx="5" fill="#8a6a1f"/><rect x="94" y="134" width="12" height="24" rx="5" fill="#6e5340"/></g>` +
      `<g transform="rotate(-45 100 100)"><rect x="94" y="30" width="12" height="94" rx="4" fill="#e6e9f2"/><path d="M94 30 h12 l-6 -12z" fill="#e6e9f2"/><rect x="80" y="124" width="40" height="10" rx="5" fill="#8a6a1f"/><rect x="94" y="134" width="12" height="24" rx="5" fill="#6e5340"/></g>` +
      `<circle cx="100" cy="100" r="9" fill="${p.pop}"/>`,
  },
  {
    label: "Shield",
    draw: (p) =>
      `<path d="M100 30 q34 14 58 14 q0 76 -58 126 q-58 -50 -58 -126 q24 0 58 -14z" fill="#4a5266" stroke="#2b3240" stroke-width="5"/>` +
      `<path d="M100 44 q26 10 44 11 q-2 60 -44 100 z" fill="#5a6478"/>` +
      `<path d="M70 96 l30 30 30 -44" stroke="${p.pop}" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
  {
    label: "Anchor",
    draw: (p) =>
      `<circle cx="100" cy="48" r="14" fill="none" stroke="#e6e9f2" stroke-width="9"/>` +
      `<path d="M100 62 v76" stroke="#e6e9f2" stroke-width="10" stroke-linecap="round"/>` +
      `<path d="M74 84 h52" stroke="#e6e9f2" stroke-width="9" stroke-linecap="round"/>` +
      `<path d="M100 158 q-42 -6 -48 -44 l-12 10 q2 -30 26 -22 l-6 10 q8 24 40 30 q32 -6 40 -30 l-6 -10 q24 -8 26 22 l-12 -10 q-6 38 -48 44z" fill="#e6e9f2"/>` +
      `<circle cx="100" cy="140" r="5" fill="${p.pop}"/>`,
  },
  {
    label: "Hourglass",
    draw: (p) =>
      `<rect x="56" y="34" width="88" height="14" rx="6" fill="#8a6a4f"/>` +
      `<rect x="56" y="152" width="88" height="14" rx="6" fill="#8a6a4f"/>` +
      `<path d="M68 48 h64 q0 34 -26 52 q26 18 26 52 h-64 q0 -34 26 -52 q-26 -18 -26 -52z" fill="#cfe0ea" opacity="0.55"/>` +
      `<path d="M78 56 h44 q-4 22 -22 34 q-18 -12 -22 -34z" fill="${p.pop}"/>` +
      `<path d="M100 106 v34 M84 146 h32 q-4 -14 -16 -18 q-12 4 -16 18z" stroke="${p.pop}" stroke-width="5" fill="${p.pop}" stroke-linecap="round"/>`,
  },
  {
    label: "Robot",
    draw: (p) =>
      `<path d="M100 30 v14" stroke="#8a93a8" stroke-width="6" stroke-linecap="round"/><circle cx="100" cy="26" r="7" fill="${p.pop}"/>` +
      `<rect x="48" y="44" width="104" height="84" rx="16" fill="#8a93a8"/>` +
      `<rect x="60" y="58" width="80" height="42" rx="10" fill="#2b3240"/>` +
      `<circle cx="82" cy="79" r="9" fill="#5ae0e8"/><circle cx="118" cy="79" r="9" fill="#5ae0e8"/>` +
      `<path d="M78 112 h44" stroke="#2b3240" stroke-width="7" stroke-linecap="round"/>` +
      `<rect x="34" y="70" width="10" height="32" rx="5" fill="#8a93a8"/><rect x="156" y="70" width="10" height="32" rx="5" fill="#8a93a8"/>` +
      `<rect x="66" y="132" width="68" height="34" rx="10" fill="#6c7488"/>` +
      `<rect x="78" y="140" width="44" height="8" rx="4" fill="${p.pop}"/>`,
  },
  {
    label: "Alien",
    draw: () =>
      `<path d="M100 34 q44 0 44 52 q0 34 -22 58 q-11 12 -22 12 q-11 0 -22 -12 q-22 -24 -22 -58 q0 -52 44 -52z" fill="#7ac95c"/>` +
      `<ellipse cx="80" cy="98" rx="14" ry="20" fill="#20242e" transform="rotate(24 80 98)"/>` +
      `<ellipse cx="120" cy="98" rx="14" ry="20" fill="#20242e" transform="rotate(-24 120 98)"/>` +
      `<ellipse cx="76" cy="92" rx="4" ry="6" fill="#9ae87c" transform="rotate(24 76 92)"/>` +
      `<ellipse cx="116" cy="92" rx="4" ry="6" fill="#9ae87c" transform="rotate(-24 116 92)"/>` +
      `<path d="M92 134 q8 6 16 0" stroke="#2f5c26" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  },
  {
    label: "Ghost",
    draw: () =>
      `<path d="M100 34 q46 0 46 54 v74 l-15 -12 -15 12 -16 -12 -16 12 -15 -12 -15 12 v-74 q0 -54 46 -54z" fill="#f2f4f8"/>` +
      `<circle cx="84" cy="92" r="8" fill="#20242e"/><circle cx="116" cy="92" r="8" fill="#20242e"/>` +
      `<circle cx="86" cy="89" r="2.5" fill="#fff"/><circle cx="118" cy="89" r="2.5" fill="#fff"/>` +
      `<ellipse cx="100" cy="116" rx="8" ry="10" fill="#20242e"/>`,
  },
  {
    label: "Cool smiley",
    draw: () =>
      `<circle cx="100" cy="100" r="58" fill="#f2c73a"/>` +
      `<path d="M52 84 h96 v6 q0 18 -20 18 h-12 q-16 0 -18 -14 q-2 14 -18 14 h-12 q-16 0 -16 -18z" fill="#20242e"/>` +
      `<path d="M52 84 q48 -10 96 0" stroke="#20242e" stroke-width="6" fill="none"/>` +
      `<path d="M74 130 q26 18 52 0" stroke="#20242e" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  },
  {
    label: "Mischief grin",
    draw: () =>
      `<path d="M100 40 q52 0 54 52 q2 50 -30 62 q-24 10 -48 0 q-32 -12 -30 -62 q2 -52 54 -52z" fill="#e8e4da"/>` +
      `<path d="M62 92 q14 -12 28 -2 M110 90 q14 -10 28 2" stroke="#20242e" stroke-width="5" fill="none" stroke-linecap="round"/>` +
      `<circle cx="78" cy="98" r="5" fill="#20242e"/><circle cx="122" cy="98" r="5" fill="#20242e"/>` +
      `<path d="M58 118 q42 34 84 0 q-8 26 -42 26 q-34 0 -42 -26z" fill="#fff" stroke="#20242e" stroke-width="4" stroke-linejoin="round"/>` +
      `<g stroke="#20242e" stroke-width="2.5"><path d="M72 126 l6 14 M86 132 l4 12 M100 134 v12 M114 132 l-4 12 M128 126 l-6 14"/></g>`,
  },
  {
    label: "Moai",
    draw: () =>
      `<path d="M70 168 q-10 -84 6 -114 q10 -20 24 -20 q14 0 24 20 q16 30 6 114z" fill="#8a93a0"/>` +
      `<path d="M76 78 q12 -10 22 0 M102 78 q12 -10 22 0" stroke="#5a6270" stroke-width="7" fill="none" stroke-linecap="round"/>` +
      `<path d="M86 84 h8 v6 h-8z M106 84 h8 v6 h-8z" fill="#4a515e"/>` +
      `<path d="M96 86 q4 34 -6 44 h20" stroke="#5a6270" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M84 148 h32" stroke="#5a6270" stroke-width="6" stroke-linecap="round"/>` +
      `<path d="M62 168 h76" stroke="#4a515e" stroke-width="10" stroke-linecap="round"/>`,
  },
  {
    label: "Eight ball",
    draw: () =>
      `<circle cx="100" cy="100" r="58" fill="#20242e"/>` +
      `<circle cx="82" cy="80" r="16" fill="#3d4454" opacity="0.8"/>` +
      `<circle cx="100" cy="100" r="24" fill="#f2f2ee"/>` +
      `<text x="100" y="112" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="bold" fill="#20242e">8</text>`,
  },
  {
    label: "Paper plane",
    draw: (p) =>
      `<path d="M32 96 L168 48 L120 164 L98 120 Z" fill="#f2f4f8"/>` +
      `<path d="M168 48 L98 120 L98 150 L114 126" fill="#c9d2e0"/>` +
      `<path d="M32 96 L98 120 L168 48 Z" fill="#e6e9f2"/>` +
      `<g stroke="${p.pop}" stroke-width="4" stroke-linecap="round"><path d="M44 132 q14 -2 24 6 M36 150 q20 -4 34 8"/></g>`,
  },
];

// Build one pfp for a given index: subject + palette + backdrop, all chosen
// deterministically so the same index always yields the same file. The four
// appearances of each subject land on different palettes AND backdrops (the
// stride constants are coprime with the pool sizes).
function buildSvg(index) {
  const m = MOTIFS[index % MOTIFS.length];
  const p = PALETTES[(index * 53 + 17) % PALETTES.length];
  const backdrop = BACKDROPS[(index * 31 + 7) % BACKDROPS.length];
  const uid = `p${index}`;
  const bg = backdrop(uid, p, rngFor(index * 2654435761 + 977));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="${m.label}">` +
    (bg.defs ? `<defs>${bg.defs}</defs>` : "") +
    bg.body +
    // A soft dark halo behind the subject so it pops on every backdrop.
    `<circle cx="100" cy="102" r="76" fill="#000" opacity="0.14"/>` +
    m.draw(p) +
    `</svg>\n`
  );
}

function run() {
  const check = process.argv.includes("--check");
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  let stale = 0;
  for (let i = 0; i < GENERATED_PFP_COUNT; i++) {
    const file = join(OUT_DIR, `${generatedPfpName(i)}.svg`);
    const svg = buildSvg(i);
    if (check) {
      const cur = existsSync(file) ? readFileSync(file, "utf8") : "";
      if (cur !== svg) {
        stale++;
        console.error(`stale/missing: ${generatedPfpName(i)}.svg`);
      }
    } else {
      writeFileSync(file, svg);
    }
  }
  if (check) {
    if (stale) {
      console.error(`${stale} generated pfp(s) out of date. Run: node scripts/gen-house-pfps.mjs`);
      process.exit(1);
    }
    console.log(`OK: ${GENERATED_PFP_COUNT} generated pfps are current.`);
  } else {
    console.log(`Wrote ${GENERATED_PFP_COUNT} generated pfps to public/house-pfp/`);
  }
}

run();
