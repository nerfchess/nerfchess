// The WebGL board layer's engine. The ONLY file that imports three.js; it is
// reached through a dynamic import from Board3DLayer after every gate passes,
// so no page pays for it until a board actually plays a 3D effect
// (scripts/check-board3d-gates.cjs enforces that).
//
// Coordinates: the same 0..1 board fractions the 2D engine uses. An
// orthographic camera maps x in [0,1] and y in [0,1] (y down, like the DOM)
// straight onto the canvas, so a square's footprint is pixel-exact against the
// DOM grid at any size. Height (z) is shown with an OBLIQUE projection: a shear
// that shifts a point by its z, so anything sitting on the board (z = 0) never
// moves and only what rises off it leans. That is what makes a pillar or a
// laser read as standing above the squares without a tilted camera.
//
// Materials are unlit (MeshBasicMaterial, normal blending) so nothing here
// needs lights or shadow passes. Every play is transform + opacity over time
// and the render loop sleeps when nothing is alive.
//
// Guard scripts that read CSS keyframes (check-anim-props, audit-scene-
// complexity, check-reduced-motion) do not see this file by design: it draws
// to a canvas, not the DOM.

import * as THREE from "three";
import type { Vfx3D, VfxPlay, VfxPoint } from "../vfx/types";

export interface Engine3D {
  play(spec: VfxPlay, depth: Vfx3D): void;
  resize(): void;
  isBusy(): boolean;
  destroy(): void;
  /** Dev only: the live groups' names and screen-space bounds, for tuning. */
  debug(): { name: string; box: number[] }[];
}

const SQ = 1 / 8;
// Oblique lean: how far (in board fractions) a point at z = 1 board-width is
// pushed up and to the right on screen.
const LEAN_X = 0.22;
const LEAN_Y = -0.55;

interface Live {
  group: THREE.Group;
  start: number;
  duration: number;
  update(t: number, dt: number): void; // t in 0..1
  dispose(): void;
}

function col(c: string): THREE.Color {
  try {
    return new THREE.Color(c);
  } catch {
    return new THREE.Color("#ffffff");
  }
}

// Normal blending on purpose: the canvas is composited over the board with
// its own alpha, and additive blending against a transparent clear colour
// leaves destination alpha at zero, which the page then shows as nothing.
function basic(color: THREE.Color, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;

export function createEngine3D(canvas: HTMLCanvasElement, opts: { onContextLost?: () => void } = {}): Engine3D {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  // The camera sits ON the board plane looking down -z, so world z = 0 maps
  // to clip z = 0 and the oblique shear below leaves board-level points
  // exactly where the DOM grid draws them.
  const camera = new THREE.OrthographicCamera(0, 1, 0, 1, -10, 10);
  camera.position.set(0, 0, 0);
  camera.lookAt(0, 0, -1);

  const live: Live[] = [];
  let raf = 0;
  let last = 0;
  let destroyed = false;
  let w = 1;
  let h = 1;

  function applyProjection() {
    camera.left = 0;
    camera.right = 1;
    camera.top = 0;
    camera.bottom = 1;
    camera.updateProjectionMatrix();
    // Oblique shear in clip space. The ortho maps world z to clip z as
    // -z * 2/(far-near) = -z/10, and one board width is 2 clip units, so a
    // point at world height z leans by LEAN * z board widths when the shear
    // coefficient is -20 * LEAN. Points on the board (z = 0) are untouched.
    const shear = new THREE.Matrix4().set(
      1, 0, -20 * LEAN_X, 0,
      0, 1, -20 * LEAN_Y, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    );
    camera.projectionMatrix.premultiply(shear);
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  function resize() {
    if (destroyed) return;
    const rect = (canvas.parentElement ?? canvas).getBoundingClientRect();
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    applyProjection();
    if (live.length === 0) renderer.render(scene, camera);
  }

  const onLost = (e: Event) => {
    e.preventDefault();
    opts.onContextLost?.();
  };
  canvas.addEventListener("webglcontextlost", onLost, false);

  function tick(now: number) {
    if (destroyed) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    for (let i = live.length - 1; i >= 0; i--) {
      const l = live[i];
      const t = Math.min(1, (now - l.start) / l.duration);
      l.update(t, dt);
      if (t >= 1) {
        scene.remove(l.group);
        l.dispose();
        live.splice(i, 1);
      }
    }
    renderer.render(scene, camera);
    if (live.length > 0) raf = requestAnimationFrame(tick);
    else {
      raf = 0;
      last = 0;
      renderer.clear();
    }
  }

  function wake() {
    if (!raf && !destroyed) raf = requestAnimationFrame(tick);
  }

  function add(l: Live) {
    scene.add(l.group);
    live.push(l);
    wake();
  }

  // ---- primitives ---------------------------------------------------------

  /** A beam along a line: a bright core box, a wide soft glow box, and a flat
   *  scorch glow lying on the board. Sweeps in from `from`, holds, fades. */
  function laser(from: VfxPoint, to: VfxPoint, palette: string[], duration: number, tier: number) {
    const group = new THREE.Group();
    group.name = "laser";
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    const c0 = col(palette[0] ?? "#ffffff");
    const c1 = col(palette[1] ?? palette[0] ?? "#ffffff");
    const thick = SQ * (tier >= 7 ? 0.42 : 0.3);
    // A low hover: enough to lean off the squares, never so high that a beam
    // along the edge rank leaves the crop.
    const lift = SQ * 0.18;

    const coreGeo = new THREE.BoxGeometry(1, thick * 0.28, thick * 0.28);
    const glowGeo = new THREE.BoxGeometry(1, thick, thick * 0.8);
    const floorGeo = new THREE.PlaneGeometry(1, thick * 2);
    // A near-white core inside a coloured glow, over a soft scorch on the
    // squares: the classic three-layer beam.
    const coreMat = basic(c1.clone().lerp(new THREE.Color("#ffffff"), 0.65), 1);
    const glowMat = basic(c0, 0.5);
    const floorMat = basic(c0, 0.3);
    const core = new THREE.Mesh(coreGeo, coreMat);
    const glow = new THREE.Mesh(glowGeo, glowMat);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    core.position.z = lift;
    glow.position.z = lift;
    floor.position.z = 0.001;
    // Beam meshes are unit-length along +x, scaled to the sweep length and
    // anchored at `from` so scaling reads as a sweep.
    for (const m of [core, glow, floor]) {
      m.geometry.translate(0.5, 0, 0);
      group.add(m);
    }
    group.position.set(from.x, from.y, 0);
    group.rotation.z = ang;

    // A few rising sparks along the line.
    const sparkCount = tier >= 7 ? 18 : 10;
    const sparkGeo = new THREE.BoxGeometry(SQ * 0.08, SQ * 0.08, SQ * 0.08);
    const sparkMat = basic(c0, 0.9);
    const sparks = new THREE.InstancedMesh(sparkGeo, sparkMat, sparkCount);
    const sparkSeed: { u: number; phase: number; speed: number }[] = [];
    for (let i = 0; i < sparkCount; i++) sparkSeed.push({ u: Math.random(), phase: Math.random(), speed: 0.6 + Math.random() * 0.8 });
    group.add(sparks);
    const m4 = new THREE.Matrix4();

    add({
      group,
      start: performance.now(),
      duration,
      update(t) {
        const sweep = Math.min(1, t / 0.35);
        const hold = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
        const s = easeOut(sweep) * len;
        core.scale.x = Math.max(0.0001, s);
        glow.scale.x = Math.max(0.0001, s);
        floor.scale.x = Math.max(0.0001, s);
        coreMat.opacity = 0.95 * hold;
        glowMat.opacity = 0.55 * hold * (0.85 + 0.15 * Math.sin(t * 60));
        floorMat.opacity = 0.35 * hold;
        for (let i = 0; i < sparkCount; i++) {
          const sp = sparkSeed[i];
          const rise = ((t * sp.speed + sp.phase) % 1);
          m4.makeTranslation(sp.u * s, (Math.sin(sp.phase * 20 + t * 9) * thick) / 2, lift + rise * SQ * 0.9);
          sparks.setMatrixAt(i, m4);
        }
        sparks.instanceMatrix.needsUpdate = true;
        sparkMat.opacity = 0.9 * hold;
      },
      dispose() {
        coreGeo.dispose();
        glowGeo.dispose();
        floorGeo.dispose();
        sparkGeo.dispose();
        coreMat.dispose();
        glowMat.dispose();
        floorMat.dispose();
        sparkMat.dispose();
      },
    });
  }

  /** A column rising from a square: a box that grows in z, glows, then sinks. */
  function pillar(squares: VfxPoint[], height: number, palette: string[], duration: number) {
    const group = new THREE.Group();
    group.name = "pillar";
    const c0 = col(palette[0] ?? "#ffffff");
    const c1 = col(palette[1] ?? palette[0] ?? "#ffffff");
    const items: { mesh: THREE.Mesh; cap: THREE.Mesh; delay: number; mat: THREE.MeshBasicMaterial; capMat: THREE.MeshBasicMaterial }[] = [];
    const geo = new THREE.BoxGeometry(SQ * 0.9, SQ * 0.9, 1);
    geo.translate(0, 0, 0.5);
    const capGeo = new THREE.PlaneGeometry(SQ * 0.9, SQ * 0.9);
    squares.forEach((p, i) => {
      const mat = basic(c0, 0.5);
      const capMat = basic(c1, 0.8);
      const mesh = new THREE.Mesh(geo, mat);
      const cap = new THREE.Mesh(capGeo, capMat);
      mesh.position.set(p.x, p.y, 0);
      cap.position.set(p.x, p.y, 0.001);
      group.add(mesh, cap);
      items.push({ mesh, cap, delay: i * 0.08, mat, capMat });
    });
    add({
      group,
      start: performance.now(),
      duration,
      update(t) {
        for (const it of items) {
          const lt = Math.max(0, Math.min(1, (t - it.delay) / (1 - it.delay)));
          const up = lt < 0.4 ? easeOut(lt / 0.4) : lt < 0.7 ? 1 : 1 - easeIn((lt - 0.7) / 0.3);
          it.mesh.scale.z = Math.max(0.0001, up * height);
          it.cap.position.z = up * height + 0.001;
          it.mat.opacity = 0.5 * up;
          it.capMat.opacity = 0.8 * up;
        }
      },
      dispose() {
        geo.dispose();
        capGeo.dispose();
        for (const it of items) {
          it.mat.dispose();
          it.capMat.dispose();
        }
      },
    });
  }

  /** Shards launched from a square: small boxes with velocity up and out,
   *  gravity, tumble, fade. */
  function shatter(squares: VfxPoint[], palette: string[], duration: number, count: number) {
    const group = new THREE.Group();
    const c0 = col(palette[0] ?? "#ffffff");
    const c1 = col(palette[1] ?? palette[0] ?? "#ffffff");
    const geo = new THREE.BoxGeometry(SQ * 0.16, SQ * 0.16, SQ * 0.06);
    const total = count * squares.length;
    const mat = basic(c0, 0.9);
    const mesh = new THREE.InstancedMesh(geo, mat, total);
    const shards: { x: number; y: number; z: number; vx: number; vy: number; vz: number; rx: number; ry: number; sp: number }[] = [];
    for (const p of squares) {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = SQ * (1.5 + Math.random() * 2.5);
        shards.push({ x: p.x, y: p.y, z: SQ * 0.1, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: SQ * (3 + Math.random() * 4), rx: Math.random() * 6, ry: Math.random() * 6, sp: 4 + Math.random() * 6 });
      }
    }
    mesh.setColorAt?.(0, c1);
    group.add(mesh);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v3 = new THREE.Vector3();
    const s3 = new THREE.Vector3(1, 1, 1);
    const g = SQ * 12;
    add({
      group,
      start: performance.now(),
      duration,
      update(t, dt) {
        for (let i = 0; i < shards.length; i++) {
          const s = shards[i];
          s.vz -= g * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.z = Math.max(0, s.z + s.vz * dt);
          if (s.z === 0 && s.vz < 0) {
            s.vz = -s.vz * 0.35;
            s.vx *= 0.7;
            s.vy *= 0.7;
          }
          s.rx += s.sp * dt;
          s.ry += s.sp * 0.7 * dt;
          e.set(s.rx, s.ry, 0);
          q.setFromEuler(e);
          v3.set(s.x, s.y, s.z);
          m4.compose(v3, q, s3);
          mesh.setMatrixAt(i, m4);
        }
        mesh.instanceMatrix.needsUpdate = true;
        mat.opacity = t < 0.6 ? 0.9 : 0.9 * (1 - (t - 0.6) / 0.4);
      },
      dispose() {
        geo.dispose();
        mat.dispose();
      },
    });
  }

  /** An expanding ring on the board plus a thin lifted echo above it. */
  function ringWave(center: VfxPoint, palette: string[], duration: number, reach: number) {
    const group = new THREE.Group();
    const c0 = col(palette[0] ?? "#ffffff");
    const geo = new THREE.RingGeometry(0.85, 1, 64);
    const mat = basic(c0, 0.8);
    const ring = new THREE.Mesh(geo, mat);
    const echoMat = basic(c0, 0.35);
    const echo = new THREE.Mesh(geo, echoMat);
    ring.position.set(center.x, center.y, 0.001);
    echo.position.set(center.x, center.y, SQ * 0.35);
    group.add(ring, echo);
    add({
      group,
      start: performance.now(),
      duration,
      update(t) {
        const r = Math.max(0.0001, easeOut(t) * reach);
        ring.scale.set(r, r, 1);
        echo.scale.set(r * 0.85, r * 0.85, 1);
        mat.opacity = 0.8 * (1 - t);
        echoMat.opacity = 0.35 * (1 - t);
      },
      dispose() {
        geo.dispose();
        mat.dispose();
        echoMat.dispose();
      },
    });
  }

  // ---- public -------------------------------------------------------------

  function play(spec: VfxPlay, depth: Vfx3D) {
    if (destroyed) return;
    if (w <= 1 || h <= 1) resize();
    const scale = Math.max(0.5, Math.min(2, spec.durationScale ?? 1));
    const intensity = Math.max(0.3, Math.min(2, spec.intensity ?? 1));
    const palette = spec.palette?.length ? spec.palette : ["#ffffff"];
    const base = depth.durationMs ?? (spec.tier >= 7 ? 1500 : 1100);
    const duration = base * scale;
    switch (depth.primitive) {
      case "laserRank":
      case "laserFile":
      case "laserDiag": {
        const line = depth.line ?? { from: spec.targets[0]?.p ?? { x: 0, y: 0.5 }, to: spec.targets[spec.targets.length - 1]?.p ?? { x: 1, y: 0.5 } };
        laser(line.from, line.to, palette, duration, spec.tier);
        break;
      }
      case "pillar":
        pillar(depth.squares ?? spec.targets.map((t) => t.p), depth.height ?? SQ * 0.6, palette, duration);
        break;
      case "shatter":
        shatter(depth.squares ?? spec.targets.map((t) => t.p), palette, duration, Math.round(14 * intensity));
        break;
      case "ringWave":
        ringWave(depth.squares?.[0] ?? spec.source ?? { x: 0.5, y: 0.5 }, palette, duration * 0.8, SQ * (spec.tier >= 7 ? 4.5 : 3));
        break;
    }
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (raf) cancelAnimationFrame(raf);
    for (const l of live) {
      scene.remove(l.group);
      l.dispose();
    }
    live.length = 0;
    canvas.removeEventListener("webglcontextlost", onLost);
    renderer.dispose();
    renderer.forceContextLoss();
  }

  function debug() {
    const out: { name: string; box: number[] }[] = [];
    for (const l of live) {
      const b = new THREE.Box3().setFromObject(l.group);
      out.push({ name: l.group.name, box: [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].map((v) => Math.round(v * 1000) / 1000) });
    }
    return out;
  }

  resize();
  return { play, resize, isBusy: () => live.length > 0, destroy, debug };
}
