// Deterministic scenic-SVG generator for house-bot profile pictures.
//
// The house roster is ~210 personas but only ~60 hand-authored scenic SVGs
// existed, so pfps were heavily shared. This script emits a large pool of
// distinct, attractive scenic SVGs (palette x scene x celestial x accents) in
// the same soft dawn/dusk art style as the hand-authored set, so every persona
// can hold a UNIQUE pfp. Output is fully deterministic per index — re-running
// produces byte-identical files — so the roster's look is stable across deploys.
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
export const GENERATED_PFP_COUNT = 200;
export const generatedPfpName = (i) => `gen_${String(i).padStart(3, "0")}`;

// A tiny deterministic PRNG (mulberry32) so each index yields a stable scene.
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

// Soft, muted dawn/dusk palettes (sky top->mid->bottom, water, two ridge tones,
// a warm accent) matched to the existing hand-authored pfp look.
const PALETTES = [
  { sky: ["#f7c9a0", "#e79a7e", "#8a6b8f"], water: ["#9a8ba6", "#3d4a63"], ridge: ["#6a5c7d", "#4d4460"], accent: "#fff2d4" },
  { sky: ["#fbe0b0", "#f2a878", "#7c5f86"], water: ["#b79a86", "#5a4436"], ridge: ["#7a5c50", "#513a34"], accent: "#ffe9c2" },
  { sky: ["#cfe3f0", "#93b7d6", "#4a5f86"], water: ["#7f9bc0", "#324259"], ridge: ["#4f6285", "#33415c"], accent: "#eaf4ff" },
  { sky: ["#f6d9e4", "#d99bbb", "#6d5087"], water: ["#a98bb0", "#4a3a5f"], ridge: ["#6f5686", "#4a3960"], accent: "#ffe6f2" },
  { sky: ["#d7efd8", "#8fd0ae", "#3f6d6a"], water: ["#6fae9a", "#274a4a"], ridge: ["#3f6d63", "#274941"], accent: "#e8fff2" },
  { sky: ["#fbe6c0", "#f0b46a", "#a6603f"], water: ["#c98f5f", "#6e3a26"], ridge: ["#8a4f30", "#5c3320"], accent: "#fff0d4" },
  { sky: ["#c9c6ee", "#9b8fd6", "#453a6e"], water: ["#7f74b0", "#2f2851"], ridge: ["#4a3f7d", "#2e2856"], accent: "#efeaff" },
  { sky: ["#fcd0b0", "#e78f8f", "#6e3f6e"], water: ["#b07f9a", "#4a2f4a"], ridge: ["#7d4f6e", "#4a2f45"], accent: "#ffe0e0" },
  { sky: ["#bfe6ea", "#79b9c4", "#356070"], water: ["#5f9aa6", "#204450"], ridge: ["#3f7080", "#204450"], accent: "#e6fbff" },
  { sky: ["#f4e2b8", "#cdd08a", "#5c6f3a"], water: ["#9aae6f", "#3d4a24"], ridge: ["#5c6f3a", "#3a4a24"], accent: "#f6ffd8" },
  { sky: ["#f0cfa0", "#c88f6e", "#4e3f6e"], water: ["#8f7fa0", "#3b4a5c"], ridge: ["#5b4f6e", "#3b3450"], accent: "#ffeecb" },
  { sky: ["#e0d4f0", "#b79bd6", "#5a3f86"], water: ["#8f7fb0", "#3a2f5f"], ridge: ["#5f4f86", "#3a2f60"], accent: "#f2ecff" },
  { sky: ["#ffe1c4", "#f2a0a0", "#8a4f6e"], water: ["#c98f9a", "#5c3a4a"], ridge: ["#8a4f63", "#5c3345"], accent: "#ffe6dc" },
  { sky: ["#cfe8dd", "#8fbfb0", "#3f5f6a"], water: ["#6fa39a", "#274450"], ridge: ["#3f6763", "#274441"], accent: "#e8fbf4" },
];

const g = (id, stops, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">` +
  stops.map((s) => `<stop offset="${s[0]}" stop-color="${s[1]}"${s[2] != null ? ` stop-opacity="${s[2]}"` : ""}/>`).join("") +
  `</linearGradient>`;

const ridgePath = (rng, baseY, amp, floor) => {
  const pts = [];
  let x = 0;
  pts.push(`M0 ${baseY}`);
  while (x < 200) {
    x += 26 + Math.round(rng() * 30);
    const y = Math.round(baseY - amp / 2 + rng() * amp);
    pts.push(`L${Math.min(x, 200)} ${y}`);
  }
  pts.push(`L200 ${floor} L0 ${floor} Z`);
  return pts.join(" ");
};

// Build one scenic SVG for a given index. Six scene archetypes, each layered
// sky / celestial / ridges / water-or-ground / accents, colored by palette.
function buildSvg(index) {
  const rng = rngFor(index * 2654435761 + 12345);
  const p = PALETTES[Math.floor(rng() * PALETTES.length)];
  const scene = Math.floor(rng() * 6);
  const celestial = Math.floor(rng() * 3); // 0 sun, 1 moon, 2 none
  const cx = 30 + Math.round(rng() * 140);
  const cy = 34 + Math.round(rng() * 44);
  const cr = 14 + Math.round(rng() * 16);
  const stars = rng() < 0.5;
  const birds = rng() < 0.5;
  const uid = `p${index}`;

  const defs = [
    g(`${uid}sky`, [
      ["0", p.sky[0]],
      ["0.5", p.sky[1]],
      ["1", p.sky[2]],
    ]),
    g(`${uid}wat`, [
      ["0", p.water[0]],
      ["1", p.water[1]],
    ]),
    g(`${uid}rid`, [
      ["0", p.ridge[0]],
      ["1", p.ridge[1]],
    ]),
    `<radialGradient id="${uid}sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${p.accent}"/><stop offset="0.6" stop-color="${p.accent}" stop-opacity="0.85"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>`,
  ];

  const body = [`<rect width="200" height="200" fill="url(#${uid}sky)"/>`];

  if (stars) {
    let s = "";
    for (let i = 0; i < 18; i++) {
      s += `<circle cx="${Math.round(rng() * 200)}" cy="${Math.round(rng() * 90)}" r="${rng() < 0.3 ? 1.3 : 0.8}"/>`;
    }
    body.push(`<g fill="${p.accent}" opacity="0.7">${s}</g>`);
  }
  if (celestial === 0) {
    body.push(`<circle cx="${cx}" cy="${cy}" r="${cr + 12}" fill="url(#${uid}sun)"/>`);
    body.push(`<circle cx="${cx}" cy="${cy}" r="${cr}" fill="${p.accent}"/>`);
  } else if (celestial === 1) {
    body.push(`<circle cx="${cx}" cy="${cy}" r="${cr}" fill="${p.accent}" opacity="0.92"/>`);
    body.push(`<circle cx="${cx + cr * 0.4}" cy="${cy - cr * 0.2}" r="${cr}" fill="url(#${uid}sky)" opacity="0.9"/>`);
  }

  // Cloud bands (soft ellipses) on some scenes.
  if (rng() < 0.6) {
    let c = "";
    const n = 2 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      c += `<ellipse cx="${Math.round(rng() * 200)}" cy="${20 + Math.round(rng() * 50)}" rx="${16 + Math.round(rng() * 22)}" ry="${4 + Math.round(rng() * 4)}"/>`;
    }
    body.push(`<g fill="${p.sky[1]}" opacity="0.4">${c}</g>`);
  }

  if (scene === 0 || scene === 5) {
    // Layered ridges + reflective water (mountain lake / misty hills).
    body.push(`<path d="${ridgePath(rng, 96, 34, 128)}" fill="url(#${uid}rid)" opacity="0.7"/>`);
    body.push(`<path d="${ridgePath(rng, 116, 44, 132)}" fill="${p.ridge[1]}"/>`);
    body.push(`<rect x="0" y="130" width="200" height="70" fill="url(#${uid}wat)"/>`);
    body.push(
      `<g stroke="${p.accent}" stroke-width="1.3" opacity="0.5" stroke-linecap="round"><path d="M20 146 h30 M96 156 h40 M40 168 h24 M120 176 h40"/></g>`,
    );
  } else if (scene === 1) {
    // Rolling hills.
    body.push(`<path d="${ridgePath(rng, 120, 22, 200)}" fill="url(#${uid}rid)" opacity="0.65"/>`);
    body.push(`<path d="${ridgePath(rng, 142, 26, 200)}" fill="${p.ridge[0]}"/>`);
    body.push(`<path d="${ridgePath(rng, 164, 28, 200)}" fill="${p.ridge[1]}"/>`);
  } else if (scene === 2) {
    // Forest silhouette on a horizon glow.
    body.push(`<rect x="0" y="128" width="200" height="72" fill="${p.ridge[1]}"/>`);
    let trees = "";
    for (let x = 6; x < 200; x += 10 + Math.round(rng() * 8)) {
      const h = 20 + Math.round(rng() * 26);
      const ty = 132 - h;
      trees += `<path d="M${x} 134 L${x - 5} 134 L${x} ${ty} L${x + 5} 134 Z"/>`;
    }
    body.push(`<g fill="${p.ridge[0]}">${trees}</g>`);
  } else if (scene === 3) {
    // Desert dunes.
    body.push(`<path d="M0 128 Q60 108 120 128 T200 126 V200 H0 Z" fill="${p.ridge[0]}"/>`);
    body.push(`<path d="M0 150 Q70 132 140 152 T200 150 V200 H0 Z" fill="${p.ridge[1]}"/>`);
    body.push(`<path d="M0 172 Q90 158 160 176 T200 174 V200 H0 Z" fill="${p.water[1]}"/>`);
  } else {
    // Sea horizon with a wide sun glitter path.
    body.push(`<rect x="0" y="120" width="200" height="80" fill="url(#${uid}wat)"/>`);
    body.push(
      `<g stroke="${p.accent}" stroke-width="1.4" opacity="0.5" stroke-linecap="round"><path d="M30 134 h44 M100 142 h56 M50 156 h34 M120 168 h48 M70 180 h30"/></g>`,
    );
    if (celestial === 0) body.push(`<ellipse cx="${cx}" cy="128" rx="10" ry="3" fill="${p.accent}" opacity="0.7"/>`);
  }

  if (birds) {
    const bx = 30 + Math.round(rng() * 120);
    const by = 40 + Math.round(rng() * 40);
    body.push(
      `<g stroke="${p.ridge[1]}" stroke-width="1.4" fill="none" opacity="0.7" stroke-linecap="round"><path d="M${bx} ${by} q4 -4 8 0 q4 -4 8 0"/><path d="M${bx + 20} ${by + 8} q3 -3 6 0 q3 -3 6 0"/></g>`,
    );
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Scenic landscape">` +
    `<defs>${defs.join("")}</defs>` +
    body.join("") +
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
