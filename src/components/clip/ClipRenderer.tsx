"use client";

// Live preview canvas for the clip modal: a thin rAF loop over the
// deterministic scene renderer in clipScene.ts. The preview and the exported
// file draw THE SAME frames — Tier 1 encoding replays renderClipFrame offline,
// Tier 2 records this very canvas — so what you see is what you post.

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { ClipScene } from "./clipScene";
import { renderClipFrame } from "./clipScene";

const LOOP_GAP_MS = 650;

export interface ClipRendererHandle {
  canvas: HTMLCanvasElement | null;
  /** Restart the animation from the top; `onDone` fires once when this run
   *  completes (used to stop a Tier 2 recorder in sync with the timeline). */
  restart: (onDone?: () => void) => void;
}

interface Props {
  scene: ClipScene;
  images: Map<string, HTMLImageElement> | null;
  className?: string;
}

export const ClipRenderer = forwardRef<ClipRendererHandle, Props>(function ClipRenderer(
  { scene, images, className },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runRef = useRef<{ t0: number; onDone: (() => void) | null; doneFired: boolean }>({
    t0: 0,
    onDone: null,
    doneFired: false,
  });

  useImperativeHandle(
    ref,
    () => ({
      get canvas() {
        return canvasRef.current;
      },
      restart: (onDone?: () => void) => {
        runRef.current = { t0: performance.now(), onDone: onDone ?? null, doneFired: false };
      },
    }),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;
    let raf = 0;
    runRef.current = { t0: performance.now(), onDone: null, doneFired: false };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const run = runRef.current;
      let t = now - run.t0;
      if (t >= scene.durationMs && !run.doneFired) {
        run.doneFired = true;
        run.onDone?.();
        run.onDone = null;
      }
      // Preview loops with a short gap; a recording run has already fired
      // onDone by the time the loop wraps.
      if (t >= scene.durationMs + LOOP_GAP_MS) {
        run.t0 = now;
        run.doneFired = false;
        t = 0;
      }
      renderClipFrame(scene, ctx, Math.min(t, scene.durationMs), images);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [scene, images]);

  return (
    <canvas
      ref={canvasRef}
      width={scene.layout.W}
      height={scene.layout.H}
      className={className}
      aria-label="Clip preview: a stylized replay of the final moves"
    />
  );
});
