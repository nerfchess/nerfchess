"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyBoardTheme,
  applyPieceTheme,
  applyUiPrefs,
  loadSettings,
  pullSettingsFromServer,
  SETTINGS_CHANGED_EVENT,
} from "@/lib/settings";
import { configureSoundPrefs, preloadSounds, setUiSounds, setVolume } from "@/lib/sounds";

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
      configureSoundPrefs({
        enabled: s.soundEnabled,
        move: s.moveSound,
        capture: s.captureSound,
        check: s.checkSound,
        gameEnd: s.gameEndSound,
        theme: s.soundTheme,
      });
      if (s.soundEnabled && s.soundTheme === "lichess") preloadSounds();
      setFps(s.fpsCounter);
    };
    apply();
    // Signed-in accounts sync settings across devices: adopt the server copy
    // when it is newer than this device's (writes re-fire the changed event).
    void pullSettingsFromServer();
    window.addEventListener(SETTINGS_CHANGED_EVENT, apply);
    // "System" theme follows the OS live.
    const media = window.matchMedia?.("(prefers-color-scheme: light)");
    const onScheme = () => applyUiPrefs(loadSettings());
    media?.addEventListener?.("change", onScheme);
    return () => {
      window.removeEventListener(SETTINGS_CHANGED_EVENT, apply);
      media?.removeEventListener?.("change", onScheme);
    };
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
    <div
      className="pointer-events-none fixed left-2 z-[90] rounded-sm border border-white/15 bg-ink-900/80 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-parchment-300 opacity-70"
      style={{ bottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
    >
      {fps} fps
    </div>
  );
}
