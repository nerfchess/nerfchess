"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyBoardTheme,
  applyPieceTheme,
  applyUiPrefs,
  loadSettings,
  pullSettingsFromServer,
  saveSettings,
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

  return (
    <>
      {fps && <FpsMeter />}
      <LagWatch />
    </>
  );
}

// How LagWatch decides the device is struggling: rolling 4-second windows of
// requestAnimationFrame gaps; a window is "bad" when more than a third of its
// wall time is spent inside slow frames (a gap over 34ms means the device
// dipped under ~30fps). Three bad windows in a row (~12s of sustained jank,
// never a single hitch) trips the notice.
const LAG_WINDOW_MS = 4000;
const LAG_SLOW_FRAME_MS = 34;
const LAG_BAD_RATIO = 0.34;
const LAG_BAD_WINDOWS = 3;
const LAG_NOTICE_KEY = "dc:lag-notice"; // "dismissed" | "applied"

/** Watches real frame pacing and, on sustained jank, offers performance mode
 *  in a small popup — animations are never silently degraded or disabled.
 *  One-shot per device: any choice (or already-reduced settings) disarms it. */
function LagWatch() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(LAG_NOTICE_KEY)) return;
    } catch {}
    const s = loadSettings();
    // Nothing left to offer when the user already runs a reduced setup.
    if (s.perfMode || s.reducedMotion || s.animationSpeed !== "normal") return;

    let raf = 0;
    let last = performance.now();
    let windowStart = last;
    let slowMs = 0;
    let badWindows = 0;
    const tick = (now: number) => {
      const gap = now - last;
      last = now;
      // A huge gap is a background tab or a paused rAF, not jank: start over.
      if (gap > 1000) {
        windowStart = now;
        slowMs = 0;
        badWindows = 0;
      } else {
        if (gap > LAG_SLOW_FRAME_MS) slowMs += gap;
        if (now - windowStart >= LAG_WINDOW_MS) {
          const bad = slowMs / (now - windowStart) > LAG_BAD_RATIO;
          badWindows = bad ? badWindows + 1 : 0;
          windowStart = now;
          slowMs = 0;
          if (badWindows >= LAG_BAD_WINDOWS) {
            setShow(true);
            return; // stop sampling once the notice is up
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!show) return null;
  const settle = (key: "applied" | "dismissed") => {
    try {
      window.localStorage.setItem(LAG_NOTICE_KEY, key);
    } catch {}
    setShow(false);
  };
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-3 left-1/2 z-[95] w-[min(92vw,22rem)] -translate-x-1/2 animate-rise border border-gold/40 bg-ink-700/95 p-3 shadow-plate backdrop-blur-sm"
    >
      <div className="font-display text-sm font-bold text-parchment-100">Animations running slow?</div>
      <p className="mt-1 text-xs leading-snug text-parchment-300">
        This device looks like it&apos;s struggling to keep up. Performance mode keeps every
        animation but trims the heaviest effects — you can change it any time in Settings.
      </p>
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          className="rounded-sm border border-white/15 px-2.5 py-1 text-xs text-parchment-300 hover:bg-white/5"
          onClick={() => settle("dismissed")}
        >
          No thanks
        </button>
        <button
          type="button"
          className="rounded-sm border border-gold/50 bg-gold/15 px-2.5 py-1 text-xs font-semibold text-parchment-100 hover:bg-gold/25"
          onClick={() => {
            saveSettings({ ...loadSettings(), perfMode: true, animationSpeed: "fast" });
            settle("applied");
          }}
        >
          Smooth it out
        </button>
      </div>
    </div>
  );
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
