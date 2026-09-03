// The studio's option model: every knob outside the ClipStyle pack, plus the
// label tables the deck panels render from. Split out of ClipModal so the
// deck panels can import types and option lists without a circular reference.

import type { CaptionStyle, ClipAspect, EmojiLevel } from "./clipScene";
import type { ClipVoiceMutes } from "./clipAudio";
import { NO_MUTES } from "./clipAudio";
import { DEFAULT_MUSIC_TRACK, DEFAULT_MUSIC_VOLUME, type MusicTrackId } from "./clipMusic";
import { STYLE_DEFAULTS, type ClipStyle, type ReelBoardThemeId } from "./clipStyles";
import type { ClipPlyMod } from "./clipReplay";
import type { ClipFps, ClipQualityId } from "./clipEncoder";

export type PliesChoice = "auto" | 4 | 6 | 10;
export const LENGTH_OPTIONS: PliesChoice[] = ["auto", 4, 6, 10];

/** The manual clip window: absolute board-state indices, start < end. Null
 *  keeps the auto-director (or the Last-N chips) in charge. */
export interface ClipWindowSel {
  start: number;
  end: number;
}

export interface ClipOptionsState {
  aspect: ClipAspect;
  speedRamp: boolean;
  freezeStamp: boolean;
  momentumBar: boolean;
  moveCounter: boolean;
  captionStyle: CaptionStyle;
  emojiLevel: EmojiLevel;
  sound: boolean;
  /** 0..1 sfx level, independent of the music bed. */
  sfxVolume: number;
  /** Per-voice sfx mutes (moves / cards / verdict / ambience). */
  voiceMutes: ClipVoiceMutes;
  musicOn: boolean;
  musicTrack: MusicTrackId;
  /** 0..1 music bed volume. */
  musicVolume: number;
  explainArrows: boolean;
  explainRules: boolean;
  explainCallouts: boolean;
  watermarkOn: boolean;
  handle: string;
  endCard: boolean;
  /** End-card call-to-action line. */
  ctaText: string;
  /** Thumbnail designer: poster time as a fraction of the reel (0..1), or
   *  null for the classic frame-0 poster. */
  posterFrac: number | null;
  /** Poster overlay line; empty falls back to the hook. */
  posterText: string;
  /** Accent ring around the payoff square on the poster. */
  posterRing: boolean;
  /** Export bitrate tier (Standard 10 / High 16 / Compact 6 Mbps). */
  quality: ClipQualityId;
  /** Export frame rate. 60 samples the same pure renderer at 60Hz and falls
   *  back to 30 (with a note) when the encoder can't do it. */
  fps: ClipFps;
  /** Reel-only board look: Site default or one of the four reel palettes. */
  boardTheme: ReelBoardThemeId;
  /** Commentary track master toggle (per-ply notes render only while on). */
  commentaryOn: boolean;
  /** Per-ply curation: skip / slow / punch / note, keyed by absolute ply. */
  plyMods: Record<number, ClipPlyMod>;
  /** Manual payoff override ("Set as payoff" in the timeline cell strip). */
  payoffPly: number | null;
  /** Manual clip window, overriding planAutoClip / the Last-N chips. */
  clipWindow: ClipWindowSel | null;
  /** The style pack (camera, look, fx, pace, cuts, stamps, dials). */
  style: ClipStyle;
}

// "TikTok mode": the default preset, everything on.
export const TIKTOK_MODE: ClipOptionsState = {
  aspect: "tiktok",
  speedRamp: true,
  freezeStamp: true,
  momentumBar: true,
  moveCounter: true,
  captionStyle: "pop",
  emojiLevel: "tasteful",
  sound: true,
  sfxVolume: 1,
  voiceMutes: NO_MUTES,
  musicOn: true,
  musicTrack: DEFAULT_MUSIC_TRACK,
  musicVolume: DEFAULT_MUSIC_VOLUME,
  explainArrows: true,
  explainRules: true,
  explainCallouts: true,
  watermarkOn: true,
  handle: "nerfchess.com",
  endCard: true,
  ctaText: "nerfchess.com",
  posterFrac: null,
  posterText: "",
  posterRing: false,
  quality: "standard",
  fps: 30,
  boardTheme: "site",
  commentaryOn: true,
  plyMods: {},
  payoffPly: null,
  clipWindow: null,
  style: STYLE_DEFAULTS,
};

// --- Deck option tables ------------------------------------------------------

export const ASPECTS: { id: ClipAspect; label: string; res: string }[] = [
  { id: "tiktok", label: "9:16", res: "1080x1920" },
  { id: "square", label: "1:1", res: "1080x1080" },
  { id: "youtube", label: "16:9", res: "1920x1080" },
  { id: "classic", label: "Classic", res: "720x880" },
];
export const ASPECT_NAME: Record<ClipAspect, string> = {
  tiktok: "VERTICAL",
  square: "SQUARE",
  youtube: "WIDE",
  classic: "CLASSIC",
};

export const CAPTION_STYLES = [
  ["pop", "Word pop"], ["static", "Static"], ["off", "Off"],
] as const;
export const EMOJI_LEVELS = [
  ["off", "Off"], ["tasteful", "Tasteful"], ["brainrot", "Brainrot"],
] as const;
export const HOOK_PRESETS = [
  "Wait for the last move",
  "He never saw it coming",
  "This card should be illegal",
  "Chess but with cards",
];
export const GRADE_OPTIONS = [
  ["none", "None"], ["noir", "Noir"], ["vaporwave", "Vaporwave"],
  ["cyberpunk", "Cyberpunk"], ["vintage", "Vintage"], ["emerald", "Emerald"],
  ["infrared", "Infrared"], ["bleach", "Bleach"], ["duotone", "Duotone"],
] as const;
export const PARTICLE_OPTIONS = [
  ["embers", "Embers"], ["snow", "Snow"], ["rain", "Rain"], ["sparks", "Sparks"],
  ["matrix", "Matrix"], ["bubbles", "Bubbles"], ["off", "Off"],
] as const;
export const TRANSITION_OPTIONS = [
  ["shimmer", "Shimmer"], ["whip", "Whip-pan"], ["flash", "Flash cut"],
  ["spin", "Spin"], ["pixel", "Pixel dissolve"], ["none", "None"],
] as const;
export const SPEED_OPTIONS = [
  [0.75, "0.75x"], [1, "1x"], [1.25, "1.25x"], [1.5, "1.5x"],
] as const;
export const ZOOM_OPTIONS = [
  ["off", "Off"], ["subtle", "Subtle"], ["punchy", "Punchy"], ["extreme", "Extreme"],
] as const;
export const DRIFT_OPTIONS = [
  ["off", "Off"], ["gentle", "Gentle"], ["cinematic", "Cinematic"],
] as const;
export const SHAKE_OPTIONS = [
  ["off", "Off"], ["subtle", "Subtle"], ["heavy", "Heavy"],
] as const;
export const CHROMATIC_OPTIONS = [
  ["off", "Off"], ["impacts", "Impacts"], ["always", "Always"],
] as const;
export const GRAIN_OPTIONS = [
  ["off", "Off"], ["fine", "Fine"], ["gritty", "Gritty"],
] as const;
export const SLOWMO_OPTIONS = [
  ["off", "Off"], ["classic", "Classic"], ["ultra", "Ultra"],
] as const;
export const CORNER_OPTIONS = [
  ["tl", "TL"], ["tr", "TR"], ["bl", "BL"], ["br", "BR"],
] as const;
export const CAPTION_COLOR_OPTIONS = [
  ["auto", "Auto"], ["accent", "Accent"], ["white", "White"], ["custom", "Custom"],
] as const;
export const CAPTION_SIZE_OPTIONS = [
  ["s", "S"], ["m", "M"], ["l", "L"],
] as const;
export const CAPTION_POS_OPTIONS = [
  ["low", "Low"], ["mid", "Mid"], ["high", "High"],
] as const;
export const STAMP_ROT_OPTIONS = [
  ["off", "Off"], ["subtle", "Subtle"], ["rowdy", "Rowdy"],
] as const;
export const ZOOM_BIAS_OPTIONS = [
  ["action", "Action"], ["center", "Center"],
] as const;
export const PUNCH_TIMING_OPTIONS = [
  ["impact", "On impact"], ["beat", "On beat"],
] as const;
export const ARROW_COLOR_OPTIONS = [
  ["palette", "Grade"], ["site", "Accent"], ["white", "White"],
] as const;
export const RULE_SIDE_OPTIONS = [
  ["auto", "Auto"], ["left", "Left"], ["right", "Right"],
] as const;
export const RULE_HOLD_OPTIONS = [
  ["quick", "Quick"], ["comfy", "Comfy"], ["slow", "Slow reader"],
] as const;
export const CAPTION_PACK_OPTIONS = [
  ["impact", "Impact"], ["typewriter", "Typewriter"], ["neon", "Neon"],
  ["minimal", "Minimal"], ["serif", "Serif Drama"],
] as const;
export const TITLE_TEMPLATE_OPTIONS = [
  ["custom", "Custom"], ["pov", "POV:"], ["neversaw", "Never saw it"],
  ["waitforit", "Wait for it"], ["illegal", "ILLEGAL"], ["ruined", "Ruined his life"],
] as const;
export const QUALITY_OPTIONS = [
  ["compact", "Compact"], ["standard", "Standard"], ["high", "High"],
] as const;
export const FPS_OPTIONS = [
  [30, "30"], [60, "60"],
] as const;
export const BOARD_THEME_OPTIONS = [
  ["site", "Site"], ["slate", "Slate"], ["walnut", "Walnut"],
  ["midnight", "Midnight"], ["paper", "Paper"],
] as const;
export const OUTRO_OPTIONS = [
  ["logo", "Logo pop"], ["taunt", "Rematch taunt"],
  ["codex", "Card codex"], ["stats", "Stats splat"],
] as const;

/** BPM + one-word mood tag per built-in track, for the AUDIO panel picker. */
export const TRACK_META: Record<MusicTrackId, { bpm: number; mood: string }> = {
  phonk: { bpm: 132, mood: "dark" },
  boss: { bpm: 150, mood: "tense" },
  chiptune: { bpm: 168, mood: "rush" },
  lofi: { bpm: 76, mood: "chill" },
  cathedral: { bpm: 54, mood: "doom" },
  neon: { bpm: 118, mood: "drive" },
  wardrums: { bpm: 100, mood: "war" },
  quiet: { bpm: 60, mood: "calm" },
};
