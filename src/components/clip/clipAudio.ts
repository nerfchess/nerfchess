// Self-contained clip audio: a tiny deterministic synthesizer, no sample
// files, so exported clips stay license-clean. The same event schedule renders
// two ways:
//
//   renderClipAudio  — the whole schedule into an OfflineAudioContext,
//                      returning an AudioBuffer for Tier 1 (mediabunny) muxing
//   startLiveClipAudio — the same schedule scheduled live into a
//                      MediaStreamAudioDestination for Tier 2 (MediaRecorder)
//
// Sounds: a noise-burst knock for moves, a brighter knock plus a flash tone
// for captures, a rising two-tone ding for card plays (pitch and shimmer scale
// with tier), and a three-note sting under the verdict stamp.

import type { ClipAudioEvent } from "./clipScene";
import { mulberry32 } from "./clipScene";

const SAMPLE_RATE = 44100;
const MASTER_GAIN = 0.85;

/** One shared noise buffer, generated from a fixed seed so offline and live
 *  renders knock identically. */
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const len = Math.floor(SAMPLE_RATE * 0.25);
  const buf = ctx.createBuffer(1, len, SAMPLE_RATE);
  const data = buf.getChannelData(0);
  const rng = mulberry32(0xc0ffee);
  for (let i = 0; i < len; i++) data[i] = rng() * 2 - 1;
  return buf;
}

function knock(
  ctx: BaseAudioContext,
  noise: AudioBuffer,
  dest: AudioNode,
  at: number,
  opts: { freq: number; gain: number; decay: number },
): void {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = opts.freq;
  bp.Q.value = 1.4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(opts.gain, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + opts.decay);
  src.connect(bp).connect(g).connect(dest);
  src.start(at);
  src.stop(at + opts.decay + 0.02);
}

function tone(
  ctx: BaseAudioContext,
  dest: AudioNode,
  at: number,
  opts: {
    type: OscillatorType;
    from: number;
    to?: number;
    gain: number;
    attack?: number;
    decay: number;
  },
): void {
  const osc = ctx.createOscillator();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.from, at);
  if (opts.to !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), at + opts.decay);
  }
  const g = ctx.createGain();
  const attack = opts.attack ?? 0.008;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(opts.gain, at + attack);
  g.gain.exponentialRampToValueAtTime(0.001, at + opts.decay);
  osc.connect(g).connect(dest);
  osc.start(at);
  osc.stop(at + opts.decay + 0.02);
}

/** Schedule every event into `ctx` starting at context time `t0`. Shared by
 *  the offline and live paths, so both produce the same soundtrack. */
function scheduleEvents(
  ctx: BaseAudioContext,
  dest: AudioNode,
  events: ClipAudioEvent[],
  t0: number,
): void {
  const noise = noiseBuffer(ctx);
  const master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(dest);

  for (const ev of events) {
    const at = t0 + ev.t / 1000;
    switch (ev.kind) {
      case "move":
        knock(ctx, noise, master, at, { freq: 1700, gain: 0.5, decay: 0.07 });
        knock(ctx, noise, master, at + 0.004, { freq: 650, gain: 0.35, decay: 0.1 });
        break;
      case "capture":
        knock(ctx, noise, master, at, { freq: 2300, gain: 0.65, decay: 0.06 });
        knock(ctx, noise, master, at + 0.004, { freq: 480, gain: 0.5, decay: 0.14 });
        tone(ctx, master, at + 0.01, {
          type: "triangle", from: 880, to: 420, gain: 0.22, decay: 0.16,
        });
        break;
      case "card": {
        // Rising two-tone ding, a semitone ladder scaled by tier.
        const tier = ev.tier ?? 3;
        const base = 440 * Math.pow(2, (tier - 3) / 12);
        tone(ctx, master, at, {
          type: "sine", from: base, gain: 0.3, decay: 0.22,
        });
        tone(ctx, master, at + 0.11, {
          type: "sine", from: base * 1.5, gain: 0.34, decay: 0.34,
        });
        if (tier >= 6) {
          // High-tier shimmer: a faint octave sparkle on top.
          tone(ctx, master, at + 0.2, {
            type: "sine", from: base * 3, gain: 0.12, decay: 0.4,
          });
        }
        break;
      }
      case "verdict":
        tone(ctx, master, at, { type: "square", from: 196, gain: 0.16, decay: 0.5 });
        tone(ctx, master, at + 0.05, { type: "triangle", from: 294, gain: 0.22, decay: 0.55 });
        tone(ctx, master, at + 0.16, { type: "triangle", from: 392, gain: 0.26, decay: 0.75 });
        knock(ctx, noise, master, at, { freq: 320, gain: 0.4, decay: 0.3 });
        break;
    }
  }
}

/** Render the whole schedule offline for Tier 1 muxing. */
export async function renderClipAudio(
  events: ClipAudioEvent[],
  durationMs: number,
): Promise<AudioBuffer | null> {
  if (typeof OfflineAudioContext === "undefined") return null;
  const frames = Math.max(1, Math.ceil((durationMs / 1000) * SAMPLE_RATE));
  const ctx = new OfflineAudioContext(2, frames, SAMPLE_RATE);
  scheduleEvents(ctx, ctx.destination, events, 0);
  return ctx.startRendering();
}

export interface LiveClipAudio {
  /** Audio track stream to merge into the MediaRecorder stream. */
  stream: MediaStream;
  /** Begin playback of the schedule NOW (call in sync with the replay). */
  start: () => void;
  stop: () => void;
}

/** The same schedule as a live MediaStream for Tier 2 recording. */
export function startLiveClipAudio(events: ClipAudioEvent[]): LiveClipAudio | null {
  if (typeof AudioContext === "undefined") return null;
  try {
    const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    const dest = ctx.createMediaStreamDestination();
    return {
      stream: dest.stream,
      start: () => {
        void ctx.resume();
        scheduleEvents(ctx, dest, events, ctx.currentTime + 0.05);
      },
      stop: () => {
        void ctx.close();
      },
    };
  } catch {
    return null;
  }
}
