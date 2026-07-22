// Game sounds, in two themes (Settings > Sound):
//  - "lichess": the standard sound set from lichess.org, vendored under
//    /public/sound/lichess (lila is AGPL - see the README in that directory).
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
  /** Bandpass center for the noise burst: higher = crisper, sharper. */
  filterFreq: number;
  /** Bandpass Q: higher = more tonal/resonant. */
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
  // Alarm bell, not a polite chime (owner request: a check must be
  // unmissable): a bright strike with its fifth and octave partials, then a
  // quick second toll a shade lower — the classic two-ring alarm shape.
  tone({ freq: 1320, dur: 0.22, type: "sine", gain: 0.2, attack: 0.002, release: 0.22 });
  tone({ freq: 1980, dur: 0.2, type: "sine", gain: 0.09, attack: 0.002, release: 0.2, delay: 0.01 });
  tone({ freq: 2640, dur: 0.14, type: "sine", gain: 0.045, attack: 0.002, release: 0.14, delay: 0.01 });
  tone({ freq: 1188, dur: 0.24, type: "sine", gain: 0.16, attack: 0.002, release: 0.24, delay: 0.16 });
  tone({ freq: 1782, dur: 0.2, type: "sine", gain: 0.07, attack: 0.002, release: 0.2, delay: 0.17 });
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

// Draft free window over: the clock is now eating into the player's own time.
// Distinct from the gentle draft chime — a firm two-note descending "time's
// up" knock so it cuts through even when the draft was hidden behind the
// board. Deliberately darker (minor third down) than the notify dong.
export function playDraftUrgent() {
  if (!soundPrefs.enabled) return;
  if (isMuted()) return;
  tone({ freq: 740, dur: 0.14, type: "square", gain: 0.09, attack: 0.004, release: 0.12 });
  tone({ freq: 740, dur: 0.14, type: "sine", gain: 0.14, attack: 0.004, release: 0.12 });
  tone({ freq: 622, dur: 0.26, type: "square", gain: 0.08, attack: 0.004, release: 0.24, delay: 0.16 });
  tone({ freq: 622, dur: 0.26, type: "sine", gain: 0.15, attack: 0.004, release: 0.24, delay: 0.16 });
  tone({ freq: 311, dur: 0.3, type: "sine", gain: 0.08, attack: 0.004, release: 0.28, delay: 0.16 });
}

// Incoming challenge: the lichess social notify (what lichess plays when a
// challenge lands in your inbox).
export function playChallenge() {
  if (!soundPrefs.enabled) return;
  if (playSample("SocialNotify")) return;
  tone({ freq: 660, dur: 0.16, type: "triangle", gain: 0.14, attack: 0.005, release: 0.16 });
  tone({ freq: 880, dur: 0.22, type: "triangle", gain: 0.12, attack: 0.005, release: 0.20, delay: 0.12 });
}

// Game start: a bright, rising "game on" flourish, played once when a game
// begins for you — your challenge was accepted, you were matched, or you joined
// a friend's game and both players are now at the board. Deliberately ascending
// and upbeat so it reads as a kickoff, distinct from the descending game-over
// chime and the neutral notify dong. Synthesized (no sample): a quick C-major
// arpeggio (C5-E5-G5-C6) capped with a soft high-octave sparkle. Gated by the
// master switch + mute like the other notify voices (no per-event pref).
export function playGameStart() {
  if (!soundPrefs.enabled) return;
  tone({ freq: 523, dur: 0.14, type: "triangle", gain: 0.16, attack: 0.004, release: 0.12 });
  tone({ freq: 659, dur: 0.14, type: "triangle", gain: 0.15, attack: 0.004, release: 0.12, delay: 0.09 });
  tone({ freq: 784, dur: 0.16, type: "triangle", gain: 0.15, attack: 0.004, release: 0.14, delay: 0.18 });
  tone({ freq: 1046, dur: 0.30, type: "sine", gain: 0.15, attack: 0.004, release: 0.30, delay: 0.28 });
  tone({ freq: 2093, dur: 0.24, type: "sine", gain: 0.05, attack: 0.006, release: 0.26, delay: 0.30 });
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

/** Pocket drop (crazyhouse): a fresh piece is planted from your reserve onto an
 * empty square. A firm wooden set-down, chunkier and lower than a plain move
 * click and drier than the airy summon poof, so placing a banked piece reads as
 * its own deliberate action. */
export function playDrop() {
  if (!fx()) return;
  knock({ filterFreq: 780, filterQ: 3, dur: 0.06, gain: 0.5, bodyFreq: 155, bodyGain: 0.42, bodyDur: 0.12 });
}

// --- Per-card audio fingerprints (overhaul) ----------------------------------
// Every card keeps its FAMILY voice (recognizable class of sound) but wears a
// deterministic per-card variation derived from its id: pitch ratio, timbre
// brightness, a tiny timing offset, and an optional shimmer partial at a
// hash-picked interval. Two cards in the same family therefore never sound
// byte-identical, at zero asset cost. Pure function of the id string.

export type CueVariation = {
  /** Frequency multiplier for every tonal component (0.85..1.26). */
  pitch: number;
  /** Filter/brightness multiplier for percussive components (0.78..1.38). */
  bright: number;
  /** Extra onset delay in seconds (0..0.035). */
  delay: number;
  /** Interval ratio of the shimmer partial, or 0 for none (about half). */
  shimmer: number;
};

export function cueVariation(cardId: string | undefined): CueVariation {
  if (!cardId) return { pitch: 1, bright: 1, delay: 0, shimmer: 0 };
  let h = 2166136261;
  for (let i = 0; i < cardId.length; i++) {
    h ^= cardId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h >>>= 0;
  const pitch = 0.85 + ((h & 0xff) / 255) * 0.41;
  const bright = 0.78 + (((h >>> 8) & 0xff) / 255) * 0.6;
  const delay = (((h >>> 16) & 0x3f) / 63) * 0.035;
  const shimmerOn = ((h >>> 22) & 1) === 1;
  const shimmer = shimmerOn ? [1.5, 2, 2.5, 3][(h >>> 23) & 3] : 0;
  return { pitch, bright, delay, shimmer };
}

/** The shimmer partial: a quiet high sine at the variation's interval. */
function shimmerTone(base: number, v: CueVariation, delay = 0) {
  if (!v.shimmer) return;
  tone({
    freq: base * v.pitch * v.shimmer,
    dur: 0.12,
    type: "sine",
    gain: 0.022,
    attack: 0.008,
    release: 0.14,
    delay: delay + v.delay + 0.05,
  });
}

/** Card used: a short, crisp "played" flick when you activate a buff/card. A
 * quick rising tick capped with a soft high confirm, deliberately lighter than
 * the effect voices (shields, freezes, explosions) that follow when the card's
 * effect actually lands, so "I played a card" and "the effect hit" stay
 * distinct. One shot per activation. Pass the card id so each card's flick
 * carries its own audio fingerprint (see cueVariation). */
export function playCardUse(cardId?: string) {
  if (!fx()) return;
  const v = cueVariation(cardId);
  tone({ freq: 620 * v.pitch, dur: 0.05, type: "triangle", gain: 0.1, sweep: 990 * v.pitch, release: 0.05, delay: v.delay });
  tone({ freq: 1320 * v.pitch, dur: 0.08, type: "sine", gain: 0.06, attack: 0.004, release: 0.1, delay: 0.04 + v.delay });
  shimmerTone(1320, v, 0.04);
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

// --- Signature-card voices --------------------------------------------------
// One choreographed voice per marquee attack signature. Each is a short
// timeline built from the same knock/tone primitives (Web Audio only, no
// samples), staggered so the sound tracks the staggered visual: a lead cue
// then a sequence of impacts. `count` scales the sequence to the number of
// affected squares (clamped) so a two-target strike does not sound like an
// eight-target one. All gated by the effects pref + mute via fx().

/** Nova: a rising kettle-whistle winds up, then a run of deep staggered
 * "fwoom" detonations rolls up the file, each a beat lower than the last. */
export function playNova(count = 4) {
  if (!fx()) return;
  const n = Math.max(1, Math.min(count, 8));
  // Rising kettle-whistle wind-up.
  tone({ freq: 520, dur: 0.34, type: "sine", gain: 0.09, sweep: 1500, release: 0.06 });
  tone({ freq: 780, dur: 0.34, type: "sine", gain: 0.05, sweep: 2100, release: 0.06, delay: 0.02 });
  // The pop that seeds the shockwave.
  knock({ filterFreq: 1200, filterQ: 2, dur: 0.06, gain: 0.3, delay: 0.32 });
  // Staggered fwooms, each a touch lower and softer as it rolls away.
  for (let i = 0; i < n; i++) {
    const t = 0.4 + i * 0.13;
    const body = 96 - i * 6;
    knock({ filterFreq: 230, filterQ: 0.8, dur: 0.2, gain: 0.55 - i * 0.03, bodyFreq: body, bodyGain: 0.5, bodyDur: 0.18, delay: t });
  }
}

/** Cataclysm: a deep earthquake groan, then a rapid popcorn-string of trapdoor
 * thunks with a little falling-whistle tail. */
export function playCataclysm(count = 6) {
  if (!fx()) return;
  const n = Math.max(1, Math.min(count, 8));
  tone({ freq: 70, dur: 0.5, type: "sawtooth", gain: 0.12, sweep: 40, release: 0.2 });
  for (let i = 0; i < n; i++) {
    const t = 0.12 + i * 0.055;
    knock({ filterFreq: 320, filterQ: 3, dur: 0.06, gain: 0.34, bodyFreq: 130, bodyGain: 0.3, bodyDur: 0.07, delay: t });
  }
  tone({ freq: 900, dur: 0.26, type: "sine", gain: 0.06, sweep: 300, release: 0.08, delay: 0.12 + n * 0.055 });
}

/** Extinction: an ominous wind-swell into a long gravelly crumble-cascade that
 * settles into a dust hiss. */
export function playExtinction(count = 8) {
  if (!fx()) return;
  const n = Math.max(1, Math.min(count, 12));
  tone({ freq: 220, dur: 0.55, type: "sine", gain: 0.07, sweep: 620, release: 0.1 });
  for (let i = 0; i < n; i++) {
    const t = 0.2 + i * 0.06;
    knock({ filterFreq: 520 - i * 12, filterQ: 1.4, dur: 0.09, gain: 0.28, bodyFreq: 110, bodyGain: 0.2, bodyDur: 0.08, delay: t });
  }
  knock({ filterFreq: 1600, filterQ: 0.6, dur: 0.22, gain: 0.12, delay: 0.2 + n * 0.06 });
}

/** Lightning Strike: a thunderclap rumble, then three sharp electric CRACK-zaps
 * with a sizzle tail. */
export function playLightning(count = 3) {
  if (!fx()) return;
  const n = Math.max(1, Math.min(count, 5));
  // Thunderclap: a wide low body.
  knock({ filterFreq: 200, filterQ: 0.7, dur: 0.3, gain: 0.5, bodyFreq: 70, bodyGain: 0.5, bodyDur: 0.28 });
  for (let i = 0; i < n; i++) {
    const t = 0.16 + i * 0.16;
    // Bright, resonant crack + a short high sizzle.
    knock({ filterFreq: 3200, filterQ: 8, dur: 0.05, gain: 0.4, delay: t });
    tone({ freq: 5200, dur: 0.06, type: "square", gain: 0.05, sweep: 2600, release: 0.05, delay: t + 0.01 });
  }
}

/** Atomic Captures: a punchy central THUMP wrapped in a ring of firecracker
 * pops. */
export function playAtomic(count = 8) {
  if (!fx()) return;
  const n = Math.max(1, Math.min(count, 8));
  knock({ filterFreq: 180, filterQ: 0.8, dur: 0.16, gain: 0.6, bodyFreq: 80, bodyGain: 0.55, bodyDur: 0.16 });
  for (let i = 0; i < n; i++) {
    const t = 0.05 + i * 0.035;
    knock({ filterFreq: 1500 + (i % 3) * 200, filterQ: 5, dur: 0.04, gain: 0.26, delay: t });
  }
}

/** Queen's Rampage: a revving whoosh charge into a satisfying string of
 * bowling-pin clatter-bonks. */
export function playRampage(count = 3) {
  if (!fx()) return;
  const n = Math.max(1, Math.min(count, 6));
  tone({ freq: 160, dur: 0.28, type: "sawtooth", gain: 0.1, sweep: 520, release: 0.06 });
  for (let i = 0; i < n; i++) {
    const t = 0.22 + i * 0.1;
    knock({ filterFreq: 640, filterQ: 4, dur: 0.06, gain: 0.42, bodyFreq: 200, bodyGain: 0.36, bodyDur: 0.08, delay: t });
    tone({ freq: 520, dur: 0.16, type: "triangle", gain: 0.06, sweep: 180, release: 0.1, delay: t + 0.01 });
  }
}

/** Siege Rook: a booming cannon shot with a receding line of pancake-splat
 * thuds down the rank. */
export function playSiege(count = 3) {
  if (!fx()) return;
  const n = Math.max(1, Math.min(count, 6));
  // Cannon boom.
  knock({ filterFreq: 160, filterQ: 0.7, dur: 0.28, gain: 0.6, bodyFreq: 66, bodyGain: 0.55, bodyDur: 0.26 });
  for (let i = 0; i < n; i++) {
    const t = 0.1 + i * 0.08;
    knock({ filterFreq: 420, filterQ: 1.6, dur: 0.07, gain: 0.36 - i * 0.03, bodyFreq: 120, bodyGain: 0.28, bodyDur: 0.08, delay: t });
  }
}

// --- Batch 2 signature voices -----------------------------------------------
// One choreographed voice per Batch 2 spectacle (coronations, freezes,
// petrifies, time locks, shields, wall builds). Same rules as the Batch 1
// voices: Web Audio only, gated by fx(), staggered to track the visual, scaled
// by `count` where the spectacle rolls across several squares. Wired to the
// board once Board.tsx's playSignature switch gains a case per key (these cards
// carry no removal diff, so both the square-derivation and the switch case live
// outside this file; see the SIGNATURES note in BoardEffects.tsx).

/** Coronation (Amazon / God Knight): a bright choir hit rising to a sparkle. */
export function playCoronation() {
  if (!fx()) return;
  tone({ freq: 523, dur: 0.22, type: "triangle", gain: 0.12, sweep: 784, release: 0.2 });
  tone({ freq: 659, dur: 0.22, type: "sine", gain: 0.08, release: 0.22, delay: 0.05 });
  tone({ freq: 1046, dur: 0.2, type: "sine", gain: 0.05, attack: 0.01, release: 0.24, delay: 0.12 });
}

/** Crown rain (Double / Triple Amazon, Amazon Army): a brass swell under a
 * cascade of crown chimes. */
export function playCrownRain(count = 3) {
  if (!fx()) return;
  const n = Math.max(1, Math.min(count, 6));
  tone({ freq: 330, dur: 0.4, type: "sawtooth", gain: 0.06, sweep: 494, release: 0.2 });
  for (let i = 0; i < n; i++) {
    tone({ freq: 1046 + i * 90, dur: 0.18, type: "sine", gain: 0.07, attack: 0.005, release: 0.2, delay: i * 0.1 });
  }
}

/** Colossus / Titan: a size-up boing, a heavy stomp, and a shield clang. */
export function playColossus() {
  if (!fx()) return;
  tone({ freq: 300, dur: 0.22, type: "sine", gain: 0.1, sweep: 720, release: 0.1 });
  knock({ filterFreq: 150, filterQ: 0.7, dur: 0.2, gain: 0.6, bodyFreq: 60, bodyGain: 0.55, bodyDur: 0.2, delay: 0.18 });
  tone({ freq: 2200, dur: 0.16, type: "triangle", gain: 0.05, sweep: 1600, release: 0.16, delay: 0.2 });
}

/** Time Skip: an alarm brring cut short by a snooze thunk, then a snore. */
export function playSnooze() {
  if (!fx()) return;
  tone({ freq: 880, dur: 0.05, type: "square", gain: 0.08, release: 0.02 });
  tone({ freq: 880, dur: 0.05, type: "square", gain: 0.08, release: 0.02, delay: 0.06 });
  knock({ filterFreq: 300, filterQ: 2, dur: 0.08, gain: 0.4, bodyFreq: 120, bodyGain: 0.3, bodyDur: 0.08, delay: 0.14 });
  tone({ freq: 200, dur: 0.3, type: "sawtooth", gain: 0.06, sweep: 140, release: 0.12, delay: 0.24 });
}

/** Time Prison: a clanging cell-door slam and slow ominous clock ticking. */
export function playClockCage() {
  if (!fx()) return;
  knock({ filterFreq: 220, filterQ: 1, dur: 0.16, gain: 0.55, bodyFreq: 80, bodyGain: 0.5, bodyDur: 0.16 });
  knock({ filterFreq: 2200, filterQ: 9, dur: 0.05, gain: 0.2, delay: 0.16 });
  tone({ freq: 1000, dur: 0.04, type: "square", gain: 0.05, release: 0.03, delay: 0.24 });
  tone({ freq: 1000, dur: 0.04, type: "square", gain: 0.05, release: 0.03, delay: 0.4 });
}

/** Time Freeze: a clock chime cut off by a glassy freeze-shatter. */
export function playClockIce() {
  if (!fx()) return;
  tone({ freq: 1568, dur: 0.14, type: "sine", gain: 0.09, release: 0.1 });
  tone({ freq: 2800, dur: 0.2, type: "sine", gain: 0.06, sweep: 1900, release: 0.18, delay: 0.1 });
  knock({ filterFreq: 3200, filterQ: 6, dur: 0.06, gain: 0.24, delay: 0.12 });
}

/** Blitzkrieg: a thunderclap, then four escalating sonic booms. */
export function playBlitz(count = 4) {
  if (!fx()) return;
  const n = Math.max(1, Math.min(count, 5));
  knock({ filterFreq: 200, filterQ: 0.7, dur: 0.28, gain: 0.5, bodyFreq: 70, bodyGain: 0.5, bodyDur: 0.26 });
  for (let i = 0; i < n; i++) {
    const t = 0.1 + i * 0.09;
    knock({ filterFreq: 2600 + i * 300, filterQ: 7, dur: 0.05, gain: 0.34, delay: t });
    tone({ freq: 4000 + i * 400, dur: 0.05, type: "square", gain: 0.04, sweep: 2200, release: 0.04, delay: t + 0.01 });
  }
}

/** Mass / Deep / Eternal Freeze: a whiteout blizzard howl and a mass krsshh. */
export function playMassFreeze(count = 8) {
  if (!fx()) return;
  const n = Math.max(1, Math.min(count, 12));
  tone({ freq: 320, dur: 0.5, type: "sine", gain: 0.07, sweep: 900, release: 0.12 });
  for (let i = 0; i < n; i++) {
    knock({ filterFreq: 3200 - i * 40, filterQ: 5, dur: 0.05, gain: 0.2, delay: 0.05 + i * 0.045 });
  }
  tone({ freq: 3400, dur: 0.22, type: "sine", gain: 0.05, sweep: 2400, release: 0.2, delay: 0.06 });
}

/** Medusa / Basilisk: a stony grind rising into a hiss-crack and a stone plop. */
export function playPetrify() {
  if (!fx()) return;
  tone({ freq: 120, dur: 0.3, type: "sawtooth", gain: 0.08, sweep: 260, release: 0.12 });
  tone({ freq: 3000, dur: 0.1, type: "sine", gain: 0.04, sweep: 1800, release: 0.08, delay: 0.16 });
  knock({ filterFreq: 260, filterQ: 2, dur: 0.09, gain: 0.4, bodyFreq: 110, bodyGain: 0.3, bodyDur: 0.09, delay: 0.24 });
}

/** Petrified Forest: a run of groaning creaks resolving into a deadpan owl
 * hoot. */
export function playPetrifiedForest(count = 4) {
  if (!fx()) return;
  const n = Math.max(1, Math.min(count, 6));
  for (let i = 0; i < n; i++) {
    tone({ freq: 180 - i * 10, dur: 0.18, type: "sawtooth", gain: 0.06, sweep: 120, release: 0.1, delay: i * 0.08 });
  }
  tone({ freq: 420, dur: 0.16, type: "sine", gain: 0.06, sweep: 360, release: 0.14, delay: n * 0.08 });
  tone({ freq: 360, dur: 0.16, type: "sine", gain: 0.05, sweep: 320, release: 0.14, delay: n * 0.08 + 0.14 });
}

/** Aegis: a shing rising into a booming board-wide shield seal. */
export function playAegis() {
  if (!fx()) return;
  tone({ freq: 660, dur: 0.14, type: "triangle", gain: 0.12, sweep: 990, release: 0.12 });
  knock({ filterFreq: 200, filterQ: 0.9, dur: 0.16, gain: 0.4, bodyFreq: 90, bodyGain: 0.4, bodyDur: 0.16, delay: 0.06 });
  tone({ freq: 2640, dur: 0.2, type: "sine", gain: 0.05, attack: 0.01, release: 0.24, delay: 0.08 });
}

/** Divine Fortress: a cathedral organ swell (root, fifth, octave). */
export function playCathedral() {
  if (!fx()) return;
  tone({ freq: 262, dur: 0.5, type: "sawtooth", gain: 0.06, release: 0.3 });
  tone({ freq: 392, dur: 0.5, type: "sawtooth", gain: 0.05, release: 0.3, delay: 0.03 });
  tone({ freq: 523, dur: 0.5, type: "triangle", gain: 0.05, release: 0.32, delay: 0.06 });
}

/** Immortal King: a ghostly rising wail as the king returns in shades. */
export function playShades() {
  if (!fx()) return;
  tone({ freq: 440, dur: 0.4, type: "sine", gain: 0.07, sweep: 660, release: 0.3 });
  tone({ freq: 660, dur: 0.3, type: "sine", gain: 0.04, sweep: 520, release: 0.28, delay: 0.12 });
}

/** Rampart / Great Wall: a run of brick thuds as the wall builds up. */
export function playWall(count = 5) {
  if (!fx()) return;
  const n = Math.max(1, Math.min(count, 6));
  for (let i = 0; i < n; i++) {
    knock({ filterFreq: 360, filterQ: 2, dur: 0.06, gain: 0.34, bodyFreq: 120 + i * 6, bodyGain: 0.28, bodyDur: 0.07, delay: i * 0.075 });
  }
}

// --- Gambling voices (gm_* overhaul set) --------------------------------------
// One synthesized voice per gambling machine, matching the gamblingPlays.tsx
// choreography beats (reel stops, wheel clacker, dice clatter, boom). Same
// house rules as the other signature voices: knock/tone primitives only, no
// samples, gated by fx(), short enough to never smear across plays.

/** Slots: three reel-stop tick runs (one per reel, staggered like the art),
 * then the payline ding, a bright two-note bell. */
export function playSlots(count = 3) {
  if (!fx()) return;
  const reels = Math.max(1, Math.min(count, 3));
  for (let r = 0; r < reels; r++) {
    const stopAt = 0.35 + r * 0.24;
    // Decelerating ticks that end at the reel's stop.
    for (let i = 0; i < 5; i++) {
      const t = stopAt - (5 - i) * (0.028 + i * 0.012);
      if (t < 0) continue;
      knock({ filterFreq: 2400, filterQ: 9, dur: 0.02, gain: 0.14 + i * 0.02, delay: t });
    }
    knock({ filterFreq: 900, filterQ: 4, dur: 0.05, gain: 0.3, bodyFreq: 180, bodyGain: 0.16, bodyDur: 0.05, delay: stopAt });
  }
  // Payline ding.
  tone({ freq: 1568, dur: 0.16, type: "sine", gain: 0.1, attack: 0.004, release: 0.22, delay: 1.02 });
  tone({ freq: 2093, dur: 0.2, type: "sine", gain: 0.07, attack: 0.004, release: 0.26, delay: 1.1 });
}

/** Wheel: a clacker rattling past pegs, gaps widening as the wheel dies,
 * ending in a soft pocket settle. */
export function playWheelSpin() {
  if (!fx()) return;
  let t = 0;
  let gap = 0.045;
  for (let i = 0; i < 14; i++) {
    knock({ filterFreq: 3000 - i * 90, filterQ: 8, dur: 0.02, gain: 0.22 - i * 0.008, delay: t });
    t += gap;
    gap *= 1.18;
  }
  knock({ filterFreq: 520, filterQ: 3, dur: 0.07, gain: 0.3, bodyFreq: 150, bodyGain: 0.2, bodyDur: 0.08, delay: t + 0.05 });
}

/** Dice: two hard knuckle-bounces, a skitter, and the settle pair. */
export function playDiceRoll() {
  if (!fx()) return;
  knock({ filterFreq: 1500, filterQ: 5, dur: 0.04, gain: 0.4, bodyFreq: 240, bodyGain: 0.2, bodyDur: 0.05 });
  knock({ filterFreq: 1250, filterQ: 5, dur: 0.04, gain: 0.34, bodyFreq: 210, bodyGain: 0.18, bodyDur: 0.05, delay: 0.14 });
  knock({ filterFreq: 1900, filterQ: 7, dur: 0.025, gain: 0.18, delay: 0.26 });
  knock({ filterFreq: 1700, filterQ: 7, dur: 0.025, gain: 0.14, delay: 0.33 });
  // The two dice settle a hair apart.
  knock({ filterFreq: 1000, filterQ: 4, dur: 0.05, gain: 0.3, bodyFreq: 190, bodyGain: 0.2, bodyDur: 0.06, delay: 0.44 });
  knock({ filterFreq: 950, filterQ: 4, dur: 0.05, gain: 0.26, bodyFreq: 175, bodyGain: 0.18, bodyDur: 0.06, delay: 0.52 });
}

/** Chips: a fast riffle of clay clicks climbing the stack, capped by a felt
 * thump as the tower lands. */
export function playChipRiffle(count = 6) {
  if (!fx()) return;
  const n = Math.max(3, Math.min(count + 2, 9));
  for (let i = 0; i < n; i++) {
    knock({ filterFreq: 2100 + (i % 3) * 260, filterQ: 8, dur: 0.02, gain: 0.16 + i * 0.012, delay: i * 0.045 });
  }
  knock({ filterFreq: 480, filterQ: 2.4, dur: 0.08, gain: 0.34, bodyFreq: 140, bodyGain: 0.26, bodyDur: 0.09, delay: n * 0.045 + 0.06 });
}

/** Coin flip: a bright ring that wobbles while the coin tumbles, then the
 * clean catch snap. */
export function playCoinFlip() {
  if (!fx()) return;
  tone({ freq: 2350, dur: 0.5, type: "sine", gain: 0.07, sweep: 2600, release: 0.3 });
  tone({ freq: 3520, dur: 0.4, type: "sine", gain: 0.035, sweep: 3800, release: 0.26, delay: 0.02 });
  // Tumble shimmer: quick alternating partials.
  tone({ freq: 2800, dur: 0.06, type: "triangle", gain: 0.03, release: 0.05, delay: 0.16 });
  tone({ freq: 3100, dur: 0.06, type: "triangle", gain: 0.03, release: 0.05, delay: 0.3 });
  // The catch.
  knock({ filterFreq: 1400, filterQ: 4, dur: 0.05, gain: 0.34, bodyFreq: 220, bodyGain: 0.2, bodyDur: 0.06, delay: 0.62 });
}

/** Vault: drill grind, the tumbler clank, then the two-tone alarm whoop. */
export function playVaultHeist() {
  if (!fx()) return;
  tone({ freq: 95, dur: 0.4, type: "sawtooth", gain: 0.09, sweep: 130, release: 0.08 });
  tone({ freq: 190, dur: 0.4, type: "square", gain: 0.04, sweep: 260, release: 0.08, delay: 0.02 });
  knock({ filterFreq: 2400, filterQ: 9, dur: 0.05, gain: 0.3, bodyFreq: 200, bodyGain: 0.18, bodyDur: 0.06, delay: 0.46 });
  knock({ filterFreq: 1700, filterQ: 8, dur: 0.06, gain: 0.26, delay: 0.56 });
  // Alarm: two rising whoops.
  tone({ freq: 620, dur: 0.16, type: "square", gain: 0.06, sweep: 940, release: 0.06, delay: 0.72 });
  tone({ freq: 620, dur: 0.16, type: "square", gain: 0.06, sweep: 940, release: 0.06, delay: 0.94 });
}

/** Gacha: a rising star-chime arpeggio with a detuned glisten on top. */
export function playGachaChime() {
  if (!fx()) return;
  const steps = [784, 988, 1319, 1760];
  steps.forEach((f, i) => {
    tone({ freq: f, dur: 0.16, type: "triangle", gain: 0.09, attack: 0.004, release: 0.2, delay: i * 0.09 });
    tone({ freq: f * 2, dur: 0.14, type: "sine", gain: 0.03, attack: 0.006, release: 0.2, delay: i * 0.09 + 0.02 });
  });
  tone({ freq: 3520, dur: 0.24, type: "sine", gain: 0.045, attack: 0.01, release: 0.3, delay: 0.42 });
}

/** Crash rocket: a climbing whistle that keeps climbing... then the boom. */
export function playCrashRocket() {
  if (!fx()) return;
  tone({ freq: 480, dur: 0.75, type: "sine", gain: 0.08, sweep: 1900, release: 0.05 });
  tone({ freq: 240, dur: 0.75, type: "sawtooth", gain: 0.04, sweep: 950, release: 0.05, delay: 0.01 });
  knock({ filterFreq: 200, filterQ: 0.8, dur: 0.26, gain: 0.6, bodyFreq: 75, bodyGain: 0.55, bodyDur: 0.24, delay: 0.82 });
  knock({ filterFreq: 1500, filterQ: 0.7, dur: 0.12, gain: 0.26, delay: 0.84 });
}

/** Bust: the sad trombone. Three slumping slides, the last one long. */
export function playBustTrombone() {
  if (!fx()) return;
  const wah = (freq: number, delay: number, dur: number, gain: number) => {
    tone({ freq, dur, type: "sawtooth", gain, sweep: freq * 0.84, attack: 0.02, release: 0.1, delay });
    tone({ freq: freq / 2, dur, type: "triangle", gain: gain * 0.6, sweep: (freq / 2) * 0.84, attack: 0.02, release: 0.1, delay });
  };
  wah(311, 0, 0.22, 0.07);
  wah(294, 0.28, 0.22, 0.07);
  wah(277, 0.56, 0.5, 0.075);
}

// --- Passive effect family cues --------------------------------------------
// Every card's persistent effect (a nerf reveal, a buff/boon/hex acquisition)
// carries one of nine sound families in its passive composition
// (compositions.ts `soundCue`). PassiveSpawn plays it ONCE when the effect's
// aura first appears, so every effect in the game has a recognizable voice
// tied to its family, and NOT a continuous ambient loop. These are deliberately
// subtler than the marquee attack voices above (they fire on every reveal), and
// dispatched through the rate-limited playPassiveCue so a burst of reveals on
// game load or reconnect can never stack into a painful chord. All gated by the
// effects pref + mute via fx(). tone() does not self-apply the volume setting
// (only knock() does), so tone masters below are scaled by getVolume().

/** Decree: rules of authority (movement bans, compulsions, most nerfs). A
 * dry stone gavel knock capped by a short, low authoritative fifth. */
export function playCueDecree(v: CueVariation = NEUTRAL_CUE) {
  if (!fx()) return;
  const vol = getVolume();
  knock({ filterFreq: 340 * v.bright, filterQ: 2.4, dur: 0.09, gain: 0.34, bodyFreq: 132, bodyGain: 0.3, bodyDur: 0.1, master: 0.8 });
  tone({ freq: 196 * v.pitch, dur: 0.14, type: "triangle", gain: 0.06, sweep: 147 * v.pitch, release: 0.12, delay: 0.03 + v.delay, master: 0.8 * vol });
}

/** Strike: instant punishment / a hit lands. A sharp electric crack. */
export function playCueStrike(v: CueVariation = NEUTRAL_CUE) {
  if (!fx()) return;
  const vol = getVolume();
  knock({ filterFreq: 2200 * v.bright, filterQ: 1.2, dur: 0.05, gain: 0.36, master: 0.8 });
  tone({ freq: 1400 * v.pitch, dur: 0.1, type: "sawtooth", gain: 0.05, sweep: 300 * v.pitch, release: 0.08, master: 0.75 * vol });
}

/** Bind: chains, freezes, locks, leashes. A metallic clink into a lock thunk. */
export function playCueBind(v: CueVariation = NEUTRAL_CUE) {
  if (!fx()) return;
  knock({ filterFreq: 2500 * v.bright, filterQ: 8, dur: 0.05, gain: 0.26, master: 0.8 });
  knock({ filterFreq: 700 * v.bright, filterQ: 3, dur: 0.06, gain: 0.3, bodyFreq: 150, bodyGain: 0.24, bodyDur: 0.08, delay: 0.07 + v.delay, master: 0.8 });
}

/** Territory: zones, walls, forbidden ground. A low airy sweep. */
export function playCueTerritory(v: CueVariation = NEUTRAL_CUE) {
  if (!fx()) return;
  const vol = getVolume();
  tone({ freq: 220 * v.pitch, dur: 0.28, type: "sine", gain: 0.08, sweep: 130 * v.pitch, release: 0.14, master: 0.8 * vol });
  tone({ freq: 330 * v.pitch, dur: 0.2, type: "sine", gain: 0.035, sweep: 180 * v.pitch, release: 0.12, delay: 0.05 + v.delay, master: 0.7 * vol });
}

/** Tempo: clocks, turn timing, cadence. A crisp clock tick into a soft chime. */
export function playCueTempo(v: CueVariation = NEUTRAL_CUE) {
  if (!fx()) return;
  const vol = getVolume();
  knock({ filterFreq: 3200 * v.bright, filterQ: 10, dur: 0.02, gain: 0.22, master: 0.8 });
  tone({ freq: 1046 * v.pitch, dur: 0.14, type: "sine", gain: 0.05, release: 0.14, delay: 0.06 + v.delay, master: 0.8 * vol });
}

/** Blessing: boons, wards, buffs that help you. A warm rising chime. */
export function playCueBlessing(v: CueVariation = NEUTRAL_CUE) {
  if (!fx()) return;
  const vol = getVolume();
  tone({ freq: 523 * v.pitch, dur: 0.16, type: "triangle", gain: 0.08, sweep: 784 * v.pitch, release: 0.14, master: 0.8 * vol });
  tone({ freq: 1046 * v.pitch, dur: 0.16, type: "sine", gain: 0.045, attack: 0.01, release: 0.2, delay: 0.08 + v.delay, master: 0.8 * vol });
}

/** Summon: pieces, spawns, portals. A soft rising whoosh into a poof. */
export function playCueSummon(v: CueVariation = NEUTRAL_CUE) {
  if (!fx()) return;
  const vol = getVolume();
  tone({ freq: 300 * v.pitch, dur: 0.16, type: "sine", gain: 0.06, sweep: 620 * v.pitch, release: 0.08, master: 0.8 * vol });
  knock({ filterFreq: 850 * v.bright, filterQ: 1, dur: 0.1, gain: 0.24, bodyFreq: 150, bodyGain: 0.2, bodyDur: 0.1, delay: 0.1 + v.delay, master: 0.8 });
}

/** Fracture: breaks, shatters, decay, losses. A glassy double crack. */
export function playCueFracture(v: CueVariation = NEUTRAL_CUE) {
  if (!fx()) return;
  const vol = getVolume();
  knock({ filterFreq: 3400 * v.bright, filterQ: 6, dur: 0.04, gain: 0.3, master: 0.8 });
  knock({ filterFreq: 1800 * v.bright, filterQ: 5, dur: 0.05, gain: 0.2, delay: 0.03 + v.delay, master: 0.7 });
  tone({ freq: 900 * v.pitch, dur: 0.12, type: "sawtooth", gain: 0.03, sweep: 400 * v.pitch, release: 0.1, delay: 0.02 + v.delay, master: 0.6 * vol });
}

/** Veil: shadow, hidden information, visibility effects. A muffled low hush. */
export function playCueVeil(v: CueVariation = NEUTRAL_CUE) {
  if (!fx()) return;
  const vol = getVolume();
  tone({ freq: 180 * v.pitch, dur: 0.24, type: "sine", gain: 0.07, sweep: 120 * v.pitch, release: 0.16, master: 0.8 * vol });
  knock({ filterFreq: 500 * v.bright, filterQ: 0.7, dur: 0.16, gain: 0.12, master: 0.6 });
}

const NEUTRAL_CUE: CueVariation = { pitch: 1, bright: 1, delay: 0, shimmer: 0 };

const CUE_FN: Record<string, (v: CueVariation) => void> = {
  decree: playCueDecree,
  strike: playCueStrike,
  bind: playCueBind,
  territory: playCueTerritory,
  tempo: playCueTempo,
  blessing: playCueBlessing,
  summon: playCueSummon,
  fracture: playCueFracture,
  veil: playCueVeil,
};

// Passive spawns can arrive in bursts (initial game load, reconnect re-derives,
// a multi-target reveal), so cap how many family cues sound within a short
// window. Extra cues in the window are dropped, never queued, so the audio can
// never fall behind the board or stack into a wall.
let recentCueTimes: number[] = [];
const CUE_WINDOW_S = 0.5;
const CUE_MAX_IN_WINDOW = 4;

/** Play a passive effect's family cue once, keyed by its composition soundCue
 * ("passive/<family>"). No-op for an unknown or absent cue. Rate-limited and
 * fully gated by the effects pref + mute; it reads (never resumes) the audio
 * clock, so it cannot autoplay before the first user gesture. */
export function playPassiveCue(cue: string | undefined, cardId?: string) {
  if (!cue || !fx()) return;
  const fam = cue.startsWith("passive/") ? cue.slice("passive/".length) : cue;
  const fn = CUE_FN[fam];
  if (!fn) return;
  const a = audio();
  if (!a) return;
  const now = a.currentTime;
  recentCueTimes = recentCueTimes.filter((t) => now - t < CUE_WINDOW_S);
  if (recentCueTimes.length >= CUE_MAX_IN_WINDOW) return;
  recentCueTimes.push(now);
  // Per-card fingerprint: same family voice, card-specific pitch/timbre/
  // timing/shimmer (see cueVariation), so no two cards sound identical.
  fn(cueVariation(cardId));
}
