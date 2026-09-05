"use client";

// The studio VIEWPORT: the preview canvas dressed in editor chrome. A REC
// strip with the layout name and resolution readout, a live mono timecode
// (written straight into a DOM node by the transport tick, never through
// React state), viewfinder corner brackets, and a transport row of inline
// SVG stroke icons on the sanctioned Button primitive.

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { Button } from "@/components/ui/Button";
import { ClipRenderer, type ClipRendererHandle } from "../ClipRenderer";
import { renderClipFrame, type ClipScene } from "../clipScene";
import type { ClipSticker } from "../clipStickers";
import { ASPECT_NAME } from "../clipOptions";

/** Compare preview cap: the pinned pane redraws at most this often, so a
 *  phone never pays for two full-rate renders. The export is untouched. */
const COMPARE_FRAME_MS = 1000 / 24;

export function formatClipTime(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalS = Math.floor(clamped / 1000);
  const mm = String(Math.floor(totalS / 60)).padStart(2, "0");
  const ss = String(totalS % 60).padStart(2, "0");
  const tenth = Math.floor((clamped % 1000) / 100);
  return `${mm}:${ss}.${tenth}`;
}

function Icon({ d, filled }: { d: string; filled?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

interface Props {
  scene: ClipScene;
  images: Map<string, HTMLImageElement> | null;
  rendererRef: MutableRefObject<ClipRendererHandle | null>;
  playing: boolean;
  loop: boolean;
  muted: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onToggleLoop: () => void;
  onToggleMute: () => void;
  onTick: (tMs: number, playing: boolean) => void;
  onLoop: () => void;
  onAutoPause: () => void;
  registerTickTarget: (key: string, el: HTMLElement | null) => void;
  previewMax: string;
  /** A/B compare: the pinned style's scene, rendered right of a draggable
   *  seam at the SAME t as the live preview. Null when compare is off. */
  compareScene?: ClipScene | null;
  pinnedName?: string | null;
  /** Export frame rate for the chrome readout (the preview is rAF-driven). */
  fps?: number;
  /** Hook drag: vertical-only reposition within the safe band. The grip
   *  moves live; the fraction commits on release (one re-encode per drag). */
  hookDrag?: {
    frac: number;
    min: number;
    max: number;
    onCommit: (frac: number) => void;
    locked: boolean;
  } | null;
  /** Sticker drag: transparent hit areas over the canvas-rendered stickers;
   *  board-relative fractions commit on release. */
  stickerDrag?: {
    list: ClipSticker[];
    onCommit: (index: number, x: number, y: number) => void;
    locked: boolean;
  } | null;
}

export function Viewport({
  scene,
  images,
  rendererRef,
  playing,
  loop,
  muted,
  onTogglePlay,
  onRestart,
  onToggleLoop,
  onToggleMute,
  onTick,
  onLoop,
  onAutoPause,
  registerTickTarget,
  previewMax,
  compareScene = null,
  pinnedName = null,
  fps = 30,
  hookDrag = null,
  stickerDrag = null,
}: Props) {
  const { W, H } = scene.layout;

  // --- A/B compare pane ------------------------------------------------------
  // The pinned scene draws into an overlay canvas clipped at the seam, at the
  // same t the transport tick hands the live preview. Seam drag is pure UI.
  const [seam, setSeam] = useState(50);
  const [seamDrag, setSeamDrag] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const compareCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compareRef = useRef<{ scene: ClipScene | null; lastWall: number; lastT: number }>({
    scene: null,
    lastWall: 0,
    lastT: -1,
  });
  const imagesRef = useRef(images);
  useEffect(() => {
    compareRef.current.scene = compareScene;
  }, [compareScene]);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const drawCompare = useCallback((tMs: number, force = false) => {
    const st = compareRef.current;
    const canvas = compareCanvasRef.current;
    if (!st.scene || !canvas) return;
    const now = performance.now();
    if (!force && tMs === st.lastT) return;
    if (!force && now - st.lastWall < COMPARE_FRAME_MS) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    st.lastWall = now;
    st.lastT = tMs;
    renderClipFrame(st.scene, ctx, Math.min(tMs, st.scene.durationMs), imagesRef.current);
  }, []);

  const handleTick = useCallback(
    (tMs: number, isPlaying: boolean) => {
      drawCompare(tMs);
      onTick(tMs, isPlaying);
    },
    [drawCompare, onTick],
  );

  // A fresh pin (or scene swap) repaints the pane even while paused.
  useEffect(() => {
    if (!compareScene) return;
    drawCompare(rendererRef.current?.getTime() ?? 0, true);
  }, [compareScene, drawCompare, rendererRef]);

  const seamTo = useCallback((clientX: number) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / Math.max(1, rect.width)) * 100;
    setSeam(Math.max(8, Math.min(92, pct)));
  }, []);

  // --- Hook + sticker drag (live grip position, commit on release) -----------
  const [hookLive, setHookLive] = useState<number | null>(null);
  const [stickerLive, setStickerLive] = useState<{ i: number; x: number; y: number } | null>(
    null,
  );
  const hookFracAt = useCallback(
    (clientY: number): number => {
      const el = stageRef.current;
      if (!el || !hookDrag) return hookDrag?.frac ?? 0.2;
      const rect = el.getBoundingClientRect();
      const frac = (clientY - rect.top) / Math.max(1, rect.height);
      return Math.max(hookDrag.min, Math.min(hookDrag.max, frac));
    },
    [hookDrag],
  );
  const stickerFracAt = useCallback(
    (clientX: number, clientY: number) => {
      const el = stageRef.current;
      const L = scene.layout;
      if (!el) return { x: 0.5, y: 0.5 };
      const rect = el.getBoundingClientRect();
      const px = ((clientX - rect.left) / Math.max(1, rect.width)) * L.W;
      const py = ((clientY - rect.top) / Math.max(1, rect.height)) * L.H;
      const cl = (v: number) => Math.max(-0.12, Math.min(1.12, v));
      return { x: cl((px - L.boardX) / L.board), y: cl((py - L.boardY) / L.board) };
    },
    [scene.layout],
  );

  return (
    <div className="clip-vp">
      <span className="clip-vp-corner tl" aria-hidden />
      <span className="clip-vp-corner tr" aria-hidden />
      <span className="clip-vp-corner bl" aria-hidden />
      <span className="clip-vp-corner br" aria-hidden />

      <div className="clip-vp-chrome">
        <span className="clip-vp-title">
          <span className="clip-rec-dot" aria-hidden />
          <span>{ASPECT_NAME[scene.opts.aspect]}</span>
          <span className="opacity-60">
            {W}x{H} {fps}
          </span>
        </span>
        <span className="clip-timecode" data-clip-timecode>
          <span ref={(el) => registerTickTarget("timecode", el)}>00:00.0</span>
          <span className="dim"> / {formatClipTime(scene.durationMs)}</span>
        </span>
      </div>

      <div ref={stageRef} className={`clip-vp-stage relative mx-auto w-full ${previewMax}`}>
        <ClipRenderer
          ref={rendererRef}
          scene={scene}
          images={images}
          loop={loop}
          onTick={handleTick}
          onLoop={onLoop}
          onAutoPause={onAutoPause}
          className="block w-full border border-white/10 shadow-plate"
        />
        {compareScene && (
          <>
            <canvas
              ref={compareCanvasRef}
              width={compareScene.layout.W}
              height={compareScene.layout.H}
              className="clip-compare-canvas"
              style={{ clipPath: `inset(0 0 0 ${seam}%)` }}
              data-clip-compare
              aria-label="Pinned style preview"
            />
            <span className="clip-compare-tag left" aria-hidden>
              CURRENT
            </span>
            <span className="clip-compare-tag right" aria-hidden>
              {(pinnedName ?? "PINNED").toUpperCase()}
            </span>
            <div
              className={"clip-compare-seam" + (seamDrag ? " dragging" : "")}
              style={{ left: `${seam}%` }}
              role="slider"
              aria-label="Compare seam"
              aria-valuemin={8}
              aria-valuemax={92}
              aria-valuenow={Math.round(seam)}
              tabIndex={0}
              data-clip-compare-seam
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                setSeamDrag(true);
                seamTo(e.clientX);
              }}
              onPointerMove={(e) => {
                if (seamDrag) seamTo(e.clientX);
              }}
              onPointerUp={() => setSeamDrag(false)}
              onPointerCancel={() => setSeamDrag(false)}
              onKeyDown={(e) => {
                const dir = e.key === "ArrowLeft" ? -4 : e.key === "ArrowRight" ? 4 : 0;
                if (!dir) return;
                e.preventDefault();
                setSeam((s) => Math.max(8, Math.min(92, s + dir)));
              }}
            >
              <span className="clip-compare-grip" aria-hidden />
            </div>
          </>
        )}

        {/* Hook drag grip: vertical-only, clamped to the text-safe band. The
            canvas draws the hook itself; this is only the hit area. */}
        {hookDrag && (
          <div
            className={"clip-hook-handle" + (hookLive !== null ? " dragging" : "")}
            style={{ top: `${(hookLive ?? hookDrag.frac) * 100}%` }}
            role="slider"
            aria-label="Hook vertical position"
            aria-orientation="vertical"
            aria-valuemin={Math.round(hookDrag.min * 100)}
            aria-valuemax={Math.round(hookDrag.max * 100)}
            aria-valuenow={Math.round((hookLive ?? hookDrag.frac) * 100)}
            tabIndex={hookDrag.locked ? -1 : 0}
            data-clip-hook-handle
            onPointerDown={(e) => {
              if (hookDrag.locked) return;
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              setHookLive(hookFracAt(e.clientY));
            }}
            onPointerMove={(e) => {
              if (hookLive === null) return;
              setHookLive(hookFracAt(e.clientY));
            }}
            onPointerUp={() => {
              if (hookLive === null) return;
              hookDrag.onCommit(Math.round(hookLive * 1000) / 1000);
              setHookLive(null);
            }}
            onPointerCancel={() => setHookLive(null)}
            onKeyDown={(e) => {
              if (hookDrag.locked) return;
              const dir = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
              if (!dir) return;
              e.preventDefault();
              const next = Math.max(
                hookDrag.min,
                Math.min(hookDrag.max, hookDrag.frac + dir * 0.02),
              );
              hookDrag.onCommit(Math.round(next * 1000) / 1000);
            }}
          >
            <span className="clip-hook-grip" aria-hidden>
              HOOK
            </span>
          </div>
        )}

        {/* Sticker drag hit areas over the canvas-rendered stickers. */}
        {stickerDrag &&
          stickerDrag.list.slice(0, 5).map((st, i) => {
            const L = scene.layout;
            const live = stickerLive && stickerLive.i === i ? stickerLive : null;
            const left = ((L.boardX + (live?.x ?? st.x) * L.board) / L.W) * 100;
            const top = ((L.boardY + (live?.y ?? st.y) * L.board) / L.H) * 100;
            return (
              <div
                key={i}
                className={"clip-sticker-handle" + (live ? " dragging" : "")}
                style={{ left: `${left}%`, top: `${top}%` }}
                role="slider"
                aria-label={`Move sticker ${st.id}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((live?.x ?? st.x) * 100)}
                tabIndex={stickerDrag.locked ? -1 : 0}
                data-clip-sticker-handle={i}
                onPointerDown={(e) => {
                  if (stickerDrag.locked) return;
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const p = stickerFracAt(e.clientX, e.clientY);
                  setStickerLive({ i, x: p.x, y: p.y });
                }}
                onPointerMove={(e) => {
                  if (!stickerLive || stickerLive.i !== i) return;
                  const p = stickerFracAt(e.clientX, e.clientY);
                  setStickerLive({ i, x: p.x, y: p.y });
                }}
                onPointerUp={() => {
                  if (!stickerLive || stickerLive.i !== i) return;
                  stickerDrag.onCommit(i, stickerLive.x, stickerLive.y);
                  setStickerLive(null);
                }}
                onPointerCancel={() => setStickerLive(null)}
                onKeyDown={(e) => {
                  if (stickerDrag.locked) return;
                  const dx = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
                  const dy = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
                  if (!dx && !dy) return;
                  e.preventDefault();
                  stickerDrag.onCommit(i, st.x + dx * 0.03, st.y + dy * 0.03);
                }}
              />
            );
          })}
      </div>

      <div className="clip-transport">
        <Button
          tone="ghost"
          size="sm"
          iconOnly
          onClick={onTogglePlay}
          aria-label={playing ? "Pause preview" : "Play preview"}
          data-clip-play
          className="text-parchment-100"
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <Icon d="M7 4 L19 12 L7 20 Z" filled />
          )}
        </Button>
        <Button
          tone="ghost"
          size="sm"
          iconOnly
          onClick={onRestart}
          aria-label="Restart preview"
          data-clip-restart
          className="text-parchment-300"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="5" y1="4" x2="5" y2="20" />
            <path d="M19 5 L9 12 L19 19 Z" fill="currentColor" stroke="none" />
          </svg>
        </Button>
        <span className="spacer" aria-hidden />
        <Button
          tone="ghost"
          size="sm"
          iconOnly
          onClick={onToggleLoop}
          aria-pressed={loop}
          aria-label={loop ? "Loop on" : "Loop off"}
          className={loop ? "text-gold-leaf" : "text-parchment-400"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M17 2 L21 6 L17 10" />
            <path d="M3 12 V10 a4 4 0 0 1 4 -4 h14" />
            <path d="M7 22 L3 18 L7 14" />
            <path d="M21 12 v2 a4 4 0 0 1 -4 4 H3" />
          </svg>
        </Button>
        <Button
          tone="ghost"
          size="sm"
          iconOnly
          onClick={onToggleMute}
          aria-pressed={!muted}
          aria-label={muted ? "Preview sound off" : "Preview sound on"}
          title="Monitor the sfx voices; the full mix lands in the export"
          className={muted ? "text-parchment-400" : "text-gold-leaf"}
        >
          {muted ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 5 L6 9 H2 v6 h4 l5 4 Z" fill="currentColor" stroke="none" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 5 L6 9 H2 v6 h4 l5 4 Z" fill="currentColor" stroke="none" />
              <path d="M15.5 8.5 a5 5 0 0 1 0 7" />
              <path d="M18.5 5.5 a9.5 9.5 0 0 1 0 13" />
            </svg>
          )}
        </Button>
      </div>
    </div>
  );
}
