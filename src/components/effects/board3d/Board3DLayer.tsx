"use client";

// The WebGL board layer. Mounts a canvas over the board crop (a sibling of the
// 2D VfxLayer, one z-step above it), and only after every gate in
// src/lib/board3d passes does it download the engine (three.js) with a dynamic
// import. It subscribes to the same VFX bus as the 2D layer and takes the 3D
// treatment of each play (explicit `depth`, or derived from travel/impact).
//
// A frame governor watches frame times while a play is in flight; sustained
// slowness downgrades the session once (the 2D layer takes travel back) and
// shows a one-time toast pointing at the Settings toggle.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BOARD3D_EVENT,
  board3dAllowed,
  board3dToastSeen,
  markBoard3dDowngraded,
  markBoard3dToastSeen,
  setBoard3dActive,
} from "@/lib/board3d";
import { useFrameGovernor } from "@/lib/useFrameGovernor";
import { onVfx } from "../vfx/vfxBus";
import { deriveDepth } from "./deriveDepth";
import type { Engine3D } from "./engine3d";

export function Board3DLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine3D | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(false);

  // Re-evaluate the gates when settings, the FX dial or the 3D state change.
  useEffect(() => {
    const check = () => setEnabled(board3dAllowed());
    check();
    window.addEventListener(BOARD3D_EVENT, check);
    window.addEventListener("nc-fx-toggle", check);
    window.addEventListener("nerfchess:settings-changed", check);
    return () => {
      window.removeEventListener(BOARD3D_EVENT, check);
      window.removeEventListener("nc-fx-toggle", check);
      window.removeEventListener("nerfchess:settings-changed", check);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!enabled || !canvas) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    let observer: ResizeObserver | null = null;
    let dprQuery: MediaQueryList | null = null;
    let busyTimer = 0;

    import("./engine3d").then(({ createEngine3D }) => {
      if (cancelled) return;
      const engine = createEngine3D(canvas, {
        onContextLost: () => {
          if (markBoard3dDowngraded()) setToast(!board3dToastSeen());
        },
      });
      engineRef.current = engine;
      setBoard3dActive(true);
      if (process.env.NODE_ENV !== "production") {
        (window as unknown as { __nerf3d?: Engine3D }).__nerf3d = engine;
      }

      unsubscribe = onVfx((spec) => {
        const depth = deriveDepth(spec);
        if (!depth) return;
        engine.play(spec, depth);
        setBusy(true);
        window.clearTimeout(busyTimer);
        busyTimer = window.setTimeout(() => setBusy(false), 2200);
      });

      observer = new ResizeObserver(() => engine.resize());
      observer.observe(canvas.parentElement ?? canvas);
      const watchDpr = () => {
        dprQuery?.removeEventListener("change", onDpr);
        dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
        dprQuery.addEventListener("change", onDpr);
      };
      function onDpr() {
        engine.resize();
        watchDpr();
      }
      watchDpr();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
      observer?.disconnect();
      dprQuery?.removeEventListener("change", () => {});
      window.clearTimeout(busyTimer);
      engineRef.current?.destroy();
      engineRef.current = null;
      setBoard3dActive(false);
    };
  }, [enabled]);

  // Governor: sample frames only while a 3D play is in flight.
  useFrameGovernor(enabled && busy, () => {
    if (markBoard3dDowngraded()) setToast(!board3dToastSeen());
  }, { warmupMs: 200 });

  return (
    <>
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[27] h-full w-full" aria-hidden />
      {toast && <DowngradeToast onClose={() => setToast(false)} />}
    </>
  );
}

function DowngradeToast({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    markBoard3dToastSeen();
    const t = window.setTimeout(onClose, 9000);
    return () => window.clearTimeout(t);
  }, [onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="plate plate-raised fixed bottom-4 left-1/2 z-[60] w-[min(92vw,22rem)] -translate-x-1/2 p-3 text-[13px] text-parchment-200"
    >
      <span className="text-parchment-50">Effects reduced for performance.</span> 3D board effects are off for this
      session. Turn them back on in Settings.
      <button type="button" onClick={onClose} className="ml-3 text-parchment-400 hover:text-parchment-100" aria-label="Dismiss">
        ×
      </button>
    </div>,
    document.body,
  );
}
