"use client";

// Board-overlay canvas that hosts the VFX engine. Mount it inside the
// board crop (a relatively-positioned container); it fills the parent,
// subscribes to the vfx bus, and stands down when effects are hidden
// (fx toggle) or the user prefers reduced motion.

import { useEffect, useRef } from "react";
import { useFxHidden } from "@/lib/fxToggle";
import { createVfxEngine } from "./engine";
import { onVfx } from "./vfxBus";

export function VfxLayer({ onShake }: { onShake?: () => void } = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Track gates + host callback in refs so the one-time engine effect
  // always sees the current values without re-mounting the engine.
  const hidden = useFxHidden();
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;
  const shakeRef = useRef(onShake);
  shakeRef.current = onShake;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Dev-only: pull in the console demo hook (window.__nerfVfx) so effects
    // can be fired by hand while tuning. Compiled out of production.
    if (process.env.NODE_ENV !== "production") void import("./demo");

    const engine = createVfxEngine(canvas, {
      onShake: () => shakeRef.current?.(),
    });

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const unsubscribe = onVfx((spec) => {
      if (hiddenRef.current) return; // fx toggle: drop plays while hidden
      if (reducedMotion.matches) return; // accessibility: drop all plays
      engine.play(spec);
    });

    const observer = new ResizeObserver(() => engine.resize());
    observer.observe(canvas.parentElement ?? canvas);
    engine.resize();

    return () => {
      unsubscribe();
      observer.disconnect();
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
