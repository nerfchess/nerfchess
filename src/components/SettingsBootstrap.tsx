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
      {fps ? <FpsMeter /> : null}
      <LagNudge />
    </>
  );
}

/* --- Lag nudge -----------------------------------------------------------
   Everyone gets full visuals by default (no more hardware sniff). This
   watches real frame pacing instead: if the page sustains genuine jank while
   perf mode is off, a small one-time popup offers to turn perf mode on.
   Detection: rolling 5s windows of rAF deltas; a window is "laggy" when at
   least 25% of its frames ran longer than 70ms (under ~14fps moments), and
   two consecutive laggy windows trip the nudge. Background tabs pause rAF,
   so idle tabs never trip it. Dismissing (either button) is remembered. */

const LAG_DISMISS_KEY = "dc:lag-nudge-dismissed";

function LagNudge() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(LAG_DISMISS_KEY)) return;
    } catch {}
    if (loadSettings().perfMode) return;
    let raf = 0;
    let last = performance.now();
    let frames = 0;
    let slow = 0;
    let windowStart = last;
    let laggyWindows = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      // Ignore monster gaps (tab was hidden / debugger paused), count real frames.
      if (dt > 0 && dt < 2000) {
        frames++;
        if (dt > 70) slow++;
      }
      if (now - windowStart >= 5000) {
        const laggy = frames >= 30 && slow / Math.max(1, frames) >= 0.25;
        laggyWindows = laggy ? laggyWindows + 1 : 0;
        frames = 0;
        slow = 0;
        windowStart = now;
        if (laggyWindows >= 2) {
          setShow(true);
          return; // stop sampling once tripped
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(LAG_DISMISS_KEY, "1");
    } catch {}
    setShow(false);
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-[95] w-[min(92vw,380px)] -translate-x-1/2 border border-white/15 bg-ink-900/95 p-3.5 shadow-xl">
      <p className="text-[13px] leading-snug text-parchment-200">
        Computer feeling laggy? Performance mode drops the heaviest visual
        effects so the game stays smooth.
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          className="btn-glass btn-glass--primary px-3 py-1.5 text-[12px] font-medium"
          onClick={() => {
            saveSettings({ ...loadSettings(), perfMode: true });
            dismiss();
          }}
        >
          Enable performance mode
        </button>
        <button type="button" className="btn-glass px-3 py-1.5 text-[12px]" onClick={dismiss}>
          No thanks
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
