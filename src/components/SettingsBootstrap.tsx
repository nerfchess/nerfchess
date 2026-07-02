"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyBoardTheme,
  applyPieceTheme,
  applyUiPrefs,
  loadSettings,
  SETTINGS_CHANGED_EVENT,
} from "@/lib/settings";
import { setUiSounds, setVolume } from "@/lib/sounds";

export function SettingsBootstrap() {
  const [fps, setFps] = useState(false);

  useEffect(() => {
    const apply = () => {
      const s = loadSettings();
      applyBoardTheme(s.boardTheme);
      applyPieceTheme(s.pieceTheme);
      applyUiPrefs(s);
      setVolume(s.volume);
      setUiSounds(s.uiSounds);
      setFps(s.fpsCounter);
    };
    apply();
    window.addEventListener(SETTINGS_CHANGED_EVENT, apply);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, apply);
  }, []);

  return fps ? <FpsMeter /> : null;
}

/** Tiny frames-per-second readout, pinned to a corner (Settings > Advanced). */
function FpsMeter() {
  const [fps, setFps] = useState(0);
  const frames = useRef(0);
  const last = useRef(0);

  useEffect(() => {
    let raf = 0;
    last.current = performance.now();
    const tick = (now: number) => {
      frames.current++;
      const elapsed = now - last.current;
      if (elapsed >= 500) {
        setFps(Math.round((frames.current * 1000) / elapsed));
        frames.current = 0;
        last.current = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-2 left-2 z-[90] rounded-sm border border-white/15 bg-ink-900/80 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-parchment-300">
      {fps} fps
    </div>
  );
}
