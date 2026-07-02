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
  | "gold";

export type AccentColor = "blue" | "green" | "amber" | "rose";
export type AnimationSpeed = "off" | "fast" | "normal";

export interface Settings {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  volume: number; // 0..1
  moveRiskWarnings: boolean; // yellow/red move-dot warnings for self-loss / check
  autoQueen: boolean; // skip the promotion picker and always promote to queen
  // When on, the opponent's rule is never shown to you — not even after the
  // game ends, and mid-game reveal is disabled. Default off.
  hideOpponentReveal: boolean;
  confirmResign: boolean; // ask before resigning
  showCoordinates: boolean; // file/rank labels on the board edge
  highlightLastMove: boolean; // tint the from/to squares of the last move
  uiScale: number; // 0.85..1.15, multiplies the root font size
  accentColor: AccentColor;
  animationSpeed: AnimationSpeed;
  uiSounds: boolean; // interface blips (piece select), separate from game sounds
  highContrast: boolean;
  reducedMotion: boolean;
  fpsCounter: boolean;
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
  confirmResign: true,
  showCoordinates: true,
  highlightLastMove: true,
  uiScale: 1,
  accentColor: "blue",
  animationSpeed: "normal",
  uiSounds: true,
  highContrast: false,
  reducedMotion: false,
  fpsCounter: false,
};
const DEFAULT = DEFAULT_SETTINGS;

export const ACCENT_THEMES: Record<
  AccentColor,
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
  { label: string; wFill: string; wStroke: string; bFill: string; bStroke: string }
> = {
  classic:  { label: "Classic",  wFill: "#f5f5f5", wStroke: "#1a1a22", bFill: "#1a1a22", bStroke: "#f5f5f5" },
  ivory:    { label: "Ivory",    wFill: "#f0e8d5", wStroke: "#3a2f22", bFill: "#26201a", bStroke: "#f0e8d5" },
  steel:    { label: "Steel",    wFill: "#e8edf2", wStroke: "#2a3340", bFill: "#2b3440", bStroke: "#e8edf2" },
  rosewood: { label: "Rosewood", wFill: "#f3e6e4", wStroke: "#5a2b2b", bFill: "#4a2222", bStroke: "#f3e6e4" },
  forest:   { label: "Forest",   wFill: "#eef1e6", wStroke: "#24331f", bFill: "#22301c", bStroke: "#eef1e6" },
  ocean:    { label: "Ocean",    wFill: "#e6f1f5", wStroke: "#123243", bFill: "#123243", bStroke: "#e6f1f5" },
  gold:     { label: "Gold",     wFill: "#f4ead0", wStroke: "#6b4e15", bFill: "#3a2c0e", bStroke: "#e9c877" },
};

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
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
      confirmResign: bool(parsed.confirmResign, DEFAULT.confirmResign),
      showCoordinates: bool(parsed.showCoordinates, DEFAULT.showCoordinates),
      highlightLastMove: bool(parsed.highlightLastMove, DEFAULT.highlightLastMove),
      uiScale:
        typeof parsed.uiScale === "number"
          ? Math.max(0.85, Math.min(1.15, parsed.uiScale))
          : DEFAULT.uiScale,
      accentColor:
        parsed.accentColor && parsed.accentColor in ACCENT_THEMES
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
    };
  } catch {}
  return { ...DEFAULT };
}

export function saveSettings(s: Settings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
  applyBoardTheme(s.boardTheme);
  applyPieceTheme(s.pieceTheme);
  applyUiPrefs(s);
  window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
}

/** Push the interface-wide preferences (scale, accent, motion, contrast) into
 *  the document so every page picks them up. */
export function applyUiPrefs(s: Settings) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.style.fontSize = s.uiScale === 1 ? "" : `${16 * s.uiScale}px`;
  const accent = ACCENT_THEMES[s.accentColor] ?? ACCENT_THEMES.blue;
  html.style.setProperty("--accent", accent.accent);
  html.style.setProperty("--accent-hi", accent.accentHi);
  html.style.setProperty("--gold", accent.accent);
  html.style.setProperty("--gold-leaf", accent.accentHi);
  html.style.setProperty("--accent-rgb", accent.rgb);
  html.style.setProperty("--accent-hi-rgb", accent.rgbHi);
  html.style.setProperty("--accent-dim-rgb", accent.rgbDim);
  html.dataset.anim = s.reducedMotion ? "off" : s.animationSpeed;
  html.dataset.contrast = s.highContrast ? "high" : "normal";
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
  const root = document.documentElement.style;
  root.setProperty("--piece-w-fill", t.wFill);
  root.setProperty("--piece-w-stroke", t.wStroke);
  root.setProperty("--piece-b-fill", t.bFill);
  root.setProperty("--piece-b-stroke", t.bStroke);
}
