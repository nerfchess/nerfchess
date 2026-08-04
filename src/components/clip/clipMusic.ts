// Procedural backing tracks for the clip reel. Every track is synthesized
// from oscillators and seeded noise at schedule time - no samples, nothing
// fetched, so exported clips stay license-clean - and every track is a
// deterministic pure function of (tempo, key, pattern constants), so the
// offline Tier 1 render and the live Tier 2 recording produce the same music.
//
// The module mirrors clipAudio's dual-path shape: scheduleClipMusic() plants
// the whole arrangement onto ANY BaseAudioContext (OfflineAudioContext for
// Tier 1 muxing, a live AudioContext for Tier 2), routed through a
// sidechain-style ducking gain that dips under the reel's scheduled sfx
// impacts and payoffs so the knocks and stings always cut through.
//
// "Import your own audio" is handled here too: a decoded AudioBuffer replaces
// the built-in track, trimmed / looped to the reel duration with a 300ms
// fade-out. The buffer never leaves the browser.

import type { ClipAudioEvent } from "./clipScene";
import { mulberry32 } from "./clipScene";

export type MusicTrackId =
  | "phonk"
  | "boss"
  | "chiptune"
  | "lofi"
  | "cathedral"
  | "neon"
  | "wardrums"
  | "quiet";

export const MUSIC_TRACKS: { id: MusicTrackId; label: string }[] = [
  { id: "phonk", label: "Phonk Drift" },
  { id: "boss", label: "Boss Battle" },
  { id: "chiptune", label: "Chiptune Rush" },
  { id: "lofi", label: "Lo-fi Haze" },
  { id: "cathedral", label: "Cathedral Doom" },
  { id: "neon", label: "Neon Runner" },
  { id: "wardrums", label: "War Drums" },
  { id: "quiet", label: "Quiet Storm" },
];

export const DEFAULT_MUSIC_TRACK: MusicTrackId = "phonk";
/** Modest bed under the sfx by default. */
export const DEFAULT_MUSIC_VOLUME = 0.5;

/** A custom track imported by the player. Stays client-side always. */
export interface ClipCustomMusic {
  buffer: AudioBuffer;
  name: string;
}

export interface ClipMusicSelection {
  track: MusicTrackId;
  /** 0..1 music volume knob. */
  volume: number;
  /** When set, replaces the built-in track entirely. */
  custom: ClipCustomMusic | null;
}

// --- Small synth vocabulary --------------------------------------------------

/** Midi note -> Hz. All patterns below are written in midi numbers. */
const N = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Seeded noise buffer local to the music engine (distinct seed from the sfx
 *  noise so the two layers do not phase-cancel identically). */
function musicNoise(ctx: BaseAudioContext): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * 1.0);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  const rng = mulberry32(0xbadbea75);
  for (let i = 0; i < len; i++) data[i] = rng() * 2 - 1;
  return buf;
}

/** 808-ish kick: a sine that drops from `from` Hz down to a sub tail. */
function kick(
  ctx: BaseAudioContext,
  dest: AudioNode,
  at: number,
  opts: { from?: number; to?: number; gain?: number; decay?: number } = {},
): void {
  const { from = 96, to = 38, gain = 0.9, decay = 0.4 } = opts;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(to, at + decay * 0.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.006);
  g.gain.exponentialRampToValueAtTime(0.001, at + decay);
  osc.connect(g).connect(dest);
  osc.start(at);
  osc.stop(at + decay + 0.05);
}

/** Filtered-noise hat / shaker tick. */
function hat(
  ctx: BaseAudioContext,
  noise: AudioBuffer,
  dest: AudioNode,
  at: number,
  opts: { gain?: number; decay?: number; freq?: number } = {},
): void {
  const { gain = 0.1, decay = 0.045, freq = 7500 } = opts;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + decay);
  src.connect(hp).connect(g).connect(dest);
  src.start(at, 0.1);
  src.stop(at + decay + 0.02);
}

/** Noise snare / clap: bandpassed burst with a soft body tone. */
function snare(
  ctx: BaseAudioContext,
  noise: AudioBuffer,
  dest: AudioNode,
  at: number,
  opts: { gain?: number; decay?: number; freq?: number } = {},
): void {
  const { gain = 0.3, decay = 0.16, freq = 1900 } = opts;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = 0.9;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + decay);
  src.connect(bp).connect(g).connect(dest);
  src.start(at, 0.35);
  src.stop(at + decay + 0.02);
}

/** Pitched tom thump: sine drop with a noise attack transient. */
function tom(
  ctx: BaseAudioContext,
  noise: AudioBuffer,
  dest: AudioNode,
  at: number,
  freq: number,
  gain = 0.5,
): void {
  kick(ctx, dest, at, { from: freq, to: freq * 0.55, gain, decay: 0.28 });
  hat(ctx, noise, dest, at, { gain: gain * 0.25, decay: 0.03, freq: 3000 });
}

/** One melodic note through an optional lowpass. */
function note(
  ctx: BaseAudioContext,
  dest: AudioNode,
  at: number,
  opts: {
    type: OscillatorType;
    freq: number;
    dur: number;
    gain: number;
    attack?: number;
    lowpass?: number;
    detune?: number;
  },
): void {
  const osc = ctx.createOscillator();
  osc.type = opts.type;
  osc.frequency.value = opts.freq;
  if (opts.detune) osc.detune.value = opts.detune;
  const g = ctx.createGain();
  const attack = opts.attack ?? 0.01;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(opts.gain, at + attack);
  g.gain.setValueAtTime(opts.gain, at + Math.max(attack, opts.dur * 0.7));
  g.gain.exponentialRampToValueAtTime(0.001, at + opts.dur);
  let head: AudioNode = osc;
  if (opts.lowpass) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = opts.lowpass;
    osc.connect(lp);
    head = lp;
  }
  head.connect(g).connect(dest);
  osc.start(at);
  osc.stop(at + opts.dur + 0.05);
}

/** A chord: one note() per voice. */
function chord(
  ctx: BaseAudioContext,
  dest: AudioNode,
  at: number,
  midis: number[],
  opts: { type: OscillatorType; dur: number; gain: number; attack?: number; lowpass?: number },
): void {
  for (const m of midis) note(ctx, dest, at, { ...opts, freq: N(m) });
}

// --- Track library -----------------------------------------------------------
//
// Each track is (ctx, noise, out, t0, dur): schedule the arrangement onto
// `out` from context time t0 for `dur` seconds. Patterns are bar-looped from
// fixed constants; nothing depends on wall-clock or unseeded randomness.

type TrackFn = (
  ctx: BaseAudioContext,
  noise: AudioBuffer,
  out: AudioNode,
  t0: number,
  dur: number,
) => void;

/** Iterate bars until `dur` is covered. `fn` gets (barIndex, barStartSec, secPerBeat). */
function bars(bpm: number, beatsPerBar: number, dur: number, fn: (bar: number, t: number, spb: number) => void): void {
  const spb = 60 / bpm;
  const barLen = spb * beatsPerBar;
  for (let i = 0; i * barLen < dur; i++) fn(i, i * barLen, spb);
}

/** Slowed-phonk feel: deep 808 sine kicks, halftime snare, filtered-noise
 *  hats, a dark C-minor bass line. */
const phonkDrift: TrackFn = (ctx, noise, out, t0, dur) => {
  const BASS = [
    [36, 36, 39, 36], // C2 C2 Eb2 C2
    [32, 32, 34, 35], // Ab1 Ab1 Bb1 B1 (chromatic creep home)
  ];
  bars(132, 4, dur, (bar, t, spb) => {
    const at = t0 + t;
    // 808 kicks: downbeat plus a dragged off-kick.
    kick(ctx, out, at, { from: 92, to: 34, gain: 0.85, decay: 0.5 });
    kick(ctx, out, at + spb * 2.5, { from: 80, to: 36, gain: 0.7, decay: 0.42 });
    // Halftime snare on beat 3.
    snare(ctx, noise, out, at + spb * 2, { gain: 0.3, decay: 0.2, freq: 1700 });
    // Hats: eighths, with a 16th roll closing every second bar.
    for (let e = 0; e < 8; e++) hat(ctx, noise, out, at + spb * e * 0.5, { gain: 0.075 });
    if (bar % 2 === 1) {
      for (let r = 0; r < 4; r++) {
        hat(ctx, noise, out, at + spb * (3.5 + r * 0.125), { gain: 0.05 + r * 0.012 });
      }
    }
    // Dark bass, one note per beat, saw through a closed lowpass.
    const line = BASS[bar % BASS.length];
    for (let b = 0; b < 4; b++) {
      note(ctx, out, at + spb * b, {
        type: "sawtooth", freq: N(line[b]), dur: spb * 0.92, gain: 0.22, lowpass: 260,
      });
    }
  });
};

/** Driving low pulse plus tense stacked fifths, tritone lean every 4th bar. */
const bossBattle: TrackFn = (ctx, noise, out, t0, dur) => {
  bars(150, 4, dur, (bar, t, spb) => {
    const at = t0 + t;
    const tense = bar % 4 === 3;
    // Pulse: eighth-note low A, relentless.
    for (let e = 0; e < 8; e++) {
      note(ctx, out, at + spb * e * 0.5, {
        type: "sawtooth", freq: N(tense && e >= 4 ? 34 : 33), dur: spb * 0.4, gain: 0.16, lowpass: 420,
      });
    }
    kick(ctx, out, at, { from: 110, to: 45, gain: 0.7, decay: 0.22 });
    kick(ctx, out, at + spb * 2, { from: 110, to: 45, gain: 0.6, decay: 0.2 });
    // Fifth stabs; the tense bar swaps the fifth for a tritone.
    const stab = tense ? [45, 51] : [45, 52];
    chord(ctx, out, at + spb * 1.5, stab, { type: "square", dur: spb * 0.35, gain: 0.09, lowpass: 1800 });
    chord(ctx, out, at + spb * 3.5, stab, { type: "square", dur: spb * 0.3, gain: 0.08, lowpass: 1800 });
    // Bar-end tom fill every other bar.
    if (bar % 2 === 1) {
      tom(ctx, noise, out, at + spb * 3.25, 130, 0.35);
      tom(ctx, noise, out, at + spb * 3.5, 105, 0.4);
      tom(ctx, noise, out, at + spb * 3.75, 85, 0.45);
    }
  });
};

/** Square-wave 16th arps over a square bass: pure 8-bit rush. */
const chiptuneRush: TrackFn = (ctx, noise, out, t0, dur) => {
  const ARP = [
    [57, 60, 64, 67, 57, 60, 64, 69, 57, 60, 64, 67, 64, 60, 64, 71],
    [55, 59, 62, 67, 55, 59, 62, 66, 55, 59, 62, 67, 62, 59, 62, 69],
  ];
  const BASSLINE = [33, 33, 40, 38];
  bars(168, 4, dur, (bar, t, spb) => {
    const at = t0 + t;
    const arp = ARP[bar % ARP.length];
    for (let s = 0; s < 16; s++) {
      note(ctx, out, at + spb * s * 0.25, {
        type: "square", freq: N(arp[s]), dur: spb * 0.22, gain: 0.055, lowpass: 5200,
      });
    }
    for (let b = 0; b < 4; b++) {
      note(ctx, out, at + spb * b, {
        type: "square", freq: N(BASSLINE[b]), dur: spb * 0.85, gain: 0.1, lowpass: 900,
      });
      hat(ctx, noise, out, at + spb * (b + 0.5), { gain: 0.05, decay: 0.03 });
    }
    kick(ctx, out, at, { from: 120, to: 55, gain: 0.5, decay: 0.14 });
    kick(ctx, out, at + spb * 2, { from: 120, to: 55, gain: 0.45, decay: 0.14 });
  });
};

/** Soft triangle seventh chords over a vinyl-ish noise floor, lazy swing. */
const lofiHaze: TrackFn = (ctx, noise, out, t0, dur) => {
  const CHORDS = [
    [53, 57, 60, 64], // Fmaj7
    [52, 55, 59, 62], // Em7
    [50, 53, 57, 60], // Dm7
    [48, 52, 55, 59], // Cmaj7
  ];
  const ROOTS = [41, 40, 38, 36];
  // Vinyl floor: one long looped noise source, heavily lowpassed, very quiet.
  const vinyl = ctx.createBufferSource();
  vinyl.buffer = noise;
  vinyl.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2800;
  const vg = ctx.createGain();
  vg.gain.value = 0.028;
  vinyl.connect(lp).connect(vg).connect(out);
  vinyl.start(t0);
  vinyl.stop(t0 + dur);
  bars(76, 4, dur, (bar, t, spb) => {
    const at = t0 + t;
    const barLen = spb * 4;
    chord(ctx, out, at, CHORDS[bar % 4], {
      type: "triangle", dur: barLen * 0.96, gain: 0.085, attack: 0.35, lowpass: 2400,
    });
    note(ctx, out, at, {
      type: "sine", freq: N(ROOTS[bar % 4]), dur: barLen * 0.9, gain: 0.16, attack: 0.05,
    });
    kick(ctx, out, at, { from: 75, to: 42, gain: 0.42, decay: 0.22 });
    kick(ctx, out, at + spb * 2.62, { from: 75, to: 42, gain: 0.32, decay: 0.2 });
    snare(ctx, noise, out, at + spb * 2, { gain: 0.14, decay: 0.14, freq: 1500 });
    hat(ctx, noise, out, at + spb * 1.05, { gain: 0.035, decay: 0.05, freq: 6000 });
    hat(ctx, noise, out, at + spb * 3.08, { gain: 0.035, decay: 0.05, freq: 6000 });
  });
};

/** Slow organ-like stacked oscillators, a deep drone, funeral pace. */
const cathedralDoom: TrackFn = (ctx, noise, out, t0, dur) => {
  void noise;
  const CHORDS = [
    [38, 50, 53, 57], // Dm
    [34, 46, 50, 53], // Bb
    [31, 43, 50, 55], // Gm
    [33, 45, 49, 52], // A
  ];
  // Continuous D1 drone under everything.
  note(ctx, out, t0, { type: "sine", freq: N(26), dur, gain: 0.12, attack: 1.2 });
  bars(54, 4, dur, (bar, t, spb) => {
    const at = t0 + t;
    const barLen = spb * 4;
    const voices = CHORDS[Math.floor(bar / 2) % 4];
    if (bar % 2 === 0) {
      for (const m of voices) {
        // Organ voicing: fundamental + octave + a faint twelfth per key.
        note(ctx, out, at, { type: "triangle", freq: N(m), dur: barLen * 2, gain: 0.06, attack: 0.8 });
        note(ctx, out, at, { type: "sine", freq: N(m) * 2, dur: barLen * 2, gain: 0.03, attack: 0.9 });
        note(ctx, out, at, { type: "sine", freq: N(m) * 3, dur: barLen * 2, gain: 0.014, attack: 1.0 });
      }
    }
    // A tolling low octave on each bar line.
    kick(ctx, out, at, { from: 60, to: 36, gain: 0.3, decay: 0.9 });
  });
};

/** Synthwave: 16th octave bass arp, four-on-the-floor, glassy fifth pad. */
const neonRunner: TrackFn = (ctx, noise, out, t0, dur) => {
  const ROOTS = [33, 33, 31, 29]; // A A G F
  bars(118, 4, dur, (bar, t, spb) => {
    const at = t0 + t;
    const root = ROOTS[bar % 4];
    for (let s = 0; s < 16; s++) {
      const octave = s % 2 === 1 ? 12 : 0;
      note(ctx, out, at + spb * s * 0.25, {
        type: "sawtooth", freq: N(root + octave), dur: spb * 0.21, gain: 0.11, lowpass: 850,
      });
    }
    for (let b = 0; b < 4; b++) {
      kick(ctx, out, at + spb * b, { from: 105, to: 46, gain: 0.6, decay: 0.16 });
      hat(ctx, noise, out, at + spb * (b + 0.5), { gain: 0.06, decay: 0.05 });
    }
    snare(ctx, noise, out, at + spb * 2, { gain: 0.18, decay: 0.22, freq: 2100 });
    if (bar % 2 === 0) {
      chord(ctx, out, at, [root + 24, root + 31], {
        type: "sawtooth", dur: spb * 8 * 0.95, gain: 0.035, attack: 0.5, lowpass: 2600,
      });
    }
  });
};

/** Toms, deep booms, and rising noise sweeps: percussion only. */
const warDrums: TrackFn = (ctx, noise, out, t0, dur) => {
  bars(100, 4, dur, (bar, t, spb) => {
    const at = t0 + t;
    kick(ctx, out, at, { from: 70, to: 32, gain: 0.85, decay: 0.55 });
    tom(ctx, noise, out, at + spb * 1, 96, 0.45);
    tom(ctx, noise, out, at + spb * 1.5, 96, 0.3);
    tom(ctx, noise, out, at + spb * 2, 128, 0.42);
    tom(ctx, noise, out, at + spb * 3, 76, 0.5);
    tom(ctx, noise, out, at + spb * 3.5, 76, 0.32);
    hat(ctx, noise, out, at + spb * 0.5, { gain: 0.05, decay: 0.04, freq: 4200 });
    hat(ctx, noise, out, at + spb * 2.5, { gain: 0.05, decay: 0.04, freq: 4200 });
    // Rising sweep across the last bar of every 4-bar phrase.
    if (bar % 4 === 3) {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(300, at);
      bp.frequency.exponentialRampToValueAtTime(3800, at + spb * 4);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.012, at);
      g.gain.linearRampToValueAtTime(0.14, at + spb * 4);
      g.gain.linearRampToValueAtTime(0.001, at + spb * 4.1);
      src.connect(bp).connect(g).connect(out);
      src.start(at);
      src.stop(at + spb * 4.2);
    }
  });
};

/** Ambient pads with sparse seeded plucks; barely a pulse at all. */
const quietStorm: TrackFn = (ctx, noise, out, t0, dur) => {
  const PADS = [
    [45, 52, 59, 64], // Am9 flavor
    [41, 48, 57, 64], // Fmaj9 flavor
  ];
  const PLUCKS = [69, 71, 76, 79, 81];
  const rng = mulberry32(0x5107a9); // fixed seed: same plucks every render
  // A soft noise wash under the pads.
  const wash = ctx.createBufferSource();
  wash.buffer = noise;
  wash.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  const wg = ctx.createGain();
  wg.gain.value = 0.018;
  wash.connect(lp).connect(wg).connect(out);
  wash.start(t0);
  wash.stop(t0 + dur);
  bars(60, 4, dur, (bar, t, spb) => {
    const at = t0 + t;
    const barLen = spb * 4;
    if (bar % 4 === 0) {
      chord(ctx, out, at, PADS[Math.floor(bar / 4) % 2], {
        type: "sine", dur: barLen * 4.1, gain: 0.055, attack: 1.4,
      });
    }
    // Sparse plucks: 0-2 per bar at seeded 16th positions.
    const plucksThisBar = rng() < 0.55 ? 1 : rng() < 0.4 ? 2 : 0;
    for (let p = 0; p < plucksThisBar; p++) {
      const step = Math.floor(rng() * 16);
      const midi = PLUCKS[Math.floor(rng() * PLUCKS.length)];
      note(ctx, out, at + spb * step * 0.25, {
        type: "triangle", freq: N(midi), dur: 1.1, gain: 0.09, attack: 0.005, lowpass: 3200,
      });
    }
  });
};

const TRACK_FNS: Record<MusicTrackId, TrackFn> = {
  phonk: phonkDrift,
  boss: bossBattle,
  chiptune: chiptuneRush,
  lofi: lofiHaze,
  cathedral: cathedralDoom,
  neon: neonRunner,
  wardrums: warDrums,
  quiet: quietStorm,
};

// --- Ducking -----------------------------------------------------------------

/** Event kinds the music dips under (the reel's hits and payoffs). */
const DUCK_KINDS = new Set<ClipAudioEvent["kind"]>(["impact", "capture", "verdict", "card"]);

/** Sidechain-style envelope, sampled at 50Hz: dip quickly into each impact,
 *  recover over ~0.4s. Deterministic (a pure function of the schedule), so
 *  offline and live renders duck identically. */
function duckCurve(events: ClipAudioEvent[], durSec: number): Float32Array {
  const rate = 50;
  const n = Math.max(2, Math.ceil(durSec * rate));
  const curve = new Float32Array(n);
  const dips = events.filter((e) => DUCK_KINDS.has(e.kind));
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    let g = 1;
    for (const ev of dips) {
      const depth = ev.kind === "impact" || ev.kind === "verdict" ? 0.28 : 0.55;
      const dt = t - ev.t / 1000;
      let f = 1;
      if (dt >= -0.06 && dt < 0.08) {
        // Fast dip into the hit.
        f = dt < 0 ? 1 - (1 - depth) * ((dt + 0.06) / 0.06) : depth;
      } else if (dt >= 0.08 && dt < 0.46) {
        // Linear recovery.
        f = depth + (1 - depth) * ((dt - 0.08) / 0.38);
      }
      if (f < g) g = f;
    }
    curve[i] = g;
  }
  return curve;
}

// --- The one shared scheduler ------------------------------------------------

/** Overall bed level: the music sits under clipAudio's 0.85 sfx master. */
const MUSIC_BED = 0.42;

/** Schedule the selected music onto `ctx` from context time `t0`, covering
 *  `durationMs`, ducked under the given sfx event schedule. Shared verbatim by
 *  the offline (Tier 1) and live (Tier 2) paths. */
export function scheduleClipMusic(
  ctx: BaseAudioContext,
  dest: AudioNode,
  selection: ClipMusicSelection,
  events: ClipAudioEvent[],
  durationMs: number,
  t0: number,
): void {
  const dur = Math.max(0.5, durationMs / 1000);
  const volume = Math.max(0, Math.min(1, selection.volume));
  if (volume <= 0) return;

  // bus -> duck -> envelope (fade-in + 300ms fade-out) -> dest
  const bus = ctx.createGain();
  bus.gain.value = MUSIC_BED * volume * (selection.custom ? 1.6 : 1);
  const duck = ctx.createGain();
  // A single value curve owns the whole duck envelope; no other automation
  // may touch this param or setValueCurveAtTime throws for overlap.
  duck.gain.setValueCurveAtTime(duckCurve(events, dur), t0, dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.linearRampToValueAtTime(1, t0 + 0.12);
  env.gain.setValueAtTime(1, t0 + Math.max(0.12, dur - 0.3));
  env.gain.linearRampToValueAtTime(0.0001, t0 + dur);
  bus.connect(duck).connect(env).connect(dest);

  if (selection.custom) {
    // Imported audio: trimmed to the reel, looped when shorter than it.
    const src = ctx.createBufferSource();
    src.buffer = selection.custom.buffer;
    src.loop = selection.custom.buffer.duration < dur;
    src.connect(bus);
    src.start(t0);
    src.stop(t0 + dur);
    return;
  }
  const noise = musicNoise(ctx);
  TRACK_FNS[selection.track](ctx, noise, bus, t0, dur);
}
