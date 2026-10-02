// Offline render of every chess-feel cue in src/lib/sounds.ts, in BOTH themes,
// through a minimal Web Audio mock (gain / oscillator / bandpass biquad /
// buffer source, with setValueAtTime + linear/exponential ramps). Samples are
// decoded from public/sound/lichess with ffmpeg. Reports, per cue at the
// default volume 0.8: duration to -60 dB, sample peak, and the max 50ms RMS
// window (a crude loudness proxy), plus dB relative to the move click.
//
//   ./node_modules/.bin/tsx render-sounds.ts
//
// Read-only on the repo: imports sounds.ts by absolute path; writes nothing.
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const SR = 48000;
const RENDER_S = 2.0;
const N = Math.round(SR * RENDER_S);

type Ev = { kind: "set" | "lin" | "exp"; v: number; t: number };
class Param {
  value: number;
  ev: Ev[] = [];
  sorted: Ev[] | null = null;
  constructor(v: number) {
    this.value = v;
  }
  setValueAtTime(v: number, t: number) {
    this.ev.push({ kind: "set", v, t });
    return this;
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.ev.push({ kind: "lin", v, t });
    return this;
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    this.ev.push({ kind: "exp", v, t });
    return this;
  }
  at(t: number): number {
    if (this.ev.length === 0) return this.value;
    const ev = this.sorted ?? (this.sorted = [...this.ev].sort((a, b) => a.t - b.t));
    let prev: { v: number; t: number } = { v: this.value, t: 0 };
    for (const e of ev) {
      if (e.t <= t) {
        prev = { v: e.v, t: e.t };
        continue;
      }
      if (e.kind === "set") return prev.v;
      const span = e.t - prev.t;
      const x = span <= 0 ? 1 : (t - prev.t) / span;
      if (e.kind === "lin") return prev.v + (e.v - prev.v) * x;
      if (prev.v <= 0 || e.v <= 0) return prev.v;
      return prev.v * Math.pow(e.v / prev.v, x);
    }
    return prev.v;
  }
}

abstract class Node {
  inputs: Node[] = [];
  out: Float32Array | null = null;
  connect(n: Node) {
    n.inputs.push(this);
    return n;
  }
  input(): Float32Array {
    const s = new Float32Array(N);
    for (const i of this.inputs) {
      const b = i.render();
      for (let k = 0; k < N; k++) s[k] += b[k];
    }
    return s;
  }
  render(): Float32Array {
    if (!this.out) this.out = this.process();
    return this.out;
  }
  abstract process(): Float32Array;
}
class Dest extends Node {
  process() {
    return this.input();
  }
}
class Gain extends Node {
  gain = new Param(1);
  process() {
    const s = this.input();
    for (let k = 0; k < N; k++) s[k] *= this.gain.at(k / SR);
    return s;
  }
}
class Osc extends Node {
  type = "sine";
  frequency = new Param(440);
  detune = new Param(0);
  t0 = Infinity;
  t1 = Infinity;
  start(t = 0) {
    this.t0 = t;
  }
  stop(t: number) {
    this.t1 = t;
  }
  process() {
    const s = new Float32Array(N);
    let ph = 0;
    for (let k = 0; k < N; k++) {
      const t = k / SR;
      if (t < this.t0 || t >= this.t1) continue;
      const f = this.frequency.at(t) * Math.pow(2, this.detune.at(t) / 1200);
      ph += f / SR;
      const p = ph - Math.floor(ph);
      let v = 0;
      if (this.type === "sine") v = Math.sin(2 * Math.PI * p);
      else if (this.type === "square") v = p < 0.5 ? 1 : -1;
      else if (this.type === "sawtooth") v = 2 * p - 1;
      else v = p < 0.25 ? 4 * p : p < 0.75 ? 2 - 4 * p : 4 * p - 4;
      s[k] = v;
    }
    return s;
  }
}
class Biquad extends Node {
  type = "lowpass";
  frequency = new Param(350);
  Q = new Param(1);
  process() {
    const x = this.input();
    const y = new Float32Array(N);
    const w0 = (2 * Math.PI * this.frequency.value) / SR;
    const alpha = Math.sin(w0) / (2 * this.Q.value);
    // RBJ band-pass, constant 0 dB peak gain (the Web Audio "bandpass").
    const b0 = alpha, b1 = 0, b2 = -alpha;
    const a0 = 1 + alpha, a1 = -2 * Math.cos(w0), a2 = 1 - alpha;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let k = 0; k < N; k++) {
      const v = (b0 * x[k] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = x[k]; y2 = y1; y1 = v;
      y[k] = v;
    }
    return y;
  }
}
class Buf {
  sampleRate: number;
  data: Float32Array;
  length: number;
  constructor(len: number, sr: number) {
    this.sampleRate = sr;
    this.length = len;
    this.data = new Float32Array(len);
  }
  getChannelData() {
    return this.data;
  }
}
class Src extends Node {
  buffer: Buf | null = null;
  playbackRate = new Param(1);
  t0 = Infinity;
  t1 = Infinity;
  start(t = 0) {
    this.t0 = t;
  }
  stop(t: number) {
    this.t1 = t;
  }
  process() {
    const s = new Float32Array(N);
    if (!this.buffer) return s;
    const d = this.buffer.data;
    const step = (this.buffer.sampleRate / SR) * this.playbackRate.value;
    let pos = 0;
    for (let k = 0; k < N; k++) {
      const t = k / SR;
      if (t < this.t0 || t >= this.t1) continue;
      const i = Math.floor(pos);
      if (i + 1 >= d.length) break;
      const f = pos - i;
      s[k] = d[i] * (1 - f) + d[i + 1] * f;
      pos += step;
    }
    return s;
  }
}

let dest = new Dest();
class Ctx {
  sampleRate = SR;
  currentTime = 0;
  state = "running";
  get destination() {
    return dest;
  }
  resume() {
    return Promise.resolve();
  }
  createGain() {
    return new Gain();
  }
  createOscillator() {
    return new Osc();
  }
  createBiquadFilter() {
    return new Biquad();
  }
  createBufferSource() {
    return new Src();
  }
  createBuffer(_ch: number, len: number, sr: number) {
    return new Buf(len, sr);
  }
  decodeAudioData(raw: ArrayBuffer) {
    const f32 = new Float32Array(raw);
    const b = new Buf(f32.length, SR);
    b.data.set(f32);
    return Promise.resolve(b);
  }
}

const store = new Map<string, string>();
const g = globalThis as Record<string, unknown>;
g.window = globalThis;
g.AudioContext = Ctx;
g.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
g.fetch = async (url: string) => {
  const file = "./public" + url;
  const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "f32le", "-ac", "1", "-ar", String(SR), "-"], {
    maxBuffer: 64 << 20,
  });
  const ab = pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength);
  return { ok: true, arrayBuffer: async () => ab };
};

function measure(s: Float32Array) {
  let peak = 0;
  for (const v of s) peak = Math.max(peak, Math.abs(v));
  let last = 0;
  for (let k = 0; k < N; k++) if (Math.abs(s[k]) > 0.001) last = k; // -60 dBFS
  const W = Math.round(SR * 0.05);
  let acc = 0, maxRms = 0;
  for (let k = 0; k < N; k++) {
    acc += s[k] * s[k];
    if (k >= W) acc -= s[k - W] * s[k - W];
    if (k >= W - 1) maxRms = Math.max(maxRms, Math.sqrt(Math.max(0, acc) / W));
  }
  return { peak, durMs: Math.round((last / SR) * 1000), rms50: maxRms };
}
const db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -Infinity);

async function main() {
  const S = await import("../../../../../src/lib/sounds.ts");
  S.setVolume(0.8);
  S.setMuted(false);
  S.preloadSounds();
  await new Promise((r) => setTimeout(r, 1500));
  const cues: [string, () => void][] = [
    ["move", () => S.playMove()],
    ["move (opponent)", () => S.playMove({ opponent: true })],
    ["capture", () => S.playCapture()],
    ["castle", () => S.playCastle()],
    ["promote (move+flourish)", () => S.playMoveCue({ promotion: "q" })],
    ["check (onMe)", () => S.playCheck({ onMe: true })],
    ["check (delivered)", () => S.playCheck({ onMe: false })],
    ["low time (10s)", () => S.playLowTime()],
    ["urgent tick (5s)", () => S.playUrgentTick()],
    ["win", () => S.playGameOver("win")],
    ["loss", () => S.playGameOver("loss")],
    ["draw", () => S.playGameOver("draw")],
    ["card play", () => S.playCardUse("some_card")],
    ["nerf", () => S.playNerf()],
    ["buff (blessing cue)", () => S.playCueBlessing()],
    ["match found (game start)", () => S.playGameStart()],
    ["notify (unused export)", () => S.playNotify()],
    ["challenge (social notify)", () => S.playChallenge()],
    ["select", () => S.playSelect()],
    ["illegal", () => S.playIllegal()],
    ["draft chime", () => S.playDraftChime()],
    ["explosion", () => S.playExplosion()],
  ];
  const out: Record<string, Record<string, unknown>> = {};
  for (const theme of ["lichess", "classic"] as const) {
    S.configureSoundPrefs({ theme });
    let ref = 0;
    const rows: string[] = [];
    for (const [name, fn] of cues) {
      dest = new Dest();
      fn();
      const m = measure(dest.render());
      if (name === "move") ref = m.rms50;
      out[`${theme}:${name}`] = { ...m, rmsDbVsMove: +(db(m.rms50) - db(ref)).toFixed(1) };
      rows.push(
        `${theme.padEnd(8)} ${name.padEnd(28)} dur ${String(m.durMs).padStart(5)}ms  peak ${m.peak.toFixed(3)} (${db(m.peak).toFixed(1)} dBFS)  rms50 ${m.rms50.toFixed(3)}  vs move ${(db(m.rms50) - db(ref)).toFixed(1)} dB`,
      );
    }
    console.log(rows.join("\n"));
  }
  fs.writeFileSync(
    "docs/audit/2026-10-02/repro/feel-verify/sound-levels.json",
    JSON.stringify(out, null, 2),
  );
}
main();
