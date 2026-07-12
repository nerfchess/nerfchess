// Console smoke-test helpers for the VFX engine. Fire representative
// plays through the bus so the integrator can eyeball each system with a
// mounted <VfxLayer /> and no game plumbing. Dev-only window hook:
//   window.__nerfVfx("fire" | "ice" | "lightning" | "cinematic" | ...)

import { vfxPlay } from "./vfxBus";
import type { VfxPlay } from "./types";

const DEMOS: Record<string, () => VfxPlay> = {
  // sustained fire beam scorching a forward square
  fire: () => ({
    tier: 6,
    palette: ["#ffc16b", "#ff5e2e", "#8a2500"],
    source: { x: 0.19, y: 0.94 },
    targets: [{ p: { x: 0.56, y: 0.31 } }],
    travel: "beam",
    impact: "embers",
    aftermath: "scorch",
  }),

  // lobbed ice shard that shatters and leaves frost
  ice: () => ({
    tier: 5,
    palette: ["#eaf9ff", "#8fd8f8", "#4aa3d8"],
    source: { x: 0.81, y: 0.94 },
    targets: [
      { p: { x: 0.31, y: 0.31 } },
      { p: { x: 0.44, y: 0.19 }, delayMs: 140 },
    ],
    travel: "arc",
    impact: "shatter",
    aftermath: "frost",
  }),

  // chain lightning jumping across three squares with a board thump
  lightning: () => ({
    tier: 8,
    palette: ["#f6f2ff", "#b18cff", "#6d4cff"],
    source: { x: 0.5, y: 0 },
    targets: [
      { p: { x: 0.31, y: 0.44 }, delayMs: 0 },
      { p: { x: 0.56, y: 0.56 }, delayMs: 130 },
      { p: { x: 0.69, y: 0.31 }, delayMs: 260 },
    ],
    travel: "chain",
    impact: "shock",
    aftermath: "sparkle",
    shake: true,
  }),

  // full tier-9 cinematic: build-up, meteor lob, debris, smolder, shake
  cinematic: () => ({
    tier: 9,
    palette: ["#ffe9a3", "#ff9d2e", "#ff4d00", "#3a1200"],
    source: { x: 0.5, y: 0.02 },
    targets: [
      { p: { x: 0.44, y: 0.56 }, delayMs: 0 },
      { p: { x: 0.56, y: 0.44 }, delayMs: 120 },
      { p: { x: 0.31, y: 0.69 }, delayMs: 240 },
    ],
    travel: "arc",
    impact: "debris",
    aftermath: "smolder",
    shake: true,
  }),

  // ground shockwave rolling from the king toward the enemy line
  wave: () => ({
    tier: 7,
    palette: ["#d8f2c5", "#7ac74f", "#2e5d1e"],
    source: { x: 0.56, y: 0.94 },
    targets: [{ p: { x: 0.56, y: 0.19 } }],
    travel: "wave",
    impact: "shock",
    aftermath: "none",
    shake: true,
  }),

  // arrows raining onto a square
  rain: () => ({
    tier: 6,
    palette: ["#fff3c4", "#f5b942", "#96700f"],
    targets: [
      { p: { x: 0.44, y: 0.31 } },
      { p: { x: 0.56, y: 0.31 }, delayMs: 110 },
    ],
    travel: "rain",
    impact: "burst",
    aftermath: "none",
  }),

  // low-tier bless: impacts only, no travel
  sparkle: () => ({
    tier: 4,
    palette: ["#fdf6ff", "#e3b8ff", "#9a5cf5"],
    targets: [
      { p: { x: 0.31, y: 0.81 } },
      { p: { x: 0.44, y: 0.81 }, delayMs: 90 },
    ],
    travel: "none",
    impact: "sparkle",
    aftermath: "sparkle",
  }),
};

export function demoVfx(kind: string): void {
  const make = DEMOS[kind];
  if (!make) {
     
    console.warn(`[vfx] unknown demo "${kind}". Available: ${Object.keys(DEMOS).join(", ")}`);
    return;
  }
  vfxPlay(make());
}

// Dev-only console hook: window.__nerfVfx("lightning")
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __nerfVfx?: typeof demoVfx }).__nerfVfx = demoVfx;
}
