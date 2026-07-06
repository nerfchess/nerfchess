// Game sounds, in two themes (Settings > Sound):
//  - "lichess": the standard sound set from lichess.org, vendored under
//    /public/sound/lichess (lila is AGPL — see the README in that directory).
//  - "classic": the original synthesized wood-knock clicks (Web Audio only).
// Sample playback always falls back to the synth while a file is still
// loading or failed to load, so a sound never silently goes missing.

let ctx: AudioContext | null = null;
let muted = false;
// Interface blips (piece select) can be disabled separately from game sounds.
let uiSounds = true;

export function setUiSounds(v: boolean) {
  uiSounds = v;
}
let noiseBuf: AudioBuffer | null = null;
let volume = 0.8;

export type SoundTheme = "lichess" | "classic";

// Per-event sound preferences (Settings > Sound). `enabled` is the master
// switch; the rest gate individual game sounds.
const soundPrefs = {
  enabled: true,
  move: true,
  capture: true,
  check: true,
  gameEnd: true,
  /** Card/board effect sounds (explosions, chains, shields, poofs...). */
  effects: true,
  theme: "lichess" as SoundTheme,
};

export function configureSoundPrefs(prefs: Partial<typeof soundPrefs>) {
  Object.assign(soundPrefs, prefs);
}

export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("dc:volume", String(volume));
    } catch {}
  }
}

export function getVolume(): number {
  if (typeof window === "undefined") return volume;
  try {
    const s = localStorage.getItem("dc:volume");
    if (s !== null) volume = Math.max(0, Math.min(1, parseFloat(s) || 0));
  } catch {}
  return volume;
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// --- Lichess sample playback ---
// Decoded once, cached forever. `null` marks a failed load so we stop
// retrying and just use the synth fallback.

type SampleName =
  | "Move"
  | "Capture"
  | "Select"
  | "GenericNotify"
  | "SocialNotify"
  | "LowTime"
  | "CountDown0"
  | "Error";

const samples = new Map<SampleName, AudioBuffer | null>();
const samplesLoading = new Set<SampleName>();

function loadSample(name: SampleName) {
  if (samples.has(name) || samplesLoading.has(name)) return;
  if (typeof window === "undefined") return;
  const a = audio();
  if (!a) return;
  samplesLoading.add(name);
  fetch(`/sound/lichess/${name}.mp3`)
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(String(res.status)))))
    .then((raw) => a.decodeAudioData(raw))
    .then((decoded) => samples.set(name, decoded))
    .catch(() => samples.set(name, null))
    .finally(() => samplesLoading.delete(name));
}

/** Fetch and decode every sample up front so the first move of a game is
 *  never the one that pays the network round trip. Safe to call repeatedly. */
export function preloadSounds() {
  if (typeof window === "undefined") return;
  const names: SampleName[] = [
    "Move",
    "Capture",
    "Select",
    "GenericNotify",
    "SocialNotify",
    "LowTime",
    "CountDown0",
    "Error",
  ];
  for (const name of names) loadSample(name);
}

/** Play a lichess sample. Returns true when the sound was handled (played, or
 *  intentionally silent because the player muted); false = use the fallback. */
function playSample(name: SampleName, gain = 1): boolean {
  if (soundPrefs.theme !== "lichess") return false;
  if (isMuted()) return true;
  const a = audio();
  if (!a) return false;
  const buf = samples.get(name);
  if (buf === undefined) {
    loadSample(name);
    return false;
  }
  if (buf === null) return false;
  const src = a.createBufferSource();
  src.buffer = buf;
  const g = a.createGain();
  g.gain.value = gain * getVolume();
  src.connect(g);
  g.connect(a.destination);
  src.start();
  return true;
}

function noise(a: AudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === a.sampleRate) return noiseBuf;
  const len = Math.floor(a.sampleRate * 0.25);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  noiseBuf = buf;
  return buf;
}

export function setMuted(v: boolean) {
  muted = v;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("dc:muted", v ? "1" : "0");
    } catch {}
  }
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return muted;
  try {
    const s = localStorage.getItem("dc:muted");
    if (s !== null) muted = s === "1";
  } catch {}
  return muted;
}

interface KnockOpts {
  /** Bandpass center for the noise burst — higher = crisper, sharper. */
  filterFreq: number;
  /** Bandpass Q — higher = more tonal/resonant. */
  filterQ?: number;
  /** Duration of the noise transient in seconds. */
  dur: number;
  /** Peak gain for the noise transient. */
  gain?: number;
  /** Optional body thump (low sine) frequency. */
  bodyFreq?: number;
  /** Body thump gain. */
  bodyGain?: number;
  /** Body thump duration. */
  bodyDur?: number;
  /** Delay before this knock starts (seconds). */
  delay?: number;
  /** Master gain multiplier. */
  master?: number;
}

function knock(opts: KnockOpts) {
  if (isMuted()) return;
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + (opts.delay ?? 0);

  const master = a.createGain();
  master.gain.value = (opts.master ?? 1.0) * getVolume();
  master.connect(a.destination);

  // --- Filtered noise burst (the "click") ---
  const src = a.createBufferSource();
  src.buffer = noise(a);

  const bp = a.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = opts.filterFreq;
  bp.Q.value = opts.filterQ ?? 4;

  const g = a.createGain();
  const peak = opts.gain ?? 0.55;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);

  src.connect(bp);
  bp.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + opts.dur + 0.02);

  // --- Optional low body thump for capture / bigger clicks ---
  if (opts.bodyFreq) {
    const osc = a.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(opts.bodyFreq, t0);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(40, opts.bodyFreq * 0.55),
      t0 + (opts.bodyDur ?? 0.07)
    );

    const bg = a.createGain();
    const bGain = opts.bodyGain ?? 0.4;
    bg.gain.setValueAtTime(0, t0);
    bg.gain.linearRampToValueAtTime(bGain, t0 + 0.004);
    bg.gain.exponentialRampToValueAtTime(0.0001, t0 + (opts.bodyDur ?? 0.07));

    osc.connect(bg);
    bg.connect(master);
    osc.start(t0);
    osc.stop(t0 + (opts.bodyDur ?? 0.07) + 0.02);
  }
}

function tone(opts: {
  freq: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  attack?: number;
  release?: number;
  delay?: number;
  sweep?: number;
  master?: number;
}) {
  if (isMuted()) return;
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + (opts.delay ?? 0);
  const m = a.createGain();
  m.gain.value = opts.master ?? 1.0;
  m.connect(a.destination);

  const osc = a.createOscillator();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.sweep) osc.frequency.linearRampToValueAtTime(opts.sweep, t0 + opts.dur);

  const g = a.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(opts.gain ?? 0.18, t0 + (opts.attack ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur + (opts.release ?? 0.05));

  osc.connect(g);
  g.connect(m);
  osc.start(t0);
  osc.stop(t0 + opts.dur + (opts.release ?? 0.05) + 0.02);
}

// --- Public API ---

// Standard move: a single short, mid-frequency wood click.
export function playMove() {
  if (!soundPrefs.enabled || !soundPrefs.move) return;
  if (playSample("Move")) return;
  knock({
    filterFreq: 1100,
    filterQ: 3.5,
    dur: 0.05,
    gain: 0.55,
    bodyFreq: 220,
    bodyGain: 0.22,
    bodyDur: 0.06,
  });
}

// Capture: lower, thicker click with a slight "thud" body.
export function playCapture() {
  if (!soundPrefs.enabled || !soundPrefs.capture) return;
  if (playSample("Capture")) return;
  knock({
    filterFreq: 700,
    filterQ: 2.5,
    dur: 0.07,
    gain: 0.6,
    bodyFreq: 140,
    bodyGain: 0.45,
    bodyDur: 0.10,
  });
}

// Check: a brighter, bell-like ping (two-note overtone).
export function playCheck() {
  if (!soundPrefs.enabled || !soundPrefs.check) return;
  tone({ freq: 1320, dur: 0.18, type: "sine", gain: 0.18, attack: 0.002, release: 0.18 });
  tone({ freq: 1980, dur: 0.18, type: "sine", gain: 0.08, attack: 0.002, release: 0.18, delay: 0.01 });
}

// Nerf trigger: soft two-note descending notification.
export function playNerf() {
  if (!soundPrefs.enabled || !soundPrefs.gameEnd) return;
  tone({ freq: 660, dur: 0.18, type: "triangle", gain: 0.14, attack: 0.005, release: 0.18 });
  tone({ freq: 494, dur: 0.22, type: "triangle", gain: 0.12, attack: 0.005, release: 0.22, delay: 0.13 });
}

// Game over: lichess notify dong, or a two-note descending chime.
export function playGameOver() {
  if (!soundPrefs.enabled || !soundPrefs.gameEnd) return;
  if (playSample("GenericNotify")) return;
  tone({ freq: 880, dur: 0.18, type: "sine", gain: 0.18, attack: 0.005, release: 0.18 });
  tone({ freq: 698, dur: 0.30, type: "sine", gain: 0.18, attack: 0.005, release: 0.28, delay: 0.13 });
  tone({ freq: 1318, dur: 0.30, type: "sine", gain: 0.06, attack: 0.005, release: 0.28, delay: 0.13 });
}

// Generic notification: something in the game needs your attention right now.
// The lichess notify dong, softened a touch.
export function playNotify() {
  if (!soundPrefs.enabled) return;
  if (playSample("GenericNotify", 0.85)) return;
  tone({ freq: 880, dur: 0.18, type: "sine", gain: 0.16, attack: 0.005, release: 0.18 });
  tone({ freq: 1108, dur: 0.22, type: "sine", gain: 0.10, attack: 0.005, release: 0.20, delay: 0.09 });
}

// Draft offer: a soft glistening shimmer, deliberately gentler than the
// notify dong. Synthesized on purpose (no sample, dependency-free): a small
// arpeggio of high partials, each doubled with a slight detune so the beating
// between the voices glistens, with a fast attack and a long decay.
export function playDraftChime() {
  if (!soundPrefs.enabled) return;
  if (isMuted()) return;
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime;
  const master = a.createGain();
  master.gain.value = 0.9 * getVolume();
  master.connect(a.destination);

  // G6 - B6 - E7 - G7: an Em7-ish sparkle, staggered a few tens of ms apart.
  const partials: { freq: number; gain: number; delay: number; type: OscillatorType }[] = [
    { freq: 1568, gain: 0.09, delay: 0, type: "sine" },
    { freq: 1976, gain: 0.07, delay: 0.04, type: "sine" },
    { freq: 2637, gain: 0.045, delay: 0.08, type: "triangle" },
    { freq: 3136, gain: 0.028, delay: 0.12, type: "sine" },
  ];
  for (const p of partials) {
    for (const detune of [-7, 7]) {
      const osc = a.createOscillator();
      osc.type = p.type;
      osc.frequency.value = p.freq;
      osc.detune.value = detune;
      const g = a.createGain();
      const start = t0 + p.delay;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(p.gain, start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 1.1);
      osc.connect(g);
      g.connect(master);
      osc.start(start);
      osc.stop(start + 1.15);
    }
  }
}

// Incoming challenge: the lichess social notify (what lichess plays when a
// challenge lands in your inbox).
export function playChallenge() {
  if (!soundPrefs.enabled) return;
  if (playSample("SocialNotify")) return;
  tone({ freq: 660, dur: 0.16, type: "triangle", gain: 0.14, attack: 0.005, release: 0.16 });
  tone({ freq: 880, dur: 0.22, type: "triangle", gain: 0.12, attack: 0.005, release: 0.20, delay: 0.12 });
}

// Low time: urgent double tick, like a clock tapping your shoulder.
export function playLowTime() {
  if (!soundPrefs.enabled) return;
  if (playSample("LowTime")) return;
  tone({ freq: 988, dur: 0.09, type: "square", gain: 0.10, attack: 0.003, release: 0.08 });
  tone({ freq: 988, dur: 0.09, type: "square", gain: 0.10, attack: 0.003, release: 0.08, delay: 0.16 });
  tone({ freq: 1319, dur: 0.12, type: "square", gain: 0.08, attack: 0.003, release: 0.10, delay: 0.32 });
}

// Countdown tick: short urgent blip for the last seconds of the grace timer.
export function playCountdownTick() {
  if (!soundPrefs.enabled) return;
  if (playSample("CountDown0", 0.8)) return;
  tone({ freq: 988, dur: 0.09, type: "square", gain: 0.10, attack: 0.002, release: 0.09 });
}

// Urgent low-clock tick: a sharp, insistent two-note blip for the final
// seconds of your own clock, pitched a step above the low-time warning so the
// escalation is audible. Synthesized (no sample) and honours mute/enabled via
// tone().
export function playUrgentTick() {
  if (!soundPrefs.enabled) return;
  tone({ freq: 1245, dur: 0.06, type: "square", gain: 0.11, attack: 0.002, release: 0.06 });
  tone({ freq: 1660, dur: 0.07, type: "square", gain: 0.08, attack: 0.002, release: 0.07, delay: 0.08 });
}

// Select: very brief, soft pickup tick.
export function playSelect() {
  if (!soundPrefs.enabled || !uiSounds) return;
  if (playSample("Select", 0.6)) return;
  knock({ filterFreq: 1600, filterQ: 5, dur: 0.025, gain: 0.18 });
}

// Error: a move (or premove) failed to reach the server, or was rejected.
export function playError() {
  if (!soundPrefs.enabled) return;
  if (playSample("Error", 0.7)) return;
  tone({ freq: 330, dur: 0.14, type: "square", gain: 0.10, attack: 0.003, release: 0.10 });
}

// --- Card / board effect sounds ---------------------------------------------
// One short synthesized voice per effect family, matching the board's motif
// animations (chains clamp, shields raise, pieces detonate...). All gated by
// the `effects` pref plus mute, all Web Audio (no samples to load), all under
// half a second so stacked effects never turn into noise soup.

const fx = () => soundPrefs.enabled && soundPrefs.effects && !isMuted();

/** Detonation: a piece removed by an attack card blows up. A deep body thump
 * under a wide noise burst, with a fast downward rumble tail. */
export function playExplosion() {
  if (!fx()) return;
  knock({ filterFreq: 240, filterQ: 0.8, dur: 0.22, gain: 0.7, bodyFreq: 90, bodyGain: 0.6, bodyDur: 0.2 });
  knock({ filterFreq: 1400, filterQ: 0.7, dur: 0.1, gain: 0.3, delay: 0.012 });
  tone({ freq: 130, dur: 0.28, type: "sawtooth", gain: 0.1, sweep: 46, release: 0.2, delay: 0.02 });
}

/** Chains clamp onto a jailed piece: two metallic clanks, second lower. */
export function playChains() {
  if (!fx()) return;
  knock({ filterFreq: 2600, filterQ: 9, dur: 0.06, gain: 0.34, bodyFreq: 300, bodyGain: 0.14, bodyDur: 0.05 });
  knock({ filterFreq: 1900, filterQ: 9, dur: 0.08, gain: 0.3, bodyFreq: 210, bodyGain: 0.18, bodyDur: 0.07, delay: 0.09 });
}

/** Shield raised: a short metallic "shing" that rises and rings briefly. */
export function playShieldUp() {
  if (!fx()) return;
  tone({ freq: 880, dur: 0.1, type: "triangle", gain: 0.12, sweep: 1320, release: 0.12 });
  tone({ freq: 2640, dur: 0.16, type: "sine", gain: 0.05, attack: 0.01, release: 0.2, delay: 0.05 });
}

/** Freeze lands: a thin icy shimmer sliding downward. */
export function playFreeze() {
  if (!fx()) return;
  tone({ freq: 2800, dur: 0.2, type: "sine", gain: 0.06, sweep: 1900, release: 0.18 });
  tone({ freq: 3600, dur: 0.14, type: "sine", gain: 0.035, sweep: 2600, release: 0.16, delay: 0.04 });
}

/** Transform / promotion flourish: quick rising sweep with a sparkle top. */
export function playTransform() {
  if (!fx()) return;
  tone({ freq: 520, dur: 0.16, type: "triangle", gain: 0.12, sweep: 1040, release: 0.12 });
  tone({ freq: 1560, dur: 0.12, type: "sine", gain: 0.07, attack: 0.008, release: 0.18, delay: 0.12 });
  tone({ freq: 2080, dur: 0.12, type: "sine", gain: 0.05, attack: 0.008, release: 0.18, delay: 0.17 });
}

/** Summon poof: a soft air puff with a low whoomp underneath. */
export function playSummon() {
  if (!fx()) return;
  knock({ filterFreq: 900, filterQ: 0.9, dur: 0.14, gain: 0.28, bodyFreq: 150, bodyGain: 0.22, bodyDur: 0.12 });
}

/** Banana slip: a comedic falling whistle ending in a soft plop. */
export function playSlip() {
  if (!fx()) return;
  tone({ freq: 1200, dur: 0.28, type: "sine", gain: 0.1, sweep: 350, release: 0.08 });
  knock({ filterFreq: 500, filterQ: 2, dur: 0.06, gain: 0.3, bodyFreq: 120, bodyGain: 0.2, bodyDur: 0.07, delay: 0.3 });
}

/** Skip / stun: a dazed two-note wobble. */
export function playStun() {
  if (!fx()) return;
  tone({ freq: 440, dur: 0.12, type: "triangle", gain: 0.1, sweep: 392, release: 0.1 });
  tone({ freq: 392, dur: 0.18, type: "triangle", gain: 0.09, sweep: 330, release: 0.14, delay: 0.14 });
}

/** Bonk: a dropped coconut or Sahur's log conks a piece. A hard, hollow wooden
 * thonk (low-Q knock with a body thump) with a short comedic descending
 * "boing" sliding down beneath it, so the impact reads funny rather than
 * violent. One shot, well under half a second like the other effect voices. */
export function playBonk() {
  if (!fx()) return;
  knock({ filterFreq: 620, filterQ: 4.5, dur: 0.07, gain: 0.5, bodyFreq: 190, bodyGain: 0.42, bodyDur: 0.1 });
  tone({ freq: 540, dur: 0.24, type: "triangle", gain: 0.1, sweep: 170, release: 0.12, delay: 0.02 });
}
