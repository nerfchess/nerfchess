"use client";

// Live preview canvas for the clip studio: a thin rAF loop over the
// deterministic scene renderer in clipScene.ts, now with a real transport.
// The preview and the exported file draw THE SAME frames (Tier 1 encoding
// replays renderClipFrame offline, Tier 2 records this very canvas), and
// because the renderer is a pure function of t, seeking is just "set t".
//
// Transport model: while PLAYING, t derives from a performance.now() anchor;
// while PAUSED, t is a held value. seek() writes the held value (and rewrites
// the anchor when playing), so scrubbing works in either state. None of this
// touches React state or the scene config, so scrubbing and pausing can never
// trigger a re-encode.

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { ClipScene } from "./clipScene";
import { renderClipFrame } from "./clipScene";

const LOOP_GAP_MS = 650;
const FRAME_MS = 1000 / 30;

export interface ClipRendererHandle {
  canvas: HTMLCanvasElement | null;
  /** Restart the animation from the top (and play); `onDone` fires once when
   *  this run completes (used to stop a Tier 2 recorder in sync). */
  restart: (onDone?: () => void) => void;
  play: () => void;
  pause: () => void;
  /** Toggle play/pause; returns the new playing state. */
  toggle: () => boolean;
  /** Jump to an absolute time (ms). Works playing or paused. */
  seek: (tMs: number) => void;
  /** Step one 30fps frame forward/backward; pauses. */
  stepFrame: (dir: 1 | -1) => void;
  getTime: () => number;
  isPlaying: () => boolean;
}

interface Props {
  scene: ClipScene;
  images: Map<string, HTMLImageElement> | null;
  className?: string;
  /** Loop at the end (true, the classic preview) or hold the last frame. */
  loop?: boolean;
  /** Called on every rendered frame with the current time. Consumers write
   *  straight to DOM nodes (timecode, playhead), never into React state. */
  onTick?: (tMs: number, playing: boolean) => void;
  /** Called when the loop wraps back to 0 (to resync the audio monitor). */
  onLoop?: () => void;
  /** Called when playback pauses on its own (loop off, reel finished). */
  onAutoPause?: () => void;
}

interface Transport {
  playing: boolean;
  /** performance.now() anchor for t=0 while playing. */
  t0: number;
  /** Held time while paused. */
  tHold: number;
  /** Force one repaint while paused (after a seek). */
  dirty: boolean;
  onDone: (() => void) | null;
  doneFired: boolean;
}

export const ClipRenderer = forwardRef<ClipRendererHandle, Props>(function ClipRenderer(
  { scene, images, className, loop = true, onTick, onLoop, onAutoPause },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trRef = useRef<Transport>({
    playing: true,
    t0: 0,
    tHold: 0,
    dirty: true,
    onDone: null,
    doneFired: false,
  });
  const loopRef = useRef(loop);
  loopRef.current = loop;
  const cbRef = useRef({ onTick, onLoop, onAutoPause });
  cbRef.current = { onTick, onLoop, onAutoPause };
  const durRef = useRef(scene.durationMs);
  durRef.current = scene.durationMs;

  const clampT = (t: number) => Math.max(0, Math.min(t, durRef.current));

  useImperativeHandle(
    ref,
    () => ({
      get canvas() {
        return canvasRef.current;
      },
      restart: (onDone?: () => void) => {
        trRef.current = {
          playing: true,
          t0: performance.now(),
          tHold: 0,
          dirty: true,
          onDone: onDone ?? null,
          doneFired: false,
        };
      },
      play: () => {
        const s = trRef.current;
        if (s.playing) return;
        // A play from the very end restarts from the top.
        const from = s.tHold >= durRef.current - FRAME_MS ? 0 : s.tHold;
        s.t0 = performance.now() - from;
        s.playing = true;
        s.doneFired = from === 0 ? false : s.doneFired;
      },
      pause: () => {
        const s = trRef.current;
        if (!s.playing) return;
        s.tHold = clampT(performance.now() - s.t0);
        s.playing = false;
        s.dirty = true;
      },
      toggle() {
        if (trRef.current.playing) this.pause();
        else this.play();
        return trRef.current.playing;
      },
      seek: (tMs: number) => {
        const s = trRef.current;
        const t = clampT(tMs);
        if (s.playing) s.t0 = performance.now() - t;
        s.tHold = t;
        s.dirty = true;
      },
      stepFrame(dir: 1 | -1) {
        const s = trRef.current;
        const now = s.playing ? clampT(performance.now() - s.t0) : s.tHold;
        s.playing = false;
        s.tHold = clampT(now + dir * FRAME_MS);
        s.dirty = true;
      },
      getTime: () => {
        const s = trRef.current;
        return s.playing ? clampT(performance.now() - s.t0) : s.tHold;
      },
      isPlaying: () => trRef.current.playing,
    }),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;
    let raf = 0;
    // A new scene keeps the transport's mode but restarts time from 0 (the
    // reel's timing map changed under it).
    const prev = trRef.current;
    trRef.current = {
      playing: prev.playing,
      t0: performance.now(),
      tHold: 0,
      dirty: true,
      onDone: null,
      doneFired: false,
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const run = trRef.current;
      let t: number;
      if (run.playing) {
        t = now - run.t0;
        if (t >= scene.durationMs && !run.doneFired) {
          run.doneFired = true;
          run.onDone?.();
          run.onDone = null;
        }
        if (t >= scene.durationMs) {
          if (loopRef.current) {
            // Preview loops with a short gap; a recording run has already
            // fired onDone by the time the loop wraps.
            if (t >= scene.durationMs + LOOP_GAP_MS) {
              run.t0 = now;
              run.doneFired = false;
              t = 0;
              cbRef.current.onLoop?.();
            } else {
              t = scene.durationMs;
            }
          } else {
            run.playing = false;
            run.tHold = scene.durationMs;
            run.dirty = true;
            t = scene.durationMs;
            cbRef.current.onAutoPause?.();
          }
        }
      } else {
        if (!run.dirty) return; // parked and painted: skip the repaint
        t = run.tHold;
      }
      run.dirty = false;
      const shown = Math.min(Math.max(0, t), scene.durationMs);
      renderClipFrame(scene, ctx, shown, images);
      cbRef.current.onTick?.(shown, run.playing);
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
