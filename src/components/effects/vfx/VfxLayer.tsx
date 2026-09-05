"use client";

// Board-overlay canvas that hosts the VFX engine. Mount it inside the
// board crop (a relatively-positioned container); it fills the parent,
// subscribes to the vfx bus, and stands down when effects are hidden
// (fx toggle) or animations are turned off in Settings.

import { useEffect, useRef } from "react";
import { useFxHidden } from "@/lib/fxToggle";
import { motionOff } from "@/lib/settings";
import { createVfxEngine } from "./engine";
import { onVfx } from "./vfxBus";
import { board3dActive } from "@/lib/board3d";
import { deriveDepth } from "../board3d/deriveDepth";

export function VfxLayer({ onShake }: { onShake?: () => void } = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Track gates + host callback in refs so the one-time engine effect
  // always sees the current values without re-mounting the engine.
  const hidden = useFxHidden();
  const hiddenRef = useRef(hidden);
  const shakeRef = useRef(onShake);
  // Keep the latest gate + callback in refs so the one-time engine effect
  // always reads current values without re-mounting (writes in an effect,
  // never during render).
  useEffect(() => {
    hiddenRef.current = hidden;
    shakeRef.current = onShake;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Dev-only: pull in the console demo hook (window.__nerfVfx) so effects
    // can be fired by hand while tuning. Compiled out of production.
    if (process.env.NODE_ENV !== "production") void import("./demo");

    const engine = createVfxEngine(canvas, {
      onShake: () => shakeRef.current?.(),
    });

    const unsubscribe = onVfx((spec) => {
      if (hiddenRef.current) return; // fx toggle: drop plays while hidden
      if (motionOff()) return; // animations off in Settings: drop all plays
      // When the 3D layer is drawing this play's travel (a laser along the
      // rank, say), keep only the impacts and aftermath here so the two
      // layers never draw the same beam twice.
      if (board3dActive()) {
        const depth = deriveDepth(spec);
        if (depth && depth.fallback === "canvas") {
          engine.play({ ...spec, travel: "none" });
          return;
        }
      }
      engine.play(spec);
    });

    const observer = new ResizeObserver(() => engine.resize());
    observer.observe(canvas.parentElement ?? canvas);
    engine.resize();

    // devicePixelRatio can change WITHOUT the CSS box changing: drag the window
    // to a retina monitor, or zoom in a way that leaves the board's computed
    // size the same. engine.resize() re-reads DPR, but a ResizeObserver alone
    // never fired for those, so the backing store stayed at the old ratio and
    // every particle, beam and shockwave rendered at half resolution until the
    // board happened to resize. A resolution media query is the only signal;
    // it has to be re-armed each time because the threshold moves with DPR.
    let dprQuery: MediaQueryList | null = null;
    const watchDpr = () => {
      dprQuery?.removeEventListener("change", onDprChange);
      dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      dprQuery.addEventListener("change", onDprChange);
    };
    function onDprChange() {
      engine.resize();
      watchDpr();
    }
    watchDpr();

    return () => {
      unsubscribe();
      observer.disconnect();
      dprQuery?.removeEventListener("change", onDprChange);
      engine.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[26] h-full w-full"
      aria-hidden
    />
  );
}
