"use client";

// The studio VIEWPORT: the preview canvas dressed in editor chrome. A REC
// strip with the layout name and resolution readout, a live mono timecode
// (written straight into a DOM node by the transport tick, never through
// React state), viewfinder corner brackets, and a transport row of inline
// SVG stroke icons on the sanctioned Button primitive.

import type { MutableRefObject } from "react";
import { Button } from "@/components/ui/Button";
import { ClipRenderer, type ClipRendererHandle } from "../ClipRenderer";
import type { ClipScene } from "../clipScene";
import { ASPECT_NAME } from "../clipOptions";

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
}: Props) {
  const { W, H } = scene.layout;
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
            {W}x{H} 30
          </span>
        </span>
        <span className="clip-timecode" data-clip-timecode>
          <span ref={(el) => registerTickTarget("timecode", el)}>00:00.0</span>
          <span className="dim"> / {formatClipTime(scene.durationMs)}</span>
        </span>
      </div>

      <ClipRenderer
        ref={rendererRef}
        scene={scene}
        images={images}
        loop={loop}
        onTick={onTick}
        onLoop={onLoop}
        onAutoPause={onAutoPause}
        className={`mx-auto block w-full ${previewMax} border border-white/10 shadow-plate`}
      />

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
