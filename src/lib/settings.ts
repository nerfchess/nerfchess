// Per-user settings stored in localStorage. Currently covers board theme and
// sound volume. Plain functions, no React; pages subscribe via small hooks.

export type BoardTheme =
  | "wood"
  | "green"
  | "blue"
  | "slate"
  | "brown"
  | "purple"
  | "ice"
  | "rose"
  | "walnut"
  | "tournament"
  | "forest"
  | "midnight";

export type PieceTheme =
  | "classic"
  | "ivory"
  | "steel"
  | "rosewood"
  | "forest"
  | "ocean"
  | "gold"
  | "lichessCburnett"
  | "lichessMerida"
  | "lichessAlpha"
  | "lichessCalifornia"
  | "lichessCardinal"
  | "lichessChess7"
  | "lichessKosal"
  | "lichessMaestro"
  | "lichessPirouetti"
  | "lichessStaunty";

export type AccentColor = "auto" | "blue" | "green" | "amber" | "rose";
export type AnimationSpeed = "off" | "fast" | "normal";
export type SiteTheme =
  | "dark"
  | "light"
  | "system"
  | "midnight"
  | "void"
  | "abyss"
  | "ember"
  | "moss"
  | "nebula";
export type SoundTheme = "lichess" | "classic";

// Full site themes. "dark" and "light" are the two originals; the rest are
// dark variants expressed purely as CSS-variable override blocks in
// globals.css keyed on html[data-theme="<id>"] (they inherit every dark-theme
// style, so only the palette shifts — no per-component work). `swatch` feeds
// the settings picker preview; `scheme` is the value for CSS color-scheme.
// Each theme also names its own ACCENT (the color of primary buttons, links,
// and "act here" chrome). It applies while the accent setting sits on "auto"
// (the default); picking an explicit accent color overrides every theme.
export interface AccentDef {
  accent: string;
  accentHi: string;
  rgb: string;
  rgbHi: string;
  rgbDim: string;
}

export const SITE_THEMES: Record<
  SiteTheme,
  {
    label: string;
    hint: string;
    scheme: "dark" | "light";
    swatch: { bg: string; panel: string; glow: string };
    accent: AccentDef;
  }
> = {
  dark:     { label: "Classic",  hint: "Warm charcoal, the original",   scheme: "dark",  swatch: { bg: "#191713", panel: "#2b2823", glow: "#d8b56e" }, accent: { accent: "#3692e7", accentHi: "#4a9fee", rgb: "54 146 231", rgbHi: "74 159 238", rgbDim: "42 111 176" } },
  light:    { label: "Light",    hint: "Paper and ink",                 scheme: "light", swatch: { bg: "#e9e5da", panel: "#f4f1ea", glow: "#8a6d3b" }, accent: { accent: "#3692e7", accentHi: "#4a9fee", rgb: "54 146 231", rgbHi: "74 159 238", rgbDim: "42 111 176" } },
  system:   { label: "System",   hint: "Follow your device",            scheme: "dark",  swatch: { bg: "#191713", panel: "#e9e5da", glow: "#3692e7" }, accent: { accent: "#3692e7", accentHi: "#4a9fee", rgb: "54 146 231", rgbHi: "74 159 238", rgbDim: "42 111 176" } },
  midnight: { label: "Midnight", hint: "Blue-black steel",              scheme: "dark",  swatch: { bg: "#101318", panel: "#1a1f27", glow: "#7ba1c0" }, accent: { accent: "#6f9fc9", accentHi: "#8ab4da", rgb: "111 159 201", rgbHi: "138 180 218", rgbDim: "82 120 156" } },
  void:     { label: "Void",     hint: "Pure black, OLED-friendly",     scheme: "dark",  swatch: { bg: "#000000", panel: "#141414", glow: "#9f9f9f" }, accent: { accent: "#8ab4f8", accentHi: "#a5c6fa", rgb: "138 180 248", rgbHi: "165 198 250", rgbDim: "104 138 194" } },
  abyss:    { label: "Abyss",    hint: "Deep-sea teal",                 scheme: "dark",  swatch: { bg: "#0c1517", panel: "#152327", glow: "#5ec8b8" }, accent: { accent: "#43b3a0", accentHi: "#5ec8b8", rgb: "67 179 160", rgbHi: "94 200 184", rgbDim: "48 134 120" } },
  ember:    { label: "Ember",    hint: "Smoldering crimson",            scheme: "dark",  swatch: { bg: "#170f0e", panel: "#261815", glow: "#e07a5f" }, accent: { accent: "#d96e50", accentHi: "#e58a6e", rgb: "217 110 80", rgbHi: "229 138 110", rgbDim: "168 84 60" } },
  moss:     { label: "Moss",     hint: "Deep forest green",             scheme: "dark",  swatch: { bg: "#0f140e", panel: "#1a2318", glow: "#8fbc6f" }, accent: { accent: "#7bab58", accentHi: "#92c26e", rgb: "123 171 88", rgbHi: "146 194 110", rgbDim: "93 130 66" } },
  nebula:   { label: "Nebula",   hint: "Violet dusk",                   scheme: "dark",  swatch: { bg: "#131019", panel: "#1f1929", glow: "#a877d8" }, accent: { accent: "#9d7ad4", accentHi: "#b494e2", rgb: "157 122 212", rgbHi: "180 148 226", rgbDim: "118 91 162" } },
};

export interface Settings {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  volume: number; // 0..1
  moveRiskWarnings: boolean; // yellow/red move-dot warnings for self-loss / check
  autoQueen: boolean; // skip the promotion picker and always promote to queen
  // When on, the opponent's rule is never shown to you — not even after the
  // game ends, and mid-game reveal is disabled. Default off.
  hideOpponentReveal: boolean;
  muteChat: boolean; // hide in-game chat messages and input
  confirmResign: boolean; // ask before resigning
  showCoordinates: boolean; // file/rank labels on the board edge
  highlightLastMove: boolean; // tint the from/to squares of the last move
  showLegalMoves: boolean; // dots on the squares a selected piece can move to
  premovesEnabled: boolean; // allow queuing moves during the opponent's turn
  confirmMove: boolean; // require a confirm tap before a move is sent (slow games)
  confirmDrawOffer: boolean; // ask before sending a draw offer
  flipBoard: boolean; // view the board from the opponent's side
  checkHighlight: boolean; // tint the checked king's square
  boardSize: number; // board width multiplier, 0.8..1.1
  largerPieces: boolean; // draw pieces bigger inside their squares
  moveSound: boolean; // click on a quiet move
  captureSound: boolean; // thud on a capture
  checkSound: boolean; // ping when a king is in check
  gameEndSound: boolean; // chime when the game ends
  soundEnabled: boolean; // master switch for all game audio
  soundTheme: SoundTheme; // lichess sample set, or the classic synth clicks
  siteTheme: SiteTheme; // dark, light, or follow the OS
  compactMode: boolean; // tighter interface density
  lowTimeWarning: boolean; // ticking alert when the clock runs low
  uiScale: number; // 0.85..1.15, multiplies the root font size
  accentColor: AccentColor;
  animationSpeed: AnimationSpeed;
  uiSounds: boolean; // interface blips (piece select), separate from game sounds
  highContrast: boolean;
  reducedMotion: boolean;
  fpsCounter: boolean;
  customBgUrl: string; // full-page background image URL; empty string = none
  customBgDim: number; // 0..0.6 dark overlay over the custom background
  // Uploaded full-page background as a data URL (device-local: stripped from
  // the server sync so the settings blob stays small). Wins over customBgUrl.
  customBgData: string;
  fxDuration: number; // 0.5..2, multiplies how long card/FX animations last
  // Performance mode: drops the most paint-costly decorative layers (backdrop
  // blurs, the full-screen paper-grain blend, fixed-attachment backgrounds)
  // for smooth play on low-end devices. Off for everyone by default; the lag
  // nudge (SettingsBootstrap) offers it in a popup when real jank is
  // detected. Functional visuals (board, pieces, effects) stay.
  perfMode: boolean;
}

export const SETTINGS_CHANGED_EVENT = "nerfchess:settings-changed";

const STORAGE_KEY = "dc:settings-v1";
export const DEFAULT_SETTINGS: Settings = {
  boardTheme: "wood",
  pieceTheme: "classic",
  volume: 0.8,
  moveRiskWarnings: true,
  autoQueen: false,
  hideOpponentReveal: false,
  muteChat: false,
  confirmResign: true,
  showCoordinates: true,
  highlightLastMove: true,
  showLegalMoves: true,
  premovesEnabled: true,
  lowTimeWarning: true,
  confirmMove: false,
  confirmDrawOffer: false,
  flipBoard: false,
  checkHighlight: true,
  boardSize: 1,
  largerPieces: false,
  moveSound: true,
  captureSound: true,
  checkSound: true,
  gameEndSound: true,
  soundEnabled: true,
  soundTheme: "lichess",
  siteTheme: "nebula",
  compactMode: false,
  uiScale: 1,
  accentColor: "auto",
  animationSpeed: "normal",
  uiSounds: true,
  highContrast: false,
  reducedMotion: false,
  fpsCounter: false,
  customBgUrl: "",
  customBgDim: 0.3,
  customBgData: "",
  fxDuration: 1,
  perfMode: false,
};
const DEFAULT = DEFAULT_SETTINGS;

export const ACCENT_THEMES: Record<
  Exclude<AccentColor, "auto">,
  { label: string; accent: string; accentHi: string; rgb: string; rgbHi: string; rgbDim: string }
> = {
  blue:  { label: "Blue",  accent: "#3692e7", accentHi: "#4a9fee", rgb: "54 146 231",  rgbHi: "74 159 238",  rgbDim: "42 111 176" },
  green: { label: "Green", accent: "#629924", accentHi: "#7bb52f", rgb: "98 153 36",   rgbHi: "123 181 47",  rgbDim: "74 116 27" },
  amber: { label: "Amber", accent: "#d8b56e", accentHi: "#e6bf6a", rgb: "216 181 110", rgbHi: "230 191 106", rgbDim: "168 138 79" },
  rose:  { label: "Rose",  accent: "#c66860", accentHi: "#dc7a72", rgb: "198 104 96",  rgbHi: "220 122 114", rgbDim: "150 76 70" },
};

export const BOARD_THEMES: Record<BoardTheme, { light: string; dark: string; label: string }> = {
  wood:       { light: "#e8dcc0", dark: "#8d6e4b", label: "Wood" },
  brown:      { light: "#f0d9b5", dark: "#b58863", label: "Brown" },
  walnut:     { light: "#e0c39a", dark: "#7a5230", label: "Walnut" },
  green:      { light: "#eeeed2", dark: "#769656", label: "Green" },
  tournament: { light: "#dcdcd0", dark: "#6d8a5a", label: "Tournament" },
  forest:     { light: "#e9edd6", dark: "#4c6b3f", label: "Forest" },
  blue:       { light: "#dee3e6", dark: "#788a94", label: "Blue" },
  ice:        { light: "#e8f1f6", dark: "#7ba1c0", label: "Ice" },
  slate:      { light: "#cfd1d5", dark: "#52525b", label: "Slate" },
  midnight:   { light: "#9fa6b2", dark: "#3a3f4b", label: "Midnight" },
  purple:     { light: "#e6dcf0", dark: "#8877b3", label: "Purple" },
  rose:       { light: "#f5e2dd", dark: "#c27f77", label: "Rose" },
};

export const PIECE_THEMES: Record<
  PieceTheme,
  { label: string; wFill: string; wStroke: string; bFill: string; bStroke: string; assetSet?: string }
> = {
  classic:           { label: "Classic",             wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5" },
  ivory:             { label: "Ivory",               wFill: "#f0e8d5", wStroke: "#3a2f22", bFill: "#26201a", bStroke: "#f0e8d5" },
  steel:             { label: "Steel",               wFill: "#e8edf2", wStroke: "#2a3340", bFill: "#2b3440", bStroke: "#e8edf2" },
  rosewood:          { label: "Rosewood",            wFill: "#f3e6e4", wStroke: "#5a2b2b", bFill: "#4a2222", bStroke: "#f3e6e4" },
  forest:            { label: "Forest",              wFill: "#eef1e6", wStroke: "#24331f", bFill: "#22301c", bStroke: "#eef1e6" },
  ocean:             { label: "Ocean",               wFill: "#e6f1f5", wStroke: "#123243", bFill: "#123243", bStroke: "#e6f1f5" },
  gold:              { label: "Gold",                wFill: "#f4ead0", wStroke: "#6b4e15", bFill: "#3a2c0e", bStroke: "#e9c877" },
  lichessCburnett:   { label: "Lichess Cburnett",    wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "cburnett" },
  lichessMerida:     { label: "Lichess Merida",      wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "merida" },
  lichessAlpha:      { label: "Lichess Alpha",       wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "alpha" },
  lichessCalifornia: { label: "Lichess California",  wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "california" },
  lichessCardinal:   { label: "Lichess Cardinal",    wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "cardinal" },
  lichessChess7:     { label: "Lichess Chess7",      wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "chess7" },
  lichessKosal:      { label: "Lichess Kosal",       wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "kosal" },
  lichessMaestro:    { label: "Lichess Maestro",     wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "maestro" },
  lichessPirouetti:  { label: "Lichess Pirouetti",   wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "pirouetti" },
  lichessStaunty:    { label: "Lichess Staunty",     wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5", assetSet: "staunty" },
};

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

export const CUSTOM_BG_URL_MAX = 400;

/** Validate a user-supplied background image URL. Returns the cleaned URL, or
 *  "" when the value is missing, not http(s), too long, or contains characters
 *  that could break out of a CSS url() (quotes, backslashes, whitespace). */
export function sanitizeCustomBgUrl(v: unknown): string {
  if (typeof v !== "string") return "";
  const url = v.trim();
  if (!url || url.length > CUSTOM_BG_URL_MAX) return "";
  if (!/^https?:\/\//i.test(url)) return "";
  if (/[\s"'\\<>()]/.test(url)) return "";
  return url;
}

function clampDim(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(0.6, v)) : fallback;
}

// Uploaded backgrounds live in localStorage only, so the cap can be generous:
// ~640KB of base64 is a ~480KB JPEG, plenty for a 1920px background.
export const CUSTOM_BG_DATA_MAX = 640_000;

/** Validate an uploaded background: a length-capped base64 image data URL
 *  (same shape isCustomAvatar accepts), nothing else. */
export function sanitizeCustomBgData(v: unknown): string {
  if (typeof v !== "string") return "";
  if (!v || v.length > CUSTOM_BG_DATA_MAX) return "";
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) return "";
  return v;
}

export function loadSettings(): Settings {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      boardTheme:
        parsed.boardTheme && parsed.boardTheme in BOARD_THEMES
          ? (parsed.boardTheme as BoardTheme)
          : DEFAULT.boardTheme,
      pieceTheme:
        parsed.pieceTheme && parsed.pieceTheme in PIECE_THEMES
          ? (parsed.pieceTheme as PieceTheme)
          : DEFAULT.pieceTheme,
      volume: typeof parsed.volume === "number" ? Math.max(0, Math.min(1, parsed.volume)) : DEFAULT.volume,
      moveRiskWarnings: bool(parsed.moveRiskWarnings, DEFAULT.moveRiskWarnings),
      autoQueen: bool(parsed.autoQueen, DEFAULT.autoQueen),
      hideOpponentReveal: bool(parsed.hideOpponentReveal, DEFAULT.hideOpponentReveal),
      muteChat: bool(parsed.muteChat, DEFAULT.muteChat),
      confirmResign: bool(parsed.confirmResign, DEFAULT.confirmResign),
      showCoordinates: bool(parsed.showCoordinates, DEFAULT.showCoordinates),
      highlightLastMove: bool(parsed.highlightLastMove, DEFAULT.highlightLastMove),
      showLegalMoves: bool(parsed.showLegalMoves, DEFAULT.showLegalMoves),
      premovesEnabled: bool(parsed.premovesEnabled, DEFAULT.premovesEnabled),
      lowTimeWarning: bool(parsed.lowTimeWarning, DEFAULT.lowTimeWarning),
      confirmMove: bool(parsed.confirmMove, DEFAULT.confirmMove),
      confirmDrawOffer: bool(parsed.confirmDrawOffer, DEFAULT.confirmDrawOffer),
      flipBoard: bool(parsed.flipBoard, DEFAULT.flipBoard),
      checkHighlight: bool(parsed.checkHighlight, DEFAULT.checkHighlight),
      boardSize:
        typeof parsed.boardSize === "number"
          ? Math.max(0.8, Math.min(1.1, parsed.boardSize))
          : DEFAULT.boardSize,
      largerPieces: bool(parsed.largerPieces, DEFAULT.largerPieces),
      moveSound: bool(parsed.moveSound, DEFAULT.moveSound),
      captureSound: bool(parsed.captureSound, DEFAULT.captureSound),
      checkSound: bool(parsed.checkSound, DEFAULT.checkSound),
      gameEndSound: bool(parsed.gameEndSound, DEFAULT.gameEndSound),
      soundEnabled: bool(parsed.soundEnabled, DEFAULT.soundEnabled),
      soundTheme:
        parsed.soundTheme === "lichess" || parsed.soundTheme === "classic"
          ? parsed.soundTheme
          : DEFAULT.soundTheme,
      siteTheme:
        parsed.siteTheme && parsed.siteTheme in SITE_THEMES
          ? (parsed.siteTheme as SiteTheme)
          : DEFAULT.siteTheme,
      compactMode: bool(parsed.compactMode, DEFAULT.compactMode),
      uiScale:
        typeof parsed.uiScale === "number"
          ? Math.max(0.85, Math.min(1.15, parsed.uiScale))
          : DEFAULT.uiScale,
      accentColor:
        parsed.accentColor === "auto" || (parsed.accentColor && parsed.accentColor in ACCENT_THEMES)
          ? (parsed.accentColor as AccentColor)
          : DEFAULT.accentColor,
      animationSpeed:
        parsed.animationSpeed === "off" || parsed.animationSpeed === "fast" || parsed.animationSpeed === "normal"
          ? parsed.animationSpeed
          : DEFAULT.animationSpeed,
      uiSounds: bool(parsed.uiSounds, DEFAULT.uiSounds),
      highContrast: bool(parsed.highContrast, DEFAULT.highContrast),
      reducedMotion: bool(parsed.reducedMotion, DEFAULT.reducedMotion),
      fpsCounter: bool(parsed.fpsCounter, DEFAULT.fpsCounter),
      customBgUrl: sanitizeCustomBgUrl(parsed.customBgUrl),
      customBgDim: clampDim(parsed.customBgDim, DEFAULT.customBgDim),
      customBgData: sanitizeCustomBgData(parsed.customBgData),
      fxDuration:
        typeof parsed.fxDuration === "number" && Number.isFinite(parsed.fxDuration)
          ? Math.max(0.5, Math.min(2, parsed.fxDuration))
          : DEFAULT.fxDuration,
      // Everyone gets the full visuals by default (the old hardware sniff
      // that pre-enabled perf mode on weak devices is gone). If the page
      // actually janks, the lag nudge in SettingsBootstrap offers perf mode
      // as a one-tap popup instead; an explicit stored choice always wins.
      perfMode: typeof parsed.perfMode === "boolean" ? parsed.perfMode : false,
    };
  } catch {}
  return { ...DEFAULT };
}

const UPDATED_AT_KEY = "dc:settings-updated-at";

function writeLocalSettings(s: Settings, updatedAt: number) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    window.localStorage.setItem(UPDATED_AT_KEY, String(updatedAt));
  } catch {}
  applyBoardTheme(s.boardTheme);
  applyPieceTheme(s.pieceTheme);
  applyUiPrefs(s);
  window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
}

export function saveSettings(s: Settings) {
  if (typeof window === "undefined") return;
  writeLocalSettings(s, Date.now());
  schedulePushToServer();
}

// ---- Per-account settings sync ----
// Settings are saved locally first (they must work signed out), then pushed
// to the account so they follow the user across devices. On page load,
// pullSettingsFromServer adopts the server copy when it is newer.

let pushTimer: ReturnType<typeof setTimeout> | null = null;

function localUpdatedAt(): number {
  try {
    return parseInt(window.localStorage.getItem(UPDATED_AT_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

function schedulePushToServer() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    const updatedAt = localUpdatedAt();
    // The uploaded background stays device-local: as a data URL it would blow
    // the server's settings-blob size cap, so it is stripped from the push
    // (and re-injected locally when a newer server copy is adopted).
    const settings: Settings = { ...loadSettings(), customBgData: "" };
    void fetch("/api/users/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings, updatedAt }),
    }).catch(() => {
      // Signed out or offline: local settings still apply.
    });
  }, 800);
}

/** Adopt the account's stored settings when they are newer than this
 *  device's. Returns true when the server copy was applied. */
export async function pullSettingsFromServer(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/users/settings");
    if (!res.ok) return false;
    const data = (await res.json()) as { settings: Partial<Settings> | null; updatedAt: number | null };
    if (!data.settings || !data.updatedAt) return false;
    if (data.updatedAt <= localUpdatedAt()) return false;
    // The server copy never carries the device-local uploaded background
    // (stripped on push); keep this device's upload across the adoption.
    const localBg = loadSettings().customBgData;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data.settings));
    } catch {}
    const merged = loadSettings(); // re-validate through the normal parser
    if (!merged.customBgData && localBg) merged.customBgData = localBg;
    writeLocalSettings(merged, data.updatedAt);
    return true;
  } catch {
    return false;
  }
}

/** Push the interface-wide preferences (scale, accent, motion, contrast) into
 *  the document so every page picks them up. */
export function applyUiPrefs(s: Settings) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  // Compact mode tightens the whole interface by shrinking the rem base a
  // notch; it stacks with the UI scale preference.
  const scale = s.uiScale * (s.compactMode ? 0.92 : 1);
  html.style.fontSize = scale === 1 ? "" : `${16 * scale}px`;
  html.style.setProperty("--board-cap", `${Math.round(720 * s.boardSize)}px`);
  html.style.setProperty("--piece-fit", s.largerPieces ? "97%" : "88%");
  html.dataset.theme =
    s.siteTheme === "system"
      ? window.matchMedia?.("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : s.siteTheme;
  // color-scheme only accepts light/dark; every named theme maps to one.
  html.style.colorScheme = SITE_THEMES[html.dataset.theme as SiteTheme]?.scheme ?? "dark";
  const theme = SITE_THEMES[html.dataset.theme as SiteTheme] ?? SITE_THEMES.dark;
  const accent =
    s.accentColor === "auto"
      ? theme.accent
      : (ACCENT_THEMES[s.accentColor as Exclude<AccentColor, "auto">] ?? theme.accent);
  html.style.setProperty("--accent", accent.accent);
  html.style.setProperty("--accent-hi", accent.accentHi);
  html.style.setProperty("--gold", accent.accent);
  html.style.setProperty("--gold-leaf", accent.accentHi);
  html.style.setProperty("--accent-rgb", accent.rgb);
  html.style.setProperty("--accent-hi-rgb", accent.rgbHi);
  html.style.setProperty("--accent-dim-rgb", accent.rgbDim);
  html.dataset.anim = s.reducedMotion ? "off" : s.animationSpeed;
  html.dataset.contrast = s.highContrast ? "high" : "normal";
  // Performance mode: gates the heaviest decorative paint in globals.css.
  if (s.perfMode) html.dataset.perf = "low";
  else delete html.dataset.perf;
  // FX duration multiplier: CSS-driven card/board animations read this var
  // (calc(<base> * var(--fx-dur, 1))); the canvas VFX engine reads the same
  // setting through its play specs.
  html.style.setProperty("--fx-dur", String(s.fxDuration));
  // Custom background (lichess-style): the image lands on <body> through a CSS
  // variable; the appended globals.css block adds a dim overlay for legibility.
  // An uploaded image (validated data URL) wins over the URL field.
  const bgUrl = sanitizeCustomBgData(s.customBgData) || sanitizeCustomBgUrl(s.customBgUrl);
  if (bgUrl) {
    html.dataset.customBg = "on";
    html.style.setProperty("--custom-bg-url", `url("${bgUrl}")`);
    html.style.setProperty("--custom-bg-dim", String(clampDim(s.customBgDim, DEFAULT.customBgDim)));
  } else {
    delete html.dataset.customBg;
    html.style.removeProperty("--custom-bg-url");
    html.style.removeProperty("--custom-bg-dim");
  }
}

/** Current card-FX duration multiplier as applied to the document by
 *  applyUiPrefs (--fx-dur). Read at play time by the board's VFX dispatch so
 *  the canvas engine and the CSS animations stretch together. */
export function fxDurationScale(): number {
  if (typeof document === "undefined") return 1;
  const v = parseFloat(document.documentElement.style.getPropertyValue("--fx-dur"));
  return Number.isFinite(v) && v > 0 ? Math.max(0.5, Math.min(2, v)) : 1;
}

export function applyBoardTheme(theme: BoardTheme) {
  if (typeof document === "undefined") return;
  const t = BOARD_THEMES[theme] ?? BOARD_THEMES.wood;
  document.documentElement.style.setProperty("--sq-light", t.light);
  document.documentElement.style.setProperty("--sq-dark", t.dark);
}

export function applyPieceTheme(theme: PieceTheme) {
  if (typeof document === "undefined") return;
  const t = PIECE_THEMES[theme] ?? PIECE_THEMES.classic;
  const html = document.documentElement;
  const root = document.documentElement.style;
  root.setProperty("--piece-w-fill", t.wFill);
  root.setProperty("--piece-w-stroke", t.wStroke);
  root.setProperty("--piece-b-fill", t.bFill);
  root.setProperty("--piece-b-stroke", t.bStroke);
  if (t.assetSet) {
    html.dataset.pieceSource = "lichess";
    for (const color of ["w", "b"] as const) {
      for (const type of ["k", "q", "r", "b", "n", "p"] as const) {
        root.setProperty(
          `--piece-${color}${type}-image`,
          `url("/piece/lichess/${t.assetSet}/${color}${type.toUpperCase()}.svg")`,
        );
      }
    }
  } else {
    html.dataset.pieceSource = "inline";
  }
}
