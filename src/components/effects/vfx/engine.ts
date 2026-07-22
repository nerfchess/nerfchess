// Lightweight canvas VFX engine for board-overlay game animations.
// Pure DOM/canvas — no React. Owns a single canvas, runs a RAF loop only
// while entities are alive (zero cost at idle), and renders particles,
// projectiles, beams, shockwaves and staged tier-7+ cinematics from a
// declarative VfxPlay spec (see ./types).

import type { VfxImpact, VfxPlay } from "./types";

/* ------------------------------------------------------------------ */
/* small math helpers                                                  */

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInQuad = (t: number) => t * t;
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Deterministic PRNG so jagged lightning re-jitters on a fixed cadence. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* cached smoke sprites: one soft-radial puff per color, blitted instead of   */
/* rebuilding a radial gradient per particle per frame.                       */

const SMOKE_SPRITE_PX = 64;
const smokeSpriteCache = new Map<string, HTMLCanvasElement>();

function smokeSprite(color: string): HTMLCanvasElement {
  let sprite = smokeSpriteCache.get(color);
  if (sprite) return sprite;
  sprite = document.createElement("canvas");
  sprite.width = sprite.height = SMOKE_SPRITE_PX;
  const sc = sprite.getContext("2d");
  if (sc) {
    const r = SMOKE_SPRITE_PX / 2;
    const grad = sc.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    sc.fillStyle = grad;
    sc.beginPath();
    sc.arc(r, r, r, 0, Math.PI * 2);
    sc.fill();
  }
  // Bounded so an exotic palette can never grow this without limit.
  if (smokeSpriteCache.size > 48) smokeSpriteCache.clear();
  smokeSpriteCache.set(color, sprite);
  return sprite;
}

/* ------------------------------------------------------------------ */
/* entity types                                                        */

type ParticleShape = "spark" | "shard" | "ember" | "smoke" | "debris" | "sparkle";

interface Particle {
  x: number;
  y: number;
  vx: number; // px/s
  vy: number; // px/s
  g: number; // px/s^2 (negative = rises)
  drag: number; // exponential damping per second
  rot: number;
  spin: number; // rad/s
  size: number; // px
  grow: number; // px/s size growth (smoke)
  age: number; // ms
  life: number; // ms
  color: string;
  shape: ParticleShape;
  seed: number; // 0..1, drives flicker/twinkle phase
  alpha: number; // base opacity multiplier
  // optional homing (build-up swirl converging into the source)
  homeX?: number;
  homeY?: number;
  homing?: number; // px/s^2 acceleration toward home
}

/** Layer 0 = under everything (aftermath residue), 1 = mid (beams, waves,
 *  chains), 2 = top (flashes, rings, build-up glow). */
type FxLayer = 0 | 1 | 2;

interface Fx {
  start: number; // ms timestamp (performance.now domain)
  dur: number; // ms
  layer: FxLayer;
  draw: (ctx: CanvasRenderingContext2D, t: number, now: number) => void;
}

interface Projectile {
  kind: "bolt" | "arc";
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  start: number; // ms timestamp
  dur: number; // ms
  size: number; // px
  color: string;
  trailColor: string;
  arcH: number; // px arc height (arc only)
  trailAccum: number; // trail spawn accumulator
}

interface Timer {
  at: number; // ms timestamp
  fn: () => void;
}

/* ------------------------------------------------------------------ */
/* tuning                                                              */

const MAX_PARTICLES = 600;
const AFTERMATH_MS = 700;

/* ------------------------------------------------------------------ */
/* engine                                                              */

export interface VfxEngine {
  play(spec: VfxPlay): void;
  resize(): void;
  destroy(): void;
}

export function createVfxEngine(
  canvas: HTMLCanvasElement,
  opts: { onShake?: () => void } = {}
): VfxEngine {
  const ctx = canvas.getContext("2d");

  let w = 0; // CSS px
  let h = 0;
  let raf = 0;
  let last = 0;
  let destroyed = false;

  const particles: Particle[] = [];
  const projectiles: Projectile[] = [];
  const fx: Fx[] = [];
  const timers: Timer[] = [];

  /* ---------------- sizing ---------------- */

  function resize(): void {
    if (destroyed) return;
    const parent = canvas.parentElement;
    const rect = (parent ?? canvas).getBoundingClientRect();
    w = Math.max(0, rect.width);
    h = Math.max(0, rect.height);
    // DPR capped at 2: a DPR-3 phone would back the canvas at ~9x the CSS pixel
    // count, and every particle fill/gradient pays that per frame on the main
    // thread. 2 stays crisp on retina without the low-end tax.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------------- loop control ---------------- */

  function alive(): boolean {
    return (
      particles.length > 0 || projectiles.length > 0 || fx.length > 0 || timers.length > 0
    );
  }

  function wake(): void {
    if (destroyed || raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  function stop(): void {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (ctx && w > 0 && h > 0) ctx.clearRect(0, 0, w, h);
  }

  /* ---------------- particle plumbing ---------------- */

  function push(p: Particle): void {
    // Two ceilings: the engine-wide MAX_PARTICLES safety net, and the harder
    // per-play cap the effects dial sets (playCap, derived from intensity in
    // play()); Calm keeps far fewer particles alive than Max, no matter how
    // many overlapping plays try to spawn.
    const cap = Math.min(MAX_PARTICLES, playCap);
    if (particles.length >= cap) {
      particles.splice(0, particles.length - cap + 1); // drop oldest
    }
    particles.push(p);
  }

  function spawn(
    shape: ParticleShape,
    x: number,
    y: number,
    o: Partial<Particle> = {}
  ): void {
    const p: Particle = {
      x,
      y,
      vx: 0,
      vy: 0,
      g: 0,
      drag: 0,
      rot: rand(0, TAU),
      spin: 0,
      size: 2,
      grow: 0,
      age: 0,
      life: 500,
      color: "#ffffff",
      shape,
      seed: Math.random(),
      alpha: 1,
      ...o,
    };
    p.life *= playDur;
    push(p);
  }

  /* ---------------- palette helpers ---------------- */

  const pick = (palette: string[]) => palette[Math.floor(Math.random() * palette.length)];
  const primary = (palette: string[]) => palette[0];
  const accent = (palette: string[]) => palette[Math.min(1, palette.length - 1)];
  const residueColor = (palette: string[]) => palette[palette.length - 1];

  /* ---------------- impacts ---------------- */

  // The effects dial's per-play particle multiplier (VfxPlay.intensity). Set
  // by play(); spawns scheduled by that play read it via impactCount. A later
  // overlapping play with a different value can briefly re-scale a pending
  // spawn, which is harmless: the dial is a device-global setting.
  let playScale = 1;
  // The card-effect-duration setting (VfxPlay.durationScale): every particle
  // lifetime and fx duration created while a play unwinds is stretched by it.
  // Same overlapping-plays caveat as playScale — it is a device-global knob.
  let playDur = 1;
  // Hard particle ceiling for the current dial level (set in play() from the
  // play's intensity). Calm (0.6) runs a fraction of the budget so a low-end
  // device never pays for a full-strength particle field.
  let playCap = MAX_PARTICLES;

  // The dial's hard per-level particle budgets. Keyed off VfxPlay.intensity
  // (FX_LEVELS[level].vfx): Off never reaches the engine (and play() also
  // early-returns on 0), Calm 180, Normal 400, Epic 500, Max the full 600.
  function capForIntensity(intensity: number): number {
    if (intensity <= 0.6) return 180;
    if (intensity <= 1) return 400;
    if (intensity <= 1.25) return 500;
    return MAX_PARTICLES;
  }

  function impactCount(tier: number): number {
    // tier 4 ≈ 12 particles, tier 10 ≈ 60 at Normal; the dial scales it.
    return Math.round(clamp((12 + (tier - 4) * 8) * playScale, 6, 90));
  }

  function addFlash(x: number, y: number, color: string, radius: number, dur = 150): void {
    fx.push({
      start: performance.now(),
      dur: dur * playDur,
      layer: 2,
      draw: (c, t) => {
        const r = radius * (0.35 + 0.65 * easeOutCubic(t));
        const a = (1 - t) * 0.85;
        c.globalCompositeOperation = "lighter";
        const grad = c.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, color);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        c.globalAlpha = a;
        c.fillStyle = grad;
        c.beginPath();
        c.arc(x, y, r, 0, TAU);
        c.fill();
        c.globalCompositeOperation = "source-over";
      },
    });
  }

  function addRing(x: number, y: number, color: string, radius: number, dur = 420): void {
    fx.push({
      start: performance.now(),
      dur: dur * playDur,
      layer: 2,
      draw: (c, t) => {
        const e = easeOutCubic(t);
        const r = radius * e;
        c.globalAlpha = (1 - t) * 0.8;
        c.strokeStyle = color;
        c.lineWidth = Math.max(1, radius * 0.14 * (1 - e * 0.8));
        c.beginPath();
        c.arc(x, y, Math.max(0.5, r), 0, TAU);
        c.stroke();
      },
    });
  }

  function spawnImpact(
    x: number,
    y: number,
    impact: VfxImpact,
    palette: string[],
    tier: number,
    sq: number
  ): void {
    const n = impactCount(tier);
    const lifeScale = tier >= 7 ? 1 : 0.78; // keep low tiers snappy (~1s total)
    addFlash(x, y, primary(palette), sq * (0.7 + tier * 0.06));

    switch (impact) {
      case "burst": {
        for (let i = 0; i < n; i++) {
          const a = rand(0, TAU);
          const sp = sq * rand(2.5, 8.5);
          const ember = Math.random() < 0.35;
          spawn(ember ? "ember" : "spark", x, y, {
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - sq * rand(0, 1.5),
            g: sq * (ember ? 6 : 14),
            drag: rand(1.6, 3.2),
            size: ember ? rand(1.4, 3.2) : rand(1, 2.4),
            life: rand(320, 640) * lifeScale,
            color: pick(palette),
          });
        }
        break;
      }
      case "shatter": {
        const shards = Math.round(n * 0.65);
        for (let i = 0; i < shards; i++) {
          const a = rand(0, TAU);
          const sp = sq * rand(2.5, 7);
          spawn("shard", x, y, {
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - sq * rand(1, 3),
            g: sq * 22,
            drag: rand(0.4, 1),
            spin: rand(-14, 14),
            size: rand(2.5, 6),
            life: rand(420, 700) * lifeScale,
            color: pick(palette),
          });
        }
        for (let i = shards; i < n; i++) {
          const a = rand(0, TAU);
          const sp = sq * rand(3, 8);
          spawn("spark", x, y, {
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            g: sq * 10,
            drag: 2.5,
            size: rand(1, 2),
            life: rand(240, 460) * lifeScale,
            color: primary(palette),
          });
        }
        break;
      }
      case "embers": {
        for (let i = 0; i < n; i++) {
          const a = rand(0, TAU);
          const sp = sq * rand(0.8, 3.2);
          spawn("ember", x, y, {
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - sq * rand(0.5, 2),
            g: -sq * rand(2, 5), // embers rise
            drag: rand(1, 2),
            size: rand(1.5, 3.5),
            life: rand(450, 800) * lifeScale,
            color: pick(palette),
          });
        }
        break;
      }
      case "smoke": {
        const puffs = Math.max(5, Math.round(n * 0.5));
        for (let i = 0; i < puffs; i++) {
          const a = rand(0, TAU);
          const sp = sq * rand(0.4, 1.6);
          spawn("smoke", x, y + rand(-2, 2), {
            vx: Math.cos(a) * sp,
            vy: -sq * rand(0.8, 2),
            drag: 1.4,
            size: sq * rand(0.12, 0.24),
            grow: sq * rand(0.6, 1.2),
            life: rand(520, 820) * lifeScale,
            color: pick(palette),
            alpha: rand(0.22, 0.4),
          });
        }
        for (let i = 0; i < Math.round(n * 0.3); i++) {
          const a = rand(0, TAU);
          spawn("spark", x, y, {
            vx: Math.cos(a) * sq * rand(1, 3),
            vy: Math.sin(a) * sq * rand(1, 3),
            g: sq * 6,
            drag: 3,
            size: 1.2,
            life: rand(200, 380) * lifeScale,
            color: primary(palette),
          });
        }
        break;
      }
      case "debris": {
        for (let i = 0; i < n; i++) {
          const chunky = Math.random() < 0.55;
          const a = rand(-Math.PI, 0) * 0.9 - 0.15; // mostly upward cone
          const sp = sq * rand(2, 7);
          spawn(chunky ? "debris" : "spark", x, y, {
            vx: Math.cos(a) * sp * rand(0.5, 1),
            vy: Math.sin(a) * sp,
            g: sq * (chunky ? 26 : 16),
            drag: chunky ? 0.5 : 2,
            spin: chunky ? rand(-16, 16) : 0,
            size: chunky ? rand(1.8, 4.5) : rand(1, 2),
            life: rand(420, 760) * lifeScale,
            color: pick(palette),
          });
        }
        break;
      }
      case "sparkle": {
        for (let i = 0; i < n; i++) {
          const a = rand(0, TAU);
          const sp = sq * rand(0.6, 3);
          spawn("sparkle", x, y, {
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - sq * 0.4,
            g: -sq * 0.8,
            drag: 1.6,
            spin: rand(-3, 3),
            size: rand(2, 5),
            life: rand(380, 680) * lifeScale,
            color: pick(palette),
          });
        }
        break;
      }
      case "shock": {
        addRing(x, y, primary(palette), sq * (1.6 + tier * 0.12));
        addRing(x, y, accent(palette), sq * (1.1 + tier * 0.08), 340);
        for (let i = 0; i < Math.round(n * 0.5); i++) {
          const a = rand(0, TAU);
          const sp = sq * rand(3, 9);
          spawn("spark", x, y, {
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp * 0.5, // flattened, ground-hugging
            g: sq * 8,
            drag: 3,
            size: rand(1, 2.2),
            life: rand(240, 460) * lifeScale,
            color: pick(palette),
          });
        }
        break;
      }
    }
  }

  /* ---------------- aftermath residue ---------------- */

  function spawnAftermath(
    x: number,
    y: number,
    kind: Exclude<VfxPlay["aftermath"], undefined>,
    palette: string[],
    sq: number
  ): void {
    if (kind === "none" || kind === undefined) return;
    const tint = residueColor(palette);
    const glow = primary(palette);
    const now = performance.now();
    const seed = Math.random() * 1e9;

    // slow-fading tinted glow patch on the square
    fx.push({
      start: now,
      dur: AFTERMATH_MS * playDur,
      layer: 0,
      draw: (c, t) => {
        const a = (1 - easeInQuad(t)) * 0.38;
        const r = sq * (kind === "frost" ? 0.85 : 0.7);
        if (kind === "scorch" || kind === "smolder") {
          // dark char under the glow
          c.globalAlpha = a * 0.8;
          c.fillStyle = "rgba(10,6,4,1)";
          c.beginPath();
          c.ellipse(x, y, r * 0.9, r * 0.6, 0, 0, TAU);
          c.fill();
        }
        const grad = c.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, tint);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        c.globalAlpha = a;
        c.fillStyle = grad;
        c.beginPath();
        c.arc(x, y, r, 0, TAU);
        c.fill();
        if (kind === "frost") {
          // crystalline speckle, deterministic per patch
          const rng = mulberry32(seed);
          c.globalAlpha = (1 - t) * 0.7;
          c.fillStyle = glow;
          for (let i = 0; i < 9; i++) {
            const px = x + (rng() - 0.5) * sq * 1.3;
            const py = y + (rng() - 0.5) * sq * 1.3;
            const s = 0.6 + rng() * 1.4;
            c.fillRect(px - s / 2, py - s / 2, s, s);
          }
        }
      },
    });

    // a few idle motes drifting off the residue
    const motes = kind === "smolder" ? 5 : 4;
    for (let i = 0; i < motes; i++) {
      timers.push({
        at: now + i * 90 * playDur,
        fn: () => {
          const px = x + rand(-0.35, 0.35) * sq;
          const py = y + rand(-0.2, 0.25) * sq;
          if (kind === "scorch" || kind === "smolder") {
            spawn("ember", px, py, {
              vx: rand(-0.3, 0.3) * sq,
              vy: -sq * rand(0.6, 1.4),
              g: -sq * 1.5,
              drag: 1.2,
              size: rand(1, 2.2),
              life: rand(320, 480),
              color: pick(palette),
              alpha: 0.85,
            });
            if (kind === "smolder" && Math.random() < 0.5) {
              spawn("smoke", px, py, {
                vy: -sq * rand(0.5, 1),
                size: sq * 0.1,
                grow: sq * 0.5,
                drag: 1,
                life: rand(380, 520),
                color: tint,
                alpha: 0.2,
              });
            }
          } else {
            // frost / sparkle: tiny twinkles hovering on the square
            spawn("sparkle", px, py, {
              vx: rand(-0.15, 0.15) * sq,
              vy: -sq * rand(0.1, 0.4),
              spin: rand(-2, 2),
              size: rand(1.6, 3.4),
              life: rand(300, 480),
              color: pick(palette),
            });
          }
        },
      });
    }
  }

  /* ---------------- build-up (tier 7+ cinematic opening) ---------------- */

  function spawnBuildup(
    x: number,
    y: number,
    palette: string[],
    sq: number,
    dur: number,
    tier: number
  ): void {
    const now = performance.now();

    // growing charge glow at the source
    fx.push({
      start: now,
      dur,
      layer: 2,
      draw: (c, t) => {
        const r = sq * lerp(0.15, 0.85, easeInQuad(t));
        const throb = 0.85 + 0.15 * Math.sin(t * 26);
        c.globalCompositeOperation = "lighter";
        const grad = c.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, primary(palette));
        grad.addColorStop(0.55, accent(palette));
        grad.addColorStop(1, "rgba(0,0,0,0)");
        c.globalAlpha = lerp(0.15, 0.8, t) * throb;
        c.fillStyle = grad;
        c.beginPath();
        c.arc(x, y, r, 0, TAU);
        c.fill();
        c.globalCompositeOperation = "source-over";
      },
    });

    // particles spiralling inward, converging as the glow peaks
    const count = Math.round(clamp(10 + tier * 2.2, 14, 34));
    for (let i = 0; i < count; i++) {
      const delay = rand(0, dur * 0.45);
      timers.push({
        at: now + delay,
        fn: () => {
          const ang = rand(0, TAU);
          const r = sq * rand(1.2, 2.4);
          const px = x + Math.cos(ang) * r;
          const py = y + Math.sin(ang) * r;
          const life = Math.max(140, dur - delay);
          // inward velocity sized to arrive roughly as the build-up ends,
          // plus a tangential component for the swirl
          const inward = (r / (life / 1000)) * 0.9;
          const tang = inward * rand(0.35, 0.7) * (Math.random() < 0.5 ? 1 : -1);
          spawn(Math.random() < 0.4 ? "ember" : "spark", px, py, {
            vx: -Math.cos(ang) * inward - Math.sin(ang) * tang,
            vy: -Math.sin(ang) * inward + Math.cos(ang) * tang,
            homeX: x,
            homeY: y,
            homing: inward * 4,
            drag: 0.3,
            size: rand(1, 2.6),
            life,
            color: pick(palette),
          });
        },
      });
    }
  }

  /* ---------------- travel renderers ---------------- */

  function addBeam(
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    palette: string[],
    sq: number,
    dur: number
  ): void {
    fx.push({
      start: performance.now(),
      dur: dur * playDur,
      layer: 1,
      draw: (c, t) => {
        // fast attack, eased decay
        const intensity = t < 0.12 ? t / 0.12 : 1 - easeInQuad((t - 0.12) / 0.88);
        if (intensity <= 0) return;
        const jitter = 1 + 0.12 * Math.sin(t * 90);
        c.globalCompositeOperation = "lighter";
        c.lineCap = "round";
        // wide edge glow
        c.globalAlpha = 0.32 * intensity;
        c.strokeStyle = accent(palette);
        c.lineWidth = sq * 0.42 * intensity * jitter;
        c.beginPath();
        c.moveTo(sx, sy);
        c.lineTo(tx, ty);
        c.stroke();
        // colored body
        c.globalAlpha = 0.8 * intensity;
        c.strokeStyle = primary(palette);
        c.lineWidth = sq * 0.16 * intensity * jitter;
        c.beginPath();
        c.moveTo(sx, sy);
        c.lineTo(tx, ty);
        c.stroke();
        // hot white core
        c.globalAlpha = 0.9 * intensity;
        c.strokeStyle = "rgba(255,255,255,0.95)";
        c.lineWidth = Math.max(1, sq * 0.05 * intensity);
        c.beginPath();
        c.moveTo(sx, sy);
        c.lineTo(tx, ty);
        c.stroke();
        // muzzle + impact end glow
        for (const [ex, ey] of [[sx, sy], [tx, ty]] as const) {
          const grad = c.createRadialGradient(ex, ey, 0, ex, ey, sq * 0.4 * intensity);
          grad.addColorStop(0, primary(palette));
          grad.addColorStop(1, "rgba(0,0,0,0)");
          c.globalAlpha = 0.6 * intensity;
          c.fillStyle = grad;
          c.beginPath();
          c.arc(ex, ey, sq * 0.4 * intensity, 0, TAU);
          c.fill();
        }
        c.globalCompositeOperation = "source-over";
      },
    });
  }

  function addWave(
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    palette: string[],
    sq: number,
    dur: number
  ): void {
    const dist = Math.hypot(tx - sx, ty - sy) || 1;
    const ang = Math.atan2(ty - sy, tx - sx);
    const spread = 0.62; // radians each side of the heading
    fx.push({
      start: performance.now(),
      dur: dur * playDur,
      layer: 1,
      draw: (c, t) => {
        const r = dist * easeOutCubic(t) + sq * 0.2;
        const fade = 1 - easeInQuad(t);
        c.lineCap = "round";
        // trailing fainter fronts
        for (let i = 0; i < 3; i++) {
          const rr = r - i * sq * 0.28;
          if (rr <= 0) continue;
          c.globalAlpha = fade * (0.55 - i * 0.16);
          c.strokeStyle = i === 0 ? primary(palette) : accent(palette);
          c.lineWidth = Math.max(1.5, sq * (0.22 - i * 0.06));
          c.beginPath();
          c.arc(sx, sy, rr, ang - spread, ang + spread);
          c.stroke();
        }
      },
    });
    // dust kicked along the advancing front
    const nowMs = performance.now();
    for (let i = 1; i <= 4; i++) {
      timers.push({
        at: nowMs + (dur * playDur * i) / 5,
        fn: () => {
          const e = easeOutCubic(i / 5);
          const fr = dist * e;
          for (let k = 0; k < 3; k++) {
            const a2 = ang + rand(-spread, spread) * 0.85;
            spawn("spark", sx + Math.cos(a2) * fr, sy + Math.sin(a2) * fr, {
              vx: Math.cos(a2) * sq * rand(1.5, 3.5),
              vy: Math.sin(a2) * sq * rand(1.5, 3.5) - sq,
              g: sq * 10,
              drag: 2.4,
              size: rand(1, 2),
              life: rand(180, 340),
              color: pick(palette),
            });
          }
        },
      });
    }
  }

  function addChainSegment(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    palette: string[],
    sq: number,
    dur: number
  ): void {
    const dist = Math.hypot(bx - ax, by - ay) || 1;
    const segs = Math.round(clamp(dist / (sq * 0.5), 4, 14));
    const baseSeed = Math.floor(Math.random() * 1e9);
    fx.push({
      start: performance.now(),
      dur: dur * playDur,
      layer: 1,
      draw: (c, t, now) => {
        const fade = t < 0.15 ? t / 0.15 : 1 - easeInQuad((t - 0.15) / 0.85);
        if (fade <= 0) return;
        // re-jitter the polyline on a fixed cadence for that electric crackle
        const rng = mulberry32(baseSeed + Math.floor(now / 45));
        const nx = -(by - ay) / dist;
        const ny = (bx - ax) / dist;
        const pts: [number, number][] = [[ax, ay]];
        for (let i = 1; i < segs; i++) {
          const f = i / segs;
          const off = (rng() - 0.5) * 2 * sq * 0.38 * Math.sin(Math.PI * f);
          pts.push([lerp(ax, bx, f) + nx * off, lerp(ay, by, f) + ny * off]);
        }
        pts.push([bx, by]);
        const trace = (width: number, style: string, alpha: number) => {
          c.globalAlpha = alpha * fade;
          c.strokeStyle = style;
          c.lineWidth = width;
          c.beginPath();
          c.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
          c.stroke();
        };
        c.globalCompositeOperation = "lighter";
        c.lineCap = "round";
        c.lineJoin = "round";
        trace(sq * 0.24, accent(palette), 0.35); // glow
        trace(sq * 0.08, primary(palette), 0.85); // body
        trace(Math.max(1, sq * 0.028), "rgba(255,255,255,0.95)", 0.95); // core
        c.globalCompositeOperation = "source-over";
      },
    });
  }

  function launchBolt(
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    palette: string[],
    sq: number,
    at: number,
    dur: number
  ): void {
    projectiles.push({
      kind: "bolt",
      sx,
      sy,
      tx,
      ty,
      start: at,
      dur: dur * playDur,
      size: Math.max(2, sq * 0.09),
      color: primary(palette),
      trailColor: accent(palette),
      arcH: 0,
      trailAccum: 0,
    });
  }

  function launchArc(
    sx: number,
    sy: number,
    tx: number,
    ty: number,
    palette: string[],
    sq: number,
    at: number,
    dur: number
  ): void {
    const dist = Math.hypot(tx - sx, ty - sy);
    projectiles.push({
      kind: "arc",
      sx,
      sy,
      tx,
      ty,
      start: at,
      dur: dur * playDur,
      size: Math.max(2.5, sq * 0.11),
      color: primary(palette),
      trailColor: accent(palette),
      arcH: Math.max(sq * 1.1, dist * 0.28),
      trailAccum: 0,
    });
  }

  function spawnRain(
    tx: number,
    ty: number,
    palette: string[],
    sq: number,
    tier: number,
    fallMs: number
  ): void {
    const drops = Math.max(6, Math.round(impactCount(tier) * 0.6));
    const now = performance.now();
    for (let i = 0; i < drops; i++) {
      timers.push({
        at: now + rand(0, fallMs * playDur * 0.4),
        fn: () => {
          const px = tx + rand(-0.65, 0.65) * sq;
          const dy = sq * rand(1.6, 3);
          const life = rand(fallMs * 0.55, fallMs * 0.8);
          spawn("spark", px, ty - dy, {
            vx: rand(-0.1, 0.1) * sq,
            vy: (dy / (life / 1000)) * 0.7,
            g: sq * 18,
            size: rand(1.2, 2.4),
            life,
            color: pick(palette),
          });
        },
      });
    }
  }

  /* ---------------- play(): orchestrate a spec ---------------- */

  function play(spec: VfxPlay): void {
    if (destroyed || !ctx) return;
    if (w <= 0 || h <= 0) resize();
    if (w <= 0 || h <= 0) return; // not laid out yet; drop

    // Level 0 (Off): callers already gate plays on vfx > 0, but the engine
    // enforces it too so no code path can render at Off via the 0.3 clamp.
    if ((spec.intensity ?? 1) <= 0) return;

    const now = performance.now();
    playScale = clamp(spec.intensity ?? 1, 0.3, 2);
    playDur = clamp(spec.durationScale ?? 1, 0.5, 2);
    playCap = capForIntensity(playScale);
    const tier = clamp(spec.tier ?? 1, 1, 12);
    const palette =
      spec.palette && spec.palette.length > 0 ? spec.palette : ["#ffe9a3", "#ff9d2e"];
    const sq = clamp(spec.squareSize ?? 1 / 8, 0.02, 0.5) * w;
    // Calm (level 1) skips the expensive layers wholesale: no tier-7+ buildup
    // cinematic and no aftermath residue (both are gradient-per-frame work).
    // The impact itself still plays, so the rule stays legible.
    const calm = playScale <= 0.6;
    const cinematic = tier >= 7 && !calm;
    const src = spec.source ?? { x: 0.5, y: 0 };
    const sx = src.x * w;
    const sy = src.y * h;
    const travel = spec.travel ?? "none";
    const impact = spec.impact ?? "burst";
    const aftermath = spec.aftermath ?? "none";
    if (!spec.targets || spec.targets.length === 0) return;

    // keep the whole sequence inside ~2.1s (cinematic) / ~1s (standard) at
    // the default duration setting; the user's multiplier stretches all of it
    const maxDelay = (cinematic ? 480 : 300) * playDur;
    const targets = spec.targets.map((t, i) => ({
      x: t.p.x * w,
      y: t.p.y * h,
      delay: clamp((t.delayMs ?? (travel === "chain" ? i * 70 : 0)) * playDur, 0, maxDelay),
    }));

    let shakePending = !!spec.shake;
    const fireShake = () => {
      if (!shakePending) return;
      shakePending = false;
      try {
        opts.onShake?.();
      } catch {
        /* host callback must not break the loop */
      }
    };

    const buildupMs = (cinematic ? 380 : 0) * playDur;
    if (cinematic) spawnBuildup(sx, sy, palette, sq, buildupMs, tier);
    const t0 = now + buildupMs;

    const scheduleImpact = (x: number, y: number, at: number) => {
      timers.push({
        at,
        fn: () => {
          fireShake();
          spawnImpact(x, y, impact, palette, tier, sq);
          if (!calm) spawnAftermath(x, y, aftermath, palette, sq);
        },
      });
    };

    switch (travel) {
      case "none": {
        for (const t of targets) scheduleImpact(t.x, t.y, t0 + t.delay);
        break;
      }
      case "bolt": {
        for (const t of targets) {
          const dist = Math.hypot(t.x - sx, t.y - sy);
          const dur = clamp(120 + dist * 0.55, 140, cinematic ? 420 : 340);
          const at = t0 + t.delay;
          timers.push({ at, fn: () => launchBolt(sx, sy, t.x, t.y, palette, sq, at, dur) });
          scheduleImpact(t.x, t.y, at + dur * playDur);
        }
        break;
      }
      case "arc": {
        for (const t of targets) {
          const dist = Math.hypot(t.x - sx, t.y - sy);
          const dur = clamp(340 + dist * 0.4, 380, cinematic ? 560 : 460);
          const at = t0 + t.delay;
          timers.push({ at, fn: () => launchArc(sx, sy, t.x, t.y, palette, sq, at, dur) });
          scheduleImpact(t.x, t.y, at + dur * playDur);
        }
        break;
      }
      case "beam": {
        for (const t of targets) {
          const at = t0 + t.delay;
          timers.push({
            at,
            fn: () => addBeam(sx, sy, t.x, t.y, palette, sq, cinematic ? 420 : 340),
          });
          scheduleImpact(t.x, t.y, at + 70 * playDur);
        }
        break;
      }
      case "wave": {
        for (const t of targets) {
          const at = t0 + t.delay;
          const dur = cinematic ? 500 : 420;
          timers.push({ at, fn: () => addWave(sx, sy, t.x, t.y, palette, sq, dur) });
          // the eased front covers ~90% of the distance around t≈0.72
          scheduleImpact(t.x, t.y, at + dur * playDur * 0.72);
        }
        break;
      }
      case "rain": {
        const fallMs = cinematic ? 420 : 360;
        for (const t of targets) {
          const at = t0 + t.delay;
          timers.push({ at, fn: () => spawnRain(t.x, t.y, palette, sq, tier, fallMs) });
          scheduleImpact(t.x, t.y, at + fallMs * playDur);
        }
        break;
      }
      case "chain": {
        // jump target -> target in delay order, source first
        const ordered = targets
          .map((t, i) => ({ ...t, i }))
          .sort((a, b) => a.delay - b.delay || a.i - b.i);
        let px = sx;
        let py = sy;
        for (const t of ordered) {
          const at = t0 + t.delay;
          const ax = px;
          const ay = py;
          timers.push({
            at,
            fn: () => addChainSegment(ax, ay, t.x, t.y, palette, sq, cinematic ? 260 : 200),
          });
          scheduleImpact(t.x, t.y, at + 40 * playDur);
          px = t.x;
          py = t.y;
        }
        break;
      }
    }

    wake();
  }

  /* ---------------- per-frame update + render ---------------- */

  function drawParticle(c: CanvasRenderingContext2D, p: Particle): void {
    const t = p.age / p.life;
    const fade = 1 - easeInQuad(t);
    switch (p.shape) {
      case "spark": {
        // motion-streak: draw a short line back along the velocity
        const k = 0.035;
        c.globalAlpha = fade * p.alpha;
        c.strokeStyle = p.color;
        c.lineWidth = p.size;
        c.lineCap = "round";
        c.beginPath();
        c.moveTo(p.x, p.y);
        c.lineTo(p.x - p.vx * k, p.y - p.vy * k);
        c.stroke();
        break;
      }
      case "ember": {
        c.globalCompositeOperation = "lighter";
        const flicker = 0.7 + 0.3 * Math.sin(p.age * 0.028 + p.seed * TAU);
        const a = fade * p.alpha * flicker;
        c.fillStyle = p.color;
        c.globalAlpha = a * 0.25;
        c.beginPath();
        c.arc(p.x, p.y, p.size * 2.4, 0, TAU);
        c.fill();
        c.globalAlpha = a;
        c.beginPath();
        c.arc(p.x, p.y, p.size, 0, TAU);
        c.fill();
        c.globalCompositeOperation = "source-over";
        break;
      }
      case "shard": {
        c.globalAlpha = fade * p.alpha;
        c.fillStyle = p.color;
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.beginPath();
        c.moveTo(p.size, 0);
        c.lineTo(-p.size * 0.6, p.size * 0.5);
        c.lineTo(-p.size * 0.6, -p.size * 0.5);
        c.closePath();
        c.fill();
        c.restore();
        break;
      }
      case "smoke": {
        // Blit a cached soft-radial puff sprite (baked once per color) instead
        // of building a fresh createRadialGradient + arc fill for every smoke
        // particle every frame — dozens can be alive at once, so this was a
        // real per-frame main-thread cost. Visually identical: the sprite bakes
        // the same two-stop radial falloff.
        c.globalAlpha = fade * p.alpha;
        const sprite = smokeSprite(p.color);
        c.drawImage(sprite, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        break;
      }
      case "debris": {
        c.globalAlpha = fade * p.alpha;
        c.fillStyle = p.color;
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
        c.restore();
        break;
      }
      case "sparkle": {
        const twinkle = 0.55 + 0.45 * Math.sin(p.age * 0.024 + p.seed * TAU);
        c.globalAlpha = fade * p.alpha * twinkle;
        c.fillStyle = p.color;
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        const R = p.size;
        const r = p.size * 0.32;
        c.beginPath();
        for (let i = 0; i < 4; i++) {
          const a0 = (i / 4) * TAU;
          const a1 = a0 + TAU / 8;
          c.lineTo(Math.cos(a0) * R, Math.sin(a0) * R);
          c.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
        }
        c.closePath();
        c.fill();
        c.restore();
        break;
      }
    }
  }

  function drawProjectile(c: CanvasRenderingContext2D, pr: Projectile, now: number, dt: number): void {
    const t = clamp((now - pr.start) / pr.dur, 0, 1);
    let x: number;
    let y: number;
    let px: number;
    let py: number;
    if (pr.kind === "bolt") {
      // accelerating dart — never a linear crawl
      const e = easeInQuad(t);
      const e2 = easeInQuad(Math.max(0, t - 0.06));
      x = lerp(pr.sx, pr.tx, e);
      y = lerp(pr.sy, pr.ty, e);
      px = lerp(pr.sx, pr.tx, e2);
      py = lerp(pr.sy, pr.ty, e2);
    } else {
      const e = easeInOutCubic(t);
      const e2 = easeInOutCubic(Math.max(0, t - 0.05));
      x = lerp(pr.sx, pr.tx, e);
      y = lerp(pr.sy, pr.ty, e) - Math.sin(Math.PI * e) * pr.arcH;
      px = lerp(pr.sx, pr.tx, e2);
      py = lerp(pr.sy, pr.ty, e2) - Math.sin(Math.PI * e2) * pr.arcH;
    }

    // trail sparks, budgeted per-second so frame rate doesn't change density
    pr.trailAccum += dt * (pr.kind === "bolt" ? 90 : 60);
    while (pr.trailAccum >= 1) {
      pr.trailAccum -= 1;
      spawn(pr.kind === "bolt" ? "spark" : "ember", x + rand(-1.5, 1.5), y + rand(-1.5, 1.5), {
        vx: rand(-0.4, 0.4) * pr.size * 8,
        vy: rand(-0.4, 0.4) * pr.size * 8,
        g: pr.kind === "arc" ? pr.size * 30 : 0,
        drag: 3,
        size: rand(0.8, 1.8),
        life: rand(140, 300),
        color: Math.random() < 0.5 ? pr.color : pr.trailColor,
        alpha: 0.9,
      });
    }

    // glowing head with a short motion streak
    c.globalCompositeOperation = "lighter";
    c.globalAlpha = 0.5;
    c.strokeStyle = pr.trailColor;
    c.lineWidth = pr.size * 1.8;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(px, py);
    c.lineTo(x, y);
    c.stroke();
    c.globalAlpha = 0.95;
    c.strokeStyle = pr.color;
    c.lineWidth = pr.size;
    c.beginPath();
    c.moveTo(px, py);
    c.lineTo(x, y);
    c.stroke();
    c.globalAlpha = 1;
    c.fillStyle = "rgba(255,255,255,0.95)";
    c.beginPath();
    c.arc(x, y, pr.size * 0.55, 0, TAU);
    c.fill();
    c.globalCompositeOperation = "source-over";
  }

  function tick(): void {
    raf = 0;
    if (destroyed || !ctx) return;
    const now = performance.now();
    const dtMs = Math.min(34, now - last);
    const dt = dtMs / 1000;
    last = now;

    // fire due timers
    for (let i = timers.length - 1; i >= 0; i--) {
      if (timers[i].at <= now) {
        const [t] = timers.splice(i, 1);
        try {
          t.fn();
        } catch {
          /* keep the loop alive */
        }
      }
    }

    ctx.clearRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // fx layers 0 (under) and 1 (mid)
    for (let i = fx.length - 1; i >= 0; i--) {
      if (now - fx[i].start >= fx[i].dur) fx.splice(i, 1);
    }
    for (const layer of [0, 1] as const) {
      for (const f of fx) {
        if (f.layer !== layer) continue;
        const t = clamp((now - f.start) / f.dur, 0, 1);
        f.draw(ctx, t, now);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
    }

    // projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const pr = projectiles[i];
      if (now >= pr.start + pr.dur) {
        projectiles.splice(i, 1);
        continue;
      }
      if (now >= pr.start) drawProjectile(ctx, pr, now, dt);
    }
    ctx.globalAlpha = 1;

    // particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dtMs;
      if (p.age >= p.life) {
        particles.splice(i, 1);
        continue;
      }
      if (p.homing && p.homeX !== undefined && p.homeY !== undefined) {
        const dx = p.homeX - p.x;
        const dy = p.homeY - p.y;
        const d = Math.hypot(dx, dy) || 1;
        p.vx += (dx / d) * p.homing * dt;
        p.vy += (dy / d) * p.homing * dt;
      }
      const damp = p.drag > 0 ? Math.exp(-p.drag * dt) : 1;
      p.vx *= damp;
      p.vy = p.vy * damp + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      if (p.grow) p.size += p.grow * dt;
      drawParticle(ctx, p);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // fx layer 2 (flashes, rings, build-up glow) on top
    for (const f of fx) {
      if (f.layer !== 2) continue;
      const t = clamp((now - f.start) / f.dur, 0, 1);
      f.draw(ctx, t, now);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }

    if (alive()) {
      raf = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
  }

  /* ---------------- lifecycle ---------------- */

  function destroy(): void {
    destroyed = true;
    stop();
    particles.length = 0;
    projectiles.length = 0;
    fx.length = 0;
    timers.length = 0;
  }

  resize();

  return { play, resize, destroy };
}
