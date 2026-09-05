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

/** What the SETTING stores. Board and piece prefs used to carry "auto" and
 *  "custom" on top of the named sets; both are gone now (one default theme, no
 *  flagships to resolve to, no hex pickers), so the pref IS the named set. The
 *  alias stays so call sites read the same. */
export type BoardThemePref = BoardTheme;

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

/** As BoardThemePref, for the piece set. */
export type PieceThemePref = PieceTheme;

export type AnimationSpeed = "off" | "fast" | "normal";
export type SiteTheme = "dark" | "light" | "system";
export type SoundTheme = "lichess" | "classic";

// The three site themes. Lichess ships a dark and a light palette and nothing
// else; "system" simply follows the device and resolves to one of the two.
// `swatch` feeds the settings picker preview, `scheme` is the value for CSS
// color-scheme, and `accent` is the one accent both palettes are built on
// (Lichess blue), fed into the document by applyUiPrefs.
export interface AccentDef {
  accent: string;
  accentHi: string;
  rgb: string;
  rgbHi: string;
  rgbDim: string;
}

// Lichess blue: links, primary buttons, focus rings. One accent, everywhere.
const BLUE_ACCENT: AccentDef = {
  accent: "#3692e7",
  accentHi: "#4a9fee",
  rgb: "54 146 231",
  rgbHi: "74 159 238",
  rgbDim: "42 111 176",
};

// The light palette wants a slightly deeper blue so links clear WCAG AA on
// white; mirrors the html[data-theme="light"] block in globals.css.
const BLUE_ACCENT_LIGHT: AccentDef = {
  accent: "#1b78d0",
  accentHi: "#3692e7",
  rgb: "27 120 208",
  rgbHi: "54 146 231",
  rgbDim: "20 92 160",
};

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
  dark:   { label: "Dark",   hint: "The default palette",  scheme: "dark",  swatch: { bg: "#161512", panel: "#262421", glow: "#3692e7" }, accent: BLUE_ACCENT },
  light:  { label: "Light",  hint: "Paper and ink",        scheme: "light", swatch: { bg: "#edebe9", panel: "#ffffff", glow: "#1b78d0" }, accent: BLUE_ACCENT_LIGHT },
  system: { label: "System", hint: "Follow your device",   scheme: "dark",  swatch: { bg: "#161512", panel: "#edebe9", glow: "#3692e7" }, accent: BLUE_ACCENT },
};

/** Site-theme ids that existed before the palette collapse, mapped onto the
 *  theme that replaces them. A stored value from an old build must still load:
 *  without this every one of those users would trip the SITE_THEMES guard in
 *  loadSettings and be silently reset. Light-scheme ids land on "light", the
 *  rest on "dark". */
const LEGACY_SITE_THEMES: Record<string, SiteTheme> = {
  sepia: "light",
  frost: "light",
  porcelain: "light",
  midnight: "dark",
  void: "dark",
  abyss: "dark",
  ember: "dark",
  crimson: "dark",
  moss: "dark",
  nebula: "dark",
  sakura: "dark",
  honey: "dark",
  pine: "dark",
  wine: "dark",
  storm: "dark",
  obsidian: "dark",
  neon: "dark",
  jade: "dark",
  aurora: "dark",
};

export interface Settings {
  boardTheme: BoardThemePref;
  pieceTheme: PieceThemePref;
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
  lowTimeWarning: boolean; // ticking alert when the clock runs low
  animationSpeed: AnimationSpeed;
  uiSounds: boolean; // interface blips (piece select), separate from game sounds
  reducedMotion: boolean;
  // Honor the OS "prefers-reduced-motion" flag automatically (on by default):
  // when the system asks for calm, animations stand down exactly as if
  // reducedMotion were on. Turning this off restores the old app-authoritative
  // behavior for players who reduce motion system-wide but still want plays.
  followSystemMotion: boolean;
  customBgUrl: string; // full-page background image URL; empty string = none
  customBgDim: number; // 0..0.6 dark overlay over the custom background
  // Uploaded full-page background as a data URL (device-local: stripped from
  // the server sync so the settings blob stays small). Wins over customBgUrl.
  customBgData: string;
  fxDuration: number; // 0.5..2, multiplies how long card/FX animations last
}

export const SETTINGS_CHANGED_EVENT = "nerfchess:settings-changed";

const STORAGE_KEY = "dc:settings-v1";
export const DEFAULT_SETTINGS: Settings = {
  // Lichess defaults: the brown board and the cburnett piece set.
  boardTheme: "brown",
  pieceTheme: "lichessCburnett",
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
  siteTheme: "dark",
  animationSpeed: "normal",
  uiSounds: true,
  reducedMotion: false,
  followSystemMotion: true,
  customBgUrl: "",
  customBgDim: 0.3,
  customBgData: "",
  fxDuration: 1,
};
const DEFAULT = DEFAULT_SETTINGS;

export const BOARD_THEMES: Record<BoardTheme, { light: string; dark: string; label: string }> = {
  // Brown is the default, the same two squares Lichess ships. The rest are the
  // usual named alternatives.
  wood:       { light: "#ecd9ae", dark: "#8a5a38", label: "Wood" },
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
  // Classic ships warm ivory whites and charcoal blacks with a warm edge, so
  // the default set sits inside the dungeon palette instead of clinical
  // black-and-white (2026-07 piece pass).
  classic:           { label: "Classic",             wFill: "#f2ead8", wStroke: "#3b332a", bFill: "#2b2b31", bStroke: "#d8c9a8" },
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

/** Read a stored site-theme id, translating anything from before the palette
 *  collapse onto the theme that replaced it. */
function readSiteTheme(v: unknown): SiteTheme {
  if (typeof v !== "string") return DEFAULT.siteTheme;
  if (v in SITE_THEMES) return v as SiteTheme;
  return LEGACY_SITE_THEMES[v] ?? DEFAULT.siteTheme;
}

export function loadSettings(): Settings {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      // "auto" and "custom" were legal stored values before the board and piece
      // pickers were simplified; both now fall through to the default.
      boardTheme:
        parsed.boardTheme && parsed.boardTheme in BOARD_THEMES
          ? (parsed.boardTheme as BoardThemePref)
          : DEFAULT.boardTheme,
      pieceTheme:
        parsed.pieceTheme && parsed.pieceTheme in PIECE_THEMES
          ? (parsed.pieceTheme as PieceThemePref)
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
      // A theme id from an old build maps onto its replacement rather than
      // resetting the user to the default (see LEGACY_SITE_THEMES).
      siteTheme: readSiteTheme(parsed.siteTheme),
      animationSpeed:
        parsed.animationSpeed === "off" || parsed.animationSpeed === "fast" || parsed.animationSpeed === "normal"
          ? parsed.animationSpeed
          : DEFAULT.animationSpeed,
      uiSounds: bool(parsed.uiSounds, DEFAULT.uiSounds),
      reducedMotion: bool(parsed.reducedMotion, DEFAULT.reducedMotion),
      followSystemMotion: bool(parsed.followSystemMotion, DEFAULT.followSystemMotion),
      customBgUrl: sanitizeCustomBgUrl(parsed.customBgUrl),
      customBgDim: clampDim(parsed.customBgDim, DEFAULT.customBgDim),
      customBgData: sanitizeCustomBgData(parsed.customBgData),
      fxDuration:
        typeof parsed.fxDuration === "number" && Number.isFinite(parsed.fxDuration)
          ? Math.max(0.5, Math.min(2, parsed.fxDuration))
          : DEFAULT.fxDuration,
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
  applyBoardColors(s);
  applyPieceColors(s);
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

/** Push the interface-wide preferences (theme, accent, motion, background)
 *  into the document so every page picks them up. */
export function applyUiPrefs(s: Settings) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.style.setProperty("--board-cap", `${Math.round(720 * s.boardSize)}px`);
  html.style.setProperty("--piece-fit", s.largerPieces ? "97%" : "88%");
  html.dataset.theme =
    s.siteTheme === "system"
      ? window.matchMedia?.("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : s.siteTheme;
  // color-scheme only accepts light/dark; every named theme maps to one.
  const scheme = SITE_THEMES[html.dataset.theme as SiteTheme]?.scheme ?? "dark";
  html.style.colorScheme = scheme;
  // Paper-scheme treatments (plate fills, ink text ramps, border alphas) hang
  // off this flag rather than off one theme id, so every light theme gets them
  // and a new one costs no CSS.
  if (scheme === "light") html.dataset.light = "on";
  else delete html.dataset.light;
  const accent = (SITE_THEMES[html.dataset.theme as SiteTheme] ?? SITE_THEMES.dark).accent;
  html.style.setProperty("--accent", accent.accent);
  html.style.setProperty("--accent-hi", accent.accentHi);
  html.style.setProperty("--gold", accent.accent);
  html.style.setProperty("--gold-leaf", accent.accentHi);
  html.style.setProperty("--accent-rgb", accent.rgb);
  html.style.setProperty("--accent-hi-rgb", accent.rgbHi);
  html.style.setProperty("--accent-dim-rgb", accent.rgbDim);
  // The OS prefers-reduced-motion flag is honored automatically (new default);
  // the in-app toggles still work, and followSystemMotion:false restores the
  // old app-authoritative behavior for users who want plays regardless.
  const osReducedMotion =
    s.followSystemMotion && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  html.dataset.anim = s.reducedMotion || osReducedMotion ? "off" : s.animationSpeed;
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

/** True when animations are off: the user turned them off in Settings
 *  (reduced motion or animation speed "off"), or the OS asked for reduced
 *  motion and "Follow system motion" (default on) is honoring it — applyUiPrefs
 *  folds both into data-anim, so this single read stays authoritative.
 *  SSR-safe (false). */
export function motionOff(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.dataset.anim === "off";
}

/** The site theme actually in force, with "system" already resolved. Both
 *  resolvers below need it, and applyUiPrefs computed it inline. */
export function effectiveSiteTheme(s: Settings): SiteTheme {
  if (s.siteTheme !== "system") return s.siteTheme;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/** The board to actually draw. Board and piece prefs are plain named sets
 *  now, so both resolvers are the identity; they stay so call sites (the clip
 *  exporter, the settings pickers) read the same as before. */
export function resolveBoardTheme(s: Settings): BoardTheme {
  return s.boardTheme;
}

/** As resolveBoardTheme, for the piece set. */
export function resolvePieceTheme(s: Settings): PieceTheme {
  return s.pieceTheme;
}

/** The two square colors the board should actually paint. */
export function boardColors(s: Settings): { light: string; dark: string } {
  const t = BOARD_THEMES[resolveBoardTheme(s)] ?? BOARD_THEMES.brown;
  return { light: t.light, dark: t.dark };
}

/** Push the board square colors for these settings into the document,
 *  honoring the "custom" pref. The settings-aware wrapper every caller should
 *  use; applyBoardTheme below stays for painting a specific named board. */
export function applyBoardColors(s: Settings) {
  if (typeof document === "undefined") return;
  const c = boardColors(s);
  const root = document.documentElement.style;
  root.setProperty("--sq-light", c.light);
  root.setProperty("--sq-dark", c.dark);
}

/** As applyBoardColors, for the piece set. */
export function applyPieceColors(s: Settings) {
  if (typeof document === "undefined") return;
  applyPieceTheme(resolvePieceTheme(s));
}

export function applyBoardTheme(theme: BoardTheme) {
  if (typeof document === "undefined") return;
  const t = BOARD_THEMES[theme] ?? BOARD_THEMES.brown;
  document.documentElement.style.setProperty("--sq-light", t.light);
  document.documentElement.style.setProperty("--sq-dark", t.dark);
}

export function applyPieceTheme(theme: PieceTheme) {
  if (typeof document === "undefined") return;
  const t = PIECE_THEMES[theme] ?? PIECE_THEMES.lichessCburnett;
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
