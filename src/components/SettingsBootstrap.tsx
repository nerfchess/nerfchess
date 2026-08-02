"use client";

import { useEffect, useRef, useState } from "react";
import {
  applyBoardTheme,
  applyPieceTheme,
  resolveBoardTheme,
  resolvePieceTheme,
  applyUiPrefs,
  loadSettings,
  pullSettingsFromServer,
  saveSettings,
  SETTINGS_CHANGED_EVENT,
} from "@/lib/settings";
import { configureSoundPrefs, preloadSounds, setUiSounds, setVolume } from "@/lib/sounds";
import { fxLevel, setFxLevel } from "@/lib/fxToggle";
import { requestUiSlot, UI_PRIORITY } from "@/lib/uiInterrupts";

export function SettingsBootstrap() {
  const [fps, setFps] = useState(false);

  useEffect(() => {
    const apply = () => {
      const s = loadSettings();
      applyBoardTheme(resolveBoardTheme(s));
      applyPieceTheme(resolvePieceTheme(s));
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
    // The OS reduced-motion flag is honored live too (see applyUiPrefs):
    // flipping it in system settings stands animations down without a reload.
    const motionMedia = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    motionMedia?.addEventListener?.("change", onScheme);
    return () => {
      window.removeEventListener(SETTINGS_CHANGED_EVENT, apply);
      media?.removeEventListener?.("change", onScheme);
      motionMedia?.removeEventListener?.("change", onScheme);
    };
  }, []);

  return (
    <>
      {/* The fps readout is a developer diagnostic: it only ever renders in
          dev builds, so the little "60 fps" chip can never float over real
          UI (the lobby's sticky action bar sits in the same corner) in
          production. The Settings > Advanced toggle still gates it in dev. */}
      {fps && process.env.NODE_ENV === "development" && <FpsMeter />}
      <LagWatch />
      <MotionNotice />
    </>
  );
}

const MOTION_NOTICE_KEY = "dc:motion-notice"; // "restored" | "dismissed"

/** Tells a player WHY their card animations are missing.
 *
 *  "Follow system motion" defaults on, and applyUiPrefs folds the OS
 *  reduced-motion flag straight into html[data-anim="off"], which every effect
 *  layer treats as a hard kill switch. That is correct behaviour and it is what
 *  the OS asked for, but it is also indistinguishable from the game being
 *  broken: phones enable reduced motion for battery saving and accessibility
 *  defaults, so players end up on a build where no card ever animates and
 *  nothing explains it.
 *
 *  Shown once per device, and only when the OS is the reason: a player who
 *  turned on Reduced motion themselves knows exactly why it is quiet and is
 *  never interrupted. Goes through the same UI interrupt queue as LagWatch, so
 *  it can never cover a draft. */
function MotionNotice() {
  const [show, setShow] = useState(false);
  const releaseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(MOTION_NOTICE_KEY)) return;
    } catch {}
    const s = loadSettings();
    if (!s.followSystemMotion || s.reducedMotion) return;
    if (!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // Deliberately delayed before it even asks for a slot. The interrupt queue
    // only defers to holds that already EXIST, and this effect runs on mount,
    // which on the game route is before the opening draft has pushed its hold.
    // Rendering it there put the notice straight over the cards. A few seconds
    // costs nothing for a once-per-device message and guarantees any draft on
    // the first screen has claimed its hold first.
    let cancel: (() => void) | null = null;
    const timer = window.setTimeout(() => {
      cancel = requestUiSlot(UI_PRIORITY.performance, (release) => {
        releaseRef.current = release;
        setShow(true);
      });
    }, 6000);
    return () => {
      window.clearTimeout(timer);
      cancel?.();
      releaseRef.current?.();
      releaseRef.current = null;
    };
  }, []);

  if (!show) return null;
  const settle = (key: "restored" | "dismissed") => {
    try {
      window.localStorage.setItem(MOTION_NOTICE_KEY, key);
    } catch {}
    setShow(false);
    releaseRef.current?.();
    releaseRef.current = null;
  };
  return (
    <div
      role="status"
      aria-live="polite"
      // bottom honours the home indicator, like the FPS meter below: at a flat
      // 12px this notice started inside the home-bar zone and put its buttons
      // right where the swipe lives.
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      className="fixed left-1/2 z-[95] w-[min(92vw,22rem)] -translate-x-1/2 animate-rise border border-gold/40 bg-ink-700/95 p-3 shadow-plate backdrop-blur-sm"
    >
      <div className="font-display text-sm font-bold text-parchment-100">Card effects are off</div>
      <p className="mt-1 text-xs leading-snug text-parchment-300">
        Your device asks apps to reduce motion, so NerfChess is standing its card animations
        down. That is why plays look quiet. You can show them anyway without changing anything
        on your device.
      </p>
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          className="rounded-[1px] border border-white/15 px-2.5 py-1 text-xs text-parchment-300 hover:bg-white/5"
          onClick={() => settle("dismissed")}
        >
          Keep it calm
        </button>
        <button
          type="button"
          className="rounded-[1px] border border-gold/50 bg-gold/15 px-2.5 py-1 text-xs font-semibold text-parchment-100 hover:bg-gold/25"
          onClick={() => {
            saveSettings({ ...loadSettings(), followSystemMotion: false });
            settle("restored");
          }}
        >
          Show effects
        </button>
      </div>
    </div>
  );
}

// How LagWatch decides the device is struggling: rolling 4-second windows of
// requestAnimationFrame gaps; a window is "bad" when nearly half of its wall
// time is spent inside slow frames (a gap over 34ms means the device dipped
// under ~30fps). Five bad windows in a row (~20s of sustained jank, never a
// single hitch) trip the notice, and the first two windows after load are
// discarded outright — page-load warm-up (hydration, JIT, asset decode) janks
// every device for a few seconds and says nothing about steady-state pacing.
const LAG_WINDOW_MS = 4000;
const LAG_SLOW_FRAME_MS = 34;
const LAG_BAD_RATIO = 0.45;
const LAG_BAD_WINDOWS = 5;
const LAG_WARMUP_WINDOWS = 2;
const LAG_NOTICE_KEY = "dc:lag-notice"; // "dismissed" | "applied"

/** Watches real frame pacing and, on sustained jank, offers performance mode
 *  in a small popup — animations are never silently degraded or disabled.
 *  One-shot per device: any choice (or already-reduced settings) disarms it.
 *
 *  PRESENTATION IS GATED: the detection runs silently in the background, but
 *  the popup itself goes through the UI interrupt queue (uiInterrupts). While
 *  a draft is active (or any other protected moment holds interrupts), the
 *  recommendation waits; it can never cover the cards, eat decision time, or
 *  burn game-clock time. It presents once the table is clear. */
function LagWatch() {
  const [show, setShow] = useState(false);
  const releaseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(LAG_NOTICE_KEY)) return;
    } catch {}
    const s = loadSettings();
    // Nothing left to offer when the user already runs a reduced setup.
    if (s.perfMode || s.reducedMotion || s.animationSpeed !== "normal") return;

    let raf = 0;
    let cancelSlot: (() => void) | null = null;
    let last = performance.now();
    let windowStart = last;
    let slowMs = 0;
    let badWindows = 0;
    let windowsSeen = 0;
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
          windowsSeen += 1;
          // Warm-up windows never count: the first seconds after load jank
          // everywhere (hydration, JIT, decoding) and would trip this on
          // perfectly healthy desktops.
          const bad =
            windowsSeen > LAG_WARMUP_WINDOWS && slowMs / (now - windowStart) > LAG_BAD_RATIO;
          badWindows = bad ? badWindows + 1 : 0;
          windowStart = now;
          slowMs = 0;
          if (badWindows >= LAG_BAD_WINDOWS) {
            // Detected. Queue the recommendation; it shows only when no draft
            // (or other protected surface) is active, one interrupt at a time.
            cancelSlot = requestUiSlot(UI_PRIORITY.performance, (release) => {
              releaseRef.current = release;
              setShow(true);
            });
            return; // stop sampling once the notice is queued
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      cancelSlot?.();
      releaseRef.current?.();
      releaseRef.current = null;
    };
  }, []);

  if (!show) return null;
  const settle = (key: "applied" | "dismissed") => {
    try {
      window.localStorage.setItem(LAG_NOTICE_KEY, key);
    } catch {}
    setShow(false);
    releaseRef.current?.();
    releaseRef.current = null;
  };
  return (
    <div
      role="status"
      aria-live="polite"
      // bottom honours the home indicator, like the FPS meter below: at a flat
      // 12px this notice started inside the home-bar zone and put its buttons
      // right where the swipe lives.
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      className="fixed left-1/2 z-[95] w-[min(92vw,22rem)] -translate-x-1/2 animate-rise border border-gold/40 bg-ink-700/95 p-3 shadow-plate backdrop-blur-sm"
    >
      <div className="font-display text-sm font-bold text-parchment-100">Animations running slow?</div>
      <p className="mt-1 text-xs leading-snug text-parchment-300">
        This device looks like it&apos;s struggling to keep up. Smooth it out turns on
        performance mode, sets move animations to fast, and eases the effects dial down to
        Calm. Nothing is hidden, and you can change all three anytime in Settings.
      </p>
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          className="rounded-[1px] border border-white/15 px-2.5 py-1 text-xs text-parchment-300 hover:bg-white/5"
          onClick={() => settle("dismissed")}
        >
          No thanks
        </button>
        <button
          type="button"
          className="rounded-[1px] border border-gold/50 bg-gold/15 px-2.5 py-1 text-xs font-semibold text-parchment-100 hover:bg-gold/25"
          onClick={() => {
            saveSettings({ ...loadSettings(), perfMode: true, animationSpeed: "fast" });
            // perfMode gates decorative page paint, and animationSpeed only
            // clamps transition durations. Neither touches the card-effect
            // load, which is what actually costs frames during a play, so the
            // old remedy changed almost nothing on a struggling device. The FX
            // dial is the real particle budget: pull it down to Calm, and only
            // downward so a player who deliberately chose Epic is not reset
            // past where they already were.
            if (fxLevel() > 1) setFxLevel(1);
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
    <div
      className="pointer-events-none fixed left-2 z-[90] rounded-[1px] border border-white/15 bg-ink-900/80 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-parchment-300 opacity-70"
      style={{ bottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
    >
      {fps} fps
    </div>
  );
}
