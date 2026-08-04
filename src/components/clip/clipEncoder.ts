// Clip encoding, three tiers, detected automatically:
//
//   Tier 1 — WebCodecs + mediabunny. The deterministic scene is rendered
//            OFFLINE frame-by-frame (seek to i/30, draw, add with
//            backpressure) into an MP4 (avc1 + AAC) or, when only Opus can be
//            encoded, a WebM (vp9/vp8/av1 + Opus; opus-in-mp4 support is
//            patchy so the container follows the audio codec). Frame-exact
//            with the preview, faster than realtime, ~10 Mbps.
//   Tier 2 — MediaRecorder realtime: canvas.captureStream(30) plus a live
//            synth audio track, mp4 mime types tried before webm.
//   Tier 3 — unsupported; the modal reports it honestly.
//
// mediabunny is imported dynamically so the whole encoder stays out of the
// initial bundle (the clip modal itself is already a dynamic import).

import type { ClipScene } from "./clipScene";
import { renderClipFrame } from "./clipScene";
import { renderClipAudio, startLiveClipAudio, type ClipAudioOptions } from "./clipAudio";

const FPS = 30;
const VIDEO_BITRATE = 10_000_000;
const AUDIO_BITRATE = 128_000;

export interface EncodeSupport {
  tier: 1 | 2 | 3;
  /** Container the encode will produce ("mp4" | "webm"), tiers 1-2 only. */
  container: "mp4" | "webm" | null;
  /** Human-readable description for the modal readout. */
  detail: string;
  /** Tier 1 plumbing, resolved during detection. */
  t1?: {
    video: "avc" | "vp9" | "vp8" | "av1";
    audio: "aac" | "opus" | null;
  };
  /** Tier 2 mime type. */
  t2MimeType?: string;
}

function pickRecorderMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return (
    [
      'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
      'video/mp4;codecs="avc1.42E01E"',
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp8",
      "video/webm",
    ].find((m) => MediaRecorder.isTypeSupported(m)) ?? null
  );
}

/** Probe what this browser can do for a WxH clip. Cheap enough to run on
 *  every modal open; results feed both the encode and the UI readout. */
export async function detectEncodeSupport(
  width: number,
  height: number,
  wantAudio: boolean,
): Promise<EncodeSupport> {
  if (typeof window !== "undefined" && typeof VideoEncoder !== "undefined") {
    try {
      const mb = await import("mediabunny");
      const dims = { width, height, bitrate: VIDEO_BITRATE };
      const avc = await mb.canEncodeVideo("avc", dims);
      const aac = wantAudio ? await mb.canEncodeAudio("aac", { bitrate: AUDIO_BITRATE }) : false;
      if (avc && (!wantAudio || aac)) {
        return {
          tier: 1,
          container: "mp4",
          detail: wantAudio ? "MP4 (H.264 + AAC), rendered offline" : "MP4 (H.264), rendered offline",
          t1: { video: "avc", audio: aac ? "aac" : null },
        };
      }
      if (wantAudio) {
        const opus = await mb.canEncodeAudio("opus", { bitrate: AUDIO_BITRATE });
        if (opus) {
          for (const v of ["vp9", "vp8", "av1"] as const) {
            if (await mb.canEncodeVideo(v, dims)) {
              return {
                tier: 1,
                container: "webm",
                detail: `WebM (${v.toUpperCase()} + Opus), rendered offline`,
                t1: { video: v, audio: "opus" },
              };
            }
          }
        }
      }
      if (avc) {
        // Sound was requested but no audio codec encodes; a silent offline
        // MP4 still beats a realtime recording, unless the recorder can
        // actually deliver audio.
        const mime = pickRecorderMime();
        if (!wantAudio || !mime) {
          return {
            tier: 1,
            container: "mp4",
            detail: "MP4 (H.264, no audio codec available), rendered offline",
            t1: { video: "avc", audio: null },
          };
        }
      }
    } catch {
      // fall through to the recorder path
    }
  }
  const mime = pickRecorderMime();
  if (mime && typeof HTMLCanvasElement !== "undefined") {
    const container = mime.startsWith("video/mp4") ? "mp4" : "webm";
    return {
      tier: 2,
      container,
      detail: `${container.toUpperCase()} (MediaRecorder, realtime)`,
      t2MimeType: mime,
    };
  }
  return { tier: 3, container: null, detail: "No supported video encoder in this browser" };
}

export interface EncodeResult {
  blob: Blob;
  container: "mp4" | "webm";
  tier: 1 | 2;
}

/** Thrown (and caught by callers) when a re-render supersedes an encode. */
export class EncodeCancelled extends Error {
  constructor() {
    super("encode cancelled");
    this.name = "EncodeCancelled";
  }
}

/** Tier 1: frame-exact offline render + mux. `cancelled` is polled between
 *  frames so the auto-encode can be superseded by a settings change without
 *  burning the rest of the render. */
export async function encodeClipOffline(
  scene: ClipScene,
  images: Map<string, HTMLImageElement>,
  support: EncodeSupport,
  /** The whole audio mix: sfx on/off + level + voice mutes + music bed. */
  mix: ClipAudioOptions,
  onProgress?: (frac: number) => void,
  cancelled?: () => boolean,
): Promise<EncodeResult> {
  const mb = await import("mediabunny");
  const t1 = support.t1!;
  const { W, H } = scene.layout;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("no 2d context");

  const target = new mb.BufferTarget();
  const output = new mb.Output({
    format: support.container === "mp4" ? new mb.Mp4OutputFormat() : new mb.WebMOutputFormat(),
    target,
  });
  const videoSource = new mb.CanvasSource(canvas, {
    codec: t1.video,
    bitrate: VIDEO_BITRATE,
  });
  output.addVideoTrack(videoSource, { frameRate: FPS });

  let audioSource: InstanceType<typeof mb.AudioBufferSource> | null = null;
  let audioBuffer: AudioBuffer | null = null;
  if ((mix.sfx !== false || mix.music) && t1.audio) {
    audioBuffer = await renderClipAudio(scene.audio, scene.durationMs, mix);
    if (audioBuffer) {
      audioSource = new mb.AudioBufferSource({
        codec: t1.audio,
        bitrate: AUDIO_BITRATE,
      });
      output.addAudioTrack(audioSource);
    }
  }

  await output.start();

  const totalFrames = Math.max(1, Math.ceil((scene.durationMs / 1000) * FPS));
  for (let i = 0; i < totalFrames; i++) {
    if (cancelled?.()) {
      videoSource.close();
      await output.cancel();
      throw new EncodeCancelled();
    }
    const tMs = Math.min((i * 1000) / FPS, scene.durationMs);
    renderClipFrame(scene, ctx, tMs, images);
    // Awaiting add() respects encoder backpressure, per mediabunny's contract.
    await videoSource.add(i / FPS, 1 / FPS);
    onProgress?.((i + 1) / totalFrames);
  }
  videoSource.close();
  if (audioSource && audioBuffer) {
    await audioSource.add(audioBuffer);
    audioSource.close();
  }
  await output.finalize();

  const buffer = target.buffer;
  if (!buffer || buffer.byteLength === 0) throw new Error("empty encode");
  const mime = support.container === "mp4" ? "video/mp4" : "video/webm";
  return { blob: new Blob([buffer], { type: mime }), container: support.container!, tier: 1 };
}

export interface RealtimeRecording {
  /** Resolves with the finished clip once stop() fires (or the run ends). */
  done: Promise<EncodeResult>;
  stop: () => void;
}

/** Tier 2: record the live preview canvas (plus live synth audio) in realtime.
 *  The caller restarts the replay in sync and calls stop() when it completes. */
export function recordClipRealtime(
  canvas: HTMLCanvasElement,
  scene: ClipScene,
  support: EncodeSupport,
  mix: ClipAudioOptions,
): RealtimeRecording {
  const mimeType = support.t2MimeType!;
  const container = support.container!;
  const stream = canvas.captureStream(FPS);
  const live =
    mix.sfx !== false || mix.music
      ? startLiveClipAudio(scene.audio, scene.durationMs, mix)
      : null;
  if (live) {
    for (const track of live.stream.getAudioTracks()) stream.addTrack(track);
  }
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: VIDEO_BITRATE,
    audioBitsPerSecond: AUDIO_BITRATE,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const done = new Promise<EncodeResult>((resolve, reject) => {
    recorder.onstop = () => {
      live?.stop();
      for (const track of stream.getTracks()) track.stop();
      const blob = new Blob(chunks, { type: mimeType.split(";")[0] });
      if (blob.size === 0) reject(new Error("empty recording"));
      else resolve({ blob, container, tier: 2 });
    };
    recorder.onerror = () => {
      live?.stop();
      reject(new Error("recorder error"));
    };
  });
  recorder.start(250);
  live?.start();
  return {
    done,
    stop: () => {
      if (recorder.state !== "inactive") recorder.stop();
    },
  };
}
