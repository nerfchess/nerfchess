"use client";

// Gates and shared state for the WebGL board layer (effects/board3d). Kept
// tiny and dependency-free so both the 2D canvas layer and the 3D layer can
// read it without pulling three.js in: the 2D layer asks `board3dActive()` to
// decide whether to skip its own travel effects, and the 3D layer asks
// `board3dAllowed()` before it even downloads its engine.

import { fxLevel } from "@/lib/fxToggle";
import { loadSettings, motionOff } from "@/lib/settings";

const DOWNGRADE_KEY = "nc-3d-downgraded";
const TOAST_KEY = "nc-3d-toast-seen";
export const BOARD3D_EVENT = "nc-3d-state";

let active = false;
let probed: boolean | null = null;

/** True while a 3D layer is mounted and taking travel effects. */
export function board3dActive(): boolean {
  return active;
}

export function setBoard3dActive(next: boolean): void {
  if (active === next) return;
  active = next;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(BOARD3D_EVENT));
}

/** One-time WebGL probe on a throwaway canvas. */
export function webglAvailable(): boolean {
  if (probed !== null) return probed;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") ?? c.getContext("webgl");
    probed = !!gl;
    if (gl && "getExtension" in gl) (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    probed = false;
  }
  return probed;
}

export function board3dDowngraded(): boolean {
  try {
    return window.sessionStorage.getItem(DOWNGRADE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Dev escape hatch: localStorage nc-3d-governor=off keeps the layer up on a
 *  slow machine (headless screenshots, software GL) so it can be inspected. */
export function board3dGovernorOff(): boolean {
  try {
    return window.localStorage.getItem("nc-3d-governor") === "off";
  } catch {
    return false;
  }
}

/** Mark this session as too slow for the 3D layer. Returns true the first
 *  time (so the caller can show the one toast), false if already marked. */
export function markBoard3dDowngraded(): boolean {
  if (board3dGovernorOff()) return false;
  try {
    if (window.sessionStorage.getItem(DOWNGRADE_KEY) === "1") return false;
    window.sessionStorage.setItem(DOWNGRADE_KEY, "1");
  } catch {}
  setBoard3dActive(false);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(BOARD3D_EVENT));
  return true;
}

export function clearBoard3dDowngrade(): void {
  try {
    window.sessionStorage.removeItem(DOWNGRADE_KEY);
  } catch {}
}

/** Whether the downgrade toast has ever been shown in this browser. */
export function board3dToastSeen(): boolean {
  try {
    return window.localStorage.getItem(TOAST_KEY) === "1";
  } catch {
    return false;
  }
}
export function markBoard3dToastSeen(): void {
  try {
    window.localStorage.setItem(TOAST_KEY, "1");
  } catch {}
}

/** Every gate the layer must pass before loading three.js. Cheap: settings
 *  read, dial read, one DOM attribute, one cached probe, one storage read. */
export function board3dAllowed(): boolean {
  if (typeof window === "undefined") return false;
  if (!loadSettings().effects3d) return false;
  if (fxLevel() < 2) return false;
  if (motionOff()) return false;
  if (board3dDowngraded()) return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 4) return false;
  if (nav.connection?.saveData) return false;
  return webglAvailable();
}
