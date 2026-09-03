// Saved style presets: the ownership layer. A saved preset is the FULL
// ClipStyle plus the small set of option deltas that belong to a vibe (the
// same extras built-in presets carry, plus the reel board theme), named by the
// creator and persisted to localStorage ONLY. Nothing here ever touches the
// network; export/import is a compact JSON string moved by copy/paste.
//
// Storage contract: versioned key, cap of 12 presets, LRU eviction by the
// `at` timestamp (bumped on save AND on apply). Every read is sanitized field
// by field against the known option sets, so a hand-edited or stale payload
// can never crash the renderer. All localStorage access is SSR-guarded and
// wrapped in try/catch (private-mode Safari throws on setItem).

import type { CaptionStyle, EmojiLevel } from "./clipScene";
import type { MusicTrackId } from "./clipMusic";
import { MUSIC_TRACKS } from "./clipMusic";
import { STYLE_DEFAULTS, type ClipStyle, type ReelBoardThemeId } from "./clipStyles";

const STORE_KEY = "nerfchess.clipPresets.v1";
const CAP = 12;

export interface SavedPresetExtras {
  emojiLevel?: EmojiLevel;
  captionStyle?: CaptionStyle;
  musicTrack?: MusicTrackId;
  boardTheme?: ReelBoardThemeId;
  /** Versus intro match card (a modal option that belongs to the vibe). */
  versusIntro?: boolean;
}

export interface SavedClipPreset {
  id: string;
  name: string;
  /** Last saved/applied timestamp, the LRU key. UI metadata only; never part
   *  of the deterministic render. */
  at: number;
  style: ClipStyle;
  extras: SavedPresetExtras;
}

// --- Sanitizers --------------------------------------------------------------

const ENUM_SETS: { [K in keyof ClipStyle]?: readonly ClipStyle[K][] } = {
  zoom: ["off", "subtle", "punchy", "extreme"],
  driftCam: ["off", "gentle", "cinematic"],
  grade: ["none", "noir", "vaporwave", "cyberpunk", "vintage", "emerald", "infrared", "bleach", "duotone"],
  shake: ["off", "subtle", "heavy"],
  chromatic: ["off", "impacts", "always"],
  grain: ["off", "fine", "gritty"],
  particles: ["embers", "snow", "rain", "sparks", "matrix", "bubbles", "off"],
  speed: [0.75, 1, 1.25, 1.5],
  slowmo: ["off", "classic", "ultra"],
  transition: ["shimmer", "whip", "flash", "spin", "pixel", "none"],
  watermarkCorner: ["tl", "tr", "bl", "br"],
  captionColor: ["auto", "accent", "white", "custom"],
  captionSize: ["s", "m", "l"],
  captionPos: ["low", "mid", "high"],
  stampRotation: ["off", "subtle", "rowdy"],
  zoomBias: ["action", "center"],
  punchTiming: ["impact", "beat"],
  arrowColor: ["palette", "site", "white"],
  ruleSide: ["auto", "left", "right"],
  ruleHold: ["quick", "comfy", "slow"],
  captionPack: ["impact", "typewriter", "neon", "minimal", "serif"],
  titleTemplate: ["custom", "pov", "neversaw", "waitforit", "illegal", "ruined"],
  outro: ["logo", "taunt", "codex", "stats"],
  sceneSet: ["void", "stadium", "study", "arcade"],
  zoomCurve: ["snap", "whip", "creep", "bounce"],
};

const HEX_RE = /^#[0-9a-f]{6}$/i;

/** Rebuild a full ClipStyle from an untrusted payload: every field starts at
 *  the default and only survives when the payload's value passes its check. */
export function sanitizeStyle(raw: unknown): ClipStyle {
  const out: ClipStyle = { ...STYLE_DEFAULTS };
  const bag = out as unknown as Record<string, unknown>;
  if (!raw || typeof raw !== "object") return out;
  const src = raw as Record<string, unknown>;
  for (const key of Object.keys(STYLE_DEFAULTS) as (keyof ClipStyle)[]) {
    const v = src[key];
    if (v === undefined) continue;
    const fallback = STYLE_DEFAULTS[key];
    const allowed = ENUM_SETS[key];
    if (allowed) {
      if ((allowed as readonly unknown[]).includes(v)) bag[key] = v;
    } else if (typeof fallback === "boolean") {
      if (typeof v === "boolean") bag[key] = v;
    } else if (typeof fallback === "number") {
      if (typeof v === "number" && Number.isFinite(v)) {
        // Dials clamp to 0..100; the seed is any finite integer.
        bag[key] = key === "seed" ? Math.round(v) : Math.max(0, Math.min(100, Math.round(v)));
      }
    } else if (typeof fallback === "string") {
      // The remaining strings are hex wells.
      if (typeof v === "string" && HEX_RE.test(v.trim())) {
        bag[key] = v.trim().toLowerCase();
      }
    }
  }
  return out;
}

const EMOJI_SET: readonly EmojiLevel[] = ["off", "tasteful", "brainrot"];
const CAPTION_SET: readonly CaptionStyle[] = ["pop", "static", "off"];
const BOARD_SET: readonly ReelBoardThemeId[] = ["site", "slate", "walnut", "midnight", "paper"];

export function sanitizeExtras(raw: unknown): SavedPresetExtras {
  const out: SavedPresetExtras = {};
  if (!raw || typeof raw !== "object") return out;
  const src = raw as Record<string, unknown>;
  if (EMOJI_SET.includes(src.emojiLevel as EmojiLevel)) {
    out.emojiLevel = src.emojiLevel as EmojiLevel;
  }
  if (CAPTION_SET.includes(src.captionStyle as CaptionStyle)) {
    out.captionStyle = src.captionStyle as CaptionStyle;
  }
  if (
    typeof src.musicTrack === "string" &&
    MUSIC_TRACKS.some((tr) => tr.id === src.musicTrack)
  ) {
    out.musicTrack = src.musicTrack as MusicTrackId;
  }
  if (BOARD_SET.includes(src.boardTheme as ReelBoardThemeId)) {
    out.boardTheme = src.boardTheme as ReelBoardThemeId;
  }
  if (typeof src.versusIntro === "boolean") out.versusIntro = src.versusIntro;
  return out;
}

function sanitizeName(raw: unknown): string {
  const name = typeof raw === "string" ? raw.trim().slice(0, 24) : "";
  return name || "My style";
}

// --- Storage -----------------------------------------------------------------

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadSavedPresets(): SavedClipPreset[] {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return [];
    const list = (parsed as { presets?: unknown }).presets;
    if (!Array.isArray(list)) return [];
    const out: SavedClipPreset[] = [];
    for (const item of list.slice(0, CAP)) {
      if (!item || typeof item !== "object") continue;
      const p = item as Record<string, unknown>;
      out.push({
        id: typeof p.id === "string" && p.id ? p.id : `sp-${out.length}-${Date.now()}`,
        name: sanitizeName(p.name),
        at: typeof p.at === "number" && Number.isFinite(p.at) ? p.at : 0,
        style: sanitizeStyle(p.style),
        extras: sanitizeExtras(p.extras),
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function storeSavedPresets(presets: SavedClipPreset[]): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORE_KEY, JSON.stringify({ v: 1, presets: presets.slice(0, CAP) }));
  } catch {
    // Quota/private mode: the in-memory list still works for this session.
  }
}

/** Insert (or rename-collide-append) a preset, evicting the least recently
 *  used entry past the cap. Returns the new list plus the saved preset. */
export function upsertSavedPreset(
  presets: SavedClipPreset[],
  name: string,
  style: ClipStyle,
  extras: SavedPresetExtras,
): { list: SavedClipPreset[]; preset: SavedClipPreset } {
  const preset: SavedClipPreset = {
    id: `sp-${Date.now().toString(36)}-${Math.abs(style.seed) % 997}`,
    name: sanitizeName(name),
    at: Date.now(),
    style: { ...style },
    extras: { ...extras },
  };
  let list = [...presets, preset];
  if (list.length > CAP) {
    // LRU evict: drop the stalest `at` (never the one just saved).
    list = [...list].sort((a, b) => b.at - a.at).slice(0, CAP);
  }
  return { list, preset };
}

/** Bump a preset's LRU timestamp (on apply). */
export function touchSavedPreset(presets: SavedClipPreset[], id: string): SavedClipPreset[] {
  return presets.map((p) => (p.id === id ? { ...p, at: Date.now() } : p));
}

// --- Share codes -------------------------------------------------------------

/** Compact JSON share code for copy/paste. Pure string assembly. */
export function exportPresetCode(name: string, style: ClipStyle, extras: SavedPresetExtras): string {
  return JSON.stringify({ v: 1, name: sanitizeName(name), style, extras });
}

/** Parse a pasted share code; null when it isn't one of ours. */
export function importPresetCode(
  code: string,
): { name: string; style: ClipStyle; extras: SavedPresetExtras } | null {
  try {
    const parsed: unknown = JSON.parse(code.trim());
    if (!parsed || typeof parsed !== "object") return null;
    const p = parsed as Record<string, unknown>;
    if (p.v !== 1 || !p.style || typeof p.style !== "object") return null;
    return {
      name: sanitizeName(p.name),
      style: sanitizeStyle(p.style),
      extras: sanitizeExtras(p.extras),
    };
  } catch {
    return null;
  }
}
